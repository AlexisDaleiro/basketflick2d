import { APP_VERSION } from '../config/constants.js';
import { es } from '../i18n/es.js';
import { h, show } from './dom.js';

/** Shows capabilities actually present; H5 does not install a service worker. */
export class SystemStatus {
  /** @param {HTMLElement} root @param {import('../storage/Storage.js').Storage} storage */
  constructor(root, storage) {
    this.storage = storage; this.info = h('p', 'description');
    this.updateButton = h('button', 'secondary', es.updateApp);
    this.errors = h('textarea'); this.errors.readOnly = true; this.errors.setAttribute('aria-label', es.errorLog);
    this.copy = h('button', 'secondary', es.copyErrors); this.status = h('p', 'form-error');
    root.append(this.info, this.updateButton, this.errors, this.copy, this.status); show(this.updateButton, false);
  }
  /** @param {AbortSignal} signal @returns {Promise<void>} */
  async start(signal) {
    this.signal = signal; this.status.textContent = '';
    for (const type of ['online', 'offline']) window.addEventListener(type, () => this.refresh(), { signal });
    this.errors.value = JSON.stringify(this.storage.errors, null, 2);
    this.copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(this.errors.value); if (!signal.aborted) this.status.textContent = es.copied; }
      catch { if (!signal.aborted) { this.status.textContent = es.copyManual; this.errors.focus(); this.errors.select(); } }
    }, { signal });
    this.updateButton.addEventListener('click', () => {
      if (!this.registration?.waiting) return;
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true, signal });
      try { this.registration.waiting.postMessage({ type: 'SKIP_WAITING' }); }
      catch { this.status.textContent = es.updateUnavailable; }
    }, { signal });
    await this.refresh();
  }
  /** @returns {Promise<void>} */
  async refresh() {
    let keys = []; let persisted = null; let registration = null;
    try { keys = (await globalThis.caches?.keys() || []).filter(key => key.startsWith('tb2d-v')); } catch { /* Optional capability. */ }
    try { persisted = await navigator.storage?.persisted?.(); } catch { /* Optional capability. */ }
    try { registration = await navigator.serviceWorker?.getRegistration?.(); } catch { /* Optional capability. */ }
    if (this.signal?.aborted) return;
    this.registration = registration;
    this.info.textContent = es.systemInfo(APP_VERSION, keys.join(', ') || es.noCache, Boolean(registration?.active && keys.length),
      this.storage.usageBytes(), persisted === undefined || persisted === null ? es.unavailable : persisted ? es.yes : es.no, navigator.onLine);
    show(this.updateButton, Boolean(registration?.waiting));
    if (registration && !this.watching) {
      this.watching = registration;
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (!this.signal.aborted) show(this.updateButton, Boolean(registration.waiting)); }, { signal: this.signal });
      }, { signal: this.signal });
      this.signal.addEventListener('abort', () => { this.watching = null; this.errors.value = ''; }, { once: true });
    }
  }
}
