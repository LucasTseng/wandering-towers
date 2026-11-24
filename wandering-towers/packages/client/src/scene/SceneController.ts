import * as THREE from 'three';
import type { SpaceIndex, TowerID, WizardID } from '@wt/shared';
import type { SceneCell, StageInteraction } from '../game/types';
import { createTextureLibrary, mulberry32 } from './textures';
import type { TextureLibrary } from './textures';
import { createMaterials } from './materials';
import type { MaterialLibrary, PhotoStone } from './materials';
import { CardLayer } from './cardLayer';
import type { CardMode, CardView, PotionView } from './cardLayer';
import { createEnvironment, updateEnvironment } from './environment';
import type { EnvironmentRuntime } from './environment';
import {
  addContactShadow,
  createCastle,
  createPieceRuntime,
  createTower,
  createWizard,
} from './pieces';
import type { PieceRuntime } from './pieces';
import {
  BOARD_TOP,
  GROUND_WIZARD_SCALE,
  TOWER_LAYER,
  TOWER_WIZARD_SCALE,
  WIZARD_ANCHOR_HEIGHT,
  WIZARD_SELECT_RADIUS,
  spacePolar,
} from './layout';

/**
 * TowerScene —— 3D 渲染控制器
 *
 * 只消费 `SceneCell[]` 与 `StageInteraction`（由引擎状态派生），
 * 不读规则、不改状态；点击只回调给 React 容器，由容器派发命令。
 */

export interface PinElements {
  root: HTMLElement;
  kicker: HTMLElement;
  name: HTMLElement;
  meta: HTMLElement;
}

export interface SceneOptions {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  pin: PinElements;
  reducedMotion?: boolean;
}

const CAMERA_DEFAULTS = { yaw: -0.34, pitch: 36, zoom: 0.9 };

export class TowerScene {
  private readonly stage: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly pin: PinElements;
  private readonly reducedMotion: boolean;

  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly worldPoint = new THREE.Vector3();

  private lib!: TextureLibrary;
  private mats!: MaterialLibrary;
  private env!: EnvironmentRuntime;

  private tileRoot = new THREE.Group();
  private seamMaterial: THREE.MeshStandardMaterial | null = null;
  private tileMap: THREE.Texture | null = null;
  private pieceRoot = new THREE.Group();
  private pieceRuntime: PieceRuntime = createPieceRuntime();
  private pickRoots: THREE.Object3D[] = [];

  private selectionRing: THREE.Mesh | null = null;
  private selectionGlow: THREE.Sprite | null = null;
  private selectedRoot: THREE.Object3D | null = null;
  private readOnly = false;

  private cameraState = {
    yaw: CAMERA_DEFAULTS.yaw,
    pitch: CAMERA_DEFAULTS.pitch,
    zoom: CAMERA_DEFAULTS.zoom,
    baseDistance: 33,
    target: new THREE.Vector3(0, 1.22, 0),
  };

  private interaction: StageInteraction | null = null;
  private pointerDrag: { x: number; y: number; yaw: number; pitch: number; moved: number } | null = null;
  private hoverFrame = 0;
  private resizeObserver: ResizeObserver | null = null;
  private animationActive = false;
  private disposed = false;

  private cardLayer: CardLayer | null = null;
  private lastElapsed = 0;
  /** 卡牌点击回调由 React 层注入；回放（只读）时不会触发 */
  onCardClick: ((id: string) => void) | null = null;
  /** 卡牌悬停变化（用于「悬停法术牌堆展开」） */
  onCardHover: ((id: string | null) => void) | null = null;
  private lastHoverId: string | null = null;

  private static readonly CELL_COUNT = 16;

  constructor(options: SceneOptions) {
    this.stage = options.stage;
    this.canvas = options.canvas;
    this.pin = options.pin;
    this.reducedMotion = options.reducedMotion ?? false;

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.78;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(33, 1, 0.1, 130);
  }

