import * as C from '../../config/constants.js';
import { theme } from '../../config/theme.js';
import { drawPaw } from './paw.js';
import { depthScale } from '../projection.js';
import { roundedRectPath } from './path.js';
import { brandDataUrl } from '../brand.js';

let logo = null;
/** Lazily decoded backboard logo; null until ready or outside a browser. @returns {HTMLImageElement|null} */
function boardLogo() {
  if (!logo && typeof Image !== 'undefined') { logo = new Image(); logo.src = brandDataUrl(theme.purple); }
  return logo?.complete && logo.naturalWidth ? logo : null;
}

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
  const image = boardLogo();
  if (image) {
    const logoWidth = C.FRONTAL_LOGO_WIDTH * scale; const logoHeight = logoWidth * image.naturalHeight / image.naturalWidth;
    ctx.drawImage(image, C.FRONTAL_CENTER_X - logoWidth / 2, y + C.FRONTAL_LOGO_TOP * scale, logoWidth, logoHeight);
  } else drawPaw(ctx, C.FRONTAL_CENTER_X, y + C.FRONTAL_PAW_SIZE * scale, C.FRONTAL_PAW_SIZE * scale / 2, theme.lilac);
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
