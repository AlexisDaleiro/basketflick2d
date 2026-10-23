export const WORLD_WIDTH = 1080; // u
export const WORLD_HEIGHT = 1600; // u
export const FIXED_DT = 1 / 240; // s
export const MAX_STEPS_PER_FRAME = 10; // steps/frame
export const MS_PER_SECOND = 1000; // ms/s
export const MAX_DPR = 2; // device pixels/CSS px
export const IDLE_WARNING_MS = 30000; // ms
export const IDLE_TIMEOUT_MS = 35000; // ms
export const IDLE_POLL_MS = 200; // ms
export const EMULATED_MOUSE_DELAY_MS = 800; // ms
export const MOUSE_BUTTON_PRIMARY = 0; // button index
export const WORLD_BORDER_WIDTH = 4; // u
export const HEARTBEAT_Y = 1520; // u
export const HEARTBEAT_MARGIN = 80; // u
export const HEARTBEAT_PERIOD = 4; // s
export const HEARTBEAT_WIDTH = 120; // u
export const HEARTBEAT_HEIGHT = 10; // u
export const STATES = Object.freeze({
  ATTRACT_MODE: 'ATTRACT_MODE',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
  ADMIN_PANEL: 'ADMIN_PANEL',
});
export const TRANSITIONS = Object.freeze({
  ATTRACT_MODE: Object.freeze([STATES.PLAYING, STATES.ADMIN_PANEL]),
  PLAYING: Object.freeze([STATES.GAME_OVER, STATES.ATTRACT_MODE, STATES.ADMIN_PANEL]),
  GAME_OVER: Object.freeze([STATES.PLAYING, STATES.ATTRACT_MODE, STATES.ADMIN_PANEL]),
  ADMIN_PANEL: Object.freeze([STATES.ATTRACT_MODE]),
});
