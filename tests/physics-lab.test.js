import test from 'node:test';
import assert from 'node:assert/strict';
import { PhysicsLab } from '../js/game/PhysicsLab.js';

test('H2 harness accepts flick, predicts in debug, resolves and reuses a single ball', () => {
  const lab = new PhysicsLab({ debug: true });
  lab.reset();
  const ball = lab.ball;
  lab.onInput({ type: 'start', x: 360, y: 1380, t: 0 });
  lab.onInput({ type: 'move', x: 375, y: 1245, t: 45 });
  lab.onInput({ type: 'end', x: 380, y: 1200, t: 60 });
  assert.equal(ball.state, 'flying');
  assert.equal(lab.predictionCount, 121);
  assert.equal(lab.feedback, 'flying');
  let sawBasket = false;
  for (let step = 0; step < 1400; step++) {
    lab.step();
    if (lab.feedback === 'swish' || lab.feedback === 'basket') sawBasket = true;
  }
  assert.equal(sawBasket, true);
  assert.equal(lab.ball, ball);
  assert.equal(lab.ball.state, 'ready');
  assert.equal(lab.world.activeCount, 1);
  assert.equal(lab.world.balls.length, 6);
});

test('H2 cancellation, rejection, reset and exit never launch or retain a ball', () => {
  const lab = new PhysicsLab();
  lab.reset();
  assert.equal(lab.prediction, null);
  lab.onInput({ type: 'start', x: 360, y: 1380, t: 0 });
  lab.onInput({ type: 'cancel', x: 360, y: 1380, t: 1 });
  lab.onInput({ type: 'end', x: 400, y: 1100, t: 50 });
  assert.equal(lab.ball.state, 'ready');
  lab.onInput({ type: 'start', x: 360, y: 1380, t: 100 });
  lab.onInput({ type: 'end', x: 360, y: 1375, t: 120 });
  assert.equal(lab.feedback, 'rejected');
  assert.equal(lab.ball.state, 'ready');
  lab.reset(); assert.equal(lab.feedback, 'ready');
  lab.clear(); assert.equal(lab.ball, null); assert.equal(lab.world.activeCount, 0); assert.equal(lab.tracker.active, false);
});
