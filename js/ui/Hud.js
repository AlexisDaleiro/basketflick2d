import * as C from '../config/constants.js';
import { es } from '../i18n/es.js';
import { h, show } from './dom.js';
import { brandBar } from './brandButton.js';

const PAW_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" aria-hidden="true"><g fill="currentColor"><ellipse cx="20" cy="27" rx="11" ry="8"/><ellipse cx="6" cy="16" rx="5" ry="6"/><ellipse cx="15" cy="8" rx="5" ry="6"/><ellipse cx="26" cy="8" rx="5" ry="6"/><ellipse cx="35" cy="17" rx="5" ry="6"/></g></svg>';
const HAND_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 180" aria-hidden="true"><path d="M42 155 18 115Q13 101 26 100L42 114V35Q42 20 54 23Q60 25 60 36V88Q66 76 76 88Q88 79 94 94Q110 92 108 111L101 151Z" fill="white" stroke="#000000" stroke-width="6"/><path d="M60 10V0M48 12 40 4M72 12 80 4" stroke="#F3C879" stroke-width="5"/></svg>';

/** DOM HUD is laid over the same logical world rectangle as Canvas. */
export class Hud {
  /** @param {HTMLElement} panel */
  constructor(panel) {
    this.root = h('div', 'hud');
    const points = h('div', 'hud-points');
    this.score = h('strong', '', '0'); this.score.id = 'score';
    points.append(h('span', 'hud-label', es.points), this.score);
    const clock = h('div', 'hud-clock');
    this.clock = h('strong', '', String(C.ROUND_DURATION_SEC)); this.clock.id = 'timer';
    clock.append(h('span', 'hud-label', es.time), this.clock);
    const { bar, admin } = brandBar(); this.admin = admin;
    this.meter = h('div', 'streak-meter');
    this.paws = [];
    for (let i = 0; i < C.FIRE_STREAK; i++) {
      const paw = h('span', 'streak-paw');
      paw.append(new DOMParser().parseFromString(PAW_SVG, 'image/svg+xml').documentElement);
      this.paws.push(paw); this.meter.append(paw);
    }
    this.streakLabel = h('span', 'streak-label', es.streak);
    this.meter.append(this.streakLabel);
    this.root.append(bar, points, clock, this.meter);
    this.countdown = h('div', 'round-countdown'); this.countdown.setAttribute('aria-live', 'assertive');
    this.countdown.id = 'round-countdown';
    this.feedback = h('p', 'round-feedback'); this.feedback.setAttribute('aria-live', 'polite');
    this.floating = h('span', 'score-float');
    this.hint = h('div', 'flick-hint');
    this.hint.append(new DOMParser().parseFromString(HAND_SVG, 'image/svg+xml').documentElement);
    this.hint.append(h('span', '', es.flickHint));
    panel.append(this.root, this.countdown, this.feedback, this.floating, this.hint);
    this.feedbackUntil = 0; this.floatUntil = 0; this.shownScore = -1; this.shownSeconds = -1;
    this.shownStreak = -1; this.shownCountdown = ''; this.wasFire = false;
    this.hintX = null;
    this.practice = h('p', 'practice-banner', es.practiceMode); panel.append(this.practice); show(this.practice, false);
  }

  /** @returns {void} */
  reset() {
    this.feedbackUntil = 0; this.floatUntil = 0;
    this.shownScore = -1; this.shownSeconds = -1; this.shownStreak = -1; this.shownCountdown = '';
    this.wasFire = false; this.meter.classList.remove('extinguishing');
    this.hintX = null;
    show(this.feedback, false); show(this.floating, false); show(this.hint, false);
  }

  /** @param {string} text @param {number} now ms. @returns {void} */
  message(text, now) { this.feedback.textContent = text; this.feedbackUntil = now + C.FEEDBACK_MS; show(this.feedback, true); }

  /** @param {number} points @param {number} now ms. @returns {void} */
  addPoints(points, now) {
    this.floating.textContent = es.addPoints(points);
    this.floatUntil = now + C.FEEDBACK_MS;
    this.floating.classList.remove('float-up'); this.score.classList.remove('score-bump');
    // Restart only on a scoring event, never in the per-frame path.
    void this.floating.offsetWidth;
    this.floating.classList.add('float-up'); this.score.classList.add('score-bump'); show(this.floating, true);
  }

  /** @param {import('../game/Round.js').Round} round @returns {void} */
  update(round) {
    show(this.practice, Boolean(round.practice));
    if (round.score !== this.shownScore) { this.shownScore = round.score; this.score.textContent = String(round.score); }
    if (round.remainingSec !== this.shownSeconds) {
      this.shownSeconds = round.remainingSec; this.clock.textContent = String(round.remainingSec);
      this.clock.classList.toggle('critical', round.remainingSec <= C.CRITICAL_TIME_SEC);
    }
    if (round.streak !== this.shownStreak) {
      this.shownStreak = round.streak;
      for (let i = 0; i < this.paws.length; i++) this.paws[i].classList.toggle('lit', i < round.streak);
      const fire = round.streak >= C.FIRE_STREAK;
      this.meter.classList.toggle('on-fire', fire);
      this.meter.classList.toggle('extinguishing', this.wasFire && !fire);
      this.wasFire = fire; this.streakLabel.textContent = fire ? es.fireStreak : es.streak;
    }
    const label = round.phase === 'countdown' ? es.countdown[round.countdownIndex]
      : round.phase === 'buzzer' ? es.buzzer : '';
    if (label !== this.shownCountdown) {
      this.shownCountdown = label; this.countdown.textContent = label;
      this.countdown.classList.remove('count-in'); void this.countdown.offsetWidth;
      this.countdown.classList.add('count-in'); show(this.countdown, Boolean(label));
      this.countdown.classList.toggle('buzzer', round.phase === 'buzzer');
    }
    show(this.feedback, round.world.timeMs < this.feedbackUntil);
    show(this.floating, round.world.timeMs < this.floatUntil);
    const hint = round.phase === 'live' && round.shots === 0
      && round.liveTicks * C.FIXED_DT * C.MS_PER_SECOND >= C.FIRST_HINT_MS;
    show(this.hint, hint);
    if (hint && round.readyBall && round.readyBall.position.x !== this.hintX) {
      this.hintX = round.readyBall.position.x;
      this.hint.style.left = `${this.hintX / C.WORLD_WIDTH * 100}%`;
    }
  }
}
