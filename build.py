#!/usr/bin/env python3
"""Stamp the build. Run before every deploy.

1. Inline the opening screen into index.html — the ampersand (js/brand.js) with
   the coffee that fills it, and KAI's wordmark (js/wordmark.js) — so it paints
   with the first byte instead of waiting for the modules.
2. Content-hash the shell into the service-worker version and the stylesheet /
   module query strings, so a returning visitor never runs a stale mix.

    python3 build.py
"""
import hashlib
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
BOOT_RE = re.compile(r"<!-- boot:start -->.*?<!-- boot:end -->", re.S)


def boot_block():
    brand = (ROOT / "js/brand.js").read_text(encoding="utf-8")
    vb = re.search(r'MARK_VIEWBOX = "([^"]+)"', brand).group(1)
    d = re.search(r'MARK_PATH = "([^"]+)"', brand).group(1)
    wm = (ROOT / "js/wordmark.js").read_text(encoding="utf-8")
    wvb = re.search(r'WORDMARK_VIEWBOX = "([^"]+)"', wm).group(1)
    letters = re.search(r"WORDMARK_INNER = `(.*?)`;", wm, re.S).group(1)
    w, h = (float(v) for v in vb.split()[2:])
    half, amp = w / 4, w * 0.028            # a wave of two crests per glyph width
    n = int(3 * w / half)                   # drawn across three widths so it can slide
    wave = f"M{-w:.0f} 0q{half / 2:.1f} {-amp:.1f} {half:.1f} 0" + f"t{half:.1f} 0" * (n - 1)
    liquid = f"{wave}V{h * 1.32:.0f}H{-w:.0f}Z"
    return f"""<!-- boot:start -->
<div id="boot" aria-hidden="true">
  <div class="boot-bg"></div>
  <div class="boot-stage">
    <div class="boot-glyph">
      <span class="boot-stream"></span>
      <svg class="boot-mark" viewBox="{vb}" focusable="false">
        <defs><clipPath id="boot-clip"><path clip-rule="evenodd" d="{d}"/></clipPath></defs>
        <path class="boot-ghost" fill-rule="evenodd" d="{d}"/>
        <g clip-path="url(#boot-clip)"><g class="boot-level"><g class="boot-wave"><path class="boot-liquid" d="{liquid}"/><path class="boot-crema" d="{wave}"/></g></g></g>
        <path class="boot-solid" fill-rule="evenodd" d="{d}"/>
      </svg>
    </div>
    <svg class="boot-word" viewBox="{wvb}" fill="currentColor" focusable="false">{letters}</svg>
  </div>
</div>
<!-- boot:end -->"""


idx = ROOT / "index.html"
html = idx.read_text(encoding="utf-8")
html = BOOT_RE.sub(lambda _: boot_block(), html)
idx.write_text(html, encoding="utf-8")

files = sorted([*ROOT.glob("js/**/*.js"), ROOT / "css/app.css", ROOT / "index.html", ROOT / "manifest.webmanifest"])
h = hashlib.sha1()
for f in files:
    h.update(re.sub(rb"\?v=[0-9a-f]+", b"", f.read_bytes()))
stamp = h.hexdigest()[:10]

sw = ROOT / "sw.js"
sw.write_text(re.sub(r'const VERSION = "kai-[^"]+";', f'const VERSION = "kai-{stamp}";', sw.read_text()))
html = idx.read_text(encoding="utf-8")
html = re.sub(r'css/app\.css(\?v=[0-9a-f]+)?', f"css/app.css?v={stamp}", html)
html = re.sub(r'js/app\.js(\?v=[0-9a-f]+)?', f"js/app.js?v={stamp}", html)
idx.write_text(html, encoding="utf-8")
print(f"build {stamp}: opening inlined, sw VERSION + index query strings stamped ({len(files)} files hashed)")
