import { MAX_DPR, WORLD_BORDER_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants.js';
import { theme } from '../config/theme.js';
import { drawBackground } from './draw/background.js';

export class Renderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.left = 0;
    this.top = 0;
    this.bounds = { minX: 0, maxX: WORLD_WIDTH, minY: 0, maxY: WORLD_HEIGHT };
    this.resize = this.resize.bind(this);
    this.controller = new AbortController();
    window.addEventListener('resize', this.resize, { signal: this.controller.signal });
    window.visualViewport?.addEventListener('resize', this.resize, { signal: this.controller.signal });
    this.resize();
  }

  /** @returns {void} */
  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    this.left = bounds.left;
    this.top = bounds.top;
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.scale = Math.min(this.width / WORLD_WIDTH, this.height / WORLD_HEIGHT);
    this.offsetX = (this.width - WORLD_WIDTH * this.scale) / 2;
    this.offsetY = (this.height - WORLD_HEIGHT * this.scale) / 2;
    this.bounds.minX = -this.offsetX / this.scale;
    this.bounds.maxX = (this.width - this.offsetX) / this.scale;
    this.bounds.minY = -this.offsetY / this.scale;
    this.bounds.maxY = (this.height - this.offsetY) / this.scale;
    const style = this.canvas.parentElement.style;
    style.setProperty('--world-left', `${this.offsetX}px`);
    style.setProperty('--world-top', `${this.offsetY}px`);
    style.setProperty('--world-width', `${WORLD_WIDTH * this.scale}px`);
    style.setProperty('--world-height', `${WORLD_HEIGHT * this.scale}px`);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.background = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    this.background.addColorStop(0, theme.plum);
    this.background.addColorStop(1, theme.night);
  }

  /** @param {number} x CSS px. @param {number} y CSS px. @param {{x: number, y: number}} out Reused world vector. @returns {void} */
  toWorld(x, y, out) {
    out.x = (x - this.left - this.offsetX) / this.scale;
    out.y = (y - this.top - this.offsetY) / this.scale;
  }

  /** Draw the entire viewport, then enter the logical world transform. @param {number} [time] s. @returns {void} */
  begin(time = 0) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
    drawBackground(ctx, time, this.bounds);
    ctx.strokeStyle = theme.plumDark;
    ctx.lineWidth = WORLD_BORDER_WIDTH;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  /** @returns {void} */
  destroy() { this.controller.abort(); }
}
