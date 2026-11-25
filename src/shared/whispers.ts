import { AppConfig, WhisperPayload } from './types';

/**
 * Pick a whisper line and an optional meme sticker key for the pet speech bubble.
 */
export function pickWhisper(
  config: AppConfig,
  rng: () => number = Math.random,
): WhisperPayload {
  const lines = config.whisperLines;
  const text =
    lines.length > 0
      ? lines[Math.min(lines.length - 1, Math.floor(rng() * lines.length))]
      : '哈基米正在发呆喵~';

  if (!config.whisperImageEnabled) {
    return { text };
  }

  const memeKeys = Object.keys(config.memes);
  if (memeKeys.length === 0) {
    return { text };
  }

  const memeKey = memeKeys[Math.min(memeKeys.length - 1, Math.floor(rng() * memeKeys.length))];
  return { text, memeKey };
}
