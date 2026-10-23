import { BALL_POOL_SIZE, BOARD_FRICTION, BOARD_RESTITUTION, CONTACT_COOLDOWN_MS, FIXED_DT, FLOOR_FRICTION, FLOOR_RESTITUTION, FLOOR_Y, G, K_AIR, MS_PER_SECOND, RIM_FRICTION, RIM_RESTITUTION, RIM_TIP_RADIUS } from '../config/constants.js';
import { Ball } from '../game/Ball.js';
import { Hoop } from '../game/Hoop.js';
import { ShotJudge } from '../game/ShotJudge.js';
import { Vec2 } from './Vec2.js';
import { circleAABB, circlePlane, circlePoint, resolveContact } from './collide.js';

export class World {
  /** Callbacks receive reused objects; consumers must copy retained data. @param {{gravity?:number, airDrag?:number, onContact?:(event:{type:string,intensity:number,ball:Ball})=>void, onResolve?:(ball:Ball)=>void}} [options] */
  constructor({ gravity = G, airDrag = K_AIR, onContact = null, onResolve = null } = {}) {
    this.gravity = gravity;
    this.dragFactor = Math.exp(-airDrag * FIXED_DT);
    this.onContact = onContact;
    this.onResolve = onResolve;
    this.balls = Array.from({ length: BALL_POOL_SIZE }, (_, id) => new Ball(id));
    this.hoop = new Hoop();
    this.judge = new ShotJudge();
    this.contact = { nx: 0, ny: 0, penetration: 0 };
    this.contactEvent = { type: '', intensity: 0, ball: this.balls[0] };
    this.staticVelocity = new Vec2();
    this.timeMs = 0;
    this.activeCount = 0;
    this.movingHoop = false;
    this.hoopTimeMs = null;
  }

  /** @param {number} x u. @param {number} y u. @returns {Ball | null} */
  spawn(x, y) {
    for (const ball of this.balls) {
      if (ball.state === 'inactive') { ball.reset(x, y); this.activeCount++; return ball; }
    }
    return null;
  }

  /** @returns {void} */
  reset() {
    for (const ball of this.balls) { ball.state = 'inactive'; ball.opacity = 0; }
    this.timeMs = 0;
    this.activeCount = 0;
    this.movingHoop = false;
    this.hoop.reset();
    this.hoopTimeMs = null;
  }

  /** One fixed semi-implicit Euler step; no per-step allocations. @returns {void} */
  step() {
    this.timeMs += FIXED_DT * MS_PER_SECOND;
    this.hoop.update(this.hoopTimeMs ?? this.timeMs, this.movingHoop);
    for (const ball of this.balls) {
      if (ball.state !== 'flying' && ball.state !== 'dead') continue;
      ball.previous.copy(ball.position);
      ball.velocity.y += this.gravity * FIXED_DT;
      ball.velocity.scale(this.dragFactor);
      ball.position.x += ball.velocity.x * FIXED_DT;
      ball.position.y += ball.velocity.y * FIXED_DT;
      ball.angle += ball.velocity.x / ball.radius * FIXED_DT;
      if (circlePoint(ball.position, ball.radius, this.hoop.front, RIM_TIP_RADIUS, this.contact)) this.resolve(ball, 'rim');
      if (circlePoint(ball.position, ball.radius, this.hoop.back, RIM_TIP_RADIUS, this.contact)) this.resolve(ball, 'rim');
      if (circleAABB(ball.position, ball.radius, this.hoop.board, this.contact)) this.resolve(ball, 'board');
      if (circlePlane(ball.position, ball.radius, FLOOR_Y, this.contact)) {
        ball.touchedFloor = true;
        resolveContact(ball.position, ball.velocity, this.contact, FLOOR_RESTITUTION, FLOOR_FRICTION, this.staticVelocity);
      }
      if (this.judge.evaluate(ball, this.hoop, this.timeMs)) this.onResolve?.(ball);
      if (ball.state === 'dead') {
        ball.fade(this.timeMs);
        if (ball.state === 'inactive') this.activeCount--;
      }
    }
  }

  /** @param {Ball} ball @param {'rim'|'board'} type @returns {void} */
  resolve(ball, type) {
    if (type === 'rim') ball.touchedRim = true;
    else ball.touchedBoard = true;
    const intensity = resolveContact(ball.position, ball.velocity, this.contact,
      type === 'rim' ? RIM_RESTITUTION : BOARD_RESTITUTION,
      type === 'rim' ? RIM_FRICTION : BOARD_FRICTION, this.hoop.velocity);
    if (intensity > 0 && this.timeMs - ball.lastContactAt >= CONTACT_COOLDOWN_MS) {
      ball.lastContactAt = this.timeMs;
      this.contactEvent.type = type === 'rim' ? 'sfx:rim' : 'sfx:board';
      this.contactEvent.intensity = intensity;
      this.contactEvent.ball = ball;
      this.onContact?.(this.contactEvent);
    }
  }
}
