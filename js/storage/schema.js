import * as C from '../config/constants.js';
import { normalizePhone } from './leads.js';
import { dayKey } from './ranking.js';

/** @param {unknown} value @returns {boolean} */
export const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
/** @param {unknown} value @param {number} [fallback] @returns {number} */
export const integer = (value, fallback = 0) => Number.isSafeInteger(value) && value >= 0 ? value : fallback;

/** @returns {any} */
export function defaultSettings() {
  return { roundDurationSec: C.ROUND_DURATION_SEC, prizeThreshold: C.PRIZE_THRESHOLD,
    sensitivity: C.DEFAULT_SENSITIVITY, aimAssist: C.DEFAULT_AIM_ASSIST, movingHoop: false,
    soundEnabled: true, maxPrizesPerDay: 0, eventName: 'Expo 2026', pinHash: '', pinSalt: '', pinIsDefault: true };
}

/** Missing fields are migrated from pre-v1 data; out-of-range settings return to defaults. @param {any} source @returns {any} */
export function repairSettings(source) {
  const out = defaultSettings();
  if (!object(source)) return out;
  for (const key of Object.keys(out)) if (typeof source[key] === typeof out[key]) out[key] = source[key];
  if (!C.ROUND_DURATIONS.includes(out.roundDurationSec)) out.roundDurationSec = C.ROUND_DURATION_SEC;
  if (!Number.isFinite(out.sensitivity) || out.sensitivity < 0.5 || out.sensitivity > 1.8) out.sensitivity = C.DEFAULT_SENSITIVITY;
  if (!Number.isFinite(out.aimAssist) || out.aimAssist < 0 || out.aimAssist > 0.4) out.aimAssist = C.DEFAULT_AIM_ASSIST;
  if (!Number.isInteger(out.prizeThreshold) || out.prizeThreshold < 4 || out.prizeThreshold > 80) out.prizeThreshold = C.PRIZE_THRESHOLD;
  out.maxPrizesPerDay = integer(out.maxPrizesPerDay); out.eventName = out.eventName.slice(0, 100);
  return out;
}

/** Validate the immutable result and migrate optional lead/prize fields. @param {any} play @returns {any|null} */
export function repairPlay(play) {
  if (!object(play) || typeof play.id !== 'string' || !play.id || !Number.isSafeInteger(play.ts) || play.ts <= 0 || !Number.isFinite(new Date(play.ts).getTime())
    || !['score', 'shots', 'baskets', 'swishes', 'bestStreak'].every(key => Number.isSafeInteger(play[key]) && play[key] >= 0)
    || !C.ROUND_DURATIONS.includes(play.durationSec) || play.baskets > play.shots || play.swishes > play.baskets
    || play.bestStreak > play.baskets) return null;
  const phone = typeof play.phone === 'string' ? normalizePhone(play.phone) : null;
  return { id: play.id, ts: play.ts, dayKey: dayKey(play.ts), score: play.score, shots: play.shots,
    baskets: play.baskets, swishes: play.swishes, bestStreak: play.bestStreak, durationSec: play.durationSec,
    prizeWon: Boolean(play.prizeWon), prizeCode: /^TD-[A-HJ-NP-Z2-9]{4}$/.test(play.prizeCode) ? play.prizeCode : null,
    prizeDelivered: Boolean(play.prizeWon && play.prizeDelivered),
    name: typeof play.name === 'string' ? play.name.slice(0, C.LEAD_NAME_MAX) : null,
    phone: phone && play.consent === true ? phone : null, consent: Boolean(phone && play.consent === true),
    leadAt: integer(play.leadAt) || null };
}
