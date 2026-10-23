import test from 'node:test';
import assert from 'node:assert/strict';
import { Kiosk, shouldBlockOrientation } from '../js/kiosk/Kiosk.js';

test('Desktop preview stays playable after widening or maximizing the browser', () => {
  assert.equal(shouldBlockOrientation(500, 900, true), false);
  assert.equal(shouldBlockOrientation(1920, 1080, true), false);
});

test('Tablet kiosk still blocks landscape and resumes in portrait', () => {
  assert.equal(shouldBlockOrientation(1024, 768, false), true);
  assert.equal(shouldBlockOrientation(768, 1024, false), false);
});

test('Desktop preview does not request fullscreen or lock the monitor orientation', async () => {
  const kiosk = new Kiosk({ desktopPreview: true, onVisibility: () => {}, onOrientation: () => {} });
  // No browser globals exist in Node: requesting either capability would fail.
  await assert.doesNotReject(kiosk.enterFullscreen());
});
