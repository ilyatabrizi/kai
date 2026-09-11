// Check in. One tap when you sit down. It holds your seat for an hour and lets
// it go by itself; tapping again is how you leave early. The room is the list
// of everyone who did the same, at this branch, in the last hour.

import { CHECKIN } from "../config.js";
import { BRANCHES } from "../data.js";
import { MARK } from "../brand.js";
import { esc, initials, hm, ago, clamp, plural } from "../util.js";
import { icon } from "../icons.js";
import { haptic, reduced, replay } from "../motion.js";
import { toast, branchSheet } from "../ui.js";
import * as presence from "../presence.js";
import { profile, myBranch, setMyBranch } from "../store.js";

const HOLD = CHECKIN.holdMinutes * 60000;

const person = (p, meId) => {
  const mine = p.id === meId;
  const who = p.name || (mine ? "You" : "Someone");
  return `<li class="person${mine ? " me" : ""}">
    <span class="avatar">${esc(initials(who))}</span>
    <span class="person-n">${esc(who)}${mine ? "" : ""}<small>Since ${hm(new Date(p.at))} · ${ago(p.at)}</small></span>
    ${mine && p.name ? `<span class="tag">You</span>` : ""}
  </li>`;
};

export default function checkin() {
  const html = `
  <div class="wrap">
    <header class="ph"><h1 class="lt">Check in</h1>
      <p class="ph-sub small">One tap when you sit down. Your seat is held for an hour, and everyone deciding whether to come over can see who's there.</p></header>

    <ul class="list"><li><button class="row row--tap" type="button" id="pick">
      <span class="row-ico row-ico--sage">${icon("pin")}</span>
      <span class="row-t"><span class="row-n" id="pick-n"></span><span class="row-d" id="pick-d"></span></span>
      <span class="row-v">${icon("chevron")}</span></button></li></ul>

    <div class="ci-wrap" style="margin-top:26px">
      <button class="dial" id="dial" type="button" aria-pressed="false" aria-label="Check in">
        <span class="dial-ring" id="dial-ring"></span>
        <span class="dial-pulse"></span><span class="dial-pulse"></span>
        <span class="dial-mark">${MARK}</span>
      </button>
      <div class="ci-state">
        <div class="t2" id="ci-title"></div>
        <p class="small" id="ci-sub"></p>
      </div>
      <div class="ci-acts" id="ci-acts"></div>
    </div>

    <section class="sec">
      <div class="sec-head"><h2 class="t2" id="room-title"></h2><span class="tiny" id="room-n"></span></div>
      <ul class="list people" id="room"></ul>
    </section>

    <section class="sec">
      <div class="sec-head"><h2 class="t2">Other branches</h2></div>
      <ul class="list" id="others"></ul>
    </section>
    <p class="tiny" style="margin-top:22px;text-align:center">Nothing is asked for and nothing is kept — the check-in clears itself after ${CHECKIN.holdMinutes} minutes.</p>
  </div>`;

  return {
    html,
    mount(screen) {
      const $ = (s) => screen.querySelector(s);
      const dial = $("#dial"), ring = $("#dial-ring"), title = $("#ci-title"), sub = $("#ci-sub"), acts = $("#ci-acts");
      const pickN = $("#pick-n"), pickD = $("#pick-d"), room = $("#room"), roomTitle = $("#room-title"), roomN = $("#others"), roomCount = $("#room-n");
      const meId = presence.myId();
      let ticking = null;

      // the branch on screen: where I am checked in, else my branch
      const here = () => { const mine = presence.me(); return mine ? BRANCHES.find((b) => b.id === mine.branch) : myBranch(); };

      const paintRoom = () => {
        const b = here();
        const people = presence.list(b.id);
        const counts = presence.counts();
        pickN.textContent = `${presence.me() ? "You're at" : "You're heading to"} ${b.en}`;
        pickD.textContent = `${b.region} · ${counts[b.id] ? plural(counts[b.id], "person", "people") + " here now" : "quiet right now"} · tap to change`;
        roomTitle.textContent = `At ${b.en} now`;
        roomCount.textContent = people.length ? plural(people.length, "person", "people") : "";
        room.innerHTML = people.length
          ? [...people].reverse().map((p) => person(p, meId)).join("")
          : `<li class="empty"><span class="empty-mark">${MARK}</span><p class="d3">Nobody's checked in yet.</p><p class="small" style="margin-top:6px">Be the first — the room fills from here.</p></li>`;
        roomN.innerHTML = BRANCHES.filter((x) => x.status === "open" && x.id !== b.id).map((x) => `
          <li><button class="row row--tap" type="button" data-go="${x.id}">
            <span class="row-ico">${icon("pin")}</span>
            <span class="row-t"><span class="row-n">${esc(x.en)} <span class="fa small" lang="fa">${esc(x.fa)}</span></span><span class="row-d">${esc(x.region)}</span></span>
            <span class="row-v">${counts[x.id] ? `<b>${counts[x.id]}</b> here` : "quiet"} ${icon("chevron")}</span></button></li>`).join("");
        roomN.querySelectorAll("[data-go]").forEach((btn) => btn.addEventListener("click", () => {
          if (presence.me()) { toast("Leave first to check in somewhere else"); return; }
          setMyBranch(btn.dataset.go); paintRoom(); paintState(); scrollTo({ top: 0, behavior: "smooth" });
        }));
      };

      const paintState = () => {
        const mine = presence.me();
        clearInterval(ticking);
        dial.setAttribute("aria-pressed", String(!!mine));
        dial.setAttribute("aria-label", mine ? "Leave" : "Check in");
        dial.classList.toggle("on", !!mine);
        const b = here();
        if (!mine) {
          title.textContent = `Are you at ${b.en}?`;
          sub.textContent = `Tap the mark. Your seat is held for ${CHECKIN.holdMinutes} minutes.`;
          acts.innerHTML = `<button class="btn" type="button" id="in">${icon("checkin")} I'm here</button>`;
          acts.querySelector("#in").addEventListener("click", enter);
          ring.style.setProperty("--p", "100%");
          return;
        }
        title.textContent = `You're in.`;
        sub.textContent = `Held until ${hm(new Date(mine.until))}. Show this at the counter when you order.`;
        acts.innerHTML = `<button class="btn btn--soft btn--sm" type="button" id="extend">Another hour</button>
                          <button class="btn btn--quiet btn--sm" type="button" id="out">Leave</button>`;
        acts.querySelector("#extend").addEventListener("click", () => { haptic(10); presence.extend(); paintState(); toast("Another hour on the clock", { ico: "clock" }); });
        acts.querySelector("#out").addEventListener("click", leave);
        const tick = () => {
          const left = mine.until - Date.now();
          if (left <= 0) { toast("Your hour is up — the seat is free again"); paintState(); paintRoom(); return; }
          ring.style.setProperty("--p", `${(clamp(left / HOLD, 0, 1) * 100).toFixed(1)}%`);
          sub.textContent = `${Math.ceil(left / 60000)} min left · held until ${hm(new Date(mine.until))}. Show this at the counter when you order.`;
        };
        tick();
        ticking = setInterval(tick, 5000);
      };

      const enter = () => {
        const b = here();
        presence.checkIn({ branchId: b.id, name: profile().name });
        haptic([14, 40, 20]);
        if (!reduced()) replay(dial, "fire");
        paintState(); paintRoom();
        toast(`Checked in at ${b.en} for ${CHECKIN.holdMinutes} minutes`, { ico: "check" });
      };
      const leave = () => { haptic([8, 24, 8]); presence.checkOut(); paintState(); paintRoom(); toast("See you soon"); };

      dial.addEventListener("click", () => (presence.me() ? leave() : enter()));
      $("#pick").addEventListener("click", () => {
        if (presence.me()) { toast("You're checked in here — leave first to switch"); return; }
        branchSheet({ title: "Which KAI are you at?", withCounts: true, onPick: () => { paintRoom(); paintState(); } });
      });

      const off = presence.subscribe(() => { if (!room.isConnected) { off(); clearInterval(ticking); return; } paintRoom(); });
      document.addEventListener("view:leaving", function once() { clearInterval(ticking); off(); document.removeEventListener("view:leaving", once); });
      paintRoom();
      paintState();
    },
  };
}
