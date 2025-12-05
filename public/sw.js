// Service Worker for Bahor AI PWA
// CRITICAL: Only cache GET requests, never intercept writes/uploads

const CACHE_NAME = 'bahor-ai-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// URLs that should NEVER be cached or intercepted
const BYPASS_PATTERNS = [
  '.supabase.co',
  '/rest/v1/',
  '/auth/v1/',
  '/storage/v1/',
  '/functions/v1/',
  '/realtime/v1/'
];

// Check if URL should bypass service worker
function shouldBypass(url) {
  return BYPASS_PATTERNS.some(pattern => url.includes(pattern));
}

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - ONLY handle GET requests, bypass Supabase entirely
self.addEventListener('fetch', (event) => {
  // CRITICAL: Never intercept non-GET requests (POST, PUT, DELETE, PATCH)
  if (event.request.method !== 'GET') {
    return; // Let browser handle it normally
  }

  // CRITICAL: Never intercept Supabase API calls
  if (shouldBypass(event.request.url)) {
    return; // Let browser handle it normally
  }

  // Only cache static assets for GET requests
  event.respondWith(
    (async () => {
      try {
        // Try network first
        const response = await fetch(event.request);
        
        // Only cache successful responses for static assets
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, responseToCache);
        }
        
        return response;
      } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Return a proper error response, NEVER null/undefined
        return new Response('Network error', { 
          status: 503, 
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});
