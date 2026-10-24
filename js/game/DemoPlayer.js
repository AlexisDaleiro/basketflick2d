import * as C from '../config/constants.js';
import { FrontalWorld } from '../physics/FrontalWorld.js';
import { FlickTracker } from '../input/FlickTracker.js';
import { calculateFrontalLaunch } from '../input/frontalLaunch.js';
import { ballLayer } from '../render/visibility.js';
import { drawBoard, drawNet, drawRim } from '../render/draw/hoop.js';
import { drawBall, drawBallShadow } from '../render/draw/ball.js';

/** Silent attract demo using exactly the playable frontal physics and render primitives. */
export class DemoPlayer {
  /** @param {()=>number} [random] */
  constructor(random = Math.random) {
    this.random = random; this.world = new FrontalWorld(); this.result = new FlickTracker().result;
    this.renderOrder = this.world.balls.slice();
    this.settings = { sensitivity: C.DEFAULT_SENSITIVITY, aimAssist: C.DEFAULT_AIM_ASSIST };
    this.swipe = { x: 0, y: 0 }; this.nextShotAt = 0;
  }
  /** @returns {void} */
  reset() { this.world.reset(); this.nextShotAt = 0; }
  /** @returns {void} */
  step() {
    if (this.world.timeMs >= this.nextShotAt) {
      const ball = this.world.spawn(C.FRONTAL_CENTER_X, C.SPAWN_Y);
      if (ball) {
        const noise = 1 + (this.random() * 2 - 1) * C.DEMO_NOISE;
        this.swipe.y = -C.DEMO_POWER * noise / C.GAIN;
        calculateFrontalLaunch(this.swipe, ball.position, this.settings, this.result);
        ball.depthVelocity = this.result.depthVelocity; ball.launch(this.result.velocity, this.world.timeMs);
      }
      this.nextShotAt = this.world.timeMs + C.DEMO_INTERVAL_MS;
    }
    this.world.step();
  }
  /** @param {CanvasRenderingContext2D} ctx @returns {void} */
  render(ctx) {
    const world = this.world;
    for (let i = 1; i < this.renderOrder.length; i++) {
      const ball = this.renderOrder[i]; let j = i - 1;
      while (j >= 0 && this.renderOrder[j].depth < ball.depth) { this.renderOrder[j + 1] = this.renderOrder[j]; j--; }
      this.renderOrder[j + 1] = ball;
    }
    for (const ball of this.renderOrder) drawBallShadow(ctx, ball);
    for (const ball of this.renderOrder) if (ballLayer(ball, world.hoop) === 'behind-board') drawBall(ctx, ball, world.timeMs);
    drawBoard(ctx, world.hoop); drawRim(ctx, world.hoop, false);
    for (const ball of this.renderOrder) if (ballLayer(ball, world.hoop) === 'inside-hoop') drawBall(ctx, ball, world.timeMs);
    drawNet(ctx, world.hoop, 0); drawRim(ctx, world.hoop, true);
    for (const ball of this.renderOrder) if (ballLayer(ball, world.hoop) === 'foreground') drawBall(ctx, ball, world.timeMs);
  }
}
