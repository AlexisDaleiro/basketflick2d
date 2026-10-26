import * as C from '../config/constants.js';
import { es } from '../i18n/es.js';
import { ResultSession } from '../game/ResultSession.js';
import { Particles } from '../render/Particles.js';
import { h, show } from './dom.js';
import { brandBar } from './brandButton.js';

export class GameOverScreen {
  /** @param {{root:HTMLElement,storage:import('../storage/Storage.js').Storage,navigate:(state:string)=>void}} options */
  constructor({ root, storage, navigate }) {
    this.storage = storage; this.navigate = navigate; this.session = new ResultSession(storage); this.particles = new Particles();
    this.panel = h('section', 'result-screen'); this.panel.dataset.state = C.STATES.GAME_OVER;
    this.panel.setAttribute('aria-label', es.overTitle); this.panel.dataset.nativeScroll = '';
    const { bar, admin } = brandBar(); this.admin = admin;
    this.content = h('div', 'result-content');
    const title = h('h1', '', es.overTitle);
    this.score = h('strong', 'final-score', '0');
    this.stats = h('p', 'description'); this.rank = h('p', 'result-rank');
    this.prize = h('div', 'prize-card'); this.code = h('strong', 'prize-code');
    this.prize.append(h('h2', '', es.prizeWon), this.code, h('p', '', es.prizeInstruction));
    this.form = h('form', 'lead-form'); this.form.noValidate = true;
    const formTitle = h('h2', '', es.leadTitle);
    this.name = h('input'); this.name.id = 'lead-name'; this.name.name = 'name'; this.name.maxLength = C.LEAD_NAME_MAX;
    this.name.autocomplete = 'off'; this.name.setAttribute('autocapitalize', 'words'); this.name.setAttribute('enterkeyhint', 'next');
    this.phone = h('input'); this.phone.id = 'lead-phone'; this.phone.name = 'phone'; this.phone.type = 'tel';
    this.phone.inputMode = 'tel'; this.phone.autocomplete = 'off'; this.phone.setAttribute('enterkeyhint', 'next');
    this.email = h('input'); this.email.id = 'lead-email'; this.email.name = 'email'; this.email.type = 'email'; this.email.maxLength = C.LEAD_EMAIL_MAX;
    this.email.inputMode = 'email'; this.email.autocomplete = 'off'; this.email.setAttribute('autocapitalize', 'none'); this.email.spellcheck = false; this.email.setAttribute('enterkeyhint', 'done');
    const nameLabel = h('label', '', es.name); nameLabel.htmlFor = this.name.id;
    const phoneLabel = h('label', '', es.phone); phoneLabel.htmlFor = this.phone.id;
    const emailLabel = h('label', '', es.email); emailLabel.htmlFor = this.email.id;
    this.consent = h('input'); this.consent.id = 'lead-consent'; this.consent.type = 'checkbox'; this.consent.name = 'consent';
    const consentLabel = h('label', 'consent-label'); consentLabel.append(this.consent, h('span', '', es.consent));
    this.error = h('p', 'form-error'); this.error.id = 'lead-error'; this.error.setAttribute('role', 'alert');
    for (const input of [this.phone, this.email, this.consent]) input.setAttribute('aria-describedby', this.error.id);
    this.saveReplay = h('button', 'primary save-replay', es.saveReplay); this.saveReplay.type = 'submit';
    this.save = h('button', 'secondary', es.save); this.save.type = 'submit';
    this.skip = h('button', 'secondary', es.skip); this.skip.type = 'button';
    const actions = h('div', 'lead-actions'); actions.append(this.saveReplay, this.save, this.skip);
    this.form.append(formTitle, nameLabel, this.name, phoneLabel, this.phone, emailLabel, this.email, consentLabel, this.error, actions);
    this.notice = h('p', 'storage-notice'); this.notice.setAttribute('role', 'status');
    this.thanks = h('h2', 'thanks'); this.thanks.setAttribute('role', 'status');
    this.content.append(bar, title, this.score, h('span', 'hud-label', es.points), this.stats, this.rank, this.prize, this.notice, this.form, this.thanks);
    this.panel.append(this.content); show(this.panel, false); root.append(this.panel);
    this.resize = this.resize.bind(this);
  }
  /** Keep the form inside the visual viewport when the virtual keyboard opens. @returns {void} */
  resize() {
    const viewport = window.visualViewport;
    this.panel.style.height = `${viewport?.height || window.innerHeight}px`;
    this.panel.style.top = `${viewport?.offsetTop || 0}px`;
    const hiddenHeight = Math.max(0, window.innerHeight - (viewport?.height || window.innerHeight) - (viewport?.offsetTop || 0));
    this.panel.classList.toggle('keyboard-open', hiddenHeight > C.KEYBOARD_HEIGHT_DELTA);
    this.panel.style.setProperty('--keyboard-bottom', `${hiddenHeight}px`);
    if (this.form.contains(document.activeElement)) document.activeElement.scrollIntoView?.({ block: 'nearest' });
  }
  /** @param {any} result @returns {void} */
  enter(result) {
    this.session.enter(result); this.form.reset(); this.error.textContent = ''; this.panel.scrollTop = 0;
    this.phone.setAttribute('aria-invalid', 'false'); this.email.setAttribute('aria-invalid', 'false');
    this.controller = new AbortController(); const signal = this.controller.signal;
    this.form.addEventListener('submit', event => { event.preventDefault(); this.submit(event.submitter !== this.save); }, { signal });
    const contact = () => { this.consent.required = Boolean(this.phone.value.trim() || this.email.value.trim()); };
    this.phone.addEventListener('input', contact, { signal }); this.email.addEventListener('input', contact, { signal });
    this.skip.addEventListener('click', () => this.navigate(C.STATES.ATTRACT_MODE), { signal });
    window.addEventListener('resize', this.resize, { signal });
    window.visualViewport?.addEventListener('resize', this.resize, { signal });
    window.visualViewport?.addEventListener('scroll', this.resize, { signal });
    const entry = this.session.entry; const play = entry?.play;
    this.stats.textContent = play ? es.stats(play) : es.saveFailed;
    this.rank.textContent = entry ? entry.newRecord ? es.newRecord : es.rank(entry.position) : '';
    this.code.textContent = play?.prizeCode || ''; show(this.prize, Boolean(play?.prizeWon));
    show(this.form, Boolean(play)); show(this.thanks, false); this.consent.required = false;
    this.notice.textContent = this.storage.warning ? es[this.storage.warning] : '';
    this.particles.clear();
    if (entry?.newRecord || play?.prizeWon) this.particles.burst(C.RESULT_CONFETTI_X, C.RESULT_CONFETTI_Y, 'paw');
    if (play?.prizeWon) this.particles.burst(C.RESULT_CONFETTI_X, C.RESULT_CONFETTI_Y, 'bone');
    show(this.panel, true); this.resize();
  }
  /** @param {boolean} replay @returns {void} */
  submit(replay) {
    const result = this.session.save({ name: this.name.value, phone: this.phone.value, email: this.email.value, consent: this.consent.checked }, replay);
    this.error.textContent = result.ok ? '' : es[result.error];
    this.phone.setAttribute('aria-invalid', String(result.error === 'phoneInvalid'));
    this.email.setAttribute('aria-invalid', String(result.error === 'emailInvalid'));
    if (!result.ok) { (result.error === 'consentRequired' ? this.consent : result.error === 'emailInvalid' ? this.email : this.phone).focus(); return; }
    document.activeElement?.blur?.(); show(this.form, false); show(this.thanks, true);
    this.thanks.textContent = es.thanks(result.play.name);
    this.notice.textContent = this.storage.warning ? es[this.storage.warning] : '';
    this.resize(); this.thanks.scrollIntoView({ block: 'nearest' });
  }
  /** @returns {void} */
  exit() { this.controller?.abort(); this.session.exit(); this.form.reset(); this.particles.clear(); show(this.panel, false); }
  /** @param {number} dt s. @returns {void} */
  update(dt) {
    this.session.update(dt); this.particles.update(dt);
    const score = String(this.session.displayedScore()); if (this.score.textContent !== score) this.score.textContent = score;
    if (this.session.done) this.navigate(this.session.replay ? C.STATES.PLAYING : C.STATES.ATTRACT_MODE);
  }
  /** @param {CanvasRenderingContext2D} ctx @returns {void} */
  render(ctx) { this.particles.render(ctx); }
  /** @returns {void} */
  onInput() {}
}
