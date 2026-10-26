import { LOGO_URLS } from '../render/brand.js';
import { es } from '../i18n/es.js';
import { h } from './dom.js';

const BALL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="currentColor" stroke="#000000" stroke-width="4"/><path d="M4 30h52M30 4v52M12 12q36 18 36 36M48 12q-36 18-36 36" fill="none" stroke="#000000" stroke-width="3"/></svg>';

/** @param {'dogs'|'cats'} name @returns {HTMLImageElement} */
function logo(name) {
  const image = h('img'); image.src = LOGO_URLS[name]; image.alt = name === 'dogs' ? es.brand : es.brandCats;
  image.draggable = false; image.decoding = 'async'; return image;
}

/** Hidden staff trigger surface: the Three Cats wordmark at the top right. @returns {HTMLButtonElement} */
export function brandButton() {
  const button = h('button', 'screen-brand brand-card'); button.type = 'button';
  button.dataset.admin = '';
  button.setAttribute('aria-label', es.admin);
  button.append(logo('cats'));
  return button;
}

/** Top row shared by every player-facing screen: Three Dogs, small game title, Three Cats (staff trigger). @param {string} [titleTag] @returns {{bar:HTMLElement,admin:HTMLButtonElement}} */
export function brandBar(titleTag = 'p') {
  const bar = h('header', 'brand-bar');
  const dogs = h('span', 'brand-card brand-dogs'); dogs.append(logo('dogs'));
  const title = h(titleTag, 'brand-title'); title.setAttribute('aria-label', es.title);
  const [wordmark, dimension] = es.title.split(' ');
  const ball = h('span', 'title-ball'); ball.setAttribute('aria-hidden', 'true');
  ball.append(new DOMParser().parseFromString(BALL_SVG, 'image/svg+xml').documentElement);
  title.append(h('span', '', wordmark), ball, h('span', '', dimension));
  const admin = brandButton(); admin.classList.replace('screen-brand', 'brand-cats');
  bar.append(dogs, title, admin);
  return { bar, admin };
}
