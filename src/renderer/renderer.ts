import {
  computeCatchScore,
  computeMoveDestination,
  computeSquashScale,
  estimateThrowVelocity,
  pickClickReaction,
  pickWhisper,
  resolveActionMedia,
  rollNextAction,
  stepDragSpring,
  stepProjectile,
} from '../shared/index';
import type {
  ActionSelection,
  AppConfig,
  Bounds,
  DragSpringState,
  PointerSample,
  ProjectileState,
  RenderMode,
  SpriteMood,
  Vec2,
} from '../shared/types';
import type { InitPayload, MenuCommand, WindowLayoutMetrics } from '../main/preload';
import { Neko3DScene } from './neko3d-scene';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  alpha: number;
  scale: number;
  isScore?: boolean;
}

interface PetRuntime {
  config: AppConfig;
  layout: WindowLayoutMetrics;
  assetBaseUrl: string;
  availableWebms: Set<string>;
  screenBounds: Bounds;
  initialWindowPos: { x: number; y: number };
  petPos: { x: number; y: number };
  cursorScreen: Vec2;
  facingRight: boolean;
  renderMode: RenderMode;
  fixedEnabled: boolean;
  whisperEnabled: boolean;
  mode: 'anim' | 'drag' | 'throw' | 'move' | 'orbit';
  lastActionName: string;
  currentParticles: readonly string[];
  actionTimerId: number | null;
  whisperTimerId: number | null;
  bubbleTimerId: number | null;
  dragSpring: DragSpringState | null;
  dragGrabOffset: { x: number; y: number };
  dragSamples: PointerSample[];
  pointerTarget: { x: number; y: number };
  dragMovedDist: number;
  orbitLast: { x: number; y: number };
  projectile: ProjectileState | null;
  squashUntilMs: number;
  squashStartMs: number;
  squashStrength: number;
  walkAnim: {
    startX: number;
    targetX: number;
    startMs: number;
    durationMs: number;
  } | null;
  particles: Particle[];
}

declare global {
  interface Window {
    petAPI: {
      getInitData: () => Promise<InitPayload>;
      getScreenBounds: () => Promise<Bounds>;
      setIgnoreMouse: (ignore: boolean) => void;
      moveWindow: (x: number, y: number) => void;
      openContextMenu: (state: {
        fixedEnabled: boolean;
        whisperEnabled: boolean;
        facingRight: boolean;
        renderMode: RenderMode;
      }) => void;
      onMenuCommand: (handler: (cmd: MenuCommand) => void) => void;
      onCursorPos: (handler: (pos: Vec2) => void) => void;
    };
  }
}

const hitArea = document.getElementById('pet-hitarea') as HTMLDivElement;
const squashEl = document.getElementById('pet-squash') as HTMLDivElement;
const flipEl = document.getElementById('pet-flip') as HTMLDivElement;
const motionEl = document.getElementById('pet-motion') as HTMLDivElement;
const canvas3dEl = document.getElementById('pet-3d-canvas') as HTMLCanvasElement;
const spriteEl = document.getElementById('pet-sprite') as HTMLImageElement;
const videoEl = document.getElementById('pet-video') as HTMLVideoElement;
const propEl = document.getElementById('prop-badge') as HTMLDivElement;
const bubbleEl = document.getElementById('bubble') as HTMLDivElement;
const bubbleTextEl = document.getElementById('bubble-text') as HTMLSpanElement;
const bubbleMemeEl = document.getElementById('bubble-meme') as HTMLImageElement;
const fxCanvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
const fxCtx = fxCanvas.getContext('2d')!;

let rt: PetRuntime;
let scene3d: Neko3DScene | null = null;

function syncWindowToPetPos(): void {
  window.petAPI.moveWindow(rt.petPos.x - rt.layout.padX, rt.petPos.y - rt.layout.padTop);
}

function getPetMovementBounds(): Bounds {
  const s = rt.config.pet.size;
  return {
    left: rt.screenBounds.left,
    top: rt.screenBounds.top,
    right: rt.screenBounds.right - s,
    bottom: rt.screenBounds.bottom - s,
  };
}

function updateFacing(facingRight: boolean): void {
  rt.facingRight = facingRight;
  const shouldCssFlip = rt.renderMode === '2d' || !videoEl.classList.contains('hidden');
  flipEl.classList.toggle('facing-right', shouldCssFlip && facingRight);
}

