#!/usr/bin/env python3
"""Drive the customer flows in mobile Chrome and shoot each state."""
import sys, pathlib
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8161/").rstrip("/") + "/"
SHOTS = pathlib.Path(__file__).resolve().parent / "shots"
SHOTS.mkdir(exist_ok=True)
errors = []

def shot(pg, name): pg.screenshot(path=str(SHOTS / f"{name}.png"))
def goto(pg, h, ms=700): pg.evaluate("h => { location.hash = h; }", h); pg.wait_for_timeout(ms)

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.goto(BASE + "?nosw#/", wait_until="load"); pg.wait_for_timeout(1600)

    # 1. one-tap add from the home tile
    pg.click(".tile .add >> nth=0"); pg.wait_for_timeout(400)
    shot(pg, "f1-add-toast")
    print("bag badge:", pg.inner_text("#bag-count"), "dock hidden:", pg.evaluate("document.getElementById('dock').hidden"))

    # 2. menu row opens the sheet; qty 2; add
    goto(pg, "#/menu?cat=bakery")
    pg.click(".mitem >> nth=0"); pg.wait_for_timeout(700)
    shot(pg, "f2-item-sheet")
    pg.click(".sheet [data-inc]"); pg.wait_for_timeout(200)
    print("sheet sum:", pg.inner_text("#it-sum"))
    pg.click("#it-add"); pg.wait_for_timeout(600)
    print("bag badge after sheet:", pg.inner_text("#bag-count"))

    # 3. the bag
    goto(pg, "#/bag")
    shot(pg, "f3-bag")
    print("bag text:", pg.inner_text(".sum").replace("\n", " | "))
    pg.click("#pick-branch"); pg.wait_for_timeout(600); shot(pg, "f3b-branch-sheet")
    pg.click(".sheet [data-pick='jordan']"); pg.wait_for_timeout(700)
    print("pickup row:", pg.inner_text("#pick-branch .row-n"))
    if pg.query_selector("#use-cb"):
        pg.click("#use-cb"); pg.wait_for_timeout(500)
        print("after toggle:", pg.inner_text(".sum").replace("\n", " | "))
        pg.click("#use-cb"); pg.wait_for_timeout(500)
    pg.fill("#note", "Oat milk please")
    pg.click("#place"); pg.wait_for_timeout(900)
    shot(pg, "f4-order")
    print("order url:", pg.evaluate("location.hash"), "| code:", pg.inner_text(".code-big"))
    pg.evaluate("scrollTo(0, 700)"); pg.wait_for_timeout(300); shot(pg, "f4b-order-scrolled")

    # 4. check in
    goto(pg, "#/checkin")
    pg.click("#dial"); pg.wait_for_timeout(900)
    shot(pg, "f5-checkin-in")
    print("chip:", pg.inner_text("#ci-chip-label") if not pg.evaluate("document.getElementById('ci-chip').hidden") else "(hidden)", "| title:", pg.inner_text("#ci-title"))
    pg.evaluate("scrollTo(0, 620)"); pg.wait_for_timeout(300); shot(pg, "f5b-checkin-room")
    goto(pg, "#/"); print("chip on home:", pg.inner_text("#ci-chip-label"))

    # 5. profile after the order
    goto(pg, "#/profile")
    pg.evaluate("scrollTo(0, 1500)"); pg.wait_for_timeout(400); shot(pg, "f6-profile-ladder")
    pg.evaluate("scrollTo(0, 3000)"); pg.wait_for_timeout(400); shot(pg, "f6b-profile-orders")
    pg.click("#install"); pg.wait_for_timeout(600); shot(pg, "f6c-install-sheet"); pg.click(".sheet-close"); pg.wait_for_timeout(400)

    # 6. desktop
    d = b.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=1)
    dp = d.new_page()
    dp.on("pageerror", lambda e: errors.append(f"desktop pageerror: {e}"))
    dp.goto(BASE + "?nosw#/", wait_until="load"); dp.wait_for_timeout(1600); shot(dp, "d1-home")
    dp.evaluate("scrollTo(0, 900)"); dp.wait_for_timeout(500); shot(dp, "d1b-home-scrolled")
    goto(dp, "#/menu"); shot(dp, "d2-menu")
    goto(dp, "#/branches"); shot(dp, "d3-branches")
    goto(dp, "#/profile"); shot(dp, "d4-profile")
    b.close()
print("\n".join(errors) if errors else "no console errors")
