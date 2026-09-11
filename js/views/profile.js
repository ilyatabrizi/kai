// You. The member card the till scans, where you stand on the five leagues, how
// the programme works, your details (saved as you type), your branch, the app on
// the home screen, your orders — and the sample data switch.

import { BUSINESS, LOYALTY } from "../config.js";
import { LEAGUES, BRANCHES, branchById } from "../data.js";
import { esc, money, price, dateShort, dateTime, plural } from "../util.js";
import { icon } from "../icons.js";
import { MARK } from "../brand.js";
import { qrSVG } from "../qr.js";
import { toast, branchSheet, openSheet, closeSheet } from "../ui.js";
import { member, ladder, profile, setProfile, myBranch, orders, isSample, seedSample, clearSample, forgetEverything } from "../store.js";
import { isStandalone, isIOS, canPrompt, promptInstall } from "../install.js";
import { refresh, go } from "../router.js";
import { haptic } from "../motion.js";

export default function profileView() {
  const m = member();
  const lad = ladder(m.points);
  const p = profile();
  const b = myBranch();
  const recent = orders().slice(0, 6);

  const rung = (l, i) => {
    const done = m.points >= l.min && l.id !== lad.league.id;
    const now = l.id === lad.league.id;
    return `<li class="rung ${now ? "now" : done ? "done" : "locked"}">
      <span class="rung-dot">${done ? icon("check") : i + 1}</span>
      <span><span class="rung-n">${esc(l.en)}<span class="fa" lang="fa">${esc(l.fa)}</span></span>
        <span class="rung-d">${l.min ? `from ${money(l.min)} points` : "from the first order"}${now ? " · you are here" : ""}</span></span>
      <span class="rung-v">${l.cashback}<small>% back</small></span>
    </li>`;
  };

  const html = `
  <div class="wrap">
    <header class="ph"><h1 class="lt">You</h1>
      <p class="ph-sub small">KAI Loyalty · member since ${dateShort(m.joined)}</p></header>

    <div class="member" id="member">
      <div class="member-top">
        <div><span class="member-mark">${MARK}</span>
          <div class="member-name">${esc(p.name || "KAI member")}</div>
          <div class="member-id">${esc(m.id)} · ${esc(lad.league.en)}</div></div>
        <div class="member-qr" aria-label="Your member code">${qrSVG(`KAI:MEMBER:${m.id}`, { quiet: 1, fg: "#17150F", bg: "#ffffff", label: "Member code" })}</div>
      </div>
      <div class="member-grid">
        <div><b class="money">${money(m.points)}</b><span>points</span></div>
        <div><b>${lad.league.cashback}%</b><span>cashback</span></div>
        <div><b class="money">${money(m.cashback)}</b><span>Toman back</span></div>
      </div>
      <div class="loy-bar" style="margin-top:18px"><i style="width:${lad.pct}%"></i></div>
      <div class="loy-foot" style="margin-top:8px">${lad.next ? `<span>${money(lad.toNext)} points to ${esc(lad.next.en)}</span><span>${lad.next.cashback}% back there</span>` : `<span>Legend — the top of the ladder</span>`}</div>
    </div>
    ${isSample() ? `<p class="tiny" style="margin-top:10px;display:flex;justify-content:space-between;gap:10px;align-items:center"><span>Sample account — ${plural(orders().filter((o) => o.sample).length, "sample order")} so the ladder can be seen moving.</span><button class="link" type="button" id="clear-sample">Clear</button></p>` : ""}

    <section class="sec">
      <div class="sec-head"><h2 class="t2">The five leagues <span class="fa" lang="fa">لیگ‌ها</span></h2><a class="link" href="${BUSINESS.siteUrl}/kai-loyalty-program" target="_blank" rel="noopener">kaicoffeeco.com ${icon("arrowUpRight")}</a></div>
      <ul class="list ladder">${LEAGUES.map(rung).join("")}</ul>
    </section>

    <section class="sec">
      <div class="sec-head"><h2 class="t2">How it works</h2></div>
      <div class="card steps">
        <div class="step"><i></i><div><b>Order at any KAI</b><p>Every order at the counter, or from this app, counts toward your league.</p></div></div>
        <div class="step"><i></i><div><b>Get cashback</b><p>Your league's percentage comes back as Toman credit on the account.</p></div></div>
        <div class="step"><i></i><div><b>Collect points</b><p>Points move you up the ladder — ${Math.round(1 / LOYALTY.pointsPerToman).toLocaleString("en-US")} Toman spent is one point in this preview.</p></div></div>
        <div class="step"><i></i><div><b>Climb a league</b><p>Reach the threshold and the league upgrades on its own.</p></div></div>
        <div class="step"><i></i><div><b>Unlock more</b><p>Higher leagues, higher cashback — up to 22% as a Legend — plus a birthday gift.</p></div></div>
      </div>
    </section>

    <section class="sec">
      <div class="sec-head"><h2 class="t2">Your details</h2><span class="tiny">saved on this phone</span></div>
      <ul class="list">
        <li><label class="row"><span class="row-label">Name</span><input id="f-name" type="text" autocomplete="name" placeholder="How the barista should call you" value="${esc(p.name)}"></label></li>
        <li><label class="row"><span class="row-label">Phone</span><input id="f-phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="09…" value="${esc(p.phone)}"></label></li>
      </ul>
    </section>

    <section class="sec">
      <ul class="list">
        <li><button class="row row--tap" type="button" id="pick-branch"><span class="row-ico row-ico--sage">${icon("pin")}</span>
          <span class="row-t"><span class="row-n">My branch</span><span class="row-d">${esc(b.en)} · ${esc(b.region)}</span></span><span class="row-v">${icon("chevron")}</span></button></li>
        <li><button class="row row--tap" type="button" id="install"><span class="row-ico">${icon("download")}</span>
          <span class="row-t"><span class="row-n">${isStandalone() ? "Installed on this phone" : "Add to home screen"}</span><span class="row-d">${isStandalone() ? "Opens like an app, works offline" : "Full screen, offline, one tap from the home screen"}</span></span><span class="row-v">${icon("chevron")}</span></button></li>
        <li><button class="row row--tap" type="button" id="share"><span class="row-ico">${icon("share")}</span>
          <span class="row-t"><span class="row-n">Share KAI</span><span class="row-d">Send the link</span></span><span class="row-v">${icon("chevron")}</span></button></li>
      </ul>
    </section>

    <section class="sec">
      <div class="sec-head"><h2 class="t2">Orders</h2><span class="tiny">${orders().length ? plural(orders().length, "order") : ""}</span></div>
      <ul class="list history">
        ${recent.length ? recent.map((o) => `
        <li><a class="row row--tap" href="#/order/${o.id}">
          <span class="row-ico ${o.status === "sent" ? "row-ico--ink" : ""}">${icon(o.status === "sent" ? "clock" : "check")}</span>
          <span class="row-t"><span class="row-n">${o.lines.map((l) => (l.qty > 1 ? `${l.qty}× ` : "") + l.name).join(", ")}</span>
            <span class="row-d">${dateTime(o.at)} · ${esc(branchById(o.branch)?.en || "")} · +${money(o.points)} pts</span></span>
          <span class="row-v money">${price(o.total)}</span></a></li>`).join("")
        : `<li class="row"><span class="row-t small">No orders yet. The first one earns ${lad.league.cashback}% back.</span></li>`}
      </ul>
    </section>

    <section class="sec">
      <div class="btn-row">
        ${!isSample() ? `<button class="btn btn--ghost btn--sm" type="button" id="load-sample">${icon("sparkle")} Load a sample account</button>` : ""}
        <button class="btn btn--danger btn--sm" type="button" id="wipe">${icon("trash")} Clear everything on this phone</button>
      </div>
      <p class="tiny" style="margin-top:12px">Preview build. Nothing leaves this phone — no account server, no tracking. The five leagues and their cashback rates are KAI's own; the points rate is a preview assumption.</p>
    </section>
  </div>`;

  return {
    html,
    mount(screen) {
      const $ = (s) => screen.querySelector(s);
      $("#f-name").addEventListener("input", (e) => setProfile({ name: e.target.value }));
      $("#f-phone").addEventListener("input", (e) => setProfile({ phone: e.target.value.replace(/[^\d+ ]/g, "") }));
      $("#f-name").addEventListener("change", () => refresh());
      $("#pick-branch").addEventListener("click", () => branchSheet({ title: "My branch", sub: "Check-ins and pick-ups default to it.", onPick: () => refresh() }));
      $("#share").addEventListener("click", async () => {
        const url = location.href.split("#")[0];
        try {
          if (navigator.share) await navigator.share({ title: "KAI Coffee", url });
          else { await navigator.clipboard.writeText(url); toast("Link copied", { ico: "check" }); }
        } catch {}
      });
      $("#install").addEventListener("click", async () => {
        haptic(6);
        if (isStandalone()) { toast("Already on your home screen", { ico: "check" }); return; }
        if (canPrompt()) { const r = await promptInstall(); if (r === "accepted") toast("Added to your home screen", { ico: "check" }); return; }
        openSheet({
          title: "Add KAI to your home screen",
          sub: isIOS() ? "Two taps in Safari." : "From the browser menu.",
          body: isIOS()
            ? `<ol class="steps" style="margin-top:14px"><li class="step"><i></i><div><b>Tap Share</b><p>The square with the arrow, at the bottom of Safari.</p></div></li><li class="step"><i></i><div><b>Add to Home Screen</b><p>Scroll the sheet a little; it's there. Then tap Add.</p></div></li></ol>`
            : `<ol class="steps" style="margin-top:14px"><li class="step"><i></i><div><b>Open the browser menu</b><p>The three dots, top right.</p></div></li><li class="step"><i></i><div><b>Add to Home screen</b><p>Or "Install app", depending on the browser.</p></div></li></ol>`,
          foot: `<button class="btn btn--block" type="button" id="sheet-ok">Got it</button>`,
          mount: (sheet) => sheet.querySelector("#sheet-ok").addEventListener("click", closeSheet),
        });
      });
      $("#clear-sample")?.addEventListener("click", () => { clearSample(); toast("Sample account cleared"); refresh(); });
      $("#load-sample")?.addEventListener("click", () => { seedSample(); toast("Sample account loaded", { ico: "sparkle" }); refresh(); });
      $("#wipe").addEventListener("click", () => {
        openSheet({
          title: "Clear everything?", sub: "Bag, orders, points, name — gone from this phone.",
          foot: `<div class="btn-row"><button class="btn btn--danger" type="button" id="yes" style="flex:1">Clear</button><button class="btn btn--soft" type="button" id="no" style="flex:1">Keep</button></div>`,
          mount: (sheet) => {
            sheet.querySelector("#no").addEventListener("click", closeSheet);
            sheet.querySelector("#yes").addEventListener("click", () => { forgetEverything(); closeSheet(); toast("Cleared"); go("#/"); });
          },
        });
      });
    },
  };
}
