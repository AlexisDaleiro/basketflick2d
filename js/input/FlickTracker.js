import { CONTACT_EPSILON, FLICK_BUFFER_SIZE, GRAB_RADIUS, MAX_GESTURE_MS, MIN_FLICK_SPEED, MIN_SWIPE_DIST, MIN_SWIPE_DT, MS_PER_SECOND, VELOCITY_WINDOW_MS } from '../config/constants.js';
import { Vec2 } from '../physics/Vec2.js';
import { calculateLaunchVelocity } from './launch.js';

export class FlickTracker {
  /** @param {{calculateLaunch?:typeof calculateLaunchVelocity}} [options] Allocate the fixed sample buffer and reusable launch diagnostics. */
  constructor({ calculateLaunch = calculateLaunchVelocity } = {}) {
    this.calculateLaunch = calculateLaunch;
    this.samples = new Float64Array(FLICK_BUFFER_SIZE * 3);
    this.origin = new Vec2();
    this.initial = new Vec2();
    this.active = false;
    this.head = 0;
    this.count = 0;
    this.startedAt = 0;
    this.lastTime = 0;
    this.result = { valid: false, reason: '', swipe: new Vec2(), raw: new Vec2(), clamped: new Vec2(), velocity: new Vec2(), angle: 0, depthVelocity: 0 };
  }

  /** @param {number} x u. @param {number} y u. @param {number} t event.timeStamp, ms. @param {{state:string,position:{x:number,y:number}}} ball @returns {boolean} */
  start(x, y, t, ball) {
    this.cancel();
    if (ball.state !== 'ready' || Math.hypot(x - ball.position.x, y - ball.position.y) > (ball.grabRadius ?? GRAB_RADIUS) + CONTACT_EPSILON) return false;
    this.active = true;
    this.head = 0;
    this.count = 0;
    this.startedAt = t;
    this.lastTime = t;
    this.initial.set(x, y);
    this.origin.copy(ball.position);
    this.add(x, y, t);
    return true;
  }

  /** @param {number} x u. @param {number} y u. @param {number} t ms. @returns {void} */
  add(x, y, t) {
    if (!this.active || t < this.lastTime) return;
    const index = this.head * 3;
    this.samples[index] = x;
    this.samples[index + 1] = y;
    this.samples[index + 2] = t;
    this.head = (this.head + 1) % FLICK_BUFFER_SIZE;
    this.count = Math.min(this.count + 1, FLICK_BUFFER_SIZE);
    this.lastTime = t;
  }

  /** Result is reused; copy if retaining it across gestures. @param {number} x u. @param {number} y u. @param {number} t ms. @param {{sensitivity?:number,aimAssist?:number}} settings @returns {FlickTracker['result']} */
  finish(x, y, t, settings) {
    const result = this.result;
    result.valid = false;
    result.reason = 'inactive';
    if (!this.active) return result;
    result.raw.set(0, 0);
    result.clamped.set(0, 0);
    result.velocity.set(0, 0);
    result.angle = 0;
    this.add(x, y, t);
    this.active = false;
    let referenceX = this.initial.x;
    let referenceY = this.initial.y;
    let referenceTime = this.startedAt;
    for (let offset = 0; offset < this.count; offset++) {
      const index = ((this.head - this.count + offset + FLICK_BUFFER_SIZE) % FLICK_BUFFER_SIZE) * 3;
      if (this.samples[index + 2] >= t - VELOCITY_WINDOW_MS) {
        referenceX = this.samples[index];
        referenceY = this.samples[index + 1];
        referenceTime = this.samples[index + 2];
        break;
      }
    }
    const dx = x - referenceX;
    const dy = y - referenceY;
    const dt = Math.max((t - referenceTime) / MS_PER_SECOND, MIN_SWIPE_DT);
    result.swipe.set(dx / dt, dy / dt);
    if (Math.hypot(x - this.initial.x, y - this.initial.y) < MIN_SWIPE_DIST) result.reason = 'short';
    else if (dy >= 0) result.reason = 'downward';
    else if (result.swipe.length() < MIN_FLICK_SPEED) result.reason = 'slow';
    else if (t - this.startedAt > MAX_GESTURE_MS) result.reason = 'long';
    else {
      result.valid = true;
      result.reason = '';
      this.calculateLaunch(result.swipe, this.origin, settings, result);
    }
    return result;
  }

  /** @returns {void} */
  cancel() { this.active = false; }
}
