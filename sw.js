/* Service worker — caches the app shell for offline play.
   (The Babylon.js CDN is cross-origin/opaque and not cached here.) */
const CACHE = "wotf-v1";
const SHELL = [
  "./", "./index.html", "./styles.css", "./manifest.json", "./icon.svg",
  "./src/art.js", "./src/audio.js", "./src/lowpoly.js", "./src/world.js", "./src/game.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // let CDN requests pass through
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
