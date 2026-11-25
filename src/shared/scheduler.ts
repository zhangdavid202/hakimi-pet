import {
  ActionSelection,
  ActionVisualPreset,
  AnimationCategory,
  AppConfig,
  Bounds,
  MoveParams,
} from './types';

function pickRandom<T>(items: readonly T[], rng: () => number): T {
  const idx = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[idx];
}

/**
 * Roll the next animation in the endless loop, mirroring dsh-pet's weight rules.
 * When `fixedEnabled` is true, `turn` and `move` weights collapse into categories.
 * When `facingRight` is true, categories marked `noMirror: true` are excluded.
 */
export function rollNextAction(
  config: AppConfig,
  facingRight: boolean,
  fixedEnabled: boolean,
  rng: () => number = Math.random,
): ActionSelection {
  const wIdle = Math.max(0, config.animationWeights.idle);
  const wTurn = fixedEnabled ? 0 : Math.max(0, config.animationWeights.turn);
  const wMove = fixedEnabled ? 0 : Math.max(0, config.animationWeights.move);

  const eligibleCategories: AnimationCategory[] = config.animations.categories.filter(
    (cat) => cat.actions.length > 0 && !(facingRight && cat.noMirror),
  );
  const categoryTotal = eligibleCategories.reduce((sum, cat) => sum + Math.max(0, cat.weight), 0);
  const totalWeight = wIdle + wTurn + wMove + categoryTotal;

  if (totalWeight <= 0) {
    return { kind: 'idle', name: config.animations.idle[0] ?? '待机呼吸休闲' };
  }

  let roll = rng() * totalWeight;

  if (roll < wIdle && config.animations.idle.length > 0) {
    return { kind: 'idle', name: pickRandom(config.animations.idle, rng) };
  }
  roll -= wIdle;

  if (roll < wTurn && config.animations.turn.length > 0) {
    return { kind: 'turn', name: pickRandom(config.animations.turn, rng) };
  }
  roll -= wTurn;

  if (roll < wMove && config.animations.moves.actions.length > 0) {
    const moveAction = pickRandom(config.animations.moves.actions, rng);
    const params: MoveParams = {
      ...config.animations.moves.default,
      ...(moveAction.params ?? {}),
    };
    return { kind: 'move', name: moveAction.name, moveParams: params };
  }
  roll -= wMove;

  for (const cat of eligibleCategories) {
    const w = Math.max(0, cat.weight);
    if (roll < w) {
      return {
        kind: 'category',
        categoryId: cat.id,
        noMirror: cat.noMirror,
        name: pickRandom(cat.actions, rng),
      };
    }
    roll -= w;
  }

  const fallbackCat = eligibleCategories[0];
  if (fallbackCat) {
    return {
      kind: 'category',
      categoryId: fallbackCat.id,
      noMirror: fallbackCat.noMirror,
      name: fallbackCat.actions[0],
    };
  }
  return { kind: 'idle', name: config.animations.idle[0] ?? '待机呼吸休闲' };
}

/**
 * Pick a click reaction animation avoiding immediate repetition when multiple exist.
 */
export function pickClickReaction(
  clicks: readonly string[],
  lastAction: string | undefined,
  rng: () => number = Math.random,
): string {
  if (clicks.length === 0) return '点击回应-开心跃动';
  if (clicks.length === 1) return clicks[0];
  const filtered = clicks.filter((item) => item !== lastAction);
  const pool = filtered.length > 0 ? filtered : clicks;
  return pickRandom(pool, rng);
}

/**
 * Compute a safe horizontal destination inside screen bounds for a wandering move.
 * Automatically flips direction if remaining space in current direction is too small.
 */
export function computeMoveDestination(
  currentX: number,
  petWidth: number,
  bounds: Bounds,
  facingRight: boolean,
  params: MoveParams,
  rng: () => number = Math.random,
): { readonly targetX: number; readonly nextFacingRight: boolean } {
  const minX = bounds.left + params.margin;
  const maxX = Math.max(minX, bounds.right - petWidth - params.margin);

  const spaceRight = maxX - currentX;
  const spaceLeft = currentX - minX;

  let dir = facingRight ? 1 : -1;
  if (dir > 0 && spaceRight < params.minDist && spaceLeft >= params.minDist) {
    dir = -1;
  } else if (dir < 0 && spaceLeft < params.minDist && spaceRight >= params.minDist) {
    dir = 1;
  }

  const available = dir > 0 ? spaceRight : spaceLeft;
  const clampedDist = Math.min(
    Math.max(available, 0),
    params.minDist + rng() * Math.max(0, params.maxDist - params.minDist),
  );

  const targetX = Math.min(maxX, Math.max(minX, currentX + dir * clampedDist));
  return { targetX, nextFacingRight: dir > 0 };
}

