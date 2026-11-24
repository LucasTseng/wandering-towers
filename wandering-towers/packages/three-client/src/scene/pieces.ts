import * as THREE from 'three';
import type { PlayerID, SpaceIndex, TowerID, WizardID } from '@wt/shared';
import type { MaterialLibrary } from './materials';
import type { TextureLibrary } from './textures';
import { mulberry32 } from './textures';

/**
 * 棋子与建筑构件：塔、鸦堡、巫师、旗帜、火把、常春藤、塔顶陈设。
 *
 * 所有造型只依赖材质库，不读写游戏状态；数据绑定由 SceneController 完成。
 */

export interface TorchHandle {
  flame: THREE.Object3D;
  core: THREE.Object3D;
  glow: THREE.Sprite;
  phase: number;
}

export interface BannerHandle {
  group: THREE.Group;
  cloth: THREE.Mesh;
  basePositions: Float32Array;
}

export interface FlagHandle {
  mesh: THREE.Mesh;
  basePositions: Float32Array;
}

export interface PieceRuntime {
  torches: TorchHandle[];
  banners: BannerHandle[];
  flags: FlagHandle[];
  /** 本次重建新建的材质（几何由调用方统一 dispose，材质需单独回收） */
  ownedMaterials: THREE.Material[];
}

export function createPieceRuntime(): PieceRuntime {
  return { torches: [], banners: [], flags: [], ownedMaterials: [] };
}

export interface PieceDeps {
  lib: TextureLibrary;
  mats: MaterialLibrary;
  runtime: PieceRuntime;
}

const PLAYER_COLORS: Record<string, string> = {
  P1: '#cf5744',
  P2: '#3d7fa6',
  P3: '#4a8a4f',
  P4: '#d8b24a',
  P5: '#8b5f9e',
  P6: '#c9773f',
};

const PLAYER_NAMES: Record<string, string> = {
  P1: '赤袍学徒',
  P2: '蓝袍学徒',
  P3: '绿袍学徒',
  P4: '金袍学徒',
  P5: '紫袍学徒',
  P6: '橙袍学徒',
};

export function playerColor(playerId: PlayerID): string {
  return PLAYER_COLORS[playerId] ?? '#cf5744';
}

export function playerName(playerId: PlayerID): string {
  return PLAYER_NAMES[playerId] ?? playerId;
}

/** 接地软阴影（替代纯几何投影在近景的空洞感） */
export function addContactShadow(
  parent: THREE.Object3D,
  deps: PieceDeps,
  radius: number,
  opacity = 0.36,
  y = 0.008,
): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    map: deps.lib.contact,
    transparent: true,
    opacity,
    depthWrite: false,
    color: 0x20261b,
  });
  deps.runtime.ownedMaterials.push(material);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = y;
  shadow.renderOrder = 2;
  parent.add(shadow);
  return shadow;
}

function clothMaterial(deps: PieceDeps, color: string, seed: number): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: deps.lib.cloth(`banner-${color}`, color),
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  void seed;
  deps.runtime.ownedMaterials.push(material);
  return material;
}

export function createBanner(deps: PieceDeps, color: string, scale = 1): THREE.Group {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const clothGeometry = new THREE.PlaneGeometry(0.3, 0.43, 7, 8);
  const cloth = new THREE.Mesh(clothGeometry, clothMaterial(deps, color, 4451));
  cloth.castShadow = true;
  group.add(cloth);

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), deps.mats.iron);
  rod.rotation.z = Math.PI / 2;
  rod.position.y = 0.225;
  group.add(rod);

  const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.022, 0.025), deps.mats.gold);
  bottomBar.position.y = -0.215;
  group.add(bottomBar);

  for (const x of [-0.19, 0.19]) {
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), deps.mats.gold);
    finial.position.set(x, 0.225, 0);
    group.add(finial);
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.11, 5), deps.mats.gold);
    tassel.position.set(x, -0.275, 0);
    group.add(tassel);
  }

  const emblem = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 5, 18), deps.mats.gold);
  emblem.position.set(0, 0.03, 0.006);
  group.add(emblem);

  deps.runtime.banners.push({
    group,
    cloth,
    basePositions: Float32Array.from((clothGeometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array),
  });
  return group;
}

