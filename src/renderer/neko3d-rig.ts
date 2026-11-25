import * as THREE from 'three';
import type { SpriteMood } from '../shared/types';

export interface EyeRig {
  readonly pupilGroup: THREE.Group;
  readonly eyelid: THREE.Mesh;
  readonly basePupilPos: THREE.Vector3;
}

export interface HakimiRig {
  readonly root: THREE.Group;
  readonly bodyGroup: THREE.Group;
  readonly headGroup: THREE.Group;
  readonly backHairPivot: THREE.Group;
  readonly leftEar: THREE.Group;
  readonly rightEar: THREE.Group;
  readonly leftArm: THREE.Group;
  readonly rightArm: THREE.Group;
  readonly leftLeg: THREE.Group;
  readonly rightLeg: THREE.Group;
  readonly tailSegments: readonly THREE.Group[];
  readonly leftEye: EyeRig;
  readonly rightEye: EyeRig;
  readonly riceBowlProp: THREE.Group;
  readonly magicStarProp: THREE.Group;
  setExpression: (mood: SpriteMood) => void;
  setBlinkAmount: (amount: number) => void;
  dispose: () => void;
}

function createStarShape(outerR: number, innerR: number, points = 4): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createStarMesh(
  outerR: number,
  color: number,
  emissive: number,
  depth = 0.025,
): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(createStarShape(outerR, outerR * 0.42, 4), {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  geo.center();
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.35,
  });
  return new THREE.Mesh(geo, mat);
}