function syncAvatarLayerVisibility(showingWebm: boolean): void {
  if (showingWebm) {
    canvas3dEl.classList.add('hidden');
    spriteEl.classList.add('hidden');
    videoEl.classList.remove('hidden');
    motionEl.className = '';
  } else if (rt.renderMode === '3d') {
    videoEl.classList.add('hidden');
    spriteEl.classList.add('hidden');
    canvas3dEl.classList.remove('hidden');
    motionEl.className = '';
  } else {
    videoEl.classList.add('hidden');
    canvas3dEl.classList.add('hidden');
    spriteEl.classList.remove('hidden');
  }
  updateFacing(rt.facingRight);
}

function triggerSquash(strength: number): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  rt.squashStartMs = performance.now();
  rt.squashUntilMs = rt.squashStartMs + 420;
  rt.squashStrength = strength;
}

function spawnParticles(emojis: readonly string[], count: number, originX?: number, originY?: number): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (emojis.length === 0) return;
  const cx = originX ?? rt.layout.padX + rt.config.pet.size * 0.5;
  const cy = originY ?? rt.layout.padTop + rt.config.pet.size * 0.35;

  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
    const speed = 45 + Math.random() * 90;
    rt.particles.push({
      x: cx + (Math.random() - 0.5) * 48,
      y: cy + (Math.random() - 0.5) * 28,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      text: emojis[Math.floor(Math.random() * emojis.length)],
      alpha: 1,
      scale: 0.9 + Math.random() * 0.4,
    });
  }
}

function spawnScorePopup(score: number): void {
  rt.particles.push({
    x: rt.layout.padX + rt.config.pet.size * 0.5,
    y: rt.layout.padTop + 20,
    vx: 0,
    vy: -75,
    text: `+${score} ★`,
    alpha: 1.2,
    scale: 1.2,
    isScore: true,
  });
}

function showBubble(text: string, memeKey?: string, durationMs = 7500): void {
  bubbleTextEl.textContent = text;
  if (memeKey) {
    bubbleMemeEl.src = `${rt.assetBaseUrl}/memes/${encodeURIComponent(memeKey)}.png`;
    bubbleMemeEl.classList.remove('hidden');
  } else {
    bubbleMemeEl.classList.add('hidden');
  }
  bubbleEl.style.bottom = `${rt.layout.padBottom + rt.config.pet.size + 10}px`;
  bubbleEl.classList.remove('hidden');

  if (rt.bubbleTimerId !== null) window.clearTimeout(rt.bubbleTimerId);
  rt.bubbleTimerId = window.setTimeout(() => {
    bubbleEl.classList.add('hidden');
  }, durationMs);
}

function triggerWhisperNow(): void {
  const payload = pickWhisper(rt.config);
  showBubble(payload.text, payload.memeKey);
  const whisperActions = rt.config.animations.events.whisper;
  if (whisperActions.length > 0 && rt.mode === 'anim') {
    const act = whisperActions[Math.floor(Math.random() * whisperActions.length)];
    playAction({ kind: 'event', name: act });
  }
}

function setSpriteMood(mood: SpriteMood): void {
  spriteEl.src = `${rt.assetBaseUrl}/sprites/${mood}.png`;
}

function playAction(selection: ActionSelection): void {
  if (rt.actionTimerId !== null) {
    window.clearTimeout(rt.actionTimerId);
    rt.actionTimerId = null;
  }

  rt.lastActionName = selection.name;
  if (selection.noMirror && rt.facingRight) {
    updateFacing(false);
  }

  const resolved = resolveActionMedia(selection.name, rt.availableWebms);

  if (resolved.type === 'webm') {
    syncAvatarLayerVisibility(true);
    videoEl.src = `${rt.assetBaseUrl}/webm/${encodeURIComponent(resolved.file)}`;
    videoEl.loop = selection.kind === 'idle' || selection.name.includes('拖拽');
    void videoEl.play().catch(() => {
      syncAvatarLayerVisibility(false);
    });
    propEl.classList.add('hidden');
    rt.currentParticles = ['✨'];
  } else {
    videoEl.pause();
    syncAvatarLayerVisibility(false);
    setSpriteMood(resolved.preset.sprite);
    if (rt.renderMode === '2d') {
      motionEl.className = resolved.preset.motionClass;
    }
    scene3d?.setAction(resolved.preset.sprite, resolved.preset.motionClass);
    rt.currentParticles = resolved.preset.particles;

    if (resolved.preset.propEmoji && rt.renderMode === '2d') {
      propEl.textContent = resolved.preset.propEmoji;
      propEl.classList.remove('hidden');
    } else {
      propEl.classList.add('hidden');
    }

    spawnParticles(resolved.preset.particles, 3);
  }

  if (selection.kind === 'turn') {
    window.setTimeout(() => updateFacing(!rt.facingRight), 900);
  }

  if (selection.kind === 'move' && selection.moveParams) {
    const { targetX, nextFacingRight } = computeMoveDestination(
      rt.petPos.x,
      rt.config.pet.size,
      rt.screenBounds,
      rt.facingRight,
      selection.moveParams,
    );
    updateFacing(nextFacingRight);
    const dist = Math.abs(targetX - rt.petPos.x);
    const walkDurationMs = Math.max(900, Math.round((dist / 120) * 1000));
    rt.mode = 'move';
    rt.walkAnim = {
      startX: rt.petPos.x,
      targetX,
      startMs: performance.now(),
      durationMs: walkDurationMs,
    };
    if (rt.renderMode === '2d') motionEl.className = 'anim-walk';
    scene3d?.setAction('happy', 'anim-walk');
    rt.actionTimerId = window.setTimeout(() => {
      rt.walkAnim = null;
      rt.mode = 'anim';
      scheduleNextAction();
    }, walkDurationMs + 150);
    return;
  }

  if (!selection.name.includes('拖拽')) {
    const dur = resolved.type === 'procedural' ? resolved.preset.durationMs : 4200;
    rt.actionTimerId = window.setTimeout(() => {
      if (rt.mode === 'anim') scheduleNextAction();
    }, dur);
  }
}

