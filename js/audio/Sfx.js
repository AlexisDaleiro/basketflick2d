import * as C from '../config/constants.js';

/** Web Audio synthesis; nodes are created only on gestures and sound events. */
export class Sfx {
  /** @param {{createContext?:()=>AudioContext|null}} [options] */
  constructor({ createContext = () => {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    return Context ? new Context() : null;
  } } = {}) {
    this.createContext = createContext;
    this.context = null; this.master = null; this.noise = null;
    this.voices = []; this.enabled = true; this.unavailable = false;
    this.controller = null; this.destroyed = false;
    this.unlock = this.unlock.bind(this);
  }

  /** @param {EventTarget} target @returns {void} */
  attach(target) {
    if (this.controller) return;
    this.controller = new AbortController();
    for (const type of ['pointerdown', 'touchstart', 'keydown']) {
      target.addEventListener(type, this.unlock, { capture: true, passive: true, signal: this.controller.signal });
    }
  }

  /** Context creation/resume occurs in a user gesture. Unsupported APIs stay silent. @returns {Promise<void>} */
  async unlock() {
    if (this.destroyed || this.unavailable) return;
    try {
      if (!this.context) {
        const ctx = this.createContext();
        if (!ctx) { this.unavailable = true; return; }
        this.context = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = C.SFX_MASTER_VOLUME;
        this.master.connect(ctx.destination);
        this.noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * C.SFX_NOISE_DURATION), ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        for (let i = 0; i < C.SFX_MAX_VOICES; i++) {
          const slot = { source: null, filter: ctx.createBiquadFilter(), gain: ctx.createGain(), end: null };
          slot.filter.connect(slot.gain); slot.gain.connect(this.master);
          slot.end = event => {
            if (slot.source !== event.target) return;
            slot.source.disconnect(); slot.source = null;
          };
          this.voices.push(slot);
        }
      }
      if (this.enabled && this.context.state === 'suspended') await this.context.resume();
    } catch {
      // A denied resume can be retried on the next gesture; failed setup cannot.
      if (!this.context || this.voices.length !== C.SFX_MAX_VOICES) this.unavailable = true;
    }
  }

  /** @param {boolean} enabled @returns {void} */
  setEnabled(enabled) { this.enabled = enabled; if (!enabled) this.stop(); }

  /** Noise sweeps its filter, oscillators their pitch, toward endFrequency. @param {string} wave 'noise', 'sine', 'square', 'triangle' or 'sawtooth'. @param {number} frequency Hz. @param {number} duration s. @param {number} gain @param {number} [delay] s. @param {string} [filterType] @param {number} [filterFrequency] Hz. @param {number} [q] @param {number} [endFrequency] Hz. @param {number} [attack] s. @returns {boolean} */
  voice(wave, frequency, duration, gain, delay = 0, filterType = 'allpass', filterFrequency = frequency, q = C.SFX_BARK_Q, endFrequency = frequency, attack = C.SFX_ATTACK) {
    const ctx = this.context;
    if (this.unavailable || !this.enabled || !ctx || ctx.state !== 'running') return false;
    let slot = null;
    for (const candidate of this.voices) if (!candidate.source) { slot = candidate; break; }
    if (!slot) return false;
    let source = null;
    try {
      const start = ctx.currentTime + delay;
      source = wave === 'noise' ? ctx.createBufferSource() : ctx.createOscillator();
      if (wave === 'noise') { source.buffer = this.noise; source.loop = true; }
      else {
        source.type = wave; source.frequency.setValueAtTime(frequency, start);
        source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      }
      slot.filter.type = filterType; slot.filter.Q.value = q;
      slot.filter.frequency.cancelScheduledValues(ctx.currentTime); slot.filter.frequency.setValueAtTime(filterFrequency, start);
      if (wave === 'noise' && endFrequency !== frequency) slot.filter.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      slot.gain.gain.cancelScheduledValues(ctx.currentTime);
      slot.gain.gain.setValueAtTime(C.SFX_SILENCE, start);
      slot.gain.gain.linearRampToValueAtTime(gain, start + attack);
      slot.gain.gain.exponentialRampToValueAtTime(C.SFX_SILENCE, start + duration);
      source.connect(slot.filter); source.onended = slot.end; slot.source = source;
      source.start(start); source.stop(start + duration); return true;
    } catch {
      source?.disconnect(); slot.source = null; return false;
    }
  }

  /** @param {string} type @param {number} [value] Countdown index or impact intensity. @returns {void} */
  play(type, value = 0) {
    if (type === 'countdown' || type === 'tick') {
      this.voice('sine', type === 'countdown' && value === C.COUNTDOWN_STEPS - 1 ? C.SFX_GO_FREQUENCY : C.SFX_BEEP_FREQUENCY, C.SFX_BEEP_DURATION, C.SFX_NOTE_GAIN);
    } else if (type === 'buzzer') this.voice('sawtooth', C.SFX_BUZZER_FREQUENCY, C.SFX_BUZZER_DURATION, C.SFX_NOTE_GAIN);
    else if (type === 'swish') {
      // Mesh rush sweeping down as the ball drops, plus the crisp brush of the strings.
      this.voice('noise', C.SFX_SWISH_FREQUENCY, C.SFX_SWISH_DURATION, C.SFX_SWISH_GAIN, 0, 'bandpass', C.SFX_SWISH_FREQUENCY, C.SFX_SWISH_Q, C.SFX_SWISH_END_FREQUENCY, C.SFX_SWISH_ATTACK);
      this.voice('noise', C.SFX_BRUSH_FREQUENCY, C.SFX_BRUSH_DURATION, C.SFX_BRUSH_GAIN, C.SFX_BRUSH_DELAY, 'highpass', C.SFX_BRUSH_FREQUENCY);
    } else if (type === 'cheer') this.cheer(value);
    else if (type === 'sfx:floor') {
      const gain = Math.max(C.SFX_IMPACT_MIN_GAIN, Math.min(C.SFX_IMPACT_MAX_GAIN, value / C.SFX_FLOOR_REFERENCE));
      this.voice('sine', C.SFX_FLOOR_HIGH, C.SFX_FLOOR_DURATION, gain, 0, 'allpass', C.SFX_FLOOR_HIGH, C.SFX_BARK_Q, C.SFX_FLOOR_LOW);
      this.voice('noise', C.SFX_FLOOR_SLAP, C.SFX_FLOOR_SLAP_DURATION, gain / 2, 0, 'lowpass', C.SFX_FLOOR_SLAP);
    }
    else if (type === 'sfx:rim') {
      const gain = Math.max(C.SFX_IMPACT_MIN_GAIN, Math.min(C.SFX_IMPACT_MAX_GAIN, value / C.SFX_IMPACT_REFERENCE));
      this.voice('sine', C.SFX_RIM_LOW, C.SFX_RIM_DURATION, gain);
      this.voice('sine', C.SFX_RIM_HIGH, C.SFX_RIM_DURATION, gain);
    } else if (type === 'sfx:board') {
      const gain = Math.max(C.SFX_IMPACT_MIN_GAIN, Math.min(C.SFX_IMPACT_MAX_GAIN, value / C.SFX_IMPACT_REFERENCE));
      this.voice('noise', C.SFX_BOARD_FREQUENCY, C.SFX_BOARD_DURATION, gain, 0, 'lowpass', C.SFX_BOARD_FREQUENCY);
    } else if (type === 'fire') {
      this.voice('square', C.SFX_BARK_HIGH, C.SFX_BARK_DURATION, C.SFX_NOTE_GAIN, 0, 'bandpass', C.SFX_BARK_FILTER, C.SFX_BARK_Q, C.SFX_BARK_LOW);
      this.voice('square', C.SFX_BARK_HIGH, C.SFX_BARK_DURATION, C.SFX_NOTE_GAIN, C.SFX_BARK_GAP, 'bandpass', C.SFX_BARK_FILTER, C.SFX_BARK_Q, C.SFX_BARK_LOW);
    }
  }

  /** Pet crowd: a swelling roar, scattered cheers, two barks and a meow. @param {number} intensity 0..1.6. @returns {void} */
  cheer(intensity) {
    const level = Math.max(C.SFX_CHEER_MIN, Math.min(C.CROWD_MAX_LEVEL, intensity || 1));
    this.voice('noise', C.SFX_ROAR_FREQUENCY, C.SFX_ROAR_DURATION, C.SFX_ROAR_GAIN * level, 0, 'bandpass', C.SFX_ROAR_FREQUENCY, C.SFX_ROAR_Q, C.SFX_ROAR_END_FREQUENCY, C.SFX_ROAR_ATTACK);
    this.voice('noise', C.SFX_CLAP_FREQUENCY, C.SFX_CLAP_DURATION, C.SFX_CLAP_GAIN * level, 0, 'highpass', C.SFX_CLAP_FREQUENCY, C.SFX_BARK_Q, C.SFX_CLAP_FREQUENCY, C.SFX_CLAP_ATTACK);
    for (let i = 0; i < C.SFX_WOO_VOICES; i++) {
      const pitch = C.SFX_WOO_LOW + Math.random() * (C.SFX_WOO_HIGH - C.SFX_WOO_LOW);
      this.voice('sawtooth', pitch, C.SFX_WOO_DURATION + Math.random() * C.SFX_WOO_DURATION / 2, C.SFX_WOO_GAIN * level,
        C.SFX_WOO_DELAY * (i + 1), 'lowpass', C.SFX_WOO_FILTER, C.SFX_BARK_Q, pitch * C.SFX_WOO_RISE, C.SFX_WOO_ATTACK);
    }
    this.voice('square', C.SFX_BARK_HIGH, C.SFX_BARK_DURATION, C.SFX_NOTE_GAIN * level, C.SFX_CHEER_BARK_DELAY, 'bandpass', C.SFX_BARK_FILTER, C.SFX_BARK_Q, C.SFX_BARK_LOW);
    this.voice('square', C.SFX_BARK_HIGH * C.SFX_SECOND_BARK_PITCH, C.SFX_BARK_DURATION, C.SFX_NOTE_GAIN * level, C.SFX_CHEER_BARK_DELAY + C.SFX_BARK_GAP, 'bandpass', C.SFX_BARK_FILTER, C.SFX_BARK_Q, C.SFX_BARK_LOW);
    this.voice('sawtooth', C.SFX_MEOW_LOW, C.SFX_MEOW_RISE, C.SFX_MEOW_GAIN * level, C.SFX_MEOW_DELAY, 'bandpass', C.SFX_MEOW_FILTER, C.SFX_MEOW_Q, C.SFX_MEOW_HIGH);
    this.voice('sawtooth', C.SFX_MEOW_HIGH, C.SFX_MEOW_FALL, C.SFX_MEOW_GAIN * level, C.SFX_MEOW_DELAY + C.SFX_MEOW_RISE, 'bandpass', C.SFX_MEOW_FILTER, C.SFX_MEOW_Q, C.SFX_MEOW_END);
  }

  /** @returns {void} */
  stop() {
    for (const slot of this.voices) {
      if (!slot.source) continue;
      try { slot.source.stop(); } catch { /* The source may already have ended. */ }
      slot.source.disconnect(); slot.source = null;
    }
  }

  /** @returns {Promise<void>} */
  async pause() { this.stop(); try { await this.context?.suspend(); } catch { /* Optional capability. */ } }

  /** Resume an already unlocked context after a kiosk pause. @returns {Promise<void>} */
  async resume() { if (this.context && this.enabled) { try { await this.context.resume(); } catch { /* A new gesture can retry. */ } } }

  /** @returns {Promise<void>} */
  async destroy() {
    this.destroyed = true; this.controller?.abort(); this.controller = null; this.stop();
    try { await this.context?.close(); } catch { /* Already closed. */ }
  }
}
