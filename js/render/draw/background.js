import * as C from '../../config/constants.js';
import { theme } from '../../config/theme.js';
import { es } from '../../i18n/es.js';
import { drawCrowd } from '../crowd.js';
import { drawPaw } from './paw.js';
import { drawFoodBag, drawIngredientDecal } from './ingredients.js';

// Ingredients from the Three recipes, painted on the court sides: [kind, x u, y u, size u].
const DECALS = Object.freeze([
  ['chicken', 150, 1075, 52], ['carrot', 112, 1245, 60], ['rice', 168, 1430, 68],
  ['salmon', 930, 1075, 52], ['sweetPotato', 968, 1245, 60], ['kibble', 912, 1430, 68],
]);

/** Arena decoration also covers the letterbox in logical coordinates. @param {CanvasRenderingContext2D} ctx @param {number} time s. @param {{minX:number,maxX:number,minY:number,maxY:number}} bounds @returns {void} */
export function drawBackground(ctx, time, bounds) {
  ctx.save();
  const spacing = C.PAW_PATTERN_SPACING;
  const drift = time * C.PAW_DRIFT_SPEED % spacing;
  ctx.globalAlpha = 0.1;
  for (let y = Math.floor(bounds.minY / spacing) * spacing - spacing + drift; y < C.CROWD_TOP_Y; y += spacing) {
    for (let x = Math.floor(bounds.minX / spacing) * spacing; x < bounds.maxX; x += spacing) {
      drawPaw(ctx, x + spacing / 2, y, C.PAW_PATTERN_SIZE, theme.lilac, -Math.PI / 6);
    }
  }
  ctx.globalAlpha = 1;
  drawCrowd(ctx, time, bounds);
  ctx.globalAlpha = C.CROWD_DIM; ctx.fillStyle = theme.night;
  ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, C.FRONTAL_COURT_BACK_Y - bounds.minY);
  ctx.globalAlpha = 0.07; ctx.fillStyle = theme.white;
  ctx.beginPath(); ctx.moveTo(0, C.LIGHT_TOP_Y);
  ctx.lineTo(C.LIGHT_BEAM_SPREAD, C.LIGHT_BEAM_DEPTH);
  ctx.lineTo(C.WORLD_WIDTH, C.LIGHT_BEAM_DEPTH); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(C.WORLD_WIDTH, C.LIGHT_TOP_Y);
  ctx.lineTo(C.WORLD_WIDTH - C.LIGHT_BEAM_SPREAD, C.LIGHT_BEAM_DEPTH);
  ctx.lineTo(0, C.LIGHT_BEAM_DEPTH); ctx.closePath(); ctx.fill();
  const backY = C.FRONTAL_COURT_BACK_Y;
  ctx.globalAlpha = 1;
  drawCourt(ctx, bounds, backY);
  drawLedBoard(ctx, time, bounds, backY - C.BRAND_BOARD_HEIGHT);
  for (const [kind, x, y, size] of DECALS) drawIngredientDecal(ctx, kind, es.ingredients[kind], x, y, size);
  drawFoodBag(ctx, 'dogs', C.BAG_INSET, backY + C.BAG_DROP, C.BAG_HEIGHT);
  drawFoodBag(ctx, 'cats', C.WORLD_WIDTH - C.BAG_INSET, backY + C.BAG_DROP, C.BAG_HEIGHT);
  ctx.restore();
}

