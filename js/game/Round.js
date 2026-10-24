import * as C from '../config/constants.js';
import { FlickTracker } from '../input/FlickTracker.js';
import { FrontalWorld } from '../physics/FrontalWorld.js';
import { calculateFrontalLaunch, predictFrontalTrajectory } from '../input/frontalLaunch.js';
import { Vec2 } from '../physics/Vec2.js';

const STEP_MS = C.FIXED_DT * C.MS_PER_SECOND;
const COUNTDOWN_TICKS = Math.round(C.COUNTDOWN_STEP_MS / STEP_MS);
const RESPAWN_TICKS = Math.round(C.RESPAWN_DELAY_MS / STEP_MS);
const BUZZER_MIN_TICKS = Math.round(C.BUZZER_MIN_MS / STEP_MS);
const BUZZER_MAX_TICKS = Math.round(C.BUZZER_MAX_MS / STEP_MS);

/** Pure fixed-step round controller. All mutable hot-loop objects are preallocated. */
export class Round {
  /** @param {{debug?:boolean,random?:()=>number,onEvent?:(event:any)=>void}} [options] */
  constructor({ debug = false, random = Math.random, onEvent = null } = {}) {
    this.random = random;
    this.onEvent = onEvent;
    this.event = { type: '', value: 0, ball: null };
    this.settings = { roundDurationSec: C.ROUND_DURATION_SEC, sensitivity: C.DEFAULT_SENSITIVITY,
      aimAssist: C.DEFAULT_AIM_ASSIST, movingHoop: false, soundEnabled: true };
    this.world = new FrontalWorld({ onContact: event => this.emit(event.type, event.intensity, event.ball),
      onResolve: ball => this.resolveShot(ball) });
    this.tracker = new FlickTracker({ calculateLaunch: calculateFrontalLaunch });
    this.predictionPoint = new Vec2();
    this.prediction = debug ? new Float64Array(C.DEBUG_PREDICTION_POINTS * 2) : null;
    this.predictionCount = 0;
    this.result = { score: 0, shots: 0, baskets: 0, swishes: 0, bestStreak: 0, durationSec: 0, precision: 0 };
    this.phase = 'inactive';
    this.readyBall = null;
    this.inFlight = 0;
    this.score = 0;
    this.shots = 0;
    this.baskets = 0;
    this.swishes = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.remainingSec = C.ROUND_DURATION_SEC;
    this.tick = 0;
    this.phaseTicks = 0;
    this.liveTicks = 0;
    this.buzzerTicks = 0;
    this.countdownIndex = 0;
    this.nextSpawnTick = Infinity;
  }

  /** The event is reused; listeners must consume it synchronously. @param {string} type @param {number} [value] @param {import('./Ball.js').Ball|null} [ball] @returns {void} */
  emit(type, value = 0, ball = null) {
    this.event.type = type; this.event.value = value; this.event.ball = ball;
    this.onEvent?.(this.event);
  }

  /** Start a fresh countdown; settings changes apply between rounds. @param {Partial<Round['settings']>} [settings] @returns {void} */
  reset(settings = {}) {
    Object.assign(this.settings, settings);
    this.practice = Boolean(settings.practice);
    if (this.practice) this.settings.roundDurationSec = C.PRACTICE_DURATION_SEC;
    else if (!C.ROUND_DURATIONS.includes(this.settings.roundDurationSec)) this.settings.roundDurationSec = C.ROUND_DURATION_SEC;
    this.clear();
    this.phase = 'countdown';
    this.score = 0; this.shots = 0; this.baskets = 0; this.swishes = 0;
    this.streak = 0; this.bestStreak = 0;
    this.tick = 0; this.phaseTicks = 0; this.liveTicks = 0; this.buzzerTicks = 0;
    this.countdownIndex = 0;
    this.remainingSec = this.settings.roundDurationSec;
    this.spawn(C.FRONTAL_CENTER_X);
    this.emit('countdown', 0);
  }

  /** Abort without a result or completion event. @returns {void} */
  clear() {
    this.phase = 'inactive';
    this.world.reset(); this.tracker.cancel();
    this.readyBall = null; this.inFlight = 0;
    this.nextSpawnTick = Infinity; this.predictionCount = 0;
  }

  /** @param {number} x u. @returns {void} */
  spawn(x) {
    const ball = this.world.spawn(x, C.SPAWN_Y);
    if (!ball) return;
    ball.spawnedAt = this.world.timeMs;
    this.readyBall = ball;
    this.nextSpawnTick = Infinity;
    this.emit('spawn', 0, ball);
  }