function scheduleNextAction(): void {
  const next = rollNextAction(rt.config, rt.facingRight, rt.fixedEnabled);
  playAction(next);
}

function resetToInitialPosition(): void {
  rt.mode = 'anim';
  rt.walkAnim = null;
  rt.projectile = null;
  rt.petPos = {
    x: rt.initialWindowPos.x + rt.layout.padX,
    y: rt.initialWindowPos.y + rt.layout.padTop,
  };
  syncWindowToPetPos();
  triggerSquash(0.32);
  scheduleNextAction();
}

function setupPointerInteractions(): void {
  const interactiveEls = [hitArea, bubbleEl];
  for (const el of interactiveEls) {
    el.addEventListener('mouseenter', () => window.petAPI.setIgnoreMouse(false));
    el.addEventListener('mouseleave', () => {
      if (rt.mode !== 'drag' && rt.mode !== 'orbit') window.petAPI.setIgnoreMouse(true);
    });
  }

  hitArea.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    window.petAPI.openContextMenu({
      fixedEnabled: rt.fixedEnabled,
      whisperEnabled: rt.whisperEnabled,
      facingRight: rt.facingRight,
      renderMode: rt.renderMode,
    });
  });

  hitArea.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    hitArea.setPointerCapture(e.pointerId);

    if (e.shiftKey && rt.renderMode === '3d') {
      rt.mode = 'orbit';
      rt.orbitLast = { x: e.screenX, y: e.screenY };
      hitArea.classList.add('dragging');
      return;
    }

    if (rt.mode === 'throw' && rt.projectile) {
      const speed = Math.hypot(rt.projectile.vel.x, rt.projectile.vel.y);
      const score = computeCatchScore(speed, rt.config.pet.size);
      if (score !== null) {
        spawnScorePopup(score);
        spawnParticles(['⭐', '🌟', '💖'], 7);
      }
    }

    rt.mode = 'drag';
    rt.walkAnim = null;
    rt.projectile = null;
    if (rt.actionTimerId !== null) {
      window.clearTimeout(rt.actionTimerId);
      rt.actionTimerId = null;
    }

    hitArea.classList.add('dragging');
    rt.dragGrabOffset = {
      x: e.screenX - rt.petPos.x,
      y: e.screenY - rt.petPos.y,
    };
    rt.pointerTarget = { x: rt.petPos.x, y: rt.petPos.y };
    rt.dragSpring = { pos: { ...rt.petPos }, vel: { x: 0, y: 0 } };
    rt.dragSamples = [{ x: rt.petPos.x, y: rt.petPos.y, timeMs: performance.now() }];
    rt.dragMovedDist = 0;

    playAction({ kind: 'event', name: rt.config.animations.drag[0] ?? '被鼠标拖拽悬空反馈' });
  });

  window.addEventListener('pointermove', (e) => {
    if (rt.mode === 'orbit') {
      const dx = e.screenX - rt.orbitLast.x;
      const dy = e.screenY - rt.orbitLast.y;
      rt.orbitLast = { x: e.screenX, y: e.screenY };
      scene3d?.setOrbitDelta(dx, dy);
      return;
    }

    if (rt.mode !== 'drag') return;
    const nextX = e.screenX - rt.dragGrabOffset.x;
    const nextY = e.screenY - rt.dragGrabOffset.y;
    rt.dragMovedDist += Math.hypot(nextX - rt.pointerTarget.x, nextY - rt.pointerTarget.y);
    rt.pointerTarget = { x: nextX, y: nextY };
    const now = performance.now();
    rt.dragSamples.push({ x: nextX, y: nextY, timeMs: now });
    if (rt.dragSamples.length > 16) rt.dragSamples.shift();
  });

  const finishDrag = (): void => {
    if (rt.mode === 'orbit') {
      rt.mode = 'anim';
      hitArea.classList.remove('dragging');
      window.petAPI.setIgnoreMouse(true);
      return;
    }

    if (rt.mode !== 'drag') return;
    hitArea.classList.remove('dragging');
    window.petAPI.setIgnoreMouse(true);

    if (rt.dragMovedDist < 10) {
      rt.mode = 'anim';
      rt.dragSpring = null;
      triggerSquash(0.45);
      const reaction = pickClickReaction(rt.config.animations.clicks, rt.lastActionName);
      playAction({ kind: 'click', name: reaction });
      return;
    }

    const throwVel = estimateThrowVelocity(rt.dragSamples, rt.config.physics.throwPower);
    rt.dragSpring = null;

    if (Math.hypot(throwVel.x, throwVel.y) < 10 && rt.config.physics.gravity === 0) {
      rt.mode = 'anim';
      scheduleNextAction();
      return;
    }

    rt.mode = 'throw';
    rt.projectile = { pos: { ...rt.petPos }, vel: throwVel };
  };

  window.addEventListener('pointerup', finishDrag);
  window.addEventListener('pointercancel', finishDrag);
}

