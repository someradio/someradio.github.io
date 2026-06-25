const CACHE_NAME = 'audio-cache-v2';
const MAX_CACHE_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const MEDIA_EXTS = /\.(mp3|flac|ogg|wav|aac|m4a|jpg|jpeg|png|webp)$/i;

/* self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (!MEDIA_EXTS.test(url)) return;

  event.respondWith(handleMediaRequest(event.request));
}); */

async function handleMediaRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });

  if (cached) {
    return serveRange(request, cached);
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

function serveRange(request, cachedResponse) {
  const range = request.headers.get('range');
  if (!range) return cachedResponse;

  const match = /^bytes=(\d*)-(\d*)$/i.exec(range);
  if (!match) return cachedResponse;

  return cachedResponse.arrayBuffer().then((buffer) => {
    const total = buffer.byteLength;
    let start = match[1] ? Number(match[1]) : total - Number(match[2]);
    let end = match[2] ? Number(match[2]) : total - 1;
    if (start > end) start = end;

    const headers = new Headers();
    for (const [k, v] of cachedResponse.headers) headers.set(k, v);
    headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
    headers.set('Content-Length', end - start + 1);
    headers.set('Accept-Ranges', 'bytes');

    return new Response(buffer.slice(start, end + 1), {
      status: 206,
      statusText: 'Partial Content',
      headers
    });
  });
}

// Periodic cache cleanup
setInterval(async () => {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let size = 0;
  for (const req of keys) {
    const resp = await cache.match(req);
    if (resp) {
      const blob = await resp.blob();
      size += blob.size;
    }
  }
  if (size > 500 * 1024 * 1024) {
    // Remove oldest entries when over 500MB
    const toDelete = keys.slice(0, Math.floor(keys.length * 0.3));
    for (const req of toDelete) {
      await cache.delete(req);
    }
  }
}, 60 * 60 * 1000);
