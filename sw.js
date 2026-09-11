// Offline shell.
//
// Everything the app is made of — the HTML, the CSS, every module, the manifest —
// goes to the network first, with `cache: "reload"` so the request reaches the
// origin rather than the browser's own HTTP cache (GitHub Pages sends max-age=600
// on pages, and a worker's plain fetch() would honour it). A redeploy changes the
// shell and the code together, and half a build is worse than an old one.
//
// Fonts, the mark, the photographs and the product cut-outs change name when they
// change at all, so they are cache-first and precached on install.
//
// clients.claim() runs only when this worker REPLACES an older one. On a cold
// install the page keeps the network it started with — claiming mid-flight hands
// the new worker every in-flight image request, and they fail.

const VERSION = "kai-d9992407d9";
const DEV = ["localhost", "127.0.0.1"].includes(location.hostname);
const MARKER = "./__installed__";

const SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./css/app.css",
  "./js/app.js", "./js/boot.js", "./js/brand.js", "./js/config.js", "./js/data.js", "./js/icons.js",
  "./js/install.js", "./js/motion.js", "./js/presence.js", "./js/qr.js", "./js/router.js",
  "./js/store.js", "./js/ui.js", "./js/util.js", "./js/theme.js", "./js/jalali.js", "./js/wordmark.js",
  "./js/photo.js", "./js/dial.js", "./js/views/profile-edit.js",
  "./js/views/home.js", "./js/views/menu.js", "./js/views/bag.js", "./js/views/order.js",
  "./js/views/checkin.js", "./js/views/branches.js", "./js/views/profile.js",
];
const ASSETS = [
  "./assets/fonts/bodoni.woff2", "./assets/fonts/bodoni-italic.woff2",
  "./assets/fonts/IRANYekanXFaNum-Regular.woff2", "./assets/fonts/IRANYekanXFaNum-Medium.woff2",
  "./assets/fonts/IRANYekanXFaNum-DemiBold.woff2", "./assets/fonts/IRANYekanXFaNum-Bold.woff2",
  "./assets/brand/mark.svg", "./assets/brand/pattern.svg", "./assets/brand/alpha-black.png", "./assets/brand/alpha-white.png",
  "./assets/icons/icon-192.png", "./assets/icons/apple-touch-icon.png",
  "./assets/video/poster.webp",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const had = (await caches.keys()).some((k) => k.startsWith("kai-") && k !== VERSION);
    const cache = await caches.open(VERSION);
    await Promise.allSettled([...SHELL, ...ASSETS].map((url) => cache.add(url)));
    // record whether this is an update or a first install, in the cache itself —
    // install and activate need not share a worker instance
    await cache.put(MARKER, new Response(had ? "update" : "cold"));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    const cache = await caches.open(VERSION);
    const marker = await cache.match(MARKER);
    const kind = marker ? await marker.text() : "cold";
    if (kind === "update") await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith("/__installed__")) return;

  const fromNetwork = (req) => fetch(new Request(req, { cache: "reload" }));

  const networkFirst = async () => {
    try {
      const res = await fromNetwork(request);
      if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
      return res;
    } catch {
      const hit = (await caches.match(request))
        || (request.mode === "navigate" ? await caches.match("./index.html") : null);
      return hit || Response.error();
    }
  };

  if (request.mode === "navigate" || DEV || /\.(?:html|css|js|webmanifest)$/.test(url.pathname)) {
    e.respondWith(networkFirst());
    return;
  }
  // the reel streams with Range requests; leave it to the browser
  if (/\.mp4$/.test(url.pathname)) return;

  e.respondWith((async () => {
    const hit = await caches.match(request);
    if (hit) return hit;
    try {
      const res = await fetch(request);
      if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
      return res;
    } catch { return Response.error(); }
  })());
});
