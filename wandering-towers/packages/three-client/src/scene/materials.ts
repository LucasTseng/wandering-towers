import * as THREE from 'three';
import type { TextureLibrary } from './textures';

/**
 * 材质库 —— 与视觉原型同一套配色与粗糙度口径。
 * 塔身/城堡/废墟使用「灰泥石墙」贴图（近景不会出现编织纹），
 * 棋盘侧壁可选叠加 CC0 大块砂岩真实材质。
 */
export interface PhotoStone {
  color: THREE.Texture;
  normal: THREE.Texture;
}

export interface MaterialLibrary {
  boardTop: THREE.MeshStandardMaterial;
  boardSide: THREE.MeshStandardMaterial;
  boardBottom: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  stoneLight: THREE.MeshStandardMaterial;
  ravenStone: THREE.MeshStandardMaterial;
  ravenStoneLight: THREE.MeshStandardMaterial;
  navyStone: THREE.MeshStandardMaterial;
  ancientStone: THREE.MeshStandardMaterial;
  ancientStoneLight: THREE.MeshStandardMaterial;
  trimStone: THREE.MeshStandardMaterial;
  trimStoneDark: THREE.MeshStandardMaterial;
  trimNavy: THREE.MeshStandardMaterial;
  trimAncient: THREE.MeshStandardMaterial;
  rock: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  iron: THREE.MeshStandardMaterial;
  trunk: THREE.MeshStandardMaterial;
  leaves: THREE.MeshStandardMaterial[];
  window: THREE.MeshStandardMaterial;
  water: THREE.MeshPhysicalMaterial;
  rune: THREE.MeshStandardMaterial;
  shield: THREE.MeshStandardMaterial;
}

export function createMaterials(lib: TextureLibrary, photo?: PhotoStone): MaterialLibrary {
  const towerStoneMap = lib.stone.clone();
  towerStoneMap.repeat.set(1.35, 0.62);
  towerStoneMap.needsUpdate = true;
  const towerRavenMap = lib.ravenStone.clone();
  towerRavenMap.repeat.set(1.35, 0.62);
  towerRavenMap.needsUpdate = true;
  const towerNavyMap = lib.navyStone.clone();
  towerNavyMap.repeat.set(1.5, 0.8);
  towerNavyMap.needsUpdate = true;

  const boardSideMap = photo?.color ?? lib.stone.clone();
  if (!photo) {
    boardSideMap.repeat.set(7, 1.7);
    boardSideMap.needsUpdate = true;
  }

  const boardSide = new THREE.MeshStandardMaterial({
    map: boardSideMap,
    normalMap: photo?.normal ?? null,
    color: photo ? 0x9b8863 : 0x8d805f,
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: 0.06,
  });
  if (photo) boardSide.normalScale.set(0.5, 0.5);

  return {
    boardTop: new THREE.MeshStandardMaterial({
      map: lib.board,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0.18,
    }),
    boardSide,
    boardBottom: new THREE.MeshStandardMaterial({ color: 0x504a3b, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({
      map: lib.plasterWarm,
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.01,
      envMapIntensity: 0.08,
    }),
    stoneLight: new THREE.MeshStandardMaterial({
      map: lib.plasterWarm,
      color: 0xcab38a,
      roughness: 0.93,
      envMapIntensity: 0.08,
    }),
    ravenStone: new THREE.MeshStandardMaterial({
      map: lib.plasterRaven,
      color: 0xf0eadb,
      roughness: 0.94,
      metalness: 0.01,
      envMapIntensity: 0.08,
    }),
    ravenStoneLight: new THREE.MeshStandardMaterial({
      map: lib.plasterRaven,
      color: 0xd2d0c1,
      roughness: 0.91,
    }),
    navyStone: new THREE.MeshStandardMaterial({
      map: lib.plasterNavy,
      color: 0xaebfbe,
      roughness: 0.92,
      metalness: 0.03,
      envMapIntensity: 0.13,
    }),
    ancientStone: new THREE.MeshStandardMaterial({
      map: lib.plasterAncient,
      color: 0xe0ddcc,
      roughness: 0.98,
      metalness: 0.01,
      envMapIntensity: 0.05,
    }),
    ancientStoneLight: new THREE.MeshStandardMaterial({
      map: lib.plasterAncient,
      color: 0xc7c5b3,
      roughness: 0.96,
    }),
    trimStone: new THREE.MeshStandardMaterial({
      color: 0x9b8059,
      roughness: 0.84,
      metalness: 0.03,
      envMapIntensity: 0.1,
    }),
    trimStoneDark: new THREE.MeshStandardMaterial({
      color: 0x65533a,
      roughness: 0.9,
      metalness: 0.02,
      envMapIntensity: 0.08,
    }),
    trimNavy: new THREE.MeshStandardMaterial({
      color: 0x263e4a,
      roughness: 0.82,
      metalness: 0.08,
      envMapIntensity: 0.14,
    }),
    trimAncient: new THREE.MeshStandardMaterial({
      color: 0x6e7864,
      roughness: 0.96,
      metalness: 0.01,
    }),
    rock: new THREE.MeshStandardMaterial({
      map: lib.rock,
      bumpMap: lib.rock,
      bumpScale: 0.07,
      roughness: 1,
      metalness: 0,
      color: 0x929a84,
    }),
    grass: new THREE.MeshStandardMaterial({
      map: lib.grass,
      bumpMap: lib.grass,
      bumpScale: 0.025,
      color: 0x8d9c68,
      roughness: 0.98,
      metalness: 0,
      envMapIntensity: 0.06,
    }),
    roof: new THREE.MeshStandardMaterial({
      map: lib.roof,
      bumpMap: lib.roof,
      bumpScale: 0.035,
      roughness: 0.8,
      metalness: 0.02,
      envMapIntensity: 0.08,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xd4ab58,
      roughness: 0.38,
      metalness: 0.68,
      envMapIntensity: 0.45,
    }),
    iron: new THREE.MeshStandardMaterial({
      color: 0x2b3432,
      roughness: 0.62,
      metalness: 0.45,
    }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6e4d31, roughness: 0.96 }),
    leaves: [
      new THREE.MeshStandardMaterial({ color: 0x33562f, roughness: 0.94 }),
      new THREE.MeshStandardMaterial({ color: 0x486b35, roughness: 0.92 }),
      new THREE.MeshStandardMaterial({ color: 0x668440, roughness: 0.9 }),
    ],
    window: new THREE.MeshStandardMaterial({
      map: lib.window,
      emissiveMap: lib.window,
      emissive: 0xffb85b,
      emissiveIntensity: 1.15,
      transparent: true,
      alphaTest: 0.08,
      roughness: 0.4,
      side: THREE.DoubleSide,
    }),
    water: new THREE.MeshPhysicalMaterial({
      color: 0x4f9295,
      roughness: 0.24,
      metalness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.22,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 0.55,
    }),
    rune: new THREE.MeshStandardMaterial({
      color: 0x8dd5c8,
      emissive: 0x2d9d97,
      emissiveIntensity: 2.1,
      roughness: 0.28,
      metalness: 0.1,
    }),
    shield: new THREE.MeshStandardMaterial({
      map: lib.shield,
      roughness: 0.46,
      metalness: 0.22,
      envMapIntensity: 0.35,
    }),
  };
}
