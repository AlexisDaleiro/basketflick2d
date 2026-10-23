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
      drawPaw(ctx, x + spacing / 2, y, C.PAW_PATTERN_SIZE, theme.teal, -Math.PI / 6);
    }
  }
  ctx.globalAlpha = 0.055; ctx.fillStyle = theme.white;
  ctx.beginPath(); ctx.moveTo(0, C.LIGHT_TOP_Y);
  ctx.lineTo(C.LIGHT_BEAM_SPREAD, C.LIGHT_BEAM_DEPTH);
  ctx.lineTo(C.WORLD_WIDTH, C.LIGHT_BEAM_DEPTH); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(C.WORLD_WIDTH, C.LIGHT_TOP_Y);
  ctx.lineTo(C.WORLD_WIDTH - C.LIGHT_BEAM_SPREAD, C.LIGHT_BEAM_DEPTH);
  ctx.lineTo(0, C.LIGHT_BEAM_DEPTH); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1; ctx.fillStyle = theme.navy2;
  ctx.fillRect(bounds.minX, C.COURT_TOP_Y, bounds.maxX - bounds.minX, bounds.maxY - C.COURT_TOP_Y);
  ctx.globalAlpha = 0.3; ctx.strokeStyle = theme.teal; ctx.lineWidth = C.COURT_LINE_WIDTH;
  ctx.beginPath(); ctx.ellipse(C.COURT_CENTER_X, C.FLOOR_Y, C.COURT_RING_RADIUS, C.COURT_RING_RADIUS / 3, 0, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bounds.minX, C.COURT_TOP_Y); ctx.lineTo(bounds.maxX, C.COURT_TOP_Y); ctx.stroke();
  ctx.globalAlpha = 1; ctx.strokeStyle = theme.orange;
  ctx.beginPath(); ctx.moveTo(bounds.minX, C.FLOOR_Y); ctx.lineTo(bounds.maxX, C.FLOOR_Y); ctx.stroke();
  ctx.globalAlpha = 0.15;
  drawPaw(ctx, C.COURT_CENTER_X, C.FLOOR_Y - C.COURT_FLOOR_HEIGHT, C.PAW_PATTERN_SIZE * 2, theme.white);
  ctx.restore();
}