export function createTorch(deps: PieceDeps): THREE.Group {
  const group = new THREE.Group();
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.15, 0.09), deps.mats.iron);
  bracket.position.set(0, -0.07, 0.02);
  group.add(bracket);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.18, 6), deps.mats.iron);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, -0.14, 0.11);
  group.add(arm);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.04, 0.065, 8), deps.mats.iron);
  bowl.position.set(0, -0.1, 0.19);
  group.add(bowl);

  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffbd63, toneMapped: false });
  const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1b1, toneMapped: false });
  deps.runtime.ownedMaterials.push(flameMaterial, coreMaterial);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 7), flameMaterial);
  flame.position.set(0, -0.015, 0.19);
  group.add(flame);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), coreMaterial);
  core.position.set(0, 0.005, 0.19);
  group.add(core);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: deps.lib.soft,
      color: 0xffb04d,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.scale.set(0.55, 0.55, 1);
  glow.position.set(0, 0.02, 0.19);
  group.add(glow);
  deps.runtime.torches.push({ flame, core, glow, phase: Math.random() * 6.28 });
  return group;
}

export function addIvy(deps: PieceDeps, group: THREE.Object3D, angle: number, seed: number): void {
  const random = mulberry32(seed);
  const ivyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c4b29,
    roughness: 0.94,
    side: THREE.DoubleSide,
  });
  deps.runtime.ownedMaterials.push(ivyMaterial);
  const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8;
    const y = 0.08 + t * 0.38;
    const spread = (random() - 0.5) * 0.12;
    const tangent = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.045 + random() * 0.035, 6, 4), ivyMaterial);
    leaf.scale.set(1.1, 0.55, 0.35);
    leaf.position.copy(direction.clone().multiplyScalar(0.806)).add(tangent.clone().multiplyScalar(spread));
    leaf.position.y = y;
    leaf.rotation.y = angle + (random() - 0.5) * 0.6;
    group.add(leaf);
  }
}

export function createRavenBlock(deps: PieceDeps): THREE.Group {
  const body = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.28, 0);
  shape.bezierCurveTo(-0.18, 0.12, -0.08, 0.12, 0, 0.05);
  shape.bezierCurveTo(0.05, 0.02, 0.07, 0.13, 0.14, 0.14);
  shape.bezierCurveTo(0.22, 0.15, 0.27, 0.07, 0.31, 0.02);
  shape.bezierCurveTo(0.18, 0.01, 0.12, -0.02, 0.08, -0.07);
  shape.bezierCurveTo(0.04, -0.17, 0.01, -0.25, -0.02, -0.32);
  shape.bezierCurveTo(-0.07, -0.23, -0.1, -0.14, -0.14, -0.06);
  shape.bezierCurveTo(-0.2, -0.02, -0.25, 0, -0.28, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 10,
  });
  geometry.center();
  body.add(new THREE.Mesh(geometry, deps.mats.iron));
  return body;
}

