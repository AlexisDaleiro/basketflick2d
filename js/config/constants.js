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
export const BALL_RADIUS = 46; // u
export const SPAWN_X = 360; // u, first ball
export const SPAWN_Y = 1380; // u
export const SPAWN_X_RANGE = Object.freeze([200, 520]); // u
export const FLOOR_Y = 1540; // u
export const RIM_Y = 560; // u
export const RIM_FRONT_TIP = Object.freeze({ x: 702, y: RIM_Y }); // u
export const RIM_BACK_TIP = Object.freeze({ x: 898, y: RIM_Y }); // u
export const RIM_TIP_RADIUS = 9; // u
export const BOARD_AABB = Object.freeze({ minX: 906, maxX: 924, minY: 340, maxY: 600 }); // u
export const NET_DEPTH = 120; // u
export const NET_BOTTOM_RATIO = 0.6; // ratio
export const GATE_B_OFFSET = 70; // u
export const GATE_B_Y = RIM_Y + GATE_B_OFFSET; // u
export const GRAB_RADIUS = 2.6 * BALL_RADIUS; // u
export const FLICK_BUFFER_SIZE = 32; // samples
export const VELOCITY_WINDOW_MS = 80; // ms
export const MIN_SWIPE_DT = 0.016; // s
export const MIN_SWIPE_DIST = 60; // u
export const MIN_FLICK_SPEED = 600; // u/s
export const MAX_GESTURE_MS = 1200; // ms
export const GAIN = 0.90; // launch/swipe velocity ratio
export const DEFAULT_SENSITIVITY = 1; // multiplier
export const DEFAULT_AIM_ASSIST = 0.15; // ratio
export const V_MIN = 1400; // u/s
export const V_MAX = 3400; // u/s
export const DEG_TO_RAD = Math.PI / 180; // rad/degree
export const MIN_LAUNCH_ANGLE = 20 * DEG_TO_RAD; // rad
export const MAX_LAUNCH_ANGLE = 160 * DEG_TO_RAD; // rad
export const G = 2600; // u/s²
export const K_AIR = 0.12; // s⁻¹
export const CONTACT_EPSILON = 1e-8; // u
export const RIM_RESTITUTION = 0.55; // ratio
export const RIM_FRICTION = 0.12; // ratio
export const BOARD_RESTITUTION = 0.62; // ratio
export const BOARD_FRICTION = 0.10; // ratio
export const FLOOR_RESTITUTION = 0.55; // ratio
export const FLOOR_FRICTION = 0.20; // ratio
export const CONTACT_COOLDOWN_MS = 60; // ms per ball
export const GATE_TIMEOUT_MS = 600; // ms
export const SHOT_TIMEOUT_MS = 4000; // ms
export const DEAD_FADE_MS = 600; // ms
export const WORLD_MIN_X = -120; // u
export const WORLD_MAX_X = 1200; // u
export const BALL_POOL_SIZE = 6; // balls
export const HOOP_MOTION_AMPLITUDE = 70; // u
export const HOOP_MOTION_PERIOD = 3.2; // s
export const NORMAL_POINTS = 2; // points
export const SWISH_POINTS = 3; // points
export const DEBUG_REFRESH_MS = 200; // ms
export const DEBUG_PREDICTION_DT = 1 / 30; // s
export const DEBUG_PREDICTION_POINTS = 121; // points (4 s)
export const DEBUG_LINE_WIDTH = 3; // u
export const DEBUG_POINT_RADIUS = 4; // u
export const DEBUG_FONT_SIZE = 20; // u
export const LAB_LINE_WIDTH = 8; // u
export const LAB_BALL_SEAM_WIDTH = 5; // u
export const LAB_READY_RING_WIDTH = 3; // u
export const LAB_NET_STRANDS = 6; // strands
export const DEBUG_LABEL_MARGIN = 16; // u
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
