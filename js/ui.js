// The chrome every view borrows: toasts, the − n + control, the one-tap add, the
// bottom sheet (and the two sheets the app opens most: an item, a branch), lazy
// images and reveal-on-scroll.

import { $, $$, esc, priceHTML, price, initials, hueOf } from "./util.js";
import { haptic, replay, reduced } from "./motion.js";
import { icon } from "./icons.js";
import { byId, BRANCHES } from "./data.js";
import { addLine, inBag, myBranch, setMyBranch } from "./store.js";
import { MARK } from "./brand.js";
import * as presence from "./presence.js";

/* ------------------------------------------------------------------ toast */
export function toast(message, { ms = 2200, ico = "" } = {}) {
  const root = $("#toast-root");
  if (!root) return;
  [...root.children].slice(0, -1).forEach((n) => n.remove());
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `${ico ? icon(ico) : `<span class="dot"></span>`}<span></span>`;
  node.lastElementChild.textContent = message;
  root.append(node);
  setTimeout(() => {
    node.classList.add("out");
    node.addEventListener("animationend", () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 500);
  }, ms);
}

/* -------------------------------------------------------------------- qty */
export const qtyHTML = (n) => `
  <span class="qty">
    <button type="button" data-dec aria-label="One fewer">${icon("minus")}</button>
    <output aria-live="polite">${n}</output>
    <button type="button" data-inc aria-label="One more">${icon("plus")}</button>
  </span>`;

/** Wire a − n + control. onChange gets the new quantity. */
export function qty(node, { value, min = 0, max = 9, onChange }) {
  const out = node.querySelector("output");
  const set = (n) => {
    value = Math.min(max, Math.max(min, n));
    out.textContent = value;
    onChange(value);
  };
  node.querySelector("[data-dec]").addEventListener("click", () => { haptic(6); set(value - 1); });
  node.querySelector("[data-inc]").addEventListener("click", () => { haptic(6); set(value + 1); });
  return { set: (n) => { value = n; out.textContent = n; } };
}

/* ------------------------------------------------------------- add to bag */
export const addHTML = (item) => `
  <button class="add" type="button" data-add="${item.id}" aria-label="Add ${esc(item.en)} to the bag">
    <span class="add-plus">${icon("plus")}</span><span class="add-check">${icon("check")}</span>
  </button>`;

/** One tap. The item goes in as it comes; the button flips to a tick; a toast says so. */
export function addItem(itemId, btn, qtyN = 1) {
  const item = byId(itemId);
  if (!item) return;
  haptic([10, 26, 12]);
  addLine(itemId, qtyN);
  if (btn) { replay(btn, "done"); setTimeout(() => btn.classList.remove("done"), 900); }
  toast(`${item.en} in the bag`, { ico: "bag" });
}

/** One listener for the whole app, on the document — views come and go. */
export function wireAdds() {
  if (wireAdds.done) return;
  wireAdds.done = true;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (btn) { e.preventDefault(); e.stopPropagation(); addItem(btn.dataset.add, btn); return; }
    const open = e.target.closest("[data-item]");
    if (open && !e.target.closest("a[href]")) { e.preventDefault(); itemSheet(open.dataset.item); }
  });
}

/* ------------------------------------------------------------------ sheet */
let openNow = null;

export function closeSheet() {
  if (!openNow) return;
  const { scrim, sheet, onClose } = openNow;
  openNow = null;
  sheet.classList.remove("on");
  scrim.classList.remove("on");
  document.documentElement.style.overflow = "";
  setTimeout(() => { scrim.remove(); sheet.remove(); onClose?.(); }, reduced() ? 0 : 420);
}

/**
 * A bottom sheet with a grabber, a scrim, swipe-down to close and Escape.
 * body/foot are HTML; mount(sheet) runs once it is in the document.
 */
