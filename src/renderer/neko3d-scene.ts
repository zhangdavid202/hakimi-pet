import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { computeLookAtAngles, computeTailWave, dampAngle } from '../shared/lookat';
import type { SpriteMood, Vec2 } from '../shared/types';
import { createHakimiRig, HakimiRig } from './neko3d-rig';

export interface SceneUpdateState {
  readonly cursorScreen: Vec2;
  readonly petScreenCenter: Vec2;
  readonly facingRight: boolean;
  readonly mode: 'anim' | 'drag' | 'throw' | 'move';
  readonly velocity: Vec2;
}

export class Neko3DScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly rig: HakimiRig;
  private customModel: THREE.Group | null = null;

  private mood: SpriteMood = 'idle';
  private motionClass = 'anim-idle';
  private timeSec = 0;
  private orbitYaw = 0;
  private orbitPitch = 0;
  private currentYaw = 0;
  private headYaw = 0;
  private headPitch = 0;
  private blinkTimer = 2.8;
  private earTwitchTimer = 4.2;

  constructor(canvas: HTMLCanvasElement, sizePx: number, customModelUrl?: string) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(sizePx, sizePx, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    this.camera.position.set(0, 1.15, 4.35);
    this.camera.lookAt(0, 1.02, 0);

    const hemi = new THREE.HemisphereLight(0xfff7ff, 0x6d5acd, 1.35);
    const key = new THREE.DirectionalLight(0xfff5ec, 1.45);
    key.position.set(2.2, 3.8, 3.2);
    const rim = new THREE.DirectionalLight(0xc084fc, 0.9);
    rim.position.set(-2.5, 2.2, -2.5);
    this.scene.add(hemi, key, rim);

    this.rig = createHakimiRig();
    this.scene.add(this.rig.root);

    if (customModelUrl) {
      this.tryLoadCustomGlb(customModelUrl);
    }
  }

  private tryLoadCustomGlb(url: string): void {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const height = Math.max(0.01, box.max.y - box.min.y);
        const scale = 2.0 / height;
        model.scale.setScalar(scale);
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);

        this.rig.root.visible = false;
        this.customModel = new THREE.Group();
        this.customModel.add(model);
        this.scene.add(this.customModel);
      },
      undefined,
      (err) => {
        console.warn('[hakimi-pet] Failed to load custom GLB, using built-in 3D rig:', err);
      },
    );
  }

  public setAction(mood: SpriteMood, motionClass: string): void {
    this.mood = mood;
    this.motionClass = motionClass;
    this.rig.setExpression(mood);
    this.rig.riceBowlProp.visible = mood === 'eat';
    this.rig.magicStarProp.visible = motionClass === 'anim-work';
  }

  public setOrbitDelta(dxPx: number, dyPx: number): void {
    this.orbitYaw += dxPx * 0.012;
    this.orbitPitch = Math.min(0.65, Math.max(-0.55, this.orbitPitch + dyPx * 0.009));
  }

  public resetOrbit(): void {
    this.orbitYaw = 0;
    this.orbitPitch = 0;
  }

  public resize(sizePx: number): void {
    this.renderer.setSize(sizePx, sizePx, false);
  }

  public update(dt: number, state: SceneUpdateState): void {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    this.timeSec += safeDt;

    const targetRoot = this.customModel ?? this.rig.root;
    const baseFacingYaw = state.facingRight ? 0.35 : -0.35;
    const spinExtra = this.motionClass === 'anim-spin' ? this.timeSec * 3.8 : 0;
    this.currentYaw = dampAngle(this.currentYaw, baseFacingYaw + this.orbitYaw, 9, safeDt);
    targetRoot.rotation.y = this.currentYaw + spinExtra;
    targetRoot.rotation.x = dampAngle(targetRoot.rotation.x, this.orbitPitch, 9, safeDt);

    if (!this.customModel) {
      this.animateRig(safeDt, state);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private animateRig(dt: number, state: SceneUpdateState): void {
    const t = this.timeSec;
    const look = computeLookAtAngles(state.cursorScreen, state.petScreenCenter, state.facingRight);
    this.headYaw = dampAngle(this.headYaw, look.yaw, 10, dt);
    this.headPitch = dampAngle(this.headPitch, look.pitch, 10, dt);

    // Blinking & sleep eyelids
    if (this.mood === 'sleep') {
      this.rig.setBlinkAmount(1);
    } else {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) this.blinkTimer = 2.6 + Math.random() * 2.5;
      const blink = this.blinkTimer < 0.14 ? Math.sin((this.blinkTimer / 0.14) * Math.PI) : 0;
      this.rig.setBlinkAmount(blink);
    }

    // Pupils follow cursor
    const px = look.eyeX * 0.022;
    const py = look.eyeY * 0.018;
    for (const eye of [this.rig.leftEye, this.rig.rightEye]) {
      eye.pupilGroup.position.set(
        eye.basePupilPos.x + px,
        eye.basePupilPos.y + py,
        eye.basePupilPos.z,
      );
    }

    // Pose baseline
    let bodyY = Math.sin(t * 2.4) * 0.025;
    let bodyTiltZ = 0;
    let lArmZ = 0.28 + Math.sin(t * 2.4) * 0.05;
    let rArmZ = -0.28 - Math.sin(t * 2.4) * 0.05;
    let lArmX = 0;
    let rArmX = 0;
    let lLegX = 0;
    let rLegX = 0;
    let moodEnergy = 1.0;

    if (state.mode === 'drag' || this.motionClass === 'anim-drag') {
      bodyTiltZ = Math.max(-0.35, Math.min(0.35, -state.velocity.x * 0.00045)) + Math.sin(t * 10) * 0.08;
      lArmZ = 1.25;
      rArmZ = -1.25;
      lLegX = Math.sin(t * 14) * 0.38;
      rLegX = -Math.sin(t * 14) * 0.38;
      moodEnergy = 1.9;
    } else if (state.mode === 'move' || this.motionClass === 'anim-walk') {
      bodyY = Math.abs(Math.sin(t * 9)) * 0.1;
      lLegX = Math.sin(t * 9) * 0.55;
      rLegX = -Math.sin(t * 9) * 0.55;
      lArmX = -Math.sin(t * 9) * 0.45;
      rArmX = Math.sin(t * 9) * 0.45;
      moodEnergy = 1.5;
    } else if (this.mood === 'happy' || this.motionClass === 'anim-happy') {
      bodyY = Math.abs(Math.sin(t * 5.6)) * 0.18;
      lArmZ = 1.85 + Math.sin(t * 8) * 0.35;
      rArmZ = -0.65 - Math.cos(t * 8) * 0.2;
      moodEnergy = 1.8;
    } else if (this.mood === 'angry') {
      bodyTiltZ = Math.sin(t * 16) * 0.04;
      lArmZ = 0.65;
      rArmZ = -0.65;
      lArmX = -0.3;
      rArmX = -0.3;
      moodEnergy = 2.1;
    } else if (this.mood === 'shy') {
      bodyY = -0.04;
      lArmZ = -0.22;
      rArmZ = 0.22;
      lArmX = -1.15;
      rArmX = -1.15;
      moodEnergy = 0.7;
    } else if (this.mood === 'sleep') {
      bodyY = -0.14 + Math.sin(t * 1.4) * 0.018;
      lLegX = -1.05;
      rLegX = -1.05;
      moodEnergy = 0.35;
    } else if (this.mood === 'eat') {
      lArmX = -0.95;
      rArmX = -0.95 + Math.sin(t * 7) * 0.22;
      lArmZ = -0.15;
      rArmZ = 0.15;
    } else if (this.motionClass === 'anim-work') {
      lArmX = -0.6 + Math.sin(t * 8) * 0.15;
      rArmX = -0.6 + Math.cos(t * 8) * 0.15;
      this.rig.magicStarProp.rotation.y = t * 2.2;
      this.rig.magicStarProp.position.y = 1.05 + Math.sin(t * 3) * 0.06;
    }

    this.rig.bodyGroup.position.y = bodyY;
    this.rig.bodyGroup.rotation.z = bodyTiltZ;
    this.rig.headGroup.rotation.y = this.headYaw * (this.mood === 'sleep' ? 0.15 : 1);
    this.rig.headGroup.rotation.x = this.headPitch * (this.mood === 'sleep' ? 0.15 : 1) + (this.mood === 'sleep' ? 0.22 : 0);

    this.rig.leftArm.rotation.set(lArmX, 0, lArmZ);
    this.rig.rightArm.rotation.set(rArmX, 0, rArmZ);
    this.rig.leftLeg.rotation.x = lLegX;
    this.rig.rightLeg.rotation.x = rLegX;

    // Ear twitch & shy fold
    this.earTwitchTimer -= dt;
    if (this.earTwitchTimer <= 0) this.earTwitchTimer = 3.5 + Math.random() * 4;
    const twitch = this.earTwitchTimer < 0.2 ? Math.sin((this.earTwitchTimer / 0.2) * Math.PI) * 0.28 : 0;
    const shyFold = this.mood === 'shy' ? 0.28 : this.mood === 'sleep' ? 0.18 : 0;
    this.rig.leftEar.rotation.z = -0.34 - shyFold - twitch;
    this.rig.rightEar.rotation.z = 0.34 + shyFold;

    // Back hair & 5-segment tail wave
    this.rig.backHairPivot.rotation.x = 0.08 + Math.sin(t * 2.2) * 0.04;
    this.rig.backHairPivot.rotation.z = Math.max(-0.25, Math.min(0.25, -state.velocity.x * 0.0003));

    this.rig.tailSegments.forEach((seg, i) => {
      const wave = computeTailWave(i, t, moodEnergy);
      seg.rotation.y = wave.rotY;
      seg.rotation.z = wave.rotZ;
    });
  }

  public dispose(): void {
    this.rig.dispose();
    this.renderer.dispose();
  }
}
