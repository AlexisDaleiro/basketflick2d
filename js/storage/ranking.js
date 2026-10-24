import { OFFENSIVE_WORDS } from '../config/constants.js';

/** Local calendar date, never UTC. @param {number|Date} value @returns {string} */
export function dayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Ranking reset affects visibility, not prize stock. @param {any[]} plays @param {string} day @param {number} resetAt @returns {any[]} */
export function dailyRanking(plays, day, resetAt = 0) {
  return plays.filter(play => play.dayKey === day && play.ts > resetAt)
    .sort((a, b) => b.score - a.score || a.shots - b.shots || a.ts - b.ts);
}

/** @param {any[]} plays @param {string} day @returns {number} */
export function dailyPrizes(plays, day) { return plays.filter(play => play.dayKey === day && play.prizeWon).length; }

/** Return a safe public name; retain original in the stored lead. @param {any} play @returns {string|null} */
export function publicName(play) {
  const normalized = (play.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = normalized.split(/[^a-z0-9]+/);
  return !normalized || OFFENSIVE_WORDS.some(word => words.includes(word)) ? null : play.name;
}
