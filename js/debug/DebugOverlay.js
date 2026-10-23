import { DEBUG_FONT_SIZE, DEBUG_LABEL_MARGIN, DEBUG_LINE_WIDTH, DEBUG_POINT_RADIUS, DEBUG_REFRESH_MS, DEG_TO_RAD, FLOOR_Y, MS_PER_SECOND, RIM_TIP_RADIUS, STATES, WORLD_WIDTH } from '../config/constants.js';
import { es } from '../i18n/es.js';
import { theme } from '../config/theme.js';
import { isNativeControl } from '../input/InputManager.js';
import { h } from '../ui/dom.js';

/** Constructed exclusively with ?debug=1. */
export class DebugOverlay {
  /** @param {{root:HTMLElement, lab:import('../game/PhysicsLab.js').PhysicsLab, machine:import('../core/StateMachine.js').StateMachine, loop:import('../core/GameLoop.js').GameLoop}} options */
  constructor({ root, lab, machine, loop }) {
    this.lab = lab;
    this.machine = machine;
    this.loop = loop;
    this.element = h('pre', 'debug-overlay');
    this.element.setAttribute('aria-label', es.debugTitle);
    root.append(this.element);
    this.frames = 0;
    this.elapsed = 0;
    this.previousTime = null;
    this.font = `900 ${DEBUG_FONT_SIZE}px system-ui`;
    this.controller = new AbortController();
    document.addEventListener('keydown', event => {
      if (isNativeControl(event.target) || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === 'r' && machine.current === STATES.PLAYING) lab.reset();
      if (event.key.toLowerCase() === 'a') machine.transition(STATES.ADMIN_PANEL);
    }, { signal: this.controller.signal });
  }

  /** @param {number} now ms. @returns {void} */
  frame(now) {
    if (this.previousTime !== null) this.elapsed += now - this.previousTime;
    this.previousTime = now;
    this.frames++;
    if (this.elapsed < DEBUG_REFRESH_MS) return;
    const result = this.lab.tracker.result;
    this.element.textContent = es.debugMetrics(
      Math.round(this.frames * MS_PER_SECOND / this.elapsed), this.loop.steps, this.lab.world.activeCount,
      result, Math.round(result.angle / DEG_TO_RAD),
    );
    this.elapsed = 0;
    this.frames = 0;
  }

  /** Reset metrics across a kiosk pause. @returns {void} */
  pause() { this.previousTime = null; this.elapsed = 0; this.frames = 0; }

  /** @param {CanvasRenderingContext2D} ctx @returns {void} */
  render(ctx) {
    if (this.machine.current !== STATES.PLAYING) return;
    const hoop = this.lab.world.hoop;
    ctx.save();
    ctx.strokeStyle = theme.yellow;
    ctx.lineWidth = DEBUG_LINE_WIDTH;
    ctx.strokeRect(hoop.board.minX, hoop.board.minY, hoop.board.maxX - hoop.board.minX, hoop.board.maxY - hoop.board.minY);
    ctx.beginPath();
    ctx.arc(hoop.front.x, hoop.rimY, RIM_TIP_RADIUS, 0, Math.PI * 2);
    ctx.moveTo(hoop.back.x + RIM_TIP_RADIUS, hoop.rimY);
    ctx.arc(hoop.back.x, hoop.rimY, RIM_TIP_RADIUS, 0, Math.PI * 2);
    ctx.moveTo(0, FLOOR_Y); ctx.lineTo(WORLD_WIDTH, FLOOR_Y); ctx.stroke();
    ctx.strokeStyle = theme.teal;
    ctx.beginPath(); ctx.moveTo(hoop.front.x + RIM_TIP_RADIUS, hoop.rimY);
    ctx.lineTo(hoop.back.x - RIM_TIP_RADIUS, hoop.rimY); ctx.stroke();
    ctx.strokeStyle = theme.red;
    ctx.beginPath(); ctx.moveTo(hoop.front.x, hoop.gateBY); ctx.lineTo(hoop.back.x, hoop.gateBY); ctx.stroke();
    ctx.font = this.font;
    ctx.fillStyle = theme.teal; ctx.fillText(es.gateA, hoop.front.x, hoop.rimY - DEBUG_LABEL_MARGIN);
    ctx.fillStyle = theme.red; ctx.fillText(es.gateB, hoop.front.x, hoop.gateBY + DEBUG_LABEL_MARGIN * 2);
    ctx.fillStyle = theme.yellow;
    ctx.beginPath();
    for (let point = 0; point < this.lab.predictionCount; point++) {
      const x = this.lab.prediction[point * 2];
      const y = this.lab.prediction[point * 2 + 1];
      ctx.moveTo(x + DEBUG_POINT_RADIUS, y); ctx.arc(x, y, DEBUG_POINT_RADIUS, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }

  /** @returns {void} */
  destroy() { this.controller.abort(); this.element.remove(); }
}