  async init(): Promise<void> {
    this.lib = createTextureLibrary();
    const photo = await loadPhotoStone();
    this.mats = createMaterials(this.lib, photo);

    this.scene.background = this.lib.sky;
    this.scene.environment = this.lib.sky;
    this.scene.fog = new THREE.Fog(0x7f9f98, 28, 58);

    this.addLights();
    this.env = createEnvironment({ lib: this.lib, mats: this.mats });
    this.scene.add(this.env.root);

    this.buildTiles();
    this.scene.add(this.tileRoot);

    this.pieceRoot.name = 'pieces';
    this.scene.add(this.pieceRoot);

    this.cardLayer = new CardLayer(this.camera, this.stage, this.reducedMotion);
    this.cardLayer.attach(this.scene);

    this.createSelection();
    this.bindInput();
    this.observeResize();
    this.updateProjection();

    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
    this.animationActive = true;
    this.renderer.setAnimationLoop(this.animate);
  }

  /** 每次 GameState 变化后调用：重建塔/巫师/城堡与高亮环 */
  update(cells: SceneCell[], interaction: StageInteraction): void {
    if (this.disposed) return;
    this.interaction = interaction;
    this.rebuildPieces(cells, interaction);
  }

  private addLights(): void {
    const hemi = new THREE.HemisphereLight(0x86aaa9, 0x172016, 0.3);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffc27c, 4.05);
    sun.position.set(-13.5, 8.4, 5.8);
    sun.target.position.set(0, 0.8, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12.5;
    sun.shadow.camera.right = 12.5;
    sun.shadow.camera.top = 12.5;
    sun.shadow.camera.bottom = -12.5;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 45;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 3.5;
    sun.shadow.camera.updateProjectionMatrix();
    this.scene.add(sun);
    this.scene.add(sun.target);

    const fill = new THREE.DirectionalLight(0x79b4ca, 0.65);
    fill.position.set(14, 7, -12);
    fill.target.position.set(0, 0.5, 0);
    this.scene.add(fill);
    this.scene.add(fill.target);

    const rim = new THREE.DirectionalLight(0x9ed6d5, 1.05);
    rim.position.set(4, 4, -14);
    rim.target.position.set(0, 1.8, 0);
    this.scene.add(rim);
    this.scene.add(rim.target);

    const runeLight = new THREE.PointLight(0x5ec3bc, 4.3, 5.5, 2);
    runeLight.position.set(0, 2.84, -0.2);
    runeLight.name = 'rune-light';
    this.scene.add(runeLight);
  }

  /** 静态地块：位置与纹章来自地图定义，材质按玩家色/纹章区分 */
  private buildTiles(): void {
    const seamMaterial = new THREE.MeshStandardMaterial({ color: 0x4e4232, roughness: 0.95, metalness: 0.02 });
    this.seamMaterial = seamMaterial;
    const tileMap = this.lib.stone.clone();
    tileMap.repeat.set(0.85, 0.85);
    tileMap.needsUpdate = true;
    this.tileMap = tileMap;

    for (let index = 0; index < TowerScene.CELL_COUNT; index += 1) {
      const { angle, x, z } = spacePolar(index);
      const group = new THREE.Group();
      group.position.set(x, BOARD_TOP, z);
      group.rotation.y = -angle;
      group.userData.spaceIndex = index;
      this.tileRoot.add(group);

      const tileMaterial = new THREE.MeshStandardMaterial({
        map: tileMap,
        bumpMap: tileMap,
        bumpScale: 0.04,
        color: 0xd9cfb4,
        roughness: 0.93,
        metalness: 0,
        envMapIntensity: 0.08,
      });
      const tile = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.36, 0.14, 16, 1), [
        this.mats.trimStone,
        tileMaterial,
        this.mats.trimStone,
      ]);
      tile.position.y = 0.07;
      tile.castShadow = true;
      tile.receiveShadow = true;
      tile.userData.spaceIndex = index;
      tile.userData.pickSpace = true;
      group.add(tile);
      this.pickRoots.push(tile);

