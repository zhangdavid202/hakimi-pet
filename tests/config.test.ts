import { describe, expect, it } from 'vitest';
import {
  clampPetSize,
  computeAnchoredResizePos,
  DEFAULT_CONFIG,
  MAX_PET_SIZE,
  MIN_PET_SIZE,
  parseConfig,
  stripJsonComments,
} from '../src/shared/config';

describe('config', () => {
  it('strips JSONC comments while preserving // inside string literals', () => {
    const raw = `{
      // line comment
      "url": "https://github.com/zhangdavid202/hakimi-pet",
      /* block
         comment */
      "name": "哈基米"
    }`;
    const parsed = JSON.parse(stripJsonComments(raw));
    expect(parsed.url).toBe('https://github.com/zhangdavid202/hakimi-pet');
    expect(parsed.name).toBe('哈基米');
  });

  it('merges partial config cleanly over defaults without mutating DEFAULT_CONFIG', () => {
    const cfg = parseConfig(`{
      // custom size
      "pet": { "name": "小哈基米", "id": "main", "size": 300, "fixedEnabled": true, "whisperEnabled": true, "position": { "corner": "top-left", "marginX": 10, "marginY": 10 } },
      "physics": { "gravity": 0 }
    }`);
    expect(cfg.pet.name).toBe('小哈基米');
    expect(cfg.pet.size).toBe(300);
    expect(cfg.physics.gravity).toBe(0);
    expect(cfg.physics.restitution).toBe(DEFAULT_CONFIG.physics.restitution);
    expect(DEFAULT_CONFIG.physics.gravity).toBe(1400);
  });

  it('rejects invalid physics or pet size values', () => {
    expect(() => parseConfig(`{ "physics": { "gravity": -10 } }`)).toThrow(/gravity/);
    expect(() => parseConfig(`{ "physics": { "restitution": 1.5 } }`)).toThrow(/restitution/);
    expect(() => parseConfig(`{ "physics": { "groundFriction": -1 } }`)).toThrow(/groundFriction/);
    expect(() => parseConfig(`{ "physics": { "throwPower": 0 } }`)).toThrow(/throwPower/);
    expect(() => parseConfig(`{ "pet": { "size": 20 } }`)).toThrow(/pet\.size/);
  });

  it('clamps pet size and keeps bottom-center anchored on resize', () => {
    expect(clampPetSize(20)).toBe(MIN_PET_SIZE);
    expect(clampPetSize(999)).toBe(MAX_PET_SIZE);
    expect(clampPetSize(Number.NaN)).toBe(240);
    expect(clampPetSize(280.4)).toBe(280);

    const nextPos = computeAnchoredResizePos({ x: 500, y: 500 }, 240, 320);
    expect(nextPos).toEqual({ x: 460, y: 420 });
  });
});
