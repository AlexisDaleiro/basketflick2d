import * as C from '../config/constants.js';
import { es } from '../i18n/es.js';
import { Particles } from '../render/Particles.js';
import { drawBall, drawBallIndicator, drawBallShadow } from '../render/draw/ball.js';
import { drawBoard, drawNet, drawRim } from '../render/draw/hoop.js';
import { Hud } from './Hud.js';
import { h, show } from './dom.js';
import { projectPoint } from '../render/projection.js';
import { Vec2 } from '../physics/Vec2.js';
import { ballLayer } from '../render/visibility.js';
import { theme } from '../config/theme.js';

export class PlayingScreen {
  /** @param {{root:HTMLElement,round:import('../game/Round.js').Round,bus:import('../core/EventBus.js').EventBus,sfx:import('../audio/Sfx.js').Sfx,storage?:import('../storage/Storage.js').Storage,navigate:(name:string,payload?:any)=>void}} options */
  constructor({ root, round, bus, sfx, navigate, storage }) {
    this.storage = storage;
    this.round = round; this.bus = bus; this.sfx = sfx; this.navigate = navigate;
    this.panel = h('section', 'playing-screen'); this.panel.dataset.state = C.STATES.PLAYING;
    this.panel.setAttribute('aria-label', es.playingTitle);
    this.hud = new Hud(this.panel); this.particles = new Particles();
    this.effectOrigin = new Vec2();
    this.renderOrder = round.world.balls.slice();
    this.boardImpact = new Vec2(); this.rimImpact = new Vec2();
    this.boardImpactAt = -Infinity; this.rimImpactAt = -Infinity;
    this.netStretch = 0; this.netVelocity = 0; this.trailElapsed = 0; this.misses = 0;
    this.controller = null; this.unsubscribe = null;
    this.handleEvent = this.handleEvent.bind(this);
    show(this.panel, false); root.append(this.panel);
  }

  /** @param {any} payload @returns {void} */
  enter(payload) {
    this.controller = new AbortController();
    this.unsubscribe = this.bus.on('round:event', this.handleEvent);
    this.netStretch = 0; this.netVelocity = 0; this.trailElapsed = 0; this.misses = 0;
    this.particles.clear(); this.hud.reset();
    this.round.reset({ ...(this.storage?.settings || {}), practice: Boolean(payload?.practice) });
    this.sfx.setEnabled(this.round.settings.soundEnabled);
    this.hud.update(this.round); show(this.panel, true);
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
      this.boardImpactAt = -Infinity; this.rimImpactAt = -Infinity;
    } else if (event.type === 'basket') {
      const hoop = this.round.world.hoop;
      projectPoint(hoop.centerX, hoop.gateBY, hoop.depth, this.effectOrigin);
      this.particles.burst(this.effectOrigin.x, this.effectOrigin.y);
      this.netVelocity += C.NET_IMPULSE;
      this.hud.addPoints(event.value, now);
      this.hud.message(event.ball.swish ? es.swish : es.basket, now);
      this.sfx.play('swish');
      try { navigator.vibrate?.(C.BASKET_VIBRATION_MS); } catch { /* Optional capability. */ }
    } else if (event.type === 'miss') {
      this.misses++;
      if (this.misses % C.MISS_FEEDBACK_INTERVAL === 0) this.hud.message(es.miss, now);
    } else if (event.type === 'rejected') this.hud.message(es.rejectedFlick, now);
    else if (event.type === 'sfx:board' || event.type === 'sfx:rim') {
      const contact = this.round.world.contact; const ball = event.ball;
      const point = event.type === 'sfx:board' ? this.boardImpact : this.rimImpact;
      projectPoint(ball.position.x - contact.nx * ball.radius, ball.position.y - contact.ny * ball.radius,
        ball.depth - contact.nz * ball.radius, point);
      if (event.type === 'sfx:board') this.boardImpactAt = now;
      else this.rimImpactAt = now;
    }
  }

  /** @param {number} dt s. @returns {void} */
  update(dt) {
    this.round.step();
    if (this.round.phase === 'complete') {
      if (this.round.practice) this.navigate(C.STATES.ADMIN_PANEL, { returnFromPractice: true });
      else this.navigate(C.STATES.GAME_OVER, this.round.result);
      return;
    }
    this.netVelocity += (-C.NET_SPRING * this.netStretch - C.NET_DAMPING * this.netVelocity) * dt;
    this.netStretch += this.netVelocity * dt;
    this.particles.update(dt);
    this.trailElapsed += dt * C.MS_PER_SECOND;
    if (this.trailElapsed >= C.TRAIL_INTERVAL_MS) {
      this.trailElapsed = 0;
      if (this.round.streak >= C.FIRE_STREAK) {
        for (const ball of this.round.world.balls) if (ball.state === 'flying') {
          projectPoint(ball.position.x, ball.position.y, ball.depth, this.effectOrigin);
          this.particles.emit(this.effectOrigin.x, this.effectOrigin.y, 'flame');
        }
      }
    }
  }

  /** Correct layer order: board, rear rim, balls, net, front rim, particles, HUD. @param {CanvasRenderingContext2D} ctx @returns {void} */
  render(ctx) {
    const world = this.round.world;
    // Six preallocated references, insertion-sorted far to near without a new array.
    for (let i = 1; i < this.renderOrder.length; i++) {
      const ball = this.renderOrder[i]; let j = i - 1;
      while (j >= 0 && this.renderOrder[j].depth < ball.depth) { this.renderOrder[j + 1] = this.renderOrder[j]; j--; }
      this.renderOrder[j + 1] = ball;
    }
    for (const ball of this.renderOrder) drawBallShadow(ctx, ball);
    for (const ball of this.renderOrder) if (ballLayer(ball, world.hoop) === 'behind-board') drawBall(ctx, ball, world.timeMs);
    drawBoard(ctx, world.hoop); drawRim(ctx, world.hoop, false);
    this.drawImpact(ctx, this.boardImpact, this.boardImpactAt, C.BOARD_IMPACT_MS);
    for (const ball of this.renderOrder) if (ballLayer(ball, world.hoop) === 'inside-hoop') drawBall(ctx, ball, world.timeMs);
    drawNet(ctx, world.hoop, this.netStretch); drawRim(ctx, world.hoop, true);
    // Balls between the camera and the hoop occlude the net, rather than crossing behind it.
    for (const ball of this.renderOrder) if (ballLayer(ball, world.hoop) === 'foreground') drawBall(ctx, ball, world.timeMs);
    this.drawImpact(ctx, this.rimImpact, this.rimImpactAt, C.RIM_IMPACT_MS);
    this.particles.render(ctx);
    for (const ball of world.balls) drawBallIndicator(ctx, ball);
    this.hud.update(this.round);
  }

  /** @param {CanvasRenderingContext2D} ctx @param {{x:number,y:number}} point @param {number} at ms. @param {number} duration ms. @returns {void} */
  drawImpact(ctx, point, at, duration) {
    const progress = (this.round.world.timeMs - at) / duration;
    if (progress < 0 || progress >= 1) return;
    ctx.save(); ctx.globalAlpha = 1 - progress; ctx.strokeStyle = theme.teal; ctx.lineWidth = C.IMPACT_LINE_WIDTH;
    ctx.beginPath(); ctx.arc(point.x, point.y, C.IMPACT_RING_RADIUS * (0.5 + progress), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  /** @param {{type:string,x:number,y:number,t:number}} event @returns {void} */
  onInput(event) { this.round.onInput(event); }
}
