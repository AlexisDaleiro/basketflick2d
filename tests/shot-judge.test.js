import test from 'node:test';
import assert from 'node:assert/strict';
import { Ball } from '../js/game/Ball.js';
import { Hoop } from '../js/game/Hoop.js';
import { ShotJudge } from '../js/game/ShotJudge.js';
import { World } from '../js/physics/World.js';
import { GATE_TIMEOUT_MS, SHOT_TIMEOUT_MS } from '../js/config/constants.js';

function fixture() {
  const ball = new Ball(0);
  ball.reset(800, 500);
  ball.launch({ x: 0, y: 500 }, 0);
  return { ball, hoop: new Hoop(), judge: new ShotJudge() };
}

function cross(ball, fromX, fromY, toX, toY, vy = 500) {
  ball.previous.set(fromX, fromY);
  ball.position.set(toX, toY);
  ball.velocity.y = vy;
}

test('ShotJudge requires A then B, distinguishes swish from rim or board contact and resolves only once', () => {
  for (const touched of ['none', 'rim', 'board']) {
    const { ball, hoop, judge } = fixture();
    ball.touchedRim = touched === 'rim';
    ball.touchedBoard = touched === 'board';
    cross(ball, 800, 550, 800, 570);
    assert.equal(judge.evaluate(ball, hoop, 100), false);
    assert.equal(ball.shot.gateA, true);
    cross(ball, 800, 620, 800, 640);
    assert.equal(judge.evaluate(ball, hoop, 200), true);
    assert.equal(ball.outcome, 'basket');
    assert.equal(ball.swish, touched === 'none');
    assert.equal(ball.points, touched === 'none' ? 3 : 2);
    assert.equal(judge.evaluate(ball, hoop, 210), false);
    assert.equal(ball.state, 'dead');
  }
});

test('ShotJudge interpolates x at each gate rather than using the step endpoint', () => {
  const { ball, hoop, judge } = fixture();
  cross(ball, 700, 550, 920, 570);
  judge.evaluate(ball, hoop, 100);
  assert.equal(ball.shot.gateA, true, 'interpolated x is 810 inside the opening');
  cross(ball, 700, 620, 920, 640);
  assert.equal(judge.evaluate(ball, hoop, 200), true);
  assert.equal(ball.outcome, 'basket');
});

test('ShotJudge rejects entry from below even if both gates are later crossed downward', () => {
  const { ball, hoop, judge } = fixture();
  cross(ball, 800, 570, 800, 550, -500);
  judge.evaluate(ball, hoop, 100);
  assert.equal(ball.shot.upwardThrough, true);
  cross(ball, 800, 550, 800, 570);
  judge.evaluate(ball, hoop, 200);
  cross(ball, 800, 620, 800, 640);
  judge.evaluate(ball, hoop, 300);
  assert.equal(ball.shot.gateA, false);
  assert.equal(ball.points, 0);
  ball.touchedFloor = true;
  assert.equal(judge.evaluate(ball, hoop, 400), true);
  assert.equal(ball.outcome, 'floor');
});

test('ShotJudge excludes gate A boundaries and accepts gate B inclusive boundaries', () => {
  for (const x of [711, 889]) {
    const { ball, hoop, judge } = fixture();
    cross(ball, x, 550, x, 570);
    judge.evaluate(ball, hoop, 100);
    assert.equal(ball.shot.gateA, false);
  }
  for (const x of [702, 898]) {
    const { ball, hoop, judge } = fixture();
    cross(ball, 800, 550, 800, 570); judge.evaluate(ball, hoop, 100);
    cross(ball, x, 620, x, 640);
    assert.equal(judge.evaluate(ball, hoop, 200), true);
    assert.equal(ball.outcome, 'basket');
  }
});

