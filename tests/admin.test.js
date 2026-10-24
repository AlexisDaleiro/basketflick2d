import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { AdminGesture } from '../js/ui/AdminTrigger.js';
import { PinGuard } from '../js/game/PinGuard.js';
import { fnv1a64, hashPin, makeSalt } from '../js/storage/hash.js';
import { Storage } from '../js/storage/Storage.js';
import { Round } from '../js/game/Round.js';
import * as C from '../js/config/constants.js';

function backend() {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key), get length() { return map.size; }, key: index => [...map.keys()][index] };
}
const fallbackCrypto = { getRandomValues: bytes => bytes.fill(7) };
const sample = { score: 30, shots: 10, baskets: 8, swishes: 2, bestStreak: 5, durationSec: 45 };

test('Admin hold fires exactly once after 3000 ms, and movement beyond 20 px cancels it', () => {
  const gesture = new AdminGesture(); gesture.start(10, 10, 0);
  assert.equal(gesture.hold(2999), false); gesture.move(30, 10); assert.equal(gesture.hold(3000), true);
  assert.equal(gesture.hold(4000), false); assert.equal(gesture.end(4001), false);
  gesture.reset(); gesture.start(10, 10, 0); gesture.move(30.01, 10); assert.equal(gesture.hold(4000), false);
  assert.equal(gesture.end(4001), false);
});
test('Admin needs five taps in 2000 ms and cancelled gestures do not contribute', () => {
  const gesture = new AdminGesture();
  for (let i = 0; i < 5; i++) { gesture.start(0, 0, i * 500); assert.equal(gesture.end(i * 500), i === 4); }
  gesture.reset();
  for (let i = 0; i < 5; i++) { gesture.start(0, 0, i * 501); assert.equal(gesture.end(i * 501), false); }
  gesture.reset(); gesture.start(0, 0, 0); gesture.move(21, 0); assert.equal(gesture.end(10), false); assert.equal(gesture.taps, 0);
});
test('PIN hashing uses SHA-256(salt+pin), with a known FNV-1a 64-bit fallback and a 16-byte salt', async () => {
  const salt = makeSalt(fallbackCrypto); assert.equal(salt, '07'.repeat(16));
  const digest = await hashPin(salt, '1234', 'auto', webcrypto.subtle);
  assert.equal(digest.hash, createHash('sha256').update(salt + '1234').digest('hex')); assert.equal(digest.algorithm, 'sha256');
  assert.equal(fnv1a64('hello'), 'a430d84680aabd0b');
  const fallback = await hashPin(salt, '1234', 'auto', null); assert.equal(fallback.algorithm, 'fnv1a64'); assert.equal(fallback.hash.length, 16);
  await assert.rejects(hashPin(salt, '1234', 'sha256', null));
});
test('Default PIN is hashed, persists without plaintext, changes to 4–6 digits and fallback survives reload with SHA available', async () => {
  const data = backend(); const storage = new Storage({ backend: data }).load(); const guard = new PinGuard(storage, fallbackCrypto);
  await guard.initialize(); assert.equal(storage.settings.pinIsDefault, true); assert.equal(storage.settings.pinHash.length, 16);
  assert.equal((await guard.verify('1234')).ok, true); assert.equal(await guard.setPin('12'), false);
  assert.equal(await guard.setPin('1234567'), false); assert.equal(await guard.setPin('654321'), true);
  assert.equal(storage.settings.pinIsDefault, false);
  const serialized = data.getItem(C.STORAGE_PREFIX + 'settings'); assert.equal(serialized.includes('654321'), false);
  const reloaded = new Storage({ backend: data }).load(); const next = new PinGuard(reloaded, webcrypto);
  assert.equal((await next.verify('1234')).ok, false); assert.equal((await next.verify('654321')).ok, true);
});
test('Three failures lock the PIN for 30 seconds across modal/repository reloads; correct PIN resets failures after expiry', async () => {
  const data = backend(); let now = 100000;
  const storage = new Storage({ backend: data, now: () => now }).load(); const guard = new PinGuard(storage, fallbackCrypto);
  await guard.initialize();
  for (let i = 0; i < 3; i++) assert.equal((await guard.verify('0000')).ok, false);
  assert.equal(guard.remaining(), 30); assert.equal((await guard.verify('1234')).ok, false);
  const next = new PinGuard(new Storage({ backend: data, now: () => now }).load(), fallbackCrypto);
  assert.equal(next.remaining(), 30); now += 29999; assert.equal(next.remaining(), 1);
  now++; assert.equal((await next.verify('1234')).ok, true); assert.equal(next.failures, 0);
});
test('Initialization is safe under concurrent calls and denied storage still permits session PIN access', async () => {
  const storage = new Storage().load(); const guard = new PinGuard(storage, webcrypto);
  await Promise.all([guard.initialize(), guard.initialize()]);
  assert.equal((await guard.verify('1234')).ok, true); assert.equal(storage.warning, 'storageUnavailable');
});
test('Admin settings persist across reload, preserve credential hashes, and delivery survives ranking reset', async () => {
  const data = backend(); const storage = new Storage({ backend: data }).load(); const guard = new PinGuard(storage, fallbackCrypto);
  await guard.initialize(); const hash = storage.settings.pinHash;
  assert.equal(storage.saveSettings({ roundDurationSec: 30, sensitivity: 1.25, aimAssist: 0.4, prizeThreshold: 30, maxPrizesPerDay: 1, movingHoop: true, soundEnabled: false }, 'Tablet B'), true);
  const entry = storage.addPlay(sample); assert.equal(storage.markDelivered(entry.play.id, true), true);
  storage.resetRanking(); assert.equal(storage.ranking().length, 0); assert.equal(storage.prizesAvailable(), false);
  const next = new Storage({ backend: data }).load(); assert.equal(next.settings.roundDurationSec, 30); assert.equal(next.settings.pinHash, hash);
  assert.equal(next.meta.deviceLabel, 'Tablet B'); assert.equal(next.plays[0].prizeDelivered, true);
  assert.equal(next.markDelivered('missing', true), false);
});
test('Explicit deletion removes only the application namespace and reinitializes its data', () => {
  const data = backend(); data.setItem('unrelated', 'keep'); const storage = new Storage({ backend: data }).load();
  storage.addPlay(sample); storage.saveSettings({ eventName: 'Changed' });
  assert.equal(storage.clearAll(), true); assert.equal(storage.plays.length, 0); assert.equal(storage.settings.eventName, 'Expo 2026');
  assert.equal(data.getItem('unrelated'), 'keep'); assert.equal(storage.meta.playCounter, 0);
});
test('Practice lasts 20 s with the same countdown/buzzer, is never stored, and ordinary rounds retain their selected duration', () => {
  const round = new Round(); round.reset({ practice: true, roundDurationSec: 30 });
  assert.equal(round.remainingSec, 20);
  for (let i = 0; i < 240 * 25; i++) round.step();
  assert.equal(round.phase, 'complete'); assert.equal(round.result.durationSec, 20); assert.equal(round.result.practice, true);
  const storage = new Storage().load(); assert.equal(storage.addPlay(round.result), null); assert.equal(storage.plays.length, 0);
  round.reset({ practice: false, roundDurationSec: 30 }); assert.equal(round.remainingSec, 30);
});
