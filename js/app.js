// Wiring. Routes, the two bars, and the handful of things that have to stay in
// step with state no matter which screen is up.

import { BUSINESS } from "./config.js";
import { MARK } from "./brand.js";
import { WORDMARK } from "./wordmark.js";
import { initTheme } from "./theme.js";
import { $, $$, money } from "./util.js";
import { icon } from "./icons.js";
import { route, startRouter, path } from "./router.js";
import { bagCount, bagTotal, subscribe, prefs, seedSample, myBranch, photo } from "./store.js";
import * as presence from "./presence.js";
import { runBoot } from "./boot.js";
import { wireAdds, wireImages, observeReveals, closeSheet } from "./ui.js";

import home from "./views/home.js";
import menu from "./views/menu.js";
import bagView from "./views/bag.js";
import orderView from "./views/order.js";
import checkin from "./views/checkin.js";
import branches from "./views/branches.js";
import profileView from "./views/profile.js";
import profileEdit from "./views/profile-edit.js";

/* ----------------------------------------------------------------- routes */
route("/", home);
route("/menu", menu);
route("/bag", bagView);
route("/order/:id", orderView);
route("/checkin", checkin);
route("/branches", branches);
route("/profile", profileView);
route("/profile/edit", profileEdit);
route("/item/:id", ({ id }) => menu({ focus: id }, {}));

/* ------------------------------------------------------------------- bars */
const bar = $("#bar");
const tabs = $("#tabs");
const ink = $("#tabs-ink");
const chip = $("#ci-chip");
const barTitle = $("#bar-title");
const back = $("#bar-back");
const homeLink = $(".bar-home");

$("#bar-mark").innerHTML = MARK;
$("#bar-word").innerHTML = WORDMARK;
$("#bag-ico").innerHTML = icon("bag");
back.innerHTML = icon("chevronL");
tabs.querySelectorAll(".tab").forEach((tab) => { tab.querySelector(".tab-ico").innerHTML = icon(tab.dataset.tab); });

const TAB_FOR = { "/": "home", "/menu": "menu", "/item": "menu", "/checkin": "checkin", "/branches": "branches", "/profile": "profile", "/bag": null, "/order": null };
const TITLES = { "/menu": "Menu", "/item": "Menu", "/bag": "Bag", "/order": "Order", "/checkin": "Check in", "/branches": "Branches", "/profile": "You", "/profile/edit": "Edit profile" };
const titleOf = (p) => TITLES[p] ?? TITLES[rootOf(p)];
const rootOf = (p) => (p in TAB_FOR ? p : "/" + p.split("/")[1]);

function paintTabs(p) {
  const key = TAB_FOR[rootOf(p)] ?? null;
  let active = null;
  tabs.querySelectorAll(".tab").forEach((tab) => {
    const on = tab.dataset.tab === key;
    tab.setAttribute("aria-current", on ? "page" : "false");
    if (on) active = tab;
  });
  if (!active) { ink.style.opacity = "0"; return; }
  ink.style.removeProperty("opacity");
  const box = active.getBoundingClientRect();
  const host = tabs.getBoundingClientRect();
  ink.style.width = `${box.width}px`;
  ink.style.transform = `translateX(${box.left - host.left}px)`;
  tabs.dataset.ready = "1";
}

/* ---------------------------------------------------------------- the bag */
const dock = $("#dock");
function paintBag() {
  const n = bagCount();
  const badge = $("#bag-count");
  badge.textContent = n > 9 ? "9+" : n;
  badge.classList.toggle("on", n > 0);
  const p = rootOf(path() || "/");
  const show = n > 0 && p !== "/bag" && p !== "/order";
  if (show) { $("#dock-n").textContent = n; $("#dock-sum").textContent = `${money(bagTotal())} ${BUSINESS.currency}`; }
  dock.hidden = !show;
}
subscribe(paintBag);

/* ------------------------------------------------- your face on the You tab */
const youIco = tabs.querySelector('[data-tab="profile"] .tab-ico');
let shownPhoto = null;
function paintYou() {
  const ph = photo();
  if (ph === shownPhoto) return;
  shownPhoto = ph;
  youIco.innerHTML = ph ? `<span class="tab-av"><img src="${ph}" alt=""></span>` : icon("profile");
}
subscribe(paintYou);
paintYou();

/* ----------------------------------------------------------- the check-in */
function paintChip() {
  const mine = presence.me();
  const p = rootOf(path() || "/");
  chip.hidden = !(p === "/" || p === "/menu" || p === "/branches");
  const label = $("#ci-chip-label");
  if (!mine) {
    const b = myBranch();
    const n = presence.counts()[b.id];
    chip.dataset.in = "0";
    chip.dataset.live = n ? "1" : "0";
    label.textContent = n ? `${n} at ${b.en}` : "Check in";
    chip.setAttribute("aria-label", n ? `${n} people at ${b.en} — check in` : "Check in");
    return;
  }
  const left = Math.max(0, Math.ceil((mine.until - Date.now()) / 60000));
  chip.dataset.in = "1";
  label.textContent = `You're in · ${left}m`;
  chip.setAttribute("aria-label", `Checked in, ${left} minutes left`);
}
chip.addEventListener("click", () => { location.hash = "#/checkin"; });
presence.subscribe(paintChip);
setInterval(paintChip, 30000);

/* --------------------------------------------------------- scroll and title */
// Recomputed on every render as well as on scroll: replacing the DOM fires no
// scroll event, and a short page must not inherit the bar the long one earned.
let lt = null;
let ticking = false;
function chrome() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const scrollable = document.documentElement.scrollHeight - innerHeight > 40;
    bar.classList.toggle("solid", scrollable && scrollY > 24);
    const barBottom = bar.getBoundingClientRect().bottom;
    const titled = !!lt && lt.getBoundingClientRect().bottom < barBottom - 6;
    bar.classList.toggle("titled", titled);
  });
}
addEventListener("scroll", chrome, { passive: true });
addEventListener("resize", () => { chrome(); paintTabs(path() || "/"); });

/* ------------------------------------------------------------ after render */
document.addEventListener("view:rendered", (e) => {
  const p = e.detail.path;
  closeSheet();
  paintTabs(p);
  paintBag();
  paintChip();
  lt = e.detail.screen.querySelector(".lt");
  barTitle.textContent = titleOf(p) || "";
  // a pushed screen (two segments deep, or a page with no tab of its own) gets a back button
  const sub = TAB_FOR[rootOf(p)] === null || p.split("/").filter(Boolean).length > 1;
  back.hidden = !sub;
  homeLink.hidden = sub;
  bar.classList.remove("solid", "titled");
  bar.classList.toggle("on-bag", rootOf(p) === "/bag");
  observeReveals(e.detail.screen);
  wireImages(e.detail.screen);
  chrome();
  const label = titleOf(p);
  document.title = label ? `${label} · KAI Coffee` : `KAI Coffee — ${BUSINESS.city}`;
});
back.addEventListener("click", () => (history.length > 1 ? history.back() : (location.hash = "#/")));

/* -------------------------------------------------------------------- go */
initTheme();
wireAdds();
if (!prefs().seeded) seedSample();
runBoot(startRouter());

if ("serviceWorker" in navigator && !location.search.includes("nosw")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