function renderParticles(dt: number): void {
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  const alive: Particle[] = [];

  for (const p of rt.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha -= dt * 0.85;
    if (p.alpha <= 0) continue;

    fxCtx.save();
    fxCtx.globalAlpha = Math.min(1, p.alpha);
    if (p.isScore) {
      fxCtx.font = 'bold 20px "Microsoft YaHei UI", sans-serif';
      fxCtx.fillStyle = '#f59e0b';
      fxCtx.strokeStyle = '#ffffff';
      fxCtx.lineWidth = 4;
      fxCtx.strokeText(p.text, p.x, p.y);
      fxCtx.fillText(p.text, p.x, p.y);
    } else {
      fxCtx.font = `${Math.round(18 * p.scale)}px "Segoe UI Emoji", sans-serif`;
      fxCtx.fillText(p.text, p.x, p.y);
    }
    fxCtx.restore();
    alive.push(p);
  }
  rt.particles = alive;
}

let lastFrameMs = performance.now();
function tick(nowMs: number): void {
  const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
  lastFrameMs = nowMs;

  let activeVel: Vec2 = { x: 0, y: 0 };

  if (rt.mode === 'drag' && rt.dragSpring) {
    rt.dragSpring = stepDragSpring(
      rt.dragSpring,
      rt.pointerTarget,
      dt,
      rt.config.physics.throwPower,
    );
    activeVel = rt.dragSpring.vel;
    rt.petPos = { ...rt.dragSpring.pos };
    syncWindowToPetPos();
  } else if (rt.mode === 'throw' && rt.projectile) {
    const step = stepProjectile(
      rt.projectile,
      getPetMovementBounds(),
      rt.config.physics,
      dt,
    );
    rt.projectile = step.nextState;
    activeVel = step.nextState.vel;
    rt.petPos = { ...step.nextState.pos };
    syncWindowToPetPos();

    if (step.landed && step.impactSpeed > 120) {
      const strength = Math.min(0.45, Math.max(0.18, step.impactSpeed / 2000));
      triggerSquash(strength);
    }
    if (step.settled) {
      rt.projectile = null;
      rt.mode = 'anim';
      scheduleNextAction();
    }
  } else if (rt.mode === 'move' && rt.walkAnim) {
    const elapsed = nowMs - rt.walkAnim.startMs;
    const t = Math.min(1, elapsed / rt.walkAnim.durationMs);
    rt.petPos.x = rt.walkAnim.startX + (rt.walkAnim.targetX - rt.walkAnim.startX) * t;
    activeVel = { x: rt.facingRight ? 120 : -120, y: 0 };
    syncWindowToPetPos();
  }

  if (nowMs < rt.squashUntilMs) {
    const progress = (nowMs - rt.squashStartMs) / 420;
    const { scaleX, scaleY } = computeSquashScale(progress, rt.squashStrength);
    squashEl.style.transform = `scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
  } else {
    squashEl.style.transform = '';
  }

  if (rt.renderMode === '3d' && scene3d) {
    const half = rt.config.pet.size * 0.5;
    scene3d.update(dt, {
      cursorScreen: rt.cursorScreen,
      petScreenCenter: { x: rt.petPos.x + half, y: rt.petPos.y + half },
      facingRight: rt.facingRight,
      mode: rt.mode === 'orbit' ? 'anim' : rt.mode,
      velocity: activeVel,
    });
  }

  renderParticles(dt);
  requestAnimationFrame(tick);
}

async function init(): Promise<void> {
  const payload = await window.petAPI.getInitData();
  const { config, layout, screenBounds, initialWindowPos, availableWebms, assetBaseUrl, customModelUrl } = payload;

  hitArea.style.left = `${layout.padX}px`;
  hitArea.style.top = `${layout.padTop}px`;
  hitArea.style.width = `${config.pet.size}px`;
  hitArea.style.height = `${config.pet.size}px`;

  fxCanvas.width = layout.width;
  fxCanvas.height = layout.height;

  const initialPos = {
    x: initialWindowPos.x + layout.padX,
    y: initialWindowPos.y + layout.padTop,
  };

  rt = {
    config,
    layout,
    assetBaseUrl,
    availableWebms: new Set(availableWebms),
    screenBounds,
    initialWindowPos,
    petPos: { ...initialPos },
    cursorScreen: { x: initialPos.x + config.pet.size * 0.5, y: initialPos.y + config.pet.size * 0.5 },
    facingRight: false,
    renderMode: config.pet.renderMode ?? '3d',
    fixedEnabled: config.pet.fixedEnabled,
    whisperEnabled: config.pet.whisperEnabled,
    mode: 'anim',
    lastActionName: '',
    currentParticles: ['✨'],
    actionTimerId: null,
    whisperTimerId: null,
    bubbleTimerId: null,
    dragSpring: null,
    dragGrabOffset: { x: 0, y: 0 },
    dragSamples: [],
    pointerTarget: { x: 0, y: 0 },
    dragMovedDist: 0,
    orbitLast: { x: 0, y: 0 },
    projectile: null,
    squashUntilMs: 0,
    squashStartMs: 0,
    squashStrength: 0.35,
    walkAnim: null,
    particles: [],
  };

  try {
    scene3d = new Neko3DScene(canvas3dEl, config.pet.size, customModelUrl);
  } catch (err) {
    console.warn('[hakimi-pet] WebGL unavailable, falling back to 2D sprites:', err);
    rt.renderMode = '2d';
  }

  window.petAPI.onCursorPos((pos) => {
    rt.cursorScreen = pos;
  });

  setupPointerInteractions();

  window.petAPI.onMenuCommand((cmd) => {
    if (cmd.type === 'whisper-now') {
      triggerWhisperNow();
    } else if (cmd.type === 'reset-position') {
      resetToInitialPosition();
    } else if (cmd.type === 'reset-orbit') {
      scene3d?.resetOrbit();
    } else if (cmd.type === 'set-render-mode') {
      rt.renderMode = cmd.renderMode;
      playAction({ kind: 'idle', name: rt.lastActionName || rt.config.animations.idle[0] });
    } else if (cmd.type === 'toggle-fixed') {
      rt.fixedEnabled = cmd.fixedEnabled;
    } else if (cmd.type === 'toggle-whisper') {
      rt.whisperEnabled = cmd.whisperEnabled;
    } else if (cmd.type === 'play-action') {
      rt.mode = 'anim';
      rt.walkAnim = null;
      rt.projectile = null;
      const moveMatch = rt.config.animations.moves.actions.find((a) => a.name === cmd.name);
      if (moveMatch) {
        playAction({
          kind: 'move',
          name: moveMatch.name,
          moveParams: { ...rt.config.animations.moves.default, ...(moveMatch.params ?? {}) },
        });
      } else {
        playAction({ kind: 'category', name: cmd.name });
      }
    }
  });

  rt.whisperTimerId = window.setInterval(() => {
    if (rt.whisperEnabled && rt.mode === 'anim') {
      triggerWhisperNow();
    }
  }, Math.max(20, config.whisperIntervalSec) * 1000);

  scheduleNextAction();
  const welcomeMsg =
    rt.renderMode === '3d'
      ? 'Ciallo～★ 3D 哈基米上线！Shift+左键拖拽可360°旋转视角哦~'
      : 'Ciallo～★ 哈基米上线啦！右键可以点播动作哦~';
  window.setTimeout(() => showBubble(welcomeMsg, '可爱', 5500), 800);
  requestAnimationFrame(tick);
}

void init();
