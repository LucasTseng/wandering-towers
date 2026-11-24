import * as THREE from 'three';

/**
 * 纵深卡牌层（Depth UI · L2/L3/L4）
 *
 * 设计见 `docs/architecture/08-UI纵深交互方案.md`：
 * - 手牌 / 法术不再占用侧栏，改为挂在相机前方的 3D 平面；
 * - 槽位用 NDC（归一化设备坐标）+ 距离描述，换分辨率不会出画；
 * - 卡面用 CanvasTexture 绘制，配色取 `styles/three.css` 的羊皮纸与金饰变量；
 * - 只在表现层工作，不接触规则引擎。
 */

export type CardKind = 'tower' | 'wizard' | 'both' | 'spell';

export interface CardView {
  id: string;
  kind: CardKind;
  /** 角标文字（步数或「骰」）；法术卡传 null */
  badge: string | null;
  title: string;
  sub: string;
  disabled: boolean;
}

export type CardMode = 'hand' | 'card' | 'spells';

export type PotionVisualState = 'FULL' | 'EMPTY' | 'SPENT';

export interface PotionView {
  id: string;
  state: PotionVisualState;
  color: string;
}

interface Slot {
  nx: number;
  ny: number;
  dist: number;
  s: number;
  op: number;
  tilt: number;
  fan: number;
  roll: number;
}

interface Tween {
  from: Slot;
  to: Slot;
  t: number;
  dur: number;
  delay: number;
}

interface PotionRuntime {
  id: string;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  signature: string;
  index: number;
}

interface CardRuntime {
  id: string;
  kind: CardKind;
  root: THREE.Group;
  face: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  aura: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  auraGold: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  slot: Slot;
  tween: Tween | null;
  hover: number;
  glow: number;
  gold: number;
  signature: string;
}

const CARD_W = 1.66;
const CARD_H = 2.49;

/** 槽位常量：NDC 横纵 + 距相机距离（世界单位，随场景尺度） */
function S(nx: number, ny: number, dist: number, extra: Partial<Slot> = {}): Slot {
  return { nx, ny, dist, s: 1, op: 1, tilt: 0.2, fan: 0, roll: 0, ...extra };
}

const HAND_SLOTS: Slot[] = [
  S(-0.56, -0.58, 15.4, { fan: 0.1 }),
  S(0, -0.47, 14.6),
  S(0.56, -0.58, 15.4, { fan: -0.1 }),
];
const TARGET_OUT_SLOTS: Slot[] = [
  S(-0.78, -0.6, 14.8, { s: 0.68, op: 0.26, fan: 0.2 }),
  S(0.04, -0.74, 14.6, { s: 0.66, op: 0.18 }),
  S(0.62, -0.58, 14.8, { s: 0.68, op: 0.24, fan: -0.2 }),
];

const HAND_OUT_SLOTS: Slot[] = [
  S(-0.5, -0.72, 13.8, { s: 0.9, op: 0.22, fan: 0.14 }),
  S(0, -0.78, 13.6, { s: 0.88, op: 0.16 }),
  S(0.5, -0.72, 13.8, { s: 0.9, op: 0.22, fan: -0.14 }),
];
const SELECTED_SLOT: Slot = S(0, -0.10, 11.9, { s: 1.12, tilt: 0.12 });
/** 选目标态（选巫师 / 选塔）：主卡退到左下并缩小，把棋盘中部让给点击 */
const TARGET_SLOT: Slot = S(-0.5, -0.54, 12.9, { s: 0.78, tilt: 0.1, fan: 0.05 });
const DECK_SLOTS: Slot[] = [
  S(-0.70, 0.08, 18.0, { s: 0.72, tilt: 0.3, fan: 0.46, roll: 0.06 }),
  S(-0.695, 0.095, 17.9, { s: 0.72, tilt: 0.3, fan: 0.44, roll: 0.03 }),
  S(-0.69, 0.11, 17.8, { s: 0.72, tilt: 0.3, fan: 0.42, roll: 0 }),
  S(-0.685, 0.125, 17.7, { s: 0.72, tilt: 0.3, fan: 0.4, roll: -0.03 }),
];
const DECK_STACK_SLOTS: Slot[] = [
  S(-0.70, 0.08, 18.0, { s: 0.72, tilt: 0.3, fan: 0.46, roll: 0.05, op: 0.28 }),
  S(-0.69, 0.10, 17.8, { s: 0.72, tilt: 0.3, fan: 0.44, roll: 0.02, op: 0.22 }),
  S(-0.68, 0.12, 17.6, { s: 0.72, tilt: 0.3, fan: 0.42, roll: -0.02, op: 0.16 }),
];
const FAN_SLOTS: Slot[] = [
  S(-0.68, -0.44, 16.2, { s: 0.88, fan: 0.1 }),
  S(-0.24, -0.36, 15.6, { s: 0.88, fan: 0.03 }),
  S(0.24, -0.36, 15.6, { s: 0.88, fan: -0.03 }),
  S(0.68, -0.44, 16.2, { s: 0.88, fan: -0.1 }),
];

