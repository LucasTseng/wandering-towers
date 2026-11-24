# Phase U · 纵深交互与 UI 重构（设计阶段）

> 日期：2026-11-24
> 状态：**P1 + P2 + P3 已实施（2026-11-24）**
> 方案主文档：[architecture/08-UI纵深交互方案.md](../architecture/08-UI纵深交互方案.md)
> 原型：[docs/prototypes/depth-ui-demo.html](../prototypes/depth-ui-demo.html)

---

## 1. 起点：三条用户反馈

1. 右侧栏字号偏小，长时间看很累。
2. 点选卡牌后，下一步操作提示出现在**上方/左上**，与点击位置脱节；期望提示出现在被点卡牌的**正下方**。
3. 希望悬停卡牌/符文/按钮都有"待激活"的魔法感；法术与药水需要固定提示区，且解封巫师要明确「塔内无你的巫师时药水依然消耗」。

---

## 2. 现状勘测（数据来自代码，不是估计）

| 项 | 实测 | 位置 |
| --- | --- | --- |
| 说明正文 | 7.5px | `three.css:686 / 710 / 739` |
| 元信息、标签 | 7px | `three.css:550 / 563 / 684` |
| 卡牌主字 | 10px | `three.css:708` |
| 面板标题 | 11px | `three.css:533` |
| 提示条位置 | 侧栏内、玩家面板之下、手牌**之上** | `ThreeGameContainer.tsx:548` |
| 侧栏内容总高 | 约 780px（1440×900 可用约 830px） | 按 `.va-panel` padding + 各区块实测累加 |
| 侧栏宽度 | 340px 固定 | `three.css:177` |

信息重复统计：轮次/阶段/当前玩家在 `location-plaque`、`turn-panel`、`PlayerPanel` **各出现一次**；满瓶数在 `PlayerPanel` 标签、`PotionPanel` 头部、`SpellPanel` 头部**各出现一次**。

---

## 3. 方案比较

先按"平面腾挪"思路出过三版（卡下浮窗 A / 侧栏步骤轨道 B / 舞台贴边魔法阵 C），结论：A 的因果绑定最好，B 会被侧栏滚动切断，C 需要把 DOM 坐标映射到画布边缘、成本不匹配。

但用户提出了更根本的方向：**「除了平面空间，我们还有纵深空间」**。据此推翻三版平面方案，改为以 Z 轴承载层级：

| 层级 | 承载 | 载体 |
| --- | --- | --- |
| 常驻状态 | 轮次 / 玩家 / 药水 / 地点 | 舞台四角羊皮纸薄片 |
| 备选资源 | 法术牌堆 | 左后方，缩小压暗 |
| 当前手牌 | 3 张 | 前景扇形 |
| 当前操作 | 选中的牌 + 浮层 | 更近一层 |
| 场景本体 | 棋盘与棋子 | 最远 |

---

## 4. 原型迭代记录（含踩坑）

原型 `docs/prototypes/depth-ui-demo.html` 为单文件，three@0.152.2（CDN），无规则逻辑。

| 轮次 | 问题 | 处置 |
| --- | --- | --- |
| v1 | 卡牌被棋盘遮挡、整体过曝 | 卡牌移到棋盘前方；降光照、加 ACES |
| v1 | 加载遮罩残留造成"幽灵文字" | 移除遮罩，原型以清晰为先 |
| v2 | 近景卡牌投影坐标非线性，浮层容易飞出视锥 | 第 2/3 层改为 DOM 浮层，跟随卡牌 3D 投影 |
| v2 | 启动时排队的补间覆盖"即时态" | 截图 QA 前清空 `tweens` |
| v2 | 卡位手调世界坐标，换分辨率出画 | 改为 **NDC 槽位 + 距离** 反解世界坐标 |
| v3 | 美术与项目不一致（晨雾 vs 黄昏） | 直接移植 `textures.ts` 的天空/棋盘/灰泥纹理，并采用项目光照与曝光参数 |
| v3 | 四张法术卡同时亮金环，视觉噪音 | 金环只给"主卡"（选中或悬停），用 `goldBoost` 插值转移 |
| v3 | 浮层压住选中卡的下缘文字 | 改为从卡牌下缘 +10px 起算 |

---

## 5. 美术对齐清单（全部取自 `packages/client/src/scene/`）

