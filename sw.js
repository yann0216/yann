/* yann² service worker
   - 页面(HTML)：联网优先，重新部署后一刷新就是新版；断网时回落到缓存
   - 图标/清单等静态资源：缓存优先
   - 每次发版只需把 CACHE 版本号 +1
*/
const CACHE = 'yann-v77';
const ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

const put = (req, res) => {
  if (res && res.status === 200 && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
};

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const accept = req.headers.get('accept') || '';
  const isDoc = req.mode === 'navigate' || accept.includes('text/html');

  if (isDoc) {
    /* 联网优先：有新版本立刻拿到 */
    e.respondWith(
      fetch(req).then(res => put(req, res)).catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* 静态资源：缓存优先 */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => put(req, res))
        .catch(() => caches.match('./index.html'));
    })
  );
});
