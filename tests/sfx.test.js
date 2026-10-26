import test from 'node:test';
import assert from 'node:assert/strict';
import { Sfx } from '../js/audio/Sfx.js';
import { SFX_MASTER_VOLUME, SFX_MAX_VOICES } from '../js/config/constants.js';

function audioFixture() {
  const sources = [];
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param() });
  const source = () => { const s = { ...node(), start() {}, stop() {} }; sources.push(s); return s; };
  const context = {
    state: 'suspended', sampleRate: 8000, currentTime: 0, destination: {},
    createGain: node, createBiquadFilter: node, createOscillator: source, createBufferSource: source,
    createBuffer: (channels, size) => ({ getChannelData: () => new Float32Array(size) }),
    async resume() { this.state = 'running'; }, async suspend() { this.state = 'suspended'; }, async close() { this.state = 'closed'; },
  };
  const sfx = new Sfx({ createContext: () => context });
  return { context, sfx, sources };
}

test('Sfx stays silent when Web Audio is unavailable, denied, locked or disabled', async () => {
  const missing = new Sfx({ createContext: () => null });
  await missing.unlock(); missing.play('buzzer'); assert.equal(missing.unavailable, true);
  const denied = new Sfx({ createContext: () => { throw new Error('denied'); } });
  await denied.unlock(); assert.equal(denied.unavailable, true);
  const { sfx, sources } = audioFixture();
  sfx.play('swish'); assert.equal(sources.length, 0);
  await sfx.unlock(); sfx.setEnabled(false); sfx.play('buzzer'); assert.equal(sources.length, 0);
  const retry = audioFixture();
  retry.context.resume = async () => { throw new Error('gesture required'); };
  await retry.sfx.unlock(); assert.equal(retry.sfx.unavailable, false);
  retry.context.resume = async () => { retry.context.state = 'running'; };
  await retry.sfx.unlock(); retry.sfx.play('tick'); assert.equal(retry.sources.length, 1);
});

test('Sfx enforces its voice limit, releases ended sources and sets master volume to 0.6', async () => {
  const { sfx, sources } = audioFixture(); await sfx.unlock();
  assert.equal(sfx.master.gain.value, SFX_MASTER_VOLUME);
  for (let i = 0; i < SFX_MAX_VOICES + 5; i++) sfx.play('tick');
  assert.equal(sources.length, SFX_MAX_VOICES);
  sources[0].onended({ target: sources[0] }); sfx.play('tick');
  assert.equal(sources.length, SFX_MAX_VOICES + 1);
  sfx.stop(); assert.ok(sfx.voices.every(slot => slot.source === null));
});

test('Sfx synthesizes every required effect and safely pauses, resumes and destroys', async () => {
  const { sfx, context, sources } = audioFixture(); await sfx.unlock();
  for (const [type, value] of [['swish', 0], ['sfx:rim', 500], ['sfx:board', 800], ['countdown', 3], ['buzzer', 0], ['fire', 0], ['cheer', 1], ['sfx:floor', 900]]) {
    sfx.stop(); const count = sources.length; sfx.play(type, value); assert.ok(sources.length > count, type);
  }
  await sfx.pause(); assert.equal(context.state, 'suspended');
  await sfx.resume(); assert.equal(context.state, 'running');
  await sfx.destroy(); assert.equal(context.state, 'closed');
  await sfx.unlock(); assert.equal(context.state, 'closed');
});
