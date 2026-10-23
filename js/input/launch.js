import { DEFAULT_AIM_ASSIST, DEFAULT_SENSITIVITY, G, GAIN, MAX_LAUNCH_ANGLE, MIN_LAUNCH_ANGLE, RIM_BACK_TIP, RIM_FRONT_TIP, RIM_Y, V_MAX, V_MIN } from '../config/constants.js';

/** Horizontal correction after the clamps, intentionally ignoring drag. @param {{x:number,y:number}} velocity Mutated launch vector. @param {{x:number,y:number}} origin @param {number} amount Ratio; accepts 1 for the analytical test. @returns {void} */
export function applyAimAssist(velocity, origin, amount) {
  const discriminant = velocity.y * velocity.y - 2 * G * (origin.y - RIM_Y);
  if (discriminant < 0) return;
  const time = (-velocity.y + Math.sqrt(discriminant)) / G;
  if (time <= 0) return;
  const centerX = (RIM_FRONT_TIP.x + RIM_BACK_TIP.x) / 2;
  const idealX = (centerX - origin.x) / time;
  velocity.x += (idealX - velocity.x) * amount;
}

/** No allocations; output also carries raw/clamped diagnostics. @param {{x:number,y:number}} swipe @param {{x:number,y:number}} origin @param {{sensitivity?:number,aimAssist?:number}} settings @param {{raw:{x:number,y:number},clamped:{x:number,y:number},velocity:{x:number,y:number},angle:number}} out @returns {void} */
export function calculateLaunchVelocity(swipe, origin, settings, out) {
  const gain = GAIN * (settings.sensitivity ?? DEFAULT_SENSITIVITY);
  out.raw.x = swipe.x * gain;
  out.raw.y = swipe.y * gain;
  const speed = Math.max(V_MIN, Math.min(Math.hypot(out.raw.x, out.raw.y), V_MAX));
  out.angle = Math.max(MIN_LAUNCH_ANGLE, Math.min(Math.atan2(-out.raw.y, out.raw.x), MAX_LAUNCH_ANGLE));
  out.clamped.x = speed * Math.cos(out.angle);
  out.clamped.y = -speed * Math.sin(out.angle);
  out.velocity.x = out.clamped.x;
  out.velocity.y = out.clamped.y;
  applyAimAssist(out.velocity, origin, settings.aimAssist ?? DEFAULT_AIM_ASSIST);
}
