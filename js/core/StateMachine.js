import { STATES, TRANSITIONS } from '../config/constants.js';

/** @typedef {{enter: (payload: any) => void, exit: () => void, update: (dt: number) => void, render: (ctx: CanvasRenderingContext2D) => void, onInput: (event: any) => void}} State */

export class StateMachine {
  /** @param {{states: Record<string, State>, bus: import('./EventBus.js').EventBus, development?: boolean}} options */
  constructor({ states, bus, development = false }) {
    if (Object.keys(states).length !== Object.keys(STATES).length
      || Object.values(STATES).some(name => !states[name])) {
      throw new Error('StateMachine requires exactly the four specified states.');
    }
    this.states = states;
    this.bus = bus;
    this.development = development;
    this.current = null;
  }

  /** @param {string} next @param {any} [payload] @returns {boolean} */
  transition(next, payload) {
    if (this.current === next) return false;
    const allowed = this.current === null ? next === STATES.ATTRACT_MODE
      : TRANSITIONS[this.current].includes(next);
    if (!this.states[next] || !allowed) {
      if (this.development) throw new Error(`Invalid state transition: ${this.current} -> ${next}`);
      return false;
    }
    const previous = this.current;
    if (previous !== null) this.states[previous].exit();
    this.current = next;
    this.states[next].enter(payload);
    this.bus.emit('state:change', { previous, current: next });
    return true;
  }

  /** @param {number} dt Seconds. @returns {void} */
  update(dt) { if (this.current) this.states[this.current].update(dt); }

  /** @param {CanvasRenderingContext2D} ctx @returns {void} */
  render(ctx) { if (this.current) this.states[this.current].render(ctx); }

  /** @param {any} event @returns {void} */
  onInput(event) { if (this.current) this.states[this.current].onInput(event); }

  /** Remove the current state's resources. @returns {void} */
  destroy() {
    if (this.current) this.states[this.current].exit();
    this.current = null;
  }
}
