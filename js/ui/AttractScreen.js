import { STATES, TICKER_MS, MS_PER_SECOND } from '../config/constants.js';
import { es } from '../i18n/es.js';
import { DemoPlayer } from '../game/DemoPlayer.js';
import { publicName, dayKey } from '../storage/ranking.js';
import { h, show } from './dom.js';
import { brandButton } from './brandButton.js';

export class AttractScreen {
  /** @param {{root:HTMLElement,storage:import('../storage/Storage.js').Storage,navigate:(state:string)=>void}} options */
  constructor({ root, storage, navigate }) {
    this.storage = storage; this.navigate = navigate; this.demo = new DemoPlayer(); this.elapsed = 0;
    this.panel = h('section', 'attract-screen'); this.panel.dataset.state = STATES.ATTRACT_MODE;
    this.panel.setAttribute('aria-label', es.title);
    this.admin = brandButton();
    const header = h('div', 'attract-heading');
    const title = h('h1', 'attract-title'); title.setAttribute('aria-label', es.title);
    const [wordmark, dimension] = es.title.split(' ');
    const ball = h('span', 'title-ball'); ball.setAttribute('aria-hidden', 'true');
    ball.append(new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="currentColor" stroke="#0F1B3D" stroke-width="4"/><path d="M4 30h52M30 4v52M12 12q36 18 36 36M48 12q-36 18-36 36" fill="none" stroke="#0F1B3D" stroke-width="3"/></svg>', 'image/svg+xml').documentElement);
    title.append(h('span', '', wordmark), ball, h('span', '', dimension));
    header.append(h('p', 'brand-caption', es.brand), title);
    this.record = h('p', 'record-card');
    this.prize = h('p', 'prize-invitation'); this.ticker = h('p', 'top-ticker');
    this.start = h('button', 'primary attract-cta', es.start); this.start.type = 'button';
    const footer = h('div', 'attract-actions');
    footer.append(this.record, this.prize, this.ticker, this.start);
    this.panel.append(header, this.admin, footer); show(this.panel, false); root.append(this.panel);
  }
  /** @returns {void} */
  refresh() {
    this.day = dayKey(this.storage.now()); this.top = this.storage.ranking().slice(0, 5);
    this.record.textContent = this.top.length ? es.record(this.top[0].score) : es.firstRecord;
    this.prize.textContent = es.prizeInvitation(this.storage.settings.prizeThreshold);
    show(this.prize, this.storage.prizesAvailable()); this.tickerIndex = -1;
  }
  /** @returns {void} */
  enter() {
    this.elapsed = 0; this.refresh(); this.demo.reset(); this.controller = new AbortController();
    this.start.addEventListener('click', () => this.navigate(STATES.PLAYING), { signal: this.controller.signal });
    this.admin.addEventListener('click', () => this.navigate(STATES.ADMIN_PANEL), { signal: this.controller.signal });
    show(this.panel, true);
  }
  /** @returns {void} */
  exit() { this.controller?.abort(); this.demo.reset(); show(this.panel, false); }
  /** @param {number} dt s. @returns {void} */
  update(dt) {
    this.elapsed += dt * MS_PER_SECOND; this.demo.step();
    // Calendar checks only at ticker boundaries, never allocate Date objects every physics tick.
    const index = Math.floor(this.elapsed / TICKER_MS);
    if (index === this.tickerIndex) return;
    if (dayKey(this.storage.now()) !== this.day) this.refresh();
    this.tickerIndex = index;
    const play = this.top[index % this.top.length];
    this.ticker.textContent = play ? es.ticker(index % this.top.length + 1,
      publicName(play) || es.anonymous(Number(play.id.split('-')[1])), play.score) : '';
  }
  /** @param {CanvasRenderingContext2D} ctx @returns {void} */
  render(ctx) { this.demo.render(ctx); }
  /** @returns {void} */
  onInput() {}
}
