// Who is at which branch right now.
//
// Checking in is one tap and asks for nothing. It holds for an hour and then
// retires itself, so no list can go stale in a way that embarrasses anybody.
// Storage is this device by default; set CHECKIN.endpoint in config.js and the
// same calls go to a shared room instead, with no change to any view.
//
// The demo roster is derived from the clock — same branch, same ten minutes,
// same faces — so a single phone shows a believable room and two people looking
// at the same screen see the same thing.

import { CHECKIN, STORAGE } from "./config.js";
import { BRANCHES } from "./data.js";
import { uid, rng, hash32, hueOf } from "./util.js";

const KEY = STORAGE + "room";
const VISITS = STORAGE + "visits";
const ME = STORAGE + "meid";
const HOLD = CHECKIN.holdMinutes * 60000;

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn());

const channel = "BroadcastChannel" in self ? new BroadcastChannel("kai-room") : null;
if (channel) channel.onmessage = () => emit();
addEventListener("storage", (e) => { if (e.key === KEY) emit(); });

const readAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const writeAll = (rows) => {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {}
  channel?.postMessage("x");
  emit();
};

export function myId() {
  let id = null;
  try { id = localStorage.getItem(ME); } catch {}
  if (!id) { id = uid(); try { localStorage.setItem(ME, id); } catch {} }
  return id;
}

/* ------------------------------------------------------------------- demo */
const NAMES = ["Sara", "Nima", "Elnaz", "Amir", "Ladan", "Kaveh", "Aylin", "Reza", "Mahsa", "Sina",
               "Roya", "Arman", "Niloofar", "Babak", "Parisa", "Hamed", "Yasna", "Kian", "Donya", "Sam",
               "Tara", "Pouya", "Negin", "Ali", "Shirin", "Farhad", "Melika", "Dara"];
// How full a KAI room is through the day, 0..1, by hour.
const CURVE = [0, 0, 0, 0, 0, 0, .05, .15, .35, .5, .55, .6, .65, .55, .45, .5, .7, .85, .95, 1, .95, .8, .5, .2];
const CAP = { velenjak: 8, royan: 6, vanak: 9, "shahrak-gharb": 8, jordan: 9, pasdaran: 7, mirdamad: 7, kish: 0 };

function demoRoster(branchId, now = Date.now()) {
  if (!CHECKIN.demo) return [];
  const d = new Date(now);
  const bucket = Math.floor(d.getMinutes() / 10);
  const seed = hash32(`${branchId}|${d.getFullYear()}-${d.getMonth()}-${d.getDate()}|${d.getHours()}|${bucket}`);
  const r = rng(seed);
  const cap = CAP[branchId] ?? 6;
  const fill = CURVE[d.getHours()] * cap;
  const n = Math.max(0, Math.round(fill + (r() - .5) * 2.4));
  const used = new Set();
  const rows = [];
  for (let i = 0; i < n; i++) {
    let name;
    do { name = NAMES[Math.floor(r() * NAMES.length)]; } while (used.has(name));
    used.add(name);
    const at = now - Math.floor(r() * 52 + 1) * 60000 - Math.floor(r() * 60) * 1000;
    rows.push({ id: `demo-${branchId}-${name}`, name, hue: hueOf(name), at, until: at + HOLD, branch: branchId, demo: true });
  }
  return rows;
}

/* ------------------------------------------------------------------- room */
const live = (rows, now) => rows.filter((p) => p.until > now);

/** Everyone at a branch whose hour has not run out, newest arrival last. */
export function list(branchId, now = Date.now()) {
  const mine = live(readAll(), now).filter((p) => p.branch === branchId);
  return [...demoRoster(branchId, now), ...mine].sort((a, b) => a.at - b.at);
}

/** { branchId: headcount } for every branch. */
export function counts(now = Date.now()) {
  const out = {};
  for (const b of BRANCHES) out[b.id] = b.status === "open" ? list(b.id, now).length : 0;
  return out;
}

export const me = () => live(readAll(), Date.now()).find((p) => p.id === myId()) || null;
export const isIn = () => !!me();

export function checkIn({ branchId, name, hue } = {}) {
  const now = Date.now();
  const rows = live(readAll(), now).filter((p) => p.id !== myId());
  const entry = { id: myId(), name: name || "", hue: hue ?? null, at: now, until: now + HOLD, branch: branchId };
  rows.push(entry);
  writeAll(rows);
  logVisit(branchId, now);
  return entry;
}

/** Keep the name others see in step with Settings while you are checked in. */
export function rename(name, hue) {
  const rows = readAll();
  const mine = rows.find((p) => p.id === myId());
  if (!mine) return;
  mine.name = name || ""; mine.hue = hue ?? null;
  writeAll(rows);
}

/* ---------------------------------------------------------------- visits */
// Your own check-ins on this phone, so the room can say "your 3rd visit this month".
const readVisits = () => { try { return JSON.parse(localStorage.getItem(VISITS) || "[]"); } catch { return []; } };
function logVisit(branch, at) {
  const v = readVisits(); v.push({ branch, at });
  try { localStorage.setItem(VISITS, JSON.stringify(v.slice(-120))); } catch {}
}
export function visitsThisMonth(now = new Date()) {
  return readVisits().filter((x) => { const d = new Date(x.at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
}
export const forgetVisits = () => { try { localStorage.removeItem(VISITS); } catch {} };

export function extend() {
  const rows = readAll();
  const mine = rows.find((p) => p.id === myId());
  if (!mine) return null;
  mine.until = Date.now() + CHECKIN.extendMinutes * 60000;
  writeAll(rows);
  return mine;
}

export function checkOut() { writeAll(readAll().filter((p) => p.id !== myId())); }

// Retire anyone whose hour is up, and let the demo roster roll over, on a timer.
setInterval(() => {
  const now = Date.now();
  const rows = readAll();
  if (rows.some((p) => p.until <= now)) writeAll(rows.filter((p) => p.until > now));
  else emit();
}, 30000);
