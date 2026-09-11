// The bag. Lines with quantities, the branch it is for, a note, and what the
// order will do to the account — then a four-digit code for the counter.

import { byId, branchById } from "../data.js";
import { esc, money, price, priceHTML, priceLong, plural } from "../util.js";
import { icon } from "../icons.js";
import { qtyHTML, qty, emptyHTML, branchSheet, toast } from "../ui.js";
import { bag, setQty, quote, member, myBranch, prefs, setPrefs, placeOrder, subscribe } from "../store.js";
import { go, refresh } from "../router.js";
import { haptic } from "../motion.js";

export default function bagView() {
  const lines = bag();
  const branch = myBranch();
  const q = quote();
  const m = member();
  const p = prefs();

  const html = `
  <div class="wrap">
    <header class="ph"><h1 class="lt">Bag</h1>
      <p class="ph-sub small">${lines.length ? `${plural(lines.reduce((n, l) => n + l.qty, 0), "item")} · pay at the counter, no card needed` : "Nothing in it yet."}</p></header>
    ${!lines.length ? `${emptyHTML("Your bag is empty.", "Everything on the card is one tap away.")}
      <a class="btn btn--block" href="#/menu">See the menu</a>` : `
    <ul class="list">
      <li><button class="row row--tap" type="button" id="pick-branch">
        <span class="row-ico row-ico--sage">${icon("pin")}</span>
        <span class="row-t"><span class="row-n">Pick up at ${esc(branch.en)} <span class="fa small" lang="fa">${esc(branch.fa)}</span></span><span class="row-d">${esc(branch.region)} · change branch</span></span>
        <span class="row-v">${icon("chevron")}</span></button></li>
    </ul>

    <ul class="list" style="margin-top:12px" id="lines">
      ${lines.map((l) => { const it = byId(l.itemId); return `
      <li class="line" data-line="${l.id}">
        <div class="line-img"><img src="${it.img}" alt="" loading="lazy" decoding="async" width="560" height="560"></div>
        <div><div class="line-n">${esc(it.en)}</div><div class="line-d fa" lang="fa">${esc(it.fa)}</div><div class="line-p">${priceHTML(l.unit * l.qty)}</div></div>
        ${qtyHTML(l.qty)}
      </li>`; }).join("")}
    </ul>

    <ul class="list" style="margin-top:12px">
      <li><label class="row"><span class="row-ico">${icon("note")}</span>
        <textarea id="note" rows="1" placeholder="A note for the barista — oat milk, extra hot, no ice…" maxlength="140">${esc(p.note || "")}</textarea></label></li>
    </ul>

    <div class="list sum" style="margin-top:12px">
      <div class="sum-row"><span>Subtotal</span><span class="money">${price(q.subtotal)}</span></div>
      ${m.cashback > 0 ? `
      <div class="sum-row"><span>Use cashback <span class="tiny">(${money(m.cashback)} T available)</span></span>
        <button class="switch" type="button" role="switch" aria-checked="${String(!!p.useCashback)}" id="use-cb" aria-label="Use cashback on this order"></button></div>
      ${q.applied ? `<div class="sum-row"><span class="sage">Cashback applied</span><span class="sage money">− ${price(q.applied)}</span></div>` : ""}` : ""}
      <div class="sum-row total"><span>Total</span><span class="money">${priceLong(q.total)}</span></div>
      <div class="sum-row"><span class="small">You'll earn</span><span class="small"><b>+${money(q.points)} points</b> · <b>+${money(q.cashback)} T</b> cashback (${q.league.cashback}%)</span></div>
    </div>

    <div class="bag-cta"><button class="btn btn--block" type="button" id="place">Place order <span class="btn-sum money">${price(q.total)}</span></button></div>
    <p class="tiny" style="text-align:center;margin-top:12px">You get a code to show at the counter. Payment happens there, as it does today.</p>`}
  </div>`;

  return {
    html,
    mount(screen) {
      if (!lines.length) return;
      screen.querySelectorAll("[data-line]").forEach((li) => {
        const id = li.dataset.line;
        const line = lines.find((l) => l.id === id);
        qty(li.querySelector(".qty"), { value: line.qty, min: 0, max: 9, onChange: (v) => { setQty(id, v); refresh(); } });
      });
      screen.querySelector("#pick-branch").addEventListener("click", () =>
        branchSheet({ title: "Pick up where?", sub: "The counter at that branch gets the code.", onPick: (b) => { toast(`Picking up at ${b.en}`, { ico: "pin" }); refresh(); } }));
      screen.querySelector("#use-cb")?.addEventListener("click", (e) => {
        haptic(8);
        setPrefs({ useCashback: !prefs().useCashback });
        refresh();
      });
      const note = screen.querySelector("#note");
      const grow = () => { note.style.height = "auto"; note.style.height = note.scrollHeight + "px"; };
      note.addEventListener("input", () => { setPrefs({ note: note.value }); grow(); });
      grow();
      screen.querySelector("#place").addEventListener("click", () => {
        haptic([12, 30, 16]);
        const order = placeOrder({ branchId: myBranch().id, note: note.value.trim() });
        if (order) go(`#/order/${order.id}`);
      });
    },
  };
}
