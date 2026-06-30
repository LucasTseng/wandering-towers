# 《巫师飞塔》Web3D场景优化方案V2

> 版本：V2
> 日期：2026-06-28
> 参考原型：WizardTower_Stage_Reference_FIXED.html
> 目标：实现真正的立体棋盘场景，符合Three.js参考原型的视觉效果

---

## 1. 当前实现问题诊断

### 1.1 核心问题：缺少立体棋盘底座

**参考原型**：
```javascript
board = CylinderGeometry(12, 12, 0.8, 64)  // 圆柱体底座
```

**当前实现**：
- ❌ 没有棋盘底座，只有16个分离的空间格
- ❌ Board.tsx只计算坐标，不渲染底座
- ❌ 背景只是CSS conic-gradient装饰，不是真正的3D平台

**影响**：
- 空间点漂浮，没有根基
- 缺少整体场景感
- 不符合参考原型的立体棋盘概念

---

### 1.2 空间点造型错误

**参考原型**：
```javascript
p = CylinderGeometry(0.35, 0.35, 0.08, 24)  // 圆柱小平台
p.position.set(x, 0.45, z)  // 站在棋盘上
```

**当前实现**：
- ❌ Square.tsx是方形地块（borderRadius: 6）
- ❌ 高度108px，远大于参考的4px
- ❌ 包含复杂的阴影、边框、背景

**影响**：
- 空间点占用太大，遮挡塔和巫师
- 不是圆形平台，造型不对
- 应该是薄薄的小平台，不是厚地块

---

### 1.3 塔体造型改进空间

**参考原型**：
```javascript
body = CylinderGeometry(0.55, 0.7, 2.3, 8)  // 锥形圆柱（8段）
roof = ConeGeometry(0.7, 0.8, 8)            // 圆锥屋顶
```

**当前实现**：
- ✅ 已改成锥形八边形（底宽顶窄）
- ✅ 已有屋顶三角形
- ⚠️ 但八边形clip-path不够圆润
- ⚠️ 缺少真正的圆柱体侧面

**改进方向**：
- 增加塔体侧面深度（preserve-3d）
- 优化八边形造型更接近圆形
- 确保塔顶平台明确可站巫师

---

### 1.4 相机视角需调整

**参考原型**：
```javascript
camera.position.set(0, 18, 13);  // 俯角54.3°
maxPolarAngle = Math.PI * 0.45;  // 限制不能看底部
```

**当前实现**：
- ✅ cameraPitchDeg = 55°（接近参考）
- ⚠️ perspective = 1500px（可能需要调整）
- ⚠️ perspective-origin = 50% 35%（可能需要调整）

---

## 2. 正确的立体场景结构

### 2.1 参考原型的层次结构

```
场景层次（从底到顶）：
├─ 棋盘底座（CylinderGeometry，半径12，高0.8）
│   ├─ 16个空间点（CylinderGeometry，半径0.35，高0.08，环形分布）
│   │   ├─ 塔（CylinderGeometry + ConeGeometry，高度3.1）
│   │   │   └─ 塔顶巫师（ConeGeometry + SphereGeometry）
│   │   ├─ 地面巫师（ConeGeometry + SphereGeometry）
│   │   └─ 乌鸦堡（BoxGeometry，2×2×2）
│   └─ 乌鸦堡（中心位置）
```

---

### 2.2 CSS 3D映射方案

| Three.js元素 | CSS 3D实现 | 关键技术 |
|---|---|---|
| 棋盘底座（圆柱） | 圆形div + rotateX(90deg) | borderRadius: 50% |
| 空间点（圆柱） | 八边形div + translateY | clip-path: polygon(八边形) |
| 塔体（圆柱） | 八边形div + preserve-3d侧面 | transformStyle: preserve-3d |
| 屋顶（圆锥） | 三角形div | clipPath: polygon(50% 0%, 0% 100%, 100% 100%) |
| 巫师（圆锥+球） | 三角形 + 圆点 | clip-path + borderRadius |
| 乌鸦堡（立方体） | preserve-3d六面体 | 6个面：前/后/左/右/上/下 |

---

## 3. 详细优化方案

### 3.1 visual3d.ts尺寸调整

**参考比例计算**：

