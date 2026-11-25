import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/shared/config';
import {
  computeMoveDestination,
  mapActionToVisualPreset,
  pickClickReaction,
  rollNextAction,
} from '../src/shared/scheduler';

describe('scheduler', () => {
  it('rolls idle, turn, move, and categories according to weights', () => {
    const idleSel = rollNextAction(DEFAULT_CONFIG, false, false, () => 0.01);
    expect(idleSel.kind).toBe('idle');

    const turnSel = rollNextAction(DEFAULT_CONFIG, false, false, () => 0.12);
    expect(turnSel.kind).toBe('turn');

    const moveSel = rollNextAction(DEFAULT_CONFIG, false, false, () => 0.17);
    expect(moveSel.kind).toBe('move');
    expect(moveSel.moveParams).toBeDefined();

    const catSel = rollNextAction(DEFAULT_CONFIG, false, false, () => 0.25);
    expect(catSel.kind).toBe('category');
  });

  it('suppresses turn and move when fixedEnabled is true', () => {
    for (let v = 0.01; v < 0.99; v += 0.05) {
      const sel = rollNextAction(DEFAULT_CONFIG, false, true, () => v);
      expect(sel.kind).not.toBe('turn');
      expect(sel.kind).not.toBe('move');
    }
  });

  it('excludes noMirror categories when facingRight is true', () => {
    for (let v = 0.01; v < 0.99; v += 0.02) {
      const sel = rollNextAction(DEFAULT_CONFIG, true, false, () => v);
      expect(sel.categoryId).not.toBe('文字');
    }
  });

  it('avoids immediate repetition on click reactions', () => {
    const clicks = ['A', 'B'];
    expect(pickClickReaction(clicks, 'A', () => 0.0)).toBe('B');
    expect(pickClickReaction(['Only'], 'Only', () => 0.0)).toBe('Only');
    expect(pickClickReaction([], undefined, () => 0.0)).toBe('点击回应-开心跃动');
  });

  it('keeps move destination within bounds and flips direction near edges', () => {
    const bounds = { left: 0, top: 0, right: 1000, bottom: 800 };
    const params = { minDist: 80, maxDist: 200, margin: 20, leadSec: 0.2, tailSec: 0.2 };

    const nearRight = computeMoveDestination(760, 240, bounds, true, params, () => 0.5);
    expect(nearRight.nextFacingRight).toBe(false);
    expect(nearRight.targetX).toBeLessThan(760);
    expect(nearRight.targetX).toBeGreaterThanOrEqual(20);

    const nearLeft = computeMoveDestination(20, 240, bounds, false, params, () => 0.5);
    expect(nearLeft.nextFacingRight).toBe(true);
    expect(nearLeft.targetX).toBeGreaterThan(20);
  });

  it('maps action names to distinct procedural visual presets', () => {
    expect(mapActionToVisualPreset('吃白饭').sprite).toBe('eat');
    expect(mapActionToVisualPreset('哈欠连天').sprite).toBe('sleep');
    expect(mapActionToVisualPreset('点击回应-傲娇生气').sprite).toBe('angry');
    expect(mapActionToVisualPreset('点击回应-害羞惊讶').sprite).toBe('shy');
    expect(mapActionToVisualPreset('可爱宅舞').sprite).toBe('happy');
    expect(mapActionToVisualPreset('被鼠标拖拽悬空反馈').motionClass).toBe('anim-drag');
    expect(mapActionToVisualPreset('东张西望').motionClass).toBe('anim-turn');
    expect(mapActionToVisualPreset('未知动作').sprite).toBe('idle');
  });
});