| 项 | 取值 | 来源 |
| --- | --- | --- |
| 色调映射 / 曝光 | ACESFilmic / 0.78 | `SceneController.ts:112-113` |
| 相机 | fov 33，pitch 36°，yaw -0.34 | `SceneController.ts:49,118` |
| 雾 | `0x7f9f98`，近 28 远 58（按尺度等比放大） | `SceneController.ts:128` |
| 半球光 | `0x86aaa9 / 0x172016` | `SceneController.ts:159` |
| 主光 | `0xffc27c` | `SceneController.ts:162` |
| 补光 / 轮廓光 | `0x79b4ca` / `0x9ed6d5` | `SceneController.ts:180,186` |
| 符文点光 | `0x5ec3bc`，强度 `3.8 + sin(t*1.5)*0.7` | `SceneController.ts:192,681` |
| 天空 / 棋盘 / 灰泥 | `createSkyTexture` / `createBoardTexture` / `createPlasterTexture` | `textures.ts:117,208,52` |

天空与棋盘是**代码级移植**，不是近似复刻。

---

## 6. 交付物

| 文件 | 说明 |
| --- | --- |
| `docs/architecture/08-UI纵深交互方案.md` | 设计主文档：分层、流程、特效、技术方案、落地批次、风险、验收 |
| `docs/prototypes/depth-ui-demo.html` | 可运行原型（单文件），含 `?demo=card` / `?demo=spell&instant=1` 预览参数 |

---

## 6.1 实施记录（2026-11-24）

### 新增文件

| 文件 | 行数 | 职责 |
| --- | --- | --- |
| `src/scene/cardLayer.ts` | ~780 | 3D 卡面绘制、槽位补间、悬停/选中态、双层魔法阵、粒子迸发、屏幕锚点 |

### 修改文件

| 文件 | 改动 |
| --- | --- |
| `src/scene/SceneController.ts` | 创建 CardLayer、卡牌命中优先于棋盘、悬停回调、独立 dt 计算、只读禁用、dispose |
| `src/components/ThreeStage.tsx` | 新增 hand/spells/cardsMode/onCardSelect/onCardHover/popover 属性；浮层每帧跟随卡牌锚点 |
| `src/containers/ThreeGameContainer.tsx` | 手牌/法术视图模型、悬停展开法术、点击路由、移除 HandPanel/SpellPanel、`?uipreview` 预览 |
| `src/styles/three.css` | 字号上调 13 处、`.card-popover` 浮层、`.card-layer-canvas` 图层、侧栏宽度 340→306 |

### 关键技术决策

1. **独立画布**：卡牌画在与主场景分离的透明 canvas 上（z-index 4）。原因是 `.stage-mist`（白色雾气，透明度 0.46）与 `.stage-vignette` 覆盖在画布之上，若卡牌画在主场景里会被冲淡到几乎看不清。独立画布同时解决了「卡牌永远在场景之上」的层级问题。
2. **关闭色调映射**：卡牌层用 `NoToneMapping` + `toneMapped:false`，保证卡面颜色与 canvas 绘制一致，不受场景曝光 0.78 影响。
3. **修正特异性**：`.stage canvas { z-index:1 }` 会压过 `.card-layer-canvas { z-index:4 }`，必须写成 `.stage canvas.card-layer-canvas`。
4. **受控展开**：法术牌堆的展开状态由 React 持有（`spellsOpen`），悬停进入置 true、离开 520ms 后置 false，避免 3D 层自己维护 UI 状态。

### 验证

- `pnpm --filter @wt/client typecheck` ✅
- `pnpm --filter @wt/client build` ✅（791 kB / gzip 223 kB）
- `pnpm test` ✅ 8 文件 89 用例全绿
- `pnpm lint` ✅ 0 error（16 条历史 warning）
- 截图核对：默认态、选牌态（塔牌 / 二选一牌）、法术展开态，均无出画与遮挡

## 6.2 P3 实施记录（2026-11-24）

### 结构变化

- 删除 `aside.sidebar` 整块；`main-layout` 由 grid 改 flex，舞台独占整宽。
- 左上铭牌合并「第 N 轮 · 行动 N / 2 · 阶段」；删除原 `turn-panel`。
- 右上新增 `.hud-status` 玩家状态卡（头像色点 / 玩家名 / 目标 / 进度条 / 四类计数）。
- 顶部居中 `.hud-top-center`：错误优先，其次无 cardId 的意图条。
- 右下 `.hud-endturn`；相机控制移到左下；回放面板 `.replay-dock` 浮动停靠右侧。

### 魔法瓶

- `cardLayer.ts` 新增 `setPotions()` 与 `paintBottle()`：6 个瓶子按 NDC 排在状态卡下方。
- 三态：`FULL`（液体渐变 + 液面椭圆 + 气泡 + 高光）/ `EMPTY`（仅玻璃与残液）/ `SPENT`（木塞歪斜 + 裂纹）。
- 玻璃横向渐变实现「边缘实、中心透」，空瓶可透出背景。

### 两个踩坑

