import { DEBUG_FONT_SIZE, DEBUG_LABEL_MARGIN, DEBUG_LINE_WIDTH, DEBUG_POINT_RADIUS, DEBUG_REFRESH_MS, DEG_TO_RAD, FLOOR_Y, MS_PER_SECOND, RIM_TIP_RADIUS, STATES, WORLD_WIDTH } from '../config/constants.js';
import { es } from '../i18n/es.js';
import { theme } from '../config/theme.js';
import { isNativeControl } from '../input/InputManager.js';
import { h } from '../ui/dom.js';
import * as C from '../config/constants.js';
import { projectPoint, depthScale } from '../render/projection.js';

/** Constructed exclusively with ?debug=1. */
export class DebugOverlay {
  /** @param {{root:HTMLElement, round:import('../game/Round.js').Round, machine:import('../core/StateMachine.js').StateMachine, loop:import('../core/GameLoop.js').GameLoop}} options */
  constructor({ root, round, machine, loop }) {
    this.round = round;
    this.machine = machine;
    this.loop = loop;
    this.element = h('pre', 'debug-overlay');
    this.element.setAttribute('aria-label', es.debugTitle);
    root.append(this.element);
    this.frames = 0;
    this.elapsed = 0;
    this.previousTime = null;
    this.font = `900 ${DEBUG_FONT_SIZE}px system-ui`;
    this.point = { x: 0, y: 0 };
    this.controller = new AbortController();
    document.addEventListener('keydown', event => {
      if (isNativeControl(event.target) || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === 'r' && machine.current === STATES.PLAYING) round.reset({ practice: round.practice });
      if (event.key.toLowerCase() === 'a') machine.transition(STATES.ADMIN_PANEL, { debugBypass: true });
    }, { signal: this.controller.signal });
  }

  /** @param {number} now ms. @returns {void} */
  frame(now) {
    if (this.previousTime !== null) this.elapsed += now - this.previousTime;
    this.previousTime = now;
    this.frames++;
    if (this.elapsed < DEBUG_REFRESH_MS) return;
    const result = this.round.tracker.result;
    this.element.textContent = es.debugMetrics(
      Math.round(this.frames * MS_PER_SECOND / this.elapsed), this.loop.steps, this.round.world.activeCount,
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
    const hoop = this.round.world.hoop;
    ctx.save();
    ctx.strokeStyle = theme.gold;
    ctx.lineWidth = DEBUG_LINE_WIDTH;
    projectPoint(hoop.board.minX, hoop.board.minY, hoop.board.minZ, this.point);
    const scale = depthScale(hoop.board.minZ);
    ctx.strokeRect(this.point.x, this.point.y, (hoop.board.maxX - hoop.board.minX) * scale, (hoop.board.maxY - hoop.board.minY) * scale);
    ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(WORLD_WIDTH, FLOOR_Y); ctx.stroke();
    ctx.font = this.font;
    this.drawGate(ctx, hoop.rimY, hoop.radius - C.FRONTAL_RIM_TUBE_RADIUS, theme.lilac, es.gateA);
    this.drawGate(ctx, hoop.gateBY, hoop.radius, theme.red, es.gateB);
    ctx.fillStyle = theme.gold;
    ctx.beginPath();
    for (let point = 0; point < this.round.predictionCount; point++) {
      const x = this.round.prediction[point * 2];
      const y = this.round.prediction[point * 2 + 1];
      ctx.moveTo(x + DEBUG_POINT_RADIUS, y); ctx.arc(x, y, DEBUG_POINT_RADIUS, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }

  /** @param {CanvasRenderingContext2D} ctx @param {number} y u. @param {number} radius u. @param {string} color @param {string} label @returns {void} */
  drawGate(ctx, y, radius, color, label) {
    const hoop = this.round.world.hoop;
    ctx.strokeStyle = color; ctx.beginPath();
    for (let segment = 0; segment <= C.FRONTAL_RING_SEGMENTS; segment++) {
      const angle = segment / C.FRONTAL_RING_SEGMENTS * Math.PI * 2;
      projectPoint(hoop.centerX + Math.cos(angle) * radius, y, hoop.depth + Math.sin(angle) * radius, this.point);
      if (segment === 0) ctx.moveTo(this.point.x, this.point.y); else ctx.lineTo(this.point.x, this.point.y);
    }
    ctx.stroke();
    projectPoint(hoop.centerX - radius, y, hoop.depth, this.point);
    ctx.fillStyle = color; ctx.fillText(label, this.point.x, this.point.y - DEBUG_LABEL_MARGIN);
  }

  /** @returns {void} */
  destroy() { this.controller.abort(); this.element.remove(); }
}
