import test from 'node:test';
import assert from 'node:assert/strict';
import { Kiosk } from '../js/kiosk/Kiosk.js';

function browserGlobal(t, name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  });
}

test('Tablet fullscreen does not force portrait orientation', async t => {
  let fullscreenRequests = 0; let orientationRequests = 0;
  browserGlobal(t, 'document', { documentElement: { requestFullscreen: async () => { fullscreenRequests++; } } });
  browserGlobal(t, 'screen', { orientation: { lock: async () => { orientationRequests++; } } });
  const kiosk = new Kiosk({ onVisibility: () => {} });
  await kiosk.enterFullscreen();
  assert.equal(fullscreenRequests, 1);
  assert.equal(orientationRequests, 0);
});

test('Denied fullscreen never interrupts entry to the game', async t => {
  browserGlobal(t, 'document', { documentElement: { requestFullscreen: async () => { throw new Error('Denied'); } } });
  const kiosk = new Kiosk({ onVisibility: () => {} });
  await assert.doesNotReject(kiosk.enterFullscreen());
});

test('Desktop preview does not request fullscreen or lock the monitor orientation', async () => {
  const kiosk = new Kiosk({ desktopPreview: true, onVisibility: () => {} });
  // No browser globals exist in Node: requesting either capability would fail.
  await assert.doesNotReject(kiosk.enterFullscreen());
});

test('Manual export text remains selectable/copyable while kiosk gestures on the game stay blocked', () => {
  const kiosk = new Kiosk({ onVisibility: () => {} }); let prevented = 0;
  for (const type of ['selectstart', 'contextmenu']) {
    kiosk.blockGesture({ type, cancelable: true, target: { matches: selector => selector.includes('textarea[readonly]') }, preventDefault: () => prevented++ });
  }
  assert.equal(prevented, 0);
  kiosk.blockGesture({ type: 'contextmenu', cancelable: true, target: { matches: () => false }, preventDefault: () => prevented++ });
  assert.equal(prevented, 1);
});