Three.js单位 → CSS像素映射：
- 棋盘半径 = 12 → 576px（比例48px/unit）
- 环形半径 = 8 → 384px
- 空间点半径 = 0.35 → 17px
- 空间点高度 = 0.08 → 4px
- 塔底半径 = 0.7 → 34px
- 塔顶半径 = 0.55 → 26px
- 塔体高度 = 2.3 → 110px
- 屋顶高度 = 0.8 → 38px
- 乌鸦堡 = 2 → 96px
- 巫师高度 = 0.8 → 38px

**新visual3d.ts配置**：

```typescript
export const VISUAL_3D = {
  // 棋盘底座
  boardRadius: 576,          // 棋盘半径（12 * 48）
  boardHeight: 38,           // 棋盘厚度（0.8 * 48）

  // 空间点
  spaceRadius: 17,           // 空间点半径（0.35 * 48）
  spaceHeight: 4,            // 空间点高度（0.08 * 48）
  spaceRingRadius: 384,      // 空间点环形半径（8 * 48）

  // 塔体
  towerBaseWidth: 68,        // 塔底宽度（0.7 * 48 * 2）
  towerTopWidth: 52,         // 塔顶宽度（0.55 * 48 * 2）
  towerBodyHeight: 110,      // 塔体高度（2.3 * 48）
  towerRoofHeight: 38,       // 屋顶高度（0.8 * 48）
  towerTotalHeight: 148,     // 塔总高（3.1 * 48）

  // 乌鸦堡
  castleSize: 96,            // 乌鸦堡尺寸（2 * 48）
  castleHeight: 96,

  // 巫师
  wizardRadius: 10,          // 巫师底座半径（0.2 * 48）
  wizardHeight: 38,          // 巫师高度（0.8 * 48）
  wizardHeadRadius: 5,       // 头部半径（0.1 * 48）

  // 相机
  cameraPitchDeg: 55,
  perspective: 1200,
  perspectiveOrigin: '50% 40%',

  // 世界尺寸
  worldSize: 940,            // 保持当前值（需要重新计算fit-all）
  zoomMin: 0.42,
  zoomMax: 4,
} as const;
```

---

### 3.2 Board.tsx增加棋盘底座

**新增棋盘底座渲染**：

```tsx
export function Board({ cells, ... }: BoardProps) {
  // 棋盘底座（圆形平台）
  const boardBase = (
    <div
      style={{
        position: 'absolute',
        left: VISUAL_3D.worldSize / 2,
        top: VISUAL_3D.worldSize / 2,
        width: VISUAL_3D.boardRadius * 2,
        height: VISUAL_3D.boardRadius * 2,
        borderRadius: '50%',
        background: 'linear-gradient(180deg, #6d7b55 0%, #5a6a45 100%)',
        transform: `translate(-50%, -50%) rotateX(90deg) translateZ(${VISUAL_3D.boardHeight/2}px)`,
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3), 0 20px 40px rgba(0,0,0,0.4)',
        zIndex: 0,
      }}
    />
  );

  // 16个空间点
  const spacePoints = cells.map((cell, i) => {
    const angle = (i / 16) * 2 * Math.PI;
    const x = VISUAL_3D.worldSize/2 + VISUAL_3D.spaceRingRadius * Math.cos(angle);
    const z = VISUAL_3D.spaceRingRadius * Math.sin(angle);
    const y = VISUAL_3D.boardHeight + VISUAL_3D.spaceHeight;

    return (
      <SpacePoint
        key={cell.spaceIndex}
        x={x}
        y={y}
        z={z}
        data={cell}
      />
    );
  });

  return (
    <div style={{ position: 'relative', width: VISUAL_3D.worldSize, height: VISUAL_3D.worldSize }}>
      {boardBase}
      {spacePoints}
    </div>
  );
}
```

---

### 3.3 Space.tsx改造成圆形小平台

**圆形小平台设计**：

```tsx
export function SpacePoint({ x, y, z, data }: SpacePointProps) {
  const octagonClip = 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';

  return (
    <div
      style={{
        position: 'absolute',
        left: x - VISUAL_3D.spaceRadius,
        top: VISUAL_3D.worldSize/2,  // 基准线
        width: VISUAL_3D.spaceRadius * 2,
        height: VISUAL_3D.spaceHeight,
        background: data.isRavenShieldGround
          ? '#35445b'
          : '#d8c08b',
        clipPath: octagonClip,
        transform: `translateY(${y}px) translateZ(${z}px)`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        zIndex: 1,
      }}
      onClick={data.onSpaceClick}
      data-interactive={data.onSpaceClick ? '' : undefined}
    >
      {/* 空间内容：塔堆、巫师、乌鸦堡 */}
      <SpaceContent data={data} />
    </div>
  );
}
```

