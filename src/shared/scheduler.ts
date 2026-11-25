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

const PRESET_RULES: readonly {
  readonly keywords: readonly string[];
  readonly preset: ActionVisualPreset;
}[] = [
  {
    keywords: ['吃', '白饭', '零食', '冰淇淋', '糖葫芦', '西瓜', '火锅', '月饼', 'Token'],
    preset: {
      sprite: 'eat',
      motionClass: 'anim-eat',
      particles: ['🍙', '✨', '⭐'],
      propEmoji: '🍚',
      durationMs: 4200,
    },
  },
  {
    keywords: ['睡', '小憩', '瞌睡', '哈欠', '休眠'],
    preset: {
      sprite: 'sleep',
      motionClass: 'anim-sleep',
      particles: ['💤', '🌙'],
      durationMs: 4800,
    },
  },
  {
    keywords: ['生气', '傲娇', '气急败坏', '拍打', '吓一跳'],
    preset: {
      sprite: 'angry',
      motionClass: 'anim-angry',
      particles: ['💢', '⚡'],
      durationMs: 3600,
    },
  },
  {
    keywords: ['害羞', '偷吃', '惊醒', '礼仪', '照镜子'],
    preset: {
      sprite: 'shy',
      motionClass: 'anim-shy',
      particles: ['💗', '✨'],
      durationMs: 3600,
    },
  },
  {
    keywords: ['舞', '开心', '元气', '跃动', '咯咯笑', '烟花', '红包', '雪人', '圣诞', '孔明灯', '吐泡泡', '水枪', '变身', '生花'],
    preset: {
      sprite: 'happy',
      motionClass: 'anim-happy',
      particles: ['⭐', '🌟', '💖'],
      durationMs: 4200,
    },
  },
  {
    keywords: ['360', '转圈', '旋转'],
    preset: {
      sprite: 'happy',
      motionClass: 'anim-spin',
      particles: ['✨', '💫'],
      durationMs: 3200,
    },
  },
  {
    keywords: ['走', '奔跑', '踏步', '荡秋千'],
    preset: {
      sprite: 'happy',
      motionClass: 'anim-walk',
      particles: ['🐾', '✨'],
      durationMs: 3600,
    },
  },
  {
    keywords: ['写代码', '魔方', '思考', '碎碎念', '小提琴', '魔术', '气球', '撸猫'],
    preset: {
      sprite: 'idle',
      motionClass: 'anim-work',
      particles: ['💻', '⭐', '🎵'],
      durationMs: 4400,
    },
  },
];

/**
 * Map any action name (including all dsh-pet action titles) to a lively procedural visual preset.
 */
export function mapActionToVisualPreset(actionName: string): ActionVisualPreset {
  if (actionName.includes('拖拽')) {
    return {
      sprite: 'shy',
      motionClass: 'anim-drag',
      particles: ['💦', '⭐'],
      durationMs: 60000,
    };
  }
  if (actionName.includes('东张西望')) {
    return {
      sprite: 'idle',
      motionClass: 'anim-turn',
      particles: ['👀', '✨'],
      durationMs: 2200,
    };
  }

  for (const rule of PRESET_RULES) {
    if (rule.keywords.some((kw) => actionName.includes(kw))) {
      return rule.preset;
    }
  }

  return {
    sprite: 'idle',
    motionClass: 'anim-idle',
    particles: ['✨'],
    durationMs: 4000,
  };
}
