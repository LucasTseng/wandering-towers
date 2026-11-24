import * as THREE from 'three';

/**
 * 程序化纹理库 —— 移植自视觉原型，用于地表、石材、屋顶、布料、窗火与粒子。
 *
 * 设计口径：
 * - 全部离线生成，无外部图片依赖；CC0 砂岩贴图仅用于棋盘侧壁（可选增强）。
 * - 贴图按用途缓存，材质共享，避免每次重建棋子时重复生成。
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CanvasPair {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

function makeCanvas(width: number, height: number): CanvasPair {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') as CanvasRenderingContext2D };
}

function makeTexture(
  source: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  srgb = true,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(source);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 4;
  if (repeatX !== 1 || repeatY !== 1) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
  }
  texture.needsUpdate = true;
  return texture;
}

function createPlasterTexture(seed: number, colors: [string, string, string], mossAmount: number): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(1024, 1024);
  const random = mulberry32(seed);
  const base = ctx.createLinearGradient(0, 0, 1024, 1024);
  base.addColorStop(0, colors[0]);
  base.addColorStop(0.55, colors[1]);
  base.addColorStop(1, colors[2]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 210; i += 1) {
    const x = random() * 1024;
    const y = random() * 1024;
    const radius = 25 + random() * 165;
    const cloud = ctx.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, random() > 0.48 ? 'rgba(255,244,214,0.13)' : 'rgba(44,37,25,0.12)');
    cloud.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let i = 0; i < 38; i += 1) {
    const x = random() * 1024;
    const top = random() * 460;
    const height = 110 + random() * 430;
    const stain = ctx.createLinearGradient(x, top, x, top + height);
    stain.addColorStop(0, 'rgba(44,45,30,0.08)');
    stain.addColorStop(0.5, 'rgba(44,45,30,0.025)');
    stain.addColorStop(1, 'rgba(44,45,30,0)');
    ctx.fillStyle = stain;
    ctx.fillRect(x, top, 2 + random() * 14, height);
  }

  for (let i = 0; i < 20; i += 1) {
    ctx.strokeStyle = 'rgba(49,39,26,0.18)';
    ctx.lineWidth = 0.9 + random() * 1.3;
    ctx.beginPath();
    const x = random() * 1024;
    const y = random() * 1024;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 26, y + 20 + random() * 58);
    ctx.lineTo(x + (random() - 0.5) * 45, y + 40 + random() * 95);
    ctx.stroke();
  }

  if (mossAmount) {
    for (let i = 0; i < mossAmount; i += 1) {
      const x = random() * 1024;
      const y = 550 + random() * 474;
      const radius = 25 + random() * 80;
      const moss = ctx.createRadialGradient(x, y, 0, x, y, radius);
      moss.addColorStop(0, 'rgba(47,72,37,0.22)');
      moss.addColorStop(1, 'rgba(47,72,37,0)');
      ctx.fillStyle = moss;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }

  for (let i = 0; i < 2600; i += 1) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(255,245,216,0.05)' : 'rgba(48,39,26,0.05)';
    ctx.fillRect(random() * 1024, random() * 1024, 1 + random() * 2, 1 + random() * 2);
  }
  return makeTexture(c, 2.2, 1.4);
}

function createSkyTexture(): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(2048, 1024);
  const sky = ctx.createLinearGradient(0, 0, 0, 1024);
  sky.addColorStop(0, '#1c485a');
  sky.addColorStop(0.25, '#3d7081');
  sky.addColorStop(0.53, '#779e9c');
  sky.addColorStop(0.72, '#c4c8a3');
  sky.addColorStop(1, '#7e8e68');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 2048, 1024);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const sun = ctx.createRadialGradient(310, 138, 8, 310, 138, 300);
  sun.addColorStop(0, 'rgba(255,248,203,0.92)');
  sun.addColorStop(0.25, 'rgba(255,231,158,0.38)');
  sun.addColorStop(1, 'rgba(255,220,144,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 900, 650);
  ctx.restore();

  const random = mulberry32(20261122);
  const drawCloud = (cx: number, cy: number, scale: number, alpha: number): void => {
    ctx.save();
    ctx.filter = `blur(${18 * scale}px)`;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f3f4df';
    for (let i = 0; i < 8; i += 1) {
      const x = cx + (random() - 0.5) * 230 * scale;
      const y = cy + (random() - 0.5) * 48 * scale;
      const rx = (55 + random() * 115) * scale;
      const ry = (16 + random() * 30) * scale;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  for (let i = 0; i < 14; i += 1) {
    drawCloud(random() * 2048, 150 + random() * 330, 0.55 + random() * 0.8, 0.18 + random() * 0.22);
  }

  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.filter = 'blur(5px)';
  ctx.fillStyle = '#638983';
  ctx.beginPath();
  ctx.moveTo(0, 785);
  for (let x = 0; x <= 2048; x += 120) {
    const y = 715 + Math.sin(x * 0.006) * 42 + random() * 40;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(2048, 1024);
  ctx.lineTo(0, 1024);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.36;
  ctx.fillStyle = '#435f60';
  ctx.beginPath();
  ctx.moveTo(0, 850);
  for (let x = 0; x <= 2048; x += 80) {
    const y = 795 + Math.sin(x * 0.011 + 1.3) * 35 + random() * 30;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(2048, 1024);
  ctx.lineTo(0, 1024);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.33;
  ctx.strokeStyle = '#415955';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const x = 730 + random() * 900;
    const y = 300 + random() * 240;
    const s = 5 + random() * 6;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s * 0.35, y - s * 0.55, x, y);
    ctx.quadraticCurveTo(x + s * 0.35, y - s * 0.55, x + s, y);
    ctx.stroke();
  }
  ctx.restore();

  const texture = makeTexture(c);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function createBoardTexture(): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(2048, 2048);
  const random = mulberry32(734921);
  ctx.fillStyle = '#8c7f55';
  ctx.fillRect(0, 0, 2048, 2048);
  ctx.save();
  ctx.beginPath();
  ctx.arc(1024, 1024, 1014, 0, Math.PI * 2);
  ctx.clip();

  const base = ctx.createRadialGradient(860, 780, 40, 1024, 1024, 1040);
  base.addColorStop(0, '#8ca24f');
  base.addColorStop(0.46, '#647f39');
  base.addColorStop(0.78, '#3f592a');
  base.addColorStop(1, '#5d4f32');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 2048, 2048);

  for (let i = 0; i < 260; i += 1) {
    const x = random() * 2048;
    const y = random() * 2048;
    const r = 30 + random() * 180;
    const colors = [
      'rgba(223,213,129,0.16)',
      'rgba(83,127,68,0.14)',
      'rgba(175,193,103,0.18)',
      'rgba(72,112,71,0.1)',
    ];
    const blob = ctx.createRadialGradient(x, y, 0, x, y, r);
    blob.addColorStop(0, colors[Math.floor(random() * colors.length)] as string);
    blob.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blob;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const river = new Path2D();
  river.moveTo(1510, 140);
  river.bezierCurveTo(1330, 430, 1470, 700, 1190, 920);
  river.bezierCurveTo(1000, 1080, 1080, 1350, 820, 1800);
  ctx.strokeStyle = 'rgba(175,150,91,0.62)';
  ctx.lineWidth = 118;
  ctx.stroke(river);
  ctx.strokeStyle = '#416f6b';
  ctx.lineWidth = 90;
  ctx.stroke(river);
  ctx.strokeStyle = 'rgba(103,153,148,0.74)';
  ctx.lineWidth = 44;
  ctx.stroke(river);
  ctx.strokeStyle = 'rgba(202,225,198,0.48)';
  ctx.lineWidth = 6;
  ctx.stroke(river);
  ctx.restore();

  for (let ring = 0; ring < 9; ring += 1) {
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#4b6f52';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      1024 + (random() - 0.5) * 80,
      1024 + (random() - 0.5) * 80,
      390 + ring * 52,
      270 + ring * 40,
      -0.32,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }

  for (let cluster = 0; cluster < 18; cluster += 1) {
    const cx = 210 + random() * 1620;
    const cy = 210 + random() * 1620;
    if (Math.hypot(cx - 1024, cy - 1024) < 330) continue;
    for (let i = 0; i < 14; i += 1) {
      const x = cx + (random() - 0.5) * 150;
      const y = cy + (random() - 0.5) * 110;
      const r = 4 + random() * 13;
      ctx.fillStyle = random() > 0.5 ? 'rgba(28,58,38,0.62)' : 'rgba(50,86,44,0.58)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (i % 4 === 0) {
        ctx.fillStyle = 'rgba(52,74,55,0.42)';
        ctx.fillRect(x - 1, y, 2, 11);
      }
    }
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(208,187,115,0.48)';
  ctx.lineWidth = 13;
  ctx.setLineDash([3, 25]);
  ctx.beginPath();
  ctx.arc(1024, 1040, 690, 0.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < 3400; i += 1) {
    const x = random() * 2048;
    const y = random() * 2048;
    ctx.fillStyle = random() > 0.5 ? 'rgba(255,248,190,0.055)' : 'rgba(43,67,48,0.055)';
    ctx.fillRect(x, y, 1 + random() * 2, 1 + random() * 2);
  }

  ctx.beginPath();
  ctx.arc(1024, 1024, 955, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(118,91,48,0.55)';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(1024, 1024, 978, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(244,221,153,0.45)';
  ctx.lineWidth = 3;
  ctx.stroke();

  const vignette = ctx.createRadialGradient(1024, 1024, 690, 1024, 1024, 1035);
  vignette.addColorStop(0, 'rgba(42,59,39,0)');
  vignette.addColorStop(0.82, 'rgba(42,59,39,0.03)');
  vignette.addColorStop(1, 'rgba(42,59,39,0.27)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 2048, 2048);
  ctx.restore();
  return makeTexture(c);
}

function createGrassTexture(): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(512, 512);
  const random = mulberry32(8881);
  ctx.fillStyle = '#62833f';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1100; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    ctx.strokeStyle = random() > 0.5 ? 'rgba(55,92,44,0.24)' : 'rgba(205,210,117,0.2)';
    ctx.lineWidth = 0.7 + random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 3, y - 3 - random() * 6);
    ctx.stroke();
  }
  for (let i = 0; i < 46; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const r = 12 + random() * 40;
    const blob = ctx.createRadialGradient(x, y, 0, x, y, r);
    blob.addColorStop(0, random() > 0.5 ? 'rgba(103,131,63,0.12)' : 'rgba(204,192,112,0.1)');
    blob.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blob;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return makeTexture(c, 3, 3);
}

function createStoneTexture(
  palette: [string, string, string, string, string],
  seed: number,
  repeatX = 2,
  repeatY = 1,
): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(768, 768);
  const random = mulberry32(seed);
  const base = ctx.createLinearGradient(0, 0, 768, 768);
  base.addColorStop(0, palette[0]);
  base.addColorStop(0.55, palette[1]);
  base.addColorStop(1, palette[2]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 768, 768);

  let y = -14;
  let row = 0;
  while (y < 768) {
    const h = 54 + random() * 34;
    let x = row % 2 ? -100 : -30;
    while (x < 768) {
      const w = 92 + random() * 116;
      ctx.fillStyle = `rgba(255,242,193,${0.018 + random() * 0.035})`;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = palette[3];
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = palette[4];
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3);
      ctx.lineTo(x + w - 3, y + 3);
      ctx.stroke();
      if (random() > 0.64) {
        ctx.strokeStyle = 'rgba(70,52,34,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w * random(), y + h * 0.2);
        ctx.lineTo(x + w * random(), y + h * random());
        ctx.stroke();
      }
      x += w;
    }
    y += h;
    row += 1;
  }

  for (let i = 0; i < 1600; i += 1) {
    ctx.fillStyle = random() > 0.55 ? 'rgba(255,245,205,0.055)' : 'rgba(57,44,28,0.055)';
    ctx.fillRect(random() * 768, random() * 768, 1 + random() * 3, 1 + random() * 3);
  }
  for (let i = 0; i < 22; i += 1) {
    ctx.strokeStyle = 'rgba(63,47,29,0.18)';
    ctx.lineWidth = 0.8 + random() * 1.2;
    ctx.beginPath();
    const x = random() * 768;
    const sy = random() * 768;
    ctx.moveTo(x, sy);
    ctx.lineTo(x + (random() - 0.5) * 35, sy + 10 + random() * 40);
    ctx.lineTo(x + (random() - 0.5) * 50, sy + 25 + random() * 60);
    ctx.stroke();
  }
  return makeTexture(c, repeatX, repeatY);
}

function createRoofTexture(): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(512, 512);
  const random = mulberry32(51093);
  ctx.fillStyle = '#74372f';
  ctx.fillRect(0, 0, 512, 512);
  const rowH = 54;
  for (let row = 0; row < 11; row += 1) {
    const y = row * rowH;
    const offset = row % 2 ? 28 : 0;
    for (let col = -1; col < 10; col += 1) {
      const x = col * 64 + offset;
      const shade = 0.82 + random() * 0.28;
      ctx.fillStyle = `rgba(${Math.round(151 * shade)},${Math.round(63 * shade)},${Math.round(50 * shade)},1)`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 60, y);
      ctx.quadraticCurveTo(x + 58, y + 44, x + 30, y + 50);
      ctx.quadraticCurveTo(x + 2, y + 44, x, y);
      ctx.fill();
      ctx.strokeStyle = 'rgba(55,25,23,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,180,137,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 4);
      ctx.lineTo(x + 54, y + 4);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 650; i += 1) {
    ctx.fillStyle = random() > 0.55 ? 'rgba(222,181,121,0.08)' : 'rgba(42,18,17,0.09)';
    ctx.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random() * 2);
  }
  return makeTexture(c, 2, 2);
}

function createClothTexture(color: string, seed: number): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(256, 256);
  const random = mulberry32(seed);
  const base = new THREE.Color(color);
  const light = base.clone().lerp(new THREE.Color('#fff0c4'), 0.22).getStyle();
  const dark = base.clone().multiplyScalar(0.62).getStyle();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 3) {
    ctx.fillStyle = x % 9 === 0 ? light : dark;
    ctx.globalAlpha = 0.07 + random() * 0.055;
    ctx.fillRect(x, 0, 1, 256);
  }
  ctx.globalAlpha = 1;
  const sheen = ctx.createLinearGradient(0, 0, 256, 0);
  sheen.addColorStop(0, 'rgba(34,18,14,0.22)');
  sheen.addColorStop(0.36, 'rgba(255,248,216,0.24)');
  sheen.addColorStop(0.66, 'rgba(255,244,200,0.03)');
  sheen.addColorStop(1, 'rgba(37,20,15,0.18)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 550; i += 1) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(255,246,218,0.08)' : 'rgba(40,20,16,0.07)';
    ctx.fillRect(random() * 256, random() * 256, 1, 1);
  }
  return makeTexture(c);
}

function createTileTexture(seed: number, raven: boolean, variant: number): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(512, 512);
  const random = mulberry32(seed);
  const palettes: [string, string, string][] = [
    ['#88955e', '#68764a', '#435236'],
    ['#b69b62', '#8e7548', '#5e4b30'],
    ['#adae99', '#898c7a', '#5d6356'],
    ['#a27f51', '#80613e', '#54402c'],
  ];
  const palette = raven ? (['#8d9c8b', '#6f8072', '#4a5c54'] as const) : palettes[variant % palettes.length]!;
  ctx.clearRect(0, 0, 512, 512);
  const grad = ctx.createRadialGradient(178, 154, 18, 256, 256, 350);
  grad.addColorStop(0, palette[0]);
  grad.addColorStop(0.52, palette[1]);
  grad.addColorStop(1, palette[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 50; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const r = 12 + random() * 52;
    const spot = ctx.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, random() > 0.5 ? 'rgba(255,250,215,0.13)' : 'rgba(66,53,31,0.13)');
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  if (!raven) {
    for (let i = 0; i < 6; i += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 150 + random() * 75;
      const x = 256 + Math.cos(angle) * radius;
      const y = 256 + Math.sin(angle) * radius;
      const moss = ctx.createRadialGradient(x, y, 0, x, y, 38 + random() * 48);
      moss.addColorStop(0, 'rgba(45,75,37,0.32)');
      moss.addColorStop(1, 'rgba(45,75,37,0)');
      ctx.fillStyle = moss;
      ctx.fillRect(x - 90, y - 90, 180, 180);
    }
  }

  ctx.save();
  ctx.translate(256, 256);
  for (let i = 0; i < 16; i += 1) {
    ctx.rotate(Math.PI / 8);
    ctx.strokeStyle = 'rgba(115,89,48,0.17)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(95, 0);
    ctx.lineTo(238, 0);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(110,84,45,0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 256, 196, 0, Math.PI * 2);
  ctx.stroke();

  if (raven) {
    ctx.strokeStyle = 'rgba(31,102,108,0.58)';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.arc(256, 256, 168, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(227,204,125,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(256, 256, 179, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 10; i += 1) {
    ctx.strokeStyle = 'rgba(104,77,43,0.15)';
    ctx.lineWidth = 0.8;
    const x = 80 + random() * 350;
    const y = 70 + random() * 370;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 30, y + 16 + random() * 27);
    ctx.lineTo(x + (random() - 0.5) * 45, y + 28 + random() * 42);
    ctx.stroke();
  }

  for (let i = 0; i < 650; i += 1) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(255,248,213,0.06)' : 'rgba(82,63,35,0.055)';
    ctx.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random() * 2);
  }
  return makeTexture(c);
}

function createWindowTexture(): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(64, 96);
  ctx.clearRect(0, 0, 64, 96);
  const glow = ctx.createRadialGradient(32, 58, 0, 32, 58, 31);
  glow.addColorStop(0, '#fff5b1');
  glow.addColorStop(0.34, '#f4b34d');
  glow.addColorStop(0.8, '#a45f25');
  glow.addColorStop(1, 'rgba(77,39,17,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(18, 92);
  ctx.lineTo(18, 39);
  ctx.quadraticCurveTo(18, 13, 32, 7);
  ctx.quadraticCurveTo(46, 13, 46, 39);
  ctx.lineTo(46, 92);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3d2d1e';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,246,190,0.65)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(32, 76);
  ctx.lineTo(32, 30);
  ctx.moveTo(21, 56);
  ctx.lineTo(43, 56);
  ctx.stroke();
  return makeTexture(c);
}

function createShieldTexture(): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);
  const bg = ctx.createRadialGradient(92, 72, 6, 128, 128, 124);
  bg.addColorStop(0, '#68c4c8');
  bg.addColorStop(0.46, '#348e9b');
  bg.addColorStop(1, '#1c596a');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e5c575';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(241,233,185,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 128, 96, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#15323e';
  ctx.beginPath();
  ctx.moveTo(55, 142);
  ctx.bezierCurveTo(73, 100, 92, 84, 112, 103);
  ctx.bezierCurveTo(120, 86, 128, 78, 135, 92);
  ctx.bezierCurveTo(147, 80, 162, 92, 164, 108);
  ctx.bezierCurveTo(187, 102, 204, 119, 199, 140);
  ctx.bezierCurveTo(181, 132, 167, 137, 151, 147);
  ctx.bezierCurveTo(143, 161, 137, 178, 126, 191);
  ctx.bezierCurveTo(114, 176, 107, 160, 100, 148);
  ctx.bezierCurveTo(84, 137, 69, 138, 55, 142);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,235,0.8)';
  ctx.beginPath();
  ctx.arc(148, 116, 4, 0, Math.PI * 2);
  ctx.fill();
  return makeTexture(c);
}

function createCloudTexture(): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(512, 256);
  const random = mulberry32(91822);
  ctx.clearRect(0, 0, 512, 256);
  ctx.save();
  ctx.filter = 'blur(17px)';
  ctx.fillStyle = 'rgba(246,249,233,0.82)';
  for (let i = 0; i < 26; i += 1) {
    const x = 90 + random() * 332;
    const y = 100 + random() * 76;
    const rx = 42 + random() * 78;
    const ry = 18 + random() * 29;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return makeTexture(c);
}

function createMoteTexture(): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,235,1)');
  g.addColorStop(0.2, 'rgba(255,236,170,0.95)');
  g.addColorStop(0.6, 'rgba(255,210,112,0.28)');
  g.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return makeTexture(c);
}

function createSoftTexture(): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 126);
  g.addColorStop(0, 'rgba(255,239,176,0.6)');
  g.addColorStop(0.24, 'rgba(255,221,130,0.26)');
  g.addColorStop(1, 'rgba(255,210,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return makeTexture(c);
}

function createContactTexture(): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 124);
  g.addColorStop(0, 'rgba(0,0,0,0.72)');
  g.addColorStop(0.38, 'rgba(0,0,0,0.42)');
  g.addColorStop(0.72, 'rgba(0,0,0,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return makeTexture(c, 1, 1, false);
}

function createNumberDecal(number: number): THREE.Texture {
  const { canvas: c, ctx } = makeCanvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(61,56,38,0.24)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([5, 14]);
  ctx.beginPath();
  ctx.arc(128, 128, 78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(53,50,34,0.74)';
  ctx.font = '600 112px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), 128, 136);
  return makeTexture(c);
}

/** 纹理集合；由 SceneController 创建并统一 dispose */
export interface TextureLibrary {
  sky: THREE.Texture;
  board: THREE.Texture;
  grass: THREE.Texture;
  stone: THREE.Texture;
  ravenStone: THREE.Texture;
  navyStone: THREE.Texture;
  rock: THREE.Texture;
  tiles: THREE.Texture[];
  plasterWarm: THREE.Texture;
  plasterRaven: THREE.Texture;
  plasterNavy: THREE.Texture;
  plasterAncient: THREE.Texture;
  roof: THREE.Texture;
  window: THREE.Texture;
  shield: THREE.Texture;
  cloud: THREE.Texture;
  mote: THREE.Texture;
  soft: THREE.Texture;
  contact: THREE.Texture;
  numberDecal: (n: number) => THREE.Texture;
  cloth: (playerId: string, color: string) => THREE.Texture;
  all: THREE.Texture[];
}

