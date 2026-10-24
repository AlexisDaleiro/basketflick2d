const VERSION = '0.6.3';
const CACHE = `tb2d-v${VERSION}`;
// Explicit precache list; tests/sw.test.js fails if any /js, /css or /icons file is missing.
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './js/audio/Sfx.js',
  './js/config/constants.js',
  './js/config/theme.js',
  './js/core/EventBus.js',
  './js/core/ErrorGuard.js',
  './js/core/GameLoop.js',
  './js/core/IdleWatcher.js',
  './js/core/StateMachine.js',
  './js/debug/DebugOverlay.js',
  './js/game/Ball.js',
  './js/game/DemoPlayer.js',
  './js/game/FrontalHoop.js',
  './js/game/FrontalShotJudge.js',
  './js/game/Hoop.js',
  './js/game/PhysicsLab.js',
  './js/game/PinGuard.js',
  './js/game/ResultSession.js',
  './js/game/Round.js',
  './js/game/ShotJudge.js',
  './js/i18n/es.js',
  './js/input/FlickTracker.js',
  './js/input/InputManager.js',
  './js/input/frontalLaunch.js',
  './js/input/launch.js',
  './js/kiosk/Kiosk.js',
  './js/main.js',
  './js/physics/FrontalWorld.js',
  './js/physics/Vec2.js',
  './js/physics/World.js',
  './js/physics/collide.js',
  './js/physics/predict.js',
  './js/render/Particles.js',
  './js/render/Renderer.js',
  './js/render/brand.js',
  './js/render/draw/background.js',
  './js/render/draw/ball.js',
  './js/render/draw/hoop.js',
  './js/render/draw/lab.js',
  './js/render/draw/path.js',
  './js/render/draw/paw.js',
  './js/render/projection.js',
  './js/render/visibility.js',
  './js/storage/Storage.js',
  './js/storage/csv.js',
  './js/storage/hash.js',
  './js/storage/leads.js',
  './js/storage/ranking.js',
  './js/storage/schema.js',
  './js/ui/AdminPanel.js',
  './js/ui/AdminTrigger.js',
  './js/ui/AttractScreen.js',
  './js/ui/CsvExport.js',
  './js/ui/GameOverScreen.js',
  './js/ui/Hud.js',
  './js/ui/IdleWarning.js',
  './js/ui/PhysicsScreen.js',
  './js/ui/PinPad.js',
  './js/ui/PlayingScreen.js',
  './js/ui/SkeletonScreen.js',
  './js/ui/SystemStatus.js',
  './js/ui/brandButton.js',
  './js/ui/dom.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon-maskable.svg',
  './icons/icon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('tb2d-v') && key !== CACHE)
    .map(key => caches.delete(key)))));
});

// Cache-first; navigations ignore the query so ?debug=1 also opens offline.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE)
    .then(cache => cache.match(request, { ignoreSearch: request.mode === 'navigate' }))
    .then(cached => cached || fetch(request)));
});

// Updates activate only when the admin asks for them.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
