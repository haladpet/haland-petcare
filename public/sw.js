// Haland PetCare Service Worker
// Cache-first for static assets, network-first for API calls with cache fallback
// Background sync for /api/sync endpoint

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `petcare-static-${CACHE_VERSION}`
const API_CACHE = `petcare-api-${CACHE_VERSION}`
const IMAGE_CACHE = `petcare-images-${CACHE_VERSION}`

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// ─── Install ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Some assets may not exist yet, that's ok
      })
    })
  )
  self.skipWaiting()
})

// ─── Activate ───────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            return key.startsWith('petcare-') && key !== STATIC_CACHE && key !== API_CACHE && key !== IMAGE_CACHE
          })
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// ─── Fetch Strategy ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // API calls: Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // Next.js static assets: Cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Images: Cache-first
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  // Page navigations: Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE))
    return
  }

  // Default: Network-first
  event.respondWith(networkFirst(request, STATIC_CACHE))
})

// ─── Cache-First Strategy ───────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Offline — return cached or fallback
    return cached || new Response('Offline', { status: 503 })
  }
}

// ─── Network-First Strategy ─────────────────────────────────────
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Offline — try cache
    const cached = await cache.match(request)
    if (cached) return cached

    // For page navigations, return the cached root
    if (request.mode === 'navigate') {
      const rootCache = await cache.match('/')
      if (rootCache) return rootCache
    }

    return new Response(JSON.stringify({ error: 'You are offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ─── Background Sync ────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueue())
  }
})

async function processSyncQueue() {
  try {
    // Open all clients and trigger sync
    const clients = await self.clients.matchAll({ type: 'window' })
    for (const client of clients) {
      client.postMessage({ type: 'BACKGROUND_SYNC', action: 'process-queue' })
    }
  } catch {
    // ignore
  }
}

// ─── Push Notifications ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body || 'New notification from Haland PetCare',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: data.data || {},
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Haland PetCare',
      options
    )
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})