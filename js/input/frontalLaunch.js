import * as C from '../config/constants.js';
import { projectPoint } from '../render/projection.js';

/** Lateral swipe controls x, upward power controls arc and travel into the court. @param {{x:number,y:number}} swipe @param {{x:number,y:number}} origin @param {{sensitivity:number,aimAssist:number}} settings @param {any} out Reused diagnostics. @returns {void} */
export function calculateFrontalLaunch(swipe, origin, settings, out) {
  const rawX = swipe.x * C.GAIN * settings.sensitivity;
  const rawY = swipe.y * C.GAIN * settings.sensitivity;
  out.raw.x = rawX; out.raw.y = rawY;
  const speed = Math.max(C.V_MIN, Math.min(Math.hypot(rawX, rawY), C.V_MAX));
  out.angle = Math.max(C.MIN_LAUNCH_ANGLE, Math.min(Math.atan2(-rawY, rawX), C.MAX_LAUNCH_ANGLE));
  out.clamped.x = speed * Math.cos(out.angle); out.clamped.y = -speed * Math.sin(out.angle);
  const power = -out.clamped.y;
  const effectivePower = power <= C.FRONTAL_POWER_SOFT_START ? power
    : C.FRONTAL_POWER_SOFT_START + (power - C.FRONTAL_POWER_SOFT_START) * C.FRONTAL_POWER_SOFT_GAIN;
  out.velocity.x = out.clamped.x; out.velocity.y = -effectivePower * C.FRONTAL_LIFT_GAIN;
  out.depthVelocity = effectivePower * C.FRONTAL_DEPTH_GAIN;
  const discriminant = out.velocity.y ** 2 - 2 * C.G * (origin.y - C.FRONTAL_RIM_Y);
  if (discriminant >= 0) {
    const time = (-out.velocity.y + Math.sqrt(discriminant)) / C.G;
    if (time > 0) out.velocity.x += ((C.FRONTAL_CENTER_X - origin.x) / time - out.velocity.x) * settings.aimAssist;
  }
}

/** Same fixed integrator as FrontalWorld, projected only for diagnostics. @param {{x:number,y:number}} origin @param {{x:number,y:number}} velocity @param {number} depthVelocity @param {Float64Array} out @param {{x:number,y:number}} point Reused scratch. @returns {number} */
export function predictFrontalTrajectory(origin, velocity, depthVelocity, out, point) {
  let x = origin.x; let y = origin.y; let z = 0;
  let vx = velocity.x; let vy = velocity.y; let vz = depthVelocity;
  const drag = Math.exp(-C.K_AIR * C.FIXED_DT);
  const substeps = Math.round(C.DEBUG_PREDICTION_DT / C.FIXED_DT);
  for (let i = 0; i < C.DEBUG_PREDICTION_POINTS; i++) {
    projectPoint(x, y, z, point); out[i * 2] = point.x; out[i * 2 + 1] = point.y;
    for (let step = 0; step < substeps; step++) {
      vx *= drag; vy = (vy + C.G * C.FIXED_DT) * drag; vz *= drag;
      x += vx * C.FIXED_DT; y += vy * C.FIXED_DT; z += vz * C.FIXED_DT;
    }
  }
  return C.DEBUG_PREDICTION_POINTS;
}
