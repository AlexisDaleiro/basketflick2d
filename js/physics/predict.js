import { DEBUG_PREDICTION_DT, DEBUG_PREDICTION_POINTS, FIXED_DT, G, K_AIR } from '../config/constants.js';

/** Unobstructed prediction with the same integrator. @param {{x:number,y:number}} origin @param {{x:number,y:number}} velocity @param {Float64Array} out Interleaved x/y. @returns {number} Point count. */
export function predictTrajectory(origin, velocity, out) {
  let x = origin.x;
  let y = origin.y;
  let vx = velocity.x;
  let vy = velocity.y;
  const drag = Math.exp(-K_AIR * FIXED_DT);
  const substeps = Math.round(DEBUG_PREDICTION_DT / FIXED_DT);
  out[0] = x;
  out[1] = y;
  for (let point = 1; point < DEBUG_PREDICTION_POINTS; point++) {
    for (let step = 0; step < substeps; step++) {
      vy = (vy + G * FIXED_DT) * drag;
      vx *= drag;
      x += vx * FIXED_DT;
      y += vy * FIXED_DT;
    }
    out[point * 2] = x;
    out[point * 2 + 1] = y;
  }
  return DEBUG_PREDICTION_POINTS;
}