/** Purple hardwood in perspective, with the court, key and center paw. @param {CanvasRenderingContext2D} ctx @param {{minX:number,maxX:number,maxY:number}} bounds @param {number} backY u. @returns {void} */
function drawCourt(ctx, bounds, backY) {
  const center = C.FRONTAL_CENTER_X;
  const backHalf = C.FRONTAL_COURT_BACK_WIDTH / 2;
  const frontHalf = C.FRONTAL_COURT_FRONT_WIDTH / 2;
  const floor = ctx.createLinearGradient(0, backY, 0, C.WORLD_HEIGHT);
  floor.addColorStop(0, theme.courtTop); floor.addColorStop(1, theme.courtBottom);
  ctx.fillStyle = floor; ctx.fillRect(bounds.minX, backY, bounds.maxX - bounds.minX, bounds.maxY - backY);
  // Floorboards converge on the vanishing point at the horizon.
  const spread = (bounds.maxY - C.FRONTAL_HORIZON_Y) / (backY - C.FRONTAL_HORIZON_Y);
  ctx.globalAlpha = 0.14; ctx.strokeStyle = theme.ink; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = center - C.PLANK_RANGE; x <= center + C.PLANK_RANGE; x += C.PLANK_SPACING) {
    ctx.moveTo(x, backY); ctx.lineTo(center + (x - center) * spread, bounds.maxY);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.14; ctx.fillStyle = theme.lilac;
  ctx.beginPath(); ctx.moveTo(center - backHalf, backY); ctx.lineTo(center + backHalf, backY);
  ctx.lineTo(center + frontHalf, C.WORLD_HEIGHT); ctx.lineTo(center - frontHalf, C.WORLD_HEIGHT); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.7; ctx.strokeStyle = theme.white; ctx.lineWidth = C.COURT_LINE_WIDTH; ctx.stroke();
  // Key in front of the hoop.
  const keyScale = (C.KEY_FRONT_Y - C.FRONTAL_HORIZON_Y) / (backY - C.FRONTAL_HORIZON_Y);
  ctx.globalAlpha = 0.3; ctx.fillStyle = theme.lilac;
  ctx.beginPath(); ctx.moveTo(center - C.KEY_BACK_HALF, backY); ctx.lineTo(center + C.KEY_BACK_HALF, backY);
  ctx.lineTo(center + C.KEY_BACK_HALF * keyScale, C.KEY_FRONT_Y); ctx.lineTo(center - C.KEY_BACK_HALF * keyScale, C.KEY_FRONT_Y); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.8; ctx.strokeStyle = theme.yellow; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(center, C.KEY_FRONT_Y, C.KEY_BACK_HALF * keyScale, C.KEY_ARC_HEIGHT, 0, 0, Math.PI); ctx.stroke();
  ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.ellipse(center, C.FLOOR_Y, C.COURT_RING_RADIUS, C.COURT_RING_RADIUS / 3, 0, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.25;
  drawPaw(ctx, center, C.FLOOR_Y - C.COURT_FLOOR_HEIGHT, C.PAW_PATTERN_SIZE * 2.4, theme.white);
  ctx.globalAlpha = 1;
}

let ledWidths = null; let ledCycle = 0; let ledDots = null;
/** Lazily built LED matrix overlay; null outside a browser. @param {CanvasRenderingContext2D} ctx @returns {CanvasPattern|null} */
function ledPattern(ctx) {
  if (ledDots !== null || typeof document === 'undefined') return ledDots;
  const tile = document.createElement('canvas'); tile.width = C.LED_DOT; tile.height = C.LED_DOT;
  const tileCtx = tile.getContext('2d');
  tileCtx.fillStyle = 'rgba(0,0,0,0.55)'; tileCtx.fillRect(0, 0, C.LED_DOT, C.LED_DOT);
  tileCtx.globalCompositeOperation = 'destination-out';
  tileCtx.beginPath(); tileCtx.arc(C.LED_DOT / 2, C.LED_DOT / 2, C.LED_DOT * 0.36, 0, Math.PI * 2); tileCtx.fill();
  ledDots = ctx.createPattern(tile, 'repeat'); return ledDots;
}

/** Courtside LED band scrolling the Three food benefits. @param {CanvasRenderingContext2D} ctx @param {number} time s. @param {{minX:number,maxX:number}} bounds @param {number} top u. @returns {void} */
function drawLedBoard(ctx, time, bounds, top) {
  const height = C.BRAND_BOARD_HEIGHT; const middle = top + height / 2; const width = bounds.maxX - bounds.minX;
  ctx.fillStyle = theme.led; ctx.fillRect(bounds.minX, top, width, height);
  ctx.font = C.BRAND_BOARD_FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  if (!ledWidths) {
    // Measured once: the band never allocates while scrolling.
    ledWidths = es.ledBenefits.map(text => ctx.measureText(text).width);
    ledCycle = ledWidths.reduce((sum, value) => sum + value + C.BRAND_BOARD_GAP, 0);
  }
  let x = bounds.minX - time * C.BRAND_BOARD_SPEED % ledCycle;
  for (let i = 0; x < bounds.maxX; i = (i + 1) % ledWidths.length) {
    if (x + ledWidths[i] > bounds.minX) {
      ctx.globalAlpha = 0.3; ctx.strokeStyle = theme.yellow; ctx.lineWidth = 8; ctx.strokeText(es.ledBenefits[i], x, middle);
      ctx.globalAlpha = 1; ctx.fillStyle = theme.yellow; ctx.fillText(es.ledBenefits[i], x, middle);
    }
    x += ledWidths[i];
    drawPaw(ctx, x + C.BRAND_BOARD_GAP / 2, middle, height * 0.42, theme.white, -0.2);
    x += C.BRAND_BOARD_GAP;
  }
  const dots = ledPattern(ctx);
  if (dots) { ctx.fillStyle = dots; ctx.fillRect(bounds.minX, top, width, height); }
  ctx.fillStyle = theme.purple; ctx.fillRect(bounds.minX, top, width, C.COURT_LINE_WIDTH);
  ctx.fillRect(bounds.minX, top + height - C.COURT_LINE_WIDTH, width, C.COURT_LINE_WIDTH);
}
