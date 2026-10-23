import { EMULATED_MOUSE_DELAY_MS, MOUSE_BUTTON_PRIMARY } from '../config/constants.js';

/** @param {EventTarget | null} target @returns {boolean} */
export function isNativeControl(target) {
  return Boolean(target?.closest?.('input, button, select, textarea, [data-native-scroll]'));
}

export class InputManager {
  /** @param {{surface: HTMLElement, toWorld: (x: number, y: number, out: {x: number, y: number}) => void, onInput: (event: any) => void, mouseEnabled?: boolean}} options */
  constructor({ surface, toWorld, onInput, mouseEnabled = false }) {
    this.surface = surface;
    this.toWorld = toWorld;
    this.onInput = onInput;
    this.mouseEnabled = mouseEnabled;
    this.activeId = null;
    this.lastTouchTime = -Infinity;
    this.nativeGesture = false;
    this.enabled = true;
    this.started = false;
    this.sample = { type: '', x: 0, y: 0, t: 0, source: '' };
    this.onTouch = this.onTouch.bind(this);
    this.onMouse = this.onMouse.bind(this);
  }

  /** @returns {void} */
  start() {
    if (this.started) return;
    this.started = true;
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
      this.surface.addEventListener(type, this.onTouch, { passive: false });
    }
    if (this.mouseEnabled) {
      this.surface.addEventListener('mousedown', this.onMouse);
      this.surface.ownerDocument.addEventListener('mousemove', this.onMouse);
      this.surface.ownerDocument.addEventListener('mouseup', this.onMouse);
    }
  }

  /** @param {TouchEvent} event @returns {void} */
  onTouch(event) {
    this.lastTouchTime = event.timeStamp;
    if (!isNativeControl(event.target) && event.cancelable) event.preventDefault();
    if (!this.enabled) return;
    let touch = null;
    if (event.type === 'touchstart') {
      if (this.activeId !== null) return;
      touch = event.changedTouches[0];
      if (!touch) return;
      this.activeId = touch.identifier;
      this.nativeGesture = isNativeControl(event.target);
    } else {
      for (let index = 0; index < event.changedTouches.length; index++) {
        if (event.changedTouches[index].identifier === this.activeId) {
          touch = event.changedTouches[index];
          break;
        }
      }
    }
    if (!touch) return;
    const type = event.type.slice('touch'.length);
    if (!this.nativeGesture) this.dispatch(type, touch.clientX, touch.clientY, event.timeStamp, 'touch');
    if (type === 'end' || type === 'cancel') {
      this.activeId = null;
      this.nativeGesture = false;
    }
  }

  /** @param {MouseEvent} event @returns {void} */
  onMouse(event) {
    if (!this.enabled || event.timeStamp - this.lastTouchTime < EMULATED_MOUSE_DELAY_MS) return;
    if (event.type === 'mousedown') {
      if (event.button !== MOUSE_BUTTON_PRIMARY || this.activeId !== null || isNativeControl(event.target)) return;
      this.activeId = 'mouse';
    } else if (this.activeId !== 'mouse') return;
    if (event.cancelable) event.preventDefault();
    const type = event.type === 'mousedown' ? 'start' : event.type === 'mouseup' ? 'end' : 'move';
    this.dispatch(type, event.clientX, event.clientY, event.timeStamp, 'mouse');
    if (type === 'end') this.activeId = null;
  }

  /** @param {string} type @param {number} x CSS px. @param {number} y CSS px. @param {number} t ms. @param {string} source @returns {void} */
  dispatch(type, x, y, t, source) {
    this.toWorld(x, y, this.sample);
    this.sample.type = type;
    this.sample.t = t;
    this.sample.source = source;
    this.onInput(this.sample);
  }

  /** Cancel an interrupted gesture, retaining its last timestamp and position. @returns {void} */
  cancel() {
    if (this.activeId !== null && !this.nativeGesture) {
      this.sample.type = 'cancel';
      this.onInput(this.sample);
    }
    this.activeId = null;
    this.nativeGesture = false;
  }

  /** @param {boolean} enabled @returns {void} */
  setEnabled(enabled) { if (!enabled) this.cancel(); this.enabled = enabled; }

  /** @returns {void} */
  destroy() {
    this.cancel();
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) this.surface.removeEventListener(type, this.onTouch);
    this.surface.removeEventListener('mousedown', this.onMouse);
    this.surface.ownerDocument.removeEventListener('mousemove', this.onMouse);
    this.surface.ownerDocument.removeEventListener('mouseup', this.onMouse);
    this.started = false;
  }
}
