// ---- Simulation grid (the chunky "pixel art" resolution) ----
export const GRID = { WIDTH: 256, HEIGHT: 144 };
export const GRID_CELLS = GRID.WIDTH * GRID.HEIGHT;

// ---- Camera ----
export const CAMERA = { WIDTH: 1280, HEIGHT: 720 };

// ---- Motion meter (frame differencing on a tiny copy of the video) ----
export const MOTION_SAMPLE = {
  WIDTH: 64,
  HEIGHT: 36,
  SMOOTHING: 0.8, // 0..1, higher = slower reaction
  LUMA: { R: 0.3, G: 0.59, B: 0.11 },
};

// ---- Falling snow ----
export const SNOW = {
  SPAWN_PER_FRAME: 2.8,  // flakes created each frame (higher = denser snowfall)
  FALL_SPEED_MIN: 0.6,   // cells per frame
  FALL_SPEED_RANGE: 0.7, // random extra speed added on top of the minimum
  SWAY_FREQUENCY: 0.03,
  SWAY_AMPLITUDE: 0.25,
  SLIDE_CHANCE: 0.35,    // chance a cell slides down the slope of a pile
  FULL_COVERAGE: 0.1,    // share of the frame that counts as "100% snow"
};

// ---- Big movement knocks snow off the silhouette ----
export const MOTION_KNOCK_OFF = {
  THRESHOLD: 3,    // motion level where snow starts to fall off
  DIVISOR: 70,     // higher = gentler
  MAX_CHANCE: 0.25 // per cell, per frame
};

// ---- Shaking the head off with both hands ----
export const SHAKE_OFF = {
  DURATION_FRAMES: 170,
  FALL_CHANCE: 0.8,         // chance a snow cell drops one row per frame
  MIN_HAND_SPEED: 0.03,     // per detection, in frame widths
  MAX_HAND_Y: 0.55,         // hands must be in the upper part of the frame (0 = top edge)
  REQUIRED_DETECTIONS: 5,   // consecutive fast detections needed
};

// ---- Freeze effect ----
export const FREEZE = {
  START_AT: 0.25,          // freezing starts at this share of "full" snow
  EASING: 0.02,            // how fast the effect fades in/out
  TINT_RED: 95,            // how much red is removed at full freeze
  TINT_GREEN: 45,          // how much green is removed at full freeze
  FROST_BASE_WIDTH: 6,     // frost thickness at the edges (cells)
  FROST_NOISE_WIDTH: 24,   // random extra thickness
  FROST_ALPHA_MIN: 90,
  FROST_ALPHA_RANGE: 200,
};

// ---- Pink cheeks that appear while freezing ----
export const BLUSH = {
  MIN_FREEZE: 0.05,
  RADIUS_FACTOR: 0.14,     // blush radius relative to face width
  STRETCH_X: 1.25,         // makes the blush slightly oval
  EYE_TO_MOUTH: 0.5,       // cheek position: how far from eye towards mouth
  EYE_TO_EAR: 0.15,        // ...and how far towards the ear
  SMOOTHING: 0.5,
  LEVELS: 4,               // alpha steps, keeps the pixel look
  MAX_ALPHA: 200,
  DEFAULT_FACE_WIDTH: 0.2, // used when the detector gives no bounding box
};

// ---- Snowball ----
export const SNOWBALL = {
  MIN_MASS: 20,                  // snow needed before the ball becomes visible/throwable
  MAX_MASS: 260,
  ABSORB_PER_FRAME: 5,           // cells collected from the hand each frame
  HAND_STILL_SPEED: 0.02,        // hand slower than this = "holding still"
  THROW_SPEED: 0.04,             // hand faster than this = throw
  THROW_VELOCITY_SCALE: 0.55,    // hand velocity -> ball velocity
  MAX_THROW_VX: 7,
  MAX_THROW_VY: 5,
  THROW_LIFT: 0.5,               // small upward nudge
  COLLECT_BOX: { LEFT: 15, RIGHT: 15, UP: 22, DOWN: 10 }, // cells around the palm
  HOLD_FOLLOW_EASING: 0.35,
  HOLD_OFFSET_RADIUS_FACTOR: 0.6,
  HOLD_OFFSET_CELLS: 4,
  LOST_HAND_FRAMES: 25,          // ball drops if the hand disappears this long
  RADIUS: { BASE: 0.5, PER_SQRT_MASS: 0.95, MAX: 15, MIN_ALIVE: 2 },
  GRAVITY: 0.1,
  SHRINK_PER_FRAME: 0.99,        // ball looks like it flies away from the camera
  SELF_HIT_GRACE_FRAMES: 14,     // ignore your own arm right after the throw
  OFFSCREEN_TOP: -80,            // balls above this are removed silently
  SPLAT: {
    MAX_FLAKES: 90,
    FLAKES_PER_MASS: 0.5,
    LIFT_MIN: -1.2,
    LIFT_MAX: 0.2,
    SPREAD_X: 1.3,
    SIDE_DRAG: 0.96,
    GRAVITY: 0.06,
    MAX_FALL_SPEED: 1,
  },
};

// ---- Colors (RGB) ----
export const COLORS = {
  SNOW_TOP: [255, 255, 255],
  SNOW_BODY: [225, 238, 255],
  SNOW_BODY_FROZEN: [190, 220, 255],
  FLAKE: [255, 255, 255],
  FLAKE_ALPHA: 235,
  FROST_RED_BASE: 195,
  FROST_RED_NOISE: 35,
  FROST_GREEN: 232,
  FROST_BLUE: 255,
  BLUSH: [255, 105, 150],
  BALL_OUTLINE: [130, 180, 235],
  BALL_SHADOW: [185, 212, 245],
  BALL_HIGHLIGHT: [255, 255, 255],
  BALL_BODY: [232, 243, 255],
};

// ---- Ball shading (pixel-art look) ----
export const BALL_LOOK = { OUTLINE_WIDTH: 1.2, SHADOW_FROM: 0.35, HIGHLIGHT_UNTIL: -0.5 };

// ---- MediaPipe indices and settings ----
export const HAND_LANDMARK = { MIDDLE_FINGER_BASE: 9 };
export const FACE_KEYPOINT = { RIGHT_EYE: 0, LEFT_EYE: 1, NOSE: 2, MOUTH: 3, RIGHT_EAR: 4, LEFT_EAR: 5 };
export const MASK_THRESHOLD = 128; // 0..255, above = "person"
export const MEDIAPIPE = {
  CDN: 'https://cdn.jsdelivr.net/npm/@mediapipe',
  VERSIONS: { selfie_segmentation: '0.1.1675465747', hands: '0.4.1675469240', face_detection: '0.4.1646425229' },
  MIN_CONFIDENCE: 0.5,
};

// ---- UI ----
export const HUD_REFRESH_MS = 250;
