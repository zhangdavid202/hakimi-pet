import { describe, expect, it } from 'vitest';
import { computeLookAtAngles, computeTailWave, dampAngle } from '../src/shared/lookat';

describe('lookat', () => {
  it('computes clamped head yaw/pitch and eye pupil offsets from cursor', () => {
    const center = { x: 500, y: 500 };

    const rightDown = computeLookAtAngles({ x: 2000, y: 2000 }, center, false);
    expect(rightDown.yaw).toBeCloseTo(0.52, 4);
    expect(rightDown.pitch).toBeCloseTo(0.34, 4);
    expect(rightDown.eyeX).toBe(1);
    expect(rightDown.eyeY).toBe(-1);

    const leftUp = computeLookAtAngles({ x: -1000, y: -1000 }, center, false);
    expect(leftUp.yaw).toBeCloseTo(-0.52, 4);
    expect(leftUp.pitch).toBeCloseTo(-0.34, 4);
    expect(leftUp.eyeX).toBe(-1);
    expect(leftUp.eyeY).toBe(1);
  });

  it('compensates horizontal look-at when facingRight is true', () => {
    const center = { x: 500, y: 500 };
    const facingLeft = computeLookAtAngles({ x: 740, y: 500 }, center, false);
    const facingRight = computeLookAtAngles({ x: 740, y: 500 }, center, true);

    expect(facingLeft.yaw).toBeGreaterThan(0);
    expect(facingRight.yaw).toBeLessThan(0);
    expect(facingRight.eyeX).toBeCloseTo(-facingLeft.eyeX, 5);
  });

  it('smoothly damps angles without overshoot', () => {
    let angle = 0;
    for (let i = 0; i < 60; i += 1) {
      angle = dampAngle(angle, 0.5, 10, 1 / 60);
    }
    expect(angle).toBeGreaterThan(0.49);
    expect(angle).toBeLessThanOrEqual(0.5);
    expect(dampAngle(0.2, 1.0, 10, 0)).toBe(0.2);
  });

  it('computes phase-delayed tail wave segments', () => {
    const seg0 = computeTailWave(0, 1.0, 1.0);
    const seg3 = computeTailWave(3, 1.0, 1.0);
    expect(seg0.rotY).not.toBe(seg3.rotY);
    expect(Math.abs(seg3.rotY)).toBeLessThanOrEqual(0.5);
  });
});
