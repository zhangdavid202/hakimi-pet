import { AppConfig, PhysicsConfig } from './types';

/** Default configuration for Hakimi Pet (哈基米), compatible with dsh-pet conventions. */
export const DEFAULT_CONFIG: AppConfig = {
  whisperPrompt:
    '你是主人桌面上的异色瞳紫蓝长发星辰猫娘「哈基米」，温柔粘人带点小傲娇，说话简短可爱（20字以内）。',
  whisperImageEnabled: true,
  whisperIntervalSec: 180,
  whisperLines: [
    '哈基米在看你写代码呢，别摸鱼喵~',
    '左眼是星星、右眼是粉晶，今天也要闪闪发光！',
    '耳朵动了动……是不是要给哈基米投喂小鱼干啦？',
    '呼哇……有点困了，但还是想陪着主人。',
    '哼，才不是特意在等你点我呢！',
    '发现新 Bug 了吗？哈基米帮你用猫爪拍扁它！',
    '今天也很努力呢，记得喝口水休息一下~',
    '拖着我乱甩的话，尾巴会炸毛的哦！',
    'Ciallo～★ 哈基米能量充满中！',
    '好饿……白饭配小鱼干也可以，真的！',
  ],
  memes: {
    可爱: '标准正面卖萌立绘，适合开心问候、日常撒娇',
    开心跃动: '星辰猫娘元气跳跃挥手，适合庆祝、夸奖、好心情',
    害羞: '脸红捂脸耳朵微垂，适合被夸奖、害羞惊讶',
    傲娇生气: '鼓起腮帮叉腰炸毛，适合傲娇顶嘴、吐槽',
    深度睡眠: '蜷缩闭眼呼呼大睡，适合待机休眠、困倦',
    吃白饭: '抱着白米饭大口干饭，适合干饭时间、讨零食',
  },
  physics: {
    gravity: 1400,
    restitution: 0.78,
    groundFriction: 2.5,
    ceilingBounce: true,
    throwPower: 1.0,
    petCollision: false,
  },
  pet: {
    name: '哈基米',
    id: 'hakimi-main',
    size: 240,
    fixedEnabled: false,
    whisperEnabled: true,
    position: {
      corner: 'bottom-right',
      marginX: 36,
      marginY: 48,
    },
  },
  animations: {
    idle: ['待机呼吸休闲'],
    turn: ['东张西望'],
    drag: ['被鼠标拖拽悬空反馈'],
    clicks: [
      '点击回应-开心跃动',
      '点击回应-害羞惊讶',
      '点击回应-傲娇生气',
      '点击回应-挠痒咯咯笑',
      '点击回应-元气挥手',
    ],
    moves: {
      default: { minDist: 60, maxDist: 240, margin: 20, leadSec: 0.3, tailSec: 0.3 },
      actions: [
        { name: '螃蟹走路' },
        { name: '原地漂浮踏步', params: { minDist: 40, maxDist: 120 } },
        { name: '轻快奔跑', params: { minDist: 120, maxDist: 320 } },
      ],
    },
    categories: [
      {
        id: '小动作',
        weight: 22,
        actions: [
          '悠闲哼歌',
          '超大伸懒腰',
          '原地敲击桌面互动',
          '哈欠连天',
          '原地小憩沉眠',
          '猫娘屈膝礼仪',
          '被吓一跳',
          '原地360度转圈展示',
          '偷吃零食被抓住',
          '用猫尾拍打地面',
          '打瞌睡被惊醒',
          '照镜子',
          '写代码',
          '摇扇纳凉',
        ],
      },
      {
        id: '玩耍',
        weight: 22,
        actions: [
          '原地专心玩魔方',
          '星辰吐泡泡特效',
          '玩游戏气急败坏',
          '玩水枪',
          '小提琴演奏',
          '星辰猫娘变身',
          '轻快摇摆舞',
          '可爱宅舞',
          '吹气球',
          '撸猫',
          '凭空生花',
          '扑克魔术',
          '荡秋千',
        ],
      },
      {
        id: '吃什么',
        weight: 18,
        actions: [
          '吃白饭',
          '大口吃零食',
          '吃Token',
          '吃冰淇淋融化',
          '吃糖葫芦',
          '吃西瓜',
          '涮火锅',
        ],
      },
      {
        id: '时节',
        weight: 12,
        actions: [
          '堆雪人',
          '放烟花',
          '中秋赏月吃月饼',
          '收红包',
          '装点圣诞树',
          '放孔明灯',
        ],
      },
      {
        id: '文字',
        weight: 6,
        noMirror: true,
        actions: ['是啊，吃什么', '深度思考碎碎念'],
      },
    ],
    events: {
      whisper: ['碎碎念-擦桌碎碎念', '碎碎念-发呆碎碎念', '碎碎念-对屏碎碎念'],
    },
  },
  animationWeights: {
    idle: 10,
    turn: 5,
    move: 5,
  },
};

