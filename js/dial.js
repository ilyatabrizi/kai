// The check-in dial: a cup that fills with the house olive, a ring that keeps
// the hour, and the small celebrations around them. Kept apart from the view so
// the view reads as layout.

import { MARK_VIEWBOX, MARK_PATH } from "./brand.js";
import { reduced } from "./motion.js";

const RING = 1000;                               // the ring's pathLength
const WAVE = "M-110 0q27.5 -7 55 0" + "t55 0".repeat(7) + "V250H-110Z";   // period 110
const mark = (cls) => `<svg class="${cls}" x="72.6" y="60" width="74.7" height="96" viewBox="${MARK_VIEWBOX}"><path fill-rule="evenodd" d="${MARK_PATH}"/></svg>`;

export const dialHTML = (label) => `
  <button class="dial" id="dial" type="button" aria-pressed="false" aria-label="${label}">
    <svg class="dial-svg" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="dial-face"><circle cx="110" cy="110" r="93"/></clipPath>
        <mask id="dial-liquid" maskUnits="userSpaceOnUse" x="0" y="0" width="220" height="220">
          <path id="dial-wave" fill="#fff" d="${WAVE}" transform="translate(0 232)"/>
        </mask>
      </defs>
      <circle class="dial-track" cx="110" cy="110" r="104"/>
      <circle class="dial-ring" id="dial-ring" cx="110" cy="110" r="104" pathLength="${RING}" transform="rotate(-90 110 110)"/>
      <g clip-path="url(#dial-face)">
        <rect class="dial-face" width="220" height="220"/>
        ${mark("dial-mk")}
        <g mask="url(#dial-liquid)">
          <rect class="dial-liq" width="220" height="220"/>
          ${mark("dial-mk dial-mk--in")}
        </g>
      </g>
    </svg>
    <span class="dial-pulse"></span><span class="dial-pulse"></span>
  </button>`;

/** The liquid inside the dial. level 0 = empty, 1 = full; to() eases there with the surface moving. */
export function liquid(root) {
  const wave = root.querySelector("#dial-wave");
  const Y = (l) => 226 - l * 244;
  let level = 0, raf = 0, guard = 0;
  const put = (l, drift = 0) => wave.setAttribute("transform", `translate(${(-(drift % 110)).toFixed(2)} ${Y(l).toFixed(2)})`);
  const to = (target, ms = 900) => new Promise((resolve) => {
    cancelAnimationFrame(raf); clearTimeout(guard);
    const from = level;
    if (reduced() || ms <= 0) { level = target; put(level); resolve(); return; }
    const t0 = performance.now();
    const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      level = from + (target - from) * ease(t);
      put(level, (now - t0) * 0.16);
      if (t < 1) raf = requestAnimationFrame(step); else resolve();
    };
    raf = requestAnimationFrame(step);
    // a hidden tab runs no frames: land on the end state regardless
    guard = setTimeout(() => { cancelAnimationFrame(raf); level = target; put(level); resolve(); }, ms + 260);
  });
  return { to, set: (l) => { level = l; put(l); }, get level() { return level; } };
}

/** The hour, as a ring. frac 1 = a full hour left. */
export function ring(el, frac, animate = true) {
  const f = Math.max(0, Math.min(1, frac));
  if (!animate) el.style.transition = "none";
  el.style.strokeDashoffset = String(RING * (1 - f));
  el.classList.toggle("on", f > 0);
  if (!animate) { void el.getBoundingClientRect(); el.style.transition = ""; }
}

// the colours of their Fluffies and boba, from the reel
const FLUFFIES = ["#B9A6E0", "#F2A7B8", "#F5C59A", "#A9C2A8", "#A8CCE0", "#F3D27A"];

/** Confetti in the drinks' colours, with a few ampersands among it. */
export function burst(host, n = 22) {
  if (reduced() || !host || !host.animate) return;
  for (let i = 0; i < n; i++) {
    const amp = i % 4 === 0;
    const el = document.createElement("i");
    el.className = amp ? "spark spark--amp" : "spark";
    if (amp) el.textContent = "&";
    const size = amp ? 20 : 6 + Math.random() * 6;
    el.style.cssText = `--c:${FLUFFIES[i % FLUFFIES.length]};width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px`;
    host.append(el);
    const a = (i / n) * Math.PI * 2 + (Math.random() - .5) * .4;
    const r0 = 92, r1 = 134 + Math.random() * 56;
    el.animate([
      { transform: `translate(${Math.cos(a) * r0}px, ${Math.sin(a) * r0}px) scale(.2)`, opacity: 0 },
      { opacity: 1, offset: .16 },
      { transform: `translate(${Math.cos(a) * r1}px, ${Math.sin(a) * r1}px) rotate(${(Math.random() - .5) * 140}deg) scale(1)`, opacity: 0 },
    ], { duration: 760 + Math.random() * 380, delay: Math.random() * 90, easing: "cubic-bezier(.12, .75, .3, 1)", fill: "both" })
      .finished.then(() => el.remove(), () => el.remove());
    setTimeout(() => el.remove(), 1700);
  }
}

/** Fly a face from one element's centre to another's; resolves when it lands. */
export function fly(html, fromEl, toEl, { size = 56, land = 30 } = {}) {
  return new Promise((resolve) => {
    if (reduced() || !fromEl || !toEl || !document.body.animate) { resolve(); return; }
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    if (!b.width || !a.width) { resolve(); return; }
    const el = document.createElement("div");
    el.className = "flyer";
    el.innerHTML = html;
    el.style.cssText = `left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size / 2}px;width:${size}px;height:${size}px`;
    document.body.append(el);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = el.animate([
      { transform: "translate(0, 0) scale(.3)", opacity: 0 },
      { transform: `translate(${dx * .12}px, ${dy * .12 - 44}px) scale(1.08)`, opacity: 1, offset: .32 },
      { transform: `translate(${dx}px, ${dy}px) scale(${land / size})`, opacity: 1 },
    ], { duration: 800, easing: "cubic-bezier(.5, 0, .2, 1)", fill: "forwards" });
    const end = () => { el.remove(); resolve(); };
    anim.finished.then(end, end);
    setTimeout(end, 1400);
  });
}
