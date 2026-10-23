import test from 'node:test';
import assert from 'node:assert/strict';
import { Round } from '../js/game/Round.js';
import { Ball } from '../js/game/Ball.js';
import * as C from '../js/config/constants.js';

const ticks = ms => Math.round(ms / (C.FIXED_DT * C.MS_PER_SECOND));
const advance = (round, count) => { for (let i = 0; i < count; i++) round.step(); };
function live(options = {}) {
  const round = new Round(options);
  round.reset(); advance(round, ticks(C.COUNTDOWN_STEP_MS) * C.COUNTDOWN_STEPS);
  assert.equal(round.phase, 'live'); return round;
}
function flick(round, start = 0) {
  const ball = round.readyBall;
  if (!ball) return;
  round.onInput({ type: 'start', x: ball.position.x, y: ball.position.y, t: start });
  round.onInput({ type: 'move', x: ball.position.x + 15, y: ball.position.y - 135, t: start + 45 });
  round.onInput({ type: 'end', x: ball.position.x + 20, y: ball.position.y - 180, t: start + 60 });
}
function resolved(round, outcome, swish = false) {
  const ball = new Ball(99);
  ball.reset(800, 640); ball.state = 'dead'; ball.outcome = outcome;
  ball.shot.resolved = true; ball.swish = swish; ball.points = outcome === 'basket' ? (swish ? 3 : 2) : 0;
  round.inFlight++; round.shots++; round.resolveShot(ball);
  return ball;
}

test('Round shows 3, 2, 1, go for 700 ms each and blocks all countdown launches', () => {
  const events = [];
  const round = new Round({ onEvent: event => events.push([event.type, event.value]) });
  round.reset();
  for (let index = 0; index < C.COUNTDOWN_STEPS; index++) {
    assert.equal(round.countdownIndex, index); assert.equal(round.phase, 'countdown');
    flick(round, index * 100);
    assert.equal(round.shots, 0); assert.equal(round.readyBall.state, 'ready');
    advance(round, ticks(C.COUNTDOWN_STEP_MS) - 1); assert.equal(round.phase, 'countdown'); round.step();
  }
  assert.equal(round.phase, 'live'); assert.equal(round.remainingSec, 45);
  assert.deepEqual(events.filter(event => event[0] === 'countdown'), [['countdown', 0], ['countdown', 1], ['countdown', 2], ['countdown', 3]]);
});

test('Round uses supported 30/45/60 durations with no countdown time deducted', () => {
  for (const duration of C.ROUND_DURATIONS) {
    const round = new Round(); round.reset({ roundDurationSec: duration });
    advance(round, ticks(C.COUNTDOWN_STEP_MS) * C.COUNTDOWN_STEPS);
    assert.equal(round.remainingSec, duration);
    advance(round, ticks(1000)); assert.equal(round.remainingSec, duration - 1);
    advance(round, ticks((duration - 1) * 1000));
    assert.equal(round.phase, 'buzzer'); assert.equal(round.remainingSec, 0);
  }
});

test('Round spawns at x=360 first and a random ready ball exactly 450 ms after launch', () => {
  const round = live({ random: () => 1 });
  const first = round.readyBall;
  assert.equal(first.position.x, C.SPAWN_X);
  flick(round); assert.equal(round.shots, 1); assert.equal(round.readyBall, null);
  advance(round, ticks(C.RESPAWN_DELAY_MS) - 1); assert.equal(round.readyBall, null);
  round.step(); assert.equal(round.readyBall.position.x, C.SPAWN_X_RANGE[1]);
  assert.equal(round.readyBall.position.y, C.SPAWN_Y); assert.equal(first.state, 'flying');
});

test('Round caps flight at three balls, waits for capacity, then spawns without changing its pool', () => {
  const round = live({ random: () => 0.5 });
  const pool = round.world.balls;
  for (let shot = 0; shot < 3; shot++) { flick(round, shot * 200); advance(round, ticks(C.RESPAWN_DELAY_MS)); }
  assert.equal(round.shots, 3); assert.equal(round.inFlight, 3); assert.equal(round.readyBall, null);
  advance(round, ticks(200)); assert.equal(round.readyBall, null);
  const ball = pool.find(item => item.state === 'flying');
  ball.position.set(-200, 500); round.step();
  assert.equal(round.inFlight, 2); assert.ok(round.readyBall);
  assert.equal(round.world.balls, pool); assert.equal(pool.length, C.BALL_POOL_SIZE);
});

