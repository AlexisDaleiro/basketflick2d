import { DEBUG_PREDICTION_POINTS, DEFAULT_AIM_ASSIST, DEFAULT_SENSITIVITY, SPAWN_X, SPAWN_Y } from '../config/constants.js';
import { FlickTracker } from '../input/FlickTracker.js';
import { World } from '../physics/World.js';
import { predictTrajectory } from '../physics/predict.js';

/** H2 one-ball test harness; no timer, score accumulation, streak or round rules. */
export class PhysicsLab {
  /** @param {{debug?:boolean, onContact?: (event:any)=>void}} [options] */
  constructor({ debug = false, onContact = null } = {}) {
    this.debug = debug;
    this.world = new World({ onContact, onResolve: ball => {
      this.feedback = ball.outcome === 'basket' ? (ball.swish ? 'swish' : 'basket') : 'miss';
      this.revision++;
    } });
    this.tracker = new FlickTracker();
    this.settings = { sensitivity: DEFAULT_SENSITIVITY, aimAssist: DEFAULT_AIM_ASSIST };
    this.prediction = debug ? new Float64Array(DEBUG_PREDICTION_POINTS * 2) : null;
    this.predictionCount = 0;
    this.feedback = 'ready';
    this.revision = 0;
    this.ball = null;
  }

  /** @returns {void} */
  reset() {
    this.world.reset();
    this.tracker.cancel();
    this.ball = this.world.spawn(SPAWN_X, SPAWN_Y);
    this.predictionCount = 0;
    this.feedback = 'ready';
    this.revision++;
  }

  /** @returns {void} */
  clear() {
    this.tracker.cancel();
    this.world.reset();
    this.ball = null;
    this.predictionCount = 0;
  }

  /** @returns {void} */
  step() {
    this.world.step();
    if (this.ball?.state === 'inactive') {
      this.ball = this.world.spawn(SPAWN_X, SPAWN_Y);
      this.feedback = 'ready';
      this.revision++;
    }
  }

  /** @param {{type:string,x:number,y:number,t:number}} event @returns {void} */
  onInput(event) {
    if (!this.ball) return;
    if (event.type === 'start') {
      if (this.tracker.start(event.x, event.y, event.t, this.ball)) {
        this.feedback = 'aiming';
        this.revision++;
      }
    } else if (event.type === 'move') this.tracker.add(event.x, event.y, event.t);
    else if (event.type === 'cancel') {
      this.tracker.cancel();
      if (this.ball.state === 'ready') { this.feedback = 'ready'; this.revision++; }
    } else if (event.type === 'end' && this.tracker.active) {
      const result = this.tracker.finish(event.x, event.y, event.t, this.settings);
      if (result.valid) {
        if (this.debug) this.predictionCount = predictTrajectory(this.ball.position, result.velocity, this.prediction);
        this.ball.launch(result.velocity, this.world.timeMs);
        this.feedback = 'flying';
      } else this.feedback = 'rejected';
      this.revision++;
    }
  }
}
