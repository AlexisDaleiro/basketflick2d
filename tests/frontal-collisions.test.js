import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/config/constants.js';
import { FrontalWorld } from '../js/physics/FrontalWorld.js';
import { calculateFrontalLaunch } from '../js/input/frontalLaunch.js';
import { FlickTracker } from '../js/input/FlickTracker.js';
import { depthScale } from '../js/render/projection.js';
import { ballLayer } from '../js/render/visibility.js';

function shoot(power) {
  const contacts = []; let resolutions = 0;
  const world = new FrontalWorld({ onContact: event => contacts.push({ type: event.type, vz: event.ball.depthVelocity }), onResolve: () => resolutions++ });
  const ball = world.spawn(C.FRONTAL_CENTER_X, C.SPAWN_Y);
  const result = new FlickTracker().result;
  calculateFrontalLaunch({ x: 0, y: -power / C.GAIN }, ball.position, { sensitivity: 1, aimAssist: 0.15 }, result);
  ball.depthVelocity = result.depthVelocity; ball.launch(result.velocity, 0);
  return { world, ball, contacts, resolutions: () => resolutions };
}

test('A hard frontal flick physically rebounds off the board and can bank in for +2', () => {
  const { world, ball, contacts, resolutions } = shoot(C.V_MAX);
  for (let i = 0; i < 960 && !ball.shot.resolved; i++) world.step();
  assert.ok(contacts.some(event => event.type === 'sfx:board' && event.vz < 0), 'board reverses depth velocity toward the camera');
  assert.equal(ball.outcome, 'basket'); assert.equal(ball.points, 2); assert.equal(ball.swish, false);
  assert.equal(resolutions(), 1);
  for (let i = 0; i < 200; i++) world.step();
  assert.equal(resolutions(), 1);
});

test('Board rebound makes the ball approach the camera and grow instead of travelling through it', () => {
  const world = new FrontalWorld({ gravity: 0, airDrag: 0 });
  const ball = world.spawn(C.FRONTAL_CENTER_X, 400);
  ball.depth = C.FRONTAL_BOARD_DEPTH - ball.radius - 2; ball.depthVelocity = 2000;
  ball.launch({ x: 0, y: 0 }, 0); world.step();
  assert.equal(ball.touchedBoard, true); assert.ok(ball.depthVelocity < 0);
  const hitDepth = ball.depth; const hitRadius = ball.radius * depthScale(hitDepth);
  for (let i = 0; i < 20; i++) world.step();
  assert.ok(ball.depth < hitDepth); assert.ok(ball.radius * depthScale(ball.depth) > hitRadius);
  assert.ok(ball.depth + ball.radius <= C.FRONTAL_BOARD_DEPTH);
});

test('Over-the-board shots are occluded by the board when descending behind it', () => {
  const world = new FrontalWorld(); const ball = world.spawn(C.FRONTAL_CENTER_X, 400);
  ball.depth = world.hoop.board.maxZ + ball.radius;
  assert.equal(ballLayer(ball, world.hoop), 'behind-board');
  ball.depth = 0; assert.equal(ballLayer(ball, world.hoop), 'foreground');
  ball.depth = world.hoop.depth; assert.equal(ballLayer(ball, world.hoop), 'inside-hoop');
});

test('Confirmed swish visibly drops through the net, stays opaque for 450 ms and then returns to the pool', () => {
  const { world, ball, resolutions } = shoot(2700);
  for (let i = 0; i < 960 && !ball.shot.resolved; i++) world.step();
  assert.equal(ball.outcome, 'basket'); assert.equal(ball.points, 3);
  const startY = ball.position.y; const contactCount = ball.touchedRim;
  for (let i = 0; i < Math.round(C.FRONTAL_BASKET_DROP_MS / (C.FIXED_DT * 1000)) - 1; i++) world.step();
  assert.equal(ball.state, 'dead'); assert.equal(ball.opacity, 1);
  assert.ok(ball.position.y > startY); assert.ok(ball.position.y - ball.radius > world.hoop.rimY + C.FRONTAL_NET_DEPTH);
  assert.equal(ballLayer(ball, world.hoop), 'inside-hoop');
  assert.equal(ball.touchedRim, contactCount); assert.equal(resolutions(), 1);
  for (let i = 0; i < 60; i++) world.step();
  assert.equal(ball.state, 'inactive'); assert.equal(world.activeCount, 0);
});

test('Weak shots still miss and screen overlap never grants automatic points', () => {
  const { world, ball } = shoot(1500);
  for (let i = 0; i < 960 && !ball.shot.resolved; i++) world.step();
  assert.equal(ball.outcome, 'floor'); assert.equal(ball.points, 0); assert.equal(ball.shot.gateA, false);
});
