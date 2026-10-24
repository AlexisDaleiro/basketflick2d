import { BALL_RADIUS, FLOOR_Y, GRAB_RADIUS, LAB_BALL_SEAM_WIDTH, LAB_LINE_WIDTH, LAB_NET_STRANDS, LAB_READY_RING_WIDTH, NET_BOTTOM_RATIO, NET_DEPTH, RIM_TIP_RADIUS, WORLD_WIDTH } from '../../config/constants.js';
import { theme } from '../../config/theme.js';

/** Minimal H2 geometry; H3 adds full procedural arena and effects. @param {CanvasRenderingContext2D} ctx @param {import('../../game/PhysicsLab.js').PhysicsLab} lab @returns {void} */
export function drawLab(ctx, lab) {
  const hoop = lab.world.hoop;
  ctx.save();
  ctx.lineWidth = LAB_LINE_WIDTH;
  ctx.strokeStyle = theme.lilac;
  ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(WORLD_WIDTH, FLOOR_Y); ctx.stroke();
  ctx.fillStyle = theme.white;
  ctx.fillRect(hoop.board.minX, hoop.board.minY, hoop.board.maxX - hoop.board.minX, hoop.board.maxY - hoop.board.minY);
  ctx.strokeStyle = theme.yellow;
  ctx.beginPath(); ctx.moveTo(hoop.front.x, hoop.rimY); ctx.lineTo(hoop.back.x, hoop.rimY); ctx.stroke();
  for (const ball of lab.world.balls) {
    if (ball.state === 'inactive') continue;
    if (ball.state === 'ready') {
      ctx.lineWidth = LAB_READY_RING_WIDTH;
      ctx.strokeStyle = theme.lilac;
      ctx.beginPath(); ctx.arc(ball.position.x, ball.position.y, GRAB_RADIUS, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = ball.opacity;
    ctx.translate(ball.position.x, ball.position.y);
    ctx.rotate(ball.angle);
    ctx.fillStyle = theme.yellow;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = LAB_BALL_SEAM_WIDTH;
    ctx.beginPath(); ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-BALL_RADIUS, 0); ctx.lineTo(BALL_RADIUS, 0);
    ctx.moveTo(0, -BALL_RADIUS); ctx.lineTo(0, BALL_RADIUS); ctx.stroke();
    ctx.restore();
  }
  const width = hoop.back.x - hoop.front.x;
  const inset = width * (1 - NET_BOTTOM_RATIO) / 2;
  ctx.strokeStyle = theme.white;
  ctx.lineWidth = LAB_READY_RING_WIDTH;
  ctx.beginPath();
  for (let strand = 0; strand <= LAB_NET_STRANDS; strand++) {
    const ratio = strand / LAB_NET_STRANDS;
    ctx.moveTo(hoop.front.x + width * ratio, hoop.rimY);
    ctx.lineTo(hoop.front.x + inset + width * NET_BOTTOM_RATIO * ratio, hoop.rimY + NET_DEPTH);
  }
  ctx.moveTo(hoop.front.x + inset, hoop.rimY + NET_DEPTH);
  ctx.lineTo(hoop.back.x - inset, hoop.rimY + NET_DEPTH);
  ctx.stroke();
  ctx.fillStyle = theme.yellow;
  ctx.beginPath(); ctx.arc(hoop.front.x, hoop.rimY, RIM_TIP_RADIUS, 0, Math.PI * 2);
  ctx.moveTo(hoop.back.x + RIM_TIP_RADIUS, hoop.rimY);
  ctx.arc(hoop.back.x, hoop.rimY, RIM_TIP_RADIUS, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
