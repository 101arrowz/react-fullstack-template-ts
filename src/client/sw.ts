// Unfortunately TypeScript service worker support is not very clean, so this is necessary for proper typings
/// <reference no-default-lib="true" />
/// <reference lib="es7" />
/// <reference lib="webworker" />
type SW = ServiceWorkerGlobalScope & {
  __precacheManifest: {
    files: Array<string>;
    ver: string;
  };
};
const sw = (self as unknown) as SW;

const { ver: currentCacheVer, files: precacheFiles } = sw.__precacheManifest;
const cache = (): Promise<Cache> => caches.open(currentCacheVer);
sw.addEventListener('install', e => {
  e.waitUntil(
    cache()
      .then(c => c.addAll(precacheFiles))
      .then(() => sw.skipWaiting())
  );
});
sw.addEventListener('activate', e => {
  sw.clients.claim();
  e.waitUntil(async () => {
    await caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(ver => ver !== currentCacheVer)
            .map(cacheName => caches.delete(cacheName))
        )
      );
  });
});

sw.addEventListener('fetch', e => {
  e.respondWith(
    cache().then(async cache => {
      const res = await cache.match(e.request);
      if (res) return res;
      const freshRes = await fetch(e.request);
      cache.put(e.request, freshRes.clone());
      return freshRes;
    })
  );
});
