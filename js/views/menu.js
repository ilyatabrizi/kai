// The card. Nine categories, one search, one-tap add on every row and a sheet
// with the detail behind the row. Chips filter; they do not scroll-spy.

import { CATEGORIES, ITEMS, inCategory, byId } from "../data.js";
import { esc, priceHTML, $$ } from "../util.js";
import { icon } from "../icons.js";
import { addHTML, emptyHTML, wireImages, itemSheet } from "../ui.js";
import { haptic } from "../motion.js";

const row = (item) => `
  <div class="mitem" data-item="${item.id}" id="row-${item.id}" role="button" tabindex="0"
       data-search="${esc((item.en + " " + item.fa + " " + (item.ing || "") + " " + item.cat).toLowerCase())}">
    <div class="mitem-img"><img src="${item.img}" alt="" loading="lazy" decoding="async" width="560" height="560"></div>
    <div class="mitem-t">
      <div class="mitem-n">${esc(item.en)}${item.badge === "new" ? `<span class="tag">New</span>` : ""}</div>
      <div class="mitem-fa" lang="fa">${esc(item.fa)}</div>
      <div class="mitem-p">${priceHTML(item.price)}${item.size ? `<span class="tag tag--soft">${esc(item.size)}</span>` : ""}</div>
    </div>
    ${addHTML(item)}
  </div>`;

const section = (c, items) => `
  <section class="msec" data-cat="${c.id}">
    <div class="msec-head"><h2 class="t2">${esc(c.en)}</h2><span class="fa" lang="fa">${esc(c.fa)}</span><span class="n">${items.length}</span></div>
    <div class="mlist">${items.map(row).join("")}</div>
  </section>`;

export default function menu(params = {}, query = {}) {
  const cat = CATEGORIES.some((c) => c.id === query.cat) ? query.cat : "all";
  const html = `
  <div class="wrap">
    <header class="ph">
      <h1 class="lt">Menu</h1>
      <p class="ph-sub small">${ITEMS.length} things across ${CATEGORIES.length} categories · prices in Toman</p>
    </header>
    <div class="search"><span>${icon("search")}</span>
      <input id="q" type="search" placeholder="Search — latte, boba, croissant…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" value="${esc(query.q || "")}">
      <button class="clear" type="button" id="q-clear" aria-label="Clear search" hidden>${icon("close")}</button>
    </div>
    <div class="menu-sticky">
      <div class="chips" id="chips" role="tablist" aria-label="Categories">
        <button class="chip" type="button" role="tab" data-cat="all" aria-pressed="${cat === "all"}">All <span class="n">${ITEMS.length}</span></button>
        ${CATEGORIES.map((c) => `<button class="chip" type="button" role="tab" data-cat="${c.id}" aria-pressed="${cat === c.id}">${esc(c.en)} <span class="n">${inCategory(c.id).length}</span></button>`).join("")}
      </div>
    </div>
    <div id="mlist"></div>
  </div>`;

  return {
    html,
    mount(screen) {
      const list = screen.querySelector("#mlist");
      const q = screen.querySelector("#q");
      const clear = screen.querySelector("#q-clear");
      const chips = screen.querySelector("#chips");
      let active = cat;

      const paint = () => {
        const needle = q.value.trim().toLowerCase();
        clear.hidden = !needle;
        const cats = active === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === active);
        const parts = cats.map((c) => {
          const items = inCategory(c.id).filter((i) => !needle || (i.en + " " + i.fa + " " + (i.ing || "")).toLowerCase().includes(needle));
          return items.length ? section(c, items) : "";
        }).filter(Boolean);
        list.innerHTML = parts.length ? parts.join("") : emptyHTML("Nothing by that name.", "Try another word, or clear the search.");
        wireImages(list);
        // the URL remembers the category so a reload or a share lands in the same place
        const h = active === "all" ? "#/menu" : `#/menu?cat=${active}`;
        if (location.hash.split("?")[0] === "#/menu" && location.hash !== h) history.replaceState(history.state, "", h);
      };

      chips.addEventListener("click", (e) => {
        const chip = e.target.closest("[data-cat]");
        if (!chip) return;
        haptic(6);
        active = chip.dataset.cat;
        chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        chip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        paint();
        const top = screen.querySelector(".menu-sticky").getBoundingClientRect().top + scrollY - 120;
        if (scrollY > top) scrollTo({ top, behavior: "smooth" });
      });
      q.addEventListener("input", paint);
      clear.addEventListener("click", () => { q.value = ""; paint(); q.focus(); });
      screen.addEventListener("keydown", (e) => {
        const r = e.target.closest?.(".mitem");
        if (r && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); itemSheet(r.dataset.item); }
      });
      paint();
      const on = chips.querySelector(`[data-cat="${active}"]`);
      on?.scrollIntoView({ inline: "center", block: "nearest" });

      // a shared link to one item lands on its row, lit
      if (params.focus && byId(params.focus)) {
        const r = screen.querySelector(`#row-${CSS.escape(params.focus)}`);
        if (r) setTimeout(() => { r.scrollIntoView({ block: "center" }); r.style.boxShadow = "0 0 0 2px var(--sage)"; setTimeout(() => (r.style.boxShadow = ""), 1600); }, 200);
      }
    },
  };
}
