import { GRID, GRID_CELLS, FREEZE, BLUSH, COLORS, BALL_LOOK, SNOWBALL } from '../config';
import { mixColor, setCell } from '../utils/color';
import { ballRadius } from './SnowWorld';

const { WIDTH, HEIGHT } = GRID;

/** Multiplies the video by a cold blue color. */
function applyColdTint(ctx, canvas, freeze) {
  if (freeze <= 0.01) return;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${255 - FREEZE.TINT_RED * freeze}, ${255 - FREEZE.TINT_GREEN * freeze}, 255)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';
}

/** Icy pixels creeping in from the frame edges. */
function paintFrost(pixels, world) {
  if (world.freeze <= 0.02) return;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      const edgeDistance = Math.min(x, WIDTH - 1 - x, y, HEIGHT - 1 - y);
      const thickness = world.freeze * (FREEZE.FROST_BASE_WIDTH + FREEZE.FROST_NOISE_WIDTH * world.noise[i]);
      if (edgeDistance >= thickness) continue;
      const color = [COLORS.FROST_RED_BASE + COLORS.FROST_RED_NOISE * world.noise[i], COLORS.FROST_GREEN, COLORS.FROST_BLUE];
      setCell(pixels, i, color, Math.min(255, FREEZE.FROST_ALPHA_MIN + FREEZE.FROST_ALPHA_RANGE * (1 - edgeDistance / thickness)));
    }
  }
}

/** Soft pink pixel-oval on each cheek, stronger when it is colder. */
function paintBlush(pixels, cheeks, freeze) {
  if (!cheeks || freeze <= BLUSH.MIN_FREEZE) return;
  const { radius } = cheeks;
  for (const cheek of cheeks.points) {
    for (let y = Math.max(0, Math.floor(cheek.y - radius)); y <= Math.min(HEIGHT - 1, Math.ceil(cheek.y + radius)); y++) {
      for (let x = Math.max(0, Math.floor(cheek.x - radius * BLUSH.STRETCH_X)); x <= Math.min(WIDTH - 1, Math.ceil(cheek.x + radius * BLUSH.STRETCH_X)); x++) {
        const distance = Math.hypot((x - cheek.x) / BLUSH.STRETCH_X, y - cheek.y);
        if (distance >= radius) continue;
        const strength = Math.ceil((1 - distance / radius) * BLUSH.LEVELS) / BLUSH.LEVELS; // stepped for the pixel look
        const i = y * WIDTH + x;
        setCell(pixels, i, COLORS.BLUSH, Math.max(pixels[i * 4 + 3], strength * freeze * BLUSH.MAX_ALPHA));
      }
    }
  }
}

/** Settled snow: bright top layer, slightly blue body (bluer when frozen). */
function paintSnow(pixels, world) {
  const bodyColor = mixColor(COLORS.SNOW_BODY, COLORS.SNOW_BODY_FROZEN, world.freeze);
  for (let i = 0; i < GRID_CELLS; i++) {
    if (!world.snow[i]) continue;
    const isTopLayer = i < WIDTH || !world.snow[i - WIDTH];
    setCell(pixels, i, isTopLayer ? COLORS.SNOW_TOP : bodyColor);
  }
}

function paintFlakes(pixels, flakes) {
  for (const flake of flakes) {
    const y = Math.floor(flake.y);
    if (y < 0 || y >= HEIGHT) continue;
    setCell(pixels, y * WIDTH + Math.floor(flake.x), COLORS.FLAKE, COLORS.FLAKE_ALPHA);
  }
}

/** Color of one ball pixel: outline, shadow (bottom-right), highlight (top-left) or body. */
function ballColor(dx, dy, distance, radius) {
  if (distance > radius - BALL_LOOK.OUTLINE_WIDTH) return COLORS.BALL_OUTLINE;
  if (dx + dy > radius * BALL_LOOK.SHADOW_FROM) return COLORS.BALL_SHADOW;
  if (dx + dy < radius * BALL_LOOK.HIGHLIGHT_UNTIL) return COLORS.BALL_HIGHLIGHT;
  return COLORS.BALL_BODY;
}

function paintBall(pixels, cx, cy, radius) {
  for (let y = Math.max(0, Math.floor(cy - radius - 1)); y <= Math.min(HEIGHT - 1, Math.ceil(cy + radius + 1)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius - 1)); x <= Math.min(WIDTH - 1, Math.ceil(cx + radius + 1)); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.hypot(dx, dy);
      if (distance <= radius) setCell(pixels, y * WIDTH + x, ballColor(dx, dy, distance, radius));
    }
  }
}

function paintBalls(pixels, world) {
  const held = world.heldBall;
  if (held && held.mass >= SNOWBALL.MIN_MASS) paintBall(pixels, held.x, held.y, ballRadius(held.mass));
  for (const ball of world.thrownBalls) paintBall(pixels, ball.x, ball.y, ball.radius);
}

/**
 * Draws video + pixel layer onto the canvas.
 * Layer order: frost, blush, snow, flakes, balls.
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const pixelLayer = document.createElement('canvas');
  pixelLayer.width = WIDTH;
  pixelLayer.height = HEIGHT;
  const pixelCtx = pixelLayer.getContext('2d');
  const image = pixelCtx.createImageData(WIDTH, HEIGHT);

  return {
    draw(video, world, cheeks) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      applyColdTint(ctx, canvas, world.freeze);

      image.data.fill(0);
      paintFrost(image.data, world);
      paintBlush(image.data, cheeks, world.freeze);
      paintSnow(image.data, world);
      paintFlakes(image.data, world.flakes);
      paintBalls(image.data, world);
      pixelCtx.putImageData(image, 0, 0);

      ctx.imageSmoothingEnabled = false; // keeps the pixels crisp when scaled up
      ctx.drawImage(pixelLayer, 0, 0, canvas.width, canvas.height);
    },
  };
}