const PAPER_TOP = '#f9eecf';
const PAPER_MID = '#eedcb4';
const PAPER_LOW = '#d8bf90';
const INK = '#2b2416';
const GOLD = '#c3943d';
const GOLD_DEEP = '#a4762c';
const TEAL = '#2d7f88';

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

const CARD_PX_W = 512;
const CARD_PX_H = 768;

function paintCard(view: CardView): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_PX_W;
  canvas.height = CARD_PX_H;
  const g = canvas.getContext('2d');
  if (!g) {
    const blank = new THREE.CanvasTexture(canvas);
    blank.colorSpace = THREE.SRGBColorSpace;
    return blank;
  }
  const W = CARD_PX_W;
  const H = CARD_PX_H;

  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, PAPER_TOP);
  paper.addColorStop(0.52, PAPER_MID);
  paper.addColorStop(1, PAPER_LOW);
  roundRect(g, 0, 0, W, H, 34);
  g.fillStyle = paper;
  g.fill();

  for (let i = 0; i < 2000; i += 1) {
    g.fillStyle = `rgba(120,95,55,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
  }
  const vignette = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.8);
  vignette.addColorStop(0, 'rgba(120,95,50,0)');
  vignette.addColorStop(1, 'rgba(110,85,45,0.16)');
  g.fillStyle = vignette;
  roundRect(g, 0, 0, W, H, 34);
  g.fill();

  if (view.kind !== 'spell') {
    g.fillStyle = 'rgba(190,163,112,0.34)';
    roundRect(g, 26, 26, 58, H - 52, 10);
    g.fill();
    g.strokeStyle = 'rgba(150,119,68,0.5)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(84, 30);
    g.lineTo(84, H - 30);
    g.stroke();
  }

  if (view.badge !== null) {
    g.fillStyle = GOLD_DEEP;
    g.beginPath();
    g.arc(W - 92, 96, 40, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,250,235,0.9)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(W - 92, 96, 32, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#fffaea';
    g.font = view.badge.length > 1 ? '600 30px "Songti SC","STSong","SimSun",Georgia,serif' : '600 42px Georgia,"Songti SC","STSong","SimSun",serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(view.badge, W - 92, 100);
  }

  if (view.kind === 'spell') {
    const cx = W / 2;
    const cy = 296;
    const r = 112;
    const ring = g.createRadialGradient(cx - r * 0.3, cy - r * 0.34, r * 0.1, cx, cy, r);
    ring.addColorStop(0, '#dff0e2');
    ring.addColorStop(0.6, '#a9c6b4');
    ring.addColorStop(1, '#5f8377');
    g.fillStyle = '#8b7a55';
    g.beginPath();
    g.arc(cx, cy, r + 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = ring;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#e6d49a';
    g.lineWidth = 2.6;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(45,127,136,0.6)';
    g.lineWidth = 1.8;
    g.setLineDash([5, 7]);
    g.beginPath();
    g.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.strokeStyle = '#2f5f4c';
    g.lineWidth = 5.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx, cy - r * 0.5);
    g.lineTo(cx, cy + r * 0.5);
    g.moveTo(cx - r * 0.46, cy - r * 0.2);
    g.lineTo(cx + r * 0.46, cy + r * 0.3);
    g.moveTo(cx + r * 0.46, cy - r * 0.2);
    g.lineTo(cx - r * 0.46, cy + r * 0.3);
    g.stroke();
  } else {
    const drawTower = (cx: number, cy: number, s: number): void => {
      g.save();
      g.translate(cx, cy);
      g.fillStyle = 'rgba(110,90,55,0.15)';
      g.beginPath();
      g.ellipse(0, s * 0.72, s * 0.72, s * 0.15, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#d9c9a3';
      g.strokeStyle = '#8b774e';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-s * 0.6, s * 0.62);
      g.lineTo(-s * 0.5, -s * 0.5);
      g.lineTo(s * 0.5, -s * 0.5);
      g.lineTo(s * 0.6, s * 0.62);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#c9b892';
      for (let i = 0; i < 4; i += 1) {
        g.fillRect(-s * 0.5 + i * s * 0.28, -s * 0.66, s * 0.17, s * 0.18);
      }
      g.fillStyle = '#6f5c37';
      g.beginPath();
      g.arc(0, s * 0.3, s * 0.13, Math.PI, 0);
      g.fill();
      g.restore();
    };
    const drawWizard = (cx: number, cy: number, s: number): void => {
      g.save();
      g.translate(cx, cy);
      g.fillStyle = '#ad4f39';
      g.beginPath();
      g.moveTo(0, -s * 0.7);
      g.lineTo(s * 0.29, s * 0.02);
      g.lineTo(-s * 0.29, s * 0.02);
      g.closePath();
      g.fill();
      g.fillStyle = '#f7e5bf';
      g.beginPath();
      g.moveTo(-s * 0.52, s * 0.05);
      g.quadraticCurveTo(0, -s * 0.12, s * 0.52, s * 0.05);
      g.quadraticCurveTo(0, s * 0.21, -s * 0.52, s * 0.05);
      g.fill();
      g.fillStyle = '#ad4f39';
      g.beginPath();
      g.moveTo(-s * 0.34, s * 0.13);
      g.lineTo(s * 0.34, s * 0.13);
      g.lineTo(s * 0.42, s * 0.74);
      g.lineTo(-s * 0.42, s * 0.74);
      g.closePath();
      g.fill();
      g.fillStyle = '#3a2922';
      g.beginPath();
      g.arc(0, s * 0.4, s * 0.1, 0, Math.PI * 2);
      g.fill();
      g.restore();
    };
    if (view.kind === 'tower') drawTower(W / 2, 300, 146);
    else if (view.kind === 'wizard') drawWizard(W / 2, 314, 166);
    else {
      drawTower(W / 2 - 72, 306, 116);
      drawWizard(W / 2 + 76, 318, 130);
    }
  }

  g.textAlign = 'center';
  g.fillStyle = INK;
  g.font = '600 48px Georgia,"Songti SC","STSong","SimSun",serif';
  g.fillText(view.title, W / 2, 598);

  g.fillStyle = 'rgba(43,36,22,0.78)';
  g.font = '30px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  g.fillText(view.sub, W / 2, 650);

  g.strokeStyle = 'rgba(164,136,86,0.5)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(W / 2 - 74, 676);
  g.lineTo(W / 2 + 74, 676);
  g.stroke();

  g.fillStyle = 'rgba(43,36,22,0.42)';
  g.font = '21px Georgia,serif';
  g.fillText(view.kind === 'spell' ? 'RUNE' : 'CODEX', W / 2, 712);

  g.strokeStyle = 'rgba(150,112,52,0.95)';
  g.lineWidth = 3.6;
  roundRect(g, 15, 15, W - 30, H - 30, 26);
  g.stroke();
  g.strokeStyle = 'rgba(177,142,76,0.32)';
  g.lineWidth = 1;
  roundRect(g, 26, 26, W - 52, H - 52, 19);
  g.stroke();

  if (view.disabled) {
    g.fillStyle = 'rgba(226,214,188,0.55)';
    roundRect(g, 0, 0, W, H, 34);
    g.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const BOTTLE_W = 240;
const BOTTLE_H = 400;

function bottlePath(g: CanvasRenderingContext2D): void {
  // 圆肚药剂瓶：细颈 + 饱满瓶身（参考哈利波特里的魔药瓶，不是试管）
  g.beginPath();
  g.moveTo(97, 150);
  g.lineTo(97, 206);
  g.bezierCurveTo(97, 224, 56, 238, 56, 288);
  g.bezierCurveTo(56, 338, 84, 364, 120, 364);
  g.bezierCurveTo(156, 364, 184, 338, 184, 288);
  g.bezierCurveTo(184, 238, 143, 224, 143, 206);
  g.lineTo(143, 150);
  g.closePath();
}

function paintBottle(state: PotionVisualState, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = BOTTLE_W;
  canvas.height = BOTTLE_H;
  const g = canvas.getContext('2d');
  if (g) {
    const full = state === 'FULL';
    const spent = state === 'SPENT';
    const liquidTop = 252;

    // 投影
    const shadow = g.createRadialGradient(120, 372, 6, 120, 372, 66);
    shadow.addColorStop(0, 'rgba(36,56,48,0.34)');
    shadow.addColorStop(1, 'rgba(36,56,48,0)');
    g.fillStyle = shadow;
    g.fillRect(50, 330, 140, 66);

    // 液体（画在玻璃之下）
    if (full) {
      g.save();
      bottlePath(g);
      g.clip();
      const liquid = g.createLinearGradient(0, liquidTop, 0, 364);
      liquid.addColorStop(0, `${color}e6`);
      liquid.addColorStop(0.4, `${color}f2`);
      liquid.addColorStop(1, `${color}c4`);
      g.fillStyle = liquid;
      g.fillRect(52, liquidTop, 136, 130);

      // 液面（椭圆 + 边缘反光）
      g.fillStyle = 'rgba(255,255,255,0.42)';
      g.beginPath();
      g.ellipse(120, liquidTop, 60, 12, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.82)';
      g.beginPath();
      g.ellipse(120, liquidTop - 1.5, 45, 6.5, 0, 0, Math.PI * 2);
      g.fill();

      // 气泡
      for (let i = 0; i < 16; i += 1) {
        const bx = 74 + Math.random() * 92;
        const by = liquidTop + 16 + Math.random() * 96;
        const r = 1.4 + Math.random() * 3.4;
        g.fillStyle = `rgba(255,255,255,${0.16 + Math.random() * 0.34})`;
        g.beginPath();
        g.arc(bx, by, r, 0, Math.PI * 2);
        g.fill();
      }

      // 液体底部沉色
      const deep = g.createLinearGradient(0, 320, 0, 364);
      deep.addColorStop(0, 'rgba(0,0,0,0)');
      deep.addColorStop(1, 'rgba(60,20,10,0.22)');
      g.fillStyle = deep;
      g.fillRect(52, 320, 136, 44);
      g.restore();
    } else if (state === 'EMPTY') {
      g.save();
      bottlePath(g);
      g.clip();
      g.fillStyle = 'rgba(255,255,255,0.09)';
      g.fillRect(52, 300, 136, 64);
      g.fillStyle = `${color}3d`;
      g.beginPath();
      g.ellipse(120, 352, 46, 9, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    // 玻璃：边缘实、中心透 + 曲面高光
    g.save();
    bottlePath(g);
    const glass = g.createLinearGradient(56, 0, 184, 0);
    glass.addColorStop(0, 'rgba(222,242,238,0.72)');
    glass.addColorStop(0.14, 'rgba(255,255,255,0.22)');
    glass.addColorStop(0.46, 'rgba(210,234,230,0.05)');
    glass.addColorStop(0.86, 'rgba(255,255,255,0.2)');
    glass.addColorStop(1, 'rgba(196,224,220,0.74)');
    g.fillStyle = glass;
    g.fill();
    g.strokeStyle = 'rgba(112,146,142,0.6)';
    g.lineWidth = 2.6;
    g.stroke();
    g.restore();

    // 肩部环形反光
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(120, 286, 56, Math.PI * 1.08, Math.PI * 1.42);
    g.stroke();

    // 左侧竖向高光
    g.strokeStyle = 'rgba(255,255,255,0.62)';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(78, 262);
    g.bezierCurveTo(70, 296, 74, 322, 88, 340);
    g.stroke();

    // 瓶颈与瓶口
    g.fillStyle = 'rgba(226,244,240,0.5)';
    g.beginPath();
    g.roundRect(92, 142, 56, 14, 6);
    g.fill();
    g.strokeStyle = 'rgba(112,146,142,0.55)';
    g.lineWidth = 2;
    g.stroke();

    // 木塞 + 封蜡
    g.save();
    if (spent) {
      g.translate(120, 104);
      g.rotate(-0.4);
      g.translate(-120, -104);
    }
    const cork = g.createLinearGradient(0, 96, 0, 148);
    cork.addColorStop(0, spent ? '#bda78d' : '#c69a5f');
    cork.addColorStop(0.55, spent ? '#a08b73' : '#a87d45');
    cork.addColorStop(1, spent ? '#8b7761' : '#88622f');
    g.fillStyle = cork;
    g.beginPath();
    g.roundRect(98, 92, 44, 56, 9);
    g.fill();
    g.strokeStyle = 'rgba(88,64,32,0.5)';
    g.lineWidth = 1.6;
    g.stroke();
    // 封蜡
    g.fillStyle = spent ? 'rgba(150,120,96,0.8)' : 'rgba(168,58,44,0.92)';
    g.beginPath();
    g.roundRect(96, 104, 48, 16, 6);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.beginPath();
    g.roundRect(103, 98, 12, 42, 6);
    g.fill();
    g.restore();

    if (spent) {
      g.strokeStyle = 'rgba(112,92,64,0.45)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(92, 240);
      g.lineTo(108, 268);
      g.lineTo(98, 294);
      g.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function paintAura(radius: number, color: string, ticks: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    const cx = size / 2;
    const cy = size / 2;
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, radius, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1.8;
    g.setLineDash([6, 12]);
    g.beginPath();
    g.arc(cx, cy, radius * 0.86, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < ticks; i += 1) {
      const a = (i / ticks) * Math.PI * 2;
      const r1 = radius * 0.72;
      const r2 = radius * 0.84;
      g.lineWidth = i % 3 === 0 ? 4 : 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      g.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function paintAuraGold(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    const cx = size / 2;
    const cy = size / 2;
    g.strokeStyle = 'rgba(228,185,95,0.9)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(cx, cy, 236, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      g.strokeStyle = 'rgba(228,185,95,0.75)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * 196, cy + Math.sin(a) * 196);
      g.lineTo(cx + Math.cos(a) * 236, cy + Math.sin(a) * 236);
      g.stroke();
      g.save();
      g.translate(cx + Math.cos(a) * 168, cy + Math.sin(a) * 168);
      g.rotate(a);
      g.strokeStyle = 'rgba(94,195,188,0.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-7, -7);
      g.lineTo(7, 7);
      g.moveTo(7, -7);
      g.lineTo(-7, 7);
      g.stroke();
      g.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const P_MAX = 260;

export class CardLayer {
  readonly group = new THREE.Group();

  private readonly camera: THREE.PerspectiveCamera;
  private readonly stage: HTMLElement;
  private readonly reducedMotion: boolean;

  /** 独立渲染层：卡牌画在雾气/调色叠加层之上，否则会被舞台氛围冲淡 */
  private readonly layerScene = new THREE.Scene();
  private readonly layerCamera: THREE.PerspectiveCamera;
  private readonly layerRenderer: THREE.WebGLRenderer;
  private readonly layerCanvas: HTMLCanvasElement;
  private layerWidth = 0;
  private layerHeight = 0;

  private readonly auraTex: THREE.CanvasTexture = paintAura(214, 'rgba(94,195,188,0.85)', 24);
  private readonly auraGoldTex: THREE.CanvasTexture = paintAuraGold();

  private readonly cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
  private readonly auraGeo = new THREE.PlaneGeometry(CARD_W * 1.72, CARD_H * 1.58);
  private readonly auraGoldGeo = new THREE.PlaneGeometry(CARD_W * 1.86, CARD_H * 1.66);

  private cards = new Map<string, CardRuntime>();
  private readonly potionGroup = new THREE.Group();
  private readonly potions = new Map<string, PotionRuntime>();
  private potionOrder: string[] = [];
  private mode: CardMode = 'hand';
  private selectedId: string | null = null;
  private targetingId: string | null = null;
  private enabled = true;
  private hoverId: string | null = null;

  private readonly tmpV = new THREE.Vector3();
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpE = new THREE.Euler();

  private readonly particleGeo = new THREE.BufferGeometry();
  private readonly particlePos = new Float32Array(P_MAX * 3);
  private readonly particleVel = new Float32Array(P_MAX * 3);
  private readonly particleLife = new Float32Array(P_MAX);
  private readonly particleMax = new Float32Array(P_MAX);
  private readonly particleAlpha = new Float32Array(P_MAX);
  private readonly particleColor = new Float32Array(P_MAX * 3);
  private particleCursor = 0;
  private readonly particles: THREE.Points;

  constructor(camera: THREE.PerspectiveCamera, stage: HTMLElement, reducedMotion: boolean) {
    this.camera = camera;
    this.stage = stage;
    this.reducedMotion = reducedMotion;
    this.group.renderOrder = 40;
    this.group.visible = false;

    this.layerCamera = new THREE.PerspectiveCamera(camera.fov, 1, 0.1, 160);
    this.layerCanvas = document.createElement('canvas');
    this.layerCanvas.className = 'card-layer-canvas';
    this.layerCanvas.setAttribute('aria-hidden', 'true');
    this.stage.appendChild(this.layerCanvas);
    this.layerRenderer = new THREE.WebGLRenderer({
      canvas: this.layerCanvas,
      antialias: true,
      alpha: true,
    });
    this.layerRenderer.setClearColor(0x000000, 0);
    this.layerRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.layerRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.layerRenderer.toneMapping = THREE.NoToneMapping;
    this.layerScene.add(this.group);
    this.layerScene.add(this.potionGroup);

    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePos, 3));
    this.particleGeo.setAttribute('aColor', new THREE.BufferAttribute(this.particleColor, 3));
    this.particleGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.particleAlpha, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 aColor; attribute float aAlpha;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vColor = aColor; vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 90.0 / max(0.001, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec2 d = gl_PointCoord - vec2(0.5);
          float r = length(d);
          if (r > 0.5) discard;
          float a = smoothstep(0.5, 0.0, r) * vAlpha;
          gl_FragColor = vec4(vColor, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(this.particleGeo, material);
    this.particles.frustumCulled = false;
    this.particles.renderOrder = 45;
  }

  attach(_scene: THREE.Scene): void {
    this.layerScene.add(this.particles);
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /** 手牌、法术与当前模式变化时调用；按 id 差量复用，避免重建纹理 */
  setData(
    hand: readonly CardView[],
    spells: readonly CardView[],
    mode: CardMode,
    selectedId: string | null,
    targetingId: string | null = null,
  ): void {
    const nextIds = new Set<string>();
    for (const view of hand) nextIds.add(view.id);
    for (const view of spells) nextIds.add(view.id);

    for (const [id, runtime] of this.cards) {
      if (!nextIds.has(id)) {
        this.disposeRuntime(runtime);
        this.cards.delete(id);
      }
    }

    const ensured: CardRuntime[] = [];
    for (const view of hand) ensured.push(this.ensureCard(view));
    for (const view of spells) ensured.push(this.ensureCard(view));

    this.group.visible = ensured.length > 0;

    this.mode = mode;
    this.selectedId = selectedId;
    this.targetingId = targetingId;
    this.applyLayout(hand, spells);
  }

  /** 右上角漂浮魔法瓶：状态变化时重绘瓶身 */
  setPotions(list: readonly PotionView[]): void {
    const nextIds = new Set(list.map((item) => item.id));
    for (const [id, runtime] of this.potions) {
      if (!nextIds.has(id)) {
        this.potionGroup.remove(runtime.mesh);
        runtime.mesh.material.map?.dispose();
        runtime.mesh.material.dispose();
        this.potions.delete(id);
      }
    }
    this.potionOrder = list.map((item) => item.id);

    list.forEach((item, index) => {
      const signature = `${item.state}|${item.color}`;
      const existing = this.potions.get(item.id);
      if (existing) {
        existing.index = index;
        if (existing.signature !== signature) {
          existing.signature = signature;
          existing.mesh.material.map?.dispose();
          existing.mesh.material.map = paintBottle(item.state, item.color);
          existing.mesh.material.needsUpdate = true;
        }
        return;
      }
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.54, 0.9),
        new THREE.MeshBasicMaterial({
          map: paintBottle(item.state, item.color),
          transparent: true,
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      );
      mesh.renderOrder = 38;
      mesh.userData.potionId = item.id;
      this.potionGroup.add(mesh);
      this.potions.set(item.id, { id: item.id, mesh, signature, index });
    });
  }

  private ensureCard(view: CardView): CardRuntime {
    const signature = `${view.kind}|${view.badge ?? ''}|${view.title}|${view.sub}|${view.disabled ? 1 : 0}`;
    const existing = this.cards.get(view.id);
    if (existing) {
      if (existing.signature !== signature) {
        existing.signature = signature;
        existing.face.material.map?.dispose();
        existing.face.material.map = paintCard(view);
        existing.face.material.needsUpdate = true;
      }
      return existing;
    }

    const root = new THREE.Group();
    const face = new THREE.Mesh(
      this.cardGeo,
      new THREE.MeshBasicMaterial({
        map: paintCard(view),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    face.renderOrder = 42;
    root.add(face);

    const aura = new THREE.Mesh(
      this.auraGeo,
      new THREE.MeshBasicMaterial({
        map: this.auraTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    // 光效只是视觉效果：不参与射线检测，避免它的外框抢走对棋盘/目标的点击
    aura.raycast = () => {};
    aura.position.z = -0.02;
    aura.renderOrder = 41;
    root.add(aura);

    const auraGold = new THREE.Mesh(
      this.auraGoldGeo,
      new THREE.MeshBasicMaterial({
        map: this.auraGoldTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    auraGold.raycast = () => {};
    auraGold.position.z = -0.04;
    auraGold.renderOrder = 40;
    root.add(auraGold);

    this.group.add(root);

    root.userData.cardId = view.id;
    const runtime: CardRuntime = {
      id: view.id,
      kind: view.kind,
      root,
      face,
      aura,
      auraGold,
      slot: { ...S(0, 0, 20) },
      tween: null,
      hover: 0,
      glow: 0,
      gold: 0,
      signature,
    };
    runtime.slot.op = 0;
    this.cards.set(view.id, runtime);
    return runtime;
  }

  private applyLayout(hand: readonly CardView[], spells: readonly CardView[]): void {
    hand.forEach((view, index) => {
      const runtime = this.cards.get(view.id);
      if (!runtime) return;
      const targeting = this.mode === 'card' && this.targetingId !== null;
      let target: Slot;
      if (this.mode === 'card' && view.id === this.selectedId) {
        target = targeting ? TARGET_SLOT : SELECTED_SLOT;
      } else if (this.mode === 'card') {
        const outs = targeting ? TARGET_OUT_SLOTS : HAND_OUT_SLOTS;
        target = outs[index] ?? outs[1] ?? S(0, -0.8, 13);
      }
      else if (this.mode === 'spells') target = DECK_STACK_SLOTS[index] ?? DECK_STACK_SLOTS[1] ?? S(-0.7, 0.1, 23);
      else target = HAND_SLOTS[index] ?? HAND_SLOTS[1] ?? S(0, -0.5, 14);
      this.tweenTo(runtime, target, 460, index * 55);
      runtime.glow = this.mode === 'card' && view.id === this.selectedId ? 1 : 0;
      runtime.gold = runtime.glow;
    });

    spells.forEach((view, index) => {
      const runtime = this.cards.get(view.id);
      if (!runtime) return;
      const target = this.mode === 'spells'
        ? FAN_SLOTS[index] ?? FAN_SLOTS[3] ?? S(0.6, -0.48, 15)
        : DECK_SLOTS[index] ?? DECK_SLOTS[3] ?? S(-0.77, 0.13, 22.8);
      this.tweenTo(runtime, target, 520, index * 45);
      runtime.glow = this.mode === 'spells' ? 0.6 : 0;
      runtime.gold = 0;
    });
  }

  private tweenTo(runtime: CardRuntime, target: Slot, dur: number, delay: number): void {
    if (this.reducedMotion) {
      runtime.slot = { ...target };
      runtime.tween = null;
      return;
    }
    runtime.tween = { from: { ...runtime.slot }, to: { ...target }, t: -delay, dur, delay };
  }

  update(dt: number): void {
    const camera = this.camera;
    const time = performance.now() * 0.001;

    const w = this.stage.clientWidth;
    const h = this.stage.clientHeight;
    if (w > 0 && h > 0 && (w !== this.layerWidth || h !== this.layerHeight)) {
      this.layerWidth = w;
      this.layerHeight = h;
      this.layerRenderer.setSize(w, h, false);
      this.layerCamera.aspect = w / h;
      this.layerCamera.updateProjectionMatrix();
    }

    for (const [, runtime] of this.cards) {
      if (runtime.tween) {
        const tw = runtime.tween;
        tw.t += dt * 1000;
        if (tw.t >= 0) {
          const k = Math.min(1, tw.t / tw.dur);
          const e = easeInOutCubic(k);
          runtime.slot = {
            nx: tw.from.nx + (tw.to.nx - tw.from.nx) * e,
            ny: tw.from.ny + (tw.to.ny - tw.from.ny) * e,
            dist: tw.from.dist + (tw.to.dist - tw.from.dist) * e,
            s: tw.from.s + (tw.to.s - tw.from.s) * e,
            op: tw.from.op + (tw.to.op - tw.from.op) * e,
            tilt: tw.from.tilt + (tw.to.tilt - tw.from.tilt) * e,
            fan: tw.from.fan + (tw.to.fan - tw.from.fan) * e,
            roll: tw.from.roll + (tw.to.roll - tw.from.roll) * e,
          };
          if (k >= 1) runtime.tween = null;
        }
      }

      const slot = runtime.slot;
      this.tmpV.set(slot.nx, slot.ny, 0.5).unproject(camera).sub(camera.position).normalize();
      runtime.root.position.copy(camera.position).addScaledVector(this.tmpV, slot.dist);
      runtime.root.position.y += runtime.hover * 0.14;
      runtime.root.position.z += runtime.hover * 0.06;

      runtime.root.quaternion.copy(camera.quaternion);
      this.tmpE.set(-slot.tilt - runtime.hover * 0.04, 0, slot.fan + slot.roll);
      this.tmpQ.setFromEuler(this.tmpE);
      runtime.root.quaternion.multiply(this.tmpQ);
      runtime.root.scale.setScalar(slot.s * (1 + runtime.hover * 0.03));

      const targetHover = runtime.id === this.hoverId && this.enabled ? 1 : 0;
      runtime.hover += (targetHover - runtime.hover) * Math.min(1, dt * 12);

      runtime.face.material.opacity = slot.op;

      const breathe = 0.5 + 0.5 * Math.sin(time * 1.6 + runtime.root.position.x);
      runtime.aura.material.opacity = runtime.glow * slot.op * (0.34 + breathe * 0.12);
      runtime.aura.rotation.z = time * 0.28;
      runtime.aura.scale.setScalar(1 + breathe * 0.03);

      runtime.auraGold.material.opacity = runtime.gold * slot.op * (0.2 + breathe * 0.14);
      runtime.auraGold.rotation.z = -time * 0.16;
      runtime.auraGold.scale.setScalar(1 + (1 - breathe) * 0.05);

      runtime.root.visible = slot.op > 0.02;
    }

    const t = time;
    const total = Math.max(1, this.potionOrder.length);
    this.potionOrder.forEach((id, index) => {
      const runtime = this.potions.get(id);
      if (!runtime) return;
      const spread = Math.min(0.058, 0.32 / total);
      const nx = 0.625 + spread * index + spread * 0.5;
      const ny = 0.455 + Math.sin(t * 1.3 + index * 0.7) * 0.007;
      this.tmpV.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
      runtime.mesh.position.copy(camera.position).addScaledVector(this.tmpV, 14.2);
      runtime.mesh.quaternion.copy(camera.quaternion);
      runtime.mesh.rotateZ(Math.sin(t * 0.8 + index) * 0.04);
      const pulse = 1 + Math.sin(t * 1.6 + index) * 0.012;
      runtime.mesh.scale.setScalar(pulse);
    });

    this.stepParticles(dt);

    this.layerCamera.position.copy(camera.position);
    this.layerCamera.quaternion.copy(camera.quaternion);
    this.layerCamera.fov = camera.fov;
    this.layerCamera.updateProjectionMatrix();
    this.layerRenderer.render(this.layerScene, this.layerCamera);
  }

  /**
   * 返回命中的卡牌 id；命中后由调用方决定是否派发点击。
   *
   * 只检测卡面本身（face），不递归整个卡牌组 —— 魔法阵、光晕、粒子这些装饰
   * 都比卡面大一圈，若参与检测会挡住卡牌后面的棋盘目标（选巫师/选塔时点不到）。
   */
  pick(raycaster: THREE.Raycaster): string | null {
    if (!this.enabled) return null;
    const faces: THREE.Object3D[] = [];
    const owners: string[] = [];
    for (const [id, runtime] of this.cards) {
      if (!runtime.root.visible || runtime.slot.op <= 0.5) continue;
      faces.push(runtime.face);
      owners.push(id);
    }
    if (faces.length === 0) return null;
    const hits = raycaster.intersectObjects(faces, false);
    if (hits.length === 0) return null;
    const index = faces.indexOf(hits[0]!.object);
    return index >= 0 ? (owners[index] ?? null) : null;
  }

  setHover(id: string | null): void {
    this.hoverId = this.enabled ? id : null;
  }

  burst(id: string, color: string, count: number): void {
    const runtime = this.cards.get(id);
    if (!runtime) return;
    const origin = runtime.root.position;
    const rgb = new THREE.Color(color);
    for (let i = 0; i < count; i += 1) {
      const index = this.particleCursor;
      this.particleCursor = (this.particleCursor + 1) % P_MAX;
      const a = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.4;
      this.particlePos[index * 3] = origin.x + (Math.random() - 0.5) * 1.2;
      this.particlePos[index * 3 + 1] = origin.y + (Math.random() - 0.5) * 1.2;
      this.particlePos[index * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.6;
      this.particleVel[index * 3] = Math.cos(a) * speed;
      this.particleVel[index * 3 + 1] = 0.6 + Math.random() * 1.2;
      this.particleVel[index * 3 + 2] = Math.sin(a) * speed;
      this.particleLife[index] = 0.6 + Math.random() * 0.5;
      this.particleMax[index] = this.particleLife[index] ?? 1;
      this.particleColor[index * 3] = rgb.r;
      this.particleColor[index * 3 + 1] = rgb.g;
      this.particleColor[index * 3 + 2] = rgb.b;
      this.particleAlpha[index] = 1;
    }
  }

  private stepParticles(dt: number): void {
    for (let i = 0; i < P_MAX; i += 1) {
      const life = this.particleLife[i] ?? 0;
      if (life <= 0) {
        this.particleAlpha[i] = 0;
        continue;
      }
      const next = life - dt;
      this.particleLife[i] = next;
      const max = this.particleMax[i] ?? 1;
      this.particleAlpha[i] = Math.max(0, next / max) ** 2;
      this.particlePos[i * 3] = (this.particlePos[i * 3] ?? 0) + (this.particleVel[i * 3] ?? 0) * dt;
      this.particlePos[i * 3 + 1] = (this.particlePos[i * 3 + 1] ?? 0) + (this.particleVel[i * 3 + 1] ?? 0) * dt;
      this.particlePos[i * 3 + 2] = (this.particlePos[i * 3 + 2] ?? 0) + (this.particleVel[i * 3 + 2] ?? 0) * dt;
      this.particleVel[i * 3 + 1] = (this.particleVel[i * 3 + 1] ?? 0) - 2.2 * dt;
    }
    const posAttr = this.particleGeo.attributes.position;
    const colorAttr = this.particleGeo.attributes.aColor;
    const alphaAttr = this.particleGeo.attributes.aAlpha;
    if (posAttr) posAttr.needsUpdate = true;
    if (colorAttr) colorAttr.needsUpdate = true;
    if (alphaAttr) alphaAttr.needsUpdate = true;
  }

  /** 卡牌在舞台内的屏幕坐标与高度，供 DOM 浮层贴靠 */
  anchor(id: string): { x: number; y: number; h: number } | null {
    const runtime = this.cards.get(id);
    if (!runtime || !runtime.root.visible) return null;
    const rect = this.stage.getBoundingClientRect();
    const dist = this.camera.position.distanceTo(runtime.root.position);
    const worldPerPx = (2 * dist * Math.tan((this.camera.fov * Math.PI) / 360)) / Math.max(1, rect.height);
    const heightPx = (CARD_H * runtime.slot.s) / Math.max(1e-4, worldPerPx);
    this.tmpV.copy(runtime.root.position).project(this.camera);
    return {
      x: ((this.tmpV.x + 1) / 2) * rect.width,
      y: ((-this.tmpV.y + 1) / 2) * rect.height + heightPx * 0.5,
      h: heightPx,
    };
  }

  private disposeRuntime(runtime: CardRuntime): void {
    this.group.remove(runtime.root);
    runtime.face.material.map?.dispose();
    runtime.face.material.dispose();
    runtime.aura.material.dispose();
    runtime.auraGold.material.dispose();
  }

  dispose(): void {
    for (const [, runtime] of this.cards) this.disposeRuntime(runtime);
    this.cards.clear();
    for (const [, runtime] of this.potions) {
      this.potionGroup.remove(runtime.mesh);
      runtime.mesh.material.map?.dispose();
      runtime.mesh.material.dispose();
      runtime.mesh.geometry.dispose();
    }
    this.potions.clear();
    this.cardGeo.dispose();
    this.auraGeo.dispose();
    this.auraGoldGeo.dispose();
    this.auraTex.dispose();
    this.auraGoldTex.dispose();
    this.particleGeo.dispose();
    this.group.remove(...this.group.children);
    const parent = this.group.parent;
    if (parent) parent.remove(this.group);
    const particleParent = this.particles.parent;
    if (particleParent) particleParent.remove(this.particles);
    if (this.particles.material instanceof THREE.Material) this.particles.material.dispose();
    this.layerRenderer.dispose();
    this.layerCanvas.remove();
  }

  get particleObject(): THREE.Points {
    return this.particles;
  }
}