**关键改变**：
- ✅ 八边形造型（接近圆形）
- ✅ 高度只有4px（薄平台）
- ✅ 站在棋盘底座上（y = boardHeight + spaceHeight）
- ✅ 尺寸17px半径（小平台）

---

### 3.4 Tower3D.tsx优化塔体侧面

**真正的圆柱体侧面（preserve-3d）**：

```tsx
export function Tower3D({ towerId, hasRavenShield, tier = 0 }: Tower3DProps) {
  const octagonClip = 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';

  // 八边形8个顶点坐标
  const octagonPoints = [
    { angle: 0,   x: 0.7,   y: 0.3 },   // 右上
    { angle: 45,  x: 0.7,   y: 0.7 },   // 右
    { angle: 90,  x: 0.3,   y: 0.7 },   // 右下
    { angle: 135, x: -0.3,  y: 0.7 },   // 下
    { angle: 180, x: -0.7,  y: 0.3 },   // 左下
    { angle: 225, x: -0.7,  y: -0.3 },  // 左
    { angle: 270, x: -0.3,  y: -0.7 },  // 左上
    { angle: 315, x: 0.3,   y: -0.7 },  // 上
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: VISUAL_3D.towerBaseWidth,
        height: VISUAL_3D.towerTotalHeight,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 塔顶平台（八边形） */}
      <div
        style={{
          position: 'absolute',
          left: (VISUAL_3D.towerBaseWidth - VISUAL_3D.towerTopWidth) / 2,
          top: VISUAL_3D.towerRoofHeight,
          width: VISUAL_3D.towerTopWidth,
          height: VISUAL_3D.towerTopWidth,
          background: hasRavenShield ? '#6a7a9a' : '#8a9a8a',
          clipPath: octagonClip,
          transform: 'rotateX(90deg)',
          transformOrigin: 'top',
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.2)',
          zIndex: 4,
        }}
      />

      {/* 屋顶（圆锥） */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: VISUAL_3D.towerBaseWidth,
          height: VISUAL_3D.towerRoofHeight,
          background: hasRavenShield ? '#8a4a5a' : '#9a5a6a',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          zIndex: 3,
        }}
      />

      {/* 塔体侧面（8个面） */}
      {octagonPoints.map((point, i) => {
        const nextPoint = octagonPoints[(i + 1) % 8];
        const width = Math.abs(nextPoint.x - point.x) * VISUAL_3D.towerBaseWidth;
        const angle = point.angle;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: VISUAL_3D.towerRoofHeight,
              width: width,
              height: VISUAL_3D.towerBodyHeight,
              background: hasRavenShield ? '#5a6a8a' : '#7a8a7a',
              transform: `translateX(-50%) rotateY(${angle}deg) translateZ(${VISUAL_3D.towerBaseWidth/2}px)`,
              boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.1), inset -1px 0 0 rgba(0,0,0,0.2)',
              zIndex: 2,
            }}
          />
        );
      })}

      {/* 塔ID标签 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: VISUAL_3D.towerRoofHeight + VISUAL_3D.towerBodyHeight/2,
          transform: 'translateX(-50%)',
          color: '#f5e9c8',
          fontSize: 10,
          fontWeight: 'bold',
          textShadow: '0 1px 1px #000',
          zIndex: 5,
        }}
      >
        {towerId}
      </div>
    </div>
  );
}
```

---

### 3.5 Wizard3D.tsx优化巫师造型

**圆锥+球体头部**：

```tsx
export function Wizard3D({ wizardId, ownerPlayerId, highlight }: Wizard3DProps) {
  const color = PLAYER_COLORS[ownerPlayerId] ?? '#888';

  return (
    <div
      style={{
        position: 'relative',
        width: VISUAL_3D.wizardRadius * 2,
        height: VISUAL_3D.wizardHeight,
      }}
    >
      {/* 基座阴影 */}
      <div
        style={{
          position: 'absolute',
          left: -2,
          right: -2,
          bottom: 0,
          height: 3,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.4) 0%, transparent 70%)',
        }}
      />

      {/* 圆锥袍身（8段圆锥） */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: VISUAL_3D.wizardRadius * 2,
          height: VISUAL_3D.wizardHeight - VISUAL_3D.wizardHeadRadius * 2,
          background: color,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          boxShadow: 'inset 2px 0 1px rgba(255,255,255,0.3), inset -2px 0 1px rgba(0,0,0,0.4)',
        }}
      />

      {/* 圆形头部（球体） */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: VISUAL_3D.wizardHeadRadius * 2,
          height: VISUAL_3D.wizardHeadRadius * 2,
          marginLeft: -VISUAL_3D.wizardHeadRadius,
          borderRadius: '50%',
          background: '#ffddbb',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
}
```

