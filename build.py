#!/usr/bin/env python3
"""Stamp the build: content-hash the shell files into the service-worker version
and the stylesheet/module query strings, so a returning visitor never runs a stale
mix. Run before every deploy.

    python3 build.py
"""
import hashlib, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent
files = sorted([*ROOT.glob("js/**/*.js"), ROOT / "css/app.css", ROOT / "index.html", ROOT / "manifest.webmanifest"])
h = hashlib.sha1()
for f in files:
    if f.name == "sw.js":
        continue
    h.update(f.read_bytes())
stamp = h.hexdigest()[:10]

sw = ROOT / "sw.js"
s = sw.read_text()
s2 = re.sub(r'const VERSION = "kai-[^"]+";', f'const VERSION = "kai-{stamp}";', s)
sw.write_text(s2)

idx = ROOT / "index.html"
t = idx.read_text()
t2 = re.sub(r'css/app\.css(\?v=[0-9a-f]+)?', f"css/app.css?v={stamp}", t)
t2 = re.sub(r'js/app\.js(\?v=[0-9a-f]+)?', f"js/app.js?v={stamp}", t2)
idx.write_text(t2)
print(f"build {stamp}: sw VERSION + index query strings stamped ({len(files)} files hashed)")
