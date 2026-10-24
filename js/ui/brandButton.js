import { BRAND_SVG } from '../render/brand.js';
import { es } from '../i18n/es.js';
import { h } from './dom.js';

/** Hidden staff trigger surface. @returns {HTMLButtonElement} */
export function brandButton() {
  const button = h('button', 'screen-brand'); button.type = 'button';
  button.dataset.admin = '';
  button.setAttribute('aria-label', es.admin);
  button.append(new DOMParser().parseFromString(BRAND_SVG, 'image/svg+xml').documentElement);
  return button;
}
