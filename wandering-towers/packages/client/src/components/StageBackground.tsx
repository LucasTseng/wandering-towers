import { useEffect, useRef } from 'react';

export type StageBgTheme = 'cosmic' | 'sky' | 'dark';

interface StageBackgroundProps {
  theme: StageBgTheme;
}

/* ---------- 宇宙星空：3D 投影星场 ---------- */
interface CosmicStar {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  size: number;
  color: string;
  phase: number;
  speed: number;
  hasPrev: boolean;
}
interface NebulaBlob {
  x: number;
  y: number;
  r: number;
  phase: number;
  hue: number;
}

const STAR_COLORS = ['#ffffff', '#cfd6ff', '#fff0c8', '#c8d8ff', '#ffd9b0'];

/* ---------- 蓝天白云：视差云层 ---------- */
interface SkyCloud {
  xFrac: number; // 0..1.3，环绕
  yFrac: number; // 0..1
  rFrac: number; // 相对 min(w,h) 的比例
  driftFrac: number; // 每帧位移（占 cssW 的比例）
  alpha: number;
  yBobFrac: number; // 上下浮动幅度（占 cssH）
  phase: number;
  layer: number; // 0=近 1=中 2=远
}

/* ---------- 组件 ---------- */
export function StageBackground({ theme }: StageBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    const ctx = ctx2d;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;
    let raf = 0;
    const t0 = performance.now();

    const resize = () => {
      cssW = Math.max(1, parent.clientWidth);
      cssH = Math.max(1, parent.clientHeight);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /* === 宇宙星空 === */
    let stars: CosmicStar[] = [];
    let blobs: NebulaBlob[] = [];
    const initCosmic = () => {
      stars = new Array(380).fill(0).map(() => {
        const z = 0.3 + Math.random() * 0.7;
        return {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          z,
          px: 0,
          py: 0,
          size: 0.5 + (1.0 - z) * 2.0,
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]!,
          phase: Math.random() * Math.PI * 2,
          speed: 0.00008 + (1.0 - z) * 0.00015,
          hasPrev: false,
        };
      });
      blobs = [
        { x: 0.35, y: 0.4, r: 0.45, phase: 0, hue: 268 },
        { x: 0.72, y: 0.62, r: 0.35, phase: 1.4, hue: 208 },
        { x: 0.5, y: 0.78, r: 0.28, phase: 2.6, hue: 188 },
      ];
    };

    const drawCosmic = (tSec: number) => {
      // 深空径向背景
      const bg = ctx.createRadialGradient(
        cssW / 2, cssH * 0.42, 0,
        cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.78,
      );
      bg.addColorStop(0, '#0d1330');
      bg.addColorStop(0.55, '#070a1a');
      bg.addColorStop(1, '#02030a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);

      // 星云（screen 混合，缓慢漂移）
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const b of blobs) {
        const cx = (b.x + Math.sin(tSec * 0.07 + b.phase) * 0.03) * cssW;
        const cy = (b.y + Math.cos(tSec * 0.05 + b.phase) * 0.02) * cssH;
        const r = b.r * Math.min(cssW, cssH);
        const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        ng.addColorStop(0, `hsla(${b.hue}, 82%, 62%, 0.18)`);
        ng.addColorStop(0.5, `hsla(${b.hue}, 82%, 50%, 0.07)`);
        ng.addColorStop(1, 'hsla(0,0%,0%,0)');
        ctx.fillStyle = ng;
        ctx.fillRect(0, 0, cssW, cssH);
      }
      ctx.restore();

      // 3D 投影星场（透视 + 运动尾迹 + 闪烁）
      const cx = cssW / 2;
      const cy = cssH / 2;
      const focal = Math.min(cssW, cssH) * 0.58;
      ctx.lineCap = 'round';
      for (const s of stars) {
        s.z -= s.speed;
        if (s.z < 0.04) {
          s.z = 1.0;
          s.x = Math.random() * 2 - 1;
          s.y = Math.random() * 2 - 1;
          s.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]!;
          s.hasPrev = false;
        }
        const px = cx + (s.x * focal) / s.z;
        const py = cy + (s.y * focal) / s.z;
        const depth = 1.0 - s.z; // 0..0.7
        const size = 0.5 + depth * 2.0;
        const alphaBase = 0.35 + depth * 0.7;
        const twinkle = 0.75 + 0.25 * Math.sin(tSec * 2.4 + s.phase);
        const alpha = Math.max(0, Math.min(1, alphaBase)) * twinkle;
        if (s.hasPrev) {
          ctx.strokeStyle = s.color;
          ctx.globalAlpha = alpha * 0.45;
          ctx.lineWidth = Math.max(0.5, size * 0.7);
          ctx.beginPath();
          ctx.moveTo(s.px, s.py);
          ctx.lineTo(px, py);
          ctx.stroke();
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
        s.px = px;
        s.py = py;
        s.hasPrev = true;
      }
      ctx.globalAlpha = 1;
    };

    /* === 蓝天白云 === */
    let clouds: SkyCloud[] = [];
    const initSky = () => {
      clouds = [
        // 近层：大、慢、较低、浓
        { xFrac: 0.12, yFrac: 0.70, rFrac: 0.055, driftFrac: 0.00040, alpha: 0.92, yBobFrac: 0.012, phase: 0.1, layer: 0 },
        { xFrac: 0.55, yFrac: 0.66, rFrac: 0.060, driftFrac: 0.00035, alpha: 0.90, yBobFrac: 0.012, phase: 1.7, layer: 0 },
        { xFrac: 0.90, yFrac: 0.74, rFrac: 0.050, driftFrac: 0.00045, alpha: 0.88, yBobFrac: 0.010, phase: 3.0, layer: 0 },
        // 中层
        { xFrac: 0.30, yFrac: 0.54, rFrac: 0.036, driftFrac: 0.00022, alpha: 0.72, yBobFrac: 0.010, phase: 0.8, layer: 1 },
        { xFrac: 0.78, yFrac: 0.50, rFrac: 0.040, driftFrac: 0.00020, alpha: 0.70, yBobFrac: 0.009, phase: 2.4, layer: 1 },
        // 远层：小、快（相对）、较高、淡
        { xFrac: 0.22, yFrac: 0.38, rFrac: 0.024, driftFrac: 0.00011, alpha: 0.50, yBobFrac: 0.008, phase: 1.2, layer: 2 },
        { xFrac: 0.68, yFrac: 0.36, rFrac: 0.027, driftFrac: 0.00010, alpha: 0.48, yBobFrac: 0.007, phase: 2.0, layer: 2 },
      ];
    };

    const drawPuff = (px: number, py: number, r: number, a: number) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.5, `rgba(255,255,255,${a * 0.55})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawCloud = (c: SkyCloud, tSec: number) => {
      const minDim = Math.min(cssW, cssH);
      const cx = c.xFrac * cssW;
      const cy = c.yFrac * cssH + Math.sin(tSec * 0.4 + c.phase) * (c.yBobFrac * cssH);
      const r = c.rFrac * minDim;
      const a = c.alpha;
      // 5 团云朵
      const puffs: [number, number, number, number][] = [
        [0, 0, 1.0, 1.0],
        [-0.55 * r, 0.18 * r, 0.78, 0.85],
        [0.50 * r, 0.22 * r, 0.72, 0.88],
        [0.18 * r, -0.32 * r, 0.68, 0.78],
        [-0.28 * r, -0.22 * r, 0.62, 0.75],
      ];
      for (const [ox, oy, rs, as] of puffs) {
        drawPuff(cx + ox, cy + oy, r * rs, a * as);
      }
    };

    const drawSky = (tSec: number) => {
      // 天空垂直渐变（深蓝→中蓝→地平线雾白）
      const sky = ctx.createLinearGradient(0, 0, 0, cssH);
      sky.addColorStop(0, '#3a78c2');
      sky.addColorStop(0.45, '#7eaed4');
      sky.addColorStop(0.85, '#c8dee9');
      sky.addColorStop(1, '#dceaf1');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cssW, cssH);

      // 太阳暖光（右上，screen 混合）
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const sunCx = cssW * 0.85;
      const sunCy = cssH * 0.18;
      const sunR = Math.min(cssW, cssH) * 0.28;
      const sg = ctx.createRadialGradient(sunCx, sunCy, 0, sunCx, sunCy, sunR);
      sg.addColorStop(0, 'rgba(255,238,200,0.35)');
      sg.addColorStop(0.4, 'rgba(255,220,170,0.12)');
      sg.addColorStop(1, 'rgba(255,220,170,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();

      // 云层（近→远，远的先画以构成视差）
      const sorted = [...clouds].sort((a, b) => b.layer - a.layer);
      for (const c of sorted) {
        c.xFrac += c.driftFrac;
        if (c.xFrac > 1.25) c.xFrac = -0.25;
        drawCloud(c, tSec);
      }
    };

    /* === 主题分发 === */
    resize();

    if (theme === 'dark') {
      // 暗夜：canvas 透明，透出 .wt-stage-viewport::before 的暗色径向 + 内阴影
      return () => {
        /* no-op */
      };
    }

    if (theme === 'cosmic') initCosmic();
    else if (theme === 'sky') initSky();

    const ro = new ResizeObserver(() => {
      resize();
      // 重置星场尾迹，避免跨尺寸连线
      if (theme === 'cosmic') {
        for (const s of stars) s.hasPrev = false;
      }
    });
    ro.observe(parent);

    const loop = () => {
      const tSec = (performance.now() - t0) / 1000;
      if (theme === 'cosmic') drawCosmic(tSec);
      else if (theme === 'sky') drawSky(tSec);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
        pointerEvents: 'none',
        zIndex: 0,
        // 暗夜主题需透传 ::before 的暗色底；星空/天空主题需覆盖，故不设 background
      }}
    />
  );
}
