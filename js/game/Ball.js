import { BALL_RADIUS, DEAD_FADE_MS } from '../config/constants.js';
import { Vec2 } from '../physics/Vec2.js';

export class Ball {
  /** @param {number} id Pool index. */
  constructor(id) {
    this.id = id;
    this.radius = BALL_RADIUS;
    this.position = new Vec2();
    this.previous = new Vec2();
    this.velocity = new Vec2();
    this.shot = { launchedAt: 0, gateA: false, gateATime: 0, upwardThrough: false, resolved: false };
    this.state = 'inactive';
    this.opacity = 0;
    this.angle = 0;
    this.touchedRim = false;
    this.touchedBoard = false;
    this.touchedFloor = false;
    this.lastContactAt = -Infinity;
    this.resolvedAt = 0;
    this.outcome = '';
    this.points = 0;
    this.swish = false;
  }

  /** Reset all shot data before reuse. @param {number} x u. @param {number} y u. @returns {void} */
  reset(x, y) {
    this.position.set(x, y);
    this.previous.set(x, y);
    this.velocity.set(0, 0);
    this.state = 'ready';
    this.opacity = 1;
    this.angle = 0;
    this.touchedRim = false;
    this.touchedBoard = false;
    this.touchedFloor = false;
    this.lastContactAt = -Infinity;
    this.resolvedAt = 0;
    this.outcome = '';
    this.points = 0;
    this.swish = false;
    this.shot.launchedAt = 0;
    this.shot.gateA = false;
    this.shot.gateATime = 0;
    this.shot.upwardThrough = false;
    this.shot.resolved = false;
  }

  /** @param {{x:number,y:number}} velocity u/s. @param {number} now ms of simulation. @returns {boolean} */
  launch(velocity, now) {
    if (this.state !== 'ready') return false;
    this.velocity.copy(velocity);
    this.shot.launchedAt = now;
    this.state = 'flying';
    return true;
  }

  /** @param {number} now ms. @returns {void} */
  fade(now) {
    this.opacity = Math.max(0, 1 - (now - this.resolvedAt) / DEAD_FADE_MS);
    if (this.opacity === 0) this.state = 'inactive';
  }
}
