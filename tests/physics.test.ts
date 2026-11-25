import { describe, expect, it } from 'vitest';
import {
  computeCatchScore,
  computeSquashScale,
  estimateThrowVelocity,
  stepDragSpring,
  stepProjectile,
} from '../src/shared/physics';
import { DEFAULT_CONFIG } from '../src/shared/config';

describe('physics', () => {
  it('converges overdamped drag spring smoothly without overshoot', () => {
    let state = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } };
    const target = { x: 200, y: 100 };

    for (let i = 0; i < 120; i += 1) {
      state = stepDragSpring(state, target, 1 / 60, 1.0);
    }

    expect(state.pos.x).toBeGreaterThan(198);
    expect(state.pos.x).toBeLessThanOrEqual(200.5);
    expect(state.pos.y).toBeGreaterThan(98);
    expect(state.pos.y).toBeLessThanOrEqual(100.5);
  });

  it('returns zero velocity for gentle drop and clamps fast throws', () => {
    expect(estimateThrowVelocity([], 1.0)).toEqual({ x: 0, y: 0 });

    const gentle = [
      { x: 100, y: 100, timeMs: 1000 },
      { x: 102, y: 101, timeMs: 1080 },
    ];
    expect(estimateThrowVelocity(gentle, 1.0)).toEqual({ x: 0, y: 0 });

    const fast = [
      { x: 0, y: 0, timeMs: 1000 },
      { x: 5000, y: 0, timeMs: 1050 },
    ];
    const v = estimateThrowVelocity(fast, 1.0);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(3600, 1);

    const medium = [
      { x: 0, y: 0, timeMs: 1000 },
      { x: 60, y: 30, timeMs: 1080 },
    ];
    const vm = estimateThrowVelocity(medium, 1.0);
    expect(vm.x).toBeCloseTo(750, 1);
    expect(vm.y).toBeCloseTo(375, 1);
  });

  it('bounces off walls, ceiling, and floor with restitution and settles on ground', () => {
    const bounds = { left: 0, top: 0, right: 800, bottom: 500 };

    const wallHit = stepProjectile(
      { pos: { x: 795, y: 200 }, vel: { x: 600, y: 0 } },
      bounds,
      DEFAULT_CONFIG.physics,
      0.03,
    );
    expect(wallHit.nextState.pos.x).toBe(800);
    expect(wallHit.nextState.vel.x).toBeLessThan(0);

    const leftWallHit = stepProjectile(
      { pos: { x: 5, y: 200 }, vel: { x: -600, y: 0 } },
      bounds,
      DEFAULT_CONFIG.physics,
      0.03,
    );
    expect(leftWallHit.nextState.pos.x).toBe(0);
    expect(leftWallHit.nextState.vel.x).toBeGreaterThan(0);

    const ceilHit = stepProjectile(
      { pos: { x: 200, y: 5 }, vel: { x: 0, y: -500 } },
      bounds,
      DEFAULT_CONFIG.physics,
      0.03,
    );
    expect(ceilHit.nextState.pos.y).toBe(0);
    expect(ceilHit.nextState.vel.y).toBeGreaterThan(0);

    const floorHit = stepProjectile(
      { pos: { x: 200, y: 495 }, vel: { x: 100, y: 400 } },
      bounds,
      DEFAULT_CONFIG.physics,
      0.03,
    );
    expect(floorHit.landed).toBe(true);
    expect(floorHit.impactSpeed).toBeGreaterThan(400);
    expect(floorHit.nextState.vel.y).toBeLessThan(0);

    const settled = stepProjectile(
      { pos: { x: 200, y: 500 }, vel: { x: 2, y: 0 } },
      bounds,
      DEFAULT_CONFIG.physics,
      0.016,
    );
    expect(settled.settled).toBe(true);
    expect(settled.nextState.vel).toEqual({ x: 0, y: 0 });
  });

  it('supports zero-gravity floating without ceiling bounce', () => {
    const floatPhysics = {
      ...DEFAULT_CONFIG.physics,
      gravity: 0,
      ceilingBounce: false,
    };
    const res = stepProjectile(
      { pos: { x: 100, y: 2 }, vel: { x: 50, y: -200 } },
      { left: 0, top: 0, right: 800, bottom: 500 },
      floatPhysics,
      0.05,
    );
    expect(res.nextState.pos.y).toBeLessThan(0);
    expect(res.settled).toBe(false);
  });

  it('computes squash scale and mid-air catch score correctly', () => {
    const squashed = computeSquashScale(0.25, 0.45);
    expect(squashed.scaleY).toBeCloseTo(0.55, 2);
    expect(squashed.scaleX).toBeGreaterThan(1);

    const recovered = computeSquashScale(1.0, 0.45);
    expect(recovered.scaleY).toBeCloseTo(1, 3);
    expect(recovered.scaleX).toBeCloseTo(1, 3);

    expect(computeCatchScore(399, 240)).toBeNull();
    expect(computeCatchScore(500, 0)).toBeNull();
    expect(computeCatchScore(500, 231)).toBe(10);
  });
});
