/* Service worker de EcoAlerta: permite abrir la app sin conexión.
   - Archivos propios: primero la red (para ver datos actualizados) y, si falla, la copia guardada.
   - Librerías y fuentes externas: copia guardada y actualización en segundo plano.
   - Mosaicos del mapa: siempre de la red (sin conexión el mapa queda gris, pero la lista de lugares sigue funcionando).
   Al cambiar archivos de la app, subir el número de VERSION para renovar la copia guardada. */

const VERSION = 'ecoalerta-v2';

const ARCHIVOS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'data/localidades.json',
  'data/tornquist.json',
  'data/demo.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname.endsWith('tile.openstreetmap.org')) return;

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(VERSION).then((c) => c.put(req, copia));
          return resp;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
    return;
  }

  e.respondWith(
    caches.open(VERSION).then((c) =>
      c.match(req).then((guardada) => {
        const red = fetch(req)
          .then((resp) => { c.put(req, resp.clone()); return resp; })
          .catch(() => guardada);
        return guardada || red;
      })));
});
