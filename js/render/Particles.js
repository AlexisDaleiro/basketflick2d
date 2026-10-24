import * as C from '../config/constants.js';
import { theme } from '../config/theme.js';
import { bonePath, drawPaw } from './draw/paw.js';

/** Fixed pool: burst and trail emissions never allocate particles. */
export class Particles {
  /** @param {()=>number} [random] */
  constructor(random = Math.random) {
    this.random = random;
    this.pool = Array.from({ length: C.PARTICLE_POOL_SIZE }, () => ({
      life: 0, duration: 1, x: 0, y: 0, vx: 0, vy: 0, size: 0, angle: 0, spin: 0, type: 'paw', color: theme.lilac,
    }));
    this.activeCount = 0;
  }

  /** @param {number} x u. @param {number} y u. @param {'paw'|'bone'|'flame'} type @returns {boolean} */
  emit(x, y, type) {
    for (const p of this.pool) {
      if (p.life > 0) continue;
      p.type = type; p.x = x; p.y = y;
      const angle = this.random() * Math.PI * 2;
      const speed = C.PARTICLE_SPEED_MIN + this.random() * (C.PARTICLE_SPEED_MAX - C.PARTICLE_SPEED_MIN);
      p.vx = Math.cos(angle) * speed; p.vy = -Math.abs(Math.sin(angle) * speed);
      p.duration = type === 'flame' ? C.TRAIL_LIFE : C.PARTICLE_LIFE_MIN + this.random() * (C.PARTICLE_LIFE_MAX - C.PARTICLE_LIFE_MIN);
      p.life = p.duration;
      p.size = type === 'flame' ? C.FLAME_SIZE : C.PARTICLE_SIZE_MIN + this.random() * (C.PARTICLE_SIZE_MAX - C.PARTICLE_SIZE_MIN);
      p.angle = angle; p.spin = this.random() * Math.PI * 2 - Math.PI;
      p.color = type === 'flame' ? theme.yellow : this.random() < 0.5 ? theme.lilac : theme.gold;
      this.activeCount++; return true;
    }
    return false;
  }

  /** @param {number} x u. @param {number} y u. @param {'paw'|'bone'} [type] @returns {void} */
  burst(x, y, type = 'paw') {
    const count = C.BASKET_PARTICLES_MIN + Math.floor(this.random() * (C.BASKET_PARTICLES_MAX - C.BASKET_PARTICLES_MIN + 1));
    for (let i = 0; i < count; i++) this.emit(x, y, type);
  }

  /** @param {number} dt s. @returns {void} */
  update(dt) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life = Math.max(0, p.life - dt);
      if (p.life === 0) { this.activeCount--; continue; }
      p.vy += C.PARTICLE_GRAVITY * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.angle += p.spin * dt;
    }
  }

  /** @param {CanvasRenderingContext2D} ctx @returns {void} */
  render(ctx) {
    ctx.save();
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life / p.duration;
      if (p.type === 'paw') drawPaw(ctx, p.x, p.y, p.size, p.color, p.angle);
      else {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillStyle = p.color;
        if (p.type === 'bone') bonePath(ctx, p.size);
        else {
          const size = p.size * p.life / p.duration;
          ctx.beginPath(); ctx.moveTo(0, -size); ctx.quadraticCurveTo(size, size, 0, size / 2);
          ctx.quadraticCurveTo(-size, size, 0, -size); ctx.closePath();
        }
        ctx.fill(); ctx.restore();
      }
    }
    ctx.restore();
  }

  /** @returns {void} */
  clear() { for (const p of this.pool) p.life = 0; this.activeCount = 0; }
}
