// The opening. Coffee pours into the ampersand and fills it, the name rises
// beneath, and once the page behind is ready the mark flies to its place in the
// bar while the paper closes in around it. Everything before the exit is CSS
// (index.html carries the markup inline), so it starts with the first paint.
//
// Cold start ≈ 2 s. A reload in the same session skips the pour (≈ 0.9 s).
// Reduced motion gets a still frame and a fade.

import { STORAGE } from "./config.js";

const SEEN = STORAGE + "booted";
const root = document.documentElement;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const loaded = (img) => (!img || (img.complete && img.naturalWidth)) ? Promise.resolve()
  : new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); });

export async function runBoot(firstRender) {
  const boot = document.getElementById("boot");
  if (!boot) { root.classList.remove("booting"); return; }
  const warm = root.classList.contains("boot-warm");
  const still = root.classList.contains("boot-still");
  try { sessionStorage.setItem(SEEN, "1"); } catch {}

  // ready = the first screen is in, its hero still has pixels, the faces are loaded
  const ready = (async () => {
    await firstRender;
    await Promise.all([loaded(document.querySelector(".hero-media img")), document.fonts?.ready?.catch?.(() => {})]);
  })();
  const hold = still ? 240 : warm ? 360 : 1180;          // the rise ends at 1.2 s
  await Promise.race([Promise.all([ready, wait(hold)]), wait(3400)]);

  if (!still && !warm) {
    boot.classList.add("full");                         // top up, cut the pour, set the ink
    await wait(430);
  }
  await leave(boot, still);
}

async function leave(boot, still) {
  const glyph = boot.querySelector(".boot-glyph .boot-mark");
  const target = document.querySelector("#bar-mark svg");
  const tb = target && target.getBoundingClientRect();
  const gb = glyph && glyph.getBoundingClientRect();
  const done = () => {
    boot.remove();
    root.classList.remove("booting", "boot-warm", "boot-still");
    document.dispatchEvent(new CustomEvent("boot:done"));
  };
  // no bar mark on screen (a pushed page), no animation API, or reduced motion: fade
  if (still || !tb || tb.width < 2 || !gb || !boot.animate) {
    boot.classList.add("gone");
    await wait(still ? 280 : 440);
    done();
    return;
  }
  boot.classList.add("exit");
  const s = tb.width / gb.width;
  const dx = tb.left + tb.width / 2 - (gb.left + gb.width / 2);
  const dy = tb.top + tb.height / 2 - (gb.top + gb.height / 2);
  const cx = tb.left + tb.width / 2, cy = tb.top + tb.height / 2;
  const R = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
  const D = 660;
  const fly = boot.querySelector(".boot-glyph").animate(
    [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${s})` }],
    { duration: D, easing: "cubic-bezier(.72, 0, .16, 1)", fill: "forwards" });
  const iris = boot.querySelector(".boot-bg").animate(
    [{ clipPath: `circle(${R}px at ${cx}px ${cy}px)` }, { clipPath: `circle(0px at ${cx}px ${cy}px)` }],
    { duration: D - 60, delay: 70, easing: "cubic-bezier(.65, 0, .35, 1)", fill: "forwards" });
  await Promise.race([Promise.all([fly.finished, iris.finished]).catch(() => {}), wait(D + 500)]);
  done();
}