  /** Advance exactly one physics tick. @returns {void} */
  step() {
    if (this.phase === 'inactive' || this.phase === 'complete') return;
    this.tick++;
    if (this.phase === 'countdown') {
      this.phaseTicks++;
      if (this.phaseTicks >= COUNTDOWN_TICKS) {
        this.phaseTicks = 0;
        this.countdownIndex++;
        if (this.countdownIndex === C.COUNTDOWN_STEPS) { this.phase = 'live'; this.emit('live'); }
        else this.emit('countdown', this.countdownIndex);
      }
    } else if (this.phase === 'live') {
      this.liveTicks++;
      const totalTicks = Math.round(this.settings.roundDurationSec / C.FIXED_DT);
      const seconds = Math.ceil((totalTicks - this.liveTicks) * C.FIXED_DT);
      if (seconds !== this.remainingSec) {
        this.remainingSec = seconds;
        if (seconds > 0 && seconds <= C.CRITICAL_TIME_SEC) this.emit('tick', seconds);
      }
      if (this.liveTicks >= totalTicks) this.beginBuzzer();
    } else this.buzzerTicks++;

    const movingStart = (this.settings.roundDurationSec - C.MOVING_HOOP_LAST_SEC) / C.FIXED_DT;
    this.world.movingHoop = this.settings.movingHoop && this.liveTicks >= movingStart;
    this.world.hoopTimeMs = Math.max(0, this.liveTicks + this.buzzerTicks - movingStart) * STEP_MS;
    this.world.step();
    if (this.phase === 'live' && !this.readyBall && this.tick >= this.nextSpawnTick
      && this.inFlight < C.MAX_BALLS_IN_FLIGHT) {
      this.spawn(C.FRONTAL_SPAWN_X_RANGE[0] + this.random() * (C.FRONTAL_SPAWN_X_RANGE[1] - C.FRONTAL_SPAWN_X_RANGE[0]));
    }
    if (this.phase === 'buzzer' && this.buzzerTicks >= BUZZER_MIN_TICKS
      && (this.inFlight === 0 || this.buzzerTicks >= BUZZER_MAX_TICKS)) this.finish();
  }

  /** @returns {void} */
  beginBuzzer() {
    this.phase = 'buzzer'; this.buzzerTicks = 0;
    this.tracker.cancel();
    if (this.readyBall) {
      this.readyBall.state = 'inactive'; this.readyBall.opacity = 0;
      this.world.activeCount--; this.readyBall = null;
    }
    this.nextSpawnTick = Infinity;
    this.emit('buzzer');
  }

  /** @param {{type:string,x:number,y:number,t:number}} event @returns {void} */
  onInput(event) {
    if (event.type === 'cancel') { this.tracker.cancel(); return; }
    if (this.phase !== 'live' || !this.readyBall) return;
    if (event.type === 'start') this.tracker.start(event.x, event.y, event.t, this.readyBall);
    else if (event.type === 'move') this.tracker.add(event.x, event.y, event.t);
    else if (event.type === 'end' && this.tracker.active) {
      const result = this.tracker.finish(event.x, event.y, event.t, this.settings);
      if (!result.valid) { this.emit('rejected'); return; }
      if (this.inFlight >= C.MAX_BALLS_IN_FLIGHT) return;
      if (this.prediction) this.predictionCount = predictFrontalTrajectory(this.readyBall.position, result.velocity, result.depthVelocity, this.prediction, this.predictionPoint);
      const ball = this.readyBall;
      ball.depthVelocity = result.depthVelocity;
      ball.launch(result.velocity, this.world.timeMs);
      this.readyBall = null; this.inFlight++; this.shots++;
      this.nextSpawnTick = this.tick + RESPAWN_TICKS;
      this.emit('launch', 0, ball);
    }
  }

  /** Count resolved shots in the order supplied by World. @param {import('./Ball.js').Ball} ball @returns {void} */
  resolveShot(ball) {
    this.inFlight--;
    if (ball.outcome === 'basket') {
      this.baskets++; if (ball.swish) this.swishes++;
      this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak);
      const points = ball.points + (this.streak >= C.FIRE_STREAK ? C.FIRE_BONUS : 0);
      this.score += points;
      this.emit('basket', points, ball);
      if (this.streak === C.FIRE_STREAK) this.emit('fire');
    } else {
      const wasFire = this.streak >= C.FIRE_STREAK;
      this.streak = 0;
      this.emit('miss', 0, ball);
      if (wasFire) this.emit('extinguish');
    }
  }

  /** Freeze the result before the UI exits and clears the world. @returns {void} */
  finish() {
    if (this.phase !== 'buzzer') return;
    for (const ball of this.world.balls) {
      if (ball.state === 'flying') {
        ball.outcome = 'timeout'; ball.shot.resolved = true; ball.state = 'dead';
        ball.resolvedAt = this.world.timeMs; this.resolveShot(ball);
      }
    }
    this.phase = 'complete';
    this.result.score = this.score; this.result.shots = this.shots;
    this.result.baskets = this.baskets; this.result.swishes = this.swishes;
    this.result.bestStreak = this.bestStreak; this.result.durationSec = this.settings.roundDurationSec;
    this.result.precision = this.shots ? Math.round(this.baskets / this.shots * 100) : 0;
    this.result.practice = this.practice;
    this.emit('complete');
  }
}
