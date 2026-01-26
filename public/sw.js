/**
 * Stock-X Service Worker v3
 * Enhanced offline-first capabilities with background sync
 */

const CACHE_VERSION = 'stock-x-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Critical assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

// API endpoints to cache for offline
const API_PATTERNS = [
  '/rest/v1/lpg_brands',
  '/rest/v1/stoves',
  '/rest/v1/regulators',
  '/rest/v1/customers',
  '/rest/v1/product_prices',
  '/rest/v1/inventory_summary',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Stock-X Service Worker v3...');
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
  console.log('[SW] Activating Stock-X Service Worker v3...');
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

  // Skip Chrome extension URLs
  if (url.protocol === 'chrome-extension:') return;

  // Skip hot module replacement in development
  if (url.pathname.includes('__vite') || url.pathname.includes('@vite')) return;

  // Handle Supabase API calls with network-first + cache fallback
  if (url.hostname.includes('supabase') && isApiCacheable(url.pathname)) {
    event.respondWith(networkFirstWithApiCache(request));
    return;
  }

  // Skip other Supabase calls (auth, realtime)
  if (url.hostname.includes('supabase')) return;

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

// Check if API endpoint should be cached
function isApiCacheable(pathname) {
  return API_PATTERNS.some(pattern => pathname.includes(pattern));
}

// Helper: Check if URL is a hashed asset (e.g., main-abc123.js)
function isHashedAsset(pathname) {
  return /\.[a-f0-9]{8,}\.(js|css|woff2?)$/i.test(pathname) ||
         /-[a-f0-9]{8,}\.(js|css|woff2?)$/i.test(pathname);
}

// Helper: Check if URL is a static asset
function isStaticAsset(pathname) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/i.test(pathname);
}

// Strategy: Network first with API cache fallback
async function networkFirstWithApiCache(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Clone and cache the response
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Serving API from cache:', request.url);
      return cached;
    }
    
    // Return offline JSON response
    return new Response(
      JSON.stringify({ 
        error: 'offline',
        message: 'You are offline. Data will sync when connection is restored.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
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
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
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
  
  // Pre-cache API data when online
  if (event.data === 'precacheApi' && event.data.urls) {
    const cache = caches.open(API_CACHE);
    event.data.urls.forEach(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          (await cache).put(url, response);
        }
      } catch (e) {
        console.log('[SW] Failed to precache:', url);
      }
    });
  }
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(
      // Notify the app to process sync queue
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC', tag: event.tag });
        });
      })
    );
  }
});

// Push notification handler (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Stock-X', {
        body: data.body || 'You have a new notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: data.data,
      })
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/')
  );
});
