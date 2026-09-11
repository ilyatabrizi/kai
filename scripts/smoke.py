#!/usr/bin/env python3
"""Load every screen in a real mobile Chrome, collect console/page errors, shoot it."""
import sys, pathlib
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8161/").rstrip("/") + "/"
SHOTS = pathlib.Path(__file__).resolve().parent / "shots"
SHOTS.mkdir(exist_ok=True)
ROUTES = ["#/", "#/menu", "#/menu?cat=bakery", "#/bag", "#/checkin", "#/branches", "#/profile"]

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.on("requestfailed", lambda r: errors.append(f"requestfailed: {r.url} {r.failure}"))
    pg.goto(BASE + "?nosw" + ROUTES[0], wait_until="load")
    pg.wait_for_timeout(1800)
    for r in ROUTES:
        pg.evaluate("h => { location.hash = h; }", r)
        pg.wait_for_timeout(700)
        name = r.replace("#/", "").replace("?", "_").replace("=", "-") or "home"
        pg.screenshot(path=str(SHOTS / f"{name}.png"))
        h = pg.evaluate("document.querySelector('#view').innerText.length")
        print(f"{r:22} text={h}")
    # scrolled home for the bar state
    pg.evaluate("location.hash='#/'"); pg.wait_for_timeout(600)
    pg.evaluate("scrollTo(0, 900)"); pg.wait_for_timeout(500)
    pg.screenshot(path=str(SHOTS / "home-scrolled.png"))
    pg.evaluate("scrollTo(0, 2200)"); pg.wait_for_timeout(500)
    pg.screenshot(path=str(SHOTS / "home-scrolled-2.png"))
    pg.evaluate("scrollTo(0, document.documentElement.scrollHeight - 1700)"); pg.wait_for_timeout(500)
    pg.screenshot(path=str(SHOTS / "home-bottom-1.png"))
    pg.evaluate("scrollTo(0, document.documentElement.scrollHeight)"); pg.wait_for_timeout(500)
    pg.screenshot(path=str(SHOTS / "home-bottom-2.png"))
    pg.evaluate("location.hash='#/profile'"); pg.wait_for_timeout(600)
    pg.evaluate("scrollTo(0, 760)"); pg.wait_for_timeout(500)
    pg.screenshot(path=str(SHOTS / "profile-ladder.png"))
    b.close()
print("\n".join(errors) if errors else "no console errors")
