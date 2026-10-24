import * as C from '../../config/constants.js';
import { theme } from '../../config/theme.js';
import { drawPaw } from './paw.js';
import { depthScale } from '../projection.js';
import { roundedRectPath } from './path.js';

/** Frontal backboard, projected from the same finite slab used by collisions. @param {CanvasRenderingContext2D} ctx @param {import('../../game/FrontalHoop.js').FrontalHoop} hoop @returns {void} */
export function drawBoard(ctx, hoop) {
  const scale = depthScale(hoop.board.minZ);
  const x = C.FRONTAL_CENTER_X + (hoop.board.minX - C.FRONTAL_CENTER_X) * scale;
  const y = C.FRONTAL_HORIZON_Y + (hoop.board.minY - C.FRONTAL_HORIZON_Y) * scale;
  const width = (hoop.board.maxX - hoop.board.minX) * scale;
  const height = (hoop.board.maxY - hoop.board.minY) * scale;
  const corner = C.FRONTAL_BOARD_CORNER * scale;
  ctx.save();
  ctx.fillStyle = theme.navy;
  roundedRectPath(ctx, x + C.FRONTAL_BOARD_SHADOW, y + C.FRONTAL_BOARD_SHADOW, width, height, corner); ctx.fill();
  ctx.fillStyle = theme.white; ctx.strokeStyle = theme.orange; ctx.lineWidth = C.BOARD_LINE_WIDTH;
  roundedRectPath(ctx, x, y, width, height, corner); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = theme.navy2; ctx.lineWidth = C.BALL_SEAM_WIDTH;
  const targetY = C.FRONTAL_HORIZON_Y + (C.FRONTAL_TARGET_TOP + hoop.rimY - C.FRONTAL_RIM_Y - C.FRONTAL_HORIZON_Y) * scale;
  ctx.strokeRect(C.FRONTAL_CENTER_X - C.FRONTAL_TARGET_WIDTH * scale / 2, targetY,
    C.FRONTAL_TARGET_WIDTH * scale, C.FRONTAL_TARGET_HEIGHT * scale);
  drawPaw(ctx, C.FRONTAL_CENTER_X, y + C.FRONTAL_PAW_SIZE * scale, C.FRONTAL_PAW_SIZE * scale / 2, theme.teal);
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {import('../../game/FrontalHoop.js').FrontalHoop} hoop @param {boolean} front @returns {void} */
export function drawRim(ctx, hoop, front) {
  const scale = depthScale(hoop.depth);
  const y = C.FRONTAL_HORIZON_Y + (hoop.rimY - C.FRONTAL_HORIZON_Y) * scale;
  const radius = hoop.radius * scale;
  ctx.save(); ctx.lineWidth = C.RIM_LINE_WIDTH; ctx.lineCap = 'round';
  ctx.strokeStyle = front ? theme.orange : theme.yellow;
  ctx.beginPath(); ctx.ellipse(C.FRONTAL_CENTER_X, y,
    radius, radius * C.FRONTAL_RIM_PERSPECTIVE, 0,
    front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {import('../../game/FrontalHoop.js').FrontalHoop} hoop @param {number} stretch u. @returns {void} */
export function drawNet(ctx, hoop, stretch) {
  const scale = depthScale(hoop.depth);
  const width = hoop.radius * 2 * scale;
  const left = C.FRONTAL_CENTER_X - width / 2;
  const y = C.FRONTAL_HORIZON_Y + (hoop.rimY - C.FRONTAL_HORIZON_Y) * scale;
  const depth = (C.FRONTAL_NET_DEPTH + stretch) * scale;
  ctx.save(); ctx.strokeStyle = theme.white; ctx.lineWidth = C.NET_LINE_WIDTH; ctx.globalAlpha = 0.8;
  ctx.beginPath();
  for (let row = 0; row <= C.NET_ROWS; row++) {
    const ratio = row / C.NET_ROWS;
    const inset = width * (1 - C.NET_BOTTOM_RATIO) * ratio / 2;
    ctx.moveTo(left + inset, y + depth * ratio);
    ctx.lineTo(left + width - inset, y + depth * ratio);
  }
  for (let col = 0; col <= C.NET_COLUMNS; col++) {
    const ratio = col / C.NET_COLUMNS;
    ctx.moveTo(left + width * ratio, y);
    ctx.lineTo(left + width * (1 - C.NET_BOTTOM_RATIO) / 2 + width * C.NET_BOTTOM_RATIO * ratio, y + depth);
  }
  ctx.stroke(); ctx.restore();
}
