// The opening: the ampersand arrives, then the name, then both step aside.
// About a second on a cold start, half that on a warm one.

import { STORAGE } from "./config.js";
import { reduced } from "./motion.js";
import { MARK } from "./brand.js";

const SEEN = STORAGE + "booted";

export function runBoot() {
  const boot = document.getElementById("boot");
  if (!boot) return Promise.resolve();
  document.getElementById("boot-mark").innerHTML = MARK;

  let warm = false;
  try { warm = sessionStorage.getItem(SEEN) === "1"; sessionStorage.setItem(SEEN, "1"); } catch {}
  if (warm) boot.classList.add("warm");

  if (reduced()) {
    boot.classList.add("gone");
    document.documentElement.dataset.booted = "1";
    return Promise.resolve();
  }
  const hold = warm ? 520 : 1250;
  return new Promise((resolve) => {
    setTimeout(() => {
      boot.classList.add("gone");
      document.documentElement.dataset.booted = "1";
      setTimeout(resolve, 500);
    }, hold);
  });
}
