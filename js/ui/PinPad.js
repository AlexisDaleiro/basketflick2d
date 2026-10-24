import { PIN_MIN, PIN_MAX } from '../config/constants.js';
import { es } from '../i18n/es.js';
import { h, show } from './dom.js';

/** Own numeric keypad: no system keyboard and no plaintext PIN in the DOM. */
export class PinPad {
  /** @param {HTMLElement} parent */
  constructor(parent) {
    this.panel = h('section', 'pin-pad'); this.panel.setAttribute('role', 'dialog'); this.panel.setAttribute('aria-modal', 'true');
    this.title = h('h2'); this.title.id = 'pin-title'; this.panel.setAttribute('aria-labelledby', this.title.id);
    this.dots = h('p', 'pin-dots'); this.dots.setAttribute('aria-live', 'polite');
    this.message = h('p', 'form-error'); this.message.setAttribute('role', 'status');
    this.keys = h('div', 'pin-keys'); this.buttons = [];
    for (const value of ['1','2','3','4','5','6','7','8','9','delete','0','ok']) {
      const button = h('button', value === 'ok' ? 'primary' : 'secondary', value === 'delete' ? es.pinDelete : value === 'ok' ? es.pinOk : value);
      button.type = 'button'; this.buttons.push({ value, button }); this.keys.append(button);
    }
    this.cancel = h('button', 'secondary', es.cancel); this.cancel.type = 'button';
    this.panel.append(this.title, this.dots, this.message, this.keys, this.cancel); parent.append(this.panel); show(this.panel, false);
  }
  /** @param {string} title @param {(pin:string)=>Promise<void>} submit @param {()=>void} cancel @returns {void} */
  open(title, submit, cancel) {
    this.close(); this.value = ''; this.busy = false; this.locked = false; this.title.textContent = title; this.message.textContent = '';
    this.controller = new AbortController(); const signal = this.controller.signal;
    for (const { value, button } of this.buttons) button.addEventListener('click', async () => {
      if (this.busy || this.locked) return;
      if (value === 'delete') this.value = this.value.slice(0, -1);
      else if (value === 'ok') {
        if (this.value.length < PIN_MIN) { this.message.textContent = es.pinLength; return; }
        this.busy = true; this.refresh(); const entered = this.value; this.value = '';
        const controller = this.controller;
        try { await submit(entered); }
        catch { if (!controller.signal.aborted) this.message.textContent = es.pinUnavailable; }
        finally { if (!controller.signal.aborted) { this.busy = false; this.refresh(); } }
        return;
      } else if (this.value.length < PIN_MAX) this.value += value;
      this.refresh();
    }, { signal });
    this.cancel.addEventListener('click', cancel, { signal }); this.refresh(); show(this.panel, true);
    this.buttons[0].button.focus({ preventScroll: true });
  }
  /** @returns {void} */
  refresh() { this.dots.textContent = '•'.repeat(this.value.length) || '—'; for (const { button } of this.buttons) button.disabled = this.busy || this.locked; }
  /** @returns {void} */
  close() { this.controller?.abort(); this.value = ''; show(this.panel, false); }
}
