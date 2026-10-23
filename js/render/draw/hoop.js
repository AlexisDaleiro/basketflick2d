import * as C from '../../config/constants.js';
import { theme } from '../../config/theme.js';
import { drawPaw } from './paw.js';

/** @param {CanvasRenderingContext2D} ctx @param {import('../../game/Hoop.js').Hoop} hoop @returns {void} */
export function drawBoard(ctx, hoop) {
  ctx.save();
  ctx.fillStyle = theme.navy2; ctx.strokeStyle = theme.teal; ctx.lineWidth = C.BOARD_LINE_WIDTH;
  ctx.beginPath(); ctx.moveTo(hoop.board.maxX, hoop.board.minY);
  ctx.lineTo(hoop.board.maxX + C.BOARD_TARGET_SIZE, hoop.board.minY - C.BOARD_TARGET_SIZE);
  ctx.lineTo(hoop.board.maxX + C.BOARD_TARGET_SIZE, C.FLOOR_Y); ctx.stroke();
  ctx.fillStyle = theme.white;
  ctx.fillRect(hoop.board.minX, hoop.board.minY, hoop.board.maxX - hoop.board.minX, hoop.board.maxY - hoop.board.minY);
  ctx.strokeStyle = theme.navy; ctx.lineWidth = C.BALL_SEAM_WIDTH;
  ctx.strokeRect(hoop.board.minX, hoop.board.minY, hoop.board.maxX - hoop.board.minX, hoop.board.maxY - hoop.board.minY);
  drawPaw(ctx, (hoop.board.minX + hoop.board.maxX) / 2, hoop.rimY - C.BOARD_TARGET_SIZE, C.BOARD_LINE_WIDTH, theme.orange);
  ctx.restore();
}

/** Rear half goes behind balls; front half goes above the net. @param {CanvasRenderingContext2D} ctx @param {import('../../game/Hoop.js').Hoop} hoop @param {boolean} front @returns {void} */
export function drawRim(ctx, hoop, front) {
  ctx.save(); ctx.lineWidth = C.RIM_LINE_WIDTH; ctx.lineCap = 'round';
  ctx.strokeStyle = front ? theme.orange : theme.yellow;
  ctx.beginPath(); ctx.ellipse((hoop.front.x + hoop.back.x) / 2, hoop.rimY,
    (hoop.back.x - hoop.front.x) / 2, C.RIM_TIP_RADIUS, 0,
    front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** Spring displacement affects only visual lower vertices. @param {CanvasRenderingContext2D} ctx @param {import('../../game/Hoop.js').Hoop} hoop @param {number} stretch u. @returns {void} */
export function drawNet(ctx, hoop, stretch) {
  const width = hoop.back.x - hoop.front.x;
  const depth = C.NET_DEPTH + stretch;
  ctx.save(); ctx.strokeStyle = theme.white; ctx.lineWidth = C.NET_LINE_WIDTH; ctx.globalAlpha = 0.8;
  ctx.beginPath();
  for (let row = 0; row <= C.NET_ROWS; row++) {
    const ratio = row / C.NET_ROWS;
    const inset = width * (1 - C.NET_BOTTOM_RATIO) * ratio / 2;
    ctx.moveTo(hoop.front.x + inset, hoop.rimY + depth * ratio);
    ctx.lineTo(hoop.back.x - inset, hoop.rimY + depth * ratio);
  }
  for (let col = 0; col <= C.NET_COLUMNS; col++) {
    const ratio = col / C.NET_COLUMNS;
    ctx.moveTo(hoop.front.x + width * ratio, hoop.rimY);
    ctx.lineTo(hoop.front.x + width * (1 - C.NET_BOTTOM_RATIO) / 2 + width * C.NET_BOTTOM_RATIO * ratio, hoop.rimY + depth);
  }
  ctx.stroke(); ctx.restore();
}
