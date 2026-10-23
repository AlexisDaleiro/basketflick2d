import * as C from '../../config/constants.js';
import { theme } from '../../config/theme.js';

/** @param {CanvasRenderingContext2D} ctx @param {import('../../game/Ball.js').Ball} ball @param {number} now ms. @returns {void} */
export function drawBall(ctx, ball, now) {
  if (ball.state === 'inactive') return;
  const radius = ball.radius;
  const age = Math.max(0, now - ball.spawnedAt);
  const pop = Math.min(1, age / C.BALL_POP_MS);
  const size = pop < 1 ? Math.sin(pop * Math.PI / 2) : 1;
  ctx.save(); ctx.globalAlpha = ball.opacity;
  ctx.translate(ball.position.x, ball.position.y); ctx.scale(size, size);
  ctx.fillStyle = theme.navy; ctx.globalAlpha *= 0.4;
  ctx.beginPath(); ctx.ellipse(C.BALL_SHADOW_OFFSET, C.BALL_SHADOW_OFFSET, radius, radius, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = ball.opacity; ctx.rotate(ball.angle);
  ctx.fillStyle = theme.orange; ctx.strokeStyle = theme.navy; ctx.lineWidth = C.BALL_OUTLINE_WIDTH;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = theme.yellow; ctx.lineWidth = C.BALL_SEAM_WIDTH;
  ctx.beginPath(); ctx.arc(0, 0, radius - C.BALL_OUTLINE_WIDTH, Math.PI, Math.PI * 1.5); ctx.stroke();
  ctx.strokeStyle = theme.navy;
  ctx.beginPath(); ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0); ctx.moveTo(0, -radius); ctx.lineTo(0, radius);
  ctx.moveTo(-radius / 2, -radius * Math.sqrt(3) / 2);
  ctx.bezierCurveTo(radius / 2, -radius / 2, radius / 2, radius / 2, -radius / 2, radius * Math.sqrt(3) / 2);
  ctx.moveTo(radius / 2, -radius * Math.sqrt(3) / 2);
  ctx.bezierCurveTo(-radius / 2, -radius / 2, -radius / 2, radius / 2, radius / 2, radius * Math.sqrt(3) / 2); ctx.stroke();
  ctx.restore();
}

/** Offscreen balls retain an x-position indicator under the HUD. @param {CanvasRenderingContext2D} ctx @param {import('../../game/Ball.js').Ball} ball @returns {void} */
export function drawBallIndicator(ctx, ball) {
  if (ball.state !== 'flying' || ball.position.y + ball.radius >= 0) return;
  const size = C.INDICATOR_SIZE;
  const x = Math.max(size, Math.min(C.WORLD_WIDTH - size, ball.position.x));
  ctx.fillStyle = theme.yellow; ctx.beginPath(); ctx.moveTo(x, C.INDICATOR_Y - size);
  ctx.lineTo(x - size, C.INDICATOR_Y + size); ctx.lineTo(x + size, C.INDICATOR_Y + size); ctx.closePath(); ctx.fill();
}
