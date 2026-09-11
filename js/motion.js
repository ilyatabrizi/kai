// Motion helpers. Everything checks the reduced-motion preference first.

export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A short tap on the phone's haptic engine, where the browser allows it. */
export function haptic(pattern = 12) {
  try { navigator.vibrate?.(pattern); } catch {}
}

/** Re-run a CSS animation class on a node. */
export function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

/** Count a number up in a node over ms. */
export function countUp(node, to, ms = 900, fmt = (n) => Math.round(n).toLocaleString("en-US")) {
  if (reduced()) { node.textContent = fmt(to); return; }
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms);
    node.textContent = fmt(to * ease(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
