/** @param {string} tag @param {string} [className] @param {string} [text] @returns {HTMLElement} */
export function h(tag, className = '', text = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

/** @param {HTMLElement} element @param {boolean} visible @returns {void} */
export function show(element, visible) { element.hidden = !visible; }
