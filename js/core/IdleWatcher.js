import { IDLE_POLL_MS, IDLE_TIMEOUT_MS, IDLE_WARNING_MS, MS_PER_SECOND } from '../config/constants.js';

export class IdleWatcher {
  /** @param {{target: EventTarget, onWarning: (seconds: number) => void, onTimeout: () => void, now?: () => number}} options */
  constructor({ target, onWarning, onTimeout, now = () => performance.now() }) {
    this.target = target;
    this.onWarning = onWarning;
    this.onTimeout = onTimeout;
    this.now = now;
    this.enabled = false;
    this.lastActivity = now();
    this.seconds = 0;
    this.timer = null;
    this.reset = this.reset.bind(this);
    this.update = this.update.bind(this);
    this.events = ['touchstart', 'pointerdown', 'keydown', 'input'];
  }

  /** @returns {void} */
  start() {
    if (this.timer !== null) return;
    for (const type of this.events) this.target.addEventListener(type, this.reset, { capture: true, passive: true });
    this.timer = setInterval(this.update, IDLE_POLL_MS);
  }

  /** @param {boolean} enabled @returns {void} */
  setEnabled(enabled) { this.enabled = enabled; this.reset(); }

  /** @returns {void} */
  reset() {
    this.lastActivity = this.now();
    if (this.seconds !== 0) this.onWarning(0);
    this.seconds = 0;
  }

  /** Check elapsed wall time even when the animation loop is paused. @returns {void} */
  update() {
    if (!this.enabled) return;
    const elapsed = this.now() - this.lastActivity;
    if (elapsed >= IDLE_TIMEOUT_MS) {
      this.setEnabled(false);
      this.onTimeout();
      return;
    }
    const seconds = elapsed >= IDLE_WARNING_MS
      ? Math.ceil((IDLE_TIMEOUT_MS - elapsed) / MS_PER_SECOND) : 0;
    if (seconds !== this.seconds) {
      this.seconds = seconds;
      this.onWarning(seconds);
    }
  }

  /** @returns {void} */
  destroy() {
    clearInterval(this.timer);
    this.timer = null;
    for (const type of this.events) this.target.removeEventListener(type, this.reset, { capture: true });
    this.setEnabled(false);
  }
}
