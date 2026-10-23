import test from 'node:test';
import assert from 'node:assert/strict';
import { FlickTracker } from '../js/input/FlickTracker.js';
import { calculateLaunchVelocity } from '../js/input/launch.js';
import { Ball } from '../js/game/Ball.js';
import { FLICK_BUFFER_SIZE, G, GAIN, GRAB_RADIUS, MAX_LAUNCH_ANGLE, MIN_LAUNCH_ANGLE, RIM_Y, SPAWN_X, SPAWN_Y, V_MAX, V_MIN } from '../js/config/constants.js';

const settings = { sensitivity: 1, aimAssist: 0 };
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
function setup() {
  const tracker = new FlickTracker();
  const ball = new Ball(0);
  ball.reset(SPAWN_X, SPAWN_Y);
  return { tracker, ball };
}

test('FlickTracker requires a ready ball and a start within the grab radius', () => {
  const { tracker, ball } = setup();
  assert.equal(tracker.start(SPAWN_X + GRAB_RADIUS + 1, SPAWN_Y, 0, ball), false);
  assert.equal(tracker.start(SPAWN_X + GRAB_RADIUS, SPAWN_Y, 0, ball), true);
  ball.state = 'flying';
  assert.equal(tracker.start(SPAWN_X, SPAWN_Y, 0, ball), false);
});

test('FlickTracker uses the oldest sample in the last 80 ms, including the boundary', () => {
  const { tracker, ball } = setup();
  tracker.start(SPAWN_X, SPAWN_Y, 0, ball);
  tracker.add(400, 1300, 20);
  tracker.add(420, 1200, 50);
  tracker.add(460, 1100, 80);
  const result = tracker.finish(480, 1000, 100, settings);
  assert.equal(result.valid, true);
  near(result.swipe.x, 1000);
  near(result.swipe.y, -3750);
});

test('FlickTracker applies the 16 ms floor for equal and near-equal timestamps', () => {
  for (const endTime of [0, 1, 8, 16]) {
    const { tracker, ball } = setup();
    tracker.start(SPAWN_X, SPAWN_Y, 0, ball);
    const result = tracker.finish(SPAWN_X, SPAWN_Y - 64, endTime, settings);
    assert.equal(result.valid, true);
    near(result.swipe.y, -4000);
  }
});

test('FlickTracker rejects short, downward, slow and overlong gestures', () => {
  for (const [reason, dx, dy, endTime, lastSample] of [
    ['short', 0, -59, 50], ['downward', 80, 10, 50],
    ['slow', 60, -1, 300, [59, 0, 250]],
    ['long', 100, -300, 1201, [80, -200, 1150]],
  ]) {
    const { tracker, ball } = setup();
    tracker.start(SPAWN_X, SPAWN_Y, 0, ball);
    if (lastSample) tracker.add(SPAWN_X + lastSample[0], SPAWN_Y + lastSample[1], lastSample[2]);
    const result = tracker.finish(SPAWN_X + dx, SPAWN_Y + dy, endTime, settings);
    assert.equal(result.valid, false, reason);
    assert.equal(result.reason, reason);
    assert.equal(ball.state, 'ready');
  }
});

test('FlickTracker ring wraps at 32 samples while retaining the original gesture duration', () => {
  const { tracker, ball } = setup();
  tracker.start(SPAWN_X, SPAWN_Y, 0, ball);
  for (let index = 1; index <= 70; index++) tracker.add(SPAWN_X + index, SPAWN_Y - index * 40, index * 20);
  const result = tracker.finish(SPAWN_X + 71, SPAWN_Y - 2840, 1420, settings);
  assert.equal(tracker.count, FLICK_BUFFER_SIZE);
  assert.equal(result.reason, 'long');
  near(result.swipe.y, -2000);
  tracker.cancel();
  assert.equal(tracker.finish(0, 0, 1500, settings).reason, 'inactive');
});

test('Launch vector clamps magnitude and angle before aim assist', () => {
  const { tracker } = setup();
  const out = tracker.result;
  for (const [x, y, magnitude] of [[0, -700, V_MIN], [20000, -30000, V_MAX]]) {
    calculateLaunchVelocity({ x, y }, { x: SPAWN_X, y: SPAWN_Y }, settings, out);
    near(out.raw.x, x * GAIN);
    near(Math.hypot(out.velocity.x, out.velocity.y), magnitude);
  }
  calculateLaunchVelocity({ x: 3000, y: -1 }, { x: SPAWN_X, y: SPAWN_Y }, settings, out);
  near(out.angle, MIN_LAUNCH_ANGLE);
  calculateLaunchVelocity({ x: -3000, y: -1 }, { x: SPAWN_X, y: SPAWN_Y }, settings, out);
  near(out.angle, MAX_LAUNCH_ANGLE);
  calculateLaunchVelocity({ x: 600, y: -3000 }, { x: SPAWN_X, y: SPAWN_Y }, { sensitivity: 0.5, aimAssist: 0 }, out);
  near(out.raw.x, 600 * GAIN * 0.5);
  near(out.raw.y, -3000 * GAIN * 0.5);
});

test('Aim assist = 1 crosses the rim center analytically within ±2 u, preserving vertical velocity', () => {
  const { tracker } = setup();
  const out = tracker.result;
  calculateLaunchVelocity({ x: 600, y: -3000 }, { x: SPAWN_X, y: SPAWN_Y }, { sensitivity: 1, aimAssist: 1 }, out);
  const time = (-out.velocity.y + Math.sqrt(out.velocity.y ** 2 - 2 * G * (SPAWN_Y - RIM_Y))) / G;
  near(SPAWN_X + time * out.velocity.x, 800, 2);
  near(out.velocity.y, out.clamped.y);
  near(SPAWN_Y + out.velocity.y * time + G * time ** 2 / 2, RIM_Y);
});

test('Aim assist skips unreachable rim heights and interpolates only the horizontal component', () => {
  const { tracker } = setup();
  const out = tracker.result;
  calculateLaunchVelocity({ x: 1000, y: -1 }, { x: SPAWN_X, y: SPAWN_Y }, { aimAssist: 1 }, out);
  near(out.velocity.x, out.clamped.x);
  calculateLaunchVelocity({ x: 600, y: -3000 }, { x: SPAWN_X, y: SPAWN_Y }, { aimAssist: 0.15 }, out);
  const partial = out.velocity.x;
  const clamped = out.clamped.x;
  calculateLaunchVelocity({ x: 600, y: -3000 }, { x: SPAWN_X, y: SPAWN_Y }, { aimAssist: 1 }, out);
  near(partial, clamped + (out.velocity.x - clamped) * 0.15);
});