function drawFaceTexture(mood: SpriteMood): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm anime skin base
  ctx.fillStyle = '#ffe9de';
  ctx.fillRect(0, 0, 512, 512);

  // Soft cheek blush centered on front (+Z maps around u=0.5, v=0.52)
  const blushAlpha = mood === 'shy' ? 0.65 : mood === 'angry' ? 0.45 : 0.32;
  for (const bx of [214, 298]) {
    const grad = ctx.createRadialGradient(bx, 286, 2, bx, 286, 26);
    grad.addColorStop(0, `rgba(255, 118, 148, ${blushAlpha})`);
    grad.addColorStop(1, 'rgba(255, 118, 148, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, 286, 26, 0, Math.PI * 2);
    ctx.fill();

    if (mood === 'shy') {
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
      ctx.lineWidth = 2.5;
      for (const sx of [-8, 0, 8]) {
        ctx.beginPath();
        ctx.moveTo(bx + sx - 3, 291);
        ctx.lineTo(bx + sx + 3, 281);
        ctx.stroke();
      }
    }
  }

  // Cute tiny dot nose
  ctx.fillStyle = '#d99b8c';
  ctx.beginPath();
  ctx.arc(256, 272, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Mouth & brows expression
  ctx.strokeStyle = '#4a2538';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (mood === 'happy' || mood === 'eat') {
    ctx.fillStyle = '#f47286';
    ctx.beginPath();
    ctx.moveTo(239, 294);
    ctx.quadraticCurveTo(256, 316, 273, 294);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cute tiny fang
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(264, 295);
    ctx.lineTo(269, 295);
    ctx.lineTo(266.5, 302);
    ctx.closePath();
    ctx.fill();
  } else if (mood === 'angry') {
    ctx.beginPath();
    ctx.moveTo(242, 302);
    ctx.quadraticCurveTo(256, 291, 270, 302);
    ctx.stroke();
    // Angled tsundere brows
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(205, 224);
    ctx.lineTo(234, 234);
    ctx.moveTo(307, 224);
    ctx.lineTo(278, 234);
    ctx.stroke();
  } else if (mood === 'shy') {
    ctx.beginPath();
    ctx.moveTo(240, 298);
    ctx.quadraticCurveTo(248, 292, 256, 298);
    ctx.quadraticCurveTo(264, 304, 272, 298);
    ctx.stroke();
  } else if (mood === 'sleep') {
    ctx.beginPath();
    ctx.moveTo(245, 298);
    ctx.quadraticCurveTo(256, 304, 267, 298);
    ctx.stroke();
  } else {
    // idle cute cat ":3" mouth with tiny fang
    ctx.beginPath();
    ctx.moveTo(240, 296);
    ctx.quadraticCurveTo(248, 304, 256, 296);
    ctx.quadraticCurveTo(264, 304, 272, 296);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(265, 298);
    ctx.lineTo(270, 297);
    ctx.lineTo(268, 304);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildEye(irisColor: number, xOffset: number, skinMat: THREE.Material): EyeRig {
  const eyeRoot = new THREE.Group();
  eyeRoot.position.set(xOffset, 0.02, 0.44);
  eyeRoot.rotation.y = xOffset * 0.28;

  const scleraGeo = new THREE.SphereGeometry(0.088, 20, 16);
  scleraGeo.scale(0.95, 1.15, 0.35);
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sclera = new THREE.Mesh(scleraGeo, scleraMat);
  eyeRoot.add(sclera);

  const pupilGroup = new THREE.Group();
  const basePupilPos = new THREE.Vector3(0, 0, 0.022);
  pupilGroup.position.copy(basePupilPos);

  const irisGeo = new THREE.SphereGeometry(0.064, 18, 16);
  irisGeo.scale(0.92, 1.15, 0.32);
  const irisMat = new THREE.MeshBasicMaterial({ color: irisColor });
  const iris = new THREE.Mesh(irisGeo, irisMat);
  pupilGroup.add(iris);

  const coreGeo = new THREE.SphereGeometry(0.032, 14, 12);
  coreGeo.scale(0.9, 1.1, 0.38);
  const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0x261030 }));
  core.position.z = 0.008;
  pupilGroup.add(core);

  const highlightBig = new THREE.Mesh(
    new THREE.SphereGeometry(0.017, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  highlightBig.position.set(-0.022, 0.03, 0.019);
  pupilGroup.add(highlightBig);

  const highlightSmall = new THREE.Mesh(
    new THREE.SphereGeometry(0.009, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  highlightSmall.position.set(0.02, -0.022, 0.018);
  pupilGroup.add(highlightSmall);

  eyeRoot.add(pupilGroup);

  // Upper eyelash arc
  const lashGeo = new THREE.BoxGeometry(0.175, 0.022, 0.04);
  const lash = new THREE.Mesh(lashGeo, new THREE.MeshBasicMaterial({ color: 0x3b1e2e }));
  lash.position.set(0, 0.095, 0.022);
  lash.rotation.z = xOffset > 0 ? 0.08 : -0.08;
  eyeRoot.add(lash);

  // Eyelid shutter for blinking / sleeping
  const lidGeo = new THREE.SphereGeometry(0.094, 16, 12);
  lidGeo.scale(1.02, 1.18, 0.42);
  const eyelid = new THREE.Mesh(lidGeo, skinMat);
  eyelid.position.set(0, 0.08, 0.012);
  eyelid.scale.y = 0.05;
  eyeRoot.add(eyelid);

  return { pupilGroup, eyelid, basePupilPos };
}

function buildCatEar(side: -1 | 1, hairMat: THREE.Material, pinkMat: THREE.Material): THREE.Group {
  const earGroup = new THREE.Group();
  earGroup.position.set(side * 0.29, 0.42, 0.02);
  earGroup.rotation.z = -side * 0.34;
  earGroup.rotation.x = 0.12;

  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 4), hairMat);
  outer.rotation.y = Math.PI / 4;
  outer.position.y = 0.12;
  earGroup.add(outer);

  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.22, 4), pinkMat);
  inner.rotation.y = Math.PI / 4;
  inner.position.set(0, 0.1, 0.045);
  earGroup.add(inner);

  return earGroup;
}

/**
 * Construct the rigged 3D Q-version starry catgirl model (哈基米).
 */
