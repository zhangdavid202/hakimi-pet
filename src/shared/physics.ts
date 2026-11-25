import {
  Bounds,
  DragSpringState,
  PhysicsConfig,
  PointerSample,
  ProjectileState,
  ProjectileStepResult,
  Vec2,
} from './types';

const BASE_SPRING_K = 260;
const BASE_SPRING_C = 32; // overdamped: C > 2*sqrt(K) = 32.2 -> use 34 for zero overshoot
const BASE_DAMPING = 34;
const MAX_THROW_SPEED = 3600;
const GENTLE_DROP_SPEED = 110;
const SETTLE_SPEED_EPS = 8;
const CATCH_MIN_SPEED = 400;
const REFERENCE_PET_SIZE = 462;

/**
 * Advance an overdamped drag spring toward the pointer target without overshoot.
 */
export function stepDragSpring(
  state: DragSpringState,
  target: Vec2,
  dt: number,
  throwPower: number,
): DragSpringState {
  const safeDt = Math.min(Math.max(dt, 0), 0.05);
  const power = Math.max(throwPower, 0.1);
  const k = BASE_SPRING_K * power;
  const c = BASE_DAMPING * Math.sqrt(power);

  const ax = k * (target.x - state.pos.x) - c * state.vel.x;
  const ay = k * (target.y - state.pos.y) - c * state.vel.y;

  const vx = state.vel.x + ax * safeDt;
  const vy = state.vel.y + ay * safeDt;

  return {
    pos: {
      x: state.pos.x + vx * safeDt,
      y: state.pos.y + vy * safeDt,
    },
    vel: { x: vx, y: vy },
  };
}

/**
 * Estimate release throw velocity from recent pointer samples.
 * Returns zero velocity when the user pauses or releases gently.
 */
export function estimateThrowVelocity(
  samples: readonly PointerSample[],
  throwPower: number,
): Vec2 {
  if (samples.length < 2) {
    return { x: 0, y: 0 };
  }

  const last = samples[samples.length - 1];
  const cutoff = last.timeMs - 90;
  let anchor = samples[0];
  for (let i = samples.length - 2; i >= 0; i -= 1) {
    anchor = samples[i];
    if (anchor.timeMs <= cutoff) break;
  }

  const dtSec = (last.timeMs - anchor.timeMs) / 1000;
  if (dtSec <= 0.004) {
    return { x: 0, y: 0 };
  }

  const rawVx = ((last.x - anchor.x) / dtSec) * throwPower;
  const rawVy = ((last.y - anchor.y) / dtSec) * throwPower;
  const speed = Math.hypot(rawVx, rawVy);

  if (speed < GENTLE_DROP_SPEED) {
    return { x: 0, y: 0 };
  }

  const maxSpeed = MAX_THROW_SPEED * throwPower;
  if (speed <= maxSpeed) {
    return { x: rawVx, y: rawVy };
  }

  const scale = maxSpeed / speed;
  return { x: rawVx * scale, y: rawVy * scale };
}

/**
 * Step projectile motion with gravity, wall/ceiling bounce, floor restitution, and friction.
 */
export function stepProjectile(
  state: ProjectileState,
  bounds: Bounds,
  physics: PhysicsConfig,
  dt: number,
): ProjectileStepResult {
  const safeDt = Math.min(Math.max(dt, 0), 0.05);
  let vx = state.vel.x;
  let vy = state.vel.y + physics.gravity * safeDt;
  let x = state.pos.x + vx * safeDt;
  let y = state.pos.y + vy * safeDt;

  let landed = false;
  let impactSpeed = 0;

  if (x <= bounds.left) {
    x = bounds.left;
    vx = Math.abs(vx) * physics.restitution;
  } else if (x >= bounds.right) {
    x = bounds.right;
    vx = -Math.abs(vx) * physics.restitution;
  }

  if (physics.ceilingBounce && y <= bounds.top) {
    y = bounds.top;
    vy = Math.abs(vy) * physics.restitution;
  }

  if (y >= bounds.bottom) {
    y = bounds.bottom;
    if (vy > 0) {
      impactSpeed = vy;
      landed = true;
    }
    const bouncedVy = -Math.abs(vy) * physics.restitution;
    vy = Math.abs(bouncedVy) < 35 && physics.gravity > 0 ? 0 : bouncedVy;
    const damping = Math.max(0, 1 - physics.groundFriction * safeDt);
    vx *= damping;
  }

  const settled =
    physics.gravity > 0 &&
    y >= bounds.bottom - 0.5 &&
    Math.abs(vx) < SETTLE_SPEED_EPS &&
    Math.abs(vy) < SETTLE_SPEED_EPS;

  return {
    nextState: {
      pos: { x, y },
      vel: settled ? { x: 0, y: 0 } : { x: vx, y: vy },
    },
    landed,
    impactSpeed,
    settled,
  };
}

/**
 * Compute vertical squash & horizontal stretch scale during Q-bounce landing or click.
 * Progress runs 0 -> 1. Uses easeOutBack overshoot recovery.
 */
export function computeSquashScale(
  progress: number,
  strength: number,
): { readonly scaleX: number; readonly scaleY: number } {
  const t = Math.min(Math.max(progress, 0), 1);
  const clampedStrength = Math.min(Math.max(strength, 0.05), 0.55);

  if (t < 0.25) {
    const down = t / 0.25;
    const scaleY = 1 - clampedStrength * down;
    const scaleX = 1 + clampedStrength * 0.65 * down;
    return { scaleX, scaleY };
  }

  const u = (t - 0.25) / 0.75;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const eased = 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  const scaleY = (1 - clampedStrength) + clampedStrength * eased;
  const scaleX = 1 + (1 - scaleY) * 0.6;
  return { scaleX, scaleY };
}

/**
 * Compute mid-air catch score when user clicks a fast-flying pet (>= 400 px/s).
 * Returns null if speed is below threshold.
 */
export function computeCatchScore(speed: number, petSize: number): number | null {
  if (speed < CATCH_MIN_SPEED || petSize <= 0) {
    return null;
  }
  return Math.max(1, Math.round((speed / 100) * (REFERENCE_PET_SIZE / petSize)));
}

export { BASE_SPRING_C };
