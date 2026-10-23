import * as C from '../config/constants.js';
import { es } from '../i18n/es.js';
import { Particles } from '../render/Particles.js';
import { drawBall, drawBallIndicator } from '../render/draw/ball.js';
import { drawBoard, drawNet, drawRim } from '../render/draw/hoop.js';
import { Hud } from './Hud.js';
import { h, show } from './dom.js';

export class PlayingScreen {
  /** @param {{root:HTMLElement,round:import('../game/Round.js').Round,bus:import('../core/EventBus.js').EventBus,sfx:import('../audio/Sfx.js').Sfx,navigate:(name:string,payload?:any)=>void}} options */
  constructor({ root, round, bus, sfx, navigate }) {
    this.round = round; this.bus = bus; this.sfx = sfx; this.navigate = navigate;
    this.panel = h('section', 'playing-screen'); this.panel.dataset.state = C.STATES.PLAYING;
    this.panel.setAttribute('aria-label', es.playingTitle);
    this.hud = new Hud(this.panel); this.particles = new Particles();
    this.netStretch = 0; this.netVelocity = 0; this.trailElapsed = 0; this.misses = 0;
    this.controller = null; this.unsubscribe = null;
    this.handleEvent = this.handleEvent.bind(this);
    show(this.panel, false); root.append(this.panel);
  }

  /** @param {any} payload @returns {void} */
  enter(payload) {
    this.controller = new AbortController();
    this.unsubscribe = this.bus.on('round:event', this.handleEvent);
    this.hud.admin.addEventListener('click', () => this.navigate(C.STATES.ADMIN_PANEL), { signal: this.controller.signal });
    this.netStretch = 0; this.netVelocity = 0; this.trailElapsed = 0; this.misses = 0;
    this.particles.clear(); this.hud.reset(); this.sfx.setEnabled(this.round.settings.soundEnabled);
    this.round.reset(); this.hud.update(this.round); show(this.panel, true);
  }

  /** @returns {void} */
  exit() {
    this.controller?.abort(); this.controller = null; this.unsubscribe?.(); this.unsubscribe = null;
    this.round.clear(); this.particles.clear(); this.sfx.stop(); show(this.panel, false);
  }

  /** @param {{type:string,value:number,ball:import('../game/Ball.js').Ball|null}} event @returns {void} */
  handleEvent(event) {
    const now = this.round.world.timeMs;
    if (event.type === 'countdown' && event.value === 0) {
      this.sfx.stop(); this.sfx.setEnabled(this.round.settings.soundEnabled);
    }
    this.sfx.play(event.type, event.value);
    if (event.type === 'countdown' && event.value === 0) {
      this.hud.reset(); this.particles.clear(); this.netStretch = 0; this.netVelocity = 0; this.misses = 0;
    } else if (event.type === 'basket') {
      const hoop = this.round.world.hoop;
      this.particles.burst((hoop.front.x + hoop.back.x) / 2, hoop.gateBY);
      this.netVelocity += C.NET_IMPULSE;
      this.hud.addPoints(event.value, now);
      this.hud.message(event.ball.swish ? es.swish : es.basket, now);
      this.sfx.play('swish');
      try { navigator.vibrate?.(C.BASKET_VIBRATION_MS); } catch { /* Optional capability. */ }
    } else if (event.type === 'miss') {
      this.misses++;
      if (this.misses % C.MISS_FEEDBACK_INTERVAL === 0) this.hud.message(es.miss, now);
    } else if (event.type === 'rejected') this.hud.message(es.rejectedFlick, now);
  }

  /** @param {number} dt s. @returns {void} */
  update(dt) {
    this.round.step();
    if (this.round.phase === 'complete') { this.navigate(C.STATES.GAME_OVER, this.round.result); return; }
    this.netVelocity += (-C.NET_SPRING * this.netStretch - C.NET_DAMPING * this.netVelocity) * dt;
    this.netStretch += this.netVelocity * dt;
    this.particles.update(dt);
    this.trailElapsed += dt * C.MS_PER_SECOND;
    if (this.trailElapsed >= C.TRAIL_INTERVAL_MS) {
      this.trailElapsed = 0;
      if (this.round.streak >= C.FIRE_STREAK) {
        for (const ball of this.round.world.balls) if (ball.state === 'flying') this.particles.emit(ball.position.x, ball.position.y, 'flame');
      }
    }
  }

  /** Correct layer order: board, rear rim, balls, net, front rim, particles, HUD. @param {CanvasRenderingContext2D} ctx @returns {void} */
  render(ctx) {
    const world = this.round.world;
    drawBoard(ctx, world.hoop); drawRim(ctx, world.hoop, false);
    for (const ball of world.balls) drawBall(ctx, ball, world.timeMs);
    drawNet(ctx, world.hoop, this.netStretch); drawRim(ctx, world.hoop, true);
    this.particles.render(ctx);
    for (const ball of world.balls) drawBallIndicator(ctx, ball);
    this.hud.update(this.round);
  }

  /** @param {{type:string,x:number,y:number,t:number}} event @returns {void} */
  onInput(event) { this.round.onInput(event); }
}
