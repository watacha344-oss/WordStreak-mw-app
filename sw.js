// 更新したら、この番号を v2, v3 ... と上げてください
const CACHE_NAME = "wordstreak-cache-v3";
const FILES_TO_CACHE = [
  "./index.html",
  "./manifest.json",
  "./words-data.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(FILES_TO_CACHE.map((url) =>
        fetch(new Request(url, { cache: "reload" })).then((res) => {
          if (!res.ok) throw new Error(url + " " + res.status);
          return cache.put(url, res);
        })
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // ページ本体は「ネット優先」(常に最新を取得。圏外ならキャッシュ)
  if (req.mode === "navigate" || (sameOrigin && url.pathname.endsWith("/index.html"))) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // それ以外(アイコン・フォントなど)は「キャッシュ優先」
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