function createTowerTopDecor(deps: PieceDeps, group: THREE.Group, spaceIndex: number, raven: boolean): void {
  const random = mulberry32(9100 + spaceIndex);
  const anchorAngle = 1.05;
  const anchorRadius = 0.58;
  const anchorX = Math.sin(anchorAngle) * anchorRadius;
  const anchorZ = Math.cos(anchorAngle) * anchorRadius;
  const type = spaceIndex % 4;

  if (type === 0) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.075, 8), deps.mats.iron);
    bowl.position.set(anchorX, 0.65, anchorZ);
    bowl.castShadow = true;
    group.add(bowl);
    const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffb75c, toneMapped: false });
    deps.runtime.ownedMaterials.push(flameMaterial);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.11, 6), flameMaterial);
    flame.position.set(anchorX, 0.73, anchorZ);
    group.add(flame);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: deps.lib.soft,
        color: 0xffb14f,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(0.55, 0.55, 1);
    glow.position.set(anchorX, 0.74, anchorZ);
    group.add(glow);
    deps.runtime.torches.push({ flame, core: flame, glow, phase: random() * 6.28 });
    return;
  }

  if (type === 1) {
    const leather = new THREE.MeshStandardMaterial({ color: 0x59422e, roughness: 0.9 });
    const parchment = new THREE.MeshStandardMaterial({ color: 0xd9c79e, roughness: 0.96 });
    deps.runtime.ownedMaterials.push(leather, parchment);
    for (let i = 0; i < 3; i += 1) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.17 - i * 0.025, 0.035, 0.12),
        i === 1 ? parchment : leather,
      );
      book.position.set(anchorX + (random() - 0.5) * 0.03, 0.635 + i * 0.036, anchorZ);
      book.rotation.y = (random() - 0.5) * 0.35;
      book.castShadow = true;
      group.add(book);
    }
    return;
  }

  if (type === 2) {
    const potMaterial = new THREE.MeshStandardMaterial({ color: 0x8e6341, roughness: 0.9 });
    deps.runtime.ownedMaterials.push(potMaterial);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.1, 8), potMaterial);
    pot.position.set(anchorX, 0.655, anchorZ);
    pot.castShadow = true;
    group.add(pot);
    for (let i = 0; i < 3; i += 1) {
      const leaf = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.055, 0),
        deps.mats.leaves[i % 3]!,
      );
      leaf.position.set(
        anchorX + (random() - 0.5) * 0.09,
        0.72 + random() * 0.08,
        anchorZ + (random() - 0.5) * 0.08,
      );
      leaf.scale.y = 1.3;
      group.add(leaf);
    }
    return;
  }

  const perch = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.25, 6), deps.mats.iron);
  perch.position.set(anchorX, 0.72, anchorZ);
  perch.castShadow = true;
  group.add(perch);
  const ravenStatue = createRavenBlock(deps);
  ravenStatue.scale.setScalar(0.36);
  ravenStatue.position.set(anchorX, 0.87, anchorZ);
  ravenStatue.rotation.y = anchorAngle + 0.5;
  if (raven) {
    ravenStatue.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = deps.mats.gold;
    });
  }
  group.add(ravenStatue);
}

export interface TowerOptions {
  towerId: TowerID;
  spaceIndex: SpaceIndex;
  tier: number;
  isTop: boolean;
  hasRavenShield: boolean;
  sealed: boolean;
  angle: number;
}

const WARM_TONES = [0xe5cda0, 0xcdb17a, 0xba9d69, 0xdac28f];
const COOL_TONES = [0xa6b197, 0x879b87, 0xb5bda3, 0x94a48d];

