/**
 * Stock-X Service Worker v2
 * Provides offline caching and performance optimization with long-term caching for hashed assets
 */

const CACHE_VERSION = 'stock-x-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

// Critical assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

// Long cache duration for hashed assets (1 year in seconds)
const LONG_CACHE_DURATION = 31536000;
// Short cache duration for dynamic content (1 hour)
const SHORT_CACHE_DURATION = 3600;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Stock-X Service Worker v2...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Stock-X Service Worker v2...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('stock-x-') && !name.startsWith(CACHE_VERSION))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - optimized caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API calls (always need fresh data)
  if (url.hostname.includes('supabase')) return;

  // Skip Chrome extension URLs
  if (url.protocol === 'chrome-extension:') return;

  // Skip hot module replacement in development
  if (url.pathname.includes('__vite') || url.pathname.includes('@vite')) return;

  // For hashed assets (long-term cache) - immutable cache strategy
  if (isHashedAsset(url.pathname)) {
    event.respondWith(immutableCacheFirst(request, ASSET_CACHE));
    return;
  }

  // For static assets (images, fonts) - stale-while-revalidate
  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // For pages - network first with cache fallback
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// Helper: Check if URL is a hashed asset (e.g., main-abc123.js)
function isHashedAsset(pathname) {
  // Match files with hash patterns like: filename.abc123.js or filename-abc123.js
  return /\.[a-f0-9]{8,}\.(js|css|woff2?)$/i.test(pathname) ||
         /-[a-f0-9]{8,}\.(js|css|woff2?)$/i.test(pathname);
}

// Helper: Check if URL is a static asset
function isStaticAsset(pathname) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/i.test(pathname);
}

// Strategy: Immutable cache first (for hashed assets - never expires)
async function immutableCacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      // Clone response before caching
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return cached version if available
    const fallback = await caches.match(request);
    if (fallback) return fallback;
    throw error;
  }
}

// Strategy: Stale-while-revalidate (for static assets)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Start fetch in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  
  // Return cached immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

// Strategy: Network first with cache fallback (for pages)
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    throw error;
  }
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  // Allow manual cache clearing
  if (event.data === 'clearCache') {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name.startsWith('stock-x-')) {
          caches.delete(name);
        }
      });
    });
  }
});