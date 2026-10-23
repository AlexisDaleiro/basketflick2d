import { es } from '../i18n/es.js';
import { h, show } from './dom.js';

export class IdleWarning {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    const card = h('div', 'modal-card');
    this.count = h('p', 'idle-count');
    this.count.setAttribute('aria-live', 'polite');
    const heading = h('h2', '', es.idle);
    heading.id = 'idle-title';
    root.setAttribute('aria-labelledby', heading.id);
    this.button = h('button', 'primary', es.continue);
    this.button.type = 'button';
    card.append(heading, this.count, this.button);
    root.append(card);
  }

  /** @param {number} seconds Zero hides the warning. @returns {void} */
  setSeconds(seconds) {
    this.count.textContent = String(seconds);
    show(this.root, seconds > 0);
  }
}
