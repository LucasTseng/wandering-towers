/* 巫师飞塔 · 风格提案 — 迷你舞台场景构建器
 * 几何移植自项目 packages/client/src/components/Prism3D.tsx（polygonPoints / clipFrom / 侧墙 transform），
 * 同一几何骨架克隆 5 份，仅通过 .theme-* 的 CSS 变量换肤，演示「只换皮、不换骨」。 */
(function () {
  'use strict';

  var DEG = 58; // 与 visual3d.ts cameraPitchDeg 一致
  var WORLD = 980;

  function el(tag, cls) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    return d;
  }

  /* ---- 几何（与 Prism3D.tsx 同源） ---- */
  function polygonPoints(sides, radius, start) {
    var pts = [];
    for (var i = 0; i < sides; i++) {
      var a = start + (i / sides) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
    }
    return pts;
  }

  function clipFrom(pts, r) {
    return 'polygon(' + pts.map(function (p) {
      return (((p.x + r) / (r * 2)) * 100).toFixed(2) + '% ' + (((p.y + r) / (r * 2)) * 100).toFixed(2) + '%';
    }).join(', ') + ')';
  }

  /* 暖主光在左下、冷补光在右上：按面心方向给亮度档（叶子面 filter，允许） */
  function faceShade(mx, my, r) {
    var nx = mx / r, ny = my / r;
    var d = nx * -0.55 + ny * 0.65; // 光方向（屏幕坐标 y 向下）
    return (0.78 + 0.42 * (d + 1) / 2).toFixed(3);
  }

  /* 棱柱：顶面 clip-path + N 片侧墙 rotateZ(θ) rotateX(90deg) */
  function prism(o) {
    var wrap = el('div', 'pz-wrap');
    wrap.style.width = o.radius * 2 + 'px';
    wrap.style.height = o.radius * 2 + 'px';
    wrap.style.marginLeft = -o.radius + 'px';
    wrap.style.marginTop = -o.radius + 'px';
    wrap.style.transform =
      'translate3d(' + (o.x || 0) + 'px,' + (o.y || 0) + 'px,' + (o.z || 0) + 'px)' + (o.extra || '');
    var pts = polygonPoints(o.sides, o.radius, o.start === undefined ? Math.PI / 8 : o.start);
    var clip = clipFrom(pts, o.radius);
    var size = o.radius * 2;

    if (o.withTop !== false) {
      var top = el('div', 'pz-top ' + (o.topClass || ''));
      top.style.width = size + 'px';
      top.style.height = size + 'px';
      top.style.marginLeft = -o.radius + 'px';
      top.style.marginTop = -o.radius + 'px';
      top.style.clipPath = clip;
      top.style.transform = 'translateZ(' + o.height + 'px)';
      if (o.topVars) for (var tk in o.topVars) top.style.setProperty(tk, o.topVars[tk]);
      wrap.appendChild(top);
    }

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      var edge = Math.hypot(q.x - p.x, q.y - p.y);
      var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      var angle = Math.atan2(q.y - p.y, q.x - p.x);
      var w = edge + 1;
      var side = el('div', 'pz-side ' + (o.sideClass || ''));
      side.style.width = w + 'px';
      side.style.height = o.height + 'px';
      side.style.marginLeft = -w / 2 + 'px';
      side.style.marginTop = -o.height / 2 + 'px';
      side.style.transform =
        'translate3d(' + mx + 'px,' + my + 'px,' + o.height / 2 + 'px) rotateZ(' + angle + 'rad) rotateX(90deg)';
      side.style.setProperty('--face-shade', o.shade === false ? '1' : faceShade(mx, my, o.radius));
      wrap.appendChild(side);
    }
    return wrap;
  }

  /* ---- 场景（尺寸取自 visual3d.ts：棋盘 Ø920、地块 Ø148@环342、塔 80/44、城堡 48、巫师 30） ---- */
  function buildScene() {
    var world = el('div', 'sc-world');
    var TILE_R = 342, TILE_Z = 28, SURF = TILE_Z + 10; // tileSurfaceZ = 38

    // 棋盘底座 + 环形边
    world.appendChild(prism({ sides: 64, radius: 460, height: 28, z: 0, topClass: 'sc-board-top', sideClass: 'sc-board-side', start: 0, shade: false }));
    world.appendChild(prism({ sides: 64, radius: 464, height: 9, z: 28, withTop: false, sideClass: 'sc-rim', start: 0, shade: false }));

    // 16 格环形地块
    var tilePos = [];
    for (var i = 0; i < 16; i++) {
      var a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      var x = Math.cos(a) * TILE_R, y = Math.sin(a) * TILE_R;
      tilePos.push({ x: x, y: y });
      var raven = i === 4 || i === 12;
      world.appendChild(prism({
        sides: 16, radius: 74, height: 10, x: x, y: y, z: TILE_Z, start: Math.PI / 16,
        topClass: 'sc-tile-top' + (raven ? ' is-raven' : ''), sideClass: 'sc-tile-side'
      }));
    }

    // 塔（3 座：2 层 / 1 层 / 3 层）
    function tower(idx, layers) {
      var t = tilePos[idx];
      for (var l = 0; l < layers; l++) {
        world.appendChild(prism({
          sides: 8, radius: 40, height: 44, x: t.x, y: t.y, z: SURF + l * 44,
          topClass: 'sc-tower-top', sideClass: 'sc-tower-side'
        }));
      }
      return { x: t.x, y: t.y, topZ: SURF + layers * 44 };
    }
    var t1 = tower(1, 2), t2 = tower(6, 1), t3 = tower(11, 3);

    // 渡鸦纹章（A02/C01）：塔顶小圆徽
    world.appendChild(prism({ sides: 16, radius: 12, height: 3, x: t2.x + 16, y: t2.y - 12, z: t2.topZ, start: Math.PI / 16, topClass: 'sc-raven-top', sideClass: 'sc-raven-side', shade: false }));

    // 鸦堡 A05：八边柱 + 收缩锥顶（塔顶之上）
    world.appendChild(prism({ sides: 8, radius: 24, height: 30, x: t3.x, y: t3.y, z: t3.topZ, topClass: 'sc-castle-top', sideClass: 'sc-castle-side' }));
    var roofR = [26, 21, 16, 11, 7];
    for (var r0 = 0; r0 < roofR.length; r0++) {
      world.appendChild(prism({
        sides: 8, radius: roofR[r0], height: 5, x: t3.x, y: t3.y, z: t3.topZ + 30 + r0 * 5,
        topClass: 'sc-roof-top', sideClass: 'sc-roof-side'
      }));
    }

    // 巫师米宝（B01）：袍身 + 帽檐 + 帽锥
    function wizard(idx, colorVar, dz, scale) {
      var p = tilePos[idx];
      var s = scale || 1;
      world.appendChild(prism({ sides: 6, radius: 8 * s, height: 16 * s, x: p.x, y: p.y, z: SURF + (dz || 0), topClass: 'pz-hidden', sideClass: 'sc-wiz-side', shade: false, withTop: false, extra: '', topVars: null }));
      var robe = world.lastChild;
      robe.querySelectorAll('.sc-wiz-side').forEach(function (n) { n.style.setProperty('--wiz-color', colorVar); });
      world.appendChild(prism({ sides: 12, radius: 10 * s, height: 2 * s, x: p.x, y: p.y, z: SURF + (dz || 0) + 16 * s, topClass: 'sc-brim-top', sideClass: 'sc-brim-side', shade: false }));
      var brim = world.lastChild;
      brim.querySelectorAll('.sc-brim-top, .sc-brim-side').forEach(function (n) { n.style.setProperty('--wiz-color', colorVar); });
      // 帽锥：3 段收缩叠层
      var hatR = [7, 4.6, 2.6], hatH = [5, 5, 4], hatZ = SURF + (dz || 0) + 18 * s;
      for (var h = 0; h < 3; h++) {
        world.appendChild(prism({
          sides: 6, radius: hatR[h] * s, height: hatH[h] * s, x: p.x, y: p.y,
          z: hatZ + (h === 0 ? 0 : (h === 1 ? 5 : 10)) * s,
          topClass: 'sc-hat-side', sideClass: 'sc-hat-side', shade: false
        }));
        world.lastChild.querySelectorAll('.sc-hat-side').forEach(function (n) { n.style.setProperty('--wiz-color', colorVar); });
      }
    }
    wizard(3, 'var(--c-wiz-1)', 0, 1);
    wizard(9, 'var(--c-wiz-2)', 0, 1);
    wizard(0, 'var(--c-wiz-3)', 0, 1);
    wizard(1, 'var(--c-wiz-1)', 88, 1); // 2 层塔顶（z=38+88-38 起算袍底 ≈ 塔顶面）

    // 金色目标环（C05 三态之一）
    world.appendChild(prism({ sides: 32, radius: 33, height: 2, x: tilePos[14].x, y: tilePos[14].y, z: SURF, start: 0, withTop: false, sideClass: 'sc-ring-side', shade: false }));
    var ring = el('div', 'pz-wrap sc-ring-top');
    ring.style.width = '66px'; ring.style.height = '66px';
    ring.style.marginLeft = '-33px'; ring.style.marginTop = '-33px';
    ring.style.transform = 'translate3d(' + tilePos[14].x + 'px,' + tilePos[14].y + 'px,' + (SURF + 2) + 'px)';
    world.appendChild(ring);

    return world;
  }

  /* ---- 挂载：每个 .sc-stage 生成一份场景 ---- */
  document.querySelectorAll('.sc-stage').forEach(function (stage) {
    stage.appendChild(buildScene());
  });
})();