export function createTower(deps: PieceDeps, options: TowerOptions): THREE.Group {
  const { towerId, spaceIndex, tier, isTop, hasRavenShield, sealed, angle } = options;
  const raven = hasRavenShield;
  const group = new THREE.Group();

  const base = raven ? deps.mats.ravenStone : deps.mats.stone;
  const bodyMaterial = base.clone();
  const tones = raven ? COOL_TONES : WARM_TONES;
  bodyMaterial.color.setHex(tones[spaceIndex % tones.length] as number);
  bodyMaterial.needsUpdate = true;
  deps.runtime.ownedMaterials.push(bodyMaterial);
  const lightMaterial = raven ? deps.mats.ravenStoneLight : deps.mats.stoneLight;

  addContactShadow(group, deps, 1.02, 0.46, 0.004);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.77, 0.815, 0.56, 8, 3), [
    bodyMaterial,
    lightMaterial,
    bodyMaterial,
  ]);
  body.position.y = 0.285;
  group.add(body);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.855, 0.88, 0.09, 8), deps.mats.trimStoneDark);
  plinth.position.y = 0.045;
  group.add(plinth);
  const baseBand = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.85, 0.045, 8), deps.mats.trimStone);
  baseBand.position.y = 0.095;
  group.add(baseBand);

  const midBand = new THREE.Mesh(new THREE.CylinderGeometry(0.81, 0.805, 0.035, 8), deps.mats.trimStone);
  midBand.position.y = 0.335;
  group.add(midBand);
  const topBand = new THREE.Mesh(new THREE.CylinderGeometry(0.825, 0.81, 0.055, 8), deps.mats.trimStone);
  topBand.position.y = 0.542;
  group.add(topBand);

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.83, 0.83, 0.06, 8), deps.mats.trimStone);
  deck.position.y = 0.582;
  group.add(deck);

  const deckRim = new THREE.Mesh(new THREE.TorusGeometry(0.825, 0.035, 6, 8), deps.mats.trimStoneDark);
  deckRim.rotation.x = Math.PI / 2;
  deckRim.rotation.z = Math.PI / 8;
  deckRim.position.y = 0.608;
  group.add(deckRim);

  const doorwayMaterial = new THREE.MeshStandardMaterial({ color: 0x2d2319, roughness: 0.94 });
  deps.runtime.ownedMaterials.push(doorwayMaterial);
  const doorway = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), doorwayMaterial);
  doorway.position.set(0, 0.22, 0.792);
  group.add(doorway);
  const doorwayArch = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.025, 5, 16, Math.PI),
    deps.mats.trimStoneDark,
  );
  doorwayArch.position.set(0, 0.38, 0.795);
  group.add(doorwayArch);

  const inlay = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.012, 6, 8), deps.mats.gold);
  inlay.rotation.x = Math.PI / 2;
  inlay.position.y = 0.616;
  group.add(inlay);

  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), deps.mats.trimStone);
    merlon.position.set(Math.cos(a) * 0.705, 0.675, Math.sin(a) * 0.705);
    merlon.rotation.y = -a;
    merlon.castShadow = true;
    group.add(merlon);
    if (i % 2 === 0) {
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.49, 0.07), deps.mats.trimStoneDark);
      pilaster.position.set(Math.cos(a) * 0.77, 0.32, Math.sin(a) * 0.77);
      pilaster.rotation.y = -a;
      pilaster.castShadow = true;
      group.add(pilaster);
    }
  }

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b3b2c,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  deps.runtime.ownedMaterials.push(frameMaterial);
  for (const a of [0.35, 4.55]) {
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.29), frameMaterial);
    frame.position.set(Math.sin(a) * 0.782, 0.385, Math.cos(a) * 0.782);
    frame.rotation.y = a;
    group.add(frame);
    const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.145, 0.245), deps.mats.window);
    windowMesh.position.set(Math.sin(a) * 0.787, 0.385, Math.cos(a) * 0.787);
    windowMesh.rotation.y = a;
    group.add(windowMesh);
  }

  if (raven) {
    const shieldBack = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.05, 32), deps.mats.gold);
    shieldBack.rotation.x = Math.PI / 2;
    shieldBack.position.set(0, 0.37, 0.81);
    shieldBack.castShadow = true;
    group.add(shieldBack);
    const shield = new THREE.Mesh(new THREE.CircleGeometry(0.164, 32), deps.mats.shield);
    shield.position.set(0, 0.37, 0.838);
    group.add(shield);
    const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.169, 0.015, 6, 32), deps.mats.gold);
    shieldRim.position.set(0, 0.37, 0.842);
    group.add(shieldRim);
  }

  const bannerAngle = raven ? 0.52 : -0.5;
  const banner = createBanner(deps, raven ? '#2c6c72' : '#8a3c32', 1.12);
  banner.position.set(Math.sin(bannerAngle) * 0.815, 0.31, Math.cos(bannerAngle) * 0.815);
  banner.rotation.y = bannerAngle;
  group.add(banner);

  if (tier === 0) {
    const torchAngle = raven ? -0.62 : 0.62;
    const torch = createTorch(deps);
    torch.scale.setScalar(1.28);
    torch.position.set(Math.sin(torchAngle) * 0.83, 0.37, Math.cos(torchAngle) * 0.83);
    torch.rotation.y = torchAngle;
    group.add(torch);
  }

  if (raven || spaceIndex % 3 === 0) {
    addIvy(deps, group, -1.15, 700 + spaceIndex * 10 + tier);
  }
  if (isTop) {
    createTowerTopDecor(deps, group, spaceIndex, raven);
  }

  if (sealed) {
    const sealMaterial = new THREE.MeshBasicMaterial({
      color: 0xc9a24a,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    deps.runtime.ownedMaterials.push(sealMaterial);
    for (let i = 0; i < 2; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.012, 4, 32), sealMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.14 + i * 0.3;
      group.add(ring);
    }
  }

  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  group.rotation.y = angle + Math.PI / 8;
  group.userData.kind = 'tower';
  group.userData.towerId = towerId;
  group.userData.spaceIndex = spaceIndex;
  group.userData.selectRadius = 0.92;
  group.userData.anchorHeight = 0.84;
  group.userData.title = `${towerId} · ${raven ? '渡鸦塔' : '云杉塔'}`;
  group.userData.meta = sealed
    ? '塔封印锁定 · 不可切片移动'
    : tier > 0
      ? `塔堆第 ${tier + 1} 层 · 可切片移动`
      : '单层塔 · 可移动';
  return group;
}

