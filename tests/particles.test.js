import test from 'node:test';
import assert from 'node:assert/strict';
import { Particles } from '../js/render/Particles.js';
import { PARTICLE_POOL_SIZE } from '../js/config/constants.js';

test('Particle burst emits 12–18 paws then expires, retaining the same fixed pool', () => {
  const particles = new Particles(() => 0.5);
  const pool = particles.pool;
  particles.burst(800, 630);
  assert.ok(particles.activeCount >= 12 && particles.activeCount <= 18);
  const first = pool[0]; const previousY = first.y;
  particles.update(0.1); assert.notEqual(first.y, previousY);
  particles.update(2); assert.equal(particles.activeCount, 0);
  particles.burst(800, 630, 'bone'); assert.equal(particles.pool, pool); assert.equal(particles.pool[0], first);
});

test('Particle emission saturates at 200, drops excess safely and reuses expired slots', () => {
  const particles = new Particles();
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) assert.equal(particles.emit(0, 0, 'flame'), true);
  assert.equal(particles.emit(0, 0, 'paw'), false); assert.equal(particles.activeCount, PARTICLE_POOL_SIZE);
  particles.update(1); assert.equal(particles.activeCount, 0);
  assert.equal(particles.emit(0, 0, 'paw'), true);
  particles.clear(); assert.equal(particles.activeCount, 0); assert.equal(particles.pool.length, PARTICLE_POOL_SIZE);
});
