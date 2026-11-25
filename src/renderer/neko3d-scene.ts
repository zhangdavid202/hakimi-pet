import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { computeLookAtAngles, dampAngle } from '../shared/lookat';
import type { SpriteMood, Vec2 } from '../shared/types';

export interface SceneUpdateState {
  readonly cursorScreen: Vec2;
  readonly petScreenCenter: Vec2;
  readonly facingRight: boolean;
  readonly mode: 'anim' | 'drag' | 'throw' | 'move';
  readonly velocity: Vec2;
}

/**
 * Optional Three.js GLB viewer activated only when the user supplies `assets/models/hakimi.glb`.
 */
export class Neko3DScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private customModel: THREE.Group | null = null;

  private mood: SpriteMood = 'idle';
  private motionClass = 'anim-idle';
  private timeSec = 0;
  private orbitYaw = 0;
  private orbitPitch = 0;
  private currentYaw = 0;
  private currentPitch = 0;

  constructor(canvas: HTMLCanvasElement, sizePx: number, customModelUrl: string) {
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
    this.camera.position.set(0, 1.15, 4.2);
    this.camera.lookAt(0, 1.0, 0);

    const hemi = new THREE.HemisphereLight(0xfff7ff, 0x6d5acd, 1.4);
    const key = new THREE.DirectionalLight(0xfff5ec, 1.45);
    key.position.set(2.2, 3.8, 3.2);
    const rim = new THREE.DirectionalLight(0xc084fc, 0.85);
    rim.position.set(-2.5, 2.2, -2.5);
    this.scene.add(hemi, key, rim);

    this.loadCustomGlb(customModelUrl);
  }

  private loadCustomGlb(url: string): void {
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

        this.customModel = new THREE.Group();
        this.customModel.add(model);
        this.scene.add(this.customModel);
      },
      undefined,
      (err) => {
        console.warn('[hakimi-pet] Failed to load custom GLB:', err);
      },
    );
  }

  public setAction(mood: SpriteMood, motionClass: string): void {
    this.mood = mood;
    this.motionClass = motionClass;
  }

  public setOrbitDelta(dxPx: number, dyPx: number): void {
    this.orbitYaw += dxPx * 0.012;
    this.orbitPitch = Math.min(0.65, Math.max(-0.55, this.orbitPitch + dyPx * 0.009));
  }

  public resetOrbit(): void {
    this.orbitYaw = 0;
    this.orbitPitch = 0;
  }

  public update(dt: number, state: SceneUpdateState): void {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    this.timeSec += safeDt;

    if (this.customModel) {
      const look = computeLookAtAngles(state.cursorScreen, state.petScreenCenter, state.facingRight);
      const baseFacing = state.facingRight ? 0.35 : -0.35;
      const spinExtra = this.motionClass === 'anim-spin' ? this.timeSec * 3.5 : 0;

      this.currentYaw = dampAngle(this.currentYaw, baseFacing + this.orbitYaw + look.yaw * 0.45, 9, safeDt);
      this.currentPitch = dampAngle(this.currentPitch, this.orbitPitch + look.pitch * 0.3, 9, safeDt);

      this.customModel.rotation.y = this.currentYaw + spinExtra;
      this.customModel.rotation.x = this.currentPitch;

      const bobAmp = this.mood === 'happy' || state.mode === 'move' ? 0.08 : 0.02;
      const bobSpeed = this.mood === 'happy' || state.mode === 'move' ? 6 : 2.4;
      this.customModel.position.y = Math.sin(this.timeSec * bobSpeed) * bobAmp;
      this.customModel.rotation.z = Math.max(-0.25, Math.min(0.25, -state.velocity.x * 0.0003));
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