export function createHakimiRig(): HakimiRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe9de, roughness: 0.72 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x8d8bf6, roughness: 0.52 });
  const hairTipMat = new THREE.MeshStandardMaterial({ color: 0xc29eff, roughness: 0.55 });
  const indigoMat = new THREE.MeshStandardMaterial({ color: 0x2f2863, roughness: 0.55 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f9ff, roughness: 0.62 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf6c957, roughness: 0.3, metalness: 0.45 });
  const earPinkMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.7 });
  const lavenderMat = new THREE.MeshStandardMaterial({ color: 0xb18cfe, roughness: 0.5 });

  // Legs & Shoes
  const buildLeg = (side: -1 | 1): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.13, 0.56, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.26, 8, 12), skinMat);
    thigh.position.y = -0.22;
    leg.add(thigh);

    if (side === -1) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.012, 8, 20), indigoMat);
      strap.rotation.x = Math.PI / 2;
      strap.position.y = -0.15;
      leg.add(strap);
      const charm = createStarMesh(0.036, 0x9be7ff, 0x7c3aed, 0.012);
      charm.position.set(0, -0.19, 0.078);
      leg.add(charm);
    }

    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.064, 0.07, 14), whiteMat);
    sock.position.y = -0.41;
    leg.add(sock);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.1, 0.22), indigoMat);
    shoe.position.set(0, -0.5, 0.03);
    leg.add(shoe);

    const shoeStar = createStarMesh(0.025, 0xf6c957, 0xf59e0b, 0.01);
    shoeStar.position.set(0, -0.46, 0.142);
    leg.add(shoeStar);

    return leg;
  };

  const leftLeg = buildLeg(1);
  const rightLeg = buildLeg(-1);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso & Starry Idol Dress
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.44, 18), indigoMat);
  torso.position.y = 0.84;
  bodyGroup.add(torso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.042, 10, 24), whiteMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.01;
  bodyGroup.add(collar);

  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.03), lavenderMat);
  tie.position.set(0, 0.86, 0.205);
  bodyGroup.add(tie);

  const chestStar = createStarMesh(0.052, 0xa5f3fc, 0x8b5cf6, 0.018);
  chestStar.position.set(0, 0.99, 0.225);
  bodyGroup.add(chestStar);

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.34, 24, 1, true), indigoMat);
  skirt.position.y = 0.61;
  bodyGroup.add(skirt);

  const petticoat = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.26, 20), whiteMat);
  petticoat.position.y = 0.56;
  bodyGroup.add(petticoat);

  const waistTrim = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.014, 8, 24), goldMat);
  waistTrim.rotation.x = Math.PI / 2;
  waistTrim.position.y = 0.67;
  bodyGroup.add(waistTrim);

  // Arms
  const buildArm = (side: -1 | 1): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.26, 0.99, 0);

    const sleeve = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.3, 14), indigoMat);
    sleeve.position.y = -0.15;
    arm.add(sleeve);

    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.018, 8, 16), whiteMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.29;
    arm.add(cuff);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 12), skinMat);
    hand.position.y = -0.35;
    arm.add(hand);

    return arm;
  };

  const leftArm = buildArm(1);
  const rightArm = buildArm(-1);
  bodyGroup.add(leftArm, rightArm);

  // Hand props
  const riceBowlProp = new THREE.Group();
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    whiteMat,
  );
  const rice = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), whiteMat);
  rice.scale.y = 0.55;
  rice.position.y = 0.01;
  const bowlStar = createStarMesh(0.032, 0xf6c957, 0xf59e0b, 0.01);
  bowlStar.position.set(0, -0.055, 0.118);
  riceBowlProp.add(bowl, rice, bowlStar);
  riceBowlProp.position.set(0, 0.88, 0.42);
  riceBowlProp.visible = false;
  bodyGroup.add(riceBowlProp);

  const magicStarProp = new THREE.Group();
  const holoStar = createStarMesh(0.13, 0x7dd3fc, 0xa855f7, 0.03);
  magicStarProp.add(holoStar);
  magicStarProp.position.set(0.36, 1.05, 0.32);
  magicStarProp.visible = false;
  bodyGroup.add(magicStarProp);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.08, 0);
  bodyGroup.add(headGroup);

  let faceTex = drawFaceTexture('idle');
  const headMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.72 });
  const headGeo = new THREE.SphereGeometry(0.47, 32, 28);
  headGeo.scale(1.06, 0.96, 0.96);
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.y = 0.41;
  // Rotate so u=0.5 of texture faces +Z
  headMesh.rotation.y = -Math.PI / 2;
  headGroup.add(headMesh);

  // Eyes (viewer left = character right = pink; viewer right = character left = gold)
  const eyeCenterGroup = new THREE.Group();
  eyeCenterGroup.position.y = 0.38;
  const rightEye = buildEye(0xec4899, -0.175, skinMat);
  const leftEye = buildEye(0xf5b700, 0.175, skinMat);
  eyeCenterGroup.add(rightEye.pupilGroup.parent!, leftEye.pupilGroup.parent!);
  headGroup.add(eyeCenterGroup);

  // Hair cap, bangs, buns & star hairclip
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.495, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat,
  );
  hairCap.position.set(0, 0.43, -0.02);
  hairCap.rotation.x = -0.18;
  headGroup.add(hairCap);

  for (const bx of [-0.22, -0.08, 0.08, 0.22]) {
    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 10), hairMat);
    bang.position.set(bx, 0.52, 0.41 - Math.abs(bx) * 0.25);
    bang.rotation.z = Math.PI + bx * 0.6;
    bang.rotation.x = -0.2;
    headGroup.add(bang);
  }

  for (const side of [-1, 1] as const) {
    const sideLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.44, 8, 12), hairTipMat);
    sideLock.position.set(side * 0.42, 0.16, 0.16);
    sideLock.rotation.z = side * 0.18;
    headGroup.add(sideLock);

    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 14), hairMat);
    bun.position.set(side * 0.44, 0.6, -0.06);
    headGroup.add(bun);
  }

  const starClip = createStarMesh(0.145, 0x93c5fd, 0xc084fc, 0.03);
  starClip.position.set(0.35, 0.67, 0.26);
  starClip.rotation.y = 0.45;
  headGroup.add(starClip);

  const ahoge = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.024, 8, 16, Math.PI * 1.15), hairMat);
  ahoge.position.set(0.02, 0.92, 0);
  ahoge.rotation.z = -0.4;
  headGroup.add(ahoge);

  // Back wavy hair curtain
  const backHairPivot = new THREE.Group();
  backHairPivot.position.set(0, 0.46, -0.34);
  for (const x of [-0.28, 0, 0.28]) {
    const strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.72, 8, 12), hairTipMat);
    strand.position.set(x, -0.38, Math.abs(x) * 0.15);
    strand.rotation.z = x * 0.28;
    backHairPivot.add(strand);
  }
  headGroup.add(backHairPivot);

  // Cat ears
  const leftEar = buildCatEar(1, hairMat, earPinkMat);
  const rightEar = buildCatEar(-1, hairMat, earPinkMat);
  leftEar.position.y = 0.76;
  rightEar.position.y = 0.76;
  headGroup.add(leftEar, rightEar);

  // 5-segment fluffy cat tail
  const tailSegments: THREE.Group[] = [];
  let parentTail: THREE.Object3D = bodyGroup;
  for (let i = 0; i < 5; i += 1) {
    const seg = new THREE.Group();
    if (i === 0) {
      seg.position.set(0, 0.62, -0.22);
      seg.rotation.x = -0.7;
    } else {
      seg.position.set(0, 0, -0.16);
      seg.rotation.x = 0.28;
    }
    const fluff = new THREE.Mesh(
      new THREE.SphereGeometry(0.068 + i * 0.008, 12, 10),
      i >= 3 ? hairTipMat : hairMat,
    );
    fluff.scale.set(1, 1, 1.45);
    fluff.position.z = -0.08;
    seg.add(fluff);
    parentTail.add(seg);
    tailSegments.push(seg);
    parentTail = seg;
  }

  let currentMood: SpriteMood = 'idle';

  const setExpression = (mood: SpriteMood): void => {
    if (mood === currentMood) return;
    currentMood = mood;
    const nextTex = drawFaceTexture(mood);
    headMat.map = nextTex;
    headMat.needsUpdate = true;
    faceTex.dispose();
    faceTex = nextTex;
  };

  const setBlinkAmount = (amount: number): void => {
    const clamped = Math.min(1, Math.max(0, amount));
    const scaleY = 0.05 + clamped * 0.96;
    const posY = 0.08 - clamped * 0.078;
    leftEye.eyelid.scale.y = scaleY;
    leftEye.eyelid.position.y = posY;
    rightEye.eyelid.scale.y = scaleY;
    rightEye.eyelid.position.y = posY;
  };

  const dispose = (): void => {
    faceTex.dispose();
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  };

  return {
    root,
    bodyGroup,
    headGroup,
    backHairPivot,
    leftEar,
    rightEar,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    tailSegments,
    leftEye,
    rightEye,
    riceBowlProp,
    magicStarProp,
    setExpression,
    setBlinkAmount,
    dispose,
  };
}
