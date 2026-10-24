import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/config/constants.js';
import { FrontalWorld } from '../js/physics/FrontalWorld.js';
import { FrontalShotJudge } from '../js/game/FrontalShotJudge.js';
import { FrontalHoop } from '../js/game/FrontalHoop.js';
import { Ball } from '../js/game/Ball.js';
import { FlickTracker } from '../js/input/FlickTracker.js';
import { calculateFrontalLaunch, predictFrontalTrajectory } from '../js/input/frontalLaunch.js';
import { depthScale, projectPoint } from '../js/render/projection.js';
import { Vec2 } from '../js/physics/Vec2.js';

const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('Frontal camera centers the hoop and makes distant balls smaller', () => {
  const point = new Vec2();
  projectPoint(C.FRONTAL_CENTER_X, C.SPAWN_Y, 0, point);
  near(point.x, C.WORLD_WIDTH / 2); near(point.y, C.SPAWN_Y);
  projectPoint(C.FRONTAL_CENTER_X, C.FRONTAL_RIM_Y, C.FRONTAL_HOOP_DEPTH, point);
  near(point.x, C.WORLD_WIDTH / 2); assert.ok(point.y > 500 && point.y < 650);
  assert.ok(depthScale(C.FRONTAL_HOOP_DEPTH) < depthScale(0));
  assert.ok(Number.isFinite(depthScale(-10000)));
});

test('Straight upward flick travels away from the camera with no lateral drift', () => {
  const tracker = new FlickTracker({ calculateLaunch: calculateFrontalLaunch });
  const out = tracker.result;
  calculateFrontalLaunch({ x: 0, y: -3000 }, { x: C.FRONTAL_CENTER_X, y: C.SPAWN_Y }, { sensitivity: 1, aimAssist: 0.15 }, out);
  near(out.velocity.x, 0); assert.ok(out.velocity.y < 0); assert.ok(out.depthVelocity > 0);
  const standardDepth = out.depthVelocity;
  calculateFrontalLaunch({ x: 0, y: -1800 }, { x: C.FRONTAL_CENTER_X, y: C.SPAWN_Y }, { sensitivity: 1, aimAssist: 0 }, out);
  assert.ok(out.depthVelocity < standardDepth, 'power must affect depth');
});

test('Frontal prediction matches projected physical motion before contacts', () => {
  const world = new FrontalWorld();
  const ball = world.spawn(C.FRONTAL_CENTER_X, C.SPAWN_Y);
  const tracker = new FlickTracker(); const out = tracker.result;
  calculateFrontalLaunch({ x: 0, y: -3000 }, ball.position, { sensitivity: 1, aimAssist: 0.15 }, out);
  ball.depthVelocity = out.depthVelocity; ball.launch(out.velocity, 0);
  const points = new Float64Array(C.DEBUG_PREDICTION_POINTS * 2); const point = new Vec2();
  predictFrontalTrajectory(ball.position, ball.velocity, ball.depthVelocity, points, point);
  for (let index = 1; index <= 20; index++) {
    for (let step = 0; step < 8; step++) world.step();
    projectPoint(ball.position.x, ball.position.y, ball.depth, point);
    near(point.x, points[index * 2]); near(point.y, points[index * 2 + 1]);
  }
});

test('Frontal ring collision reverses relative normal speed with rim restitution', () => {
  const world = new FrontalWorld({ gravity: 0, airDrag: 0 });
  const ball = world.spawn(C.FRONTAL_CENTER_X + C.FRONTAL_RIM_RADIUS, C.FRONTAL_RIM_Y - 114);
  ball.depth = C.FRONTAL_HOOP_DEPTH; ball.launch({ x: 0, y: 1000 }, 0);
  world.step();
  assert.equal(ball.touchedRim, true); near(ball.velocity.y, -1000 * C.RIM_RESTITUTION);
});

