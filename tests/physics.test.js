import test from 'node:test';
import assert from 'node:assert/strict';
import { Vec2 } from '../js/physics/Vec2.js';
import { circleAABB, circlePlane, circlePoint, resolveContact } from '../js/physics/collide.js';
import { World } from '../js/physics/World.js';
import { Hoop } from '../js/game/Hoop.js';
import { BALL_POOL_SIZE, BALL_RADIUS, CONTACT_COOLDOWN_MS, DEAD_FADE_MS, FIXED_DT, FLOOR_Y, G, K_AIR, RIM_RESTITUTION, RIM_TIP_RADIUS, SPAWN_X, SPAWN_Y, V_MAX } from '../js/config/constants.js';
import { predictTrajectory } from '../js/physics/predict.js';

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const contact = () => ({ nx: 0, ny: 0, penetration: 0 });

test('Vec2 operations reuse the receiver and normalize a zero vector safely', () => {
  const vector = new Vec2(3, 4);
  assert.equal(vector.length(), 5);
  assert.equal(vector.normalize(), vector);
  near(vector.length(), 1);
  vector.copy({ x: 2, y: 3 }).add({ x: 1, y: -1 }).scale(2);
  assert.equal(vector.dot({ x: 1, y: 2 }), 14);
  vector.set(0, 0).normalize();
  assert.deepEqual(vector, new Vec2());
});

test('Circle-tip resolves coincident centers and excludes non-overlapping circles', () => {
  const out = contact();
  assert.equal(circlePoint({ x: 0, y: 0 }, 46, { x: 0, y: 0 }, 9, out), true);
  assert.deepEqual(out, { nx: 0, ny: -1, penetration: 55 });
  assert.equal(circlePoint({ x: 55, y: 0 }, 46, { x: 0, y: 0 }, 9, out), false);
});

test('Circle-AABB handles outside edge, corner, internal center and face boundaries', () => {
  const box = { minX: 0, maxX: 20, minY: 0, maxY: 100 };
  const out = contact();
  assert.equal(circleAABB({ x: -5, y: 30 }, 10, box, out), true);
  assert.deepEqual(out, { nx: -1, ny: 0, penetration: 5 });
  assert.equal(circleAABB({ x: -6, y: -8 }, 11, box, out), true);
  near(out.nx, -0.6); near(out.ny, -0.8); near(out.penetration, 1);
  for (const [x, y, nx, ny, penetration] of [[2, 50, -1, 0, 12], [18, 50, 1, 0, 12], [10, 1, 0, -1, 11], [10, 99, 0, 1, 11], [0, 50, -1, 0, 10]]) {
    assert.equal(circleAABB({ x, y }, 10, box, out), true);
    assert.deepEqual(out, { nx, ny, penetration });
  }
  assert.equal(circleAABB({ x: -20, y: 30 }, 10, box, out), false);
});

test('Circle-plane returns an upward normal; resolution applies restitution and tangent friction', () => {
  const out = contact();
  const p = new Vec2(0, FLOOR_Y - BALL_RADIUS + 2);
  const v = new Vec2(100, 200);
  assert.equal(circlePlane(p, BALL_RADIUS, FLOOR_Y, out), true);
  assert.equal(resolveContact(p, v, out, 0.55, 0.2, new Vec2()), 200);
  near(p.y, FLOOR_Y - BALL_RADIUS); near(v.x, 80); near(v.y, -110);
  assert.equal(circlePlane(p, BALL_RADIUS, FLOOR_Y, out), false);
  assert.equal(resolveContact(p, v, { nx: 0, ny: -1, penetration: 0 }, 0.55, 0.2, new Vec2()), 0);
  near(v.y, -110);
});

test('Moving collider resolution uses relative normal velocity', () => {
  const p = new Vec2();
  const v = new Vec2(100, 300);
  const speed = resolveContact(p, v, { nx: 0, ny: -1, penetration: 1 }, 0.55, 0.12, new Vec2(0, 100));
  near(speed, 200); near(v.y - 100, -0.55 * 200); near(v.x, 88);
});

test('World integrates semi-implicit Euler at 1/240 s using precomputed drag', () => {
  const world = new World();
  const ball = world.spawn(SPAWN_X, SPAWN_Y);
  ball.launch({ x: 500, y: -2500 }, world.timeMs);
  world.step();
  const drag = Math.exp(-K_AIR * FIXED_DT);
  near(ball.velocity.x, 500 * drag);
  near(ball.velocity.y, (-2500 + G * FIXED_DT) * drag);
  near(ball.position.x, SPAWN_X + ball.velocity.x * FIXED_DT);
  near(ball.position.y, SPAWN_Y + ball.velocity.y * FIXED_DT);
  near(ball.angle, ball.velocity.x / BALL_RADIUS * FIXED_DT);
});

