import * as C from '../config/constants.js';
import { defaultSettings, repairSettings, repairPlay, object, integer } from './schema.js';
import { dayKey, dailyRanking, dailyPrizes } from './ranking.js';
import { validateLead } from './leads.js';

/** Repository with an in-memory fallback. The backend is injected; this module has no DOM dependency. */
export class Storage {
  /** @param {{backend?:any,now?:()=>number,random?:()=>number}} [options] */
  constructor({ backend = null, now = Date.now, random = Math.random } = {}) {
    this.backend = backend; this.now = now; this.random = random;
    this.warning = null; this.errors = []; this.plays = []; this.settings = defaultSettings(); this.meta = null;
  }

  /** @param {string} key @param {any} value @returns {boolean} */
  write(key, value) {
    try {
      if (!this.backend) throw new Error('Storage unavailable');
      this.backend.setItem(C.STORAGE_PREFIX + key, JSON.stringify(value)); return true;
    } catch { if (this.warning !== 'storageVersion') this.warning = 'storageUnavailable'; return false; }
  }

  /** @param {string} key @param {any} fallback @returns {any} */
  read(key, fallback) {
    let raw;
    try { raw = this.backend?.getItem(C.STORAGE_PREFIX + key); }
    catch { this.warning = 'storageUnavailable'; return fallback; }
    if (raw == null) return fallback;
    try { return JSON.parse(raw); }
    catch {
      this.backup(key, raw); this.recordError(`Invalid JSON: ${key}`); return fallback;
    }
  }

  /** Keep corrupt data before repairing its active key. @param {string} key @param {string} raw @returns {void} */
  backup(key, raw) {
    try { this.backend?.setItem(`${C.STORAGE_PREFIX}corrupt.${this.now()}.${key}`, raw); }
    catch { this.warning = 'storageUnavailable'; }
  }

  /** Apply the supported v0→v1 migration (fill missing fields) and persist repaired data. @returns {Storage} */
  load() {
    this.plays = []; this.errors = [];
    const errors = this.read('errors', []);
    this.errors = [...(Array.isArray(errors) ? errors : []), ...this.errors].filter(error => object(error) && typeof error.msg === 'string').slice(-C.ERROR_LIMIT);
    const source = this.read('meta', {});
    const meta = object(source) ? source : {};
    if (integer(meta.schemaVersion) > C.SCHEMA_VERSION) {
      this.warning = 'storageVersion'; this.backend = null;
    }
    this.meta = { schemaVersion: C.SCHEMA_VERSION, deviceId: /^[A-HJ-NP-Z2-9]{4}$/.test(meta.deviceId) ? meta.deviceId : this.code(),
      deviceLabel: typeof meta.deviceLabel === 'string' ? meta.deviceLabel : 'Tablet A',
      playCounter: integer(meta.playCounter), rankingResetAt: integer(meta.rankingResetAt), createdAt: integer(meta.createdAt, this.now()) };
    this.settings = repairSettings(this.read('settings', {}));
    const plays = this.read('plays', []);
    if (!Array.isArray(plays)) { this.backup('plays', JSON.stringify(plays)); this.recordError('Invalid plays collection'); }
    const ids = new Set();
    for (const sourcePlay of Array.isArray(plays) ? plays : []) {
      const play = repairPlay(sourcePlay);
      if (!play || ids.has(play.id)) { this.recordError('Invalid or duplicate play'); continue; }
      ids.add(play.id); this.plays.push(play);
      if (play.id.startsWith(`${this.meta.deviceId}-`)) this.meta.playCounter = Math.max(this.meta.playCounter, integer(Number(play.id.split('-')[1])));
    }
    if (Array.isArray(plays) && plays.length !== this.plays.length) this.backup('plays', JSON.stringify(plays));
    if (this.warning !== 'storageVersion') {
      this.write('meta', this.meta); this.write('settings', this.settings); this.write('plays', this.plays); this.write('errors', this.errors);
    }
    if (this.usageBytes() > C.STORAGE_WARNING_BYTES && !this.warning) this.warning = 'storageFull';
    return this;
  }

  /** @param {string} message @param {string} [state] @param {string} [stack] @returns {void} */
  recordError(message, state = '', stack = '') {
    this.errors.push({ ts: this.now(), state, msg: String(message), stack: String(stack) });
    if (this.errors.length > C.ERROR_LIMIT) this.errors.shift();
    this.write('errors', this.errors);
  }

  /** @returns {string} */
  code() {
    let code = '';
    for (let i = 0; i < C.CODE_LENGTH; i++) code += C.CODE_ALPHABET[Math.min(C.CODE_ALPHABET.length - 1, Math.floor(this.random() * C.CODE_ALPHABET.length))];
    return code;
  }

