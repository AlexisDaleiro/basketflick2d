import * as C from '../../config/constants.js';
import { theme } from '../../config/theme.js';
import { drawPaw } from './paw.js';
import { depthScale } from '../projection.js';
import { roundedRectPath } from './path.js';
import { logoImage } from '../brand.js';

/** Frontal backboard, projected from the same finite slab used by collisions. @param {CanvasRenderingContext2D} ctx @param {import('../../game/FrontalHoop.js').FrontalHoop} hoop @returns {void} */
export function drawBoard(ctx, hoop) {
  const scale = depthScale(hoop.board.minZ);
  const x = C.FRONTAL_CENTER_X + (hoop.board.minX - C.FRONTAL_CENTER_X) * scale;
  const y = C.FRONTAL_HORIZON_Y + (hoop.board.minY - C.FRONTAL_HORIZON_Y) * scale;
  const width = (hoop.board.maxX - hoop.board.minX) * scale;
  const height = (hoop.board.maxY - hoop.board.minY) * scale;
  const corner = C.FRONTAL_BOARD_CORNER * scale;
  ctx.save();
  ctx.fillStyle = theme.ink;
  roundedRectPath(ctx, x + C.FRONTAL_BOARD_SHADOW, y + C.FRONTAL_BOARD_SHADOW, width, height, corner); ctx.fill();
  ctx.fillStyle = theme.white; ctx.strokeStyle = theme.yellow; ctx.lineWidth = C.BOARD_LINE_WIDTH;
  roundedRectPath(ctx, x, y, width, height, corner); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = theme.ink2; ctx.lineWidth = C.BALL_SEAM_WIDTH;
  const targetY = C.FRONTAL_HORIZON_Y + (C.FRONTAL_TARGET_TOP + hoop.rimY - C.FRONTAL_RIM_Y - C.FRONTAL_HORIZON_Y) * scale;
  ctx.strokeRect(C.FRONTAL_CENTER_X - C.FRONTAL_TARGET_WIDTH * scale / 2, targetY,
    C.FRONTAL_TARGET_WIDTH * scale, C.FRONTAL_TARGET_HEIGHT * scale);
  // Three Dogs and Three Cats flank the target, clear of the HUD that covers the board top.
  const logoWidth = C.FRONTAL_LOGO_WIDTH * scale;
  const logoCenterY = targetY + C.FRONTAL_TARGET_HEIGHT * scale / 2;
  for (const [name, side] of [['dogs', -1], ['cats', 1]]) {
    const image = logoImage(name); const cx = C.FRONTAL_CENTER_X + side * C.FRONTAL_LOGO_OFFSET * scale;
    if (image) {
      const logoHeight = logoWidth * image.naturalHeight / image.naturalWidth;
      ctx.drawImage(image, cx - logoWidth / 2, logoCenterY - logoHeight / 2, logoWidth, logoHeight);
    } else drawPaw(ctx, cx, logoCenterY, C.FRONTAL_PAW_SIZE * scale / 2, theme.lilac);
  }
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {import('../../game/FrontalHoop.js').FrontalHoop} hoop @param {boolean} front @returns {void} */
export function drawRim(ctx, hoop, front) {
  ctx.save(); ctx.lineWidth = C.FRONTAL_RIM_TUBE_RADIUS * 2 * depthScale(hoop.depth); ctx.lineCap = 'round';
  ctx.strokeStyle = front ? theme.purple : theme.lilac;
  ctx.beginPath();
  const halfSegments = C.FRONTAL_RING_SEGMENTS / 2;
  for (let segment = 0; segment <= halfSegments; segment++) {
    const angle = (front ? 0 : Math.PI) + segment / halfSegments * Math.PI;
    const depth = hoop.depth - Math.sin(angle) * hoop.radius;
    const scale = depthScale(depth);
    const x = C.FRONTAL_CENTER_X + Math.cos(angle) * hoop.radius * scale;
    const y = C.FRONTAL_HORIZON_Y + (hoop.rimY - C.FRONTAL_HORIZON_Y) * scale;
    if (segment === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

const rowY = new Float64Array(C.NET_MESH_ROWS + 1);
const rowHalf = new Float64Array(C.NET_MESH_ROWS + 1);
const rowCenter = new Float64Array(C.NET_MESH_ROWS + 1);
/** @param {number} row @param {number} col @returns {number} u. */
const meshX = (row, col) => rowCenter[row] + (col / C.NET_MESH_COLUMNS * 2 - 1) * rowHalf[row];

/** Diamond mesh that stretches, swings and wraps around a ball dropping through it. @param {CanvasRenderingContext2D} ctx @param {import('../../game/FrontalHoop.js').FrontalHoop} hoop @param {number} stretch u. @param {number} [sway] u, bottom offset. @param {import('../../game/Ball.js').Ball|null} [ball] @returns {void} */
export function drawNet(ctx, hoop, stretch, sway = 0, ball = null) {
  const scale = depthScale(hoop.depth);
  const half = hoop.radius * scale;
  const top = C.FRONTAL_HORIZON_Y + (hoop.rimY - C.FRONTAL_HORIZON_Y) * scale;
  const length = (C.FRONTAL_NET_DEPTH + stretch) * scale;
  let ballY = 0; let ballRadius = 0;
  if (ball) {
    const ballScale = depthScale(ball.depth);
    ballY = C.FRONTAL_HORIZON_Y + (ball.position.y - C.FRONTAL_HORIZON_Y) * ballScale; ballRadius = ball.radius * ballScale;
  }
  for (let row = 0; row <= C.NET_MESH_ROWS; row++) {
    const ratio = row / C.NET_MESH_ROWS;
    rowY[row] = top + length * ratio;
    rowHalf[row] = half * (1 - (1 - C.NET_BOTTOM_RATIO) * ratio);
    rowCenter[row] = C.FRONTAL_CENTER_X + sway * ratio * ratio;
    const dy = ballRadius ? (rowY[row] - ballY) / (ballRadius * C.NET_BULGE) : 1;
    if (Math.abs(dy) < 1) rowHalf[row] = Math.max(rowHalf[row], ballRadius * C.NET_BULGE * Math.sqrt(1 - dy * dy));
  }
  ctx.save(); ctx.strokeStyle = theme.white; ctx.lineWidth = C.NET_LINE_WIDTH; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.85;
  ctx.beginPath();
  for (let row = 0; row < C.NET_MESH_ROWS; row++) {
    for (let col = 0; col <= C.NET_MESH_COLUMNS; col++) {
      if (col < C.NET_MESH_COLUMNS) { ctx.moveTo(meshX(row, col), rowY[row]); ctx.lineTo(meshX(row + 1, col + 1), rowY[row + 1]); }
      if (col > 0) { ctx.moveTo(meshX(row, col), rowY[row]); ctx.lineTo(meshX(row + 1, col - 1), rowY[row + 1]); }
    }
    ctx.moveTo(meshX(row, 0), rowY[row]); ctx.lineTo(meshX(row + 1, 0), rowY[row + 1]);
    ctx.moveTo(meshX(row, C.NET_MESH_COLUMNS), rowY[row]); ctx.lineTo(meshX(row + 1, C.NET_MESH_COLUMNS), rowY[row + 1]);
  }
  const last = C.NET_MESH_ROWS;
  ctx.moveTo(meshX(last, 0), rowY[last]); ctx.lineTo(meshX(last, C.NET_MESH_COLUMNS), rowY[last]);
  ctx.stroke(); ctx.restore();
}
