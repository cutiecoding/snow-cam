import { GRID, HAND_LANDMARK, SHAKE_OFF } from '../config';

/**
 * Turns raw hand landmarks into two things:
 *  - palm: position/velocity of a single hand (used for the snowball)
 *  - shakeDetected: true when two hands wave fast near the head
 */
export class HandTracker {
  constructor() {
    this.previousPalm = null;
    this.previousPair = null;
    this.shakeStreak = 0;
  }

  update(hands) {
    if (hands.length === 2) {
      this.previousPalm = null;
      return { palm: null, shakeDetected: this.trackTwoHands(hands) };
    }
    this.previousPair = null;
    this.shakeStreak = 0;
    return { palm: hands.length === 1 ? this.trackOneHand(hands[0]) : this.forgetPalm(), shakeDetected: false };
  }

  forgetPalm() {
    this.previousPalm = null;
    return null;
  }

  trackOneHand(landmarks) {
    const base = landmarks[HAND_LANDMARK.MIDDLE_FINGER_BASE];
    const x = base.x * GRID.WIDTH;
    const y = base.y * GRID.HEIGHT;
    const vx = this.previousPalm ? x - this.previousPalm.x : 0;
    const vy = this.previousPalm ? y - this.previousPalm.y : 0;
    const speed = Math.hypot(vx, vy) / GRID.WIDTH; // in frame widths per detection
    this.previousPalm = { x, y };
    return { x, y, vx, vy, speed };
  }

  trackTwoHands(hands) {
    const pair = hands
      .map((landmarks) => landmarks[HAND_LANDMARK.MIDDLE_FINGER_BASE])
      .sort((a, b) => a.x - b.x); // keep left/right order stable between frames

    let speed = 0;
    if (this.previousPair) {
      const moved = pair.map((p, i) => Math.hypot(p.x - this.previousPair[i].x, p.y - this.previousPair[i].y));
      speed = (moved[0] + moved[1]) / 2;
    }
    this.previousPair = pair;

    const handsAreHigh = pair.every((p) => p.y < SHAKE_OFF.MAX_HAND_Y);
    this.shakeStreak = speed > SHAKE_OFF.MIN_HAND_SPEED && handsAreHigh ? this.shakeStreak + 1 : Math.max(0, this.shakeStreak - 1);

    if (this.shakeStreak >= SHAKE_OFF.REQUIRED_DETECTIONS) {
      this.shakeStreak = 0;
      return true;
    }
    return false;
  }
}
