import { GRID, GRID_CELLS, SNOW, SHAKE_OFF, MOTION_KNOCK_OFF, FREEZE, SNOWBALL } from '../config';
import { clamp, lerp, randomRange, wrap } from '../utils/math';

const { WIDTH, HEIGHT } = GRID;
const LAST_ROW = HEIGHT - 1;
const cellIndex = (x, y) => y * WIDTH + x;

/** Radius of a snowball with the given amount of snow. */
export function ballRadius(mass) {
  const { BASE, PER_SQRT_MASS, MAX } = SNOWBALL.RADIUS;
  return Math.min(MAX, Math.sqrt(mass) * PER_SQRT_MASS + BASE);
}

const createFlake = ({ x, y, speed, vx = 0, gravity = 0 }) => ({ x, y, speed, vx, gravity, phase: Math.random() * Math.PI * 2 });
const createThrownBall = (ball, vx, vy) => ({ x: ball.x, y: ball.y, vx, vy, mass: ball.mass, radius: ballRadius(ball.mass), age: 0 });

/**
 * The whole simulation, with no React and no drawing in it.
 * Grid cells: `snow[i] = 1` means settled snow, `person[i] = 1` means the silhouette.
 */
export class SnowWorld {
  constructor() {
    this.snow = new Uint8Array(GRID_CELLS);
    this.person = new Uint8Array(GRID_CELLS);
    this.noise = Float32Array.from({ length: GRID_CELLS }, () => Math.random()); // static per-cell noise for frost
    this.flakes = [];
    this.thrownBalls = [];
    this.heldBall = null;
    this.freeze = 0;     // 0..1
    this.coverage = 0;   // 1 = "full" snow
    this.frame = 0;
    this.spawnBudget = 0;
    this.shakeOffFramesLeft = 0;
  }

  // ---------- public API ----------

  setPersonMask(mask) {
    this.person.set(mask);
  }

  /** Makes all settled snow fall down and disappear. */
  shakeOff() {
    if (!this.isShakingOff()) this.shakeOffFramesLeft = SHAKE_OFF.DURATION_FRAMES;
  }

  isShakingOff() {
    return this.shakeOffFramesLeft > 0;
  }

  /** Throws the held snowball in the direction of the palm velocity. */
  throwHeldBall(palm) {
    if (!this.heldBall || this.heldBall.mass < SNOWBALL.MIN_MASS) return;
    const { THROW_VELOCITY_SCALE: scale, MAX_THROW_VX, MAX_THROW_VY, THROW_LIFT } = SNOWBALL;
    const vx = clamp(palm.vx * scale, -MAX_THROW_VX, MAX_THROW_VX);
    const vy = clamp(palm.vy * scale, -MAX_THROW_VY, MAX_THROW_VY) - THROW_LIFT;
    this.thrownBalls.push(createThrownBall(this.heldBall, vx, vy));
    this.heldBall = null;
  }

  /** Advances the world by one frame. `hand` is the palm or null. */
  update({ motion, hand }) {
    this.frame++;
    this.updateThrownBalls();
    this.updateHeldBall(hand);
    if (this.isShakingOff()) {
      this.updateShakeOff();
    } else {
      this.spawnFlakes();
      this.updateFlakes();
      this.settleSnow(motion);
    }
    this.updateFreeze();
  }

  // ---------- falling snow ----------

  spawnFlakes() {
    this.spawnBudget += SNOW.SPAWN_PER_FRAME;
    while (this.spawnBudget >= 1) {
      this.flakes.push(createFlake({ x: Math.random() * WIDTH, y: 0, speed: SNOW.FALL_SPEED_MIN + Math.random() * SNOW.FALL_SPEED_RANGE }));
      this.spawnBudget--;
    }
  }

