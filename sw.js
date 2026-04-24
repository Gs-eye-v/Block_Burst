const CACHE_NAME = 'deiscore-v22';
const AUDIO_CACHE_NAME = 'deiscore-audio-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './style.css',
    './script.js',
    './audio.js',
    './Ball.js',
    './Brick.js',
    './CollisionManager.js',
    './GameState.js',
    './InputManager.js',
    './Item.js',
    './Paddle.js',
    './Particle.js',
    './Renderer.js',
    './StageManager.js',
    './UIManager.js',
    './entities.js',
    './episodes.js',
    './playlist.js',
    './stageData.js',
    './utils.js',
    './icon2.png',
    './manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Strategy for MP3: Cache First, fallback to Network and Cache
    if (url.pathname.endsWith('.mp3')) {
        event.respondWith(
            caches.open(AUDIO_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    
                    return fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Default Strategy: Stale-while-revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch((error) => {
                // Return cache if we have it even for network errors
                if (cachedResponse) return cachedResponse;
                
                // For navigation requests, try to return the root index as fallback
                if (event.request.mode === 'navigate') {
                    return caches.match('./');
                }
                
                // If no cache at all, log and throw (don't return undefined)
                console.error('[SW] Fetch failed and no cache available:', error);
                throw error;
            });

            return cachedResponse || fetchPromise;
        })
    );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_BGM_PRESET') {
        const urlsToCache = event.data.urls;
        console.log('[SW] Background caching BGM presets...', urlsToCache);
        event.waitUntil(
            caches.open(AUDIO_CACHE_NAME).then((cache) => {
                return Promise.all(urlsToCache.map(url => {
                    return fetch(url).then(response => {
                        if (response.ok) {
                            return cache.put(url, response);
                        }
                    }).catch(err => console.log('[SW] Background cache failed for:', url));
                }));
            })
        );
    }
});