export function createCastle(deps: PieceDeps, spaceIndex: SpaceIndex): THREE.Group {
  const group = new THREE.Group();
  addContactShadow(group, deps, 0.86, 0.48, 0.004);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.63, 0.62, 8, 2), [
    deps.mats.navyStone,
    deps.mats.navyStone,
    deps.mats.navyStone,
  ]);
  base.position.y = 0.31;
  group.add(base);

  const lowerTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.065, 8), deps.mats.gold);
  lowerTrim.position.y = 0.595;
  group.add(lowerTrim);

  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.58, 8), deps.mats.navyStone);
  upper.position.y = 0.9;
  group.add(upper);

  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.075, 8), deps.mats.trimNavy);
  balcony.position.y = 1.16;
  group.add(balcony);

  const balconyTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.025, 8), deps.mats.gold);
  balconyTrim.position.y = 1.205;
  group.add(balconyTrim);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.08, 8, 2), deps.mats.roof);
  roof.position.y = 1.78;
  roof.rotation.y = Math.PI / 8;
  group.add(roof);

  for (const [y, radius] of [
    [1.34, 0.52],
    [1.82, 0.415],
    [2.12, 0.31],
  ] as const) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 5, 8), deps.mats.gold);
    hoop.rotation.x = Math.PI / 2;
    hoop.rotation.z = Math.PI / 8;
    hoop.position.y = y;
    group.add(hoop);
  }

  const roofTip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 8), deps.mats.gold);
  roofTip.position.y = 2.4;
  group.add(roofTip);

  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    if (i % 2 === 0) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.12), deps.mats.trimNavy);
      merlon.position.set(Math.cos(a) * 0.46, 1.25, Math.sin(a) * 0.46);
      merlon.rotation.y = -a;
      group.add(merlon);
    }
  }

  const pennantMaterials: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 4; i += 1) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const turret = new THREE.Group();
    turret.position.set(Math.cos(a) * 0.53, 0.08, Math.sin(a) * 0.53);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.62, 8), deps.mats.trimNavy);
    shaft.position.y = 0.31;
    turret.add(shaft);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.055, 8), deps.mats.gold);
    collar.position.y = 0.615;
    turret.add(collar);
    const turretRoof = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.37, 8), deps.mats.roof);
    turretRoof.position.y = 0.82;
    turret.add(turretRoof);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 6), deps.mats.gold);
    spike.position.y = 1.07;
    turret.add(spike);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.27, 5), deps.mats.gold);
    pole.position.set(0, 1.24, 0);
    turret.add(pole);
    const pennantMaterial = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0x9d4538 : 0x307985,
      roughness: 0.86,
      side: THREE.DoubleSide,
    });
    pennantMaterials.push(pennantMaterial);
    const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.095), pennantMaterial);
    pennant.position.set(0.095, 1.31, 0);
    pennant.rotation.y = Math.PI / 2;
    pennant.castShadow = true;
    turret.add(pennant);
    turret.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    group.add(turret);
  }
  deps.runtime.ownedMaterials.push(...pennantMaterials);

  for (const [i, a] of [0.0, 1.75, 3.65, 2.5].entries()) {
    const radius = i === 0 ? 0.607 : 0.47;
    const windowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(i === 0 ? 0.13 : 0.11, i === 0 ? 0.22 : 0.19),
      deps.mats.window,
    );
    windowMesh.position.set(Math.sin(a) * radius, i === 0 ? 0.28 : 0.94, Math.cos(a) * radius);
    windowMesh.rotation.y = a;
    group.add(windowMesh);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: deps.lib.soft,
        color: 0xffc16d,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(0.34, 0.34, 1);
    glow.position.set(Math.sin(a) * (radius + 0.03), i === 0 ? 0.28 : 0.94, Math.cos(a) * (radius + 0.03));
    group.add(glow);
  }

  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x3a2820, roughness: 0.9 });
  deps.runtime.ownedMaterials.push(doorMaterial);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.35), doorMaterial);
  door.position.set(0, 0.18, 0.626);
  group.add(door);
  const doorArch = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 20, Math.PI), deps.mats.navyStone);
  doorArch.position.set(0, 0.36, 0.628);
  group.add(doorArch);

  for (let i = 0; i < 3; i += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.32 + i * 0.1, 0.045, 0.15), deps.mats.trimNavy);
    step.position.set(0, 0.02 - i * 0.008, 0.68 + i * 0.105);
    step.castShadow = true;
    group.add(step);
  }

  const gateGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: deps.lib.soft,
      color: 0xffb760,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  gateGlow.scale.set(0.56, 0.56, 1);
  gateGlow.position.set(0, 0.28, 0.66);
  group.add(gateGlow);

  const shield = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), deps.mats.shield);
  shield.position.set(0, 0.95, 0.49);
  group.add(shield);
  const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.015, 6, 32), deps.mats.gold);
  shieldRim.position.set(0, 0.95, 0.495);
  group.add(shieldRim);

  const raven = createRavenBlock(deps);
  raven.scale.setScalar(0.82);
  raven.position.set(0, 2.62, 0);
  raven.rotation.y = 0.2;
  group.add(raven);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.64, 6), deps.mats.gold);
  pole.position.set(0.18, 2.55, 0);
  group.add(pole);

  const flagGeometry = new THREE.PlaneGeometry(0.48, 0.25, 10, 3);
  const flagMaterial = new THREE.MeshStandardMaterial({
    color: 0xa94336,
    roughness: 0.85,
    side: THREE.DoubleSide,
    emissive: 0x35120e,
    emissiveIntensity: 0.2,
  });
  deps.runtime.ownedMaterials.push(flagMaterial);
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(0.43, 2.72, 0);
  flag.rotation.y = Math.PI / 2;
  flag.castShadow = true;
  group.add(flag);
  deps.runtime.flags.push({
    mesh: flag,
    basePositions: Float32Array.from((flagGeometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array),
  });

  const castleGlow = new THREE.PointLight(0xffb766, 3.1, 2.1, 2);
  castleGlow.position.set(0, 0.85, 0.55);
  group.add(castleGlow);

  const frontBanner = createBanner(deps, '#8b3d33', 1.36);
  frontBanner.position.set(-0.51, 0.82, 0.24);
  frontBanner.rotation.y = -1.12;
  group.add(frontBanner);
  const sideBanner = createBanner(deps, '#2d6e74', 1.2);
  sideBanner.position.set(0.5, 0.76, 0.16);
  sideBanner.rotation.y = 1.24;
  group.add(sideBanner);
  const gateTorch = createTorch(deps);
  gateTorch.scale.setScalar(1.65);
  gateTorch.position.set(0.26, 0.46, 0.59);
  group.add(gateTorch);

  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  group.userData.kind = 'castle';
  group.userData.spaceIndex = spaceIndex;
  group.userData.title = '鸦堡 Ravenskeep';
  group.userData.meta = '终点城堡 · 巫师进堡即离场';
  group.userData.anchorHeight = 3.3;
  group.userData.selectRadius = 1.15;
  return group;
}

