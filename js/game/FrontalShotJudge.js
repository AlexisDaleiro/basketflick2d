import * as C from '../config/constants.js';

/** Checks both physical height and depth, so a screen overlap alone never scores. */
export class FrontalShotJudge {
  /** @param {import('./Ball.js').Ball} ball @param {import('./FrontalHoop.js').FrontalHoop} hoop @param {number} now ms. @returns {boolean} */
  evaluate(ball, hoop, now) {
    const shot = ball.shot;
    if (ball.state !== 'flying' || shot.resolved) return false;
    const a0 = ball.previous.y - hoop.previousRimY;
    const a1 = ball.position.y - hoop.rimY;
    if ((a0 < 0 && a1 >= 0 && ball.velocity.y > 0) || (a0 > 0 && a1 <= 0 && ball.velocity.y < 0)) {
      const fraction = -a0 / (a1 - a0);
      const x = ball.previous.x + fraction * (ball.position.x - ball.previous.x);
      const depth = ball.previousDepth + fraction * (ball.depth - ball.previousDepth);
      if (Math.hypot(x - hoop.centerX, depth - hoop.depth) < hoop.radius - C.FRONTAL_RIM_TUBE_RADIUS) {
        if (a0 > 0) shot.upwardThrough = true;
        else if (!shot.upwardThrough) { shot.gateA = true; shot.gateATime = now; }
      }
    }
    const b0 = ball.previous.y - hoop.previousGateBY;
    const b1 = ball.position.y - hoop.gateBY;
    if (shot.gateA && !shot.upwardThrough && b0 < 0 && b1 >= 0 && ball.velocity.y > 0 && now - shot.gateATime <= C.GATE_TIMEOUT_MS) {
      const fraction = -b0 / (b1 - b0);
      const x = ball.previous.x + fraction * (ball.position.x - ball.previous.x);
      const depth = ball.previousDepth + fraction * (ball.depth - ball.previousDepth);
      if (Math.hypot(x - hoop.centerX, depth - hoop.depth) <= hoop.radius) {
        ball.swish = !ball.touchedRim && !ball.touchedBoard;
        ball.points = ball.swish ? C.SWISH_POINTS : C.NORMAL_POINTS; ball.outcome = 'basket';
      }
    }
    if (!ball.outcome) {
      if (ball.touchedFloor) ball.outcome = 'floor';
      else if (ball.position.x < C.WORLD_MIN_X || ball.position.x > C.WORLD_MAX_X
        || ball.depth < C.FRONTAL_MIN_DEPTH || ball.depth > C.FRONTAL_MAX_DEPTH) ball.outcome = 'outside';
      else if (now - shot.launchedAt >= C.SHOT_TIMEOUT_MS) ball.outcome = 'timeout';
    }
    if (!ball.outcome) return false;
    shot.resolved = true; ball.state = 'dead'; ball.resolvedAt = now; return true;
  }
}