test('Front rim collision rebounds with the specified restitution and emits impact speed once', () => {
  const events = [];
  const world = new World({ gravity: 0, airDrag: 0, onContact: event => events.push({ type: event.type, intensity: event.intensity }) });
  const ball = world.spawn(650, 560);
  ball.launch({ x: 1000, y: 0 }, 0);
  world.step();
  near(ball.velocity.x, -1000 * RIM_RESTITUTION);
  assert.equal(ball.touchedRim, true);
  assert.deepEqual(events, [{ type: 'sfx:rim', intensity: 1000 }]);
  ball.position.set(650, 560); ball.velocity.set(1000, 0); world.step();
  assert.equal(events.length, 1);
  for (let i = 0; i < Math.ceil(CONTACT_COOLDOWN_MS / (FIXED_DT * 1000)); i++) world.step();
  ball.position.set(650, 560); ball.velocity.set(1000, 0); world.step();
  assert.equal(events.length, 2);
});

test('Anti-tunneling: V_MAX step is smaller than combined radii and a full-speed shot hits the rim', () => {
  assert.ok(V_MAX * FIXED_DT < BALL_RADIUS + RIM_TIP_RADIUS);
  const world = new World({ gravity: 0, airDrag: 0 });
  const ball = world.spawn(600, 560);
  ball.launch({ x: V_MAX, y: 0 }, 0);
  for (let i = 0; i < 12; i++) world.step();
  assert.equal(ball.touchedRim, true);
  assert.ok(ball.velocity.x < 0);
  assert.ok(ball.position.x < world.hoop.front.x);
});

test('World board and floor collisions set flags and dead balls continue fading before returning to the pool', () => {
  const events = [];
  const world = new World({ gravity: 0, airDrag: 0, onContact: event => events.push(event.type) });
  const ball = world.spawn(860, 400);
  ball.launch({ x: 1000, y: 0 }, 0);
  world.step();
  assert.equal(ball.touchedBoard, true); assert.ok(ball.velocity.x < 0); assert.deepEqual(events, ['sfx:board']);
  ball.position.set(300, FLOOR_Y - BALL_RADIUS - 1); ball.velocity.set(0, 1000);
  world.step();
  assert.equal(ball.outcome, 'floor'); assert.equal(ball.state, 'dead'); assert.ok(ball.velocity.y < 0);
  const floorPosition = ball.position.y;
  world.step(); assert.ok(ball.position.y < floorPosition);
  assert.ok(ball.opacity < 1 && ball.opacity > 0);
  for (let i = 0; i <= Math.ceil(DEAD_FADE_MS / (FIXED_DT * 1000)); i++) world.step();
  assert.equal(ball.state, 'inactive'); assert.equal(world.activeCount, 0);
  const reused = world.spawn(100, 200);
  assert.equal(reused, ball); assert.equal(reused.touchedRim, false); assert.equal(reused.touchedBoard, false);
  assert.equal(reused.touchedFloor, false); assert.equal(reused.shot.resolved, false); assert.equal(reused.opacity, 1);
});

test('World has a bounded pool, resets without reallocating and never collides balls with each other', () => {
  const world = new World({ gravity: 0, airDrag: 0 });
  const pool = world.balls;
  const first = world.spawn(300, 800);
  const second = world.spawn(300, 800);
  first.launch({ x: 100, y: 0 }, 0); second.launch({ x: 100, y: 0 }, 0);
  world.step();
  assert.deepEqual(first.position, second.position); near(first.velocity.x, 100);
  for (let i = 2; i < BALL_POOL_SIZE; i++) assert.ok(world.spawn(0, 0));
  assert.equal(world.spawn(0, 0), null);
  world.reset(); assert.equal(world.balls, pool); assert.equal(world.activeCount, 0);
  assert.equal(world.spawn(1, 2), first);
});

test('Hoop moves board, tips, gates and velocity as one kinematic collider', () => {
  const hoop = new Hoop();
  hoop.update(800, true);
  near(hoop.rimY, 630); near(hoop.front.y, 630); near(hoop.back.y, 630);
  near(hoop.board.minY, 410); near(hoop.gateBY, 700); near(hoop.velocity.y, 0);
  hoop.update(1600, true); near(hoop.velocity.y, -70 * 2 * Math.PI / 3.2);
  hoop.reset(); near(hoop.rimY, 560); near(hoop.previousRimY, 560);
});

test('Predicted points match fixed-step physics before any collision', () => {
  const world = new World();
  const ball = world.spawn(SPAWN_X, SPAWN_Y);
  ball.launch({ x: 300, y: -2700 }, 0);
  const prediction = new Float64Array(242);
  assert.equal(predictTrajectory(ball.position, ball.velocity, prediction), 121);
  for (let point = 1; point <= 15; point++) {
    for (let step = 0; step < 8; step++) world.step();
    near(ball.position.x, prediction[point * 2]); near(ball.position.y, prediction[point * 2 + 1]);
  }
});
