// State that outlives a page load: the bag, the person on this device, the orders
// sent, the loyalty account. All of it stays in this browser — there is no account
// server yet; the shape is what a server would hold.

import { STORAGE, LOYALTY, ORDER } from "./config.js";
import { uid, rng, hash32 } from "./util.js";
import { byId, LEAGUES, BRANCHES, ITEMS } from "./data.js";

const KEY = {
  bag: STORAGE + "bag",
  profile: STORAGE + "profile",
  orders: STORAGE + "orders",
  member: STORAGE + "member",
  prefs: STORAGE + "prefs",
};

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch { return structuredClone(fallback); }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

const state = {
  bag: read(KEY.bag, []),
  profile: read(KEY.profile, { name: "", phone: "" }),
  orders: read(KEY.orders, []),
  member: read(KEY.member, null),
  prefs: read(KEY.prefs, { branch: "vanak", note: "", useCashback: true, sample: false, seeded: false }),
};

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn(state));

/* ---------------------------------------------------------------- loyalty */
export const pointsFor = (toman) => Math.floor(toman * LOYALTY.pointsPerToman);
export const cashbackFor = (toman, pct) =>
  Math.floor((toman * pct / 100) / LOYALTY.cashbackFloor) * LOYALTY.cashbackFloor;

export function leagueOf(points) {
  let out = LEAGUES[0];
  for (const l of LEAGUES) if (points >= l.min) out = l;
  return out;
}
export function nextLeague(points) {
  return LEAGUES.find((l) => l.min > points) || null;
}
/** Where the account stands on the ladder. */
export function ladder(points = member().points) {
  const league = leagueOf(points);
  const next = nextLeague(points);
  const span = next ? next.min - league.min : 1;
  const pct = next ? Math.min(100, Math.round(((points - league.min) / span) * 100)) : 100;
  return { league, next, pct, toNext: next ? next.min - points : 0 };
}

function freshMember() {
  return { id: "K" + String(hash32(uid())).slice(0, 7).padStart(7, "0"), points: 0,
           cashback: 0, joined: Date.now(), history: [] };
}
export function member() {
  if (!state.member) { state.member = freshMember(); write(KEY.member, state.member); }
  return state.member;
}

/* -------------------------------------------------------------------- bag */
export const bag = () => state.bag;
export const bagCount = () => state.bag.reduce((n, l) => n + l.qty, 0);
export const bagTotal = () => state.bag.reduce((n, l) => n + l.unit * l.qty, 0);
export const inBag = (itemId) => state.bag.find((l) => l.itemId === itemId)?.qty || 0;

export function addLine(itemId, qty = 1) {
  const item = byId(itemId);
  if (!item) return null;
  const found = state.bag.find((l) => l.itemId === itemId);
  if (found) found.qty = Math.min(ORDER.maxPerLine, found.qty + qty);
  else state.bag.push({ id: uid(), itemId, unit: item.price, qty: Math.min(ORDER.maxPerLine, qty) });
  write(KEY.bag, state.bag); emit();
  return found || state.bag[state.bag.length - 1];
}

export function setQty(lineId, qty) {
  const line = state.bag.find((l) => l.id === lineId);
  if (!line) return;
  if (qty <= 0) state.bag = state.bag.filter((l) => l.id !== lineId);
  else line.qty = Math.min(ORDER.maxPerLine, qty);
  write(KEY.bag, state.bag); emit();
}

export function clearBag() { state.bag = []; write(KEY.bag, state.bag); emit(); }

/* ------------------------------------------------------------------ prefs */
export const prefs = () => state.prefs;
export function setPrefs(patch) {
  state.prefs = { ...state.prefs, ...patch };
  write(KEY.prefs, state.prefs); emit();
}
export const myBranch = () => BRANCHES.find((b) => b.id === state.prefs.branch && b.status === "open")
  || BRANCHES.find((b) => b.status === "open");
export const setMyBranch = (id) => setPrefs({ branch: id });

/* ---------------------------------------------------------------- profile */
export const profile = () => state.profile;
export function setProfile(patch) {
  state.profile = { ...state.profile, ...patch };
  write(KEY.profile, state.profile); emit();
}

/* ----------------------------------------------------------------- orders */
export const orders = () => state.orders;
export const orderById = (id) => state.orders.find((o) => o.id === id);

/** Four digits the counter can read back. Unique among the orders remembered. */
function orderCode() {
  const taken = new Set(state.orders.map((o) => o.code));
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (taken.has(code));
  return code;
}

