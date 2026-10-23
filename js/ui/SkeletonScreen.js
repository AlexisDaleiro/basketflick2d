import { HEARTBEAT_HEIGHT, HEARTBEAT_MARGIN, HEARTBEAT_PERIOD, HEARTBEAT_WIDTH, HEARTBEAT_Y, STATES, WORLD_WIDTH } from '../config/constants.js';
import { theme } from '../config/theme.js';
import { es } from '../i18n/es.js';
import { BRAND_SVG } from '../render/brand.js';
import { h, show } from './dom.js';

/** A fully functional navigation screen shared by the four H1 states. */
export class SkeletonScreen {
  /** @param {{name: string, root: HTMLElement, navigate: (name: string) => void}} options */
  constructor({ name, root, navigate }) {
    this.name = name;
    this.navigate = navigate;
    this.elapsed = 0;
    this.controller = null;
    this.panel = h('section', 'screen');
    this.panel.dataset.state = name;
    this.panel.setAttribute('aria-labelledby', `${name}-title`);
    this.badge = h('p', 'badge', es.milestone);
    const brand = h('div', 'brand');
    // Only the trusted, static SVG string is parsed; no user input enters markup.
    brand.append(new DOMParser().parseFromString(BRAND_SVG, 'image/svg+xml').documentElement);
    brand.setAttribute('aria-label', es.brand);
    const heading = name === STATES.ATTRACT_MODE ? es.title : name === STATES.PLAYING
      ? es.playingTitle : name === STATES.GAME_OVER ? es.overTitle : es.adminTitle;
    this.heading = h('h1', '', heading);
    this.heading.id = `${name}-title`;
    const description = name === STATES.ATTRACT_MODE ? es.attractDescription : name === STATES.PLAYING
      ? es.playingDescription : name === STATES.GAME_OVER ? es.overDescription : es.adminDescription;
    this.actions = h('div', 'actions');
    this.inputStatus = h('p', 'input-status', es.inputReady);
    this.panel.append(this.badge, brand, h('p', 'brand-caption', es.brand), this.heading,
      h('p', 'description', description), this.actions);
    if (name === STATES.PLAYING) this.panel.append(this.inputStatus);
    this.buttons = [];
    if (name === STATES.ATTRACT_MODE) this.addAction(es.start, STATES.PLAYING, 'primary');
    if (name === STATES.PLAYING) this.addAction(es.finish, STATES.GAME_OVER, 'primary');
    if (name === STATES.GAME_OVER) {
      this.addAction(es.replay, STATES.PLAYING, 'primary');
      this.addAction(es.skip, STATES.ATTRACT_MODE, 'secondary');
    }
    if (name === STATES.ADMIN_PANEL) this.addAction(es.exit, STATES.ATTRACT_MODE, 'primary');
    else this.addAction(es.admin, STATES.ADMIN_PANEL, 'secondary');
    show(this.panel, false);
    root.append(this.panel);
  }

  /** @param {string} label @param {string} destination @param {string} className @returns {void} */
  addAction(label, destination, className) {
    const button = h('button', className, label);
    button.type = 'button';
    this.buttons.push({ button, destination });
    this.actions.append(button);
  }

  /** @param {any} payload @returns {void} */
  enter(payload) {
    this.elapsed = 0;
    this.inputStatus.textContent = es.inputReady;
    this.controller = new AbortController();
    for (const action of this.buttons) {
      action.button.addEventListener('click', () => this.navigate(action.destination), { signal: this.controller.signal });
    }
    show(this.panel, true);
  }

  /** @returns {void} */
  exit() {
    this.controller?.abort();
    this.controller = null;
    show(this.panel, false);
  }

  /** @param {number} dt Seconds of active simulation. @returns {void} */
  update(dt) { this.elapsed = (this.elapsed + dt) % HEARTBEAT_PERIOD; }

  /** A small activity marker makes pause/resume observable without gameplay. @param {CanvasRenderingContext2D} ctx @returns {void} */
  render(ctx) {
    ctx.fillStyle = this.name === STATES.ATTRACT_MODE ? theme.orange : theme.teal;
    const range = WORLD_WIDTH - HEARTBEAT_MARGIN * 2 - HEARTBEAT_WIDTH;
    ctx.fillRect(HEARTBEAT_MARGIN + range * this.elapsed / HEARTBEAT_PERIOD, HEARTBEAT_Y, HEARTBEAT_WIDTH, HEARTBEAT_HEIGHT);
  }

  /** @param {{type: string, x: number, y: number}} event @returns {void} */
  onInput(event) {
    if (this.name === STATES.PLAYING) {
      this.inputStatus.textContent = es.input(es.inputPhases[event.type], Math.round(event.x), Math.round(event.y));
    }
  }
}
