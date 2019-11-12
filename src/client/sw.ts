// Unfortunately TypeScript service worker support is not very clean, so this is necessary for proper typings
/// <reference no-default-lib="true" />
/// <reference lib="es7" />
/// <reference lib="webworker" />
import { ResponseErrors } from '../common/apiTypes';
type SW = ServiceWorkerGlobalScope & {
  __precacheManifest: {
    files: Array<string>;
    ver: string;
  };
};
const sw = (self as unknown) as SW;

const { ver: currentCacheVer, files: precacheFiles } = sw.__precacheManifest;
const cache = (): Promise<Cache> => caches.open(currentCacheVer);
type Responder = 'networkFirst' | 'cacheFirst';
const responders: {
  [k in Responder]: (event: FetchEvent, cache: Cache) => Promise<Response>;
} = {
  async networkFirst(e, cache) {
    try {
      const freshRes = await fetch(e.request);
      if (e.request.method === 'GET') cache.put(e.request, freshRes.clone());
      return freshRes;
    } catch (e) {
      const res = await cache.match(e.request);
      if (res) return res;
      return new Response(JSON.stringify(ResponseErrors.OFFLINE));
    }
  },
  async cacheFirst(e, cache) {
    const res = await cache.match(e.request);
    if (res) return res;
    try {
      const freshRes = await fetch(e.request);
      if (e.request.method === 'GET') cache.put(e.request, freshRes.clone());
      return freshRes;
    } catch (e) {
      return new Response(JSON.stringify(ResponseErrors.OFFLINE));
    }
  }
};
const methodSelectors: [RegExp | ((url: string) => boolean), Responder][] = [
  [/\/api\//, 'networkFirst']
];
const selectMethod = (
  url: string,
  fallback: Responder = 'cacheFirst'
): Responder => {
  for (const selector of methodSelectors)
    if (
      (selector[0] instanceof RegExp && selector[0].test(url)) ||
      (typeof selector[0] === 'function' && selector[0](url))
    )
      return selector[1];
  return fallback;
};

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
  const responder = (cache: Cache): Promise<Response> =>
    responders[selectMethod(e.request.url)](e, cache);
  e.respondWith(cache().then(responder));
});
