# archive/ — 第一版实现的归档说明

> **本目录只剩这份说明，不含代码。**
> 第一版（CSS 3D Transforms）已于 2026-11-24 从仓库中移除，主线只保留 Three.js 版。

## 为什么从仓库移除

第一版是项目的起点：用纯 CSS 3D（`preserve-3d` + `translateZ` + `clip-path`）在 DOM 层拼出塔体、巫师与鸦堡，
优点是零 3D 依赖、点击直接复用 DOM 事件；代价是光照、材质、阴影都要手工模拟，视觉上限明显。

2026-11-24 主线切换到 Three.js 版后，第一版先被移到 `archive/v1-css3d-client` 作为对照；
随后出于「仓库只保留可维护主线」的考虑，整份代码从版本库中移除。它的完整实现仍保存在 git 历史里，
需要查阅或复跑时按下面的方式取回。

## 从历史中取回

移除发生在提交 `0510757` 之后。取回第一版源码：

```bash
# 在仓库根目录执行
git checkout 0510757 -- wandering-towers/archive/v1-css3d-client
```

取回后它仍然不属于 pnpm workspace，需要临时修改 `pnpm-workspace.yaml` 才能安装与启动：

1. 在 `packages` 列表中加入 `'archive/v1-css3d-client'`
2. `pnpm install`（仓库已配置 `node-linker=hoisted`）
3. `pnpm --filter @wt/v1-css3d-client dev` → http://localhost:8010

复查完毕后请把 `pnpm-workspace.yaml` 改回原状，避免它被 `pnpm -r build` 带上。

> 也可以直接在 GitHub 上浏览该提交的目录树：
> `https://github.com/LucasTseng/wandering-towers/tree/0510757/wandering-towers/archive/v1-css3d-client`

## 两版差异

| 层 | 第一版（已移除） | 主线（Three.js） |
| --- | --- | --- |
| 渲染 | CSS 3D Transforms + Canvas 2D 背景 | Three.js WebGL 场景（`src/scene/`） |
| 材质/光照 | 渐变 + `filter: brightness` 模拟 | PBR 材质 + 真实光源 + 阴影贴图 |
| 交互 | DOM 点击事件 | Raycaster 拾取（只命中卡面） |
| 界面皮肤 | `styles/visual-assets.css` | `styles/three.css`（羊皮纸 + 金饰） |
| 布局 | 340px 单列侧边栏 | 无侧栏，纵深卡牌 + 四角 HUD |
| 规则引擎 | `@wt/engine` | **同一个包，未改一行** |

## 当前主线

```bash
# 内层 wandering-towers/ 目录
pnpm install
pnpm dev        # → http://localhost:8008 （Three.js 版）
```

架构与交互设计见 [`../docs/architecture/08-UI纵深交互方案.md`](../docs/architecture/08-UI纵深交互方案.md)。
