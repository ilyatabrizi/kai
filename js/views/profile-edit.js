// Edit profile. A photo (camera or library, framed in a circle), the colour your
// initials sit on when there is no photo, your name, phone and email, a Jalali
// birthday for the KAI Loyalty gift, your usual drink, your home branch, and how
// check-in rooms show you. Everything saves as you type; nothing leaves the phone.

import { ITEMS, byId } from "../data.js";
import { esc, price } from "../util.js";
import { icon } from "../icons.js";
import { toast, branchSheet, openSheet, closeSheet, avatarHTML, segHTML, wireSeg, actionSheet } from "../ui.js";
import { profile, setProfile, fullName, shownName, myHue, photo, setPhoto, myBranch } from "../store.js";
import { choosePhoto } from "../photo.js";
import { MONTHS, MONTHS_FA, nextOccurrence } from "../jalali.js";
import { haptic } from "../motion.js";
import { refresh } from "../router.js";
import * as presence from "../presence.js";

const HUE_NAMES = ["Sage", "Peach", "Sky", "Lilac", "Rose", "Mango", "Olive"];
const DRINKS = ["espresso-drinks", "warm-drinks", "cold-coffee", "cold-drinks", "refreshers"];
const PHONE = /^(\+98|0098|0)?9\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const face = (size) => avatarHTML({ name: fullName(), photo: photo(), hue: myHue(), size, me: true });

function bdayNote(b) {
  if (!b || !b.m || !b.d) return "For your KAI birthday gift";
  const n = nextOccurrence(b.m, b.d);
  const when = `${n.jd} ${MONTHS[b.m - 1]}`;
  if (n.days === 0) return `Today — happy birthday. Your gift is waiting at the counter.`;
  if (n.days === 1) return `${when}, tomorrow — your KAI gift is ready then.`;
  return `${when} — your gift comes round in ${n.days} days.`;
}

const appearNote = (v) => {
  const b = myBranch();
  if (v === "hidden") return "You stay off the list, but you still see who's there.";
  const n = shownName({ ...profile(), appear: v });
  return n ? `Others at ${b.en} see you as “${n}”.` : "Add your first name and the room will show it.";
};

