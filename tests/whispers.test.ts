import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/shared/config';
import { pickWhisper } from '../src/shared/whispers';

describe('whispers', () => {
  it('picks a whisper line and meme key when whisperImageEnabled is true', () => {
    const res = pickWhisper(DEFAULT_CONFIG, () => 0.0);
    expect(res.text).toBe(DEFAULT_CONFIG.whisperLines[0]);
    expect(res.memeKey).toBe(Object.keys(DEFAULT_CONFIG.memes)[0]);
  });

  it('omits memeKey when whisperImageEnabled is false', () => {
    const res = pickWhisper(
      { ...DEFAULT_CONFIG, whisperImageEnabled: false },
      () => 0.5,
    );
    expect(res.text.length).toBeGreaterThan(0);
    expect(res.memeKey).toBeUndefined();
  });
});