const ACTION_PRESET_MAP: Readonly<Record<string, ActionVisualPreset>> = {
  待机呼吸休闲: {
    sprite: 'idle',
    spriteFile: 'idle.png',
    motionClass: 'anim-idle',
    particles: ['✨'],
    durationMs: 4200,
  },
  东张西望: {
    sprite: 'idle',
    spriteFile: 'actions/东张西望.png',
    motionClass: 'anim-turn',
    particles: ['👀', '✨'],
    durationMs: 2400,
  },
  被鼠标拖拽悬空反馈: {
    sprite: 'shy',
    spriteFile: 'actions/被鼠标拖拽悬空反馈.png',
    motionClass: 'anim-drag',
    particles: ['💦', '⭐'],
    durationMs: 60000,
  },
  '点击回应-开心跃动': {
    sprite: 'happy',
    spriteFile: 'happy.png',
    motionClass: 'anim-happy',
    particles: ['⭐', '🌟', '💖'],
    durationMs: 3800,
  },
  '点击回应-害羞惊讶': {
    sprite: 'shy',
    spriteFile: 'shy.png',
    motionClass: 'anim-shy',
    particles: ['💗', '✨'],
    durationMs: 3600,
  },
  '点击回应-傲娇生气': {
    sprite: 'angry',
    spriteFile: 'angry.png',
    motionClass: 'anim-angry',
    particles: ['💢', '⚡'],
    durationMs: 3600,
  },
  '点击回应-元气挥手': {
    sprite: 'happy',
    spriteFile: 'actions/点击回应-元气挥手.png',
    motionClass: 'anim-happy',
    particles: ['👋', '⭐', '💖'],
    durationMs: 3800,
  },
  轻快奔跑: {
    sprite: 'happy',
    spriteFile: 'actions/轻快奔跑.png',
    motionClass: 'anim-walk',
    particles: ['🐾', '✨'],
    durationMs: 3600,
  },
  原地小憩沉眠: {
    sprite: 'sleep',
    spriteFile: 'sleep.png',
    motionClass: 'anim-sleep',
    particles: ['💤', '🌙'],
    durationMs: 4800,
  },
  写代码: {
    sprite: 'idle',
    spriteFile: 'actions/写代码.png',
    motionClass: 'anim-work',
    particles: ['💻', '⭐'],
    durationMs: 4600,
  },
  猫娘屈膝礼仪: {
    sprite: 'shy',
    spriteFile: 'actions/猫娘屈膝礼仪.png',
    motionClass: 'anim-shy',
    particles: ['🌸', '✨'],
    durationMs: 3800,
  },
  吃白饭: {
    sprite: 'eat',
    spriteFile: 'eat.png',
    motionClass: 'anim-eat',
    particles: ['🍚', '✨'],
    durationMs: 4200,
  },
};

/**
 * Map any action name to its bespoke character sprite and procedural motion preset.
 */
export function mapActionToVisualPreset(actionName: string): ActionVisualPreset {
  const exact = ACTION_PRESET_MAP[actionName];
  if (exact) return exact;

  if (actionName.includes('睡') || actionName.includes('眠')) {
    return { sprite: 'sleep', spriteFile: 'sleep.png', motionClass: 'anim-sleep', particles: ['💤'], durationMs: 4200 };
  }
  if (actionName.includes('吃')) {
    return { sprite: 'eat', spriteFile: 'eat.png', motionClass: 'anim-eat', particles: ['✨'], durationMs: 4000 };
  }
  if (actionName.includes('气') || actionName.includes('怒')) {
    return { sprite: 'angry', spriteFile: 'angry.png', motionClass: 'anim-angry', particles: ['💢'], durationMs: 3600 };
  }
  if (actionName.includes('羞')) {
    return { sprite: 'shy', spriteFile: 'shy.png', motionClass: 'anim-shy', particles: ['💗'], durationMs: 3600 };
  }

  return {
    sprite: 'idle',
    spriteFile: 'idle.png',
    motionClass: 'anim-idle',
    particles: ['✨'],
    durationMs: 4000,
  };
}
