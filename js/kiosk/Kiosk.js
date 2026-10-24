import { isNativeControl } from '../input/InputManager.js';

export class Kiosk {
  /** @param {{onVisibility: (hidden: boolean) => void, desktopPreview?: boolean}} options */
  constructor({ onVisibility, desktopPreview = false }) {
    this.onVisibility = onVisibility;
    this.desktopPreview = desktopPreview;
    this.wakeLock = null;
    this.wakePending = false;
    this.activated = false;
    this.controller = null;
    this.handleVisibility = this.handleVisibility.bind(this);
    this.activate = this.activate.bind(this);
    this.blockGesture = this.blockGesture.bind(this);
    this.handleBack = this.handleBack.bind(this);
  }

  /** @returns {void} */
  start() {
    if (this.controller) return;
    this.controller = new AbortController();
    const signal = this.controller.signal;
    for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'contextmenu', 'dblclick', 'selectstart']) {
      document.addEventListener(type, this.blockGesture, { capture: true, passive: false, signal });
    }
    document.addEventListener('touchstart', this.activate, { capture: true, passive: true, signal });
    document.addEventListener('pointerdown', this.activate, { capture: true, passive: true, signal });
    document.addEventListener('keydown', this.activate, { capture: true, signal });
    document.addEventListener('visibilitychange', this.handleVisibility, { signal });
    window.addEventListener('popstate', this.handleBack, { signal });
    history.pushState({ kiosk: true }, '', location.href);
  }

  /** @param {Event} event @returns {void} */
  blockGesture(event) {
    if (event.type === 'selectstart' && event.target?.matches?.('input')) return;
    if (event.cancelable) event.preventDefault();
  }

  /** Request privileged capabilities directly within a user gesture. @param {Event} event @returns {void} */
  activate(event) {
    if (!event.isTrusted || this.activated || (event.type === 'keydown' && isNativeControl(event.target))) return;
    this.activated = true;
    this.acquireWakeLock();
    this.enterFullscreen();
  }

  /** @returns {Promise<void>} */
  async enterFullscreen() {
    if (this.desktopPreview) return;
    try { await document.documentElement.requestFullscreen?.(); } catch { /* Optional browser capability. */ }
  }

  /** @returns {Promise<void>} */
  async acquireWakeLock() {
    if (document.hidden || this.wakeLock || this.wakePending || !navigator.wakeLock?.request) return;
    this.wakePending = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!this.controller || document.hidden) {
        await lock.release();
        return;
      }
      this.wakeLock = lock;
      lock.addEventListener('release', () => {
        if (this.wakeLock === lock) this.wakeLock = null;
      }, { once: true });
    } catch { /* An unsupported or denied wake lock must not interrupt navigation. */ }
    finally { this.wakePending = false; }
  }

  /** @returns {void} */
  handleVisibility() {
    this.onVisibility(document.hidden);
    if (!document.hidden && this.activated) this.acquireWakeLock();
  }

  /** @returns {void} */
  handleBack() { history.pushState({ kiosk: true }, '', location.href); }

  /** @returns {Promise<void>} */
  async destroy() {
    this.controller?.abort();
    this.controller = null;
    try { await this.wakeLock?.release(); } catch { /* Already released by the browser. */ }
    this.wakeLock = null;
  }
}