export default function profileEdit() {
  const p = profile();
  const b = myBranch();
  const usual = byId(p.usual);
  const bd = p.bday || {};
  const html = `
  <div class="wrap pe">
    <header class="ph"><h1 class="lt">Edit profile</h1><p class="ph-sub small">Saved on this phone as you type.</p></header>

    <div class="pe-face">
      <button class="pe-av" id="pe-av" type="button" aria-label="${photo() ? "Change your photo" : "Add a photo"}"><span id="pe-av-face">${face(112)}</span><i>${icon("camera")}</i></button>
      <button class="link" id="pe-photo" type="button">${photo() ? "Change photo" : "Add a photo"}</button>
      <div class="pe-hues" role="radiogroup" aria-label="Colour behind your initials">
        ${HUE_NAMES.map((n, h) => `<button type="button" class="pe-hue av-${h}" role="radio" aria-checked="${h === myHue()}" aria-label="${n}" data-hue="${h}"></button>`).join("")}
      </div>
      <p class="tiny">Your colour, behind your initials when there's no photo.</p>
    </div>

    <section class="sec">
      <div class="sec-head"><h2 class="t2">About you</h2></div>
      <ul class="list pe-list">
        <li><label class="row"><span class="row-label">First name</span><input id="pe-first" type="text" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" placeholder="For the barista" value="${esc(p.first)}"></label></li>
        <li><label class="row"><span class="row-label">Last name</span><input id="pe-last" type="text" autocomplete="family-name" autocapitalize="words" enterkeyhint="next" placeholder="Optional" value="${esc(p.last)}"></label></li>
        <li><label class="row"><span class="row-label">Phone</span><input id="pe-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0912 345 6789" value="${esc(p.phone)}"></label></li>
        <li><label class="row"><span class="row-label">Email</span><input id="pe-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="Optional" value="${esc(p.email)}"></label></li>
      </ul>
      <p class="tiny pe-hint" id="pe-hint" aria-live="polite"></p>
    </section>

    <section class="sec">
      <div class="sec-head"><h2 class="t2">For your KAI Loyalty</h2></div>
      <ul class="list pe-list">
        <li>
          <div class="row"><span class="row-ico">${icon("cake")}</span>
            <span class="row-t"><span class="row-n">Birthday</span><span class="row-d" id="pe-bday-note">${esc(bdayNote(bd))}</span></span></div>
          <div class="pe-bday">
            <select id="pe-day" aria-label="Day of your birthday"><option value="">Day</option>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}"${bd.d === i + 1 ? " selected" : ""}>${i + 1}</option>`).join("")}</select>
            <select id="pe-month" aria-label="Month of your birthday"><option value="">Month</option>${MONTHS.map((m, i) => `<option value="${i + 1}"${bd.m === i + 1 ? " selected" : ""}>${m} · ${MONTHS_FA[i]}</option>`).join("")}</select>
          </div>
        </li>
        <li><button class="row row--tap" type="button" id="pe-usual"><span class="row-ico">${icon("menu")}</span>
          <span class="row-t"><span class="row-n">Your usual</span><span class="row-d" id="pe-usual-d">${usual ? `${esc(usual.en)} · ${price(usual.price)}` : "One tap to order it from Home"}</span></span><span class="row-v">${icon("chevron")}</span></button></li>
        <li><button class="row row--tap" type="button" id="pe-branch"><span class="row-ico row-ico--sage">${icon("pin")}</span>
          <span class="row-t"><span class="row-n">Home branch</span><span class="row-d" id="pe-branch-d">${esc(b.en)} · ${esc(b.region)}</span></span><span class="row-v">${icon("chevron")}</span></button></li>
      </ul>
    </section>

    <section class="sec">
      <div class="sec-head"><h2 class="t2">Privacy</h2></div>
      <div class="card pe-privacy">
        <div class="row-n">Show me in check-in rooms as</div>
        ${segHTML("appear", [{ v: "first", label: "First name" }, { v: "initials", label: "Initials" }, { v: "hidden", label: "Hidden" }], p.appear || "first", "seg--lg")}
        <p class="small" id="pe-appear-note">${esc(appearNote(p.appear || "first"))}</p>
      </div>
    </section>
    <p class="tiny" style="margin-top:18px;text-align:center">Nothing here leaves this phone.</p>
  </div>`;

  return {
    html,
    mount(screen) {
      const $ = (s) => screen.querySelector(s);
      const hint = $("#pe-hint");
      // settle the colour the first time the editor opens, so typing a name never repaints it
      if (profile().hue == null) setProfile({ hue: myHue() });
      let renameT = 0;
      const repaintFace = () => { $("#pe-av-face").innerHTML = face(112); };
      // keep the room's copy of your name in step, without writing on every key
      const syncRoom = () => { clearTimeout(renameT); renameT = setTimeout(() => { if (presence.me()) presence.rename(shownName(), myHue()); }, 400); };
      const validate = () => {
        const ph = $("#pe-phone").value.replace(/[\s-]/g, ""), em = $("#pe-email").value.trim();
        hint.textContent = ph && !PHONE.test(ph) ? "Iranian mobile numbers start 09 and have 11 digits."
          : em && !EMAIL.test(em) ? "That email address looks incomplete." : "";
      };

      $("#pe-first").addEventListener("input", (e) => { setProfile({ first: e.target.value.trimStart() }); repaintFace(); syncRoom(); $("#pe-appear-note").textContent = appearNote(profile().appear); });
      $("#pe-last").addEventListener("input", (e) => { setProfile({ last: e.target.value.trimStart() }); repaintFace(); syncRoom(); $("#pe-appear-note").textContent = appearNote(profile().appear); });
      $("#pe-phone").addEventListener("input", (e) => { setProfile({ phone: e.target.value.replace(/[^\d+ ]/g, "") }); validate(); });
      $("#pe-email").addEventListener("input", (e) => { setProfile({ email: e.target.value.trim() }); validate(); });
      validate();

      const saveBday = () => {
        const d = +$("#pe-day").value || 0, m = +$("#pe-month").value || 0;
        let day = d;
        if (m >= 7 && d === 31) { day = 30; $("#pe-day").value = "30"; }   // Mehr to Esfand have 30 days at most
        const bday = d || m ? { d: day || null, m: m || null } : null;
        setProfile({ bday });
        $("#pe-bday-note").textContent = bdayNote(bday);
      };
      $("#pe-day").addEventListener("change", saveBday);
      $("#pe-month").addEventListener("change", saveBday);

      screen.querySelectorAll("[data-hue]").forEach((btn) => btn.addEventListener("click", () => {
        haptic(6);
        setProfile({ hue: +btn.dataset.hue });
        screen.querySelectorAll("[data-hue]").forEach((x) => x.setAttribute("aria-checked", String(x === btn)));
        repaintFace(); syncRoom();
      }));

      const saved = (url) => {
        if (!setPhoto(url)) { toast("This phone's storage is full — the photo wasn't saved"); return; }
        toast("Photo saved", { ico: "check" });
        refresh();
      };
      const photoMenu = () => actionSheet({
        title: photo() ? "Change your photo" : "Add a photo",
        sub: "Framed in a circle and kept on this phone.",
        actions: [
          { label: "Take a photo", ico: "camera", run: () => choosePhoto({ camera: true, onDone: saved }) },
          { label: "Choose from library", ico: "image", run: () => choosePhoto({ onDone: saved }) },
          ...(photo() ? [{ label: "Remove photo", ico: "trash", danger: true, run: () => { setPhoto(""); toast("Photo removed"); refresh(); } }] : []),
        ],
      });
      $("#pe-av").addEventListener("click", photoMenu);
      $("#pe-photo").addEventListener("click", photoMenu);

      $("#pe-usual").addEventListener("click", () => usualSheet(() => {
        const u = byId(profile().usual);
        $("#pe-usual-d").textContent = u ? `${u.en} · ${price(u.price)}` : "One tap to order it from Home";
        toast(u ? `${u.en} is your usual` : "No usual", { ico: "check" });
      }));
      $("#pe-branch").addEventListener("click", () => branchSheet({ title: "Home branch", sub: "Check-ins and pick-ups start here.", onPick: (nb) => {
        $("#pe-branch-d").textContent = `${nb.en} · ${nb.region}`;
        $("#pe-appear-note").textContent = appearNote(profile().appear);
      } }));

      wireSeg($('[data-seg="appear"]'), (v) => {
        setProfile({ appear: v });
        $("#pe-appear-note").textContent = appearNote(v);
        syncRoom();
      });
    },
  };
}

/** Pick your usual from their drinks. */
function usualSheet(onPick) {
  const drinks = ITEMS.filter((i) => DRINKS.includes(i.cat));
  openSheet({
    title: "Your usual",
    sub: "It sits on Home, one tap from the bag.",
    body: `<div class="search" style="margin-top:12px">${icon("search")}<input id="us-q" type="search" placeholder="Search drinks" autocomplete="off" enterkeyhint="search"></div>
      <ul class="list list--flat" id="us-list" style="margin-top:12px"></ul>`,
    mount(sheet) {
      const list = sheet.querySelector("#us-list"), q = sheet.querySelector("#us-q");
      const cur = profile().usual;
      const paint = () => {
        const n = q.value.trim().toLowerCase();
        const rows = drinks.filter((i) => !n || `${i.en} ${i.fa}`.toLowerCase().includes(n));
        list.innerHTML = (n ? "" : `<li><button class="row row--tap" type="button" data-usual=""><span class="row-t"><span class="row-n">No usual</span><span class="row-d">Keep Home as it is</span></span><span class="row-v">${cur ? "" : icon("check")}</span></button></li>`)
          + rows.map((i) => `<li><button class="row row--tap" type="button" data-usual="${i.id}"><span class="us-img"><img src="${i.img}" alt="" loading="lazy"></span>
              <span class="row-t"><span class="row-n">${esc(i.en)}</span><span class="row-d">${price(i.price)} · <span class="fa" lang="fa">${esc(i.fa)}</span></span></span>
              <span class="row-v">${cur === i.id ? icon("check") : ""}</span></button></li>`).join("");
      };
      paint();
      q.addEventListener("input", paint);
      list.addEventListener("click", (e) => {
        const b = e.target.closest("[data-usual]");
        if (!b) return;
        haptic(8);
        setProfile({ usual: b.dataset.usual });
        closeSheet();
        onPick?.();
      });
    },
  });
}
