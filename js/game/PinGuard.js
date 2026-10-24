import * as C from '../config/constants.js';
import { hashPin, makeSalt } from '../storage/hash.js';

/** PIN checks and cooldown survive closing the modal and reloading. No DOM dependency. */
export class PinGuard {
  /** @param {import('../storage/Storage.js').Storage} storage @param {any} [cryptoProvider] */
  constructor(storage, cryptoProvider = globalThis.crypto) {
    this.storage = storage; this.crypto = cryptoProvider; this.pending = false;
    const saved = storage.read('pinGuard', {});
    this.failures = Number.isInteger(saved?.failures) && saved.failures >= 0 ? saved.failures % C.PIN_ATTEMPTS : 0;
    this.blockedUntil = Number.isFinite(saved?.blockedUntil) ? saved.blockedUntil : 0;
  }
  /** @returns {Promise<void>} */
  async initialize() {
    const settings = this.storage.settings;
    if (/^[a-f0-9]{32}$/.test(settings.pinSalt) && /^(?:[a-f0-9]{64}|[a-f0-9]{16})$/.test(settings.pinHash)) return;
    if (!this.initializing) this.initializing = this.setPin(C.DEFAULT_PIN).finally(() => { this.initializing = null; });
    await this.initializing;
  }
  /** @returns {number} */
  remaining() { return Math.max(0, Math.ceil((this.blockedUntil - this.storage.now()) / C.MS_PER_SECOND)); }
  /** @returns {void} */
  persist() { this.storage.write('pinGuard', { failures: this.failures, blockedUntil: this.blockedUntil }); }
  /** @param {string} pin @returns {Promise<{ok:boolean,error?:string}>} */
  async verify(pin) {
    if (this.pending || this.remaining()) return { ok: false, error: 'pinLocked' };
    this.pending = true;
    try {
      await this.initialize();
      const settings = this.storage.settings;
      const algorithm = settings.pinHash.length === 16 ? 'fnv1a64' : 'sha256';
      const result = await hashPin(settings.pinSalt, pin, algorithm, this.crypto?.subtle || null);
      if (result.hash === settings.pinHash) {
        this.failures = 0; this.blockedUntil = 0; this.persist(); return { ok: true };
      }
      if (++this.failures >= C.PIN_ATTEMPTS) { this.failures = 0; this.blockedUntil = this.storage.now() + C.PIN_LOCK_MS; }
      this.persist(); return { ok: false, error: this.remaining() ? 'pinLocked' : 'pinWrong' };
    } catch { return { ok: false, error: 'pinUnavailable' }; }
    finally { this.pending = false; }
  }
  /** @param {string} pin @returns {Promise<boolean>} */
  async setPin(pin) {
    if (!new RegExp(`^\\d{${C.PIN_MIN},${C.PIN_MAX}}$`).test(pin)) return false;
    const salt = makeSalt(this.crypto); const result = await hashPin(salt, pin, 'auto', this.crypto?.subtle || null);
    this.storage.settings.pinSalt = salt; this.storage.settings.pinHash = result.hash;
    this.storage.settings.pinIsDefault = pin === C.DEFAULT_PIN;
    return this.storage.write('settings', this.storage.settings);
  }
}
