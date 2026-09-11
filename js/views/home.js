// Home. The reel, the loyalty card, what is new, the card by category, the
// courts, the counter, the branches, who is where, and the two lines KAI
// wrote about itself.

import { BUSINESS } from "../config.js";
import { ITEMS, CATEGORIES, BRANCHES, inCategory } from "../data.js";
import { esc, priceHTML, money, plural } from "../util.js";
import { icon } from "../icons.js";
import { MARK } from "../brand.js";
import { addHTML } from "../ui.js";
import { member, ladder, myBranch } from "../store.js";
import * as presence from "../presence.js";
import { haptic, reduced } from "../motion.js";

const tile = (item) => `
  <article class="tile" data-item="${item.id}">
    ${item.badge === "new" ? `<span class="tag">New</span>` : ""}
    <div class="tile-img"><img src="${item.img}" alt="" loading="lazy" decoding="async" width="560" height="560"></div>
    <div class="tile-n">${esc(item.en)}</div>
    <div class="tile-fa" lang="fa">${esc(item.fa)}</div>
    <div class="tile-b"><span class="tile-p">${priceHTML(item.price)}</span>${addHTML(item)}</div>
  </article>`;

const cat = (c) => {
  const items = inCategory(c.id);
  const cover = items.find((i) => i.badge === "new") || items[0];
  return `
  <a class="cat" href="#/menu?cat=${c.id}">
    <span class="cat-img"><img src="${cover.img}" alt="" loading="lazy" decoding="async" width="560" height="560"></span>
    <span class="cat-n">${esc(c.en)}</span>
    <span class="cat-c">${items.length}</span>
  </a>`;
};

const frame = (slug, cls = "", cap = "") => `
  <figure class="frame ${cls}"><img src="assets/photos/${slug}.webp" alt="" loading="lazy" decoding="async">${cap}</figure>`;

