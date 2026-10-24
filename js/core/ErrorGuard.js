import { ERROR_REPEAT_MS, STATES } from '../config/constants.js';

/** Records uncaught errors and abandons a live round instead of leaving a dead screen. */
export class ErrorGuard {
  /**
   * @param {{target: EventTarget, storage: {recordError: (msg: string, state?: string, stack?: string) => void},
   *   machine: {current: string|null, transition: (next: string) => boolean}, now?: () => number}} options
   */
  constructor({ target, storage, machine, now = () => performance.now() }) {
    this.target = target; this.storage = storage; this.machine = machine; this.now = now;
    this.controller = null; this.lastMessage = ''; this.lastTime = -Infinity;
  }

  /** @returns {void} */
  start() {
    if (this.controller) return;
    this.controller = new AbortController();
    const { signal } = this.controller;
    this.target.addEventListener('error', event => this.handle(event.error ?? event.message), { signal });
    this.target.addEventListener('unhandledrejection', event => this.handle(event.reason), { signal });
  }

  /** @param {unknown} error @returns {void} */
  handle(error) {
    const state = this.machine.current || '';
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const time = this.now();
    // A fault repeating every frame is stored once per burst, not 60 times per second.
    if (message !== this.lastMessage || time - this.lastTime >= ERROR_REPEAT_MS) {
      this.storage.recordError(message, state, error instanceof Error ? error.stack || '' : '');
    }
    this.lastMessage = message; this.lastTime = time;
    if (state !== STATES.PLAYING) return;
    try { this.machine.transition(STATES.ATTRACT_MODE); }
    catch (failure) { this.storage.recordError(String(failure), state, failure instanceof Error ? failure.stack || '' : ''); }
  }

  /** @returns {void} */
  destroy() { this.controller?.abort(); this.controller = null; }
}
