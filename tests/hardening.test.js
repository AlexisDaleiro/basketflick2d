import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ErrorGuard } from '../js/core/ErrorGuard.js';
import { GameLoop } from '../js/core/GameLoop.js';
import { APP_VERSION, ERROR_REPEAT_MS, FIXED_DT, MS_PER_SECOND, STATES } from '../js/config/constants.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(join(root, 'sw.js'), 'utf8');
const assets = [...source.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
const files = dir => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? files(join(dir, entry.name)) : [`./${relative(root, join(root, dir, entry.name)).split(sep).join('/')}`]);

test('sw.js precaches every /js, /css and /icons file, the shell and only files that exist', () => {
  for (const file of ['js', 'css', 'icons'].flatMap(files)) assert.ok(assets.includes(file), `missing from precache: ${file}`);
  for (const file of ['./', './index.html', './manifest.webmanifest']) assert.ok(assets.includes(file));
  for (const file of assets.filter(asset => asset !== './')) assert.ok(existsSync(join(root, file)), `listed but absent: ${file}`);
  assert.equal(new Set(assets).size, assets.length);
});

test('Release version is aligned across APP_VERSION, package.json and the cache name', () => {
  assert.equal(source.match(/const VERSION = '([^']+)'/)[1], APP_VERSION);
  assert.equal(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version, APP_VERSION);
});

function loadWorker() {
  const base = 'https://kiosk.test/app/sw.js';
  const listeners = {}; const stores = new Map(); const worker = { skipped: 0, stores, listeners };
  class Request { constructor(url, init = {}) { this.url = new URL(url, base).href; this.cache = init.cache; this.method = 'GET'; } }
  const key = (url, ignoreSearch) => { const parsed = new URL(url); return ignoreSearch ? parsed.origin + parsed.pathname : parsed.href; };
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(requests) { for (const request of requests) store.set(request.url, request); },
        async match(request, { ignoreSearch = false } = {}) {
          for (const [url, entry] of store) if (key(url, ignoreSearch) === key(request.url, ignoreSearch)) return entry;
          return undefined;
        },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const self = { location: new URL(base), addEventListener: (type, listener) => { listeners[type] = listener; }, skipWaiting: () => { worker.skipped++; } };
  vm.runInNewContext(source, { self, caches, Request, URL, Promise, fetch: async request => ({ network: request.url }) });
  return worker;
}
async function dispatch(worker, type, extra = {}) {
  let pending = null; let responded = null;
  worker.listeners[type]({ waitUntil: promise => { pending = promise; }, respondWith: promise => { responded = promise; }, ...extra });
  await pending; return responded ? await responded : null;
}

test('Service worker caches with reload, removes only old app caches and waits for the admin to skip waiting', async () => {
  const worker = loadWorker();
  worker.stores.set('tb2d-v0.5.0', new Map()); worker.stores.set('other-app', new Map());
  await dispatch(worker, 'install');
  const current = worker.stores.get(`tb2d-v${APP_VERSION}`);
  assert.equal(current.size, assets.length);
  assert.ok([...current.values()].every(request => request.cache === 'reload'));
  assert.equal(worker.skipped, 0);
  await dispatch(worker, 'activate');
  assert.deepEqual([...worker.stores.keys()].sort(), ['other-app', `tb2d-v${APP_VERSION}`]);
  await dispatch(worker, 'message', { data: { type: 'OTHER' } }); assert.equal(worker.skipped, 0);
  await dispatch(worker, 'message', { data: { type: 'SKIP_WAITING' } }); assert.equal(worker.skipped, 1);
});

test('Service worker is cache-first, opens ?debug=1 offline and leaves foreign or non-GET requests alone', async () => {
  const worker = loadWorker(); await dispatch(worker, 'install');
  const request = (url, mode = 'no-cors', method = 'GET') => ({ request: { url, mode, method } });
  const shell = await dispatch(worker, 'fetch', request('https://kiosk.test/app/?debug=1', 'navigate'));
  assert.equal(shell.url, 'https://kiosk.test/app/');
  assert.equal((await dispatch(worker, 'fetch', request('https://kiosk.test/app/js/main.js'))).url, 'https://kiosk.test/app/js/main.js');
  assert.deepEqual(await dispatch(worker, 'fetch', request('https://kiosk.test/app/tests/h5-preview.html', 'navigate')),
    { network: 'https://kiosk.test/app/tests/h5-preview.html' });
  assert.equal(await dispatch(worker, 'fetch', request('https://cdn.example/x.js')), null);
  assert.equal(await dispatch(worker, 'fetch', request('https://kiosk.test/app/', 'navigate', 'POST')), null);
});

test('Manifest and shell declare an installable fullscreen PWA with existing icons', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'fullscreen'); assert.deepEqual(manifest.display_override, ['fullscreen', 'standalone']);
  assert.equal(manifest.orientation, 'any'); assert.equal(manifest.background_color, '#000000'); assert.equal(manifest.theme_color, '#000000');
  for (const icon of manifest.icons) assert.ok(assets.includes(`./${icon.src}`), icon.src);
  for (const size of ['192x192', '512x512']) assert.ok(manifest.icons.some(icon => icon.sizes === size && icon.type === 'image/png'));
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  for (const tag of ['rel="manifest"', 'rel="apple-touch-icon" href="./icons/apple-touch-icon.png"', 'name="apple-mobile-web-app-capable"']) assert.ok(html.includes(tag), tag);
});

