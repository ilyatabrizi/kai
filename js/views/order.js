// One order: the code for the counter, the QR the till can scan, what it was,
// what it earned, and how long until it is ready.

import { branchById, byId } from "../data.js";
import { esc, money, price, priceLong, dateTime, countdown, clamp } from "../util.js";
import { icon } from "../icons.js";
import { ORDER } from "../config.js";
import { orderById } from "../store.js";
import { qrSVG } from "../qr.js";
import { emptyHTML } from "../ui.js";

export default function orderView({ id }) {
  const o = orderById(id);
  if (!o) return { html: `<div class="wrap"><header class="ph"><h1 class="lt">Order</h1></header>${emptyHTML("That order isn't on this phone.", "Orders live on the device that placed them.")}<a class="btn btn--block" href="#/menu">Back to the menu</a></div>` };
  const b = branchById(o.branch);
  const readyAt = o.at + ORDER.makeMinutes * 60000;
  const fresh = o.status === "sent" && Date.now() < readyAt + 30 * 60000;

  const html = `
  <div class="wrap">
    <header class="ph"><h1 class="lt">${fresh ? "Order sent" : "Order"}</h1>
      <p class="ph-sub small">${dateTime(o.at)} · ${esc(b?.en || o.branch)}</p></header>

    <div class="card card--ink code">
      <div class="eyebrow">Show this at the counter · ${esc(b?.en || "")}</div>
      <div class="code-big num">${o.code}</div>
      <div class="code-qr" aria-label="Order code ${o.code} as a QR code">${qrSVG(`KAI:ORDER:${o.code}:${o.branch}`, { quiet: 1, fg: "#17150F", bg: "#ffffff", label: `Order ${o.code}` })}</div>
      <p class="code-note">Pay there as usual. The code links the order to your KAI Loyalty account${o.points ? ` — <b>+${money(o.points)} points</b> and <b>+${money(o.cashback)} T</b> cashback are already on it` : ""}.</p>
    </div>

    ${fresh ? `
    <div class="list" style="margin-top:12px"><div class="ready">
      <div class="ready-ring" id="ring"><span id="ring-t"></span></div>
      <div class="row-t"><div class="row-n" id="ready-n">Being made</div><div class="row-d" id="ready-d">Ready in about ${ORDER.makeMinutes} minutes</div></div>
    </div></div>` : ""}

    <ul class="list" style="margin-top:12px">
      ${o.lines.map((l) => { const it = byId(l.itemId); return `
      <li class="line"><div class="line-img"><img src="${it ? it.img : ""}" alt="" loading="lazy" decoding="async"></div>
        <div><div class="line-n">${esc(it ? it.en : l.name)}</div><div class="line-d">${l.qty} × ${money(l.unit)} T</div></div>
        <span class="money" style="font-weight:600">${price(l.unit * l.qty)}</span></li>`; }).join("")}
    </ul>
    ${o.note ? `<div class="list" style="margin-top:12px"><div class="row"><span class="row-ico">${icon("note")}</span><span class="row-t small">${esc(o.note)}</span></div></div>` : ""}
    <div class="list sum" style="margin-top:12px">
      <div class="sum-row"><span>Subtotal</span><span class="money">${price(o.subtotal)}</span></div>
      ${o.applied ? `<div class="sum-row"><span class="sage">Cashback applied</span><span class="sage money">− ${price(o.applied)}</span></div>` : ""}
      <div class="sum-row total"><span>Paid at the counter</span><span class="money">${priceLong(o.total)}</span></div>
    </div>

    <div class="btn-row" style="margin-top:18px">
      <a class="btn btn--soft" href="#/menu">${icon("menu")} Order more</a>
      <a class="btn btn--ghost" href="#/profile">${icon("profile")} Your account</a>
    </div>
  </div>`;

  return {
    html,
    mount(screen) {
      const ring = screen.querySelector("#ring");
      if (!ring) return;
      const t = screen.querySelector("#ring-t"), n = screen.querySelector("#ready-n"), d = screen.querySelector("#ready-d");
      let timer = null;
      const tick = () => {
        const left = readyAt - Date.now();
        const p = clamp(1 - left / (ORDER.makeMinutes * 60000), 0, 1);
        ring.style.setProperty("--p", `${Math.round(p * 100)}%`);
        if (left <= 0) { t.textContent = "✓"; n.textContent = "Ready"; d.textContent = `Collect it at the counter — code ${o.code}`; clearInterval(timer); return; }
        t.textContent = countdown(readyAt);
        d.textContent = `Ready in about ${Math.ceil(left / 60000)} min`;
      };
      tick();
      timer = setInterval(tick, 1000);
      document.addEventListener("view:leaving", function once() { clearInterval(timer); document.removeEventListener("view:leaving", once); });
    },
  };
}