export function openSheet({ title = "", sub = "", body = "", foot = "", mount, onClose, label } = {}) {
  closeSheet();
  const root = $("#sheet-root");
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const sheet = document.createElement("section");
  sheet.className = "sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", label || title || "Sheet");
  sheet.innerHTML = `
    <div class="sheet-grab"><i></i></div>
    <button class="sheet-close" type="button" aria-label="Close">${icon("close")}</button>
    <div class="sheet-body">
      ${title ? `<h2 class="sheet-title">${title}</h2>` : ""}
      ${sub ? `<p class="sheet-sub">${sub}</p>` : ""}
      ${body}
    </div>
    ${foot ? `<div class="sheet-foot">${foot}</div>` : ""}`;
  root.append(scrim, sheet);
  document.documentElement.style.overflow = "hidden";
  openNow = { scrim, sheet, onClose };
  requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add("on"); sheet.classList.add("on"); }));

  scrim.addEventListener("click", closeSheet);
  sheet.querySelector(".sheet-close").addEventListener("click", closeSheet);
  const onKey = (e) => { if (e.key === "Escape") { closeSheet(); document.removeEventListener("keydown", onKey); } };
  document.addEventListener("keydown", onKey);

  // swipe down on the grabber (or the body when it is scrolled to the top)
  let y0 = null, dy = 0;
  const grab = sheet.querySelector(".sheet-grab");
  const bodyEl = sheet.querySelector(".sheet-body");
  const start = (e) => { y0 = e.touches[0].clientY; dy = 0; sheet.classList.add("drag"); };
  const move = (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
  };
  const end = () => {
    sheet.classList.remove("drag");
    sheet.style.transform = "";
    if (dy > 90) closeSheet();
    y0 = null;
  };
  grab.addEventListener("touchstart", start, { passive: true });
  grab.addEventListener("touchmove", move, { passive: true });
  grab.addEventListener("touchend", end);
  bodyEl.addEventListener("touchstart", (e) => { if (bodyEl.scrollTop <= 0) start(e); }, { passive: true });
  bodyEl.addEventListener("touchmove", (e) => { if (y0 != null && bodyEl.scrollTop <= 0) move(e); }, { passive: true });
  bodyEl.addEventListener("touchend", () => { if (y0 != null) end(); });

  mount?.(sheet);
  wireImages(sheet);
  return { sheet, close: closeSheet };
}

/* ------------------------------------------------------------- item sheet */
export function itemSheet(itemId) {
  const item = byId(itemId);
  if (!item) return;
  let n = 1;
  const body = `
    <div class="it-hero"><img src="${item.img}" alt="" width="560" height="560" decoding="async"></div>
    <div class="it-head">
      <div>
        <h2 class="it-name">${esc(item.en)}</h2>
        <div class="it-fa" lang="fa">${esc(item.fa)}</div>
      </div>
      <div class="it-price">${priceHTML(item.price)}</div>
    </div>
    <div class="it-tags">
      ${item.badge === "new" ? `<span class="tag">New at KAI</span>` : ""}
      ${item.size ? `<span class="tag tag--soft">${esc(item.size)}</span>` : ""}
      <span class="tag tag--soft">${esc(catName(item.cat))}</span>
    </div>
    ${item.ing || item.ingEn ? `
    <div class="it-ing">
      <div class="eyebrow">What's in it</div>
      ${item.ing ? `<div class="fa-block" lang="fa">${esc(item.ing)}</div>` : ""}
      ${item.ingEn ? `<div class="en">${esc(item.ingEn)}</div>` : ""}
    </div>` : ""}`;
  const foot = `
    <div class="it-foot">
      ${qtyHTML(1)}
      <button class="btn" type="button" id="it-add">Add to bag <span class="btn-sum money" id="it-sum">${price(item.price)}</span></button>
    </div>`;
  openSheet({
    body, foot, label: item.en,
    mount(sheet) {
      const sum = sheet.querySelector("#it-sum");
      qty(sheet.querySelector(".qty"), { value: 1, min: 1, max: 9, onChange: (v) => { n = v; sum.textContent = price(item.price * v); } });
      sheet.querySelector("#it-add").addEventListener("click", (e) => {
        addItem(item.id, null, n);
        closeSheet();
      });
    },
  });
}

import { CATEGORIES } from "./data.js";
export const catName = (id) => CATEGORIES.find((c) => c.id === id)?.en || id;

/* ----------------------------------------------------------- branch sheet */
/** Pick a branch. onPick(branch) runs after the choice is saved. */
export function branchSheet({ title = "Which KAI?", sub = "", onPick, withCounts = false } = {}) {
  const cur = myBranch().id;
  const counts = withCounts ? presence.counts() : null;
  const rows = BRANCHES.filter((b) => b.status === "open").map((b) => `
    <li><button class="row row--tap" type="button" data-pick="${b.id}">
      <span class="row-ico ${b.id === cur ? "row-ico--ink" : ""}">${icon(b.id === cur ? "check" : "pin")}</span>
      <span class="row-t"><span class="row-n">${esc(b.en)} <span class="fa small" lang="fa">${esc(b.fa)}</span></span>
        <span class="row-d">${esc(b.region)}${counts ? ` · ${counts[b.id]} here now` : ""}</span></span>
      <span class="row-v">${icon("chevron")}</span>
    </button></li>`).join("");
  openSheet({
    title, sub,
    body: `<ul class="list list--flat" style="margin-top:14px">${rows}</ul>`,
    mount(sheet) {
      sheet.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => {
        haptic(8);
        setMyBranch(b.dataset.pick);
        closeSheet();
        onPick?.(BRANCHES.find((x) => x.id === b.dataset.pick));
      }));
    },
  });
}

