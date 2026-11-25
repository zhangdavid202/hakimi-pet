/** 2D vector used for positions, velocities, and deltas. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Rectangular screen or movement bounds. */
export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Physics configuration matching dsh-pet's physics block. */
export interface PhysicsConfig {
  readonly gravity: number;
  readonly restitution: number;
  readonly groundFriction: number;
  readonly ceilingBounce: boolean;
  readonly throwPower: number;
  readonly petCollision: boolean;
}

/** Movement animation parameters matching dsh-pet moves. */
export interface MoveParams {
  readonly minDist: number;
  readonly maxDist: number;
  readonly margin: number;
  readonly leadSec: number;
  readonly tailSec: number;
}

/** Single move action entry. */
export interface MoveAction {
  readonly name: string;
  readonly params?: Partial<MoveParams>;
}

/** Random action category pool. */
export interface AnimationCategory {
  readonly id: string;
  readonly weight: number;
  readonly noMirror?: boolean;
  readonly actions: readonly string[];
}

/** Complete animation pool structure compatible with dsh-pet. */
export interface AnimationPool {
  readonly idle: readonly string[];
  readonly turn: readonly string[];
  readonly drag: readonly string[];
  readonly clicks: readonly string[];
  readonly moves: {
    readonly default: MoveParams;
    readonly actions: readonly MoveAction[];
  };
  readonly categories: readonly AnimationCategory[];
  readonly events: {
    readonly whisper: readonly string[];
  };
}

/** Top-level animation chain weights (must sum with categories to ~100). */
export interface AnimationWeights {
  readonly idle: number;
  readonly turn: number;
  readonly move: number;
}

/** Corner anchor for initial placement. */
export type CornerAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Per-pet instance settings. */
export interface PetInstanceConfig {
  readonly name: string;
  readonly id: string;
  readonly size: number;
  readonly fixedEnabled: boolean;
  readonly whisperEnabled: boolean;
  readonly position: {
    readonly corner: CornerAnchor;
    readonly marginX: number;
    readonly marginY: number;
  };
}

/** Full Hakimi Pet application configuration (JSONC-compatible). */
export interface AppConfig {
  readonly whisperPrompt: string;
  readonly whisperImageEnabled: boolean;
  readonly whisperIntervalSec: number;
  readonly whisperLines: readonly string[];
  readonly memes: Readonly<Record<string, string>>;
  readonly physics: PhysicsConfig;
  readonly pet: PetInstanceConfig;
  readonly animations: AnimationPool;
  readonly animationWeights: AnimationWeights;
}

/** Mood sprite keys corresponding to transparent PNGs in assets/sprites/. */
export type SpriteMood = 'idle' | 'happy' | 'shy' | 'angry' | 'sleep' | 'eat';

/** Visual preset driving procedural animations when no .webm override exists. */
export interface ActionVisualPreset {
  readonly sprite: SpriteMood;
  readonly motionClass: string;
  readonly particles: readonly string[];
  readonly propEmoji?: string;
  readonly durationMs: number;
}

/** Selected animation task from the scheduler. */
export interface ActionSelection {
  readonly kind: 'idle' | 'turn' | 'move' | 'click' | 'category' | 'event';
  readonly name: string;
  readonly categoryId?: string;
  readonly noMirror?: boolean;
  readonly moveParams?: MoveParams;
}

/** Media resolution result: native .webm override or procedural sprite preset. */
export type ResolvedActionMedia =
  | { readonly type: 'webm'; readonly file: string }
  | { readonly type: 'procedural'; readonly preset: ActionVisualPreset };

/** Overdamped spring state for pointer dragging. */
export interface DragSpringState {
  readonly pos: Vec2;
  readonly vel: Vec2;
}

/** Timestamped pointer sample for throw velocity estimation. */
export interface PointerSample {
  readonly x: number;
  readonly y: number;
  readonly timeMs: number;
}

/** Projectile state during free-fall / bounce / ground slide. */
export interface ProjectileState {
  readonly pos: Vec2;
  readonly vel: Vec2;
}

/** Output of one projectile simulation step. */
export interface ProjectileStepResult {
  readonly nextState: ProjectileState;
  readonly landed: boolean;
  readonly impactSpeed: number;
  readonly settled: boolean;
}

/** Whisper bubble payload. */
export interface WhisperPayload {
  readonly text: string;
  readonly memeKey?: string;
}
