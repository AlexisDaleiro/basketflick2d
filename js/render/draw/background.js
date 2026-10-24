import * as C from '../../config/constants.js';
import { theme } from '../../config/theme.js';
import { drawPaw } from './paw.js';

/** Arena decoration also covers the letterbox in logical coordinates. @param {CanvasRenderingContext2D} ctx @param {number} time s. @param {{minX:number,maxX:number,minY:number,maxY:number}} bounds @returns {void} */
export function drawBackground(ctx, time, bounds) {
  ctx.save();
  const spacing = C.PAW_PATTERN_SPACING;
  const drift = time * C.PAW_DRIFT_SPEED % spacing;
  ctx.globalAlpha = 0.07;
  for (let y = Math.floor(bounds.minY / spacing) * spacing - spacing + drift; y < bounds.maxY; y += spacing) {
    for (let x = Math.floor(bounds.minX / spacing) * spacing; x < bounds.maxX; x += spacing) {
      drawPaw(ctx, x + spacing / 2, y, C.PAW_PATTERN_SIZE, theme.lilac, -Math.PI / 6);
    }
  }
  ctx.globalAlpha = 0.055; ctx.fillStyle = theme.white;
  ctx.beginPath(); ctx.moveTo(0, C.LIGHT_TOP_Y);
  ctx.lineTo(C.LIGHT_BEAM_SPREAD, C.LIGHT_BEAM_DEPTH);
  ctx.lineTo(C.WORLD_WIDTH, C.LIGHT_BEAM_DEPTH); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(C.WORLD_WIDTH, C.LIGHT_TOP_Y);
  ctx.lineTo(C.WORLD_WIDTH - C.LIGHT_BEAM_SPREAD, C.LIGHT_BEAM_DEPTH);
  ctx.lineTo(0, C.LIGHT_BEAM_DEPTH); ctx.closePath(); ctx.fill();
  const backY = C.FRONTAL_COURT_BACK_Y;
  const backHalf = C.FRONTAL_COURT_BACK_WIDTH / 2;
  const frontHalf = C.FRONTAL_COURT_FRONT_WIDTH / 2;
  const center = C.FRONTAL_CENTER_X;
  ctx.globalAlpha = 1; ctx.fillStyle = theme.ink2;
  ctx.fillRect(bounds.minX, backY, bounds.maxX - bounds.minX, bounds.maxY - backY);
  drawBrandBoard(ctx, time, bounds, backY - C.BRAND_BOARD_HEIGHT);
  ctx.globalAlpha = 0.09; ctx.fillStyle = theme.lilac;
  ctx.beginPath(); ctx.moveTo(center - backHalf, backY); ctx.lineTo(center + backHalf, backY);
  ctx.lineTo(center + frontHalf, C.WORLD_HEIGHT); ctx.lineTo(center - frontHalf, C.WORLD_HEIGHT); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.45; ctx.strokeStyle = theme.lilac; ctx.lineWidth = C.COURT_LINE_WIDTH;
  ctx.stroke();
  ctx.globalAlpha = 0.22; ctx.strokeStyle = theme.white;
  ctx.beginPath(); ctx.moveTo(center, backY); ctx.lineTo(center, bounds.maxY); ctx.stroke();
  for (let line = 1; line <= C.NET_ROWS; line++) {
    const t = line / (C.NET_ROWS + 1); const ratio = t * t;
    const y = backY + (C.WORLD_HEIGHT - backY) * ratio;
    const halfWidth = backHalf + (frontHalf - backHalf) * ratio;
    ctx.beginPath(); ctx.moveTo(center - halfWidth, y); ctx.lineTo(center + halfWidth, y); ctx.stroke();
  }
  ctx.globalAlpha = 0.6; ctx.strokeStyle = theme.yellow;
  ctx.beginPath(); ctx.ellipse(center, C.FLOOR_Y, C.COURT_RING_RADIUS, C.COURT_RING_RADIUS / 3, 0, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.2;
  drawPaw(ctx, center, C.FLOOR_Y - C.COURT_FLOOR_HEIGHT, C.PAW_PATTERN_SIZE * 2, theme.white);
  ctx.restore();
}

/** Courtside LED band scrolling the Three Dogs wordmark. @param {CanvasRenderingContext2D} ctx @param {number} time s. @param {{minX:number,maxX:number}} bounds @param {number} top u. @returns {void} */
function drawBrandBoard(ctx, time, bounds, top) {
  const spacing = C.BRAND_BOARD_SPACING; const middle = top + C.BRAND_BOARD_HEIGHT / 2;
  ctx.fillStyle = theme.purple; ctx.fillRect(bounds.minX, top, bounds.maxX - bounds.minX, C.BRAND_BOARD_HEIGHT);
  ctx.fillStyle = theme.yellow; ctx.fillRect(bounds.minX, top, bounds.maxX - bounds.minX, C.COURT_LINE_WIDTH);
  ctx.font = C.BRAND_BOARD_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const offset = time * C.BRAND_BOARD_SPEED % spacing;
  for (let x = Math.floor(bounds.minX / spacing) * spacing - offset; x < bounds.maxX + spacing; x += spacing) {
    ctx.fillStyle = theme.yellow; ctx.fillText('THREE DOGS', x, middle);
    drawPaw(ctx, x + spacing / 2, middle, C.BRAND_BOARD_HEIGHT / 2, theme.white);
  }
}
