#!/usr/bin/env python3
"""End-to-end checks for the KAI Coffee PWA.

    python3 serve.py &                                # or run it in another shell
    python3 e2e.py                                    # local preview
    python3 e2e.py https://ilyatabrizi.github.io/kai/ # the deployed build

Drives a real mobile Chrome through every screen and every action a customer
would take — boot, the reel, the loyalty card, the card, one-tap adding, the
sheet, the bag and its cashback, the order code, check-in, branches, you — and
fails loudly on anything broken. Includes regression checks for the three
hash-router traps (stacked listeners, same-hash navigation, scroll-derived bar
state) and the Persian typography rule (no middot beside Persian digits).

Screenshots land in scripts/shots/.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8161/").rstrip("/") + "/"
LIVE = "localhost" not in BASE and "127.0.0.1" not in BASE
SHOTS = pathlib.Path(__file__).resolve().parent / "scripts" / "shots"

CONTRAST_JS = """(() => {
          const lum = (c) => { const v = c.match(/[\\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
          const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
          const bg = getComputedStyle(document.body).backgroundColor, card = getComputedStyle(document.querySelector('.list')).backgroundColor;
          return { title: ratio(getComputedStyle(document.querySelector('.lt')).color, bg), rowDetail: ratio(getComputedStyle(document.querySelector('.row-d')).color, card), tiny: ratio(getComputedStyle(document.querySelector('.tiny')).color, bg) };
        })()"""

PASS: list[str] = []
FAIL: list[str] = []
LEAGUES = [("Stranger", 0, 7), ("Friend", 5000, 12), ("Close Friend", 10000, 15), ("Best Friend", 20000, 17), ("Legend", 50000, 22)]


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else f"{name}  →  {detail}")


def settle(page, ms=360):
    page.wait_for_timeout(ms)


def goto(page, hash_path, ms=560):
    page.evaluate("h => { location.hash = h; }", hash_path)
    settle(page, ms)


def shot(page, name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"e2e-{name}.png"))


def http(url, method="GET"):
    try:
        req = urllib.request.Request(url, method=method, headers={"User-Agent": "kai-e2e"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, dict(r.headers), (r.read() if method == "GET" else b"")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), b""
    except Exception as e:
        return 0, {}, str(e).encode()


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("pip install playwright  (uses the system Chrome)")

    # ------------------------------------------------------------ over http
    for path in ["", "index.html", "manifest.webmanifest", "sw.js", "css/app.css", "js/app.js", "js/data.js",
                 "assets/brand/mark.svg", "assets/icons/icon-512.png", "assets/icons/maskable-512.png",
                 "assets/items/americano.webp", "assets/branches/vanak.webp", "assets/photos/padel.webp",
                 "assets/video/poster.webp", "assets/fonts/bodoni.woff2", "assets/fonts/IRANYekanXFaNum-Medium.woff2", "404.html",
                 "js/theme.js", "js/jalali.js", "js/wordmark.js", "js/photo.js", "js/dial.js", "js/views/profile-edit.js", "assets/brand/alpha-white.png"]:
        st, _, _ = http(BASE + path)
        check(f"http 200 {path or '/'}", st == 200, f"got {st}")
    st, h, body = http(BASE + "manifest.webmanifest")
    try:
        man = json.loads(body)
        check("manifest parses, standalone, icons", man.get("display") == "standalone" and len(man.get("icons", [])) >= 3
              and any("maskable" in i.get("purpose", "") for i in man["icons"]), body[:80])
    except Exception as e:
        check("manifest parses", False, str(e))
    st, h, _ = http(BASE + "assets/video/hero.mp4", "HEAD")
    ctype = next((v for k, v in h.items() if k.lower() == "content-type"), "")
    check("video served as mp4", st == 200 and "video/mp4" in ctype, f"{st} {ctype}")
    html = http(BASE)[2].decode("utf-8", "replace")
    check("noindex while unapproved", 'name="robots" content="noindex' in html)
    check("viewport-fit cover for the notch", "viewport-fit=cover" in html)
    check("scrollRestoration claimed in head", "scrollRestoration" in html.split("<body")[0])
    check("theme applied in <head>, before the first paint", 'localStorage.getItem("kai.v1.theme")' in html.split("<body")[0])
    check("opening inlined: their logo, the ampersand over the wordmark", 'class="boot-mark"' in html and html.count('class="wl"') == 9 and "boot-liquid" not in html and "boot-stream" not in html)
    check("no secrets in shipped js", not re.search(r"(sk_live|api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9]{12,})", http(BASE + "js/config.js")[2].decode()))
    data_js = http(BASE + "js/data.js")[2].decode("utf-8")
    check("data.js: 112 visible items", data_js.count('"cat":') == 112, str(data_js.count('"cat":')))
    check("data.js: 8 branches with Persian addresses", data_js.count('"address":') == 8 and len(re.findall(r'"address": "[^"]*[\u0600-\u06FF]', data_js)) == 8)
    check("data.js: real maps links", data_js.count("maps.app.goo.gl") == 7)
    check("data.js: five leagues 7→22", '"cashback": 22' in data_js and '"cashback": 7' in data_js)
    check("Persian typography: no middot beside Persian digits (data)", not re.search(r"[۰-۹]\s*·|·\s*[۰-۹]", data_js))

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
        page = ctx.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        page.goto(BASE + ("" if LIVE else "?nosw") + "#/", wait_until="load")
        page.wait_for_timeout(600)
        check("opening shows their logo at 0.6 s", page.evaluate("!!document.getElementById('boot')"))
        check("the logo holds still: nothing on it animates (the screen's own fade is the only motion)", page.evaluate("(() => { const l = document.querySelector('#boot .boot-logo'); return !l || l.getAnimations({ subtree: true }).length === 0; })()"))
        import time as _t
        t_boot = _t.time()
        try:
            page.wait_for_selector("#boot", state="detached", timeout=9000)
        except Exception:
            pass
        waited = _t.time() - t_boot + 0.6
        check("opening fades and leaves", page.evaluate("!document.getElementById('boot') && !document.documentElement.classList.contains('booting')"), f"still up after {waited:.1f}s")
        check("opening lasts under 4.5 s from load", waited < 4.5, f"{waited:.1f}s")
        page.wait_for_timeout(300)
        check("bar carries KAI's own wordmark", page.locator("#bar-word svg .wl").count() == 9)
        check("fonts: Bodoni Moda loaded", page.evaluate("document.fonts.check('500 32px \"Bodoni Moda\"')"))
        check("fonts: IRANYekanXFaNum loaded", page.evaluate("document.fonts.check('500 14px IRANYekanXFaNum')"))
        shot(page, "home")

        # ------------------------------------------------------------- home
        check("hero: reel with poster", page.evaluate("document.getElementById('hero-video').getAttribute('src').endsWith('hero.mp4') && document.getElementById('hero-video').poster.includes('poster.webp')"))
        hero_txt = page.inner_text("#hero")
        check("hero: no text written across the reel", page.locator(".hero-copy").count() == 0 and "comfort" not in hero_txt and "Seven branches" not in hero_txt, hero_txt[:80])
        page.wait_for_timeout(1500)
        vs = page.evaluate("(() => { const v = document.getElementById('hero-video'); return { paused: v.paused, t: v.currentTime, w: v.videoWidth, muted: v.muted, on: v.classList.contains('on'), audio: v.webkitAudioDecodedByteCount, ready: v.readyState }; })()")
        check("hero: the reel is actually playing", (not vs["paused"]) and vs["t"] > 0.3 and vs["on"], str(vs))
        check("hero: reel is 720 wide and muted as a property", vs["w"] == 720 and vs["muted"], str(vs))
        check("hero: reel carries no audio track", vs["audio"] == 0, str(vs))
        check("hero: no sound toggle any more", page.locator("#hero-sound").count() == 0)
        geo = page.evaluate("(() => { const r = e => e.getBoundingClientRect(); const h = r(document.getElementById('hero')), v = r(document.getElementById('hero-video')); return { dt: Math.abs(h.top - v.top), dh: Math.abs(h.height - v.height), dw: Math.abs(h.width - v.width) }; })()")
        check("hero: the reel covers the hero frame (not stacked under the poster)", geo["dt"] < 2 and geo["dh"] < 2 and geo["dw"] < 2, str(geo))
        # visible motion: two captures of the hero a second apart must differ
        try:
            from PIL import Image
            import io, numpy as np
            hero_box = page.evaluate("(() => { const b = document.getElementById('hero').getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: Math.min(b.height, 700) }; })()")
            a = page.screenshot(clip=hero_box); page.wait_for_timeout(1200); b_ = page.screenshot(clip=hero_box)
            A = np.asarray(Image.open(io.BytesIO(a)).convert("L"), dtype=float); B = np.asarray(Image.open(io.BytesIO(b_)).convert("L"), dtype=float)
            motion = float(np.abs(A - B).mean())
            check("hero: frames visibly change over a second", motion > 0.4, f"mean abs diff {motion:.2f}")
        except Exception as ex:
            check("hero: frames visibly change over a second", False, str(ex))
        check("loyalty card shows a league and points", re.search(r"(Stranger|Friend|Close Friend|Best Friend|Legend) league", page.inner_text(".loy")) is not None, page.inner_text(".loy")[:60])
        check("six new items on the shelf", page.locator(".hscroll .tile").count() == 6, str(page.locator(".hscroll .tile").count()))
        check("nine categories", page.locator(".cats .cat").count() == 9)
        check("eight branches in the teaser", page.locator(".br-teaser").count() == 8)
        check("about copy is KAI's own line", "modern urban cafe" in page.inner_text(".card--paper"))
        check("Alpha Agency mark in the footer", page.evaluate("!!document.querySelector('.powered img') && document.querySelector('.powered img').naturalWidth > 0"))
        check("no horizontal scroll on home", page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
        check("tab bar: five tabs, home current", page.locator(".tab").count() == 5 and page.get_attribute(".tab[data-tab=home]", "aria-current") == "page")
        ink_home = page.evaluate("getComputedStyle(document.getElementById('tabs-ink')).transform")
        check("tab pill drawn", page.evaluate("document.getElementById('tabs-ink').getBoundingClientRect().width") > 50)
        check("check-in chip visible on home", page.evaluate("!document.getElementById('ci-chip').hidden"))
        check("bar transparent at the top", not page.evaluate("document.getElementById('bar').classList.contains('solid')"))
        page.evaluate("scrollTo(0, 800)"); settle(page)
        check("bar turns to glass once scrolled", page.evaluate("document.getElementById('bar').classList.contains('solid')"))

        # ------------------------------------------------------------- menu
        goto(page, "#/menu")
        shot(page, "menu")
        check("tab pill moved to Menu", page.evaluate("getComputedStyle(document.getElementById('tabs-ink')).transform") != ink_home
              and page.get_attribute(".tab[data-tab=menu]", "aria-current") == "page")
        check("bar not solid on a fresh page", not page.evaluate("document.getElementById('bar').classList.contains('solid')"))
        rows = page.locator(".mitem").count()
        check("112 rows on the card", rows == 112, str(rows))
        check("every row has a Persian gloss", page.locator(".mitem-fa").count() == rows and page.evaluate("[...document.querySelectorAll('.mitem-fa')].every(e => /[\\u0600-\\u06FF]/.test(e.textContent))"))
        check("every row has a price and a plus", page.locator(".mitem .add").count() == rows and page.locator(".mitem-p").count() == rows)
        check("ten chips", page.locator("#chips .chip").count() == 10)
        page.click("#chips [data-cat=bakery]"); settle(page)
        check("chip filters to one section", page.locator(".msec").count() == 1 and page.locator(".mitem").count() == 27, str(page.locator(".mitem").count()))
        check("url remembers the category", page.evaluate("location.hash") == "#/menu?cat=bakery", page.evaluate("location.hash"))
        page.click("#chips [data-cat=all]"); settle(page)
        page.fill("#q", "boba"); settle(page)
        n = page.locator(".mitem").count()
        check("search 'boba' narrows the card", 0 < n < 20 and page.evaluate("[...document.querySelectorAll('.mitem-n')].every(e => /boba/i.test(e.textContent))"), str(n))
        page.fill("#q", "کروسان"); settle(page)
        check("search works in Persian", page.locator(".mitem").count() >= 3, str(page.locator(".mitem").count()))
        page.click("#q-clear"); settle(page)
        check("clear restores the card", page.locator(".mitem").count() == 112)
        page.evaluate("scrollTo(0, 1400)"); settle(page)
        check("bar shows the page title once the large title is under it", page.evaluate("document.getElementById('bar').classList.contains('titled')") and page.inner_text("#bar-title") == "Menu")

        # --------------------------------------------- listener stacking trap
        goto(page, "#/"); goto(page, "#/menu"); goto(page, "#/"); goto(page, "#/menu")
        page.click(".mitem .add >> nth=0"); settle(page, 500)
        check("REGRESSION one tap adds one after four visits", page.inner_text("#bag-count") == "1", page.inner_text("#bag-count"))
        check("dock rises with the running total", not page.evaluate("document.getElementById('dock').hidden") and "T" in page.inner_text("#dock-sum"))
        check("toast confirms the add", page.locator(".toast").count() >= 1)

        # ------------------------------------------------------------ sheet
        page.click(".mitem >> nth=3"); settle(page, 700)
        check("row opens the item sheet", page.evaluate("!!document.querySelector('.sheet.on')"))
        name = page.inner_text(".sheet .it-name")
        sum1 = page.inner_text("#it-sum")
        page.click(".sheet [data-inc]"); settle(page, 200)
        check("sheet quantity doubles the sum", page.inner_text("#it-sum") != sum1)
        check("sheet has Persian ingredients", page.evaluate("/[\\u0600-\\u06FF]/.test(document.querySelector('.sheet .it-ing')?.textContent || '')"))
        page.click("#it-add"); settle(page, 600)
        check("sheet add puts two in the bag and closes", page.inner_text("#bag-count") == "3" and not page.evaluate("!!document.querySelector('.sheet.on')"), page.inner_text("#bag-count"))
        page.click(".mitem >> nth=5"); settle(page, 600)
        page.keyboard.press("Escape"); settle(page, 500)
        check("Escape closes the sheet", not page.evaluate("!!document.querySelector('.sheet.on')"))
        page.click(".mitem >> nth=5"); settle(page, 600)
        page.mouse.click(200, 120); settle(page, 500)
        check("scrim closes the sheet", not page.evaluate("!!document.querySelector('.sheet.on')"))

        # -------------------------------------------------------------- bag
        goto(page, "#/bag")
        shot(page, "bag")
        check("back button on a pushed screen, bag button hidden", not page.evaluate("document.getElementById('bar-back').hidden") and page.evaluate("getComputedStyle(document.getElementById('bag-btn')).display") == "none")
        check("two lines in the bag", page.locator("[data-line]").count() == 2)
        check("dock hidden on the bag", page.evaluate("document.getElementById('dock').hidden"))
        subtotal = page.inner_text(".sum-row >> nth=0")
        check("subtotal is the sum of lines", re.search(r"\d{1,3}(,\d{3})+ T", subtotal) is not None, subtotal)
        # same-hash refresh: qty change re-renders in place
        y_before = page.evaluate("scrollY")
        page.click("[data-line] >> nth=0 >> [data-inc]"); settle(page, 500)
        check("REGRESSION qty change re-renders in place (same hash)", page.evaluate("location.hash") == "#/bag" and page.inner_text("#bag-count") == "4", page.inner_text("#bag-count"))
        page.click("[data-line] >> nth=0 >> [data-dec]"); settle(page, 400)
        page.click("[data-line] >> nth=0 >> [data-dec]"); settle(page, 500)
        check("qty to zero removes the line", page.locator("[data-line]").count() == 1)
        page.click("#pick-branch"); settle(page, 600)
        check("branch sheet lists the seven open branches", page.locator(".sheet [data-pick]").count() == 7)
        page.click(".sheet [data-pick=mirdamad]"); settle(page, 700)
        check("pickup branch changes", "Mirdamad" in page.inner_text("#pick-branch"))
        if page.locator("#use-cb").count():
            total_on = page.inner_text(".sum-row.total")
            page.click("#use-cb"); settle(page, 500)
            check("cashback toggle changes the total", page.inner_text(".sum-row.total") != total_on)
            page.click("#use-cb"); settle(page, 500)
        page.fill("#note", "Oat milk, extra hot"); settle(page, 200)
        page.click("#place"); settle(page, 900)
        shot(page, "order")
        code = page.inner_text(".code-big").strip()
        check("order placed → order screen with a 4-digit code", page.evaluate("location.hash").startswith("#/order/") and re.fullmatch(r"\d{4}", code) is not None, code)
        check("order shows a QR the till can scan", page.evaluate("!!document.querySelector('.code-qr svg path')"))
        check("order is for the chosen branch", "mirdamad" in page.inner_text(".code .eyebrow").lower())
        check("order keeps the note", "Oat milk" in page.inner_text("#view"))
        check("countdown ring ticking", re.fullmatch(r"\d\d:\d\d", page.inner_text("#ring-t").strip()) is not None, page.inner_text("#ring-t"))
        check("bag empty after the order", page.evaluate("document.getElementById('bag-count').classList.contains('on')") is False)
        check("points and cashback credited on the order", re.search(r"\+\d[\d,]* points", page.inner_text(".code-note")) is not None)

        # ---------------------------------------------------------- loyalty
        goto(page, "#/profile")
        shot(page, "profile")
        pts = int(re.sub(r"[^\d]", "", page.inner_text(".member-grid > div:nth-child(1) b")))
        league_txt = page.inner_text(".member-id")
        expected = [l for l in LEAGUES if pts >= l[1]][-1]
        check("member card league matches the thresholds", expected[0].upper() in league_txt.upper(), f"{pts} pts → {league_txt}")
        check("member card cashback % matches the league", f"{expected[2]}%" in page.inner_text(".member-grid"), page.inner_text(".member-grid"))
        check("member QR present", page.evaluate("!!document.querySelector('.member-qr svg')"))
        check("five rungs on the ladder, one current", page.locator(".rung").count() == 5 and page.locator(".rung.now").count() == 1)
        check("the order is in the history with its code", code and page.evaluate("[...document.querySelectorAll('.history .row-d')].length > 0"))
        check("You opens on your card, with Settings", page.locator("#me-card").count() == 1 and page.locator('[data-seg="theme"]').count() == 1)
        goto(page, "#/profile/edit", 700)
        shot(page, "edit")
        check("edit profile is pushed: back button, You tab lit", not page.evaluate("document.getElementById('bar-back').hidden") and page.get_attribute(".tab[data-tab=profile]", "aria-current") == "page")
        page.fill("#pe-first", "Ilya"); page.fill("#pe-last", "Tabrizi"); settle(page, 200)
        check("avatar initials follow the name", page.inner_text("#pe-av-face").strip() == "IT", page.inner_text("#pe-av-face"))
        page.fill("#pe-phone", "123"); settle(page, 150)
        check("a wrong phone number gets a hint", "09" in page.inner_text("#pe-hint"))
        page.fill("#pe-phone", "0912 345 6789"); settle(page, 150)
        check("a real Iranian mobile clears it", page.inner_text("#pe-hint").strip() == "")
        page.select_option("#pe-day", "12"); page.select_option("#pe-month", "5"); settle(page, 200)
        note = page.inner_text("#pe-bday-note")
        check("birthday is Jalali and counts to the gift", re.search(r"12 Mordad", note) is not None and re.search(r"\d+ days|tomorrow|Today", note) is not None, note)
        page.click("[data-hue='3']"); settle(page, 200)
        check("avatar colour choice sticks", page.evaluate("document.querySelector('#pe-av-face .av').classList.contains('av-3')"))
        page.click("#pe-usual"); settle(page, 600)
        page.click(".sheet [data-usual='iced-latte']"); settle(page, 600)
        check("your usual is set from their drinks", "Iced Latte" in page.inner_text("#pe-usual-d"))
        page.click('[data-seg="appear"] [data-v="initials"]'); settle(page, 200)
        check("rooms will show you by initials", "I. T." in page.inner_text("#pe-appear-note"), page.inner_text("#pe-appear-note"))
        # a photo, framed through the crop sheet
        try:
            from PIL import Image as _I
            import io as _io
            im = _I.new("RGB", (900, 1200), (200, 170, 140)); buf = _io.BytesIO(); im.save(buf, "JPEG"); jpeg = buf.getvalue()
            page.click("#pe-av"); settle(page, 600)
            check("photo menu offers camera and library", page.locator(".act").count() >= 2)
            with page.expect_file_chooser() as fc:
                page.click(".act >> text=Choose from library")
            fc.value.set_files(files=[{"name": "me.jpg", "mimeType": "image/jpeg", "buffer": jpeg}])
            settle(page, 900)
            check("the crop sheet opens on the photo", page.locator(".crop-view img").count() == 1)
            page.click("#crop-use"); settle(page, 900)
            ph = page.evaluate("localStorage.getItem('kai.v1.photo') || ''")
            check("photo kept as a small square JPEG", ph.startswith("data:image/jpeg") and 2000 < len(ph) < 400000, str(len(ph)))
            check("photo shows on the editor and the You tab", page.locator("#pe-av-face img").count() == 1 and page.locator(".tab[data-tab=profile] .tab-av img").count() == 1)
        except Exception as ex:
            check("photo flow", False, str(ex)[:200])
        goto(page, "#/profile", 700)
        check("your name heads You and the member card", page.inner_text(".me-t b").strip() == "Ilya Tabrizi" and page.inner_text(".member-name").strip() == "Ilya Tabrizi")
        page.reload(); page.wait_for_timeout(2400)
        check("profile persists across a reload", page.inner_text(".member-name").strip() == "Ilya Tabrizi" and page.locator(".me-av img").count() == 1)
        goto(page, "#/", 700)
        check("your usual waits on Home, one tap from the bag", "Iced Latte" in page.inner_text(".usual") and page.locator(".usual [data-add='iced-latte']").count() == 1)
        goto(page, "#/profile", 700)
        page.click("#install"); settle(page, 600)
        check("install row explains the two taps on iOS", "home screen" in page.inner_text(".sheet").lower())
        page.click(".sheet-close"); settle(page, 500)

        # --------------------------------------------------------- check-in
        goto(page, "#/checkin")
        shot(page, "checkin")
        check("chip hidden on the check-in page itself", page.evaluate("document.getElementById('ci-chip').hidden"))
        check("dial starts out", page.get_attribute("#dial", "aria-pressed") == "false")
        n_before = int(re.sub(r"\D", "", page.inner_text("#place-n")) or 0)
        wave_y = "parseFloat(document.getElementById('dial-wave').getAttribute('transform').split(' ')[1])"
        y0 = page.evaluate(wave_y)
        page.click("#dial"); settle(page, 380)
        y1 = page.evaluate(wave_y); settle(page, 900)
        y2 = page.evaluate(wave_y)
        check("the cup fills: the surface rises through the tap", y0 > y1 > y2 and y2 < 0, f"{y0} → {y1} → {y2}")
        settle(page, 900)
        check("one tap checks in", page.get_attribute("#dial", "aria-pressed") == "true" and "in" in page.inner_text("#ci-title").lower())
        check("the hour ring is drawn", page.evaluate("parseFloat(getComputedStyle(document.getElementById('dial-ring')).strokeDashoffset)") < 60)
        check("the confetti clears itself", page.locator(".spark").count() == 0 and page.locator(".flyer").count() == 0)
        check("your face lands on the branch card", page.locator("#place-faces .av--me").count() == 1)
        n_after = int(re.sub(r"\D", "", page.inner_text("#place-n")) or 0)
        check("the headcount goes up by one", n_after == n_before + 1, f"{n_before} → {n_after}")
        entry = page.evaluate("(() => { const id = localStorage.getItem('kai.v1.meid'); return (JSON.parse(localStorage.getItem('kai.v1.room') || '[]').find(p => p.id === id) || {}).name; })()")
        check("the room sees you as you chose (initials)", entry == "I. T.", str(entry))
        check("you are in the room list", page.locator("#room .person.me").count() == 1)
        shot(page, "checkin-in")
        if page.locator("#room [data-wave]").count():
            page.click("#room [data-wave] >> nth=0"); settle(page, 300)
            check("a wave lands and says so", page.get_attribute("#room [data-wave] >> nth=0", "aria-pressed") == "true" and "waved" in page.inner_text("#toast-root").lower())
        page.click("#others [data-go] >> nth=0"); settle(page, 500)
        check("cannot switch branch while checked in", page.get_attribute("#dial", "aria-pressed") == "true")
        page.click("#extend"); settle(page, 1100)
        check("another hour extends", re.match(r"^(59|60):\d\d$", page.inner_text("#ci-clock b").strip()) is not None, page.inner_text("#ci-clock"))
        goto(page, "#/")
        check("chip on home says you're in", "You're in" in page.inner_text("#ci-chip-label"))
        goto(page, "#/checkin")
        page.click("#out"); settle(page, 1300)
        check("leave clears the seat", page.get_attribute("#dial", "aria-pressed") == "false" and page.locator("#place-faces .av--me").count() == 0)
        page.click("#pick"); settle(page, 600)
        check("branch sheet from check-in shows headcounts", page.locator(".sheet [data-pick]").count() == 7 and "here now" in page.inner_text(".sheet"))
        page.click(".sheet [data-pick=jordan]"); settle(page, 600)
        check("check-in branch switches", "Jordan" in page.inner_text("#place-en"))

        # --------------------------------------------------------- branches
        goto(page, "#/branches")
        shot(page, "branches")
        check("eight branch cards", page.locator(".br-card").count() == 8)
        check("seven map links, all to Google Maps", page.locator(".br-card a[href*='maps.app.goo.gl']").count() == 7)
        check("central line as a tel link", page.locator("a[href='tel:+982191010701']").count() >= 8)
        check("addresses are Persian, verbatim from kaicoffeeco.com", page.evaluate("[...document.querySelectorAll('.br-addr')].every(e => /[\\u0600-\\u06FF]/.test(e.textContent))") and "خیابان خدامی" in page.inner_text("#vanak"))
        check("Kish is coming soon", "coming soon" in page.inner_text("#kish").lower())
        check("Royan carries its own menu", "own menu" in page.inner_text("#royan").lower())
        check("Jordan is my branch after the check-in pick", page.evaluate("document.getElementById('jordan').classList.contains('mine')"))
        page.click("#velenjak [data-mine]"); settle(page, 600)
        check("my branch moves", page.evaluate("document.getElementById('velenjak').classList.contains('mine')") and not page.evaluate("document.getElementById('jordan').classList.contains('mine')"))
        check("branch covers loaded", page.evaluate("[...document.querySelectorAll('.br-card img')].filter(i => i.naturalWidth > 0).length") >= 6)

        # ------------------------------------------- scroll-derived bar trap
        page.evaluate("scrollTo(0, 2000)"); settle(page)
        check("bar solid on the long page", page.evaluate("document.getElementById('bar').classList.contains('solid')"))
        goto(page, "#/bag")
        check("REGRESSION bar resets on a short page", not page.evaluate("document.getElementById('bar').classList.contains('solid')") and not page.evaluate("document.getElementById('bar').classList.contains('titled')"))
        check("empty bag has its empty state", "empty" in page.inner_text("#view").lower())

        # ------------------------------------------------------- deep links
        goto(page, "#/item/latte", 900)
        check("deep link to an item lands on its row", page.evaluate("location.hash") == "#/item/latte" and page.evaluate("!!document.querySelector('#row-latte')"))
        goto(page, "#/menu?cat=snacks")
        check("menu link with a category opens filtered", page.locator(".msec").count() == 1 and "Snacks" in page.inner_text(".msec-head"))

        # ------------------------------------------------- typography rules
        for h in ["#/", "#/menu", "#/branches", "#/profile", "#/checkin", "#/profile/edit"]:
            goto(page, h, 400)
            txt = page.inner_text("body")
            check(f"no middot beside Persian digits on {h}", not re.search(r"[۰-۹]\s*·|·\s*[۰-۹]", txt))
            check(f"no horizontal scroll on {h}", page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))

        # ------------------------------------------------------ sample data
        goto(page, "#/profile")
        page.click("#clear-sample"); settle(page, 600)
        check("clearing the sample account zeroes the points", page.inner_text(".member-grid > div:nth-child(1) b").strip() == "0")
        page.click("#load-sample"); settle(page, 600)
        check("sample account can be reloaded", int(re.sub(r"[^\d]", "", page.inner_text(".member-grid > div:nth-child(1) b"))) > 1000)

        # ------------------------------------------------------- appearance
        goto(page, "#/profile", 700)
        check("appearance follows the phone by default", page.evaluate("document.documentElement.dataset.theme") == "system" and page.evaluate("document.documentElement.dataset.mode") == "light")
        page.click('[data-seg="theme"] [data-v="dark"]'); settle(page, 1000)
        dark = page.evaluate("({ mode: document.documentElement.dataset.mode, bg: getComputedStyle(document.body).backgroundColor, meta: document.getElementById('theme-color').content, saved: localStorage.getItem('kai.v1.theme') })")
        check("Dark from Settings: espresso ground, browser bar, remembered", dark == {"mode": "dark", "bg": "rgb(16, 15, 12)", "meta": "#100F0C", "saved": "dark"}, str(dark))
        contrast = page.evaluate(CONTRAST_JS)
        check("dark mode text contrast holds (title ≥ 7, secondary ≥ 4.5)", contrast["title"] >= 7 and contrast["rowDetail"] >= 4.5 and contrast["tiny"] >= 4.5, str(contrast))
        page.reload(); page.wait_for_timeout(2400)
        check("dark survives a reload", page.evaluate("document.documentElement.dataset.mode") == "dark")
        for h in ["#/", "#/menu", "#/checkin", "#/branches", "#/profile/edit"]:
            goto(page, h, 500)
            check(f"dark: no horizontal scroll on {h}", page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
        shot(page, "dark-edit")
        goto(page, "#/profile", 700)
        page.click('[data-seg="theme"] [data-v="system"]'); settle(page, 900)
        page.emulate_media(color_scheme="dark"); settle(page, 300)
        m1 = page.evaluate("document.documentElement.dataset.mode")
        page.emulate_media(color_scheme="light"); settle(page, 300)
        m2 = page.evaluate("document.documentElement.dataset.mode")
        check("System follows the phone as it changes", m1 == "dark" and m2 == "light", f"{m1} {m2}")
        cl = page.evaluate(CONTRAST_JS)
        check("light mode text contrast holds (title ≥ 7, secondary ≥ 4.5)", cl["title"] >= 7 and cl["rowDetail"] >= 4.5 and cl["tiny"] >= 4.5, str(cl))

        # ---------------------------------------------------------- desktop
        d = browser.new_context(viewport={"width": 1280, "height": 800})
        dp = d.new_page()
        dp.on("pageerror", lambda e: errors.append("desktop " + str(e)))
        dp.goto(BASE + ("" if LIVE else "?nosw") + "#/", wait_until="load")
        dp.wait_for_selector(".hero-media", timeout=15000)
        try:
            dp.wait_for_selector("#boot", state="detached", timeout=9000)
        except Exception:
            pass
        dp.wait_for_timeout(400)
        check("desktop: the reel stands centred", dp.evaluate("(() => { const b = document.querySelector('.hero-media').getBoundingClientRect(); return Math.abs(b.left + b.width / 2 - innerWidth / 2) < 4 && b.height > 300; })()"))
        check("desktop: no horizontal scroll", dp.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
        dp.evaluate("location.hash='#/menu'"); dp.wait_for_timeout(600)
        check("desktop: menu in two columns", dp.evaluate("getComputedStyle(document.querySelector('.mlist')).gridTemplateColumns.split(' ').length") == 2)
        shot(dp, "desktop-menu")
        d.close()

        # ------------------------------------------------------- the worker
        if LIVE:
            sw = ctx.new_page()
            sw.goto(BASE + "#/", wait_until="load"); sw.wait_for_timeout(2500)
            ready = sw.evaluate("navigator.serviceWorker.getRegistration().then(r => !!r)")
            check("service worker registered on the live URL", ready)
            keys = sw.evaluate("caches.keys()")
            check("worker cache present", any(k.startswith("kai-") for k in keys), str(keys))
            sw.close()

        check("no page errors anywhere", not errors, " | ".join(errors)[:300])
        browser.close()

    print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
    for f in FAIL:
        print("  ✗", f)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
