import { STATES } from './config/constants.js';
import { EventBus } from './core/EventBus.js';
import { GameLoop } from './core/GameLoop.js';
import { IdleWatcher } from './core/IdleWatcher.js';
import { StateMachine } from './core/StateMachine.js';
import { es } from './i18n/es.js';
import { InputManager } from './input/InputManager.js';
import { Kiosk } from './kiosk/Kiosk.js';
import { Renderer } from './render/Renderer.js';
import { IdleWarning } from './ui/IdleWarning.js';
import { AdminPanel } from './ui/AdminPanel.js';
import { AdminTrigger } from './ui/AdminTrigger.js';
import { PinGuard } from './game/PinGuard.js';
import { Round } from './game/Round.js';
import { PlayingScreen } from './ui/PlayingScreen.js';
import { Sfx } from './audio/Sfx.js';
import { Storage } from './storage/Storage.js';
import { AttractScreen } from './ui/AttractScreen.js';
import { GameOverScreen } from './ui/GameOverScreen.js';

const app = document.querySelector('#app');
const screens = document.querySelector('#screens');
const warningRoot = document.querySelector('#idle-warning');
const lifetime = new AbortController();
const signal = lifetime.signal;
document.title = es.title;
let backend = null;
try { backend = window.localStorage; } catch { /* Repository falls back to session memory. */ }
const storage = new Storage({ backend }).load();
const pinGuard = new PinGuard(storage); pinGuard.initialize().catch(() => {});
try { navigator.storage?.persist?.()?.catch?.(() => {}); } catch { /* Optional persistence grant. */ }

const renderer = new Renderer(document.querySelector('#game'));
const bus = new EventBus();
const debug = new URLSearchParams(location.search).get('debug') === '1';
const development = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || debug;
const desktopPreview = matchMedia('(pointer: fine)').matches && !matchMedia('(pointer: coarse)').matches;
let hidden = document.hidden;
let interruptedPlaying = false;
let warningVisible = false;
let previousFocus = null;
const states = {};
const sfx = new Sfx();
sfx.attach(document);
const round = new Round({ debug, onEvent: event => {
  if (event.type === 'sfx:rim' || event.type === 'sfx:board') bus.emit(event.type, event);
  bus.emit('round:event', event);
} });
Object.assign(round.settings, storage.settings);
let debugOverlay = null;
let sceneTime = 0;
for (const name of Object.values(STATES)) {
  const navigate = (next, payload) => machine.transition(next, payload);
  if (name === STATES.PLAYING) states[name] = new PlayingScreen({ root: screens, round, bus, sfx, storage, navigate });
  else if (name === STATES.ATTRACT_MODE) states[name] = new AttractScreen({ root: screens, storage, navigate });
  else if (name === STATES.GAME_OVER) states[name] = new GameOverScreen({ root: screens, storage, navigate });
  else states[name] = new AdminPanel({ root: screens, storage, guard: pinGuard, debug, navigate });
}
const machine = new StateMachine({ states, bus, development });
const adminTrigger = new AdminTrigger({ target: document, debug, onActivate: () => machine.transition(STATES.ADMIN_PANEL) });
const loop = new GameLoop({
  update: dt => { sceneTime += dt; machine.update(dt); },
  render: () => {
    renderer.begin(sceneTime); machine.render(renderer.ctx);
    adminTrigger.update(performance.now());
    if (debugOverlay) { debugOverlay.render(renderer.ctx); debugOverlay.frame(performance.now()); }
  },
});
const input = new InputManager({
  surface: app,
  toWorld: (x, y, out) => renderer.toWorld(x, y, out),
  onInput: event => machine.onInput(event),
  mouseEnabled: matchMedia('(any-pointer: fine)').matches,
});
const warning = new IdleWarning(warningRoot);
const idle = new IdleWatcher({
  target: document,
  onWarning: seconds => {
    const wasVisible = warningVisible;
    warningVisible = seconds > 0;
    warning.setSeconds(seconds);
    if (!wasVisible && warningVisible) {
      previousFocus = document.activeElement;
      warning.button.focus({ preventScroll: true });
    } else if (wasVisible && !warningVisible && previousFocus?.isConnected) {
      previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    }
    reconcile();
  },
  onTimeout: () => machine.transition(STATES.ATTRACT_MODE),
});

/** Apply pause reasons together so one resume event cannot override another. @returns {void} */
function reconcile() {
  screens.inert = warningVisible;
  input.setEnabled(!hidden && !warningVisible);
  if (hidden) { loop.stop(); debugOverlay?.pause(); sfx.pause(); }
  else { loop.start(); sfx.resume(); }
}

/** @param {boolean} nextHidden @returns {void} */
function handleVisibility(nextHidden) {
  hidden = nextHidden;
  if (hidden) adminTrigger.cancel();
  if (hidden && machine.current === STATES.PLAYING) interruptedPlaying = true;
  if (!hidden && interruptedPlaying) {
    interruptedPlaying = false;
    if (machine.current === STATES.PLAYING) machine.transition(STATES.ATTRACT_MODE);
  }
  if (!hidden) idle.update();
  reconcile();
}

const kiosk = new Kiosk({
  desktopPreview,
  onVisibility: handleVisibility,
});

// Consume the wake-up gesture before it can activate a control underneath the modal.
for (const type of ['touchstart', 'pointerdown', 'keydown']) {
  document.addEventListener(type, event => {
    if (!warningVisible) return;
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
    idle.reset();
  }, { capture: true, passive: false, signal });
}
warning.button.addEventListener('click', () => idle.reset(), { signal });
const unsubscribe = bus.on('state:change', ({ current }) => {
  adminTrigger.cancel();
  input.cancel();
  idle.setEnabled(current !== STATES.ATTRACT_MODE);
  if (current === STATES.ATTRACT_MODE) {
    document.activeElement?.blur?.();
    for (const form of app.querySelectorAll('form')) form.reset();
  }
});
machine.transition(STATES.ATTRACT_MODE);
idle.start();
input.start();
kiosk.start();
adminTrigger.start();
reconcile();

if (debug) {
  import('./debug/DebugOverlay.js').then(({ DebugOverlay }) => {
    if (signal.aborted) return;
    debugOverlay = new DebugOverlay({ root: app, round, machine, loop });
    window.__TB2D_DEBUG__ = Object.freeze({ machine, loop, input, idle, renderer, round, lab: round, sfx, storage });
  });
}

window.addEventListener('pageshow', () => handleVisibility(document.hidden), { signal });
window.addEventListener('pagehide', event => {
  if (event.persisted) { handleVisibility(true); return; }
  lifetime.abort();
  unsubscribe();
  idle.destroy();
  input.destroy();
  loop.stop();
  machine.destroy();
  renderer.destroy();
  debugOverlay?.destroy();
  kiosk.destroy();
  adminTrigger.destroy();
  sfx.destroy();
  if (debug) delete window.__TB2D_DEBUG__;
}, { signal });
