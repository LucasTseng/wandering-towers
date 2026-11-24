import * as THREE from 'three';
import type { MaterialLibrary } from './materials';
import type { TextureLibrary } from './textures';
import { mulberry32 } from './textures';
import { BOARD_TOP } from './layout';

/**
 * 环境美术层：悬浮棋盘、中央岩台与废墟、水池瀑布、植被、浮岛、云、远景山、尘埃。
 *
 * 这一层是静态的（建一次即可），只有云、浮岛、尘埃在动画循环里轻微飘移；
 * 塔/巫师/城堡属于「棋子层」，由 SceneController 在状态变化时重建。
 */

export interface EnvironmentDeps {
  lib: TextureLibrary;
  mats: MaterialLibrary;
}

export interface EnvironmentRuntime {
  root: THREE.Group;
  clouds: THREE.Sprite[];
  cloudShadows: THREE.Mesh[];
  floatingIslands: THREE.Group[];
  motes: THREE.Points | null;
  ruin: THREE.Group | null;
  water: THREE.Mesh | null;
}

export function createEnvironment(deps: EnvironmentDeps): EnvironmentRuntime {
  const { lib, mats } = deps;
  const root = new THREE.Group();
  root.name = 'environment';

  const runtime: EnvironmentRuntime = {
    root,
    clouds: [],
    cloudShadows: [],
    floatingIslands: [],
    motes: null,
    ruin: null,
    water: null,
  };

  // ---------- 棋盘基座 ----------
  const board = new THREE.Group();
  root.add(board);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(9.13, 9.38, 0.7, 96, 1), [
    mats.boardSide,
    mats.boardTop,
    mats.boardBottom,
  ]);
  base.position.y = 0.25;
  base.receiveShadow = true;
  base.castShadow = true;
  board.add(base);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(9.16, 0.105, 10, 96), mats.gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.59;
  rim.castShadow = true;
  board.add(rim);

  const rimDark = new THREE.Mesh(new THREE.TorusGeometry(9.0, 0.055, 8, 96), mats.iron);
  rimDark.rotation.x = Math.PI / 2;
  rimDark.position.y = 0.575;
  board.add(rimDark);

  const lower = new THREE.Mesh(new THREE.CylinderGeometry(9.1, 8.15, 0.75, 64, 1), mats.rock);
  lower.position.y = -0.45;
  lower.castShadow = true;
  lower.receiveShadow = true;
  board.add(lower);

  const keel = new THREE.Mesh(new THREE.ConeGeometry(7.9, 2.4, 48, 2), mats.rock);
  keel.position.y = -1.92;
  keel.rotation.z = Math.PI;
  keel.castShadow = true;
  board.add(keel);

  const rockRandom = mulberry32(881);
  for (let i = 0; i < 12; i += 1) {
    const a = rockRandom() * Math.PI * 2;
    const r = 6.8 + rockRandom() * 2.1;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rockRandom() * 0.75, 0), mats.rock);
    rock.position.set(Math.cos(a) * r, -1.0 - rockRandom() * 1.15, Math.sin(a) * r);
    rock.scale.set(1 + rockRandom() * 0.6, 0.7 + rockRandom() * 1.1, 1 + rockRandom() * 0.5);
    rock.rotation.set(rockRandom() * 3, rockRandom() * 3, rockRandom() * 3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    board.add(rock);
  }

  // ---------- 环形石板路（地块之间的接缝压在地面纹理上） ----------
  const pathMaterial = new THREE.MeshStandardMaterial({
    map: lib.stone,
    color: 0x60614a,
    roughness: 0.98,
    envMapIntensity: 0.04,
  });
  const pathRing = new THREE.Mesh(new THREE.RingGeometry(4.92, 8.18, 96, 8), pathMaterial);
  pathRing.rotation.x = -Math.PI / 2;
  pathRing.position.y = BOARD_TOP + 0.008;
  pathRing.receiveShadow = true;
  board.add(pathRing);
  const pathLip = new THREE.Mesh(
    new THREE.TorusGeometry(8.16, 0.04, 6, 96),
    new THREE.MeshStandardMaterial({ color: 0x6c664b, roughness: 0.9 }),
  );
  pathLip.rotation.x = Math.PI / 2;
  pathLip.position.y = BOARD_TOP + 0.018;
  pathLip.receiveShadow = true;
  board.add(pathLip);

  // ---------- 中央岩台 ----------
  const plateau = new THREE.Group();
  root.add(plateau);

  const cliffGeometry = new THREE.CylinderGeometry(3.03, 3.58, 0.74, 64, 8, true);
  const cliffPosition = cliffGeometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cliffPosition.count; i += 1) {
    const x = cliffPosition.getX(i);
    const y = cliffPosition.getY(i);
    const z = cliffPosition.getZ(i);
    const angle = Math.atan2(z, x);
    const depth = Math.max(0, (0.36 - y) / 0.73);
    const noise =
      1 +
      Math.sin(angle * 7 + 0.6) * 0.035 * depth +
      Math.sin(angle * 13 - 1.1) * 0.023 * depth +
      Math.cos(angle * 3 + depth * 5) * 0.026 * depth;
    cliffPosition.setXYZ(i, x * noise, y + Math.sin(angle * 5 + 1.2) * 0.018 * depth, z * noise);
  }
  cliffGeometry.computeVertexNormals();
  const cliff = new THREE.Mesh(cliffGeometry, mats.rock);
  cliff.position.y = BOARD_TOP + 0.37;
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  plateau.add(cliff);

  const cliffRim = new THREE.Mesh(new THREE.TorusGeometry(3.02, 0.07, 6, 48), mats.rock);
  cliffRim.rotation.x = Math.PI / 2;
  cliffRim.position.y = BOARD_TOP + 0.75;
  cliffRim.castShadow = true;
  plateau.add(cliffRim);

  const plateauTop = new THREE.Mesh(new THREE.CylinderGeometry(3.08, 3.0, 0.11, 48, 1), mats.grass);
  plateauTop.position.y = BOARD_TOP + 0.79;
  plateauTop.castShadow = true;
  plateauTop.receiveShadow = true;
  plateau.add(plateauTop);

  const plateauRandom = mulberry32(5271);
  for (let i = 0; i < 13; i += 1) {
    const a = plateauRandom() * Math.PI * 2;
    const radius = 2.75 + plateauRandom() * 0.4;
    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.18 + plateauRandom() * 0.32, 0),
      mats.rock,
    );
    boulder.position.set(
      Math.cos(a) * radius,
      BOARD_TOP + 0.7 + plateauRandom() * 0.2,
      Math.sin(a) * radius,
    );
    boulder.scale.y = 0.75 + plateauRandom() * 0.8;
    boulder.rotation.set(plateauRandom() * 2, plateauRandom() * 3, plateauRandom() * 2);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    plateau.add(boulder);
  }
  for (let i = 0; i < 24; i += 1) {
    const a = plateauRandom() * Math.PI * 2;
    const radius = 3.08 + plateauRandom() * 0.35;
    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.2 + plateauRandom() * 0.38, 0),
      mats.rock,
    );
    boulder.position.set(
      Math.cos(a) * radius,
      BOARD_TOP + 0.18 + plateauRandom() * 0.55,
      Math.sin(a) * radius,
    );
    boulder.scale.set(0.8 + plateauRandom() * 0.8, 0.65 + plateauRandom() * 1.1, 0.7 + plateauRandom() * 0.7);
    boulder.rotation.set(plateauRandom() * 2, plateauRandom() * 3, plateauRandom() * 2);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    plateau.add(boulder);
  }

  const cliffMossMaterial = new THREE.MeshStandardMaterial({ color: 0x3d6032, roughness: 0.97 });
  for (let i = 0; i < 14; i += 1) {
    const a = plateauRandom() * Math.PI * 2;
    const radius = 3.04 + plateauRandom() * 0.28;
    const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + plateauRandom() * 0.26, 0), cliffMossMaterial);
    moss.position.set(Math.cos(a) * radius, BOARD_TOP + 0.35 + plateauRandom() * 0.55, Math.sin(a) * radius);
    moss.scale.set(1.1, 0.12 + plateauRandom() * 0.16, 0.8);
    moss.rotation.z = (plateauRandom() - 0.5) * 0.5;
    plateau.add(moss);
  }

  const vineMaterial = new THREE.MeshStandardMaterial({ color: 0x31542a, roughness: 0.94 });
  const vineLeafMaterial = new THREE.MeshStandardMaterial({
    color: 0x466c31,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 7; i += 1) {
    const a = 0.45 + i * 0.78 + plateauRandom() * 0.18;
    const points: THREE.Vector3[] = [];
    for (let s = 0; s < 5; s += 1) {
      const t = s / 4;
      const radius = 3.02 + t * 0.4 + Math.sin(t * 5 + i) * 0.05;
      points.push(
        new THREE.Vector3(
          Math.cos(a) * radius,
          BOARD_TOP + 0.73 - t * (0.34 + plateauRandom() * 0.22),
          Math.sin(a) * radius,
        ),
      );
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const vine = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.016, 5, false), vineMaterial);
    vine.castShadow = true;
    plateau.add(vine);
    for (let leafIndex = 0; leafIndex < 4; leafIndex += 1) {
      const t = 0.18 + leafIndex * 0.21;
      const point = curve.getPoint(t);
      const leaf = new THREE.Mesh(
        new THREE.CircleGeometry(0.075 + plateauRandom() * 0.045, 5),
        vineLeafMaterial,
      );
      leaf.position.copy(point);
      leaf.rotation.set(-0.5 + plateauRandom(), a + plateauRandom(), plateauRandom() * 0.5);
      plateau.add(leaf);
    }
  }

  const stairDirection = 1.02;
  for (let i = 0; i < 4; i += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.15 - i * 0.05, 0.13, 0.46), mats.trimStoneDark);
    step.position.set(
      Math.sin(stairDirection) * (3.22 - i * 0.2),
      BOARD_TOP + 0.12 + i * 0.17,
      Math.cos(stairDirection) * (3.22 - i * 0.2),
    );
    step.rotation.y = stairDirection;
    step.castShadow = true;
    step.receiveShadow = true;
    plateau.add(step);
  }

  const flowAngle = 1.05;
  const waterfall = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.9, 1, 6),
    new THREE.MeshPhysicalMaterial({
      color: 0x7bb7b7,
      roughness: 0.28,
      metalness: 0.05,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      envMapIntensity: 0.4,
    }),
  );
  waterfall.position.set(Math.sin(flowAngle) * 3.13, BOARD_TOP + 0.3, Math.cos(flowAngle) * 3.13);
  waterfall.rotation.y = flowAngle;
  waterfall.rotation.x = 0.08;
  plateau.add(waterfall);

  for (let i = 0; i < 6; i += 1) {
    const mist = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: lib.cloud,
        color: 0xd6ebe3,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
    );
    mist.position.set(
      Math.sin(flowAngle) * (3.15 + plateauRandom() * 0.3),
      BOARD_TOP + 0.68 + plateauRandom() * 0.15,
      Math.cos(flowAngle) * (3.15 + plateauRandom() * 0.3),
    );
    mist.scale.set(0.8 + plateauRandom() * 0.7, 0.35 + plateauRandom() * 0.3, 1);
    plateau.add(mist);
  }
  const plateauTopY = BOARD_TOP + 0.845;

  // ---------- 废墟拱门 ----------
  const ruin = new THREE.Group();
  ruin.position.set(0, 1.4, 0);
  root.add(ruin);
  runtime.ruin = ruin;
  const ruinRandom = mulberry32(453);

  const ruinPlatform = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.48, 0.18, 24), mats.ancientStone);
  ruinPlatform.position.y = 0.09;
  ruinPlatform.scale.z = 0.88;
  ruinPlatform.castShadow = true;
  ruinPlatform.receiveShadow = true;
  ruin.add(ruinPlatform);

  const lowerStep = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.62, 0.1, 24), mats.ancientStone);
  lowerStep.position.y = 0.02;
  lowerStep.scale.z = 0.88;
  lowerStep.castShadow = true;
  lowerStep.receiveShadow = true;
  ruin.add(lowerStep);

  const runeRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.08, 0.018, 5, 48),
    new THREE.MeshStandardMaterial({ color: 0x5e7d65, roughness: 0.72, metalness: 0.12 }),
  );
  runeRing.rotation.x = Math.PI / 2;
  runeRing.position.y = 0.185;
  runeRing.scale.z = 0.88;
  ruin.add(runeRing);

  const pillarData: [number, number, number, number, number][] = [
    [-0.52, -0.2, 1.16, 0.25, 0.3],
    [0.52, -0.2, 1.16, 0.25, 0.3],
    [-0.29, -0.73, 0.54, 0.2, 0.22],
    [0.32, 0.62, 0.34, 0.16, 0.18],
  ];
  pillarData.forEach((p, index) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(p[3], p[2], p[4]), mats.ancientStone);
    pillar.position.set(p[0], 0.18 + p[2] / 2, p[1]);
    pillar.rotation.y = (ruinRandom() - 0.5) * 0.1;
    pillar.rotation.z = (ruinRandom() - 0.5) * 0.012;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    ruin.add(pillar);
    const baseStone = new THREE.Mesh(
      new THREE.BoxGeometry(p[3] * 1.28, 0.1, p[4] * 1.22),
      mats.trimAncient,
    );
    baseStone.position.set(p[0], 0.23, p[1]);
    baseStone.castShadow = true;
    ruin.add(baseStone);
    if (index < 2) {
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(p[3] * 1.28, 0.09, p[4] * 1.24),
        mats.trimAncient,
      );
      cap.position.set(p[0], 0.18 + p[2], p[1]);
      cap.rotation.y = pillar.rotation.y;
      cap.castShadow = true;
      ruin.add(cap);
    }
  });

  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.125, 7, 32, Math.PI), mats.ancientStone);
  arch.position.set(0, 1.34, -0.2);
  arch.rotation.z = 0.02;
  arch.castShadow = true;
  arch.receiveShadow = true;
  ruin.add(arch);

  for (let i = 0; i < 7; i += 1) {
    const a = ((i + 0.5) / 7) * Math.PI;
    const voussoir = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.21, 0.31),
      i % 2 === 0 ? mats.ancientStoneLight : mats.ancientStone,
    );
    voussoir.position.set(Math.cos(a) * 0.5, 1.34 + Math.sin(a) * 0.5, -0.2);
    voussoir.rotation.z = a;
    voussoir.castShadow = true;
    ruin.add(voussoir);
  }

  for (let i = 0; i < 3; i += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.92 + i * 0.12, 0.06, 0.18), mats.ancientStoneLight);
    step.position.set(0, 0.18 - i * 0.05, 0.97 + i * 0.13);
    step.castShadow = true;
    step.receiveShadow = true;
    ruin.add(step);
  }

  const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.33), mats.trimAncient);
  keystone.position.set(0.1, 1.83, -0.2);
  keystone.rotation.z = 0.04;
  keystone.castShadow = true;
  ruin.add(keystone);

  const brokenStone = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.28), mats.trimAncient);
  brokenStone.position.set(-0.48, 1.71, -0.2);
  brokenStone.rotation.set(0.02, 0.08, 0.23);
  brokenStone.castShadow = true;
  ruin.add(brokenStone);

  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), mats.rune);
  orb.position.set(0, 1.44, -0.19);
  orb.rotation.set(0.25, 0.6, 0.1);
  orb.castShadow = true;
  orb.name = 'rune-orb';
  ruin.add(orb);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.18, 40),
    new THREE.MeshBasicMaterial({
      color: 0x9ed9c7,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.copy(orb.position);
  ruin.add(halo);

  for (let i = 0; i < 14; i += 1) {
    const a = ruinRandom() * Math.PI * 2;
    const r = 0.55 + ruinRandom() * 0.85;
    const rubble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.06 + ruinRandom() * 0.12, 0),
      i % 3 === 0 ? mats.ancientStoneLight : mats.ancientStone,
    );
    rubble.position.set(Math.cos(a) * r, 0.23, Math.sin(a) * r);
    rubble.scale.y = 0.5 + ruinRandom() * 0.5;
    rubble.rotation.set(ruinRandom() * 2, ruinRandom() * 3, ruinRandom() * 2);
    rubble.castShadow = true;
    ruin.add(rubble);
  }

  for (let i = 0; i < 7; i += 1) {
    const a = ruinRandom() * Math.PI * 2;
    const r = 0.55 + ruinRandom() * 0.65;
    const moss = new THREE.Mesh(
      new THREE.SphereGeometry(0.12 + ruinRandom() * 0.1, 8, 5),
      mats.leaves[0] as THREE.Material,
    );
    moss.scale.y = 0.24;
    moss.position.set(Math.cos(a) * r, 0.205, Math.sin(a) * r);
    moss.receiveShadow = true;
    ruin.add(moss);
  }

  // ---------- 水池 ----------
  const pond = new THREE.Group();
  pond.position.set(3.92, 0, 2.35);
  pond.scale.set(1.0, 1, 0.8);
  root.add(pond);

  const shore = new THREE.Mesh(
    new THREE.CircleGeometry(1.18, 64),
    new THREE.MeshStandardMaterial({ color: 0xbda96e, roughness: 0.96 }),
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.y = BOARD_TOP + 0.008;
  shore.receiveShadow = true;
  pond.add(shore);

  const water = new THREE.Mesh(new THREE.CircleGeometry(1.02, 64), mats.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = BOARD_TOP + 0.022;
  water.receiveShadow = true;
  pond.add(water);
  runtime.water = water;

  const pondRandom = mulberry32(98);
  for (let i = 0; i < 6; i += 1) {
    const a = pondRandom() * Math.PI * 2;
    const r = 1.1 + pondRandom() * 0.25;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.09 + pondRandom() * 0.09, 0),
      mats.rock,
    );
    rock.position.set(Math.cos(a) * r, BOARD_TOP + 0.06, Math.sin(a) * r);
    rock.scale.y = 0.7;
    rock.castShadow = true;
    pond.add(rock);
  }
  const reedTipMaterial = new THREE.MeshStandardMaterial({ color: 0x70583a, roughness: 0.95 });
  for (let i = 0; i < 7; i += 1) {
    const a = -1.2 + pondRandom() * 1.6;
    const r = 0.8 + pondRandom() * 0.3;
    const reed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.018, 0.45 + pondRandom() * 0.28, 5),
      mats.leaves[1] as THREE.Material,
    );
    reed.position.set(Math.cos(a) * r, BOARD_TOP + 0.25, Math.sin(a) * r);
    reed.rotation.z = (pondRandom() - 0.5) * 0.15;
    reed.castShadow = true;
    pond.add(reed);
    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.11, 4, 7), reedTipMaterial);
    tip.position.set(reed.position.x, BOARD_TOP + 0.52, reed.position.z);
    pond.add(tip);
  }
  const lilyMaterial = new THREE.MeshStandardMaterial({
    color: 0x5f8e48,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 3; i += 1) {
    const lily = new THREE.Mesh(new THREE.CircleGeometry(0.16 + pondRandom() * 0.08, 12), lilyMaterial);
    lily.rotation.x = -Math.PI / 2;
    lily.position.set(-0.35 + pondRandom() * 0.8, BOARD_TOP + 0.03, -0.45 + pondRandom() * 0.9);
    pond.add(lily);
  }

  // ---------- 植被 ----------
  const createTree = (x: number, z: number, scale: number, seed: number, baseY: number, parent: THREE.Object3D) => {
    const random = mulberry32(seed);
    const group = new THREE.Group();
    group.position.set(x, baseY, z);
    group.scale.setScalar(scale);
    group.rotation.y = random() * Math.PI * 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 0.42, 7), mats.trunk);
    trunk.position.y = 0.21;
    trunk.castShadow = true;
    group.add(trunk);
    const layers: [number, number, number, number][] = [
      [0.29, 0.31, 0.5, 0],
      [0.23, 0.28, 0.68, 1],
      [0.15, 0.22, 0.84, 2],
    ];
    layers.forEach((data) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(data[0], data[1], 9, 1),
        mats.leaves[data[3]] as THREE.Material,
      );
      cone.position.y = data[2];
      cone.rotation.y = random() * 1.2;
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
    });
    parent.add(group);
    return group;
  };

  const createBroadleafTree = (x: number, z: number, scale: number, seed: number, baseY: number) => {
    const random = mulberry32(seed);
    const group = new THREE.Group();
    group.position.set(x, baseY, z);
    group.scale.setScalar(scale);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, 0.7, 7), mats.trunk);
    trunk.position.y = 0.35;
    trunk.castShadow = true;
    group.add(trunk);
    const branchMaterial = new THREE.MeshStandardMaterial({ color: 0x314929, roughness: 0.92 });
    for (let b = 0; b < 3; b += 1) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.038, 0.42, 5), branchMaterial);
      const ba = (b / 3) * Math.PI * 2 + random();
      branch.position.set(Math.cos(ba) * 0.1, 0.65, Math.sin(ba) * 0.1);
      branch.rotation.z = Math.cos(ba) * 0.55;
      branch.rotation.x = Math.sin(ba) * 0.55;
      group.add(branch);
    }
    const canopyColors = [0x2d4d2b, 0x3e6131, 0x51743a, 0x34572d];
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2 + random() * 0.5;
      const radius = 0.12 + random() * 0.3;
      const canopy = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.32 + random() * 0.16, 1),
        new THREE.MeshStandardMaterial({
          color: canopyColors[i % canopyColors.length] as number,
          roughness: 0.94,
          flatShading: true,
        }),
      );
      canopy.position.set(Math.cos(a) * radius, 0.9 + random() * 0.3, Math.sin(a) * radius);
      canopy.scale.set(1, 0.85 + random() * 0.3, 1);
      canopy.rotation.set(random() * 2, random() * 3, random() * 2);
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      group.add(canopy);
    }
    root.add(group);
  };

  const plateauTrees: [number, number, number, number][] = [
    [-1.95, 1.5, 0.82, 0],
    [-2.35, 0.15, 0.7, 1],
    [1.95, -1.7, 0.86, 2],
    [-0.7, 2.3, 0.74, 4],
    [-2.45, -1.35, 0.72, 6],
    [2.7, 1.35, 0.58, 8],
  ];
  plateauTrees.forEach((p, i) => {
    createTree(p[0], p[1], p[2] * 1.45, 280 + i, plateauTopY, root);
  });
  createBroadleafTree(-2.45, -1.55, 1.15, 811, plateauTopY);
  createBroadleafTree(2.35, 1.65, 1.02, 812, plateauTopY);

  const outerTrees: [number, number, number][] = [
    [-4.7, 0.2, 0.58],
    [-4.5, 2.35, 0.48],
    [-3.9, -2.85, 0.62],
    [-2.2, -4.35, 0.52],
    [1.7, -4.55, 0.55],
    [3.5, -3.55, 0.5],
    [4.62, -1.25, 0.46],
    [2.1, 4.42, 0.42],
    [-1.6, 4.35, 0.5],
  ];
  outerTrees.forEach((p, i) => {
    createTree(p[0], p[1], p[2] * 1.08, 360 + i, BOARD_TOP, root);
  });

  const bushRandom = mulberry32(6655);
  for (let i = 0; i < 20; i += 1) {
    const a = bushRandom() * Math.PI * 2;
    const r = 1.35 + bushRandom() * 1.55;
    const bush = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.1 + bushRandom() * 0.19, 1),
      mats.leaves[i % mats.leaves.length] as THREE.Material,
    );
    bush.position.set(Math.cos(a) * r, plateauTopY + 0.1, Math.sin(a) * r);
    bush.scale.y = 0.7;
    bush.castShadow = true;
    bush.receiveShadow = true;
    root.add(bush);
  }

  const scatterRandom = mulberry32(6231);
  for (let i = 0; i < 24; i += 1) {
    const a = scatterRandom() * Math.PI * 2;
    const r = 3.65 + scatterRandom() * 1.1;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.08 + scatterRandom() * 0.16, 0),
      mats.rock,
    );
    rock.position.set(Math.cos(a) * r, BOARD_TOP + 0.04, Math.sin(a) * r);
    rock.scale.y = 0.65;
    rock.rotation.set(scatterRandom() * 2, scatterRandom() * 3, scatterRandom() * 2);
    rock.castShadow = true;
    rock.receiveShadow = true;
    root.add(rock);
  }

  const mushroomMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xdfc584, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xe9e0b3, roughness: 0.8 }),
  ];
  for (let i = 0; i < 30; i += 1) {
    const a = scatterRandom() * Math.PI * 2;
    const onPlateau = i % 3 === 0;
    const r = onPlateau ? 1.2 + scatterRandom() * 1.65 : 3.75 + scatterRandom() * 1.1;
    const baseY = onPlateau ? plateauTopY : BOARD_TOP;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.009, 0.1, 4),
      mats.leaves[2] as THREE.Material,
    );
    stem.position.set(Math.cos(a) * r, baseY + 0.05, Math.sin(a) * r);
    root.add(stem);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 4),
      mushroomMaterials[scatterRandom() > 0.5 ? 0 : 1] as THREE.Material,
    );
    cap.position.set(stem.position.x, baseY + 0.105, stem.position.z);
    root.add(cap);
  }

  // ---------- 远景浮岛 ----------
  const createFloatingIsland = (x: number, y: number, z: number, scale: number, seed: number) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), mats.rock);
    rock.scale.set(1.15, 0.48, 0.9);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.02, 0.12, 18), mats.grass);
    grass.position.y = 0.36;
    grass.castShadow = true;
    grass.receiveShadow = true;
    group.add(grass);
    const tree = createTree(0.06, -0.06, 0.7, seed, 0, group);
    tree.position.y = 0.42;
    tree.scale.setScalar(0.68);
    const random = mulberry32(seed + 77);
    for (let i = 0; i < 3; i += 1) {
      const shard = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.22 + random() * 0.22, 0),
        mats.rock,
      );
      shard.position.set((random() - 0.5) * 1.3, -0.4 - random() * 0.5, (random() - 0.5) * 0.8);
      shard.scale.y = 1.4 + random();
      shard.rotation.set(random() * 2, random() * 3, random() * 2);
      shard.castShadow = true;
      group.add(shard);
    }
    group.userData.baseY = y;
    group.userData.phase = seed * 0.17;
    root.add(group);
    runtime.floatingIslands.push(group);
  };

  createFloatingIsland(-10.8, 2.8, -3.8, 1.42, 1);
  createFloatingIsland(10.9, 1.5, -4.9, 1.05, 2);
  createFloatingIsland(-8.4, 0.9, -1.2, 0.66, 3);
  createFloatingIsland(8.6, 0.4, 6.4, 0.58, 4);

  // ---------- 云影 ----------
  const shadowSpecs: [number, number, number, number, number, number, number][] = [
    [-2.2, 2.6, 2.1, 7.6, 3.1, 0.3, -0.4],
    [3.4, -1.2, 1.45, 6.2, 2.6, 0.22, 1.1],
    [-1.9, -3.6, 1.1, 5.2, 2.3, 0.17, 2.2],
  ];
  shadowSpecs.forEach((spec, index) => {
    const material = new THREE.MeshBasicMaterial({
      map: lib.cloud,
      color: 0x172114,
      transparent: true,
      opacity: spec[5],
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(spec[3], spec[4]), material);
    shadow.rotation.x = -Math.PI / 2;
    shadow.rotation.z = spec[6];
    shadow.position.set(spec[0], BOARD_TOP + 0.015, spec[1]);
    shadow.renderOrder = 1;
    shadow.userData.baseX = spec[0];
    shadow.userData.baseZ = spec[1];
    shadow.userData.phase = index * 1.8;
    root.add(shadow);
    runtime.cloudShadows.push(shadow);
  });

  // ---------- 远景山 ----------
  const backdropRandom = mulberry32(24271);
  const farStone = new THREE.MeshStandardMaterial({
    color: 0x435e59,
    roughness: 1,
    metalness: 0,
    fog: true,
    flatShading: true,
  });
  for (let i = 0; i < 8; i += 1) {
    const group = new THREE.Group();
    const x = -18 + i * 5.1 + (backdropRandom() - 0.5) * 2.2;
    const z = -21 - backdropRandom() * 10;
    const baseY = -6.4 - backdropRandom() * 1.3;
    group.position.set(x, baseY, z);
    const height = 8.5 + backdropRandom() * 7.5;
    const radius = 2.5 + backdropRandom() * 2.2;
    const peakGeo = new THREE.ConeGeometry(1, 1, 7, 4);
    const position = peakGeo.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < position.count; v += 1) {
      const px = position.getX(v);
      const py = position.getY(v);
      const pz = position.getZ(v);
      const twist = 1 + Math.sin(py * 9 + i) * 0.12 + Math.cos((px - pz) * 8) * 0.07;
      position.setXYZ(v, px * twist, py, pz * twist);
    }
    peakGeo.computeVertexNormals();
    const peak = new THREE.Mesh(peakGeo, farStone);
    peak.scale.set(radius, height, radius * 0.72);
    peak.position.y = 0.5;
    peak.rotation.set(0.03, backdropRandom() * 3, (backdropRandom() - 0.5) * 0.1);
    group.add(peak);
    const shoulder = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 6, 2), farStone);
    shoulder.scale.set(radius * 1.3, height * 0.55, radius * 0.9);
    shoulder.position.set((backdropRandom() - 0.5) * radius * 1.2, -height * 0.14, 0.4);
    shoulder.rotation.set(0.1, backdropRandom() * 3, 0.2);
    group.add(shoulder);
    root.add(group);
  }

  const sunHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: lib.soft,
      color: 0xffecc2,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  sunHalo.position.set(-24, 17, -26);
  sunHalo.scale.set(23, 23, 1);
  root.add(sunHalo);

  // ---------- 云 ----------
  const cloudRandom = mulberry32(7602);
  const addCloud = (
    x: number,
    y: number,
    z: number,
    size: number,
    opacity: number,
    tint: number,
    speed: number,
    fog: boolean,
  ) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: lib.cloud,
        color: tint,
        transparent: true,
        opacity,
        depthWrite: false,
        fog,
      }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.set(size, size * 0.43, 1);
    sprite.userData.baseX = x;
    sprite.userData.baseZ = z;
    sprite.userData.speed = speed;
    sprite.userData.phase = cloudRandom() * 6.28;
    root.add(sprite);
    runtime.clouds.push(sprite);
  };

  for (let i = 0; i < 20; i += 1) {
    const a = cloudRandom() * Math.PI * 2;
    const r = 9.2 + cloudRandom() * 7.2;
    addCloud(
      Math.cos(a) * r,
      -1.4 + cloudRandom() * 6.3,
      Math.sin(a) * r,
      4.8 + cloudRandom() * 6.2,
      0.3 + cloudRandom() * 0.24,
      i % 4 === 0 ? 0xd5e3d5 : 0xf4f3df,
      0.12 + cloudRandom() * 0.16,
      true,
    );
  }
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + 0.25;
    addCloud(
      Math.cos(a) * (5.5 + cloudRandom() * 2.4),
      -2.15 - cloudRandom() * 0.55,
      Math.sin(a) * (5.5 + cloudRandom() * 2.4),
      6.5 + cloudRandom() * 3.8,
      0.35,
      0xe7eddc,
      0.05 + cloudRandom() * 0.07,
      true,
    );
  }
  const farClouds: [number, number, number, number, number][] = [
    [-10.5, 2.4, -3.5, 10.5, 0.42],
    [8.8, 3.3, -6.2, 9.4, 0.36],
    [7.0, 1.1, 6.4, 7.6, 0.28],
    [-7.4, 0.4, 7.1, 8.2, 0.24],
  ];
  farClouds.forEach((c, index) => {
    addCloud(c[0], c[1], c[2], c[3], c[4], 0xf4f4df, 0.02 + index * 0.006, false);
  });

  // ---------- 尘埃 ----------
  const moteCount = 190;
  const positions = new Float32Array(moteCount * 3);
  const colors = new Float32Array(moteCount * 3);
  const moteRandom = mulberry32(9182);
  const warm = new THREE.Color(0xffdf9b);
  const cool = new THREE.Color(0x8ce3d6);
  for (let i = 0; i < moteCount; i += 1) {
    const a = moteRandom() * Math.PI * 2;
    const r = 2.2 + moteRandom() * 8.8;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = 0.9 + moteRandom() * 3.7;
    positions[i * 3 + 2] = Math.sin(a) * r;
    const color = moteRandom() > 0.72 ? cool : warm;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  moteGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const moteMaterial = new THREE.PointsMaterial({
    size: 0.095,
    map: lib.mote,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.name = 'motes';
  root.add(motes);
  runtime.motes = motes;

  return runtime;
}

/** 环境动画（云、浮岛、云影、尘埃） */
export function updateEnvironment(
  runtime: EnvironmentRuntime,
  elapsed: number,
  reducedMotion: boolean,
): void {
  if (reducedMotion) return;
  for (const cloud of runtime.clouds) {
    cloud.position.x = (cloud.userData.baseX as number) + Math.sin(elapsed * (cloud.userData.speed as number) + (cloud.userData.phase as number)) * 0.7;
    cloud.position.z = (cloud.userData.baseZ as number) + Math.cos(elapsed * (cloud.userData.speed as number) * 0.7 + (cloud.userData.phase as number)) * 0.25;
  }
  for (const shadow of runtime.cloudShadows) {
    shadow.position.x = (shadow.userData.baseX as number) + Math.sin(elapsed * 0.035 + (shadow.userData.phase as number)) * 1.4;
    shadow.position.z = (shadow.userData.baseZ as number) + Math.cos(elapsed * 0.028 + (shadow.userData.phase as number)) * 0.6;
  }
  for (const island of runtime.floatingIslands) {
    island.position.y = (island.userData.baseY as number) + Math.sin(elapsed * 0.32 + (island.userData.phase as number)) * 0.08;
  }
  if (runtime.motes) runtime.motes.rotation.y = elapsed * 0.008;
  const orb = runtime.ruin?.getObjectByName('rune-orb');
  if (orb) {
    orb.rotation.y += 0.006;
    orb.position.y = 1.44 + Math.sin(elapsed * 1.3) * 0.018;
  }
}