      // 实体石板拼缝：比贴图更能撑住近景细节
      const seams = new THREE.Group();
      seams.position.y = 0.1428;
      for (const radius of [0.46, 0.79, 1.07]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.0055, 4, 40), seamMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.0015;
        seams.add(ring);
      }
      for (let slot = 0; slot < 8; slot += 1) {
        const a = (slot / 8) * Math.PI * 2 + Math.PI / 8;
        const length = 1.18;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.004, length), seamMaterial);
        bar.position.set(Math.sin(a) * (length / 2), 0.0015, Math.cos(a) * (length / 2));
        bar.rotation.y = a;
        seams.add(bar);
      }
      group.add(seams);

      // 地块边缘的苔藓与碎石，让圆盘不像塑料片
      const decoRandom = mulberry32(3400 + index);
      for (let decorIndex = 0; decorIndex < 4; decorIndex += 1) {
        const decorAngle = decoRandom() * Math.PI * 2;
        const decorRadius = 0.86 + decoRandom() * 0.28;
        const dx = Math.cos(decorAngle) * decorRadius;
        const dz = Math.sin(decorAngle) * decorRadius;
        if (decorIndex < 2) {
          const lichen = new THREE.Mesh(
            new THREE.SphereGeometry(0.14 + decoRandom() * 0.12, 7, 5),
            this.mats.leaves[decorIndex] as THREE.Material,
          );
          lichen.scale.y = 0.15;
          lichen.position.set(dx, 0.153, dz);
          lichen.receiveShadow = true;
          group.add(lichen);
        } else {
          const pebble = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.045 + decoRandom() * 0.055, 0),
            this.mats.rock,
          );
          pebble.scale.y = 0.55;
          pebble.position.set(dx, 0.17, dz);
          pebble.rotation.set(decoRandom() * 2, decoRandom() * 3, decoRandom() * 2);
          pebble.castShadow = true;
          group.add(pebble);
        }
      }
    }
  }

  private rebuildPieces(cells: SceneCell[], interaction: StageInteraction): void {
    this.disposePieceRoot();
    this.pieceRuntime = createPieceRuntime();
    const deps = { lib: this.lib, mats: this.mats, runtime: this.pieceRuntime };
    this.pickRoots = this.pickRoots.filter((o) => o.userData.pickSpace === true);

    for (const cell of cells) {
      const { angle, x, z } = spacePolar(cell.spaceIndex);
      const group = new THREE.Group();
      group.position.set(x, BOARD_TOP, z);
      group.rotation.y = -angle;
      this.pieceRoot.add(group);

      // 高亮环：目标 = 金，可选 = 绿
      if (interaction.targetSpaces.has(cell.spaceIndex)) {
        group.add(this.createRing(0xd7a33f, 0.92, 1.04, 1.15));
        const glow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: this.lib.soft,
            color: 0xffd174,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        glow.scale.set(2.4, 2.4, 1);
        glow.position.y = 0.22;
        group.add(glow);
      } else if (interaction.selectableSpaces.has(cell.spaceIndex)) {
        group.add(this.createRing(0x3e9868, 0.7, 1.03, 1.14));
      }

      // 地面纹章：仅当该地块没有塔时显示
      if (cell.groundHasRavenShield && cell.towerLayers.length === 0) {
        const medallion = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32),
          new THREE.MeshStandardMaterial({ color: 0x2c7c86, roughness: 0.4, metalness: 0.38 }),
        );
        medallion.position.set(0, 0.16, 0);
        group.add(medallion);
        const crest = new THREE.Mesh(new THREE.CircleGeometry(0.25, 32), this.mats.shield);
        crest.rotation.x = -Math.PI / 2;
        crest.position.y = 0.181;
        group.add(crest);
      }

      // 地面巫师（站在地块上，不在塔顶）—— 地块宽，最多一层环即可
      const groundSlots = placeWizards(cell.groundWizards.length, 1.0);
      cell.groundWizards.forEach((wizard, wizardIndex) => {
        const spot = groundSlots[wizardIndex] ?? groundSlots[0]!;
        const mesh = createWizard(deps, {
          wizardId: wizard.wizardId,
          ownerPlayerId: wizard.ownerPlayerId,
          highlighted: interaction.highlightWizards.has(wizard.wizardId),
          interactive: interaction.onWizardClick !== undefined,
        });
        mesh.scale.setScalar(GROUND_WIZARD_SCALE);
        mesh.userData.anchorHeight = WIZARD_ANCHOR_HEIGHT * GROUND_WIZARD_SCALE;
        mesh.userData.selectRadius = WIZARD_SELECT_RADIUS * GROUND_WIZARD_SCALE;
        addContactShadow(mesh, deps, 0.36 * GROUND_WIZARD_SCALE, 0.28, 0.004);
        mesh.position.set(spot.x, 0.14 + 0.004 + spot.lift, spot.z);
        mesh.rotation.y = angle + wizardIndex * 1.3;
        if (interaction.onWizardClick) {
          mesh.userData.pickable = true;
          this.pickRoots.push(mesh);
        }
        group.add(mesh);
      });

      // 塔堆
      cell.towerLayers.forEach((layer, tier) => {
        const isTop = tier === cell.towerLayers.length - 1;
        const tower = createTower(deps, {
          towerId: layer.towerId,
          spaceIndex: cell.spaceIndex,
          tier,
          isTop,
          hasRavenShield: layer.hasRavenShield,
          sealed: layer.sealed,
          angle,
        });
        tower.position.set(0, 0.14 + tier * TOWER_LAYER, 0);
        if (interaction.onTowerClick) {
          tower.userData.pickable = true;
          this.pickRoots.push(tower);
        }
        group.add(tower);
      });

      // 塔顶巫师：平台半径仅 0.6，7 人起改双圈，9 人仍不穿模
      const stackHeight = cell.towerLayers.length * TOWER_LAYER;
      const topSlots = placeWizards(cell.topWizards.length, 0.5);
      cell.topWizards.forEach((wizard, wizardIndex) => {
        const spot = topSlots[wizardIndex] ?? topSlots[0]!;
        const mesh = createWizard(deps, {
          wizardId: wizard.wizardId,
          ownerPlayerId: wizard.ownerPlayerId,
          highlighted: interaction.highlightWizards.has(wizard.wizardId),
          interactive: interaction.onWizardClick !== undefined,
        });
        mesh.scale.setScalar(TOWER_WIZARD_SCALE);
        mesh.userData.anchorHeight = WIZARD_ANCHOR_HEIGHT * TOWER_WIZARD_SCALE;
        mesh.userData.selectRadius = WIZARD_SELECT_RADIUS * TOWER_WIZARD_SCALE;
        addContactShadow(mesh, deps, 0.34 * TOWER_WIZARD_SCALE, 0.26, 0.004);
        // 0.612 = 塔顶平台面高度；之前用 +0.008 会让脚部陷进塔顶约 0.044
        mesh.position.set(spot.x, 0.14 + stackHeight + 0.052 + spot.lift, spot.z);
        mesh.rotation.y = angle + wizardIndex * 1.3;
        if (interaction.onWizardClick) {
          mesh.userData.pickable = true;
          this.pickRoots.push(mesh);
        }
        group.add(mesh);
      });

      // 乌鸦城堡：地面或塔顶
      if (cell.castleHere || cell.castleOnTowerId) {
        const castle = createCastle(deps, cell.spaceIndex);
        castle.scale.setScalar(1.34);
        castle.position.set(0, 0.14 + (cell.castleHere ? 0 : stackHeight), 0);
        castle.userData.pickable = true;
        this.pickRoots.push(castle);
        group.add(castle);
      }
    }

    // 让子网格都能回溯到可拾取根
    for (const root of this.pickRoots) {
      root.traverse((child) => {
        child.userData.pickRoot = root;
      });
    }

    if (this.selectedRoot && !this.pickRoots.includes(this.selectedRoot)) {
      this.hideEntity();
    } else if (this.selectedRoot) {
      this.showEntity(this.selectedRoot);
    }
  }

  private createRing(color: number, opacity: number, innerRadius: number, outerRadius: number): THREE.Mesh {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius, 64), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.16;
    return ring;
  }

  private createSelection(): void {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xe8bc62,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    this.selectionRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 8, 64), ringMaterial);
    this.selectionRing.rotation.x = Math.PI / 2;
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

    this.selectionGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.lib.soft,
        color: 0xffda7e,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.selectionGlow.visible = false;
    this.selectionGlow.scale.set(2.4, 2.4, 1);
    this.scene.add(this.selectionGlow);
  }

  /** 只读模式（回放）：禁止拾取，并在切进来时清空选中 */
  setReadOnly(value: boolean): void {
    this.readOnly = value;
    this.cardLayer?.setEnabled(!value);
    if (value) this.hideEntity();
  }

  // ---------- 纵深卡牌层 ----------
  setCards(
    hand: readonly CardView[],
    spells: readonly CardView[],
    mode: CardMode,
    selectedId: string | null,
    targetingId: string | null = null,
  ): void {
    this.cardLayer?.setData(hand, spells, mode, selectedId, targetingId);
    this.cardLayer?.setEnabled(!this.readOnly);
  }

  /** 右上角漂浮魔法瓶 */
  setPotions(list: readonly PotionView[]): void {
    this.cardLayer?.setPotions(list);
  }

  /** 卡牌在舞台内的屏幕坐标（供 DOM 浮层贴靠） */
  getCardAnchor(id: string): { x: number; y: number; h: number } | null {
    return this.cardLayer?.anchor(id) ?? null;
  }

  burstCard(id: string, color: string, count = 22): void {
    this.cardLayer?.burst(id, color, count);
  }

  /** 供只读模式（回放）强制清空选中：不依赖 cells 是否变化 */
  clearSelection(): void {
    this.hideEntity();
  }

  private showEntity(root: THREE.Object3D): void {
    if (!this.selectionRing || !this.selectionGlow) return;
    this.selectedRoot = root;
    const position = new THREE.Vector3();
    root.getWorldPosition(position);
    const radius = (root.userData.selectRadius as number) || 0.8;
    this.selectionRing.position.set(position.x, position.y + 0.03, position.z);
    this.selectionRing.scale.setScalar(radius);
    this.selectionRing.visible = true;
    this.selectionGlow.position.set(position.x, position.y + 0.05, position.z);
    this.selectionGlow.scale.set(radius * 3.4, radius * 3.4, 1);
    this.selectionGlow.visible = true;

    const kind = root.userData.kind as string;
    this.pin.kicker.textContent = kind === 'castle' ? 'DESTINATION' : kind === 'wizard' ? 'WIZARD' : 'FOCUS';
    this.pin.name.textContent = (root.userData.title as string) ?? '';
    this.pin.meta.textContent = (root.userData.meta as string) ?? '';
    this.pin.root.classList.add('is-visible');
  }

  private hideEntity(): void {
    this.selectedRoot = null;
    if (this.selectionRing) this.selectionRing.visible = false;
    if (this.selectionGlow) this.selectionGlow.visible = false;
    this.pin.root.classList.remove('is-visible');
  }

  // ---------- 输入 ----------
  private bindInput(): void {
    this.stage.addEventListener('pointerdown', this.onPointerDown);
    this.stage.addEventListener('pointermove', this.onPointerMove);
    this.stage.addEventListener('pointerup', this.onPointerUp);
    this.stage.addEventListener('pointercancel', this.onPointerCancel);
    this.stage.addEventListener('wheel', this.onWheel, { passive: false });
    this.stage.addEventListener('dblclick', this.onDoubleClick);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    this.cardLayer?.setHover(null);
    this.pointerDrag = {
      x: event.clientX,
      y: event.clientY,
      yaw: this.cameraState.yaw,
      pitch: this.cameraState.pitch,
      moved: 0,
    };
    this.stage.classList.add('is-dragging');
    this.stage.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.pointerDrag) {
      const dx = event.clientX - this.pointerDrag.x;
      const dy = event.clientY - this.pointerDrag.y;
      this.pointerDrag.moved = Math.max(this.pointerDrag.moved, Math.hypot(dx, dy));
      this.cameraState.yaw = this.pointerDrag.yaw - dx * 0.006;
      this.cameraState.pitch = Math.max(34, Math.min(72, this.pointerDrag.pitch + dy * 0.14));
      this.updateCamera();
      return;
    }
    if (this.hoverFrame) return;
    this.hoverFrame = requestAnimationFrame(() => {
      this.hoverFrame = 0;
      const cardId = this.cardAt(event);
      this.cardLayer?.setHover(cardId);
      if (cardId !== this.lastHoverId) {
        this.lastHoverId = cardId;
        this.onCardHover?.(cardId);
      }
      this.stage.style.cursor = cardId || this.pickAt(event) ? 'pointer' : 'grab';
    });
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.pointerDrag) return;
    const wasClick = this.pointerDrag.moved < 5;
    this.pointerDrag = null;
    this.stage.classList.remove('is-dragging');
    this.stage.style.cursor = 'grab';
    if (!wasClick) return;

    const cardId = this.cardAt(event);
    if (cardId) {
      this.hideEntity();
      this.cardLayer?.burst(cardId, '#e4b95f', 18);
      this.onCardClick?.(cardId);
      return;
    }

    const picked = this.pickAt(event);
    if (!picked) {
      this.hideEntity();
      return;
    }
    this.showEntity(picked);

    const kind = picked.userData.kind as string;
    const interaction = this.interaction;
    if (!interaction) return;
    if (kind === 'wizard' && interaction.onWizardClick) {
      interaction.onWizardClick(picked.userData.wizardId as WizardID);
    } else if (kind === 'tower' && interaction.onTowerClick) {
      interaction.onTowerClick(picked.userData.spaceIndex as SpaceIndex, picked.userData.towerId as TowerID);
    } else if (kind === 'castle' && interaction.onSpaceClick) {
      interaction.onSpaceClick(picked.userData.spaceIndex as SpaceIndex);
    } else if (picked.userData.pickSpace === true && interaction.onSpaceClick) {
      interaction.onSpaceClick(picked.userData.spaceIndex as SpaceIndex);
    }
  };

  private onPointerCancel = (): void => {
    this.pointerDrag = null;
    this.stage.classList.remove('is-dragging');
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.cameraState.zoom = Math.max(0.62, Math.min(1.42, this.cameraState.zoom + (event.deltaY > 0 ? 0.06 : -0.06)));
    this.updateCamera();
  };

  private onDoubleClick = (): void => {
    this.resetCamera();
  };

  private pointerToNdc(event: PointerEvent | MouseEvent): DOMRect {
    const rect = this.stage.getBoundingClientRect();
    this.pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return rect;
  }

  /** 卡牌命中：优先于棋盘，回放时一律返回 null */
  private cardAt(event: PointerEvent | MouseEvent): string | null {
    if (this.readOnly || !this.cardLayer) return null;
    const rect = this.pointerToNdc(event);
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      return null;
    }
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    return this.cardLayer.pick(this.raycaster);
  }

  private pickAt(event: PointerEvent | MouseEvent): THREE.Object3D | null {
    // 只读模式（回放）：即使有残留拾取对象也一律不响应
    if (this.readOnly) return null;
    const rect = this.pointerToNdc(event);
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      return null;
    }
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const intersections = this.raycaster.intersectObjects(this.pickRoots, true);
    for (const hit of intersections) {
      let object: THREE.Object3D | null = hit.object;
      while (object && !object.userData.pickRoot) object = object.parent;
      if (object?.userData.pickRoot) return object.userData.pickRoot as THREE.Object3D;
    }
    return null;
  }

  // ---------- 相机 ----------
  private updateCamera(): void {
    const pitch = (this.cameraState.pitch * Math.PI) / 180;
    const distance = this.cameraState.baseDistance * this.cameraState.zoom;
    const horizontal = Math.cos(pitch) * distance;
    this.camera.position.set(
      Math.sin(this.cameraState.yaw) * horizontal,
      Math.sin(pitch) * distance,
      Math.cos(this.cameraState.yaw) * horizontal,
    );
    this.camera.lookAt(this.cameraState.target);
  }

  private updateProjection(): void {
    const width = Math.max(1, this.stage.clientWidth);
    const height = Math.max(1, this.stage.clientHeight);
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.9 ? 45 : 33;
    const tanHalf = Math.tan((this.camera.fov * Math.PI) / 360);
    const fitWidth = 9.9 / (tanHalf * aspect);
    const fitHeight = 8.6 / tanHalf;
    this.cameraState.baseDistance = Math.max(fitWidth, fitHeight) * 1.12;
    this.camera.updateProjectionMatrix();
    this.updateCamera();
  }

  resetCamera(): void {
    this.cameraState.yaw = CAMERA_DEFAULTS.yaw;
    this.cameraState.pitch = CAMERA_DEFAULTS.pitch;
    this.cameraState.zoom = CAMERA_DEFAULTS.zoom;
    this.updateCamera();
  }

  zoomBy(delta: number): void {
    this.cameraState.zoom = Math.max(0.62, Math.min(1.42, this.cameraState.zoom + delta));
    this.updateCamera();
  }

  private observeResize(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateProjection();
    });
    this.resizeObserver.observe(this.stage);
  }

  // ---------- 渲染循环 ----------
  private animate = (): void => {
    if (!this.animationActive || this.disposed) return;
    const elapsed = this.clock.getElapsedTime();

    updateEnvironment(this.env, elapsed, this.reducedMotion);
    this.animatePieces(elapsed);
    const dt = Math.min(0.05, Math.max(0, elapsed - this.lastElapsed));
    this.lastElapsed = elapsed;
    this.cardLayer?.update(dt);

    if (this.selectionRing) {
      (this.selectionRing.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(elapsed * 2.1) * 0.18;
    }
    if (this.selectionGlow) {
      (this.selectionGlow.material as THREE.SpriteMaterial).opacity = 0.28 + Math.sin(elapsed * 1.7) * 0.08;
    }
    const runeLight = this.scene.getObjectByName('rune-light');
    if (runeLight) (runeLight as THREE.PointLight).intensity = 3.8 + Math.sin(elapsed * 1.5) * 0.7;

    this.updatePinPosition();
    this.renderer.render(this.scene, this.camera);
  };

  private animatePieces(elapsed: number): void {
    if (this.reducedMotion) return;
    const runtime = this.pieceRuntime;

    for (const { flame, core, glow } of runtime.torches) {
      const flicker = 1 + Math.sin(elapsed * 9 + Math.random() * 0.6) * 0.08;
      flame.scale.set(0.92 + (flicker - 1) * 1.4, flicker, 0.92);
      core.scale.setScalar(0.88 + flicker * 0.1);
      (glow.material as THREE.SpriteMaterial).opacity = 0.42 + flicker * 0.12;
    }

    for (const banner of runtime.banners) {
      const position = banner.cloth.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i += 1) {
        const baseX = banner.basePositions[i * 3] as number;
        const baseY = banner.basePositions[i * 3 + 1] as number;
        const t = (0.215 - baseY) / 0.43;
        const flutter = Math.sin(elapsed * 2.4 + baseX * 9 + t * 4) * 0.012 * t;
        position.setZ(i, flutter);
      }
      position.needsUpdate = true;
    }

    for (const flag of runtime.flags) {
      const position = flag.mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i += 1) {
        const x = flag.basePositions[i * 3] as number;
        const y = flag.basePositions[i * 3 + 1] as number;
        const wave = Math.sin(elapsed * 2.1 + x * 8 + y * 2) * 0.032 * ((x + 0.24) / 0.48);
        position.setZ(i, wave);
      }
      position.needsUpdate = true;
    }
  }

  private updatePinPosition(): void {
    if (!this.selectedRoot) return;
    this.selectedRoot.getWorldPosition(this.worldPoint);
    this.worldPoint.y += (this.selectedRoot.userData.anchorHeight as number) || 0.8;
    this.worldPoint.project(this.camera);
    const rect = this.stage.getBoundingClientRect();
    if (
      this.worldPoint.z > 1 ||
      this.worldPoint.x < -0.86 ||
      this.worldPoint.x > 0.86 ||
      this.worldPoint.y < -0.88 ||
      this.worldPoint.y > 0.88
    ) {
      this.pin.root.classList.remove('is-visible');
      return;
    }
    this.pin.root.classList.add('is-visible');
    this.pin.root.style.left = `${(this.worldPoint.x * 0.5 + 0.5) * rect.width}px`;
    this.pin.root.style.top = `${(-this.worldPoint.y * 0.5 + 0.5) * rect.height}px`;
  }

  // ---------- 释放 ----------
  private disposePieceRoot(): void {
    this.pieceRoot.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
    });
    for (const material of this.pieceRuntime.ownedMaterials) material.dispose();
    this.pieceRoot.clear();
    this.selectedRoot = null;
  }

  dispose(): void {
    this.disposed = true;
    this.animationActive = false;
    this.renderer.setAnimationLoop(null);
    this.cardLayer?.dispose();
    this.cardLayer = null;

    this.stage.removeEventListener('pointerdown', this.onPointerDown);
    this.stage.removeEventListener('pointermove', this.onPointerMove);
    this.stage.removeEventListener('pointerup', this.onPointerUp);
    this.stage.removeEventListener('pointercancel', this.onPointerCancel);
    this.stage.removeEventListener('wheel', this.onWheel);
    this.stage.removeEventListener('dblclick', this.onDoubleClick);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.hoverFrame) cancelAnimationFrame(this.hoverFrame);

    this.disposePieceRoot();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
      const sprite = object as unknown as THREE.Sprite;
      if (sprite.isSprite && sprite.material) sprite.material.dispose();
    });
    this.seamMaterial?.dispose();
    this.tileMap?.dispose();
    if (this.lib) for (const texture of this.lib.all) texture.dispose();
    this.renderer.dispose();
  }
}

