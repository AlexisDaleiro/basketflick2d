import { STATES } from './config/constants.js';
import { EventBus } from './core/EventBus.js';
import { GameLoop } from './core/GameLoop.js';
import { IdleWatcher } from './core/IdleWatcher.js';
import { StateMachine } from './core/StateMachine.js';
import { es } from './i18n/es.js';
import { InputManager } from './input/InputManager.js';
import { Kiosk, shouldBlockOrientation } from './kiosk/Kiosk.js';
import { Renderer } from './render/Renderer.js';
import { IdleWarning } from './ui/IdleWarning.js';
import { SkeletonScreen } from './ui/SkeletonScreen.js';
import { h, show } from './ui/dom.js';
import { Round } from './game/Round.js';
import { PlayingScreen } from './ui/PlayingScreen.js';
import { Sfx } from './audio/Sfx.js';

const app = document.querySelector('#app');
const screens = document.querySelector('#screens');
const orientation = document.querySelector('#orientation');
const warningRoot = document.querySelector('#idle-warning');
const lifetime = new AbortController();
const signal = lifetime.signal;
document.title = es.title;
const rotateCard = h('div', 'modal-card');
const rotateIcon = new DOMParser().parseFromString(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true"><rect x="24" y="8" width="52" height="84" rx="9" fill="none" stroke="currentColor" stroke-width="6"/><path d="M42 80h16" stroke="currentColor" stroke-width="6"/></svg>',
  'image/svg+xml',
).documentElement;
const rotateTitle = h('h2', '', es.rotate);
rotateTitle.id = 'orientation-title';
orientation.setAttribute('aria-labelledby', rotateTitle.id);
rotateCard.append(rotateIcon, rotateTitle, h('p', 'description', es.rotateDescription));
orientation.append(rotateCard);

const renderer = new Renderer(document.querySelector('#game'));
const bus = new EventBus();
const debug = new URLSearchParams(location.search).get('debug') === '1';
const development = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || debug;
const desktopPreview = development && matchMedia('(pointer: fine)').matches && !matchMedia('(pointer: coarse)').matches;
let hidden = document.hidden;
let landscape = shouldBlockOrientation(window.innerWidth, window.innerHeight, desktopPreview);
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
let debugOverlay = null;
let sceneTime = 0;
for (const name of Object.values(STATES)) {
  states[name] = name === STATES.PLAYING
    ? new PlayingScreen({ root: screens, round, bus, sfx, navigate: (next, payload) => machine.transition(next, payload) })
    : new SkeletonScreen({ name, root: screens, navigate: next => machine.transition(next) });
}
const machine = new StateMachine({ states, bus, development });
const loop = new GameLoop({
  update: dt => { sceneTime += dt; machine.update(dt); },
  render: () => {
    renderer.begin(sceneTime); machine.render(renderer.ctx);
    if (debugOverlay) { debugOverlay.render(renderer.ctx); debugOverlay.frame(performance.now()); }
  },
});
const input = new InputManager({
  surface: app,
  toWorld: (x, y, out) => renderer.toWorld(x, y, out),
  onInput: event => machine.onInput(event),
  mouseEnabled: development && matchMedia('(any-pointer: fine)').matches,
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
  show(orientation, landscape);
  screens.inert = landscape || warningVisible;
  warningRoot.inert = landscape;
  input.setEnabled(!hidden && !landscape && !warningVisible);
  if (hidden || landscape) { loop.stop(); debugOverlay?.pause(); sfx.pause(); }
  else { loop.start(); sfx.resume(); }
}

/** @param {boolean} nextHidden @returns {void} */
function handleVisibility(nextHidden) {
  hidden = nextHidden;
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
  onOrientation: nextLandscape => { landscape = nextLandscape; reconcile(); },
});

// Consume the wake-up gesture before it can activate a control underneath the modal.
for (const type of ['touchstart', 'pointerdown', 'keydown']) {
  document.addEventListener(type, event => {
    if (!warningVisible || landscape) return;
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
    idle.reset();
  }, { capture: true, passive: false, signal });
}
warning.button.addEventListener('click', () => idle.reset(), { signal });
const unsubscribe = bus.on('state:change', ({ current }) => {
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
reconcile();

if (debug) {
  import('./debug/DebugOverlay.js').then(({ DebugOverlay }) => {
    if (signal.aborted) return;
    debugOverlay = new DebugOverlay({ root: app, round, machine, loop });
    window.__TB2D_DEBUG__ = Object.freeze({ machine, loop, input, idle, renderer, round, lab: round, sfx });
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
  sfx.destroy();
  if (debug) delete window.__TB2D_DEBUG__;
}, { signal });