/** What the order will do before it is placed — the bag screen shows this live. */
export function quote() {
  const subtotal = bagTotal();
  const m = member();
  const { league } = ladder(m.points);
  const applied = state.prefs.useCashback ? Math.min(m.cashback, subtotal) : 0;
  const total = subtotal - applied;
  return {
    subtotal, applied, total, league,
    points: pointsFor(total),
    cashback: cashbackFor(total, league.cashback),
  };
}

export function placeOrder({ branchId, note = "" } = {}) {
  if (!state.bag.length) return null;
  const q = quote();
  const lines = state.bag.map((l) => ({ ...l, name: byId(l.itemId)?.en || l.itemId }));
  const order = {
    id: uid(), code: orderCode(), at: Date.now(), branch: branchId || myBranch().id,
    lines, note, subtotal: q.subtotal, applied: q.applied, total: q.total,
    points: q.points, cashback: q.cashback, league: q.league.id, status: "sent",
  };
  state.orders.unshift(order);
  state.orders = state.orders.slice(0, ORDER.keep);
  write(KEY.orders, state.orders);

  const m = member();
  m.cashback = m.cashback - q.applied + q.cashback;
  m.points += q.points;
  m.history.unshift({ type: "order", at: order.at, orderId: order.id, code: order.code,
                      points: q.points, cashback: q.cashback, applied: q.applied, total: q.total });
  m.history = m.history.slice(0, 60);
  write(KEY.member, m);
  state.prefs.note = "";
  write(KEY.prefs, state.prefs);
  clearBag();                                 // emits for everything
  return order;
}

/* ----------------------------------------------------------------- sample */
// A regular's last three months, so the ladder, the cashback and the history can
// be judged on a fresh phone. Labelled as sample wherever it shows; one tap clears it.
export const isSample = () => !!state.prefs.sample;

export function seedSample() {
  const m = freshMember();
  const r = rng(hash32("kai-sample-" + m.id));
  const pool = ITEMS.filter((i) => ["espresso-drinks", "cold-coffee", "cold-drinks", "bakery", "breakfast", "snacks"].includes(i.cat));
  const now = Date.now();
  const n = 15;
  let points = 0, cashback = 0;
  const history = [];
  for (let k = n; k >= 1; k--) {
    const at = now - Math.floor(r() * 84 + 2) * 86400000 * (k / n) - Math.floor(r() * 8) * 3600000;
    const count = 1 + Math.floor(r() * 2.4);
    const lines = [];
    for (let i = 0; i < count; i++) {
      const it = pool[Math.floor(r() * pool.length)];
      if (!lines.find((l) => l.itemId === it.id)) lines.push({ id: uid(), itemId: it.id, unit: it.price, qty: 1, name: it.en });
    }
    const total = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const league = leagueOf(points);
    const pts = pointsFor(total), cb = cashbackFor(total, league.cashback);
    points += pts; cashback += cb;
    const branch = BRANCHES.filter((b) => b.status === "open" && b.region === "Tehran")[Math.floor(r() * 6)];
    const order = { id: uid(), code: String(1000 + Math.floor(r() * 9000)), at, branch: branch.id, lines,
                    note: "", subtotal: total, applied: 0, total, points: pts, cashback: cb, league: league.id, status: "done", sample: true };
    state.orders.push(order);
    history.unshift({ type: "order", at, orderId: order.id, code: order.code, points: pts, cashback: cb, applied: 0, total, sample: true });
  }
  state.orders.sort((a, b) => b.at - a.at);
  // some cashback has been spent along the way, as it would be
  cashback = Math.round(cashback * 0.45 / 1000) * 1000;
  m.points = points; m.cashback = cashback; m.history = history; m.joined = now - 90 * 86400000;
  state.member = m;
  state.prefs.sample = true; state.prefs.seeded = true;
  write(KEY.member, m); write(KEY.orders, state.orders); write(KEY.prefs, state.prefs);
  emit();
  return m;
}

export function clearSample() {
  state.orders = state.orders.filter((o) => !o.sample);
  state.member = freshMember();
  state.prefs.sample = false; state.prefs.seeded = true;
  write(KEY.member, state.member); write(KEY.orders, state.orders); write(KEY.prefs, state.prefs);
  emit();
}

export function forgetEverything() {
  Object.values(KEY).forEach((k) => { try { localStorage.removeItem(k); } catch {} });
  state.bag = []; state.profile = { name: "", phone: "" }; state.orders = []; state.member = null;
  state.prefs = { branch: "vanak", note: "", useCashback: true, sample: false, seeded: true };
  write(KEY.prefs, state.prefs);
  emit();
}
