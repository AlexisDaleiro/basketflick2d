import * as C from '../config/constants.js';
import { es } from '../i18n/es.js';
import { h, show } from './dom.js';
import { PinPad } from './PinPad.js';
import { CsvExport } from './CsvExport.js';
import { SystemStatus } from './SystemStatus.js';
import { brandButton } from './brandButton.js';
import { dayKey, publicName } from '../storage/ranking.js';
import { localDateTime, localPhone } from '../storage/csv.js';

/** Staff screens may be watched by players: keep two letters and the domain. @param {string|null} email @returns {string} */
const maskEmail = email => email ? `${email.slice(0, 2)}***${email.slice(email.indexOf('@'))}` : '';

/** Authenticated staff panel. Only the PIN subphase exists until verification succeeds. */
export class AdminPanel {
  /** @param {{root:HTMLElement,storage:import('../storage/Storage.js').Storage,guard:import('../game/PinGuard.js').PinGuard,debug?:boolean,navigate:(state:string,payload?:any)=>void}} options */
  constructor({ root, storage, guard, debug = false, navigate }) {
    this.storage = storage; this.guard = guard; this.debug = debug; this.navigate = navigate; this.keepSession = false;
    this.panel = h('section', 'admin-screen'); this.panel.dataset.state = C.STATES.ADMIN_PANEL; this.panel.dataset.nativeScroll = '';
    this.panel.setAttribute('aria-label', es.adminTitle); this.logo = brandButton(); this.content = h('div', 'admin-content');
    this.content.append(h('h1', '', es.adminTitle)); this.notice = h('p', 'storage-notice'); this.defaultWarning = h('p', 'storage-notice', es.defaultPinWarning);
    this.toast = h('p', 'admin-toast'); this.toast.setAttribute('role', 'status');
    this.content.append(this.notice, this.defaultWarning, this.toast);
    this.fields = new Map(); this.segmentButtons = [];
    const settings = this.section(es.roundSettings); const durations = h('div', 'duration-options');
    durations.setAttribute('role', 'group'); durations.setAttribute('aria-label', es.duration);
    for (const value of C.ROUND_DURATIONS) { const button = h('button', 'secondary', es.seconds(value)); button.type = 'button'; this.segmentButtons.push({ button, value }); durations.append(button); }
    settings.append(durations);
    this.slider(settings, 'prizeThreshold', es.prizeThresholdLabel, 4, 80, 1);
    this.winners = h('p', 'description'); settings.append(this.winners);
    this.slider(settings, 'sensitivity', es.sensitivityLabel, 0.5, 1.8, 0.05);
    this.slider(settings, 'aimAssist', es.aimAssistLabel, 0, 40, 1);
    this.field(settings, 'movingHoop', es.movingHoopLabel, 'checkbox'); this.field(settings, 'soundEnabled', es.soundLabel, 'checkbox');
    this.field(settings, 'maxPrizesPerDay', es.maxPrizesLabel, 'number');
    this.field(settings, 'eventName', es.eventLabel, 'text'); this.field(settings, 'deviceLabel', es.tabletLabel, 'text');
    this.practiceButton = this.button(settings, es.practice); this.pinButton = this.button(settings, es.changePin);
    const leads = this.section(es.leaderboard);
    this.today = h('p', 'description'); this.historic = h('p', 'description'); leads.append(this.today, this.historic);
    const tableWrap = h('div', 'admin-table-wrap'); tableWrap.dataset.nativeScroll = '';
    this.table = h('table'); this.table.setAttribute('aria-label', es.leaderboard); tableWrap.append(this.table); leads.append(tableWrap);
    this.exportToday = this.button(leads, es.csvToday); this.exportAll = this.button(leads, es.csvAll);
    this.resetButton = this.button(leads, es.resetRanking); this.resetDialog = h('div', 'admin-confirm');
    this.confirmReset = this.button(this.resetDialog, es.confirmReset); this.cancelReset = this.button(this.resetDialog, es.cancel);
    this.resetDialog.prepend(h('p', '', es.resetQuestion)); leads.append(this.resetDialog); show(this.resetDialog, false);
    const danger = this.section(es.danger); this.deleteButton = this.button(danger, es.deleteAll);
    this.deleteDialog = h('div', 'admin-confirm'); this.deleteDialog.append(h('p', '', es.deleteQuestion));
    this.deleteExport = this.button(this.deleteDialog, es.csvAll);
    this.deleteInput = h('input'); this.deleteInput.id = 'delete-confirm'; this.deleteInput.autocomplete = 'off';
    const deleteLabel = h('label', '', es.deleteLabel); deleteLabel.htmlFor = this.deleteInput.id;
    this.deleteDialog.append(deleteLabel, this.deleteInput); this.confirmDelete = this.button(this.deleteDialog, es.confirmDelete);
    this.cancelDelete = this.button(this.deleteDialog, es.cancel); danger.append(this.deleteDialog); show(this.deleteDialog, false);
    const system = this.section(es.system); this.system = new SystemStatus(system, storage);
    this.exporter = new CsvExport(this.content, storage); this.exitButton = this.button(this.content, es.exit);
    this.pinPad = new PinPad(this.panel); this.panel.append(this.logo, this.content); root.append(this.panel); show(this.panel, false);
  }
  /** @param {string} title @returns {HTMLElement} */
  section(title) { const section = h('section', 'admin-section'); section.append(h('h2', '', title)); this.content.append(section); return section; }
  /** @param {HTMLElement} parent @param {string} text @returns {HTMLButtonElement} */
  button(parent, text) { const button = h('button', 'secondary', text); button.type = 'button'; parent.append(button); return button; }
  /** @param {HTMLElement} parent @param {string} key @param {string} text @param {string} type @returns {HTMLInputElement} */
  field(parent, key, text, type) {
    const label = h('label', 'admin-field', text); const input = h('input'); input.type = type; input.id = `admin-${key}`; label.htmlFor = input.id;
    if (type === 'number') { input.min = '0'; input.step = '1'; }
    if (type === 'text') input.maxLength = 100;
    label.append(input); parent.append(label); this.fields.set(key, input); return input;
  }
  /** @param {HTMLElement} parent @param {string} key @param {string} text @param {number} min @param {number} max @param {number} step @returns {void} */
  slider(parent, key, text, min, max, step) {
    const input = this.field(parent, key, text, 'range'); input.min = String(min); input.max = String(max); input.step = String(step);
    const output = h('output'); output.htmlFor = input.id; input.after(output); input._output = output;
  }
  /** @param {any} payload @returns {void} */
  enter(payload) {
    this.controller = new AbortController(); this.authController = null; this.panel.scrollTop = 0;
    show(this.panel, true); show(this.content, false); this.authenticated = false;
    if ((payload?.returnFromPractice && this.keepSession) || (this.debug && payload?.debugBypass)) this.unlock();
    else this.openPin();
    this.keepSession = false;
  }
  /** @returns {void} */
  openPin() {
    const signal = this.controller.signal;
    this.pinPad.open(es.pinTitle, async pin => {
      const result = await this.guard.verify(pin); if (signal.aborted) return;
      if (result.ok) this.unlock(); else this.pinPad.message.textContent = es[result.error];
    }, () => this.navigate(C.STATES.ATTRACT_MODE));
    this.lastLockSeconds = -1;
  }
  /** @returns {void} */
  unlock() {
    this.pinPad.close(); this.authenticated = true; show(this.content, true);
    this.authController?.abort(); this.authController = new AbortController(); const signal = this.authController.signal;
    this.controller.signal.addEventListener('abort', () => this.authController.abort(), { once: true });
    this.refresh();
    for (const { button, value } of this.segmentButtons) button.addEventListener('click', () => { this.storage.settings.roundDurationSec = value; this.persistSettings(); this.refreshDuration(); }, { signal });
    for (const [key, input] of this.fields) {
      if (input.type === 'range') input.addEventListener('input', () => { input._output.value = input.value; }, { signal });
      input.addEventListener('change', () => {
        let value = input.type === 'checkbox' ? input.checked : ['range', 'number'].includes(input.type) ? Number(input.value) : input.value;
        if (key === 'aimAssist') value /= 100;
        if (key === 'deviceLabel') this.storage.meta.deviceLabel = value; else this.storage.settings[key] = value;
        this.persistSettings();
      }, { signal });
    }
    this.practiceButton.addEventListener('click', () => { this.keepSession = true; this.navigate(C.STATES.PLAYING, { practice: true }); }, { signal });
    this.pinButton.addEventListener('click', () => this.changePin(), { signal });
    this.exportToday.addEventListener('click', () => this.exporter.open(true), { signal });
    for (const button of [this.exportAll, this.deleteExport]) button.addEventListener('click', () => this.exporter.open(false), { signal });
    this.resetButton.addEventListener('click', () => show(this.resetDialog, true), { signal });
    this.cancelReset.addEventListener('click', () => show(this.resetDialog, false), { signal });
    this.confirmReset.addEventListener('click', () => { const saved = this.storage.resetRanking(); show(this.resetDialog, false); this.refresh(); this.notify(saved ? es.saved : es.storageUnavailable); }, { signal });
    this.deleteButton.addEventListener('click', () => { this.deleteInput.value = ''; this.confirmDelete.disabled = true; show(this.deleteDialog, true); }, { signal });
    this.deleteInput.addEventListener('input', () => { this.confirmDelete.disabled = this.deleteInput.value !== es.deleteWord; }, { signal });
    this.cancelDelete.addEventListener('click', () => show(this.deleteDialog, false), { signal });
    this.confirmDelete.addEventListener('click', async () => {
      if (this.deleteInput.value !== es.deleteWord) return;
      if (!this.storage.clearAll()) { this.refresh(); this.notify(es.deleteFailed); return; }
      this.guard.failures = 0; this.guard.blockedUntil = 0; await this.guard.initialize();
      if (!signal.aborted) this.navigate(C.STATES.ATTRACT_MODE);
    }, { signal });
    this.exitButton.addEventListener('click', () => this.navigate(C.STATES.ATTRACT_MODE), { signal });
    this.system.start(signal); this.content.querySelector('h1').tabIndex = -1; this.content.querySelector('h1').focus({ preventScroll: true });
  }
  /** @returns {void} */
  refreshDuration() { for (const { button, value } of this.segmentButtons) button.setAttribute('aria-pressed', String(value === this.storage.settings.roundDurationSec)); }
  /** @returns {void} */
  refresh() {
    this.notice.textContent = this.storage.warning ? es[this.storage.warning] : ''; show(this.defaultWarning, this.storage.settings.pinIsDefault);
    this.refreshDuration();
    for (const [key, input] of this.fields) {
      const value = key === 'deviceLabel' ? this.storage.meta.deviceLabel : key === 'aimAssist' ? Math.round(this.storage.settings[key] * 100) : this.storage.settings[key];
      if (input.type === 'checkbox') input.checked = value; else input.value = String(value);
      if (input._output) input._output.value = input.value;
    }
    const today = this.storage.plays.filter(play => play.dayKey === dayKey(this.storage.now()));
    const counters = plays => es.counters(plays.length, plays.filter(play => play.phone || play.email).length, plays.filter(play => play.prizeWon).length, plays.filter(play => play.prizeDelivered).length);
    this.today.textContent = `${es.today}: ${counters(today)}`; this.historic.textContent = `${es.historic}: ${counters(this.storage.plays)}`;
    this.winners.textContent = es.winnerRate(today.filter(play => play.prizeWon).length, today.length);
    this.table.replaceChildren(); const head = h('tr'); for (const text of es.tableHeaders) head.append(h('th', '', text));
    const thead = h('thead'); thead.append(head); const tbody = h('tbody'); this.table.append(thead, tbody);
    this.tableController?.abort(); this.tableController = new AbortController();
    const signal = this.tableController.signal;
    for (const [index, play] of this.storage.ranking().slice(0, C.ADMIN_TOP_LIMIT).entries()) {
      const row = h('tr'); const phone = play.phone ? localPhone(play.phone) : '';
      for (const text of [index + 1, publicName(play) || es.anonymous(Number(play.id.split('-')[1])), phone ? `${phone.slice(0, 3)} *** ${phone.slice(-3)}` : '', maskEmail(play.email), play.score, localDateTime(play.ts).time, play.prizeCode || '']) row.append(h('td', '', String(text)));
      const cell = h('td');
      if (play.prizeWon) {
        const input = h('input'); input.type = 'checkbox'; input.checked = play.prizeDelivered; input.setAttribute('aria-label', `${es.delivered} ${play.prizeCode}`);
        input.addEventListener('change', () => { this.storage.markDelivered(play.id, input.checked); this.refresh(); this.system.refresh(); }, { signal }); cell.append(input);
      }
      row.append(cell); tbody.append(row);
    }
  }
  /** @returns {void} */
  persistSettings() { const saved = this.storage.saveSettings(this.storage.settings); this.refresh(); this.system.refresh(); this.notify(saved ? es.saved : es.storageUnavailable); }
  /** @param {string} message @returns {void} */
  notify(message) { this.toast.textContent = message; this.toastUntil = performance.now() + C.TOAST_MS; }
  /** @returns {void} */
  changePin() {
    show(this.content, false); const signal = this.controller.signal;
    const cancel = () => { this.pinPad.close(); show(this.content, true); };
    this.pinPad.open(es.newPin, async first => {
      if (signal.aborted) return;
      this.pinPad.open(es.confirmPin, async second => {
        if (first !== second) { this.pinPad.message.textContent = es.pinMismatch; return; }
        const saved = await this.guard.setPin(second); if (signal.aborted) return;
        cancel(); this.refresh(); this.notify(saved ? es.pinChanged : es.storageUnavailable);
      }, cancel);
    }, cancel);
  }
  /** @returns {void} */
  exit() {
    this.controller?.abort(); this.authController?.abort(); this.tableController?.abort(); this.pinPad.close(); this.exporter.close(); this.authenticated = false;
    this.system.errors.value = '';
    show(this.panel, false); show(this.resetDialog, false); show(this.deleteDialog, false); this.toast.textContent = '';
  }
  /** @returns {void} */
  update() {
    if (!this.authenticated && this.pinPad.controller && !this.pinPad.controller.signal.aborted) {
      const remaining = this.guard.remaining();
      if (remaining !== this.lastLockSeconds) {
        this.lastLockSeconds = remaining; this.pinPad.locked = remaining > 0; this.pinPad.refresh();
        if (remaining) this.pinPad.message.textContent = es.pinWait(remaining);
        else if (this.pinPad.message.textContent.startsWith(es.pinLocked) || this.wasLocked) this.pinPad.message.textContent = '';
        this.wasLocked = remaining > 0;
      }
    }
    if (this.toast.textContent && performance.now() >= this.toastUntil) this.toast.textContent = '';
  }
  /** @returns {void} */
  render() {}
  /** @returns {void} */
  onInput() {}
}
