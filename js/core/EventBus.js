/** Synchronous event bus; subscriptions return their own cleanup. */
export class EventBus {
  constructor() { this.listeners = new Map(); }

  /** @param {string} type @param {(payload: any) => void} listener @returns {() => void} */
  on(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    const listeners = this.listeners.get(type);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.listeners.delete(type);
    };
  }

  /** @param {string} type @param {any} payload @returns {void} */
  emit(type, payload) {
    const listeners = this.listeners.get(type);
    if (listeners) for (const listener of listeners) listener(payload);
  }
}
