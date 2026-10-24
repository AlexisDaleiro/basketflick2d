import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../js/storage/Storage.js';
import { ResultSession } from '../js/game/ResultSession.js';
import { DemoPlayer } from '../js/game/DemoPlayer.js';
import * as C from '../js/config/constants.js';

const result = { score: 26, shots: 12, baskets: 10, swishes: 3, bestStreak: 5, durationSec: 45 };

test('Result entry saves anonymously before the counter or form; leaving preserves the round and copies the result', () => {
  const storage = new Storage({ now: () => Date.now() }).load(); const session = new ResultSession(storage);
  const source = { ...result }; session.enter(source); source.score = 0;
  assert.equal(storage.plays.length, 1); assert.equal(storage.plays[0].score, 26); assert.equal(storage.plays[0].name, null);
  assert.equal(session.displayedScore(), 0); session.update(0.45); assert.equal(session.displayedScore(), 13);
  session.update(0.45); assert.equal(session.displayedScore(), 26); assert.equal(session.phase, 'lead_form');
  session.exit(); assert.equal(storage.plays.length, 1); assert.equal(storage.plays[0].phone, null);
});

test('Invalid form cannot advance; valid save updates once and returns after 2.5 seconds with the selected destination', () => {
  for (const replay of [true, false]) {
    const storage = new Storage().load(); const session = new ResultSession(storage); session.enter(result);
    assert.equal(session.save({ name: 'Ana', phone: '123', consent: false }, replay).ok, false);
    assert.equal(session.phase, 'summary');
    assert.equal(session.save({ name: 'Ana', phone: '098123456', consent: true }, replay).ok, true);
    assert.equal(session.phase, 'thanks'); assert.equal(session.displayedScore(), 26);
    assert.equal(session.save({ name: 'Other' }, replay).ok, false); assert.equal(storage.plays.length, 1);
    assert.equal(storage.plays[0].name, 'Ana'); session.update(2.49); assert.equal(session.done, false);
    session.update(0.01); assert.equal(session.done, true); assert.equal(session.replay, replay);
  }
});

test('Demo uses real frontal contacts/scoring, launches every 2.2 s, never grows its pool and resets cleanly', () => {
  const demo = new DemoPlayer(() => 0.5); const balls = demo.world.balls; let baskets = 0;
  demo.world.onResolve = ball => { if (ball.outcome === 'basket') baskets++; };
  demo.reset(); demo.step(); assert.equal(demo.world.activeCount, 1);
  const firstLaunch = demo.nextShotAt;
  assert.equal(firstLaunch, C.DEMO_INTERVAL_MS);
  for (let i = 0; i < 240 * 60; i++) demo.step();
  assert.ok(baskets > 20); assert.equal(demo.world.balls, balls); assert.equal(balls.length, C.BALL_POOL_SIZE);
  demo.reset(); assert.equal(demo.world.activeCount, 0); assert.equal(demo.nextShotAt, 0);
});
