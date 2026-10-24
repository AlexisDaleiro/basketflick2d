import * as C from '../config/constants.js';
import { Vec2 } from '../physics/Vec2.js';

/** Ring is a horizontal circle in x/depth; board is a vertical slab behind it. */
export class FrontalHoop {
  constructor() {
    this.centerX = C.FRONTAL_CENTER_X; this.depth = C.FRONTAL_HOOP_DEPTH;
    this.radius = C.FRONTAL_RIM_RADIUS;
    this.rimY = C.FRONTAL_RIM_Y; this.previousRimY = this.rimY;
    this.gateBY = this.rimY + C.GATE_B_OFFSET; this.previousGateBY = this.gateBY;
    this.velocity = new Vec2();
    this.board = { minX: C.FRONTAL_BOARD_MIN_X, maxX: C.FRONTAL_BOARD_MAX_X,
      minY: C.FRONTAL_BOARD_MIN_Y, maxY: C.FRONTAL_BOARD_MAX_Y,
      minZ: C.FRONTAL_BOARD_DEPTH, maxZ: C.FRONTAL_BOARD_DEPTH + C.FRONTAL_BOARD_THICKNESS };
  }

  /** @param {number} now ms. @param {boolean} [moving] @returns {void} */
  update(now, moving = false) {
    this.previousRimY = this.rimY; this.previousGateBY = this.gateBY;
    const omega = Math.PI * 2 / C.HOOP_MOTION_PERIOD;
    const phase = omega * now / C.MS_PER_SECOND;
    const offset = moving ? C.HOOP_MOTION_AMPLITUDE * Math.sin(phase) : 0;
    this.rimY = C.FRONTAL_RIM_Y + offset; this.gateBY = this.rimY + C.GATE_B_OFFSET;
    this.velocity.set(0, moving ? C.HOOP_MOTION_AMPLITUDE * omega * Math.cos(phase) : 0);
    this.board.minY = C.FRONTAL_BOARD_MIN_Y + offset; this.board.maxY = C.FRONTAL_BOARD_MAX_Y + offset;
  }

  /** @returns {void} */
  reset() { this.update(0); this.previousRimY = this.rimY; this.previousGateBY = this.gateBY; }
}