/**
 * Strip `//` line comments and `/* ... *\/` block comments from JSONC text
 * without corrupting string literals (such as URLs containing `//`).
 */
export function stripJsonComments(raw: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      i += 1;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      i += 2;
      while (i < raw.length && raw[i] !== '\n') i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < raw.length && !(raw[i] === '*' && raw[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

function validatePhysics(physics: PhysicsConfig): void {
  if (!Number.isFinite(physics.gravity) || physics.gravity < 0) {
    throw new Error(`Invalid physics.gravity: ${physics.gravity}`);
  }
  if (!Number.isFinite(physics.restitution) || physics.restitution < 0 || physics.restitution > 1) {
    throw new Error(`Invalid physics.restitution: ${physics.restitution}`);
  }
  if (!Number.isFinite(physics.groundFriction) || physics.groundFriction < 0) {
    throw new Error(`Invalid physics.groundFriction: ${physics.groundFriction}`);
  }
  if (!Number.isFinite(physics.throwPower) || physics.throwPower <= 0) {
    throw new Error(`Invalid physics.throwPower: ${physics.throwPower}`);
  }
}

/**
 * Parse a JSONC configuration string and immutably merge it on top of DEFAULT_CONFIG.
 * Throws descriptive errors for malformed JSON or out-of-range physics parameters.
 */
export function parseConfig(raw: string): AppConfig {
  const cleaned = stripJsonComments(raw);
  const parsed = JSON.parse(cleaned) as Partial<AppConfig>;

  const mergedPhysics: PhysicsConfig = {
    ...DEFAULT_CONFIG.physics,
    ...(parsed.physics ?? {}),
  };
  validatePhysics(mergedPhysics);

  const mergedPet = {
    ...DEFAULT_CONFIG.pet,
    ...(parsed.pet ?? {}),
    position: {
      ...DEFAULT_CONFIG.pet.position,
      ...(parsed.pet?.position ?? {}),
    },
  };
  if (!Number.isFinite(mergedPet.size) || mergedPet.size < 80 || mergedPet.size > 800) {
    throw new Error(`Invalid pet.size: ${mergedPet.size}`);
  }

  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    physics: mergedPhysics,
    pet: mergedPet,
    memes: parsed.memes ? { ...parsed.memes } : DEFAULT_CONFIG.memes,
    whisperLines: parsed.whisperLines ? [...parsed.whisperLines] : DEFAULT_CONFIG.whisperLines,
    animations: parsed.animations
      ? {
          ...DEFAULT_CONFIG.animations,
          ...parsed.animations,
          moves: {
            ...DEFAULT_CONFIG.animations.moves,
            ...(parsed.animations.moves ?? {}),
            default: {
              ...DEFAULT_CONFIG.animations.moves.default,
              ...(parsed.animations.moves?.default ?? {}),
            },
          },
          events: {
            ...DEFAULT_CONFIG.animations.events,
            ...(parsed.animations.events ?? {}),
          },
        }
      : DEFAULT_CONFIG.animations,
    animationWeights: {
      ...DEFAULT_CONFIG.animationWeights,
      ...(parsed.animationWeights ?? {}),
    },
  };
}
