# @wt/three-client · 巫师飞塔三维版

经典版 `@wt/client` 的**渲染层分支**：同一套规则引擎、同一套命令与终局判定，
只替换表现层（Three.js 场景 + 羊皮纸界面）。

## 启动

```bash
# 仓库根目录
pnpm install
pnpm dev:three        # http://localhost:8009
```

经典版仍在 `pnpm dev` → http://localhost:8008，两者可同时运行。

生产构建与本地预览：

```bash
pnpm build:three                          # tsc --noEmit && vite build → dist/
pnpm --filter @wt/three-client preview    # 预览生产包 → http://localhost:4173
```

> 若 `dist/` 已存在且构建报 `[safe-delete] 操作失败`，是沙箱把 `emptyOutDir` 的删除
> 拦到了回收站，不是代码问题 —— 先手动删掉 `dist/` 再构建即可。

## 与经典版的关系

| 层 | 经典版 | 三维版 |
| --- | --- | --- |
| 规则引擎 | `@wt/engine` | **同一个包，未改一行** |
| 类型/地图/牌库/法术定义 | `@wt/shared` | 同一个包 |
| 状态连接 | `useGame` + `UIIntent` 状态机 | 复制同一套逻辑（`src/game`、`src/containers`） |
| 渲染 | CSS 3D + 素材台 | Three.js WebGL（`src/scene`） |
| 界面皮肤 | `visual-assets.css` | `styles/three.css`（羊皮纸 + 金饰） |
| 回放 | `ReplayView`（2D 棋盘） | `ReplayPanel` + 同一 3D 舞台 |

## 目录

```
src/
  game/          引擎连接层
                 useGame / config / cardHelper / selectors
                 replay.ts      按 cursor 重放事件的快照构造
                 useReplay.ts   回放状态机（只读）
                 debug.ts       DEV-only 压测入口
  containers/    ThreeGameContainer：意图状态机 + 命令派发 + 回放挂载
  components/    ThreeStage（3D 舞台）/ TopBar / SidePanels / Overlays / ReplayPanel
  scene/
    textures.ts        程序化纹理（地表、石材、屋顶、布料、窗火、粒子）
    materials.ts       材质库
    pieces.ts          塔 / 鸦堡 / 巫师 / 旗帜 / 火把 / 常春藤
    environment.ts     悬浮棋盘 / 中央岩台 / 废墟 / 水池 / 植被 / 云 / 远景
    SceneController.ts 相机、拾取、状态更新、动画循环
    layout.ts          场景尺度常量（含棋子比例）
  styles/three.css
public/textures/  CC0 大块砂岩（仅棋盘侧壁）
```

## 交互

- 拖动旋转镜头、滚轮缩放、右下角按钮缩放/复位、双击复位。
- 点击塔 / 巫师 / 鸦堡显示对象信息；出牌或施法时点击目标即派发命令。
- 金环 = 当前首选目标，绿环 = 可选，青色纹章 = 乌鸦城堡可落点。
- 顶栏「导出」下载当前对局 JSON；「加载回放」读取 JSON 进入只读回放。

## 回放

回放与对局共用同一个 `ThreeStage` 实例，因此切换时不会重建 WebGL 场景、不会重新生成纹理。

- 快照由 `snapshotAt(save, cursor)` 从初始状态重放事件得到，`cursor` = 已应用事件数（0 = 开局）。
- 控件：进度条拖动、开局/上一步/播放/下一步/终局、四档速度、事件列表点击跳转。
- 快捷键：`空格` 播放暂停、`←` / `→` 步进、`Esc` 退出。
- 只读保证：回放时舞台的 `interaction` 被替换为 `EMPTY_INTERACTION`，点击塔/巫师不产生任何回调；退出后对局状态不受影响（回放不写 `useGame`）。

## 棋子比例与堆叠

规则允许单格最多 9 名可见巫师堆叠。塔顶可用平台半径约 0.6（世界单位），
因此巫师比例固定在 `TOWER_WIZARD_SCALE = 0.6` / `GROUND_WIZARD_SCALE = 0.66`：

- 1–6 人：单圈排布；
- 7–9 人：内圈 3 + 外圈 N，内圈抬高 0.02 形成层次；
- 10 人以上：内 4 + 外 N 兜底。

DEV 环境可用 URL 参数压测极端堆叠：

```
http://localhost:8009/?stress=9&space=8
```

（`space` 是 0–15 的地块序号，0 在正后方顺时针递增。）

## 已知边界

- 美术为程序化几何 + 程序化材质，没有骨骼动画与后处理（Bloom/SSAO）。
- 首次加载需生成程序化纹理，低端设备约 1–2 秒。
- 回放的只读场景不播放移动补间，状态按事件步进直接切换。