interface WizardSlot {
  x: number;
  z: number;
  /** 轻微高差，避免双圈时外圈与内圈在同一平面糊成一片 */
  lift: number;
}

/**
 * 同格多名巫师的占位方案。
 *
 * `radius` 是“可用平面半径”，调用方按地块/塔顶实际尺寸传入。
 * 1–6 人单圈，7–9 人内 3 外 N，10 人以上内 4 外 N —— 这样 9 名巫师
 * 在 0.6 半径的塔顶也不会互相穿模，且每圈仍能看清个体轮廓。
 */
function placeWizards(total: number, radius: number): WizardSlot[] {
  const ring = (count: number, r: number, offset: number, lift: number): WizardSlot[] =>
    Array.from({ length: count }, (_, i) => {
      const a = offset + (i / count) * Math.PI * 2;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, lift };
    });

  if (total <= 0) return [];
  if (total === 1) return [{ x: 0, z: 0, lift: 0 }];
  if (total === 2) {
    return [
      { x: -radius * 0.45, z: 0, lift: 0 },
      { x: radius * 0.45, z: 0, lift: 0 },
    ];
  }
  if (total === 3) return ring(3, radius * 0.52, -Math.PI / 2, 0);
  if (total === 4) return ring(4, radius * 0.6, -Math.PI / 2 + Math.PI / 4, 0);
  if (total <= 6) return ring(total, radius * 0.72, -Math.PI / 2, 0);
  if (total <= 9) {
    return [
      ...ring(3, radius * 0.4, -Math.PI / 2, 0.02),
      ...ring(total - 3, radius * 0.88, -Math.PI / 2 + Math.PI / (total - 3), 0),
    ];
  }
  return [
    ...ring(4, radius * 0.38, -Math.PI / 2 + Math.PI / 4, 0.016),
    ...ring(total - 4, radius * 0.9, -Math.PI / 2, 0),
  ];
}

async function loadPhotoStone(): Promise<PhotoStone | undefined> {
  const base = import.meta.env.BASE_URL || '/';
  const loader = new THREE.TextureLoader();
  const load = (file: string) =>
    new Promise<THREE.Texture | null>((resolve) => {
      loader.load(
        `${base}textures/${file}`,
        (texture) => resolve(texture),
        undefined,
        () => resolve(null),
      );
    });

  try {
    const [color, normal] = await Promise.all([
      load('sandstone_color.webp'),
      load('sandstone_normal.webp'),
    ]);
    if (!color || !normal) return undefined;
    color.colorSpace = THREE.SRGBColorSpace;
    color.wrapS = THREE.RepeatWrapping;
    color.wrapT = THREE.RepeatWrapping;
    color.repeat.set(11, 1.75);
    color.anisotropy = 4;
    normal.wrapS = THREE.RepeatWrapping;
    normal.wrapT = THREE.RepeatWrapping;
    normal.repeat.set(11, 1.75);
    normal.anisotropy = 4;
    return { color, normal };
  } catch {
    return undefined;
  }
}

