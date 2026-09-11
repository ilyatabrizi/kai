#!/usr/bin/env python3
"""Stamp the build. Run before every deploy.

1. Inline the opening screen into index.html — their logo, the ampersand
   (js/brand.js) over the wordmark (js/wordmark.js), still — so it paints with
   the first byte instead of waiting for the modules.
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
    """Their logo, still: the ampersand over the wordmark. Nothing moves; the screen
    fades once the page behind it is ready (js/boot.js)."""
    brand = (ROOT / "js/brand.js").read_text(encoding="utf-8")
    vb = re.search(r'MARK_VIEWBOX = "([^"]+)"', brand).group(1)
    d = re.search(r'MARK_PATH = "([^"]+)"', brand).group(1)
    wm = (ROOT / "js/wordmark.js").read_text(encoding="utf-8")
    wvb = re.search(r'WORDMARK_VIEWBOX = "([^"]+)"', wm).group(1)
    letters = re.search(r"WORDMARK_INNER = `(.*?)`;", wm, re.S).group(1)
    return f"""<!-- boot:start -->
<div id="boot" aria-hidden="true">
  <div class="boot-logo">
    <svg class="boot-mark" viewBox="{vb}" fill="currentColor" focusable="false"><path fill-rule="evenodd" d="{d}"/></svg>
    <svg class="boot-word" viewBox="{wvb}" fill="currentColor" focusable="false">{letters}</svg>
  </div>
</div>
<!-- boot:end -->"""


PRELOAD_RE = re.compile(r"<!-- preload:start -->.*?<!-- preload:end -->", re.S)


def preload_block():
    """Every module, announced up front. ES imports are otherwise found one level at a
    time — app.js, then the views, then what they import — one round trip per level,
    which from Tehran to GitHub Pages is most of the opening screen's wait."""
    mods = sorted(p.relative_to(ROOT).as_posix() for p in ROOT.glob("js/**/*.js") if p.name != "app.js")
    links = "\n".join(f'<link rel="modulepreload" href="{m}">' for m in mods)
    return f"<!-- preload:start -->\n{links}\n<!-- preload:end -->"


idx = ROOT / "index.html"
html = idx.read_text(encoding="utf-8")
html = BOOT_RE.sub(lambda _: boot_block(), html)
if "<!-- preload:start -->" not in html:
    html = html.replace('<script type="module" src="js/app.js', '<!-- preload:start -->\n<!-- preload:end -->\n<script type="module" src="js/app.js', 1)
html = PRELOAD_RE.sub(lambda _: preload_block(), html)
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
print(f"build {stamp}: logo inlined, sw VERSION + index query strings stamped ({len(files)} files hashed)")
