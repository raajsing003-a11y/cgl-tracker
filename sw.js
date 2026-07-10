// Simple pass-through service worker — no caching, just makes the site
// installable as a proper PWA / packageable as an Android app.
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => self.clients.claim());
self.addEventListener('fetch', () => {});
