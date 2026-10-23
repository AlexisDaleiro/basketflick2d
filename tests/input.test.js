import test from 'node:test';
import assert from 'node:assert/strict';
import { InputManager } from '../js/input/InputManager.js';

function fixture() {
  const surface = new EventTarget();
  surface.ownerDocument = new EventTarget();
  const samples = [];
  const input = new InputManager({ surface, mouseEnabled: true,
    toWorld: (x, y, out) => { out.x = x * 2; out.y = y * 2; },
    onInput: event => samples.push({ ...event }),
  });
  return { input, samples, surface };
}

function touchEvent(type, touches, timeStamp = 100, native = false) {
  return {
    type, changedTouches: touches, timeStamp, cancelable: true, prevented: false,
    target: { closest: () => native },
    preventDefault() { this.prevented = true; },
  };
}

const touch = (identifier, clientX = 10, clientY = 20) => ({ identifier, clientX, clientY });
const mouseEvent = (type, timeStamp, native = false) => ({
  type, timeStamp, clientX: 30, clientY: 40, button: 0, cancelable: true,
  target: { closest: () => native }, preventDefault() {},
});

test('InputManager keeps the first finger, uses event time and world coordinates', () => {
  const { input, samples } = fixture();
  const start = touchEvent('touchstart', [touch(7), touch(8)]);
  input.onTouch(start);
  assert.equal(start.prevented, true);
  input.onTouch(touchEvent('touchstart', [touch(8)], 110));
  input.onTouch(touchEvent('touchmove', [touch(8, 99)], 120));
  input.onTouch(touchEvent('touchend', [touch(8)], 130));
  assert.equal(samples.length, 1);
  input.onTouch(touchEvent('touchmove', [touch(7, 15, 25)], 140));
  input.onTouch(touchEvent('touchend', [touch(7, 18, 28)], 150));
  assert.deepEqual(samples.map(({ type, t, x, y }) => ({ type, t, x, y })), [
    { type: 'start', t: 100, x: 20, y: 40 },
    { type: 'move', t: 140, x: 30, y: 50 },
    { type: 'end', t: 150, x: 36, y: 56 },
  ]);
  assert.equal(input.activeId, null);
});

test('InputManager preserves native controls and prevents gestures from leaking to canvas', () => {
  const { input, samples } = fixture();
  const start = touchEvent('touchstart', [touch(1)], 100, true);
  input.onTouch(start);
  input.onTouch(touchEvent('touchmove', [touch(1)], 120));
  input.onTouch(touchEvent('touchend', [touch(1)], 150));
  assert.equal(start.prevented, false);
  assert.equal(samples.length, 0);
  input.onMouse(mouseEvent('mousedown', 1000, true));
  assert.equal(samples.length, 0);
});

test('InputManager filters emulated mouse for 800 ms after touch, then accepts desktop mouse', () => {
  const { input, samples } = fixture();
  input.onTouch(touchEvent('touchstart', [touch(1)], 100));
  input.onTouch(touchEvent('touchend', [touch(1)], 200));
  input.onMouse(mouseEvent('mousedown', 999));
  assert.equal(samples.length, 2);
  input.onMouse(mouseEvent('mousedown', 1000));
  input.onMouse(mouseEvent('mousemove', 1001));
  input.onMouse(mouseEvent('mouseup', 1002));
  assert.deepEqual(samples.slice(-3).map(event => event.type), ['start', 'move', 'end']);
});

test('InputManager cancels an active gesture when paused and accepts a new finger after touchcancel', () => {
  const { input, samples } = fixture();
  input.onTouch(touchEvent('touchstart', [touch(1)]));
  input.setEnabled(false);
  assert.equal(samples.at(-1).type, 'cancel');
  input.onTouch(touchEvent('touchstart', [touch(2)]));
  assert.equal(samples.length, 2);
  input.setEnabled(true);
  input.onTouch(touchEvent('touchstart', [touch(3)]));
  input.onTouch(touchEvent('touchcancel', [touch(3)]));
  assert.equal(input.activeId, null);
  input.onTouch(touchEvent('touchstart', [touch(4)]));
  assert.equal(input.activeId, 4);
});

test('InputManager registers non-passive touch handlers once and removes them', () => {
  const { input, surface } = fixture();
  const added = [];
  const removed = [];
  const originalAdd = surface.addEventListener.bind(surface);
  const originalRemove = surface.removeEventListener.bind(surface);
  surface.addEventListener = (type, handler, options) => { added.push({ type, options }); originalAdd(type, handler, options); };
  surface.removeEventListener = (type, handler, options) => { removed.push(type); originalRemove(type, handler, options); };
  input.start();
  input.start();
  assert.equal(added.filter(event => event.type.startsWith('touch')).length, 4);
  assert.ok(added.filter(event => event.type.startsWith('touch')).every(event => event.options.passive === false));
  input.destroy();
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown']) assert.ok(removed.includes(type));
});
