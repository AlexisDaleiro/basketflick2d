import { GATE_TIMEOUT_MS, NORMAL_POINTS, RIM_TIP_RADIUS, SHOT_TIMEOUT_MS, SWISH_POINTS, WORLD_MAX_X, WORLD_MIN_X } from '../config/constants.js';

export class ShotJudge {
  /** Mutates only the supplied ball; resolved shots never emit twice. @param {import('./Ball.js').Ball} ball @param {import('./Hoop.js').Hoop} hoop @param {number} now ms. @returns {boolean} True only on the resolving step. */
  evaluate(ball, hoop, now) {
    const shot = ball.shot;
    if (ball.state !== 'flying' || shot.resolved) return false;
    const p0 = ball.previous;
    const p1 = ball.position;
    const a0 = p0.y - hoop.previousRimY;
    const a1 = p1.y - hoop.rimY;
    if ((a0 < 0 && a1 >= 0 && ball.velocity.y > 0) || (a0 > 0 && a1 <= 0 && ball.velocity.y < 0)) {
      const fraction = -a0 / (a1 - a0);
      const x = p0.x + fraction * (p1.x - p0.x);
      if (x > hoop.front.x + RIM_TIP_RADIUS && x < hoop.back.x - RIM_TIP_RADIUS) {
        if (a0 > 0) shot.upwardThrough = true;
        else if (!shot.upwardThrough) { shot.gateA = true; shot.gateATime = now; }
      }
    }
    const b0 = p0.y - hoop.previousGateBY;
    const b1 = p1.y - hoop.gateBY;
    if (shot.gateA && !shot.upwardThrough && b0 < 0 && b1 >= 0 && ball.velocity.y > 0
      && now - shot.gateATime <= GATE_TIMEOUT_MS) {
      const x = p0.x - b0 / (b1 - b0) * (p1.x - p0.x);
      if (x >= hoop.front.x && x <= hoop.back.x) {
        ball.swish = !ball.touchedRim && !ball.touchedBoard;
        ball.points = ball.swish ? SWISH_POINTS : NORMAL_POINTS;
        ball.outcome = 'basket';
      }
    }
    if (!ball.outcome) {
      if (ball.touchedFloor) ball.outcome = 'floor';
      else if (p1.x < WORLD_MIN_X || p1.x > WORLD_MAX_X) ball.outcome = 'outside';
      else if (now - shot.launchedAt >= SHOT_TIMEOUT_MS) ball.outcome = 'timeout';
    }
    if (!ball.outcome) return false;
    shot.resolved = true;
    ball.state = 'dead';
    ball.resolvedAt = now;
    return true;
  }
}
