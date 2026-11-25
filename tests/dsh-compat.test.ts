import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/shared/config';
import { buildDshPetPackConfig, resolveActionMedia } from '../src/shared/dsh-compat';

describe('dsh-compat', () => {
  it('prefers .webm when available and falls back to procedural preset otherwise', () => {
    const webms = new Set(['写代码.webm']);

    const webmRes = resolveActionMedia('写代码', webms);
    expect(webmRes).toEqual({ type: 'webm', file: '写代码.webm' });

    const procRes = resolveActionMedia('吃白饭', webms);
    expect(procRes.type).toBe('procedural');
    if (procRes.type === 'procedural') {
      expect(procRes.preset.sprite).toBe('eat');
    }
  });

  it('builds a valid dsh-pet compatible species config', () => {
    const pack = buildDshPetPackConfig(DEFAULT_CONFIG);
    expect(pack.id).toBe('hakimi');
    expect(pack.name).toBe('哈基米');
    expect(pack.display).toBe('both');
    expect(pack.animations).toEqual(DEFAULT_CONFIG.animations);
    expect(pack.memes).toEqual(DEFAULT_CONFIG.memes);
  });
});
