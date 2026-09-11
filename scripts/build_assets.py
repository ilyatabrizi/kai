#!/usr/bin/env python3
"""Turn KAI's own material into the files the app ships.

Sources (never committed — too big, and they are the client's originals):
  ~/Projects/KAI COFFEE CO/            the "&" mark, 12 Instagram frames, the reel
  scratch kai_dl/                      what kaicoffeeco.com serves: 123 product
                                       cut-outs, 8 branch covers, the pattern

Outputs (committed):
  assets/brand/mark.svg + js/brand.js  the ampersand, traced to vector
  assets/icons/*.png                   PWA icons (any + maskable) and apple-touch
  assets/items/<id>.webp               560px product cut-outs, alpha kept
  assets/branches/<slug>.webp          4:5 crops of the branch covers, caption band removed
  assets/photos/<slug>.webp            the Instagram frames, ≤1200px
  assets/video/hero.mp4 + poster.webp  the reel, as supplied, and its first frame

    python3 scripts/build_assets.py
"""
import json
import pathlib
import shutil
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path.home() / "Projects" / "KAI COFFEE CO"
DL = pathlib.Path([a for a in sys.argv[1:] if a.startswith("/")][0]) if any(a.startswith("/") for a in sys.argv[1:]) else pathlib.Path(
    "/private/tmp/claude-501/-Users-ilya-Claude-Code/58563e94-49e6-4174-9fd0-62223d75ea3e/scratchpad/kai_dl")
POSTER_FRAME = DL.parent / "vid" / "f0.2.png"

INK = (23, 21, 15)          # --ink
ICON_BG = (247, 240, 228)   # warm cream tile behind the mark on the home screen

EPSILON = 1.4
sys.setrecursionlimit(100000)


# ---------------------------------------------------------------- tracing
def components(mask):
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    blobs = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sx, sy)]
            seen[sy, sx] = True
            cells = []
            while stack:
                x, y = stack.pop()
                cells.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny, nx] and mask[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((nx, ny))
            if len(cells) > 40:
                blobs.append(cells)
    return blobs


def trace_outline(cells):
    """Closed rings along the unit cracks between ink and space, interior kept
    on one side, chained head to tail. Exact on thin diagonal pinches."""
    cellset = set(cells)
    edges = {}
    for x, y in cells:
        if (x, y - 1) not in cellset:
            edges.setdefault((x, y), []).append((x + 1, y))
        if (x + 1, y) not in cellset:
            edges.setdefault((x + 1, y), []).append((x + 1, y + 1))
        if (x, y + 1) not in cellset:
            edges.setdefault((x + 1, y + 1), []).append((x, y + 1))
        if (x - 1, y) not in cellset:
            edges.setdefault((x, y + 1), []).append((x, y))
    rings = []
    while edges:
        start = next(iter(edges))
        ring, node = [start], start
        while True:
            outs = edges.get(node)
            if not outs:
                break
            nxt = outs.pop()
            if not outs:
                del edges[node]
            if nxt == start:
                break
            ring.append(nxt)
            node = nxt
        if len(ring) >= 8:
            rings.append(ring)
    return rings


def _rdp_open(pts, eps):
    if len(pts) < 3:
        return pts
    x1, y1 = pts[0]
    x2, y2 = pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5
    worst, idx = -1.0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        dist = (((px - x1) ** 2 + (py - y1) ** 2) ** 0.5 if norm < 1e-9
                else abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm)
        if dist > worst:
            worst, idx = dist, i
    if worst > eps:
        return _rdp_open(pts[:idx + 1], eps)[:-1] + _rdp_open(pts[idx:], eps)
    return [pts[0], pts[-1]]


def rdp(ring, eps):
    if len(ring) < 6:
        return ring
    far = max(range(len(ring)),
              key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)
    return _rdp_open(ring[:far + 1], eps)[:-1] + _rdp_open(ring[far:] + [ring[0]], eps)[:-1]


def smooth(ring, rounds=1):
    for _ in range(rounds):
        out = []
        n = len(ring)
        for i in range(n):
            (x0, y0), (x1, y1) = ring[i], ring[(i + 1) % n]
            out.append((x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25))
            out.append((x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75))
        ring = out
    return ring


def to_path(rings, scale, ox, oy, prec=1):
    out = []
    for ring in rings:
        if len(ring) < 4:
            continue
        p = [((x - ox) * scale, (y - oy) * scale) for x, y in ring]
        n = len(p)
        mid = lambda i: (((p[i][0] + p[(i + 1) % n][0]) / 2), ((p[i][1] + p[(i + 1) % n][1]) / 2))
        sx, sy = mid(0)
        d = f"M{sx:.{prec}f} {sy:.{prec}f}"
        for i in range(1, n + 1):
            cx, cy = p[i % n]
            mx, my = mid(i % n)
            d += f"Q{cx:.{prec}f} {cy:.{prec}f} {mx:.{prec}f} {my:.{prec}f}"
        out.append(d + "Z")
    return "".join(out)


def trace_mark():
    src = next(SRC.glob("ChatGPT Image*.png"))
    im = Image.open(src).convert("RGBA")
    work_w = 900
    im = im.resize((work_w, round(im.height * work_w / im.width)), Image.LANCZOS)
    a = np.asarray(im)
    mask = (a[..., 3] > 128) & (a[..., :3].sum(axis=2) < 3 * 140)
    blobs = components(mask)
    blobs.sort(key=len, reverse=True)
    blob = blobs[0]
    xs = [x for x, _ in blob]; ys = [y for _, y in blob]
    ox, oy, mx, my = min(xs), min(ys), max(xs), max(ys)
    w, h = mx - ox + 1, my - oy + 1
    s = 1000 / w
    rings = [rdp(smooth(rdp(r, EPSILON)), EPSILON * 0.3) for r in trace_outline(blob)]
    d = to_path(rings, s, ox, oy)
    vh = h * s
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 {vh:.1f}" '
           f'fill="currentColor" role="img" aria-label="KAI"><path fill-rule="evenodd" d="{d}"/></svg>\n')
    out = ROOT / "assets" / "brand" / "mark.svg"
    out.write_text(svg, encoding="utf-8")
    (ROOT / "js" / "brand.js").write_text(
        "// Generated by scripts/build_assets.py — the ampersand, traced from the client's PNG.\n"
        "// One evenodd path: the outer edge and the two counters.\n"
        f"export const MARK_VIEWBOX = \"0 0 1000 {vh:.1f}\";\n"
        f"export const MARK_PATH = \"{d}\";\n"
        "export const MARK = `<svg viewBox=\"${MARK_VIEWBOX}\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\">"
        "<path fill-rule=\"evenodd\" d=\"${MARK_PATH}\"/></svg>`;\n", encoding="utf-8")
    print(f"  mark: {len(blobs)} blobs, {len(rings)} rings, {sum(len(r) for r in rings)} points, "
          f"{out.stat().st_size / 1024:.1f} KB, aspect {w}/{h}={w / h:.3f}")
    return im  # the alpha at work size, for the icons