/* ----------------------------------------------------------------- images */
/** Fade images in once they have pixels; an image that fails retries once and then stays hidden on its tile. */
export function wireImages(root = document) {
  $$("img.imgload, .frame img, .mitem-img img, .tile-img img, .cat-img img, .line-img img", root).forEach((im) => {
    if (im.dataset.wired) return;
    im.dataset.wired = "1";
    const ready = () => { im.classList.add("ready"); im.closest(".frame")?.classList.add("cap"); };
    if (im.complete && im.naturalWidth) { ready(); return; }
    im.addEventListener("load", ready, { once: true });
    im.addEventListener("error", () => {
      if (!im.dataset.retry) { im.dataset.retry = "1"; setTimeout(() => { im.src = im.src.split("?")[0] + "?r=1"; }, 800); }
    });
  });
}

let revealObs = null;
export function observeReveals(root = document) {
  revealObs?.disconnect();
  const items = $$(".rv", root);
  if (!("IntersectionObserver" in window) || reduced()) { items.forEach((el) => el.classList.add("in")); return; }
  revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
  items.forEach((el) => revealObs.observe(el));
}

export const emptyHTML = (title, sub) => `
  <div class="empty"><span class="empty-mark">${MARK}</span>
    <p class="d3">${title}</p><p class="small" style="margin-top:6px">${sub}</p></div>`;

/* ---------------------------------------------------------------- avatars */
/** A face: the photo if there is one, else initials on the person's colour. */
export function avatarHTML({ name = "", photo = "", hue = null, size = 40, me = false, cls = "" } = {}) {
  const h = hue ?? hueOf(name || "?");
  const face = photo ? `<img src="${photo}" alt="" decoding="async">`
    : name ? `<b>${esc(initials(name))}</b>` : icon("profile");
  return `<span class="av av-${h}${me ? " av--me" : ""}${cls ? " " + cls : ""}" style="--s:${size}px" aria-hidden="true">${face}</span>`;
}

/* ------------------------------------------------------ segmented control */
export const segHTML = (name, options, value, cls = "") => `
  <div class="seg ${cls}" role="radiogroup" data-seg="${name}">
    <span class="seg-ink" aria-hidden="true"></span>
    ${options.map((o) => `<button type="button" role="radio" aria-checked="${o.v === value}" data-v="${o.v}">${o.ico ? icon(o.ico) : ""}<span>${esc(o.label)}</span></button>`).join("")}
  </div>`;

/** The white pill slides to the chosen segment; onChange(value, event). */
export function wireSeg(seg, onChange) {
  const ink = seg.querySelector(".seg-ink");
  const place = (animate = true) => {
    const on = seg.querySelector('[aria-checked="true"]') || seg.querySelector("button");
    if (!on || !on.offsetWidth) return;
    if (!animate) ink.style.transition = "none";
    ink.style.width = `${on.offsetWidth}px`;
    ink.style.transform = `translateX(${on.offsetLeft - 3}px)`;
    if (!animate) { void ink.offsetWidth; ink.style.transition = ""; }
    seg.dataset.ready = "1";
  };
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b || b.getAttribute("aria-checked") === "true") return;
    seg.querySelectorAll("button[data-v]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    haptic(6); place(); onChange(b.dataset.v, e);
  });
  place(false);
  if ("ResizeObserver" in window) new ResizeObserver(() => place(false)).observe(seg);
  return { place };
}

/* ------------------------------------------------------------ action sheet */
/** iOS-style choices. Each action runs inside the tap, so a file picker may open from it. */
export function actionSheet({ title = "", sub = "", actions = [] } = {}) {
  openSheet({
    title, sub,
    body: `<div class="acts">${actions.map((a, i) => `<button class="act${a.danger ? " act--danger" : ""}" type="button" data-i="${i}">${a.ico ? icon(a.ico) : ""}<span>${esc(a.label)}</span></button>`).join("")}</div>`,
    mount(sheet) {
      sheet.querySelectorAll(".act").forEach((b) => b.addEventListener("click", () => {
        const a = actions[+b.dataset.i];
        closeSheet();
        a.run?.();
      }));
    },
  });
}
