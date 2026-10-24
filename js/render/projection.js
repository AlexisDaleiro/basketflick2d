import { FRONTAL_CAMERA_DISTANCE, FRONTAL_CENTER_X, FRONTAL_HORIZON_Y, FRONTAL_MIN_DEPTH } from '../config/constants.js';

/** Perspective scale. A farther ball occupies fewer screen units. @param {number} depth u. @returns {number} */
export function depthScale(depth) {
  return FRONTAL_CAMERA_DISTANCE / (FRONTAL_CAMERA_DISTANCE + Math.max(FRONTAL_MIN_DEPTH, depth));
}

/** Project a physical point into the fixed logical screen; output is reused. @param {number} x u. @param {number} y u. @param {number} depth u. @param {{x:number,y:number}} out @returns {void} */
export function projectPoint(x, y, depth, out) {
  const scale = depthScale(depth);
  out.x = FRONTAL_CENTER_X + (x - FRONTAL_CENTER_X) * scale;
  out.y = FRONTAL_HORIZON_Y + (y - FRONTAL_HORIZON_Y) * scale;
}
