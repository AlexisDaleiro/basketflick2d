import { SCORE_COUNT_MS, THANKS_MS, MS_PER_SECOND } from '../config/constants.js';

/** Pure result/form timing, independent from DOM and live Round's reusable result. */
export class ResultSession {
  /** @param {import('../storage/Storage.js').Storage} storage */
  constructor(storage) { this.storage = storage; this.phase = 'inactive'; this.elapsed = 0; this.entry = null; this.replay = false; }
  /** @param {any} result @returns {void} */
  enter(result) { this.entry = this.storage.addPlay(result); this.elapsed = 0; this.phase = 'summary'; this.replay = false; }
  /** @param {number} dt s. @returns {void} */
  update(dt) {
    this.elapsed += dt * MS_PER_SECOND;
    if (this.phase === 'summary' && this.elapsed >= SCORE_COUNT_MS) this.phase = 'lead_form';
  }
  /** @returns {number} */
  displayedScore() { return Math.round((this.entry?.play.score || 0) * (this.phase === 'thanks' ? 1 : Math.min(1, this.elapsed / SCORE_COUNT_MS))); }
  /** @param {any} input @param {boolean} replay @returns {any} */
  save(input, replay) {
    if (this.phase === 'thanks' || !this.entry) return { ok: false, error: 'saveFailed' };
    const result = this.storage.saveLead(this.entry.play.id, input);
    if (result.ok) { this.phase = 'thanks'; this.elapsed = 0; this.replay = replay; }
    return result;
  }
  /** @returns {boolean} */
  get done() { return this.phase === 'thanks' && this.elapsed >= THANKS_MS; }
  /** @returns {void} */
  exit() { this.phase = 'inactive'; this.entry = null; }
}