test('ShotJudge rejects gate B outside the opening, before A or after 600 ms', () => {
  for (const scenario of ['outside', 'before', 'late']) {
    const { ball, hoop, judge } = fixture();
    if (scenario !== 'before') {
      cross(ball, 800, 550, 800, 570); judge.evaluate(ball, hoop, 100);
    }
    const x = scenario === 'outside' ? 901 : 800;
    cross(ball, x, 620, x, 640);
    judge.evaluate(ball, hoop, scenario === 'late' ? 101 + GATE_TIMEOUT_MS : 200);
    assert.equal(ball.outcome, '');
    assert.equal(ball.points, 0);
  }
});

test('ShotJudge confirms gate B exactly at 600 ms and supports two gates within one step', () => {
  const { ball, hoop, judge } = fixture();
  cross(ball, 800, 550, 800, 570); judge.evaluate(ball, hoop, 100);
  cross(ball, 800, 620, 800, 640);
  assert.equal(judge.evaluate(ball, hoop, 100 + GATE_TIMEOUT_MS), true);
  const second = fixture();
  cross(second.ball, 800, 550, 800, 640);
  assert.equal(second.judge.evaluate(second.ball, second.hoop, 100), true);
});

test('A new valid downward A crossing refreshes its confirmation window', () => {
  const { ball, hoop, judge } = fixture();
  cross(ball, 800, 550, 800, 570); judge.evaluate(ball, hoop, 100);
  // The ball can return above the rim outside the opening, then re-enter.
  cross(ball, 600, 570, 600, 550, -500); judge.evaluate(ball, hoop, 700);
  cross(ball, 800, 550, 800, 570); judge.evaluate(ball, hoop, 800);
  assert.equal(ball.shot.gateATime, 800);
  cross(ball, 800, 620, 800, 640);
  assert.equal(judge.evaluate(ball, hoop, 900), true);
  assert.equal(ball.outcome, 'basket');
});

test('ShotJudge resolves floor, left/right exits and shot timeout as misses', () => {
  for (const reason of ['floor', 'left', 'right', 'timeout']) {
    const { ball, hoop, judge } = fixture();
    cross(ball, 300, 900, 300, 910);
    if (reason === 'floor') ball.touchedFloor = true;
    if (reason === 'left') ball.position.x = -121;
    if (reason === 'right') ball.position.x = 1201;
    assert.equal(judge.evaluate(ball, hoop, reason === 'timeout' ? SHOT_TIMEOUT_MS - 1 : 100), reason !== 'timeout');
    if (reason === 'timeout') assert.equal(judge.evaluate(ball, hoop, SHOT_TIMEOUT_MS), true);
    assert.equal(ball.outcome, reason === 'left' || reason === 'right' ? 'outside' : reason);
    assert.equal(ball.points, 0);
  }
});

test('A calibrated ideal shot in the actual World crosses A then B for a swish', () => {
  let resolutions = 0;
  const world = new World({ onResolve: () => resolutions++ });
  const ball = world.spawn(360, 1380);
  ball.launch({ x: 300, y: -2700 }, 0);
  let sawGateABeforeResolution = false;
  for (let step = 0; step < 1000 && ball.state === 'flying'; step++) {
    world.step();
    if (ball.shot.gateA && !ball.shot.resolved) sawGateABeforeResolution = true;
  }
  assert.equal(sawGateABeforeResolution, true);
  assert.equal(ball.outcome, 'basket');
  assert.equal(ball.swish, true);
  assert.equal(ball.points, 3);
  assert.equal(resolutions, 1);
  for (let step = 0; step < 300; step++) world.step();
  assert.equal(resolutions, 1);
});

test('Moving gate crossings use relative previous/current planes', () => {
  const { ball, hoop, judge } = fixture();
  hoop.previousRimY = 550; hoop.rimY = 570;
  cross(ball, 800, 540, 800, 580);
  judge.evaluate(ball, hoop, 100);
  assert.equal(ball.shot.gateA, true);
  hoop.previousGateBY = 620; hoop.gateBY = 640;
  cross(ball, 800, 610, 800, 650);
  assert.equal(judge.evaluate(ball, hoop, 200), true);
});
