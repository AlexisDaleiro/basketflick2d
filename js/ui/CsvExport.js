import { createCsv, csvFilename } from '../storage/csv.js';
import { dayKey } from '../storage/ranking.js';
import { es } from '../i18n/es.js';
import { h, show } from './dom.js';

/** Download/share/clipboard are optional; the read-only text fallback is always present. */
export class CsvExport {
  /** @param {HTMLElement} root @param {import('../storage/Storage.js').Storage} storage */
  constructor(root, storage) {
    this.storage = storage; this.panel = h('section', 'csv-export'); this.panel.setAttribute('aria-label', es.csvTitle);
    this.download = h('button', 'primary', es.downloadFile); this.share = h('button', 'secondary', es.shareFile);
    this.copy = h('button', 'secondary', es.copyCsv); this.closeButton = h('button', 'secondary', es.close);
    this.text = h('textarea'); this.text.readOnly = true; this.text.setAttribute('aria-label', es.csvContent);
    this.status = h('p', 'form-error'); this.status.setAttribute('role', 'status');
    this.panel.append(h('h2', '', es.csvTitle), this.download, this.share, this.copy, this.text, this.status, this.closeButton);
    root.append(this.panel); show(this.panel, false); this.url = null;
  }
  /** @param {boolean} today @returns {void} */
  open(today) {
    this.close(); this.controller = new AbortController(); const signal = this.controller.signal;
    const storage = this.storage;
    const plays = today ? storage.plays.filter(play => play.dayKey === dayKey(storage.now())) : storage.plays;
    this.csv = createCsv(plays, { eventName: storage.settings.eventName, deviceLabel: storage.meta.deviceLabel });
    this.text.value = this.csv;
    this.filename = csvFilename(storage.settings.eventName, storage.meta.deviceLabel, storage.now());
    this.status.textContent = ''; this.file = null;
    try { this.file = new File([this.csv], this.filename, { type: 'text/csv;charset=utf-8' }); } catch { /* Text fallback remains. */ }
    let canShare = false; try { canShare = Boolean(this.file && navigator.canShare?.({ files: [this.file] })); } catch { /* Optional. */ }
    show(this.share, canShare);
    this.download.addEventListener('click', () => this.saveFile(), { signal });
    this.share.addEventListener('click', async () => {
      try { await navigator.share({ files: [this.file] }); }
      catch { if (!signal.aborted) this.status.textContent = es.exportFallback; }
    }, { signal });
    this.copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(this.csv); if (!signal.aborted) this.status.textContent = es.copied; }
      catch { if (!signal.aborted) { this.status.textContent = es.exportFallback; this.text.focus(); this.text.select(); } }
    }, { signal });
    this.closeButton.addEventListener('click', () => this.close(), { signal }); show(this.panel, true);
    this.panel.scrollIntoView({ block: 'nearest' });
  }
  /** @returns {void} */
  saveFile() {
    try {
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(new Blob([this.csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = h('a'); anchor.href = this.url; anchor.download = this.filename; this.panel.append(anchor); anchor.click(); anchor.remove();
      this.status.textContent = es.downloadRequested;
    } catch { this.status.textContent = es.exportFallback; }
  }
  /** @returns {void} */
  close() { this.controller?.abort(); if (this.url) URL.revokeObjectURL(this.url); this.url = null; this.text.value = ''; this.csv = ''; this.file = null; show(this.panel, false); }
}