export function createTextureLibrary(): TextureLibrary {
  const clothCache = new Map<string, THREE.Texture>();
  const numberCache = new Map<number, THREE.Texture>();

  const lib: TextureLibrary = {
    sky: createSkyTexture(),
    board: createBoardTexture(),
    grass: createGrassTexture(),
    stone: createStoneTexture(
      ['#d4b06b', '#b78b45', '#8c6536', 'rgba(61,42,21,0.66)', 'rgba(255,235,176,0.4)'],
      101,
    ),
    ravenStone: createStoneTexture(
      ['#cabb84', '#a89562', '#776747', 'rgba(67,58,35,0.56)', 'rgba(255,240,190,0.3)'],
      202,
    ),
    navyStone: createStoneTexture(
      ['#4b6571', '#304b5a', '#192f3c', 'rgba(5,25,34,0.72)', 'rgba(152,202,201,0.2)'],
      303,
    ),
    rock: createStoneTexture(
      ['#707b6e', '#526057', '#36453f', 'rgba(24,36,31,0.58)', 'rgba(207,223,192,0.12)'],
      404,
    ),
    tiles: [
      createTileTexture(1001, false, 0),
      createTileTexture(1002, false, 1),
      createTileTexture(1003, true, 2),
      createTileTexture(1004, false, 3),
    ],
    plasterWarm: createPlasterTexture(7711, ['#b99763', '#98794d', '#725636'], 24),
    plasterRaven: createPlasterTexture(7712, ['#8c9585', '#6f7b6c', '#526052'], 30),
    plasterNavy: createPlasterTexture(7713, ['#47626c', '#314c57', '#1e333c'], 10),
    plasterAncient: createPlasterTexture(7714, ['#87927c', '#6b7664', '#4b594b'], 44),
    roof: createRoofTexture(),
    window: createWindowTexture(),
    shield: createShieldTexture(),
    cloud: createCloudTexture(),
    mote: createMoteTexture(),
    soft: createSoftTexture(),
    contact: createContactTexture(),
    numberDecal: (n: number) => {
      let t = numberCache.get(n);
      if (!t) {
        t = createNumberDecal(n);
        numberCache.set(n, t);
      }
      return t;
    },
    cloth: (playerId: string, color: string) => {
      let t = clothCache.get(playerId);
      if (!t) {
        t = createClothTexture(color, 900 + Number(playerId.slice(1)) || 900);
        clothCache.set(playerId, t);
      }
      return t;
    },
    all: [],
  };

  lib.all = [
    lib.sky,
    lib.board,
    lib.grass,
    lib.stone,
    lib.ravenStone,
    lib.navyStone,
    lib.rock,
    ...lib.tiles,
    lib.plasterWarm,
    lib.plasterRaven,
    lib.plasterNavy,
    lib.plasterAncient,
    lib.roof,
    lib.window,
    lib.shield,
    lib.cloud,
    lib.mote,
    lib.soft,
    lib.contact,
    ...numberCache.values(),
    ...clothCache.values(),
  ];
  return lib;
}
