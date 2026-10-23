import { es } from '../i18n/es.js';
import { drawLab } from '../render/draw/lab.js';
import { h, show } from './dom.js';
import { STATES } from '../config/constants.js';

export class PhysicsScreen {
  /** @param {{root:HTMLElement,lab:import('../game/PhysicsLab.js').PhysicsLab,navigate:(name:string)=>void}} options */
  constructor({ root, lab, navigate }) {
    this.lab = lab;
    this.navigate = navigate;
    this.panel = h('section', 'physics-screen');
    this.panel.dataset.state = STATES.PLAYING;
    this.panel.setAttribute('aria-labelledby', 'physics-title');
    const heading = h('h1', '', es.physicsTitle);
    heading.id = 'physics-title';
    this.status = h('p', 'physics-status', es.labFeedback.ready);
    this.status.setAttribute('aria-live', 'polite');
    this.finish = h('button', 'primary', es.finish);
    this.admin = h('button', 'secondary', es.admin);
    this.finish.type = 'button'; this.admin.type = 'button';
    const actions = h('div', 'physics-actions');
    actions.append(this.finish, this.admin);
    this.panel.append(heading, this.status, actions);
    show(this.panel, false);
    root.append(this.panel);
    this.controller = null;
    this.revision = -1;
  }

  /** @param {any} payload @returns {void} */
  enter(payload) {
    this.lab.reset();
    this.refreshFeedback();
    this.controller = new AbortController();
    this.finish.addEventListener('click', () => this.navigate(STATES.GAME_OVER), { signal: this.controller.signal });
    this.admin.addEventListener('click', () => this.navigate(STATES.ADMIN_PANEL), { signal: this.controller.signal });
    show(this.panel, true);
  }

  /** @returns {void} */
  exit() { this.controller?.abort(); this.controller = null; this.lab.clear(); show(this.panel, false); }

  /** @param {number} dt Fixed step supplied by GameLoop. @returns {void} */
  update(dt) { this.lab.step(); }

  /** @returns {void} */
  refreshFeedback() {
    if (this.revision === this.lab.revision) return;
    this.revision = this.lab.revision;
    this.status.textContent = es.labFeedback[this.lab.feedback];
  }

  /** @param {CanvasRenderingContext2D} ctx @returns {void} */
  render(ctx) { drawLab(ctx, this.lab); this.refreshFeedback(); }

  /** @param {{type:string,x:number,y:number,t:number}} event @returns {void} */
  onInput(event) { this.lab.onInput(event); this.refreshFeedback(); }
}
