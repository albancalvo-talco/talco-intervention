// ══════════════════════════════════════════════════════════════
// SERVICE WORKER — TALCO Intervention
// Stratégie :
//   - App shell (HTML/CSS/JS/icons) : Cache-first, précaché à l'install
//   - Audio MP3 : Cache-first à la demande (premier accès = mise en cache)
//   - API n8n : Network-only (fonctionnel uniquement en ligne)
// Incrémenter CACHE_VERSION à chaque déploiement pour invalider le cache.
// ══════════════════════════════════════════════════════════════

const CACHE_VERSION = 'v1';
const STATIC_CACHE  = 'talco-static-'  + CACHE_VERSION;
const AUDIO_CACHE   = 'talco-audio-'   + CACHE_VERSION;
const ALL_CACHES    = [STATIC_CACHE, AUDIO_CACHE];

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/chat.css',
  './css/login.css',
  './css/modal.css',
  './css/writing.css',
  './js/config.js',
  './js/state.js',
  './js/auth.js',
  './js/audio.js',
  './js/recorder.js',
  './js/api.js',
  './js/ui-questions.js',
  './js/ui-writing.js',
  './js/ui-preview.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── INSTALL : précache l'app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE : supprime les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-only : webhook n8n + tout ce qui n'est pas même origine
  if (url.hostname !== self.location.hostname) {
    return; // laisse le navigateur gérer (pas d'interception)
  }

  // Cache-first pour les MP3 audio
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // Cache-first pour l'app shell
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ── Stratégie cache-first avec fallback réseau
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // Offline et non caché : pour les pages HTML on peut renvoyer index.html
    if (request.destination === 'document') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    throw e;
  }
}
