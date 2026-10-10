const CACHE_NAME = 'ideavault-v1';
const APP_SHELL = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    const cache = caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL));
    e.waitUntil(cache);
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    const activate = caches.keys().then(keys => {
        return Promise.all(keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key)));
    });
    e.waitUntil(activate);
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Solo procesar peticiones HTTP/HTTPS y omitir llamadas a la API o extensiones
    if (!e.request.url.startsWith('http') || e.request.url.includes('localhost:3002')) return;

    const respuesta = caches.match(e.request).then(cacheResp => {
        if (cacheResp) {
            return cacheResp;
        }
        return fetch(e.request).then(netResp => {
            if (e.request.method === 'GET' && netResp.ok) {
                const copia = netResp.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, copia));
            }
            return netResp;
        });
    });
    e.respondWith(respuesta);
});

self.addEventListener('push', (e) => {
    let datos = { title: 'IdeaVault', body: '¡Tienes un recordatorio!' };
 
    if (e.data) {
        datos = e.data.json();
    }
 
    const opciones = {
        body: datos.body,
        icon: './img/icons/icon-192x192.png',
        badge: './img/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: { url: './' }
    };
 
    e.waitUntil(self.registration.showNotification(datos.title, opciones));
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(
        clients.openWindow(e.notification.data.url)
    );
});