  updateFlakes() {
    const { SPLAT } = SNOWBALL;
    for (let k = this.flakes.length - 1; k >= 0; k--) {
      const flake = this.flakes[k];
      if (flake.gravity) flake.speed = Math.min(flake.speed + flake.gravity, SPLAT.MAX_FALL_SPEED);
      flake.y += flake.speed;
      flake.x = wrap(flake.x + Math.sin(this.frame * SNOW.SWAY_FREQUENCY + flake.phase) * SNOW.SWAY_AMPLITUDE + flake.vx, WIDTH);
      flake.vx *= SPLAT.SIDE_DRAG;

      const cx = Math.floor(flake.x);
      const cy = Math.floor(flake.y);
      if (cy < 0) continue; // still above the screen after a splat
      if (this.hasLanded(cx, cy)) {
        this.landFlake(cx, cy);
        this.flakes.splice(k, 1);
      }
    }
  }

  hasLanded(cx, cy) {
    if (cy >= LAST_ROW) return true;
    return Boolean(this.person[cellIndex(cx, cy)] || this.snow[cellIndex(cx, cy + 1)] || this.person[cellIndex(cx, cy + 1)]);
  }

  landFlake(cx, cy) {
    const i = cellIndex(cx, Math.min(cy, LAST_ROW));
    if (!this.snow[i] && !this.person[i]) this.snow[i] = 1;
  }

  // ---------- settled snow ----------

  /** Gravity, sliding and being knocked off by movement. Processes bottom to top. */
  settleSnow(motion) {
    const { THRESHOLD, DIVISOR, MAX_CHANCE } = MOTION_KNOCK_OFF;
    const knockOffChance = clamp((motion - THRESHOLD) / DIVISOR, 0, MAX_CHANCE);

    for (let y = HEIGHT - 2; y >= 0; y--) {
      for (let x = 0; x < WIDTH; x++) {
        const i = cellIndex(x, y);
        if (!this.snow[i]) continue;
        const below = i + WIDTH;

        if (this.person[i]) this.pushUp(i);                                 // the silhouette moved into this snow
        else if (this.person[below]) this.maybeKnockOff(x, y, i, knockOffChance); // resting on the person
        else if (!this.snow[below]) this.moveSnow(i, below);                // free fall
        else this.trySlide(x, i, below);                                    // resting on other snow
      }
    }
  }

  moveSnow(from, to) {
    this.snow[from] = 0;
    this.snow[to] = 1;
  }

  pushUp(i) {
    const above = i - WIDTH;
    if (i >= WIDTH && !this.person[above] && !this.snow[above]) this.snow[above] = 1;
    this.snow[i] = 0;
  }

  maybeKnockOff(x, y, i, chance) {
    if (Math.random() >= chance) return;
    this.snow[i] = 0;
    this.flakes.push(createFlake({ x, y, speed: 0.5 }));
  }

