import * as C from '../config/constants.js';
import { World } from './World.js';
import { FrontalHoop } from '../game/FrontalHoop.js';
import { FrontalShotJudge } from '../game/FrontalShotJudge.js';

/** 2.5D fixed-step sphere physics with genuine depth, drawn on Canvas 2D. */
export class FrontalWorld extends World {
  /** @param {ConstructorParameters<typeof World>[0]} [options] */
  constructor(options = {}) {
    super(options); this.hoop = new FrontalHoop(); this.judge = new FrontalShotJudge();
    this.netDrag = Math.exp(-C.FRONTAL_NET_DRAG * C.FIXED_DT); this.netSpinDrag = Math.exp(-C.FRONTAL_NET_SPIN_DRAG * C.FIXED_DT);
    this.contact.nz = 0;
    for (const ball of this.balls) { ball.radius = C.FRONTAL_BALL_RADIUS; ball.grabRadius = C.FRONTAL_GRAB_RADIUS; }
  }

  /** A full pool recycles the oldest resolved ball, so lingering baskets never delay the next spawn. @param {number} x u. @param {number} y u. @returns {import('../game/Ball.js').Ball|null} */
  spawn(x, y) {
    const ball = super.spawn(x, y); if (ball) return ball;
    let oldest = null;
    for (const candidate of this.balls) if (candidate.state === 'dead' && (!oldest || candidate.resolvedAt < oldest.resolvedAt)) oldest = candidate;
    if (!oldest) return null;
    oldest.state = 'inactive'; oldest.opacity = 0; this.activeCount--;
    return super.spawn(x, y);
  }

  /** @param {import('../game/Ball.js').Ball} ball @param {number} dx @param {number} dy @param {number} dz @param {number} distance @param {number} combinedRadius @returns {boolean} */
  sphereContact(ball, dx, dy, dz, distance, combinedRadius) {
    if (distance >= combinedRadius) return false;
    this.contact.nx = distance > C.CONTACT_EPSILON ? dx / distance : 0;
    this.contact.ny = distance > C.CONTACT_EPSILON ? dy / distance : -1;
    this.contact.nz = distance > C.CONTACT_EPSILON ? dz / distance : 0;
    this.contact.penetration = combinedRadius - distance; return true;
  }

  /** Sphere versus the ring's circular tube. @param {import('../game/Ball.js').Ball} ball @returns {boolean} */
  rimContact(ball) {
    const dx = ball.position.x - this.hoop.centerX;
    const dz = ball.depth - this.hoop.depth;
    const radial = Math.hypot(dx, dz);
    const qx = this.hoop.centerX + (radial > C.CONTACT_EPSILON ? dx / radial : 1) * this.hoop.radius;
    const qz = this.hoop.depth + (radial > C.CONTACT_EPSILON ? dz / radial : 0) * this.hoop.radius;
    const nx = ball.position.x - qx; const ny = ball.position.y - this.hoop.rimY; const nz = ball.depth - qz;
    return this.sphereContact(ball, nx, ny, nz, Math.hypot(nx, ny, nz), ball.radius + C.FRONTAL_RIM_TUBE_RADIUS);
  }

  /** Sphere versus a finite board slab; inside cases exit through the nearest face. @param {import('../game/Ball.js').Ball} ball @returns {boolean} */
  boardContact(ball) {
    const b = this.hoop.board;
    const x = ball.position.x; const y = ball.position.y; const z = ball.depth;
    const dx = x - Math.max(b.minX, Math.min(b.maxX, x));
    const dy = y - Math.max(b.minY, Math.min(b.maxY, y));
    const dz = z - Math.max(b.minZ, Math.min(b.maxZ, z));
    const distance = Math.hypot(dx, dy, dz);
    if (!this.sphereContact(ball, dx, dy, dz, distance, ball.radius)) return false;
    if (distance <= C.CONTACT_EPSILON) {
      let nearest = x - b.minX;
      this.contact.nx = -1; this.contact.ny = 0; this.contact.nz = 0;
      if (b.maxX - x < nearest) { nearest = b.maxX - x; this.contact.nx = 1; }
      if (y - b.minY < nearest) { nearest = y - b.minY; this.contact.nx = 0; this.contact.ny = -1; }
      if (b.maxY - y < nearest) { nearest = b.maxY - y; this.contact.nx = 0; this.contact.ny = 1; }
      if (z - b.minZ < nearest) { nearest = z - b.minZ; this.contact.nx = 0; this.contact.ny = 0; this.contact.nz = -1; }
      if (b.maxZ - z < nearest) { nearest = b.maxZ - z; this.contact.nx = 0; this.contact.ny = 0; this.contact.nz = 1; }
      this.contact.penetration = ball.radius + nearest;
    }
    return true;
  }

