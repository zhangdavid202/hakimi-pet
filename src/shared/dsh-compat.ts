import { mapActionToVisualPreset } from './scheduler';
import { AppConfig, ResolvedActionMedia } from './types';

/**
 * Resolve how an action is rendered:
 * If a matching `<actionName>.webm` exists in `availableWebms`, play the transparent video;
 * otherwise fall back seamlessly to the procedural Q-version sprite animation.
 */
export function resolveActionMedia(
  actionName: string,
  availableWebms: ReadonlySet<string>,
): ResolvedActionMedia {
  const filename = `${actionName}.webm`;
  if (availableWebms.has(filename) || availableWebms.has(actionName)) {
    return { type: 'webm', file: filename };
  }
  return {
    type: 'procedural',
    preset: mapActionToVisualPreset(actionName),
  };
}

/**
 * Build a dsh-pet compatible species config object (`pet/hakimi-config.json`),
 * allowing users to drop the exported pack directly into `$DSH_HOME/dsh-pet/pet/`.
 */
export function buildDshPetPackConfig(config: AppConfig): Record<string, unknown> {
  return {
    name: config.pet.name,
    id: 'hakimi',
    size: config.pet.size,
    balanceEnabled: false,
    whisperEnabled: config.pet.whisperEnabled,
    workStatusEnabled: false,
    fixedEnabled: config.pet.fixedEnabled,
    display: 'both',
    position: config.pet.position,
    whisperPrompt: config.whisperPrompt,
    whisperImageEnabled: config.whisperImageEnabled,
    memes: config.memes,
    physics: config.physics,
    animations: config.animations,
    animationWeights: config.animationWeights,
  };
}
