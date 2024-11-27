const cacheName = 'audio-cache-v1';

async function tryRespondFromCache(request) {
  // открываем кеш
  const cache = await caches.open(cacheName);

  // ищем кеш для URL
  const url = request.url;
  const isMedia = url.endsWith('.jpg') || url.endsWith('.mp3') || url.endsWith('.flac');
  if (!isMedia) {
    console.log('No media', url);
    return false;
  }

  const cachedResponse = await cache.match(url, { ignoreSearch: true, ignoreVary: true });
  if (!cachedResponse) {
    console.log('БЕЗ КЕША', url);
    return false;
  }

  // обрабатываем Range
  const range = request.headers.get('range');
  let rangeTotal = 0;
  let rangeStart = 0;
  let rangeEnd = 0;

  if (range === null) {
    console.log('Из кеша без Range', url);
    return cachedResponse;
  }

  const rangeParts = /^bytes=(\d*)-(\d*)$/gi.exec(range);
  if (rangeParts[1] === '' && rangeParts[2] === '') {
    console.log('Из кеша пустой Range', url);
    return cachedResponse;
  }

  console.log('Range из кеша', url, rangeStart, rangeEnd);
  const buffer = await cachedResponse.arrayBuffer();
  rangeStart = Number(rangeParts[1]);
  rangeEnd = Number(rangeParts[2]);
  rangeTotal = buffer.byteLength;
  if (rangeParts[1] === '') {
    rangeStart = rangeTotal - rangeEnd;
    rangeEnd = rangeTotal - 1;
  }
  if (rangeParts[2] === '') {
    rangeEnd = rangeTotal - 1;
  }
  let headers = new Headers();
  for (let [k, v] of cachedResponse.headers) {
    headers.set(k, v);
  }
  headers.set('Content-Range', `bytes ${rangeStart}-${rangeEnd}/${rangeTotal}`);
  headers.set('Content-Length', rangeEnd - rangeStart + 1);
  return new Response(buffer.slice(rangeStart, rangeEnd + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: headers
  });
}

self.addEventListener('install', (event) => {
  const urlsToPrefetch = [];
  console.log('Handling install event. Resources to prefetch:', urlsToPrefetch);
  self.skipWaiting();
  event.waitUntil(
    caches.open(cacheName).then(function (cache) {
      return cache.addAll(urlsToPrefetch);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const response = tryRespondFromCache(event.request);
  response && event.waitUntil(response);
});

console.log('Hello from SW!!!');