function makeGuard(current) {
  const records = []; const transitions = []; let time = 0; const listeners = {};
  const machine = { current, transition: next => { transitions.push(next); machine.current = next; return true; } };
  const guard = new ErrorGuard({
    target: { addEventListener: (type, listener) => { listeners[type] = listener; } },
    storage: { recordError: (msg, state, stack) => records.push({ msg, state, stack }) }, machine, now: () => time,
  });
  guard.start();
  return { guard, records, transitions, listeners, machine, advance: ms => { time += ms; } };
}

test('Uncaught error during PLAYING is stored with its state and returns to the attract screen', () => {
  const { records, transitions, listeners, machine } = makeGuard(STATES.PLAYING);
  listeners.error({ error: new TypeError('forced'), message: 'Uncaught TypeError: forced' });
  assert.equal(records.length, 1); assert.equal(records[0].msg, 'TypeError: forced');
  assert.equal(records[0].state, STATES.PLAYING); assert.match(records[0].stack, /forced/);
  assert.deepEqual(transitions, [STATES.ATTRACT_MODE]); assert.equal(machine.current, STATES.ATTRACT_MODE);
});

test('Errors outside PLAYING are only stored; per-frame repeats are stored once per burst', () => {
  const { records, transitions, listeners, advance } = makeGuard(STATES.ATTRACT_MODE);
  for (let i = 0; i < 120; i++) { listeners.error({ error: null, message: 'Script error.' }); advance(16); }
  listeners.unhandledrejection({ reason: 'rejected' });
  advance(ERROR_REPEAT_MS); listeners.unhandledrejection({ reason: 'rejected' });
  assert.deepEqual(records.map(record => record.msg), ['Script error.', 'rejected', 'rejected']);
  assert.equal(records[0].state, STATES.ATTRACT_MODE); assert.deepEqual(transitions, []);
});

test('GameLoop keeps scheduling frames after a step throws and does not replay the failed step', () => {
  const pending = []; let calls = 0;
  const loop = new GameLoop({
    update: () => { calls++; if (calls === 1) throw new Error('step'); }, render: () => {},
    requestFrame: callback => pending.push(callback), cancelFrame: () => {},
  });
  loop.start(); pending.shift()(0);
  assert.throws(() => pending.shift()(FIXED_DT * MS_PER_SECOND * 1.5), /step/);
  assert.equal(pending.length, 1);
  pending.shift()(FIXED_DT * MS_PER_SECOND * 2.5);
  assert.equal(calls, 2);
});

test('Soak: 8 simulated hours of attract demo plus 200 rounds keep pools fixed and long-lived memory flat', () => {
  const script = `
    const { DemoPlayer } = await import('./js/game/DemoPlayer.js');
    const { Round } = await import('./js/game/Round.js');
    const C = await import('./js/config/constants.js');
    let seed = 7; const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const demo = new DemoPlayer(random); const demoBalls = demo.world.balls;
    const round = new Round({ random }); const roundBalls = round.world.balls;
    const v8 = await import('node:v8');
    // Old space holds long-lived app objects; code space grows with JIT tiering and plateaus on its own.
    const heap = () => { globalThis.gc(); globalThis.gc(); return v8.getHeapSpaceStatistics().find(space => space.space_name === 'old_space').space_used_size; };
    const ticksPerHour = 3600 / C.FIXED_DT;
    const playRound = () => {
      round.reset({ durationSec: 30 }); let tick = 0;
      while (round.phase !== 'complete') {
        round.step(); tick++;
        const ball = round.readyBall; const t = tick * C.FIXED_DT * 1000;
        if (ball && round.phase === 'live' && tick % 144 === 0) {
          round.onInput({ type: 'start', x: ball.position.x, y: ball.position.y, t });
          round.onInput({ type: 'move', x: ball.position.x, y: ball.position.y - 135, t: t + 45 });
          round.onInput({ type: 'end', x: ball.position.x, y: ball.position.y - 180, t: t + 60 });
        }
      }
      return round.shots;
    };
    // Eight kiosk-like hours: 1 h of attract demo, then 25 rounds. Hours 1-4 absorb JIT warm-up
    // (V8 recompiles code the other mode left idle); hours 5-8 must keep long-lived memory flat.
    const hour = () => {
      let shots = 0;
      for (let i = 0; i < ticksPerHour; i++) demo.step();
      for (let i = 0; i < 25; i++) shots += playRound();
      return shots;
    };
    demo.reset();
    let shots = 0; let before = 0;
    // Collect every hour, as a long-running page would: V8 only ages out idle bytecode across many GCs.
    for (let h = 1; h <= 8; h++) { shots += hour(); const used = heap(); if (h === 4) before = used; }
    const after = heap();
    console.log(JSON.stringify({ growth: after - before, shots, active: demo.world.activeCount,
      demoSame: demo.world.balls === demoBalls && demoBalls.length === C.BALL_POOL_SIZE,
      roundSame: round.world.balls === roundBalls && roundBalls.length === C.BALL_POOL_SIZE }));
  `;
  const output = execFileSync(process.execPath, ['--expose-gc', '--input-type=module', '-e', script], { cwd: root, encoding: 'utf8' });
  const report = JSON.parse(output.trim().split('\n').at(-1));
  assert.ok(report.demoSame && report.roundSame, 'pools must be reused, never replaced or grown');
  assert.ok(report.active <= 6); assert.ok(report.shots > 200 * 20, `rounds must actually play (${report.shots} shots)`);
  assert.ok(report.growth < 128 * 1024, `heap grew ${report.growth} bytes`);
});
