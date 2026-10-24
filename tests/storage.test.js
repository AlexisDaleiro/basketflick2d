import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { Storage } from '../js/storage/Storage.js';
import { dailyRanking, dailyPrizes, publicName } from '../js/storage/ranking.js';
import { normalizePhone, validateLead } from '../js/storage/leads.js';
import { repairSettings } from '../js/storage/schema.js';
import { STORAGE_PREFIX, ERROR_LIMIT, STORAGE_WARNING_BYTES } from '../js/config/constants.js';

export class MemoryBackend {
  constructor() { this.items = new Map(); }
  get length() { return this.items.size; }
  key(index) { return [...this.items.keys()][index]; }
  getItem(key) { return this.items.get(key) ?? null; }
  setItem(key, value) { this.items.set(key, value); }
}
const result = score => ({ score, shots: 10, baskets: 5, swishes: 2, bestStreak: 3, durationSec: 45 });
const now = new Date(2026, 9, 23, 12).getTime();
function repository(backend = new MemoryBackend()) { return new Storage({ backend, now: () => now, random: () => 0.5 }).load(); }

test('Uruguayan mobile validation accepts all specified forms and rejects foreign or malformed numbers', () => {
  for (const phone of ['098123456', '98123456', '+59898123456', '59898123456', '098 123 456', '+598 98-123-456']) {
    assert.equal(normalizePhone(phone), '+59898123456');
  }
  for (const phone of ['12345678', '09812345', '+54998123456', '0981234567', '09abc3456', '++59898123456', '(098)123456']) assert.equal(normalizePhone(phone), null);
  assert.equal(normalizePhone('  '), '');
});

test('Lead validation requires consent only for a phone, caps the name and normalizes consent', () => {
  assert.equal(validateLead({ name: 'Ana', phone: '098123456', consent: false }).error, 'consentRequired');
  assert.equal(validateLead({ name: '', phone: '123', consent: true }).error, 'phoneInvalid');
  assert.deepEqual(validateLead({ name: ' Ana ', phone: '', consent: true }), { ok: true, name: 'Ana', phone: null, consent: false });
  assert.equal(validateLead({ name: 'A'.repeat(30), phone: '', consent: false }).name.length, 24);
});

test('dayKey at 22:30 Uruguay stays on the local day even when UTC is tomorrow', () => {
  const script = "import {dayKey} from './js/storage/ranking.js'; process.stdout.write(dayKey(new Date('2026-10-24T01:30:00Z')));";
  const value = execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: 'America/Montevideo' }, encoding: 'utf8' });
  assert.equal(value, '2026-10-23');
});

test('Storage initializes schema and device identity, persists anonymous results, and updates the same record with a lead', () => {
  const store = repository(); const entry = store.addPlay(result(25));
  assert.match(entry.play.id, /^[A-HJ-NP-Z2-9]{4}-000001$/);
  assert.equal(entry.play.name, null); assert.equal(entry.play.leadAt, null); assert.equal(entry.position, 1);
  const saved = store.saveLead(entry.play.id, { name: '<img src=x onerror=alert(1)>', phone: '098 123 456', consent: true });
  assert.equal(saved.ok, true); assert.equal(saved.durable, true);
  assert.equal(store.plays.length, 1); assert.equal(saved.play.phone, '+59898123456');
  const reloaded = repository(store.backend);
  assert.equal(reloaded.plays[0].phone, '+59898123456'); assert.equal(reloaded.meta.playCounter, 1);
  reloaded.load(); assert.equal(reloaded.plays.length, 1);
});

test('Prize threshold is inclusive, cap counts winners despite ranking reset and codes stay unique with a fixed RNG', () => {
  const store = repository(); store.settings.maxPrizesPerDay = 2;
  assert.equal(store.addPlay(result(23)).play.prizeWon, false);
  const first = store.addPlay(result(24)); const second = store.addPlay(result(24));
  assert.equal(first.play.prizeWon, true); assert.match(first.play.prizeCode, /^TD-[A-HJ-NP-Z2-9]{4}$/);
  assert.notEqual(first.play.prizeCode, second.play.prizeCode);
  store.meta.rankingResetAt = now;
  assert.equal(store.ranking().length, 0); assert.equal(store.prizesAvailable(), false);
  assert.equal(store.addPlay(result(80)).play.prizeWon, false);
  assert.equal(dailyPrizes(store.plays, first.play.dayKey), 2);
});

