import { BOARD_AABB, GATE_B_OFFSET, HOOP_MOTION_AMPLITUDE, HOOP_MOTION_PERIOD, MS_PER_SECOND, RIM_BACK_TIP, RIM_FRONT_TIP, RIM_Y } from '../config/constants.js';
import { Vec2 } from '../physics/Vec2.js';

export class Hoop {
  constructor() {
    this.front = new Vec2(RIM_FRONT_TIP.x, RIM_Y);
    this.back = new Vec2(RIM_BACK_TIP.x, RIM_Y);
    this.board = { ...BOARD_AABB };
    this.velocity = new Vec2();
    this.rimY = RIM_Y;
    this.previousRimY = RIM_Y;
    this.gateBY = RIM_Y + GATE_B_OFFSET;
    this.previousGateBY = this.gateBY;
  }

  /** Geometry and gates move together. @param {number} now ms. @param {boolean} [moving] @returns {void} */
  update(now, moving = false) {
    this.previousRimY = this.rimY;
    this.previousGateBY = this.gateBY;
    const omega = 2 * Math.PI / HOOP_MOTION_PERIOD;
    const phase = omega * now / MS_PER_SECOND;
    const offset = moving ? HOOP_MOTION_AMPLITUDE * Math.sin(phase) : 0;
    this.velocity.set(0, moving ? HOOP_MOTION_AMPLITUDE * omega * Math.cos(phase) : 0);
    this.rimY = RIM_Y + offset;
    this.gateBY = this.rimY + GATE_B_OFFSET;
    this.front.y = this.rimY;
    this.back.y = this.rimY;
    this.board.minY = BOARD_AABB.minY + offset;
    this.board.maxY = BOARD_AABB.maxY + offset;
  }

  /** @returns {void} */
  reset() { this.update(0, false); this.previousRimY = this.rimY; this.previousGateBY = this.gateBY; }
}
