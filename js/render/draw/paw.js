/** Procedural paw, scaled from a unit path. @param {CanvasRenderingContext2D} ctx @param {number} x u. @param {number} y u. @param {number} size u. @param {string} color @param {number} [angle] rad. @returns {void} */
export function drawPaw(ctx, x, y, size, color, angle = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(size, size);
  ctx.fillStyle = color; ctx.beginPath();
  ctx.ellipse(0, 0.25, 0.47, 0.36, 0, 0, Math.PI * 2);
  ctx.moveTo(-0.4, -0.2); ctx.ellipse(-0.4, -0.2, 0.18, 0.23, -0.5, 0, Math.PI * 2);
  ctx.moveTo(-0.16, -0.5); ctx.ellipse(-0.16, -0.5, 0.18, 0.24, -0.1, 0, Math.PI * 2);
  ctx.moveTo(0.2, -0.5); ctx.ellipse(0.2, -0.5, 0.18, 0.24, 0.1, 0, Math.PI * 2);
  ctx.moveTo(0.45, -0.16); ctx.ellipse(0.45, -0.16, 0.18, 0.23, 0.5, 0, Math.PI * 2);
  ctx.fill(); ctx.restore();
}

/** Decorative bone/confetti path. @param {CanvasRenderingContext2D} ctx @param {number} size u. @returns {void} */
export function bonePath(ctx, size) {
  ctx.beginPath(); ctx.moveTo(-size, -size / 4); ctx.lineTo(size, -size / 4);
  ctx.arc(size, -size / 3, size / 3, Math.PI, Math.PI * 2);
  ctx.arc(size, size / 3, size / 3, -Math.PI / 2, Math.PI);
  ctx.lineTo(-size, size / 4);
  ctx.arc(-size, size / 3, size / 3, 0, Math.PI * 1.5);
  ctx.arc(-size, -size / 3, size / 3, Math.PI / 2, Math.PI * 2); ctx.closePath();
}
