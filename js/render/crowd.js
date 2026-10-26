import * as C from '../config/constants.js';
import { theme } from '../config/theme.js';

/** Deterministic LCG so the stands look the same on every kiosk. @param {number} seed @returns {()=>number} */
function seeded(seed) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

const FUR = Object.freeze([
  ['#C98B4F', '#F3D9B5'], ['#7A4E2D', '#D9B38C'], ['#F2E3C6', '#FFFFFF'], ['#3B3B3B', '#8C8C8C'],
  ['#E89A3C', '#FFE2B8'], ['#9A9AA6', '#E6E6EE'], ['#1F1F1F', '#F2F2F2'], ['#D6B36A', '#FFF1CF'],
]);
const JERSEYS = Object.freeze([theme.purple, theme.yellow, theme.white, theme.lilac]);

/** Preallocated fans, generated once across a range wider than any landscape letterbox. */
const FANS = (() => {
  const random = seeded(C.CROWD_SEED); const fans = [];
  for (let row = 0; row < C.CROWD_ROWS; row++) {
    const scale = C.CROWD_BACK_SCALE + (C.CROWD_FRONT_SCALE - C.CROWD_BACK_SCALE) * row / (C.CROWD_ROWS - 1);
    const spacing = C.CROWD_SPACING * scale;
    const y = C.CROWD_TOP_Y + (C.CROWD_BOTTOM_Y - C.CROWD_TOP_Y) * row / (C.CROWD_ROWS - 1);
    for (let x = C.CROWD_MIN_X + (row % 2) * spacing / 2; x < C.CROWD_MAX_X; x += spacing) {
      const fur = FUR[Math.floor(random() * FUR.length)];
      fans.push({ row, x: x + (random() - 0.5) * spacing * 0.25, y, scale: scale * (0.92 + random() * 0.16),
        cat: random() < C.CROWD_CAT_RATIO, fur: fur[0], muzzle: fur[1],
        jersey: JERSEYS[Math.floor(random() * JERSEYS.length)], phase: random() * Math.PI * 2,
        eager: random(), pennant: random() < C.CROWD_PENNANT_RATIO });
    }
  }
  return fans;
})();

/** Shared crowd mood: screens call cheer(), the background renderer reads and decays it. */
export const crowd = {
  level: 0, lastTime: null,
  /** @param {number} amount 0..1 typical. @returns {void} */
  cheer(amount) { this.level = Math.min(C.CROWD_MAX_LEVEL, this.level + amount); },
  /** @returns {void} */
  reset() { this.level = 0; },
};

/** @param {CanvasRenderingContext2D} ctx @param {any} fan @param {number} time s. @param {number} level */
function drawFan(ctx, fan, time, level) {
  const excited = level > fan.eager * C.CROWD_ARMS_LEVEL;
  const hop = excited ? Math.abs(Math.sin(time * C.CROWD_HOP_SPEED + fan.phase)) * C.CROWD_HOP_HEIGHT * Math.min(1, level) : 0;
  const sway = Math.sin(time * C.CROWD_SWAY_SPEED + fan.phase) * C.CROWD_SWAY;
  ctx.save(); ctx.translate(fan.x + sway, fan.y - hop); ctx.scale(fan.scale, fan.scale);
  ctx.lineWidth = 3; ctx.strokeStyle = theme.ink;
  // Raised paws behind the head while cheering.
  if (excited) {
    const wave = Math.sin(time * C.CROWD_WAVE_SPEED + fan.phase) * 6;
    ctx.fillStyle = fan.fur;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(side * (26 + wave * side), -92, 9, 22, side * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  if (fan.pennant) {
    ctx.strokeStyle = theme.white; ctx.beginPath(); ctx.moveTo(24, -10); ctx.lineTo(30, -120); ctx.stroke();
    const flap = Math.sin(time * C.CROWD_WAVE_SPEED * 1.3 + fan.phase) * 8;
    ctx.fillStyle = theme.yellow; ctx.strokeStyle = theme.ink;
    ctx.beginPath(); ctx.moveTo(30, -120); ctx.lineTo(78, -104 + flap); ctx.lineTo(29, -88); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle = theme.ink;
  // Jersey with a paw badge.
  ctx.fillStyle = fan.jersey;
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.quadraticCurveTo(-30, -38, 0, -40); ctx.quadraticCurveTo(30, -38, 30, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fan.jersey === theme.yellow || fan.jersey === theme.white ? theme.purple : theme.yellow;
  ctx.beginPath(); ctx.arc(0, -18, 6, 0, Math.PI * 2); ctx.fill();
  // Ears go behind the head.
  ctx.fillStyle = fan.fur;
  if (fan.cat) {
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 22, -62); ctx.lineTo(side * 18, -92); ctx.lineTo(side * 4, -78); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else {
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(side * 23, -64, 9, 17, side * -0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  ctx.beginPath(); ctx.arc(0, -64, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fan.muzzle;
  ctx.beginPath(); ctx.ellipse(0, -54, fan.cat ? 11 : 13, fan.cat ? 8 : 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = theme.ink;
  if (excited) {
    // Happy closed eyes and an open mouth.
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-9, -68, 4.5, Math.PI * 1.1, Math.PI * 1.9); ctx.moveTo(13.5, -68);
    ctx.arc(9, -68, 4.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = '#E8667A'; ctx.beginPath(); ctx.ellipse(0, -48, 6, 5, 0, 0, Math.PI); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(-9, -68, 3.5, 0, Math.PI * 2); ctx.arc(9, -68, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = fan.cat ? '#E8667A' : theme.ink;
  ctx.beginPath(); ctx.ellipse(0, -57, fan.cat ? 3.5 : 5, fan.cat ? 2.5 : 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Tiered stands of pet fans behind the hoop; they hop and raise paws after baskets. @param {CanvasRenderingContext2D} ctx @param {number} time s. @param {{minX:number,maxX:number}} bounds @returns {void} */
export function drawCrowd(ctx, time, bounds) {
  const dt = crowd.lastTime === null ? 0 : Math.max(0, Math.min(C.CROWD_MAX_DT, time - crowd.lastTime));
  crowd.lastTime = time; crowd.level *= Math.exp(-C.CROWD_DECAY * dt);
  ctx.save();
  const step = (C.CROWD_BOTTOM_Y - C.CROWD_TOP_Y) / (C.CROWD_ROWS - 1);
  let index = 0;
  for (let row = 0; row < C.CROWD_ROWS; row++) {
    const y = C.CROWD_TOP_Y + step * row;
    ctx.fillStyle = row % 2 ? theme.plum : theme.plumDark;
    ctx.fillRect(bounds.minX, y - step * 0.55, bounds.maxX - bounds.minX, step);
    for (; index < FANS.length && FANS[index].row === row; index++) {
      const fan = FANS[index];
      if (fan.x < bounds.minX - C.CROWD_SPACING || fan.x > bounds.maxX + C.CROWD_SPACING) continue;
      drawFan(ctx, fan, time, crowd.level);
    }
    // Bench rail in front of each row.
    ctx.fillStyle = theme.lilac; ctx.globalAlpha = 0.5;
    ctx.fillRect(bounds.minX, y - 6, bounds.maxX - bounds.minX, 6); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