  trySlide(x, i, below) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    if (x + dir < 0 || x + dir >= WIDTH || Math.random() >= SNOW.SLIDE_CHANCE) return;
    const sideFree = !this.snow[i + dir] && !this.person[i + dir];
    const diagonalFree = !this.snow[below + dir] && !this.person[below + dir];
    if (sideFree && diagonalFree) this.moveSnow(i, below + dir);
  }

  updateShakeOff() {
    this.shakeOffFramesLeft--;
    this.snow.fill(0, LAST_ROW * WIDTH); // bottom row falls out of the frame
    for (let y = HEIGHT - 2; y >= 0; y--) {
      for (let x = 0; x < WIDTH; x++) {
        const i = cellIndex(x, y);
        if (this.snow[i] && !this.snow[i + WIDTH] && Math.random() < SHAKE_OFF.FALL_CHANCE) this.moveSnow(i, i + WIDTH);
      }
    }
    this.flakes.length = 0;
  }

  // ---------- snowball ----------

  /** Collects snow from around the palm while the hand stays still, and keeps the ball on the palm. */
  updateHeldBall(hand) {
    if (hand && hand.speed < SNOWBALL.HAND_STILL_SPEED) this.collectSnow(hand);
    const ball = this.heldBall;
    if (!ball) return;

    const radius = ballRadius(ball.mass);
    let target = ball;
    if (hand) {
      ball.lostFrames = 0;
      target = { x: hand.x, y: hand.y - radius * SNOWBALL.HOLD_OFFSET_RADIUS_FACTOR - SNOWBALL.HOLD_OFFSET_CELLS };
    } else if (++ball.lostFrames > SNOWBALL.LOST_HAND_FRAMES) {
      if (ball.mass >= SNOWBALL.MIN_MASS) this.thrownBalls.push(createThrownBall(ball, 0, 0)); // hand vanished: drop it
      this.heldBall = null;
      return;
    }
    ball.x = lerp(ball.x, target.x, SNOWBALL.HOLD_FOLLOW_EASING);
    ball.y = lerp(ball.y, target.y, SNOWBALL.HOLD_FOLLOW_EASING);
  }

  collectSnow(hand) {
    const { LEFT, RIGHT, UP, DOWN } = SNOWBALL.COLLECT_BOX;
    const cx = Math.floor(hand.x);
    const cy = Math.floor(hand.y);
    let collected = 0;

    for (let y = Math.max(0, cy - UP); y < Math.min(LAST_ROW, cy + DOWN) && collected < SNOWBALL.ABSORB_PER_FRAME; y++) {
      for (let x = Math.max(0, cx - LEFT); x < Math.min(WIDTH, cx + RIGHT + 1) && collected < SNOWBALL.ABSORB_PER_FRAME; x++) {
        const i = cellIndex(x, y);
        if (this.snow[i]) {
          this.snow[i] = 0;
          collected++;
        }
      }
    }
    if (!collected) return;
    this.heldBall ??= { x: cx, y: cy, mass: 0, lostFrames: 0 };
    this.heldBall.mass = Math.min(SNOWBALL.MAX_MASS, this.heldBall.mass + collected);
  }

  updateThrownBalls() {
    for (let k = this.thrownBalls.length - 1; k >= 0; k--) {
      const ball = this.thrownBalls[k];
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vy += SNOWBALL.GRAVITY;
      ball.radius *= SNOWBALL.SHRINK_PER_FRAME;
      ball.age++;

      if (ball.y < SNOWBALL.OFFSCREEN_TOP) {
        this.thrownBalls.splice(k, 1);
      } else if (this.ballHitSomething(ball)) {
        this.splat(ball);
        this.thrownBalls.splice(k, 1);
      }
    }
  }

  ballHitSomething(ball) {
    const cx = Math.floor(ball.x);
    const cy = Math.floor(ball.y);
    const hitEdge = ball.x < 0 || ball.x >= WIDTH || cy >= LAST_ROW;
    const tooSmall = ball.radius < SNOWBALL.RADIUS.MIN_ALIVE;
    const hitPerson = ball.age > SNOWBALL.SELF_HIT_GRACE_FRAMES && cy >= 0 && Boolean(this.person[cellIndex(cx, cy)]);
    return hitEdge || tooSmall || hitPerson;
  }

  /** A ball bursts into flakes that fly out and fall back down. */
  splat(ball) {
    const { SPLAT } = SNOWBALL;
    const count = Math.min(SPLAT.MAX_FLAKES, Math.floor(ball.mass * SPLAT.FLAKES_PER_MASS));
    for (let k = 0; k < count; k++) {
      this.flakes.push(createFlake({
        x: clamp(ball.x, 0, WIDTH - 1),
        y: clamp(ball.y, 0, HEIGHT - 3),
        speed: randomRange(SPLAT.LIFT_MIN, SPLAT.LIFT_MAX),
        vx: randomRange(-SPLAT.SPREAD_X, SPLAT.SPREAD_X),
        gravity: SPLAT.GRAVITY,
      }));
    }
  }

  // ---------- freeze ----------

  updateFreeze() {
    let count = 0;
    for (let i = 0; i < GRID_CELLS; i++) count += this.snow[i];
    this.coverage = count / (GRID_CELLS * SNOW.FULL_COVERAGE);
    const target = clamp((this.coverage - FREEZE.START_AT) / (1 - FREEZE.START_AT), 0, 1);
    this.freeze += (target - this.freeze) * FREEZE.EASING;
  }
}
