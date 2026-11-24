# archive/ — 历史版本封存区

> **本目录不参与构建，不纳入 pnpm workspace，今后不再启用。**
> 保留的唯一目的是：作为「巫师飞塔第一版」的实现参考与视觉对照。

## 已封存版本

| 目录 | 包名 | 定位 | 封存日期 |
| --- | --- | --- | --- |
| `v1-css3d-client/` | `@wt/v1-css3d-client` | 第一版渲染层：React + **CSS 3D Transforms**（`preserve-3d` + `translateZ` + `clip-path`）拼装几何体，Canvas 2D 绘制舞台背景 | 2026-11-24 |

## 为什么封存

第一版用纯 CSS 3D 在 DOM 层拼出塔体、巫师、鸦堡，优点是零 3D 依赖、点击交互直接复用 DOM 事件；
代价是光照、材质、阴影、后期效果全部要手工模拟，视觉上限明显。

主线已切换为 Three.js 版（`packages/client`，原 `@wt/three-client`）：
WebGL 真几何体 + PBR 材质 + 真实光照与阴影，UI 皮肤为羊皮纸 + 金饰。

## 当前主线

```bash
# 仓库根目录
pnpm install
pnpm dev        # → http://localhost:8008 （Three.js 版）
```

## 如需临时复跑归档版

归档包仍保留完整的 `workspace:*` 依赖声明，但不属于 workspace，直接 `pnpm install` 不会处理它。
复跑步骤：

1. 在 `pnpm-workspace.yaml` 的 `packages` 中临时加入 `'archive/v1-css3d-client'`
2. `pnpm install`（如遇 `ERR_PNPM_EIO`，加 `--config.node-linker=hoisted`）
3. `pnpm --filter @wt/v1-css3d-client dev` → http://localhost:8010

复查完毕后请把 `pnpm-workspace.yaml` 改回原状，避免归档版被 `pnpm -r build` 带上。

## 归档版与主线的差异

| 层 | 归档版 v1 | 主线 v2（Three.js） |
| --- | --- | --- |
| 渲染 | CSS 3D Transforms + Canvas 2D 背景 | Three.js WebGL 场景（`src/scene/`） |
| 材质/光照 | 渐变 + `filter: brightness` 模拟 | PBR 材质 + 真实光源 + 阴影贴图 |
| 交互 | DOM 点击事件（`onSpaceClick` / `onTowerClick`） | Raycaster 拾取 |
| 界面皮肤 | `styles/visual-assets.css` | `styles/three.css`（羊皮纸 + 金饰） |
| 规则引擎 | `@wt/engine` | **同一个包，未改一行** |

> 视觉基线文档仍留在 `packages/client` 之外的 `docs/visual-assets/`，作为两版共用的美术规格参考。