---

### 3.6 Castle3D.tsx改造成立方体

**preserve-3d六面体**：

```tsx
export function Castle3D() {
  const size = VISUAL_3D.castleSize;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 顶面 */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: size,
        height: size,
        background: '#4a4a5a',
        transform: 'rotateX(90deg)',
        transformOrigin: 'top',
      }} />

      {/* 正面 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, #3a3a4a 0%, #2a2a3a 100%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
      }} />

      {/* 右侧面 */}
      <div style={{
        position: 'absolute',
        right: -size/2,
        top: 0,
        width: size/2,
        height: size,
        background: '#2a2a3a',
        transform: 'rotateY(90deg)',
        transformOrigin: 'left',
      }} />

      {/* 左侧面 */}
      <div style={{
        position: 'absolute',
        left: -size/2,
        top: 0,
        width: size/2,
        height: size,
        background: '#2a2a3a',
        transform: 'rotateY(-90deg)',
        transformOrigin: 'right',
      }} />

      {/* 乌鸦标记 */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size * 0.4,
        height: size * 0.3,
        marginLeft: -size * 0.2,
        marginTop: -size * 0.15,
        background: '#1a1a2a',
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      }} />
    </div>
  );
}
```

---

## 4. 详细设计步骤

### 步骤1：调整visual3d.ts尺寸系统

**操作**：
1. 打开 `visual3d.ts`
2. 替换所有尺寸为新比例系统
3. 添加棋盘底座相关常量
4. 添加空间点相关常量
5. 验证fit-all计算包含新尺寸

**验收**：
- ✅ 棋盘半径、高度定义
- ✅ 空间点半径、高度定义
- ✅ 塔体尺寸符合参考比例
- ✅ fit-all函数正确计算

---

### 步骤2：改造Board.tsx增加棋盘底座

**操作**：
1. 打开 `Board.tsx`
2. 在现有空间点渲染前，先渲染棋盘底座
3. 使用圆形div + rotateX(90deg)实现圆柱体
4. 设置正确的zIndex（底座在最底层）
5. 调整空间点坐标计算（站在棋盘上）

**验收**：
- ✅ 能看到圆形棋盘底座
- ✅ 16个空间点站在棋盘上
- ✅ 底座有立体阴影效果
- ✅ 不遮挡其他元素

---

### 步骤3：改造Space.tsx为圆形小平台

**操作**：
1. 打开 `Space.tsx`
2. 改造SpacePoint为八边形小平台
3. 设置高度为4px（薄平台）
4. 使用clipPath实现八边形
5. 调整内部元素布局（塔、巫师站在平台上）

**验收**：
- ✅ 空间点是圆形/八边形
- ✅ 高度只有4px
- ✅ 不占用太多视觉空间
- ✅ 塔和巫师站在平台上清晰可见

---

### 步骤4：优化Tower3D.tsx塔体侧面

**操作**：
1. 打开 `Tower3D.tsx`
2. 使用preserve-3d实现8个侧面
3. 增加塔顶平台（rotateX 90deg）
4. 调整屋顶为标准圆锥
5. 优化乌鸦纹章标记位置

**验收**：
- ✅ 塔体有8个侧面（真正圆柱体）
- ✅ 塔顶平台明确可见
- ✅ 屋顶为圆锥造型
- ✅ 乌鸦塔蓝色标记清晰

---

### 步骤5：优化Wizard3D.tsx圆锥造型

**操作**：
1. 打开 `Wizard3D.tsx`
2. 使用clipPath实现标准圆锥
3. 增加圆形头部（borderRadius 50%）
4. 调整基座阴影
5. 确保玩家颜色清晰

**验收**：
- ✅ 圆锥造型标准
- ✅ 圆形头部可见
- ✅ 玩家颜色一眼可辨
- ✅ 高亮效果清晰

---

### 步骤6：改造Castle3D.tsx为立方体

**操作**：
1. 打开 `Castle3D.tsx`
2. 使用preserve-3d实现6面体
3. 实现顶面、正面、左右侧面
4. 添加乌鸦标记（简洁三角形）
5. 确保可站在地面或塔顶

