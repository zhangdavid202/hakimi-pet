import { Vec2 } from './types';

export interface LookAtResult {
  readonly yaw: number;
  readonly pitch: number;
  readonly eyeX: number;
  readonly eyeY: number;
}

const MAX_YAW_RAD = 0.52;
const MAX_PITCH_RAD = 0.34;
const LOOK_RANGE_PX = 480;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Compute clamped 3D head yaw/pitch radians and normalized eye pupil offsets [-1, 1]
 * from global screen cursor coordinates relative to the pet's screen center.
 */
export function computeLookAtAngles(
  cursor: Vec2,
  petCenter: Vec2,
  facingRight: boolean,
): LookAtResult {
  const dx = cursor.x - petCenter.x;
  const dy = cursor.y - petCenter.y;

  const normX = clamp(dx / LOOK_RANGE_PX, -1, 1);
  const normY = clamp(dy / LOOK_RANGE_PX, -1, 1);

  // When facingRight is true the 3D root is rotated by PI or flipped; keep local head yaw intuitive
  const localNormX = facingRight ? -normX : normX;

  return {
    yaw: localNormX * MAX_YAW_RAD,
    pitch: normY * MAX_PITCH_RAD,
    eyeX: localNormX,
    eyeY: -normY,
  };
}

/**
 * Frame-rate-independent exponential angle damping.
 */
export function dampAngle(
  current: number,
  target: number,
  lambda: number,
  dt: number,
): number {
  const safeDt = Math.max(0, dt);
  const safeLambda = Math.max(0, lambda);
  const alpha = 1 - Math.exp(-safeLambda * safeDt);
  return current + (target - current) * alpha;
}

/**
 * Compute phase-delayed wave rotations for a segmented 3D cat tail.
 */
export function computeTailWave(
  segmentIndex: number,
  timeSec: number,
  moodEnergy: number,
): { readonly rotY: number; readonly rotZ: number } {
  const energy = clamp(moodEnergy, 0.2, 2.5);
  const phase = timeSec * (2.6 * energy) - segmentIndex * 0.55;
  const amp = 0.14 + segmentIndex * 0.035;
  return {
    rotY: Math.sin(phase) * amp * energy,
    rotZ: Math.cos(phase * 0.7) * (amp * 0.45),
  };
}
