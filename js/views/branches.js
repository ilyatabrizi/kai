// Branches. Their eight, with their own addresses, their own map links, the
// central line, and who is at each one right now.

import { BUSINESS } from "../config.js";
import { BRANCHES } from "../data.js";
import { esc, plural } from "../util.js";
import { icon } from "../icons.js";
import { toast } from "../ui.js";
import { myBranch, setMyBranch } from "../store.js";
import { refresh } from "../router.js";
import { haptic } from "../motion.js";
import * as presence from "../presence.js";

const card = (b, mine, n) => `
  <article class="br-card ${mine ? "mine" : ""} ${b.status !== "open" ? "soon" : ""}" id="${b.id}">
    <figure class="frame"><img src="${b.img}" alt="${esc(b.en)} branch" loading="lazy" decoding="async" width="720" height="900"></figure>
    <div class="br-body">
      <div class="br-title"><span class="hd">${esc(b.en)}</span><span class="fa" lang="fa">${esc(b.fa)}</span></div>
      <div class="br-addr" lang="fa">${esc(b.address)}</div>
      <div class="br-meta">
        <span>${esc(b.region)}</span>
        ${b.status === "open" ? `<span class="live" data-live="${b.id}"><i></i>${n ? plural(n, "person", "people") + " here" : "quiet now"}</span>` : `<span class="tag tag--ink">Coming soon</span>`}
        ${b.ownMenu ? `<span class="tag tag--soft">Own menu</span>` : ""}
      </div>
      <div class="br-acts">
        ${b.maps ? `<a class="btn btn--soft" href="${b.maps}" target="_blank" rel="noopener">${icon("directions")} Directions</a>` : ""}
        <a class="btn btn--soft" href="tel:${BUSINESS.phoneTel}">${icon("phone")} Call</a>
        ${b.status === "open" && !mine ? `<button class="btn btn--ghost" type="button" data-mine="${b.id}">${icon("star")} My branch</button>` : ""}
      </div>
    </div>
  </article>`;

export default function branches() {
  const mine = myBranch().id;
  const counts = presence.counts();
  const tehran = BRANCHES.filter((b) => b.region === "Tehran");
  const away = BRANCHES.filter((b) => b.region !== "Tehran" && b.status === "open");
  const soon = BRANCHES.filter((b) => b.status !== "open");

  const html = `
  <div class="wrap">
    <header class="ph"><h1 class="lt">Branches</h1>
      <p class="ph-sub small">Six across Tehran, one in Royan — and Kish on its way. Central line <a class="ltr" href="tel:${BUSINESS.phoneTel}" style="font-weight:600;color:var(--sage-3)">${BUSINESS.phone}</a>.</p></header>

    <div class="sec-head"><h2 class="t2">Tehran <span class="fa" lang="fa">تهران</span></h2><span class="tiny">${tehran.length} branches</span></div>
    <div class="br-list stack">${tehran.map((b) => card(b, b.id === mine, counts[b.id])).join("")}</div>

    <div class="sec-head" style="margin-top:30px"><h2 class="t2">Royan <span class="fa" lang="fa">رویان</span></h2><span class="tiny">Mazandaran</span></div>
    <div class="br-list stack">${away.map((b) => card(b, b.id === mine, counts[b.id])).join("")}</div>

    <div class="sec-head" style="margin-top:30px"><h2 class="t2">Coming soon</h2></div>
    <div class="br-list stack">${soon.map((b) => card(b, false, 0)).join("")}</div>
  </div>`;

  return {
    html,
    mount(screen) {
      screen.querySelectorAll("[data-mine]").forEach((btn) => btn.addEventListener("click", () => {
        haptic(8);
        setMyBranch(btn.dataset.mine);
        toast(`${BRANCHES.find((b) => b.id === btn.dataset.mine).en} is your branch now`, { ico: "star" });
        refresh();
      }));
      const off = presence.subscribe(() => {
        if (!screen.isConnected) { off(); return; }
        const c = presence.counts();
        screen.querySelectorAll("[data-live]").forEach((el) => {
          const n = c[el.dataset.live];
          el.innerHTML = `<i></i>${n ? plural(n, "person", "people") + " here" : "quiet now"}`;
        });
      });
      document.addEventListener("view:leaving", function once() { off(); document.removeEventListener("view:leaving", once); });
      // a deep link like #/branches#vanak scrolls to that card
      const anchor = location.hash.split("#")[2];
      if (anchor) setTimeout(() => screen.querySelector(`#${CSS.escape(anchor)}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
    },
  };
}
