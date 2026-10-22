/* DuoDay — service worker do app web (PWA). Gerado em `npm run build:web`. */
/* global self, caches, clients */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL = `duoday-shell-${VERSION}`;
const ASSETS = 'duoday-assets';
const INDEX = '/index.html';

// Instala a versão nova já com tudo o que a abertura precisa (abre sem rede).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('duoday-shell-') && k !== SHELL).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isImmutable = (path) =>
  path.startsWith('/_expo/static/') || path.startsWith('/assets/') || path.startsWith('/icons/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // servidor (Supabase) nunca passa pelo cache

  // Telas do app: a casca guardada abre na hora; a atualização chega na próxima abertura.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(INDEX).then((cached) => cached || fetch(request).catch(() => caches.match(INDEX))),
    );
    return;
  }

  // Arquivos com hash no nome nunca mudam: cache primeiro.
  if (isImmutable(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSETS).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});

// Lembretes e avisos enviados pelo servidor (Web Push).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'DuoDay';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { href: typeof data.href === 'string' && data.href.startsWith('/') ? data.href : '/' },
    }),
  );
});

// Toque na notificação: volta para o app aberto (ou abre) já na tela certa.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        open.postMessage({ type: 'navigate', href });
        return open.focus();
      }
      return clients.openWindow(href);
    }),
  );
});
