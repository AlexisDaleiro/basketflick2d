import { FIXED_DT, MAX_STEPS_PER_FRAME, MS_PER_SECOND } from '../config/constants.js';

export class GameLoop {
  /** @param {{update: (dt: number) => void, render: (alpha: number) => void, requestFrame?: (callback: FrameRequestCallback) => number, cancelFrame?: (id: number) => void}} options */
  constructor({ update, render, requestFrame = callback => globalThis.requestAnimationFrame(callback), cancelFrame = id => globalThis.cancelAnimationFrame(id) }) {
    this.update = update;
    this.render = render;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.running = false;
    this.frameId = null;
    this.previousTime = null;
    this.accumulator = 0;
    this.steps = 0;
    this.frame = this.frame.bind(this);
  }

  /** Start or resume with a fresh clock. @returns {void} */
  start() {
    if (this.running) return;
    this.running = true;
    this.previousTime = null;
    this.accumulator = 0;
    this.frameId = this.requestFrame(this.frame);
  }

  /** Pause without accumulating time spent suspended. @returns {void} */
  stop() {
    this.running = false;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null;
    this.previousTime = null;
    this.accumulator = 0;
  }

  /** @param {number} timestamp rAF time in ms. @returns {void} */
  frame(timestamp) {
    if (!this.running) return;
    if (this.previousTime !== null) {
      this.accumulator += Math.max(0, timestamp - this.previousTime) / MS_PER_SECOND;
    }
    this.previousTime = timestamp;
    this.steps = 0;
    // An exception still reaches the global handler, but never stops the next frame.
    try {
      while (this.accumulator >= FIXED_DT && this.steps < MAX_STEPS_PER_FRAME) {
        this.steps++;
        this.accumulator -= FIXED_DT;
        this.update(FIXED_DT);
      }
      if (this.steps === MAX_STEPS_PER_FRAME && this.accumulator >= FIXED_DT) this.accumulator = 0;
      this.render(this.accumulator / FIXED_DT);
    } finally {
      if (this.running) this.frameId = this.requestFrame(this.frame);
    }
  }
}