  /** @returns {any[]} */
  ranking() { return dailyRanking(this.plays, dayKey(this.now()), this.meta.rankingResetAt); }

  /** @returns {boolean} */
  prizesAvailable() { return !this.settings.maxPrizesPerDay || dailyPrizes(this.plays, dayKey(this.now())) < this.settings.maxPrizesPerDay; }

  /** Save once at entry to GAME_OVER, before any form interaction. @param {any} result @returns {any} */
  addPlay(result) {
    if (result?.practice) return null;
    if (!object(result)) { this.recordError('Missing round result'); return null; }
    const previous = this.ranking()[0];
    const ts = this.now(); const prizeWon = result.score >= this.settings.prizeThreshold && this.prizesAvailable();
    this.meta.playCounter++;
    const id = `${this.meta.deviceId}-${String(this.meta.playCounter).padStart(6, '0')}`;
    let prizeCode = null;
    if (prizeWon) {
      // A deterministic fallback guarantees termination even with a constant RNG.
      let value = 0; const space = C.CODE_ALPHABET.length ** C.CODE_LENGTH;
      const used = new Set(this.plays.map(play => play.prizeCode));
      prizeCode = `TD-${this.code()}`;
      while (used.has(prizeCode) && value < space) {
        let number = value++; let code = '';
        for (let i = 0; i < C.CODE_LENGTH; i++) { code = C.CODE_ALPHABET[number % C.CODE_ALPHABET.length] + code; number = Math.floor(number / C.CODE_ALPHABET.length); }
        prizeCode = `TD-${code}`;
      }
    }
    const play = repairPlay({ ...result, id, ts, prizeWon, prizeCode });
    if (!play) { this.meta.playCounter--; this.recordError('Invalid round result'); return null; }
    this.plays.push(play); this.write('meta', this.meta); this.write('plays', this.plays);
    if (this.usageBytes() > C.STORAGE_WARNING_BYTES && !this.warning) this.warning = 'storageFull';
    return { play, position: this.ranking().findIndex(item => item.id === id) + 1, newRecord: !previous || play.score > previous.score };
  }

  /** @param {string} id @param {any} input @returns {any} */
  saveLead(id, input) {
    const lead = validateLead(input); if (!lead.ok) return lead;
    const play = this.plays.find(item => item.id === id);
    if (!play) return { ok: false, error: 'saveFailed' };
    play.name = lead.name; play.phone = lead.phone; play.email = lead.email; play.consent = lead.consent; play.leadAt = this.now();
    const durable = this.write('plays', this.plays);
    return { ok: true, durable, play };
  }

  /** @param {any} settings @param {string} deviceLabel @returns {boolean} */
  saveSettings(settings, deviceLabel = this.meta.deviceLabel) {
    this.settings = repairSettings({ ...this.settings, ...settings });
    this.meta.deviceLabel = String(deviceLabel).trim().slice(0, 100);
    const saved = this.write('settings', this.settings); const metaSaved = this.write('meta', this.meta);
    return saved && metaSaved;
  }
  /** @param {string} id @param {boolean} delivered @returns {boolean} */
  markDelivered(id, delivered) {
    const play = this.plays.find(item => item.id === id);
    if (!play?.prizeWon) return false;
    play.prizeDelivered = Boolean(delivered); return this.write('plays', this.plays);
  }
  /** @returns {boolean} */
  resetRanking() { this.meta.rankingResetAt = this.now(); return this.write('meta', this.meta); }
  /** Delete only this app's namespace; keep in-memory data if deletion is denied. @returns {boolean} */
  clearAll() {
    try {
      if (!this.backend) throw new Error('Storage unavailable');
      const keys = [];
      for (let i = 0; i < this.backend.length; i++) { const key = this.backend.key(i); if (key?.startsWith('tb2d.')) keys.push(key); }
      for (const key of keys) this.backend.removeItem(key);
      this.warning = null; this.load(); return true;
    } catch { this.warning = 'storageUnavailable'; return false; }
  }

  /** @returns {number} UTF-16 estimate including backups. */
  usageBytes() {
    try {
      if (!this.backend) return 0;
      let bytes = 0;
      for (let i = 0; i < this.backend.length; i++) {
        const key = this.backend.key(i);
        if (key?.startsWith('tb2d.')) bytes += (key.length + (this.backend.getItem(key)?.length || 0)) * 2;
      }
      return bytes;
    } catch { this.warning = 'storageUnavailable'; return 0; }
  }
}
