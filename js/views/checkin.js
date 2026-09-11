// Check in. Tap the cup when you sit down: it fills with the house olive, the
// ring starts keeping your hour, your face flies up to join the others on the
// branch card, and the room below shows who is here — with a wave for each of
// them. Tapping again is how you leave early; the hour lets go by itself.

import { CHECKIN } from "../config.js";
import { BRANCHES } from "../data.js";
import { MARK } from "../brand.js";
import { esc, hm, ago, plural, ordinal, countdown } from "../util.js";
import { icon } from "../icons.js";
import { haptic, reduced } from "../motion.js";
import { toast, branchSheet, avatarHTML } from "../ui.js";
import { dialHTML, liquid, ring, burst, fly } from "../dial.js";
import * as presence from "../presence.js";
import { profile, photo, shownName, fullName, myHue, myBranch, setMyBranch } from "../store.js";

const HOLD = CHECKIN.holdMinutes * 60000;

export default function checkin() {
  const html = `
  <div class="wrap">
    <header class="ph"><h1 class="lt">Check in</h1>
      <p class="ph-sub small">Tap the cup when you sit down. Your seat is held for an hour, and the room can see you're here.</p></header>

    <article class="place" id="place">
      <img class="place-img" id="place-img" alt="" decoding="async">
      <span class="place-shade"></span>
      <div class="place-top">
        <span class="place-live" id="place-live"><i></i><span id="place-n"></span></span>
        <button class="place-change" id="pick" type="button">${icon("pin")}<span>Change</span></button>
      </div>
      <div class="place-foot">
        <div class="place-t">
          <div class="place-name"><span id="place-en"></span><span class="fa" id="place-fa" lang="fa"></span></div>
          <div class="place-addr" id="place-addr" lang="fa"></div>
        </div>
        <div class="faces place-faces" id="place-faces"></div>
      </div>
    </article>

    <div class="stage" id="stage">
      <div class="dial-wrap">${dialHTML("Check in")}<span class="dial-burst" id="burst"></span></div>
      <div class="ci-state">
        <h2 class="ci-title" id="ci-title"></h2>
        <p class="ci-sub" id="ci-sub"></p>
        <p class="ci-clock" id="ci-clock" hidden></p>
      </div>
      <div class="ci-acts" id="ci-acts"></div>
    </div>

    <section class="sec">
      <div class="sec-head"><h2 class="t2" id="room-title">In the room</h2><span class="tiny" id="room-n"></span></div>
      <ul class="list room" id="room"></ul>
    </section>

    <section class="sec">
      <div class="sec-head"><h2 class="t2">Other branches</h2></div>
      <ul class="list" id="others"></ul>
    </section>
    <p class="tiny ci-foot">Nothing is asked for and nothing is kept — a check-in clears itself after ${CHECKIN.holdMinutes} minutes. How the room sees you is set in You → Settings.</p>
  </div>`;

  return {
    html,
    mount(screen) {
      const $ = (s) => screen.querySelector(s);
      const dial = $("#dial"), ringEl = $("#dial-ring"), cup = liquid(dial);
      const title = $("#ci-title"), sub = $("#ci-sub"), clock = $("#ci-clock"), acts = $("#ci-acts");
      const faces = $("#place-faces"), live = $("#place-live"), liveN = $("#place-n");
      const room = $("#room"), others = $("#others");
      const meId = presence.myId();
      const waved = new Set();
      let tick = 0, busy = false, shownBranch = null;

      const here = () => { const m = presence.me(); return (m && BRANCHES.find((b) => b.id === m.branch)) || myBranch(); };
      const myFace = (size) => avatarHTML({ name: fullName(), photo: photo(), hue: myHue(), size, me: true });
      const faceOf = (p, size) => (p.id === meId ? myFace(size) : avatarHTML({ name: p.name, hue: p.hue, size }));

      const paintPlace = () => {
        const b = here();
        if (shownBranch !== b.id) {
          shownBranch = b.id;
          const img = $("#place-img");
          img.classList.remove("ready");
          img.onload = () => img.classList.add("ready");
          img.src = b.img;
          if (img.complete && img.naturalWidth) img.classList.add("ready");
          $("#place-en").textContent = b.en;
          $("#place-fa").textContent = b.fa;
          $("#place-addr").textContent = b.address;
        }
        const people = presence.list(b.id);
        live.classList.toggle("quiet", !people.length);
        liveN.textContent = people.length ? `${people.length} here now` : "Quiet right now";
        faces.innerHTML = [...people].reverse().slice(0, 4).map((p) => faceOf(p, 30)).join("")
          + (people.length > 4 ? `<span class="more">+${people.length - 4}</span>` : "");
      };

      const paintRoom = () => {
        const b = here();
        const people = presence.list(b.id);
        const mine = presence.me();
        $("#room-title").textContent = `At ${b.en} now`;
        $("#room-n").textContent = people.length ? plural(people.length, "person", "people") : "";
        room.innerHTML = people.length ? [...people].reverse().map((p) => {
          const me = p.id === meId;
          const who = me ? "You" : (p.name || "A guest");
          const note = me ? (p.name ? `Shown to the room as ${p.name}` : profile().appear === "hidden" ? "Hidden from the room" : "Shown as a guest — add your name in Edit profile")
            : `Since ${hm(new Date(p.at))}, ${ago(p.at)}`;
          const right = me ? `<span class="tag">You</span>`
            : mine ? `<button class="wave" type="button" data-wave="${esc(p.id)}" data-name="${esc(p.name || "them")}" aria-pressed="${waved.has(p.id)}" aria-label="Wave at ${esc(p.name || "them")}">${icon("hand")}</button>` : "";
          return `<li class="person${me ? " me" : ""}">${faceOf(p, 40)}<span class="person-n">${esc(who)}<small>${esc(note)}</small></span>${right}</li>`;
        }).join("") : `<li class="empty"><span class="empty-mark">${MARK}</span><p class="d3">Nobody's checked in yet.</p><p class="small" style="margin-top:6px">Be the first — the room fills from here.</p></li>`;
        const counts = presence.counts();
        others.innerHTML = BRANCHES.filter((x) => x.status === "open" && x.id !== b.id).map((x) => `
          <li><button class="row row--tap" type="button" data-go="${x.id}">
            <span class="row-ico">${icon("pin")}</span>
            <span class="row-t"><span class="row-n">${esc(x.en)} <span class="fa small" lang="fa">${esc(x.fa)}</span></span><span class="row-d">${esc(x.region)}</span></span>
            <span class="row-v">${counts[x.id] ? `<span class="count">${counts[x.id]} here</span>` : "quiet"} ${icon("chevron")}</span></button></li>`).join("");
      };

      const paintState = () => {
        const mine = presence.me();
        const b = here();
        clearInterval(tick);
        dial.setAttribute("aria-pressed", String(!!mine));
        dial.setAttribute("aria-label", mine ? `Leave ${b.en}` : `Check in at ${b.en}`);
        dial.classList.toggle("on", !!mine);
        if (!mine) {
          title.textContent = `Are you at ${b.en}?`;
          sub.textContent = `Tap the cup when you sit down — your seat is held for ${CHECKIN.holdMinutes} minutes.`;
          clock.hidden = true;
          acts.innerHTML = `<button class="btn" type="button" id="in">${icon("checkin")} I'm here</button>`;
          acts.querySelector("#in").addEventListener("click", enter);
          return;
        }
        const n = presence.list(b.id).length - 1;
        const nth = presence.visitsThisMonth();
        title.textContent = `You're in at ${b.en}.`;
        sub.innerHTML = (n > 0 ? `You <em class="amp">&amp;</em> ${plural(n, "other", "others")} are here` : "You're the first one in")
          + (nth ? ` — your ${ordinal(nth)} visit this month.` : ".");
        clock.hidden = false;
        acts.innerHTML = `<button class="btn btn--soft btn--sm" type="button" id="extend">${icon("clock")} Another hour</button>
                          <button class="btn btn--quiet btn--sm" type="button" id="out">Leave</button>`;
        acts.querySelector("#extend").addEventListener("click", extendHour);
        acts.querySelector("#out").addEventListener("click", leave);
        const t = () => {
          const m = presence.me();
          if (!m) { expire(); return; }
          clock.innerHTML = `<b class="num">${countdown(m.until)}</b> left on your seat, until ${hm(new Date(m.until))}`;
          ring(ringEl, (m.until - Date.now()) / HOLD);
        };
        t();
        tick = setInterval(t, 1000);
      };

      const paintAll = () => { paintPlace(); paintRoom(); paintState(); };
      const bump = () => { live.classList.remove("bump"); void live.offsetWidth; live.classList.add("bump"); };
      const pulse = () => { dial.classList.remove("fire"); void dial.offsetWidth; dial.classList.add("fire"); };

      async function enter() {
        if (busy || presence.me()) return;
        busy = true;
        const b = here();
        presence.checkIn({ branchId: b.id, name: shownName(), hue: myHue() });
        haptic([14, 40, 20]);
        paintState();
        paintRoom();
        const filled = cup.to(1, 900);
        setTimeout(() => ring(ringEl, 1), 220);
        setTimeout(() => { burst($("#burst")); pulse(); }, 540);
        await filled;
        // your face rises from the cup to the branch card
        const target = faces.querySelector(".av") || live;
        await fly(myFace(56), dial, target, { size: 56, land: 30 });
        busy = false;
        paintPlace();
        bump();
        toast(`Checked in at ${b.en}`, { ico: "check" });
      }

      async function leave() {
        if (busy || !presence.me()) return;
        busy = true;
        haptic([8, 24, 8]);
        const face = faces.querySelector(".av--me");
        if (face && face.animate && !reduced()) {
          await face.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(10px) scale(.3)", opacity: 0 }],
            { duration: 260, easing: "ease-in", fill: "forwards" }).finished.catch(() => {});
        }
        presence.checkOut();
        ring(ringEl, 0);
        await cup.to(0, 650);
        busy = false;
        paintAll();
        toast("See you soon", { ico: "hand" });
      }

      function extendHour() {
        haptic(10);
        presence.extend();
        pulse();
        paintState();
        toast("Another hour on the clock", { ico: "clock" });
      }

      function expire() {
        clearInterval(tick);
        ring(ringEl, 0);
        cup.to(0, 650).then(paintAll);
        toast("Your hour is up — the seat is free again");
      }

      dial.addEventListener("click", () => (presence.me() ? leave() : enter()));
      $("#pick").addEventListener("click", () => {
        if (presence.me()) { toast("You're checked in here — leave first to switch"); return; }
        branchSheet({ title: "Which KAI are you at?", withCounts: true, onPick: paintAll });
      });
      screen.addEventListener("click", (e) => {
        const w = e.target.closest("[data-wave]");
        if (w) {
          if (waved.has(w.dataset.wave)) return;
          waved.add(w.dataset.wave);
          haptic([8, 30, 8]);
          w.setAttribute("aria-pressed", "true");
          w.classList.remove("waving"); void w.offsetWidth; w.classList.add("waving");
          toast(`You waved at ${w.dataset.name}`, { ico: "hand" });
          return;
        }
        const g = e.target.closest("[data-go]");
        if (g) {
          if (presence.me()) { toast("Leave first to check in somewhere else"); return; }
          setMyBranch(g.dataset.go);
          paintAll();
          scrollTo({ top: 0, behavior: "smooth" });
        }
      });

      const mine = presence.me();
      cup.set(mine ? 1 : 0);
      ring(ringEl, mine ? (mine.until - Date.now()) / HOLD : 0, false);
      paintAll();
      const off = presence.subscribe(() => {
        if (!screen.isConnected) { off(); clearInterval(tick); return; }
        if (!busy) paintPlace();
        paintRoom();
      });
      document.addEventListener("view:leaving", function once() {
        clearInterval(tick); off();
        document.removeEventListener("view:leaving", once);
      });
    },
  };
}
