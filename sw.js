/* ShadowDraw offline service worker — caches the whole app (including the hand-tracking model) on first visit */
const VERSION = 'shadowdraw-v1.0.2';
const FILES = [
  "./",
  "css/app.css",
  "icons/icon-192.png",
  "icons/icon-256.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "index.html",
  "js/audio.js",
  "js/main.js",
  "js/modes/color.js",
  "js/modes/draw.js",
  "js/modes/gallery.js",
  "js/modes/games.js",
  "js/modes/music.js",
  "js/modes/parents.js",
  "js/modes/stickers.js",
  "js/modes/trace.js",
  "js/pages.js",
  "js/settings.js",
  "js/store.js",
  "js/tracker.js",
  "js/ui.js",
  "js/util.js",
  "manifest.webmanifest",
  "vendor/fonts/baloo-2-latin-600-normal.woff2",
  "vendor/fonts/baloo-2-latin-800-normal.woff2",
  "vendor/fonts/noto-naskh-arabic-arabic-500-normal.woff2",
  "vendor/fonts/noto-naskh-arabic-arabic-700-normal.woff2",
  "vendor/mediapipe-hands/hand_landmark_full.tflite",
  "vendor/mediapipe-hands/hand_landmark_lite.tflite",
  "vendor/mediapipe-hands/hands.binarypb",
  "vendor/mediapipe-hands/hands.js",
  "vendor/mediapipe-hands/hands_solution_packed_assets.data",
  "vendor/mediapipe-hands/hands_solution_packed_assets_loader.js",
  "vendor/mediapipe-hands/hands_solution_simd_wasm_bin.js",
  "vendor/mediapipe-hands/hands_solution_simd_wasm_bin.wasm",
  "vendor/mediapipe-hands/hands_solution_wasm_bin.js",
  "vendor/mediapipe-hands/hands_solution_wasm_bin.wasm",
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
