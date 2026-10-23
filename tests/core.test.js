import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../js/core/EventBus.js';
import { StateMachine } from '../js/core/StateMachine.js';
import { GameLoop } from '../js/core/GameLoop.js';
import { IdleWatcher } from '../js/core/IdleWatcher.js';
import { FIXED_DT, IDLE_TIMEOUT_MS, IDLE_WARNING_MS, MAX_STEPS_PER_FRAME, MS_PER_SECOND, STATES } from '../js/config/constants.js';

test('EventBus delivers payloads and removes empty subscriptions', () => {
  const bus = new EventBus();
  const values = [];
  const off = bus.on('sample', value => values.push(value));
  bus.emit('sample', 7);
  off();
  off();
  bus.emit('sample', 8);
  assert.deepEqual(values, [7]);
  assert.equal(bus.listeners.size, 0);
});

function makeMachine(development = true) {
  const bus = new EventBus();
  const history = [];
  const active = new Set();
  const states = Object.fromEntries(Object.values(STATES).map(name => [name, {
    enter: payload => { active.add(name); history.push(['enter', name, payload]); },
    exit: () => { active.delete(name); history.push(['exit', name]); },
    update: dt => history.push(['update', name, dt]),
    render: ctx => history.push(['render', name, ctx]),
    onInput: event => history.push(['input', name, event]),
  }]));
  const machine = new StateMachine({ states, bus, development });
  return { machine, bus, history, active };
}

test('StateMachine enforces initialization, transitions, lifecycle order and payloads', () => {
  const { machine, bus, history, active } = makeMachine();
  const changes = [];
  bus.on('state:change', event => changes.push(event));
  assert.throws(() => machine.transition(STATES.PLAYING), /Invalid state/);
  machine.transition(STATES.ATTRACT_MODE);
  const payload = { source: 'test' };
  machine.transition(STATES.PLAYING, payload);
  assert.deepEqual(history.slice(-2), [['exit', STATES.ATTRACT_MODE], ['enter', STATES.PLAYING, payload]]);
  assert.deepEqual(changes.at(-1), { previous: STATES.ATTRACT_MODE, current: STATES.PLAYING });
  machine.update(FIXED_DT);
  machine.render('context');
  machine.onInput('gesture');
  assert.deepEqual(history.slice(-3), [['update', STATES.PLAYING, FIXED_DT], ['render', STATES.PLAYING, 'context'], ['input', STATES.PLAYING, 'gesture']]);
  machine.transition(STATES.GAME_OVER);
  machine.transition(STATES.PLAYING);
  machine.transition(STATES.ADMIN_PANEL);
  assert.deepEqual([...active], [STATES.ADMIN_PANEL]);
  assert.throws(() => machine.transition(STATES.GAME_OVER), /Invalid state/);
  machine.transition(STATES.ATTRACT_MODE);
  machine.destroy();
  assert.equal(active.size, 0);
});

test('StateMachine ignores invalid transitions in production without lifecycle changes', () => {
  const { machine, history } = makeMachine(false);
  machine.transition(STATES.ATTRACT_MODE);
  assert.equal(machine.transition(STATES.GAME_OVER), false);
  assert.equal(machine.transition(STATES.ATTRACT_MODE), false);
  assert.equal(machine.transition('UNKNOWN'), false);
  assert.equal(history.length, 1);
  assert.equal(machine.current, STATES.ATTRACT_MODE);
});

test('StateMachine rejects a missing or extra state', () => {
  assert.throws(() => new StateMachine({ states: {}, bus: new EventBus() }), /exactly/);
});

function makeLoop() {
  const updates = [];
  const renders = [];
  const pending = new Map();
  let id = 0;
  const loop = new GameLoop({
    update: dt => updates.push(dt), render: alpha => renders.push(alpha),
    requestFrame: callback => { pending.set(++id, callback); return id; },
    cancelFrame: frameId => pending.delete(frameId),
  });
  function tick(timestamp) {
    const [frameId, callback] = pending.entries().next().value;
    pending.delete(frameId);
    callback(timestamp);
  }
  return { loop, updates, renders, pending, tick };
}

test('GameLoop uses fixed steps, schedules only one rAF and cancels on stop', () => {
  const { loop, tick, updates, renders, pending } = makeLoop();
  loop.start();
  loop.start();
  assert.equal(pending.size, 1);
  tick(0);
  tick(FIXED_DT * MS_PER_SECOND * 2.5);
  assert.deepEqual(updates, [FIXED_DT, FIXED_DT]);
  assert.ok(Math.abs(renders.at(-1) - 0.5) < 1e-10);
  loop.stop();
  assert.equal(pending.size, 0);
  loop.start();
  tick(100000);
  assert.equal(updates.length, 2, 'resume must not simulate suspended time');
  loop.stop();
});

test('GameLoop caps catch-up and discards excess accumulated time', () => {
  const { loop, tick, updates, renders } = makeLoop();
  loop.start();
  tick(0);
  tick(5000);
  assert.equal(updates.length, MAX_STEPS_PER_FRAME);
  assert.equal(loop.accumulator, 0);
  assert.equal(renders.at(-1), 0);
  loop.stop();
});

test('GameLoop invokes native frame APIs with their required global receiver', () => {
  const previousRequest = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  try {
    globalThis.requestAnimationFrame = function () { assert.equal(this, globalThis); return 1; };
    globalThis.cancelAnimationFrame = function () { assert.equal(this, globalThis); };
    const loop = new GameLoop({ update: () => {}, render: () => {} });
    loop.start();
    loop.stop();
  } finally {
    if (previousRequest) globalThis.requestAnimationFrame = previousRequest;
    else delete globalThis.requestAnimationFrame;
    if (previousCancel) globalThis.cancelAnimationFrame = previousCancel;
    else delete globalThis.cancelAnimationFrame;
  }
});

test('IdleWatcher warns 5…1, expires once, and stays disabled in attract mode', () => {
  let now = 0;
  let expired = 0;
  const warnings = [];
  const idle = new IdleWatcher({ target: new EventTarget(), now: () => now,
    onWarning: seconds => warnings.push(seconds), onTimeout: () => expired++ });
  idle.setEnabled(true);
  now = IDLE_WARNING_MS - 1;
  idle.update();
  assert.deepEqual(warnings, []);
  for (now = IDLE_WARNING_MS; now < IDLE_TIMEOUT_MS; now += MS_PER_SECOND) idle.update();
  assert.deepEqual(warnings, [5, 4, 3, 2, 1]);
  now = IDLE_TIMEOUT_MS;
  idle.update();
  idle.update();
  assert.equal(expired, 1);
  assert.equal(warnings.at(-1), 0);
  now += IDLE_TIMEOUT_MS;
  idle.update();
  assert.equal(expired, 1);
});

test('IdleWatcher resets on each required activity and removes listeners on destroy', () => {
  let now = 0;
  const target = new EventTarget();
  const idle = new IdleWatcher({ target, now: () => now, onWarning: () => {}, onTimeout: () => {} });
  idle.start();
  idle.start();
  idle.setEnabled(true);
  for (const type of ['touchstart', 'pointerdown', 'keydown', 'input']) {
    now += 100;
    target.dispatchEvent(new Event(type));
    assert.equal(idle.lastActivity, now);
  }
  idle.destroy();
  const previous = idle.lastActivity;
  now += 100;
  target.dispatchEvent(new Event('touchstart'));
  assert.equal(idle.lastActivity, previous);
});