1. **布局塌陷**：`main-layout` 由 grid 改 block 后，`.stage-wrap` 因无内容高度归零，舞台空白。改为 `display:flex` + `.stage-wrap{flex:1}` 解决。
2. **卡面被噪点层混合**：`.stage-grain` 是 `z-index:4` + `mix-blend-mode:soft-light`，卡牌画布同为 4 时被它混合成灰白。卡牌层改为 `z-index:6`（低于 HUD 的 8）后恢复清晰。

### 验证

- typecheck / build ✅（791 kB，gzip 223 kB）
- test ✅ 89 例
- 截图核对：默认态、选牌浮层、满瓶/空瓶（`?uipreview=potion`）

## 6.3 骰点锁定与瓶型修订（2026-11-24）

### 修复的漏洞

原实现里骰点只存在于 `UIIntent` 中，取消或改选卡牌后意图被重置，重新点同一张牌会再掷一次 —— 等于可以无限重掷。

修法：
- 新增 `lockedRollRef: Map<CardID, {value, mode}>`，掷骰即写入；
- `handleCardClick` 先查表：同牌恢复锁定态、异牌直接拒绝；
- 结束回合在锁定时拒绝；
- 成功出牌 / 直接打出后释放。

### 强制走完

锁定后「取消」按钮消失，替换为「直接打出（放弃移动）」。实现上向引擎传一个必然无效的目标 id：
- 巫师模式 → `isOwnVisibleWizard` 为假 → `advanceOrEndTurn`；
- 塔模式 → `moveTowerSegment` 抛 `INVALID_TOWER_TARGET` → `isTowerIllegalTarget` 捕获 → `advanceOrEndTurn`。

两条路径都是引擎既有的「非法目标 = 行动消耗」（V2 §20.1），因此不需要改规则。

### 瓶型

试管型改为圆肚药剂瓶：细颈 + 球形瓶身 + 软木塞 + 封蜡；尺寸缩到 0.54×0.9，右对齐排在状态卡下方。

## 6.4 命中区域修订（2026-11-24）

反馈：卡牌周边的魔法光效会挡住「选巫师 / 选塔」，且悬停到光效上卡牌就浮起。

成因：`CardLayer.pick()` 用 `intersectObjects(roots, true)` 递归检测，假定了「卡牌组里只有卡面」；
但 `aura`（1.72×卡宽）与 `auraGold`（1.86×卡宽）都是同组的平面网格，射线会先撞到它们的矩形外框。
注意这些平面是带透明通道的贴图，射线检测不看 alpha，整块矩形都算命中。

修法：
- 两个光效网格 `raycast = () => {}`（装饰对象永久退出检测）；
- `pick()` 改为只对 `runtime.face` 求交，`recursive = false`，并保持按距离取最近的一张。

代价：悬停判定从「卡+光晕」收紧为「仅卡面」，鼠标移出卡边 1px 卡牌就落回 —— 这正是期望语义。

## 6.5 选目标态主卡让位（2026-11-24）

反馈：走到「点巫师 / 点塔」这一步时，主卡正好压在棋盘中央，最需要点的位置被挡住。

改动：
- `cardLayer.ts`：新增 `TARGET_SLOT = S(-0.5, -0.54, 12.9, { s: 0.78, tilt: 0.1, fan: 0.05 })`
  与 `TARGET_OUT_SLOTS`（其余手牌退到左右下角，透明度 0.18–0.26）；`setData()` 增加 `targetingId`。
- `SceneController.setCards()` 透传 `targetingId`。
- `ThreeStage`：新增 `targetingCardId` 属性，浮层按 `is-side` 走「卡右侧」定位分支。
- `ThreeGameContainer`：`targetingCardId` 只在 `PLAY_CARD_WIZARD` / `PLAY_CARD_TOWER_PICK` 时非空。
- `three.css`：`.card-popover.is-side`（宽 300、origin 左中、箭头朝左）。

调参过程：首版把其余手牌推到 `ny -0.86 ~ -0.92`，实测在 1000×700 下几乎沉出画面；
改为左右下角 `-0.58 ~ -0.74` 后可见但仍保持次要。主卡也从 `-0.44,-0.50` 再退到 `-0.50,-0.54`，少压一格塔位。

预览：`?uipreview=target` 会自动选一张不走掷骰的单用途牌，直接进入选目标态。

## 7. 尚未完成 / 下一步

- [x] P1：手牌迁到前沿 + 卡下浮层 + 字号上调
- [x] P2：法术牌堆交换
- [x] P3：删除侧栏、四角 HUD、漂浮魔法瓶

- [ ] 无障碍镜像层（视觉隐藏的 DOM 按钮）设计未完成
- [ ] 移动端降级方案（底部卡带）未验证
- [ ] 回放面板 `ReplayPanel` 在无侧栏结构下的落位未设计

> 现阶段原型只证明"可行且观感达标"，**未改动任何生产代码**；`packages/client` 仍是经典侧栏布局。