export default function home() {
  const fresh = ITEMS.filter((i) => i.badge === "new");
  const m = member();
  const lad = ladder(m.points);
  const branch = myBranch();
  const open = BRANCHES.filter((b) => b.status === "open");

  const html = `
  <section class="hero" id="hero">
    <div class="hero-media">
      <img src="assets/video/poster.webp" alt="" width="720" height="1280" fetchpriority="high">
      <video id="hero-video" muted playsinline loop autoplay preload="auto" poster="assets/video/poster.webp" src="assets/video/hero.mp4" aria-label="KAI Fluffies"></video>
    </div>
    <div class="hero-veil"></div>
    <div class="hero-copy">
      <div class="eyebrow">KAI Coffee · Tehran</div>
      <h1 class="hero-h">Your <em>comfort</em><br>zone.</h1>
      <p class="hero-sub">Seven branches, one card. Order from your phone, check in when you sit down, and collect cashback with every cup.</p>
    </div>
    <div class="hero-foot">
      <div class="hero-ctas">
        <a class="btn" href="#/menu">Order now</a>
        <a class="btn btn--glass" href="#/branches">Find a branch</a>
      </div>
      <div class="hero-strip">
        <span class="pill-stat">${icon("pin")} ${open.length} branches open</span>
        <span class="pill-stat">${icon("sparkle")} ${ITEMS.length} things on the card</span>
      </div>
    </div>
    <button class="hero-play" id="hero-play" type="button" aria-label="Play the film" hidden>${icon("play")}</button>
  </section>

  <div class="wrap">
    <section class="sec" style="margin-top:18px">
      <a class="loy" href="#/profile" aria-label="Your KAI Loyalty account">
        <div class="loy-league"><small>KAI Loyalty</small>${esc(lad.league.en)} league</div>
        <div class="loy-pts"><b class="money" id="loy-pts">${money(m.points)}</b><span>points</span></div>
        <div class="loy-bar"><i id="loy-bar" data-w="${lad.pct}"></i></div>
        <div class="loy-foot">
          <span>${lad.next ? `${money(lad.toNext)} points to ${esc(lad.next.en)} · ${lad.next.cashback}% cashback` : `Top league · ${lad.league.cashback}% cashback`}</span>
          <span class="loy-cash">${icon("cash")} <span class="money">${money(m.cashback)}</span> T</span>
        </div>
      </a>
    </section>

    <section class="sec">
      <div class="sec-head">
        <h2 class="t2">New at KAI <span class="fa" lang="fa">تازه‌های کای</span></h2>
        <a class="link" href="#/menu?cat=cold-drinks">All cold drinks ${icon("chevron")}</a>
      </div>
      <div class="hscroll">${fresh.map(tile).join("")}</div>
    </section>

    <section class="sec">
      <div class="sec-head">
        <h2 class="t2">The card</h2>
        <a class="link" href="#/menu">Full menu ${icon("chevron")}</a>
      </div>
      <div class="cats">${CATEGORIES.map(cat).join("")}</div>
    </section>

    <section class="sec story rv">
      <div class="story-copy">
        <div class="eyebrow">Fluffies · Boba · Refreshers</div>
        <h2 class="d2">Cold, sweet, and made to be carried around.</h2>
        <p class="body">Fluffies in five colours, boba in six, iced teas and refreshers. The cups that leave KAI in someone's hand — courtside, kerbside, on the way to wherever.</p>
        <a class="btn btn--soft" href="#/menu?cat=cold-drinks">See cold drinks ${icon("chevron")}</a>
      </div>
      <div class="hscroll">
        ${["padel", "tennis", "basketball"].map((s) => `<div style="width:230px">${frame(s, "frame--tall")}</div>`).join("")}
      </div>
    </section>

    <section class="sec">
      <div class="sec-head"><h2 class="t2">Just landed</h2></div>
      <div class="grid-2">
        <a class="frame frame--poster" href="#/menu?cat=snacks" aria-label="New toasts — see snacks"><img src="assets/photos/poster-toasts.webp" alt="New toasts: chipotle toast and honey mustard toast" loading="lazy" decoding="async"></a>
        <a class="frame frame--poster" href="#/menu?cat=bakery" aria-label="Jellygato Crunch — see the bakery"><img src="assets/photos/poster-jellygato.webp" alt="Jellygato Crunch — cereal, ice cream, espresso, jellygato cube" loading="lazy" decoding="async"></a>
      </div>
    </section>

    <section class="sec">
      <div class="sec-head">
        <h2 class="t2">From the counter</h2>
        <a class="link" href="${BUSINESS.instagramUrl}" target="_blank" rel="noopener">@${BUSINESS.instagram} ${icon("arrowUpRight")}</a>
      </div>
      <div class="gallery">
        ${frame("espresso-pour", "", `<figcaption class="frame-cap"><div class="eyebrow">Espresso</div><div class="d3">Poured to order.</div></figcaption>`)}
        ${frame("croissant")}
        ${frame("frappe-pastry")}
        ${frame("crunchy-flakes", "", `<figcaption class="frame-cap"><div class="eyebrow">Bakery</div><div class="d3">Crunchy flakes, five ways.</div></figcaption>`)}
        ${frame("jellygato-cubes")}
        ${frame("storefront-night")}
      </div>
    </section>

    <section class="sec">
      <div class="sec-head">
        <h2 class="t2">Around KAI <span class="fa" lang="fa">شعب</span></h2>
        <a class="link" href="#/branches">All branches ${icon("chevron")}</a>
      </div>
      <div class="hscroll">
        ${BRANCHES.map((b) => `
          <a class="br-teaser" href="#/branches#${b.id}" data-branch="${b.id}">
            <figure class="frame"><img src="${b.img}" alt="" loading="lazy" decoding="async">
              ${b.status !== "open" ? `<span class="tag tag--ink" style="position:absolute;top:10px;left:10px">Soon</span>` : ""}</figure>
            <div class="br-n">${esc(b.en)}</div>
            <div class="br-fa" lang="fa">${esc(b.fa)}</div>
          </a>`).join("")}
      </div>
    </section>

    <section class="sec">
      <div class="card card--sage" id="room-card">
        <div class="sec-head" style="margin-bottom:8px">
          <h2 class="t2">Who's there right now</h2>
          <span class="tiny" id="room-total"></span>
        </div>
        <ul class="people" id="room-rows"></ul>
        <a class="btn btn--block" href="#/checkin" style="margin-top:14px">${icon("checkin")} Check in at ${esc(branch.en)}</a>
      </div>
    </section>

    <section class="sec card card--paper">
      <div class="eyebrow">About KAI</div>
      <p class="d3" style="margin-top:8px">${esc(BUSINESS.aboutEn)}</p>
      <p class="fa-block small" lang="fa" style="margin-top:12px">${esc(BUSINESS.aboutFa)}</p>
    </section>

    <footer class="footer">
      <div class="footer-brand"><span class="mk">${MARK}</span><div><b>KAI COFFEE</b><span>${esc(BUSINESS.city)}, ${esc(BUSINESS.country)} · ${BUSINESS.site}</span></div></div>
      <div class="footer-links">
        <a class="btn btn--soft" href="${BUSINESS.instagramUrl}" target="_blank" rel="noopener">${icon("instagram")} ${BUSINESS.instagram}</a>
        <a class="btn btn--soft" href="tel:${BUSINESS.phoneTel}">${icon("phone")} ${BUSINESS.phone}</a>
        <a class="btn btn--soft" href="${BUSINESS.siteUrl}" target="_blank" rel="noopener">${icon("globe")} ${BUSINESS.site}</a>
      </div>
      <p class="footer-fa" lang="fa">کافه کای — منوی دیجیتال، شعب و باشگاه مشتریان</p>
      <div class="powered"><img src="assets/brand/alpha-black.png" alt="Alpha Agency" width="34" height="26"><div><small>Powered by</small><b>Alpha Agency</b></div><span>Preview · ${new Date().getFullYear()}</span></div>
    </footer>
  </div>`;

  return {
    html, padTop: false,
    mount(screen) {
      // The reel. It has no sound, so every browser may autoplay it — but only if
      // it is muted *as a property*: Chrome does not always honour the attribute on
      // a video created from markup, and one unhonoured attribute is a blank hero.
      // If a browser still refuses (Low Power Mode, a strict policy), the first
      // touch or scroll starts it, and a play button appears in the meantime.
      const video = screen.querySelector("#hero-video");
      const playBtn = screen.querySelector("#hero-play");
      if (video) {
        video.muted = true; video.defaultMuted = true; video.playsInline = true;
        video.setAttribute("muted", ""); video.setAttribute("playsinline", ""); video.setAttribute("webkit-playsinline", "");
        const show = () => { video.classList.add("on"); playBtn.hidden = true; };
        video.addEventListener("playing", show);
        let armed = false;
        const attempt = () => {
          if (!video.paused) { show(); return; }
          const p = video.play();
          if (p && p.catch) p.then(show).catch(() => { if (!armed) { armed = true; playBtn.hidden = false; } });
        };
        attempt();
        video.addEventListener("loadedmetadata", attempt, { once: true });
        video.addEventListener("canplay", attempt, { once: true });
        // a strict autoplay policy lifts on the first gesture; use it
        const kick = () => { if (video.paused) attempt(); if (!video.paused) cleanup(); };
        const cleanup = () => ["pointerdown", "touchstart", "keydown", "scroll"].forEach((ev) => removeEventListener(ev, kick));
        ["pointerdown", "touchstart", "keydown", "scroll"].forEach((ev) => addEventListener(ev, kick, { passive: true }));
        document.addEventListener("view:leaving", function once() { cleanup(); document.removeEventListener("view:leaving", once); });
        playBtn.addEventListener("click", () => { haptic(6); video.play().then(show).catch(() => {}); });
        // a tab that comes back from the background resumes the loop
        document.addEventListener("visibilitychange", () => { if (!document.hidden && video.isConnected && video.paused) attempt(); });
      }
      // the ladder fills once it is on screen
      const bar = screen.querySelector("#loy-bar");
      requestAnimationFrame(() => setTimeout(() => { bar.style.width = bar.dataset.w + "%"; }, 120));

      // the rooms, live
      const rows = screen.querySelector("#room-rows");
      const total = screen.querySelector("#room-total");
      const paint = () => {
        const counts = presence.counts();
        const top = BRANCHES.filter((b) => b.status === "open")
          .map((b) => ({ b, n: counts[b.id], people: presence.list(b.id) }))
          .sort((x, y) => y.n - x.n).slice(0, 3);
        const all = Object.values(counts).reduce((a, n) => a + n, 0);
        total.textContent = all ? `${all} checked in across KAI` : "Quiet across KAI";
        rows.innerHTML = top.map(({ b, n, people }) => `
          <li class="person"><span class="row-ico row-ico--sage">${icon("pin")}</span>
            <span class="person-n">${esc(b.en)}<small>${n ? plural(n, "person", "people") + " here now" : "Nobody yet"}</small></span>
            <span class="faces">${people.slice(-3).map((p) => `<span class="avatar">${esc((p.name || "You").slice(0, 2).toUpperCase())}</span>`).join("")}${n > 3 ? `<span class="more">+${n - 3}</span>` : ""}</span>
          </li>`).join("");
      };
      paint();
      const off = presence.subscribe(() => { if (!rows.isConnected) { off(); return; } paint(); });
      document.addEventListener("view:leaving", function once() { off(); document.removeEventListener("view:leaving", once); });
    },
  };
}