**验收**：
- ✅ 看起来是立方体
- ✅ 不遮挡巫师
- ✅ 乌鸦标记清晰
- ✅ 位置正确

---

### 步骤7：调整StageViewport.tsx相机参数

**操作**：
1. 打开 `StageViewport.tsx`
2. 调整perspective为1200px
3. 调整perspectiveOrigin为50% 40%
4. 验证rotateX为55deg
5. 测试fit-all计算

**验收**：
- ✅ 俯角接近参考原型
- ✅ 透视效果正确
- ✅ fit-all包含所有元素

---

### 步骤8：更新phase-u.css背景样式

**操作**：
1. 打开 `phase-u.css`
2. 移除conic-gradient背景（已有棋盘底座）
3. 改为简单的深色背景
4. 保留发光系统样式
5. 验证视觉效果

**验收**：
- ✅ 背景简洁
- ✅ 棋盘底座可见
- ✅ 发光效果正常

---

## 5. 验收清单

### 5.1 视觉验收

| 验收项 | 标准 |
|---|---|
| 棋盘底座可见 | 圆形平台，有立体感 |
| 16个空间点清晰 | 八边形小平台，环形分布 |
| 塔体立体感强 | 8侧面，锥形，有屋顶 |
| 塔顶平台可见 | 能站巫师 |
| 巫师造型标准 | 圆锥+球体头部 |
| 乌鸦堡立体 | 立方体，有乌鸦标记 |
| 55°俯角正确 | 符合参考原型 |
| 前景不遮挡后景 | y坐标排序正确 |

---

### 5.2 功能验收

| 验收项 | 标准 |
|---|---|
| 点击交互正常 | 塔可点击，巫师可点击 |
| 塔切片高亮 | 金色边框，上抬效果 |
| 巫师高亮 | 发光效果，玩家色 |
| 缩放平移正常 | 滚轮缩放，拖拽平移 |
| fit-all正确 | 9层塔+乌鸦堡+6巫师不出画面 |
| 6巫师站塔顶 | 不重叠，不穿模 |

---

### 5.3 代码验收

| 验收项 | 命令 |
|---|---|
| TypeScript检查 | `pnpm --filter @wt/client typecheck` |
| 无emoji | `rg "🃏🧪🪄🧙✨🏰" packages/client/src` |
| 无旧尺寸 | `rg "620|CELL.*=.*90" packages/client/src` |

---

## 6. 风险评估

### 6.1 preserve-3d性能风险

**风险**：Tower3D的8侧面 + Castle3D的6面体可能导致性能下降

**缓解**：
- 使用will-change优化
- 限制DOM层级深度
- 测试低端设备性能

---

### 6.2 尺寸调整风险

**风险**：新比例可能导致现有布局错位

**缓解**：
- 分步调整，每步验证
- 保持worldSize不变（940px）
- 只调整内部元素尺寸

---

### 6.3 相机调整风险

**风险**：perspective调整可能影响视觉效果

**缓解**：
- 小幅调整（1500 → 1200）
- 测试多种视口尺寸
- 保持rotateX不变

---

## 7. 执行顺序建议

**推荐执行顺序**：

1. **Phase 1：基础调整**（低风险）
   - Step 1: visual3d.ts尺寸调整
   - Step 7: StageViewport相机调整
   - Step 8: phase-u.css背景调整

2. **Phase 2：核心改造**（中风险）
   - Step 2: Board.tsx棋盘底座
   - Step 3: Space.tsx圆形小平台

3. **Phase 3：资产优化**（低风险）
   - Step 4: Tower3D塔体侧面
   - Step 5: Wizard3D圆锥造型
   - Step 6: Castle3D立方体

4. **Phase 4：验收测试**
   - 视觉验收
   - 功能验收
   - 代码验收

---

## 8. 成功标准

**优化完成后应达到**：

✅ **视觉效果接近参考原型**：
- 圆形棋盘底座，不是分离地块
- 八边形小平台，不是方形地块
- 锥形圆柱塔体，不是方形盒子
- 圆锥巫师造型，不是复杂拼凑

✅ **功能完整保留**：
- 所有点击交互正常
- 塔切片、巫师高亮正常
- 缩放平移fit-all正常

✅ **代码质量**：
- TypeScript检查通过
- 无emoji，无旧尺寸
- 尺寸系统统一（visual3d.ts）

---

**文档结束**