  /** @param {import('../game/Ball.js').Ball} ball @param {'rim'|'board'|'floor'} type @returns {void} */
  resolveSphere(ball, type) {
    const c = this.contact;
    ball.position.x += c.nx * c.penetration; ball.position.y += c.ny * c.penetration; ball.depth += c.nz * c.penetration;
    const colliderY = type === 'floor' ? 0 : this.hoop.velocity.y;
    const vx = ball.velocity.x; const vy = ball.velocity.y - colliderY; const vz = ball.depthVelocity;
    const vn = vx * c.nx + vy * c.ny + vz * c.nz;
    if (type === 'rim') ball.touchedRim = true;
    if (type === 'board') ball.touchedBoard = true;
    if (vn >= 0) return;
    const e = type === 'rim' ? C.RIM_RESTITUTION : type === 'board' ? C.BOARD_RESTITUTION : C.FLOOR_RESTITUTION;
    const friction = type === 'rim' ? C.RIM_FRICTION : type === 'board' ? C.BOARD_FRICTION : C.FLOOR_FRICTION;
    ball.velocity.x = -e * vn * c.nx + (1 - friction) * (vx - vn * c.nx);
    ball.velocity.y = -e * vn * c.ny + (1 - friction) * (vy - vn * c.ny) + colliderY;
    ball.depthVelocity = -e * vn * c.nz + (1 - friction) * (vz - vn * c.nz);
    if ((type !== 'floor' || -vn >= C.FLOOR_SOUND_MIN_SPEED) && this.timeMs - ball.lastContactAt >= C.CONTACT_COOLDOWN_MS) {
      ball.lastContactAt = this.timeMs;
      this.contactEvent.type = type === 'rim' ? 'sfx:rim' : type === 'board' ? 'sfx:board' : 'sfx:floor';
      this.contactEvent.intensity = -vn; this.contactEvent.ball = ball; this.onContact?.(this.contactEvent);
    }
  }

  /** @returns {void} */
  step() {
    this.timeMs += C.FIXED_DT * C.MS_PER_SECOND;
    this.hoop.update(this.hoopTimeMs ?? this.timeMs, this.movingHoop);
    for (const ball of this.balls) {
      if (ball.state !== 'flying' && ball.state !== 'dead') continue;
      if (ball.state === 'dead' && ball.outcome === 'basket') { this.animateBasket(ball); continue; }
      ball.previous.copy(ball.position); ball.previousDepth = ball.depth;
      ball.velocity.y += this.gravity * C.FIXED_DT; ball.velocity.scale(this.dragFactor); ball.depthVelocity *= this.dragFactor;
      ball.position.x += ball.velocity.x * C.FIXED_DT; ball.position.y += ball.velocity.y * C.FIXED_DT;
      ball.depth += ball.depthVelocity * C.FIXED_DT; ball.angle += ball.depthVelocity / ball.radius * C.FIXED_DT;
      if (this.rimContact(ball)) this.resolveSphere(ball, 'rim');
      if (this.boardContact(ball)) this.resolveSphere(ball, 'board');
      const penetration = ball.position.y + ball.radius - C.FLOOR_Y;
      if (penetration > 0) {
        ball.touchedFloor = true; this.contact.nx = 0; this.contact.ny = -1; this.contact.nz = 0; this.contact.penetration = penetration;
        this.resolveSphere(ball, 'floor');
      }
      if (this.judge.evaluate(ball, this.hoop, this.timeMs)) {
        if (ball.outcome === 'basket') ball.spin = ball.depthVelocity / ball.radius;
        this.onResolve?.(ball);
      }
      if (ball.state === 'dead') { ball.fade(this.timeMs); if (ball.state === 'inactive') this.activeCount--; }
    }
  }

  /** Scoring is already final: the net brakes the ball and funnels it onto the hoop axis, then it drops out, bounces and fades. @param {import('../game/Ball.js').Ball} ball @returns {void} */
  animateBasket(ball) {
    const age = this.timeMs - ball.resolvedAt;
    ball.previous.copy(ball.position); ball.previousDepth = ball.depth;
    ball.velocity.y += this.gravity * C.FIXED_DT;
    if (ball.position.y < this.hoop.rimY + C.FRONTAL_NET_DEPTH + ball.radius * C.FRONTAL_NET_GRIP) {
      const pull = C.FRONTAL_NET_PULL * C.FIXED_DT;
      ball.velocity.x += (this.hoop.centerX - ball.position.x) * pull;
      ball.depthVelocity += (this.hoop.depth - ball.depth) * pull;
      ball.velocity.scale(this.netDrag); ball.depthVelocity *= this.netDrag; ball.spin *= this.netSpinDrag;
    } else { ball.velocity.scale(this.dragFactor); ball.depthVelocity *= this.dragFactor; }
    ball.position.x += ball.velocity.x * C.FIXED_DT; ball.position.y += ball.velocity.y * C.FIXED_DT;
    ball.depth += ball.depthVelocity * C.FIXED_DT; ball.angle += ball.spin * C.FIXED_DT;
    const penetration = ball.position.y + ball.radius - C.FLOOR_Y;
    if (penetration > 0) {
      this.contact.nx = 0; this.contact.ny = -1; this.contact.nz = 0; this.contact.penetration = penetration;
      this.resolveSphere(ball, 'floor'); ball.spin *= C.FRONTAL_FLOOR_SPIN_KEEP;
    }
    ball.opacity = age <= C.FRONTAL_BASKET_FADE_MS ? 1
      : Math.max(0, (C.FRONTAL_BASKET_LIFE_MS - age) / (C.FRONTAL_BASKET_LIFE_MS - C.FRONTAL_BASKET_FADE_MS));
    if (age >= C.FRONTAL_BASKET_LIFE_MS) { ball.state = 'inactive'; this.activeCount--; }
  }
}