test('Round scores +2/+3; the third consecutive basket earns +1 and a miss extinguishes fire', () => {
  const events = [];
  const round = live({ onEvent: event => events.push([event.type, event.value]) });
  resolved(round, 'basket'); assert.equal(round.score, 2);
  resolved(round, 'basket', true); assert.equal(round.score, 5);
  resolved(round, 'basket'); assert.equal(round.score, 8); assert.equal(round.streak, 3);
  resolved(round, 'basket', true); assert.equal(round.score, 12); assert.equal(round.bestStreak, 4);
  resolved(round, 'floor'); assert.equal(round.streak, 0); assert.equal(round.bestStreak, 4);
  resolved(round, 'basket'); assert.equal(round.score, 14); assert.equal(round.streak, 1);
  assert.equal(round.baskets, 5); assert.equal(round.swishes, 2); assert.equal(round.shots, 6);
  assert.equal(events.filter(event => event[0] === 'fire').length, 1);
  assert.equal(events.filter(event => event[0] === 'extinguish').length, 1);
});

test('Round resolution order, not launch order, determines the streak', () => {
  const round = live();
  resolved(round, 'basket'); resolved(round, 'basket'); resolved(round, 'outside'); resolved(round, 'basket', true);
  assert.equal(round.streak, 1); assert.equal(round.score, 7); assert.equal(round.bestStreak, 2);
});

test('Buzzer blocks new shots, cancels an active swipe, permits in-flight scoring and holds the 1.2 s message', () => {
  const round = live();
  flick(round); advance(round, ticks(C.RESPAWN_DELAY_MS));
  const ready = round.readyBall;
  round.onInput({ type: 'start', x: ready.position.x, y: ready.position.y, t: 1000 });
  assert.equal(round.tracker.active, true);
  round.liveTicks = Math.round(round.settings.roundDurationSec / C.FIXED_DT) - 1;
  const flying = round.world.balls.find(ball => ball.state === 'flying');
  flying.position.set(800, 550); flying.previous.copy(flying.position); flying.velocity.set(0, 2000);
  round.step();
  assert.equal(round.phase, 'buzzer'); assert.equal(round.readyBall, null); assert.equal(round.tracker.active, false);
  round.onInput({ type: 'end', x: 800, y: 200, t: 1060 }); assert.equal(round.shots, 1);
  advance(round, ticks(100)); assert.equal(round.score, 3); assert.equal(round.inFlight, 0);
  advance(round, ticks(C.BUZZER_MIN_MS - 100) - 1); assert.equal(round.phase, 'buzzer');
  round.step(); assert.equal(round.phase, 'complete'); assert.equal(round.result.score, 3);
});

test('Buzzer hard deadline stops unresolved shots at 2.5 s and emits completion once', () => {
  let complete = 0;
  const round = live({ onEvent: event => { if (event.type === 'complete') complete++; } });
  round.world.gravity = 0; flick(round);
  const ball = round.world.balls.find(item => item.state === 'flying');
  ball.position.set(300, 900); ball.velocity.set(0, 0);
  round.liveTicks = Math.round(round.settings.roundDurationSec / C.FIXED_DT) - 1; round.step();
  advance(round, ticks(C.BUZZER_MAX_MS) - 1); assert.equal(round.phase, 'buzzer');
  round.step(); assert.equal(round.phase, 'complete'); assert.equal(ball.outcome, 'timeout');
  assert.equal(round.inFlight, 0); assert.equal(round.result.shots, 1);
  advance(round, 100); assert.equal(complete, 1);
});

test('Optional moving hoop starts smoothly only in the last 10 s and continues through buzzer', () => {
  const round = live(); round.settings.movingHoop = true;
  advance(round, ticks(34900)); assert.equal(round.world.movingHoop, false);
  advance(round, ticks(100)); assert.equal(round.world.movingHoop, true);
  assert.ok(Math.abs(round.world.hoop.rimY - C.RIM_Y) < 1e-8);
  advance(round, ticks(800)); assert.ok(Math.abs(round.world.hoop.rimY - C.RIM_Y - 70) < 1e-8);
  advance(round, ticks(9200)); assert.equal(round.phase, 'buzzer');
  const before = round.world.hoop.rimY;
  advance(round, ticks(800)); assert.equal(round.world.movingHoop, true);
  assert.notEqual(round.world.hoop.rimY, before);
});

test('Reset and abort cancel swipes and clear flight/score state without completing a discarded round', () => {
  let complete = 0;
  const round = live({ onEvent: event => { if (event.type === 'complete') complete++; } });
  flick(round); round.clear(); assert.equal(round.world.activeCount, 0); assert.equal(round.inFlight, 0);
  advance(round, 2000); assert.equal(complete, 0);
  round.reset(); assert.equal(round.score, 0); assert.equal(round.shots, 0); assert.equal(round.phase, 'countdown');
  assert.equal(round.world.activeCount, 1); assert.equal(round.prediction, null);
});

test('A full real flick scores in Round and advances all round statistics', () => {
  const round = live({ debug: true }); flick(round);
  advance(round, ticks(1800));
  assert.equal(round.score, 3); assert.equal(round.baskets, 1); assert.equal(round.swishes, 1);
  assert.equal(round.bestStreak, 1); assert.equal(round.predictionCount, 121);
});