test('Ranking sorts score, fewer shots, earlier timestamp and applies local-day/reset filters without mutating plays', () => {
  const plays = [
    { id: 'a', score: 10, shots: 5, ts: 3, dayKey: 'today' },
    { id: 'b', score: 10, shots: 4, ts: 2, dayKey: 'today' },
    { id: 'c', score: 10, shots: 4, ts: 1, dayKey: 'today' },
    { id: 'd', score: 80, shots: 5, ts: 4, dayKey: 'yesterday' },
  ];
  assert.deepEqual(dailyRanking(plays, 'today').map(play => play.id), ['c', 'b', 'a']);
  assert.deepEqual(dailyRanking(plays, 'today', 2).map(play => play.id), ['a']);
  assert.equal(plays[0].id, 'a');
});

test('New record requires a strictly higher score; public moderation keeps the original stored name', () => {
  const store = repository(); assert.equal(store.addPlay(result(10)).newRecord, true);
  assert.equal(store.addPlay(result(10)).newRecord, false); assert.equal(store.addPlay(result(11)).newRecord, true);
  const entry = store.addPlay(result(12)); store.saveLead(entry.play.id, { name: 'Mierda', phone: '', consent: false });
  assert.equal(publicName(entry.play), null); assert.equal(entry.play.name, 'Mierda');
  assert.equal(publicName({ name: 'Ana' }), 'Ana');
});

test('Corrupt JSON is backed up, reset and recorded without throwing', () => {
  const backend = new MemoryBackend(); backend.setItem(STORAGE_PREFIX + 'plays', '{invalid');
  const store = repository(backend);
  assert.deepEqual(store.plays, []); assert.ok(store.errors.some(error => error.msg.includes('plays')));
  assert.equal(backend.getItem(`${STORAGE_PREFIX}corrupt.${now}.plays`), '{invalid');
  assert.equal(backend.getItem(STORAGE_PREFIX + 'plays'), '[]');
});

test('v0 data migrates missing fields, repairs settings, deduplicates plays and recovers the counter', () => {
  const store = repository(); const play = store.addPlay(result(10)).play;
  const backend = store.backend;
  backend.setItem(STORAGE_PREFIX + 'meta', JSON.stringify({ deviceId: store.meta.deviceId, schemaVersion: 0 }));
  backend.setItem(STORAGE_PREFIX + 'plays', JSON.stringify([play, play, { garbage: true }]));
  const loaded = repository(backend);
  assert.equal(loaded.meta.schemaVersion, 1); assert.equal(loaded.meta.playCounter, 1); assert.equal(loaded.plays.length, 1);
  assert.equal(loaded.addPlay(result(12)).play.id.endsWith('000002'), true);
  assert.equal(repairSettings({ sensitivity: Infinity, roundDurationSec: 20, prizeThreshold: -3 }).prizeThreshold, 24);
});

test('Unavailable/quota-exhausted storage retains session results, warns persistently and never reports durable lead saving', () => {
  const backend = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('QuotaExceededError'); } };
  const store = repository(backend); const entry = store.addPlay(result(30));
  assert.equal(store.warning, 'storageUnavailable'); assert.equal(store.plays.length, 1);
  const lead = store.saveLead(entry.play.id, { name: 'Ana', phone: '', consent: false });
  assert.equal(lead.ok, true); assert.equal(lead.durable, false);
  assert.doesNotThrow(() => store.recordError('failed'));
});

test('A future schema is never overwritten and error log remains bounded', () => {
  const backend = new MemoryBackend(); const future = JSON.stringify({ schemaVersion: 99 });
  backend.setItem(STORAGE_PREFIX + 'meta', future);
  const store = repository(backend); assert.equal(store.warning, 'storageVersion');
  assert.equal(backend.getItem(STORAGE_PREFIX + 'meta'), future);
  const current = repository();
  for (let i = 0; i < ERROR_LIMIT + 3; i++) current.recordError(String(i));
  assert.equal(current.errors.length, ERROR_LIMIT); assert.equal(current.errors[0].msg, '3');
});

test('Storage warns above 4 MiB including corrupt backups and rejects invalid results without adding a play', () => {
  const backend = new MemoryBackend(); backend.setItem(STORAGE_PREFIX + 'corrupt.old', 'x'.repeat(STORAGE_WARNING_BYTES / 2));
  const store = repository(backend); assert.equal(store.warning, 'storageFull');
  assert.equal(store.addPlay({ score: -1 }), null); assert.equal(store.plays.length, 0);
});