test('Frontal board is behind the hoop and rebounds depth velocity even at maximum speed', () => {
  const world = new FrontalWorld({ gravity: 0, airDrag: 0 });
  const ball = world.spawn(C.FRONTAL_CENTER_X, 400);
  ball.depth = C.FRONTAL_BOARD_DEPTH - ball.radius - 20; ball.depthVelocity = C.V_MAX;
  ball.launch({ x: 0, y: 0 }, 0);
  for (let i = 0; i < 5; i++) world.step();
  assert.equal(ball.touchedBoard, true); near(ball.depthVelocity, -C.V_MAX * C.BOARD_RESTITUTION);
  assert.ok(C.V_MAX * C.FIXED_DT < ball.radius + C.FRONTAL_BOARD_THICKNESS);
});

test('A sphere centered inside the board slab exits through the nearest face', () => {
  const world = new FrontalWorld({ gravity: 0, airDrag: 0 });
  const ball = world.spawn(C.FRONTAL_CENTER_X, 400);
  ball.depth = C.FRONTAL_BOARD_DEPTH + 2;
  assert.equal(world.boardContact(ball), true); assert.equal(world.contact.nz, -1);
  world.resolveSphere(ball, 'board');
  near(ball.depth, C.FRONTAL_BOARD_DEPTH - ball.radius);
});

function crossing(ball, y0, y1, z, vy = 500) {
  ball.previous.set(C.FRONTAL_CENTER_X, y0); ball.position.set(C.FRONTAL_CENTER_X, y1);
  ball.previousDepth = z; ball.depth = z; ball.velocity.y = vy;
}
function judging() {
  const ball = new Ball(0); ball.reset(C.FRONTAL_CENTER_X, 700); ball.launch({ x: 0, y: 500 }, 0);
  return { ball, hoop: new FrontalHoop(), judge: new FrontalShotJudge() };
}

test('A ball overlapping the hoop on screen cannot score at the wrong depth', () => {
  const { ball, hoop, judge } = judging();
  const projectedRim = new Vec2(); projectPoint(hoop.centerX, hoop.rimY, hoop.depth, projectedRim);
  crossing(ball, projectedRim.y - 1, projectedRim.y + 1, 0);
  judge.evaluate(ball, hoop, 100); assert.equal(ball.shot.gateA, false);
  crossing(ball, hoop.rimY - 10, hoop.rimY + 10, 0);
  judge.evaluate(ball, hoop, 200); assert.equal(ball.shot.gateA, false); assert.equal(ball.points, 0);
});

test('Frontal gates score swish/+3 or contact/+2 exactly once, and reject entry from below', () => {
  for (const contact of [false, true]) {
    const { ball, hoop, judge } = judging(); ball.touchedBoard = contact;
    crossing(ball, hoop.rimY - 10, hoop.rimY + 10, hoop.depth); judge.evaluate(ball, hoop, 100);
    crossing(ball, hoop.gateBY - 10, hoop.gateBY + 10, hoop.depth);
    assert.equal(judge.evaluate(ball, hoop, 200), true); assert.equal(ball.points, contact ? 2 : 3);
    assert.equal(judge.evaluate(ball, hoop, 300), false);
  }
  const { ball, hoop, judge } = judging();
  crossing(ball, hoop.rimY + 10, hoop.rimY - 10, hoop.depth, -500); judge.evaluate(ball, hoop, 100);
  crossing(ball, hoop.rimY - 10, hoop.rimY + 10, hoop.depth); judge.evaluate(ball, hoop, 200);
  crossing(ball, hoop.gateBY - 10, hoop.gateBY + 10, hoop.depth); judge.evaluate(ball, hoop, 300);
  assert.equal(ball.shot.upwardThrough, true); assert.equal(ball.points, 0);
});

test('Frontal floor, excessive depth and timeout still resolve misses and recycle balls', () => {
  const world = new FrontalWorld(); const pool = world.balls;
  const ball = world.spawn(C.FRONTAL_CENTER_X, C.FLOOR_Y - C.FRONTAL_BALL_RADIUS - 1);
  ball.launch({ x: 0, y: 1000 }, 0); world.step();
  assert.equal(ball.outcome, 'floor');
  for (let i = 0; i < 150; i++) world.step();
  assert.equal(ball.state, 'inactive'); assert.equal(world.spawn(540, 1380), ball);
  ball.depth = C.FRONTAL_MAX_DEPTH + 1; ball.launch({ x: 0, y: 0 }, world.timeMs); world.step();
  assert.equal(ball.outcome, 'outside'); world.reset(); assert.equal(world.balls, pool);
});
