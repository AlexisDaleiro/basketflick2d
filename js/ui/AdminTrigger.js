import * as C from '../config/constants.js';

/** Pure gesture recognizer shared by pointer and keyboard paths. */
export class AdminGesture {
  constructor() { this.reset(); }
  /** @returns {void} */
  reset() { this.active = false; this.fired = false; this.taps = 0; this.firstTapAt = -Infinity; this.startedAt = 0; this.x = 0; this.y = 0; }
  /** @param {number} x @param {number} y @param {number} now ms. @returns {void} */
  start(x, y, now) { this.active = true; this.fired = false; this.x = x; this.y = y; this.startedAt = now; }
  /** @param {number} x @param {number} y @returns {void} */
  move(x, y) { if (Math.hypot(x - this.x, y - this.y) > C.ADMIN_MOVE_MAX) { this.active = false; this.taps = 0; } }
  /** @param {number} now ms. @returns {boolean} */
  hold(now) {
    if (!this.active || this.fired || now - this.startedAt < C.ADMIN_HOLD_MS) return false;
    this.fired = true; this.active = false; this.taps = 0; return true;
  }
  /** @param {number} now ms. @returns {boolean} */
  end(now) {
    if (!this.active || this.fired) return false;
    this.active = false;
    if (now - this.firstTapAt > C.ADMIN_TAP_WINDOW_MS) { this.taps = 0; this.firstTapAt = now; }
    return ++this.taps >= C.ADMIN_TAPS;
  }
}

/** Delegated lifecycle: only logos participate; native buttons keep flick input separate. */
export class AdminTrigger {
  /** @param {{target:Document,onActivate:()=>void,debug?:boolean}} options */
  constructor({ target, onActivate, debug = false }) { this.target = target; this.onActivate = onActivate; this.debug = debug; this.gesture = new AdminGesture(); this.timer = null; this.logo = null; this.pointer = null; }
  /** @returns {void} */
  start() {
    this.controller = new AbortController(); const options = { capture: true, signal: this.controller.signal };
    this.target.addEventListener('pointerdown', event => {
      const logo = event.target.closest?.('[data-admin]');
      if (!logo || this.pointer !== null || event.button !== 0) return;
      this.logo = logo; this.pointer = event.pointerId; this.gesture.start(event.clientX, event.clientY, performance.now());
      try { logo.setPointerCapture?.(event.pointerId); } catch { /* Capture is optional. */ }
      const checkHold = () => {
        if (!this.gesture.active) return;
        const now = performance.now();
        if (this.gesture.hold(now)) this.activate();
        else this.timer = setTimeout(checkHold, Math.ceil(C.ADMIN_HOLD_MS - (now - this.gesture.startedAt)));
      };
      this.timer = setTimeout(checkHold, C.ADMIN_HOLD_MS);
    }, options);
    this.target.addEventListener('pointermove', event => { if (event.pointerId === this.pointer) this.gesture.move(event.clientX, event.clientY); }, options);
    this.target.addEventListener('pointerup', event => {
      if (event.pointerId !== this.pointer) return;
      this.gesture.move(event.clientX, event.clientY);
      const activate = this.gesture.hold(performance.now()) || this.gesture.end(performance.now());
      clearTimeout(this.timer); this.pointer = null;
      if (activate) this.activate(); else { this.clearRing(); this.logo = null; }
    }, options);
    for (const type of ['pointercancel', 'lostpointercapture']) this.target.addEventListener(type, event => { if (event.pointerId === this.pointer) this.cancel(); }, options);
    this.target.addEventListener('keydown', event => {
      if (!event.target.closest?.('[data-admin]') || event.repeat || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); const now = performance.now(); this.gesture.start(0, 0, now);
      if (this.gesture.end(now)) this.activate();
    }, options);
  }
  /** @returns {void} */
  clearRing() { this.logo?.style.removeProperty('--admin-progress'); }
  /** @returns {void} */
  activate() { this.cancel(); this.onActivate(); }
  /** @returns {void} */
  cancel() { clearTimeout(this.timer); this.clearRing(); this.logo = null; this.pointer = null; this.gesture.reset(); }
  /** @param {number} now ms. @returns {void} */
  update(now) {
    if (this.debug && this.logo) this.logo.style.setProperty('--admin-progress', `${this.gesture.active ? Math.min(1, (now - this.gesture.startedAt) / C.ADMIN_HOLD_MS) * 360 : 0}deg`);
  }
  /** @returns {void} */
  destroy() { this.cancel(); this.controller?.abort(); }
}
