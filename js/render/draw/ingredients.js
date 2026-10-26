import { theme } from '../../config/theme.js';
import { logoImage } from '../brand.js';
import { roundedRectPath } from './path.js';

const OUTLINE = 4; // u at unit scale

/** @param {CanvasRenderingContext2D} ctx */
function chicken(ctx) {
  ctx.fillStyle = theme.white;
  ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(34, 32); ctx.stroke();
  ctx.beginPath(); ctx.arc(38, 30, 8, 0, Math.PI * 2); ctx.arc(32, 38, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#D9863A';
  ctx.beginPath(); ctx.ellipse(-8, -10, 30, 24, Math.PI / 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F2B266'; ctx.beginPath(); ctx.ellipse(-16, -18, 10, 6, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
}

/** @param {CanvasRenderingContext2D} ctx */
function carrot(ctx) {
  ctx.fillStyle = '#4FB548';
  for (const angle of [-0.5, 0, 0.5]) {
    ctx.save(); ctx.translate(-26, -26); ctx.rotate(angle - Math.PI / 4);
    ctx.beginPath(); ctx.ellipse(0, -14, 7, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = '#F28C28';
  ctx.beginPath(); ctx.moveTo(-34, -14); ctx.quadraticCurveTo(-32, -36, -12, -34);
  ctx.lineTo(40, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, -10); ctx.lineTo(-4, -14); ctx.moveTo(2, 8); ctx.lineTo(10, 4); ctx.stroke();
}

/** @param {CanvasRenderingContext2D} ctx */
function rice(ctx) {
  ctx.fillStyle = theme.white;
  ctx.beginPath(); ctx.arc(0, -4, 30, Math.PI, 0); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#E9E2D0';
  for (const [x, y, a] of [[-16, -14, 0.6], [-4, -24, -0.3], [10, -16, 0.9], [18, -6, -0.6], [-22, -4, -0.8], [2, -8, 0.2]]) {
    ctx.beginPath(); ctx.ellipse(x, y, 6, 3, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = theme.purple;
  ctx.beginPath(); ctx.moveTo(-42, -4); ctx.lineTo(42, -4); ctx.quadraticCurveTo(40, 38, 0, 38); ctx.quadraticCurveTo(-40, 38, -42, -4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = theme.yellow; ctx.beginPath(); ctx.arc(0, 16, 7, 0, Math.PI * 2); ctx.fill();
}

/** @param {CanvasRenderingContext2D} ctx */
function sweetPotato(ctx) {
  ctx.fillStyle = '#9C4A5E';
  ctx.beginPath(); ctx.ellipse(-6, 0, 40, 22, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F5A04A';
  ctx.beginPath(); ctx.ellipse(32, -12, 10, 20, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#6E2F40'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-26, -2); ctx.lineTo(-18, 2); ctx.moveTo(-4, 8); ctx.lineTo(4, 10); ctx.stroke();
}

/** @param {CanvasRenderingContext2D} ctx */
function salmon(ctx) {
  ctx.fillStyle = '#F7876A';
  ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(48, -18); ctx.lineTo(48, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-4, 0, 38, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#FFE0D3'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-8, -14); ctx.quadraticCurveTo(0, 0, -8, 14); ctx.moveTo(6, -14); ctx.quadraticCurveTo(14, 0, 6, 14); ctx.stroke();
  ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(-26, -5, 4, 0, Math.PI * 2); ctx.fill();
}

/** @param {CanvasRenderingContext2D} ctx */
function kibble(ctx) {
  ctx.fillStyle = '#A8663A';
  for (const [x, y] of [[-20, -14], [-4, -20], [12, -14], [26, -8], [-28, -4], [-10, -8], [6, -4]]) {
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = theme.yellow;
  ctx.beginPath(); ctx.moveTo(-44, -2); ctx.lineTo(44, -2); ctx.lineTo(34, 30); ctx.lineTo(-34, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = theme.purple; ctx.beginPath(); ctx.arc(0, 14, 7, 0, Math.PI * 2); ctx.fill();
}

const DRAW = Object.freeze({ chicken, carrot, rice, sweetPotato, salmon, kibble });

/** Ingredient sticker painted flat on the court; size is its unscaled half-width. @param {CanvasRenderingContext2D} ctx @param {keyof DRAW} kind @param {string} label @param {number} x u. @param {number} y u. @param {number} size u. @returns {void} */
export function drawIngredientDecal(ctx, kind, label, x, y, size) {
  ctx.save(); ctx.translate(x, y);
  ctx.save(); ctx.scale(size / 50, size / 50 * 0.62);
  ctx.globalAlpha = 0.28; ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.ellipse(0, 6, 62, 54, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.9; ctx.lineWidth = OUTLINE; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = theme.ink;
  DRAW[kind](ctx); ctx.restore();
  ctx.globalAlpha = 0.85; ctx.fillStyle = theme.white; ctx.font = `900 ${Math.round(size * 0.36)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(label, 0, size * 0.48);
  ctx.restore();
}

/** Standing food bag with the official wordmark on its label. @param {CanvasRenderingContext2D} ctx @param {'dogs'|'cats'} brand @param {number} x u, center. @param {number} bottom u. @param {number} height u. @returns {void} */
export function drawFoodBag(ctx, brand, x, bottom, height) {
  const width = height * 0.68; const top = bottom - height; const half = width / 2;
  ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = theme.ink; ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.35; ctx.fillStyle = theme.ink;
  ctx.beginPath(); ctx.ellipse(x, bottom, half * 1.1, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = brand === 'dogs' ? theme.purple : theme.lilac;
  ctx.beginPath(); ctx.moveTo(x - half, top + 16);
  for (let i = 0; i <= 8; i++) ctx.lineTo(x - half + width * i / 8, top + (i % 2 ? 6 : 16));
  ctx.lineTo(x + half + 6, bottom - 8); ctx.quadraticCurveTo(x, bottom + 6, x - half - 6, bottom - 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = theme.yellow; ctx.fillRect(x - half + 3, top + 26, width - 6, 14);
  ctx.fillStyle = theme.white; roundedRectPath(ctx, x - half + 12, top + 50, width - 24, (width - 24) * 0.84, 12); ctx.fill(); ctx.stroke();
  const logo = logoImage(brand);
  if (logo) {
    const w = width - 36; ctx.drawImage(logo, x - w / 2, top + 56, w, w * logo.naturalHeight / logo.naturalWidth);
  }
  ctx.fillStyle = '#A8663A';
  for (const [dx, dy] of [[-0.22, 0.14], [0, 0.1], [0.22, 0.14], [-0.1, 0.06], [0.12, 0.05]]) {
    ctx.beginPath(); ctx.arc(x + dx * width, bottom - dy * height - 14, height * 0.04, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
