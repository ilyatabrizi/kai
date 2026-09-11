#!/usr/bin/env python3
"""Shoot the new work in a real mobile Chrome, light and dark: the opening frame
by frame, the check-in animation frame by frame, the profile editor with a photo
framed through the crop sheet. Prints console errors. Shots → scripts/shots/v-*.png

    python3 scripts/visual.py [base-url]
"""
import io, pathlib, sys, time
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8161/").rstrip("/") + "/"
SHOTS = pathlib.Path(__file__).resolve().parent / "shots"
SHOTS.mkdir(exist_ok=True)
errors = []

def portrait_jpeg():
    im = Image.new("RGB", (900, 1200), (214, 196, 170))
    d = ImageDraw.Draw(im)
    for y in range(1200):
        d.line([(0, y), (900, y)], fill=(200 - y // 12, 180 - y // 14, 150 - y // 16))
    d.ellipse([300, 260, 600, 620], fill=(226, 190, 160))      # a head
    d.rectangle([240, 640, 660, 1200], fill=(60, 72, 64))        # shoulders
    b = io.BytesIO(); im.save(b, "JPEG", quality=90); return b.getvalue()

def ctx(browser, scheme):
    c = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                            color_scheme=scheme)
    return c

def watch(pg, tag):
    pg.on("pageerror", lambda e: errors.append(f"{tag} pageerror: {e}"))
    pg.on("console", lambda m: errors.append(f"{tag} console.{m.type}: {m.text}") if m.type == "error" else None)

def go(pg, h, ms=650):
    pg.evaluate("h => { location.hash = h; }", h); pg.wait_for_timeout(ms)

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    for scheme in ("light", "dark"):
        c = ctx(b, scheme); pg = c.new_page(); watch(pg, scheme)
        # the opening, frame by frame (cold: fresh context, no session flag)
        pg.goto(BASE + "?nosw#/", wait_until="commit")
        t0 = time.time()
        for i, at in enumerate([0.15, 0.45, 0.8, 1.15, 1.55, 1.85, 2.2]):
            while time.time() - t0 < at: time.sleep(0.01)
            pg.screenshot(path=str(SHOTS / f"v-{scheme}-boot-{i}.png"))
        pg.wait_for_timeout(900)
        pg.screenshot(path=str(SHOTS / f"v-{scheme}-home.png"))
        state = pg.evaluate("({ boot: !!document.getElementById('boot'), booting: document.documentElement.classList.contains('booting'), mode: document.documentElement.dataset.mode })")
        print(scheme, "after boot:", state)
        # check-in: before, then the tap frame by frame
        go(pg, "#/checkin", 900)
        pg.screenshot(path=str(SHOTS / f"v-{scheme}-checkin-0.png"))
        pg.evaluate("scrollTo(0, 150)"); pg.wait_for_timeout(250)
        pg.click("#dial")
        t0 = time.time()
        for i, at in enumerate([0.25, 0.55, 0.85, 1.2, 1.6, 2.4]):
            while time.time() - t0 < at: time.sleep(0.01)
            pg.screenshot(path=str(SHOTS / f"v-{scheme}-checkin-tap-{i}.png"))
        pg.evaluate("scrollTo(0, 720)"); pg.wait_for_timeout(300)
        pg.screenshot(path=str(SHOTS / f"v-{scheme}-checkin-room.png"))
        # you, and the editor
        go(pg, "#/profile", 800)
        pg.screenshot(path=str(SHOTS / f"v-{scheme}-profile.png"))
        pg.evaluate("scrollTo(0, 560)"); pg.wait_for_timeout(300)
        pg.screenshot(path=str(SHOTS / f"v-{scheme}-profile-settings.png"))
        go(pg, "#/profile/edit", 800)
        pg.fill("#pe-first", "Ilya"); pg.fill("#pe-last", "Tabrizi")
        pg.select_option("#pe-day", "12"); pg.select_option("#pe-month", "5")
        pg.wait_for_timeout(300)
        pg.screenshot(path=str(SHOTS / f"v-{scheme}-edit.png"))
        if scheme == "light":
            pg.click("#pe-av"); pg.wait_for_timeout(600)
            pg.screenshot(path=str(SHOTS / "v-light-edit-actions.png"))
            with pg.expect_file_chooser() as fc:
                pg.click(".act >> text=Choose from library")
            fc.value.set_files(files=[{"name": "me.jpg", "mimeType": "image/jpeg", "buffer": portrait_jpeg()}])
            pg.wait_for_timeout(900)
            pg.screenshot(path=str(SHOTS / "v-light-crop.png"))
            box = pg.locator("#crop-view").bounding_box()
            pg.mouse.move(box["x"] + 130, box["y"] + 130); pg.mouse.down(); pg.mouse.move(box["x"] + 130, box["y"] + 170, steps=6); pg.mouse.up()
            pg.fill("#crop-z", "1.4"); pg.dispatch_event("#crop-z", "input")
            pg.wait_for_timeout(200)
            pg.screenshot(path=str(SHOTS / "v-light-crop-2.png"))
            pg.click("#crop-use"); pg.wait_for_timeout(900)
            pg.screenshot(path=str(SHOTS / "v-light-edit-photo.png"))
            pg.evaluate("scrollTo(0, 99999)"); pg.wait_for_timeout(300)
            pg.screenshot(path=str(SHOTS / "v-light-edit-bottom.png"))
            print("photo saved:", pg.evaluate("(localStorage.getItem('kai.v1.photo') || '').slice(0, 30)"), "len", pg.evaluate("(localStorage.getItem('kai.v1.photo') || '').length"))
            # switch to dark from Settings and shoot the switch mid-way
            go(pg, "#/profile", 700)
            pg.evaluate("scrollTo(0, 560)"); pg.wait_for_timeout(300)
            pg.click('[data-seg="theme"] [data-v="dark"]')
            pg.wait_for_timeout(260); pg.screenshot(path=str(SHOTS / "v-switch-mid.png"))
            pg.wait_for_timeout(700); pg.screenshot(path=str(SHOTS / "v-switch-done.png"))
            print("after switch:", pg.evaluate("({ mode: document.documentElement.dataset.mode, pref: localStorage.getItem('kai.v1.theme'), meta: document.getElementById('theme-color').content })"))
        if scheme == "dark":
            for h, n in [("#/menu", "menu"), ("#/branches", "branches"), ("#/bag", "bag")]:
                go(pg, h, 700); pg.screenshot(path=str(SHOTS / f"v-dark-{n}.png"))
            go(pg, "#/", 700); pg.evaluate("scrollTo(0, 820)"); pg.wait_for_timeout(500)
            pg.screenshot(path=str(SHOTS / "v-dark-home-2.png"))
        c.close()
    b.close()
print("\n".join(errors) if errors else "no console errors")