export interface WizardOptions {
  wizardId: WizardID;
  ownerPlayerId: PlayerID;
  highlighted: boolean;
  interactive: boolean;
}

export function createWizard(deps: PieceDeps, options: WizardOptions): THREE.Group {
  const { wizardId, ownerPlayerId, highlighted, interactive } = options;
  const group = new THREE.Group();
  const color = new THREE.Color(playerColor(ownerPlayerId));

  const clothMap = deps.lib.cloth(ownerPlayerId, playerColor(ownerPlayerId));
  const robeMaterial = new THREE.MeshStandardMaterial({
    map: clothMap,
    color: 0xcdbfae,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.12,
  });
  const hatMaterial = new THREE.MeshStandardMaterial({
    map: clothMap,
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0,
    envMapIntensity: 0.14,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: color.clone().multiplyScalar(0.58),
    roughness: 0.9,
    metalness: 0,
  });
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0x342922, roughness: 0.9 });
  deps.runtime.ownedMaterials.push(robeMaterial, hatMaterial, darkMaterial, headMaterial);

  const robeProfile = [
    new THREE.Vector2(0.045, 0.0),
    new THREE.Vector2(0.205, 0.005),
    new THREE.Vector2(0.22, 0.025),
    new THREE.Vector2(0.18, 0.09),
    new THREE.Vector2(0.13, 0.2),
    new THREE.Vector2(0.105, 0.31),
    new THREE.Vector2(0.085, 0.385),
  ];
  group.add(new THREE.Mesh(new THREE.LatheGeometry(robeProfile, 28), robeMaterial));

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.012, 6, 22), darkMaterial);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.2;
  group.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), headMaterial);
  head.position.set(0, 0.405, 0.022);
  head.scale.y = 1.05;
  group.add(head);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.097, 0.018, 7, 24), darkMaterial);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.37;
  group.add(collar);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.236, 0.252, 0.026, 28), hatMaterial);
  brim.position.y = 0.438;
  group.add(brim);

  const hatProfile = [
    new THREE.Vector2(0.172, 0.0),
    new THREE.Vector2(0.148, 0.06),
    new THREE.Vector2(0.108, 0.135),
    new THREE.Vector2(0.058, 0.225),
    new THREE.Vector2(0.008, 0.335),
  ];
  const hat = new THREE.Mesh(new THREE.LatheGeometry(hatProfile, 28), hatMaterial);
  hat.position.y = 0.445;
  group.add(hat);

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.023, 0), deps.mats.gold);
  star.position.set(0.028, 0.735, 0.008);
  group.add(star);

  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.31, 14, 1, true), robeMaterial);
  cape.position.set(0, 0.2, -0.08);
  cape.rotation.x = 0.18;
  group.add(cape);

  if (highlighted) {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xe2b75d,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    deps.runtime.ownedMaterials.push(ringMaterial);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 8, 40), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.008;
    group.add(ring);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: deps.lib.soft,
        color: 0xffdc8a,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(0.9, 0.9, 1);
    glow.position.y = 0.015;
    group.add(glow);
  }

  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  group.userData.kind = 'wizard';
  group.userData.wizardId = wizardId;
  group.userData.ownerPlayerId = ownerPlayerId;
  group.userData.title = `${ownerPlayerId} · ${playerName(ownerPlayerId)}`;
  group.userData.meta = interactive ? '当前可选巫师' : '旁观 · 非本方行动';
  group.userData.anchorHeight = 0.86;
  group.userData.selectRadius = 0.34;
  return group;
}