# ------------------------------------------------------------------ icons
def icons(mark_im):
    out = ROOT / "assets" / "icons"
    out.mkdir(parents=True, exist_ok=True)
    alpha = mark_im.split()[3]
    bbox = alpha.getbbox()
    glyph = alpha.crop(bbox)

    def tile(size, fill_ratio, bg, ink, name, rounded=False):
        canvas = Image.new("RGBA", (size, size), bg + (255,))
        gw, gh = glyph.size
        scale = size * fill_ratio / max(gw, gh)
        g = glyph.resize((max(1, round(gw * scale)), max(1, round(gh * scale))), Image.LANCZOS)
        ink_layer = Image.new("RGBA", g.size, ink + (255,))
        # optical centre: the ampersand's mass sits low-left, nudge it a touch
        px = (size - g.width) // 2
        py = (size - g.height) // 2 - round(size * 0.01)
        canvas.paste(ink_layer, (px, py), g)
        if rounded:
            # apple-touch-icon gets its corners from iOS; nothing to do
            pass
        canvas.convert("RGB").save(out / name, optimize=True)

    tile(512, 0.70, ICON_BG, INK, "icon-512.png")
    tile(192, 0.70, ICON_BG, INK, "icon-192.png")
    tile(512, 0.56, ICON_BG, INK, "maskable-512.png")   # safe zone is the inner 80%
    tile(180, 0.70, ICON_BG, INK, "apple-touch-icon.png")
    # favicon: the mark alone, transparent
    fav = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    g = glyph.resize((52, round(52 * glyph.height / glyph.width)), Image.LANCZOS)
    fav.paste(Image.new("RGBA", g.size, INK + (255,)), ((64 - g.width) // 2, (64 - g.height) // 2), g)
    fav.save(out / "favicon.png", optimize=True)
    print("  icons: 512, 192, maskable, apple-touch, favicon")


# ------------------------------------------------------------------ items
def items():
    data = json.loads((ROOT / "scripts" / "cache" / "kai_menu.json").read_text(encoding="utf-8"))
    out = ROOT / "assets" / "items"
    out.mkdir(parents=True, exist_ok=True)
    total = 0
    for it in data["items"]:
        src = DL / it["image"].lstrip("/")
        im = Image.open(src).convert("RGBA")
        # The renders carry a wide, soft cast shadow (alpha < 96) that would keep the
        # cup small in its tile. Frame the object itself, keep a margin, and feather
        # the alpha at the crop edge so whatever shadow is cut fades instead of ending.
        a = np.asarray(im)[..., 3]
        ys, xs = np.where(a > 96)
        if len(xs):
            x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            pad = round(max(x1 - x0, y1 - y0) * 0.07)
            box = (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad))
            im = im.crop(box)
            arr = np.asarray(im).copy()
            h, w = arr.shape[:2]
            f = max(2, round(min(w, h) * 0.06))
            ramp = np.linspace(0, 1, f)
            mask = np.ones((h, w), dtype=float)
            mask[:f, :] *= ramp[:, None]; mask[-f:, :] *= ramp[::-1][:, None]
            mask[:, :f] *= ramp[None, :]; mask[:, -f:] *= ramp[::-1][None, :]
            arr[..., 3] = (arr[..., 3] * mask).astype(np.uint8)
            im = Image.fromarray(arr)
        side = max(im.size)
        sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
        sq = sq.resize((560, 560), Image.LANCZOS)
        dest = out / f"{it['id']}.webp"
        sq.save(dest, "WEBP", quality=80, method=6)
        total += dest.stat().st_size
    print(f"  items: {len(data['items'])} cut-outs, {total / 1024:.0f} KB total")


# --------------------------------------------------------------- branches
def branches():
    out = ROOT / "assets" / "branches"
    out.mkdir(parents=True, exist_ok=True)
    for cover in sorted((DL / "images" / "kai" / "branches").glob("*/cover.jpeg")):
        slug = cover.parent.name
        im = Image.open(cover).convert("RGB")
        w, h = im.size                              # 2250 x 4000
        # The caption band ("شعبه ونک" + the address) is burnt into the top ~18%.
        # Our cards set their own type, so take the building below it, 4:5.
        top = round(h * 0.20)
        crop_h = round(w * 5 / 4)
        top = min(top, h - crop_h)
        im = im.crop((0, top, w, top + crop_h)).resize((720, 900), Image.LANCZOS)
        im.save(out / f"{slug}.webp", "WEBP", quality=80, method=6)
    print(f"  branches: {len(list(out.glob('*.webp')))} covers")


# ----------------------------------------------------------------- photos
PHOTOS = {
    "15.49.33": "storefront-day",
    "15.50.07": "storefront-night",
    "15.50.28": "poster-jellygato",
    "15.50.40": "jellygato-cubes",
    "15.50.49": "espresso-pour",
    "15.51.24": "frappe-pastry",
    "15.51.32": "croissant",
    "15.51.52": "padel",
    "15.52.02": "tennis",
    "15.52.10": "basketball",
    "15.54.21": "crunchy-flakes",
    "15.54.43": "poster-toasts",
}


def photos():
    out = ROOT / "assets" / "photos"
    out.mkdir(parents=True, exist_ok=True)
    total = 0
    for src in sorted(SRC.glob("Screenshot*.png")):
        key = src.stem.split(" at ")[-1]
        slug = PHOTOS.get(key)
        if not slug:
            print("  ! unmapped", src.name)
            continue
        im = Image.open(src).convert("RGB")
        im.thumbnail((1200, 1200), Image.LANCZOS)
        dest = out / f"{slug}.webp"
        im.save(dest, "WEBP", quality=82, method=6)
        total += dest.stat().st_size
    print(f"  photos: {len(list(out.glob('*.webp')))} frames, {total / 1024:.0f} KB")


# ------------------------------------------------------------------ video
def video():
    out = ROOT / "assets" / "video"
    out.mkdir(parents=True, exist_ok=True)
    src = next(SRC.glob("*.mp4"))
    shutil.copyfile(src, out / "hero.mp4")
    im = Image.open(POSTER_FRAME).convert("RGB")
    im.save(out / "poster.webp", "WEBP", quality=78, method=6)
    print(f"  video: {(out / 'hero.mp4').stat().st_size / 1e6:.2f} MB, poster {(out / 'poster.webp').stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    only = [a for a in sys.argv[1:] if not a.startswith("/")]
    if only:
        for step in only:
            {"mark": lambda: icons(trace_mark()), "items": items, "branches": branches, "photos": photos, "video": video}[step]()
    else:
        icons(trace_mark())
        items()
        branches()
        photos()
        video()
