# KAI Coffee — PWA preview

A working, installable preview of a KAI Coffee app: the card, one-tap ordering
to a counter code, the KAI Loyalty leagues with cashback, check-in with who's at
which branch, and the eight branches with their own addresses and map links.
Built by Alpha Agency on KAI's own material.

- Live: https://ilyatabrizi.github.io/kai/
- Local: `python3 serve.py` → http://localhost:8161 (add `?nosw` to bypass the offline cache)
- Checks: `python3 e2e.py [url]` — 130 Playwright checks through the system Chrome, works against the live URL

## What is KAI's, what is ours

**KAI's (from kaicoffeeco.com, fetched 2026-09-11):** the 9 categories and 112
visible menu items with their English and Persian names, Toman prices,
ingredients and "new" badges (11 seasonal items their site hides are hidden here
too); the 8 branches, their Persian addresses, Google Maps links, open /
coming-soon status and the central line 021 9101 0701; the five loyalty leagues
with their point thresholds and cashback rates (Stranger 7 % → Friend 12 % →
Close Friend 15 % → Best Friend 17 % → Legend 22 %); the product cut-outs, the
branch illustrations, the brand pattern; the tagline "Your comfort zone", the
about copy in both languages. From the folder Ilya supplied: the ampersand,
twelve Instagram frames, the Fluffies reel.

**Ours, and labelled as preview in the UI:** the points rule (1 point per
1,000 Toman — their site says points accrue per purchase but not at what rate),
the sample account (15 sample orders over three months so the ladder can be seen
moving; one tap clears it), the demo check-in roster, the 12-minute "being made"
countdown, the order codes. Nothing else is invented.

## Map

```
index.html            shell: bar, view, dock, five glass tabs, sheet and toast roots
css/app.css           the design system — tokens, type, glass, every component
js/app.js             wiring: routes, bars, pill, dock, chip, scroll chrome, boot, SW
js/router.js          hash router; fresh screen node per render, refresh() for same-hash
js/config.js          business facts + the preview assumptions, in one place
js/data.js            GENERATED — categories, items, branches, leagues
js/store.js           bag, profile, orders, loyalty account, sample seed (localStorage)
js/presence.js        per-branch check-in, one-hour hold, clock-derived demo roster
js/ui.js              toast, qty, one-tap add, sheet, item sheet, branch sheet, images
js/views/*.js         home, menu, bag, order, checkin, branches, profile
js/qr.js              byte-mode QR encoder (Alpha's, from Code Concept)
js/brand.js           GENERATED — the ampersand as an SVG path
sw.js                 network-first shell, cache-first assets, claim only on update
build.py              stamps sw VERSION + ?v= from a content hash — run before deploy
scripts/build_assets.py   traces the mark, cuts out products, crops covers, converts photos
scripts/build_data.py     scripts/cache/kai_menu.json → js/data.js
scripts/smoke.py, flow.py quick screenshot passes; e2e.py is the real suite
```

## Design

Cream paper (#FCF7F1, KAI's own), ink type, sage for what is alive. Apple's
grammar: large titles that collapse into the bar, inset grouped lists, pills,
sheets with a grabber, a glass tab bar (62 px, 26 px radius, sliding ink pill)
that floats over everything. One serif — Bodoni Moda, close to the poster type —
for the few words that speak; the system sans for everything that works; Persian
glosses in IRANYekanX FaNum. Light only: the brand is paper.

The hero is their reel, full-bleed on a phone and inside a phone frame beside the
headline on a desktop. Autoplay is muted; where it is refused (Low Power Mode)
the poster stays and nothing looks broken.

## Check-in

Device-local by default. `CHECKIN.endpoint` in `js/config.js` is the switch to a
shared room: the same six calls (`list(branch)`, `counts()`, `me()`,
`checkIn({branchId, name})`, `extend()`, `checkOut()`) go to the service and no
view changes. Set `CHECKIN.demo = false` at the same time. A check-in is
`{id, name, at, until, branch}` and expires after `holdMinutes`.

## Deploy

```
python3 build.py && python3 e2e.py
git add -A && git commit -m "…" && git push
python3 e2e.py https://ilyatabrizi.github.io/kai/
```

GitHub Pages serves `main` from the root. The first load after a deploy is served
by the previous worker; the second load is current.

## Open items

- Language: English UI with Persian glosses. Their own site is Persian-first; a
  full Persian mode would need every string in `js/views` mirrored and `dir="rtl"`.
- Points rate, order flow and pickup are preview mechanics — confirm with KAI.
- Royan has its own price list on their site; this build shows the Tehran card everywhere.
- Opening hours are not published on kaicoffeeco.com, so none are shown.
- The reel is served as supplied (3.5 MB, 720×1280); a 480p variant would help on slow data.
