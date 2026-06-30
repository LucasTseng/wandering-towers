# 《巫师飞塔》Web 3D 编码任务书与协作规范

> 版本：V1  
> 日期：2026-06-28  
> 前置文档：`docs/architecture/04-Web3D美术规范与迭代执行文档.md`  
> 目的：把美术规范拆成可执行的 coding 任务，保证后续 agent 在同一套代码框架里迭代。

---

## 1. 总原则

1. 只改前端渲染层，不改规则引擎。
2. 每次迭代必须保持游戏可玩。
3. 不新增大型 3D 依赖；当前阶段继续使用 React + CSS 3D。
4. 先统一比例，再做细节美术。
5. 核心资产不用 emoji 或黑色方块做最终表现。
6. 所有尺寸优先从 `packages/client/src/game/visual3d.ts` 读取。
7. 改动后至少运行前端 typecheck；如果环境没有 pnpm，要记录原因。

---

## 2. 基础框架

当前已建立基础常量文件：

`packages/client/src/game/visual3d.ts`

该文件负责统一管理：

- 舞台世界边长
- 棋盘环半径
- 单个空间尺寸
- 相机俯角
- 缩放范围
- 塔尺寸
- 巫师尺寸
- 乌鸦堡尺寸

后续 agent 不要在组件里继续散落 `60`、`90`、`620` 这类魔法数字。需要调整比例时，优先改 `visual3d.ts`，再处理组件局部样式。

---

## 3. 当前样板改造范围

已作为样板开始改造的文件：

- `packages/client/src/game/visual3d.ts`
- `packages/client/src/components/Board.tsx`
- `packages/client/src/components/StageViewport.tsx`
- `packages/client/src/components/Space.tsx`
- `packages/client/src/components/Tower3D.tsx`
- `packages/client/src/components/Wizard3D.tsx`
- `packages/client/src/components/Castle3D.tsx`
- `packages/client/src/styles/phase-u.css`

样板已经示范：

- 从集中常量读取 3D 尺寸。
- Board 按空间 y 坐标排序，降低前后遮挡错误。
- 地面乌鸦纹章由 CSS 图形替代 emoji。
- 开局容量由 CSS 蜡烛槽替代 emoji。
- 地面乌鸦堡复用 `Castle3D`，不再用城堡 emoji。
- 塔上的乌鸦纹章由 CSS 盾形符文替代 emoji。

---

## 4. 任务拆分

### Task A：编码环境与基线验证

目标：

- 确认 `pnpm`、`corepack`、TypeScript 检查是否可用。
- 如果当前环境无法运行 `pnpm`，记录错误，不要擅自联网重装。

验收：

- 能运行则执行 `pnpm --filter @wt/client typecheck`。
- 不能运行则在最终说明中写明原因。

### Task B：比例系统稳定化

目标：

- 继续完善 `visual3d.ts`。
- 将所有棋盘、塔、巫师、乌鸦堡尺寸接入常量。
- 检查 9 层塔 + 乌鸦堡 + 6 巫师的默认 fit-all 安全边距。

涉及文件：

- `visual3d.ts`
- `Board.tsx`
- `StageViewport.tsx`
- `Space.tsx`
- `Tower3D.tsx`
- `Wizard3D.tsx`
- `Castle3D.tsx`

验收：

- 不再出现旧世界尺寸 `620`。
- 不再出现旧单格尺寸 `90`。
- 6 巫师能站满塔顶。
- 默认视图不裁切最高塔。

### Task C：Tower3D 正式美术

目标：

- 做出石质平台塔。
- 添加顶部平台、侧面石砖、城垛边缘、符文槽。
- 普通塔和乌鸦纹章塔清晰区分。

验收：

- 不用 emoji。
- 不用纯色矩形当最终塔体。
- 9 层堆叠仍可读。
- 切片高亮只影响被移动的层及以上。

### Task D：Castle3D 正式美术

目标：

- 乌鸦堡成为独立可复用模型。
- 地面和塔顶都能摆放。
- 不遮挡同平台巫师。

验收：

- 看起来是乌鸦主题城堡，而不是黑块。
- 与巫师共处时能读出巫师数量和玩家色。

### Task E：Space3D 与地图环正式美术

目标：

- 每个空间变为暗色石质 3D 地块。
- 16 格道路视觉统一。
- target/selectable/raven/setup 状态可读。

验收：

- 地图整体像桌游舞台。
- 状态不依赖文字。
- 前景不严重遮挡后景。

### Task F：Wizard3D 正式美术

目标：

- 巫师变成尖帽、袍身、底座阴影的棋子。
- 3 x 2 站位适配地面和塔顶。
- 选中、不可点击、debug 封印状态清晰。

验收：

- 6 个巫师不重叠。
- 玩家颜色一眼可辨。
- 选中巫师牌后只高亮可操作巫师，塔不发光。

### Task G：侧边 UI 道具 3D 化

目标：

- 卡牌、药水、法术按钮统一成奇幻道具风格。
- 不改信息权限。

涉及文件：

- `HandPanel.tsx`
- `PotionPanel.tsx`
- `SpellPanel.tsx`
- `PlayerBar.tsx`
- `LogPanel.tsx`
- `phase-u.css`

验收：

- 当前玩家私密信息不泄露。
- 卡牌选中、药水状态、法术可用性清晰。

---

## 5. 编码规范

### 5.1 组件边界

- `StageViewport`：只负责视口、缩放、平移、相机。
- `Board`：只负责 16 格位置计算和前后排序。
- `SpaceCell`：负责空间内部组合，不塞复杂资产细节。
- `Tower3D`：只负责单层塔。
- `Wizard3D`：只负责单个巫师。
- `Castle3D`：只负责乌鸦堡。
- `phase-u.css`：放伪元素、动画、复用类名。

### 5.2 样式策略

当前项目大量使用 inline style。后续可继续使用，但满足以下规则：

- 尺寸从 `visual3d.ts` 来。
- 复用光效、伪元素、动画放入 `phase-u.css`。
- 不为了小装饰新增组件。
- 不把页面大布局改成营销页或展示页。

### 5.3 交互策略

必须保留：

- `onSpaceClick`
- `onWizardClick`
- `onTowerClick`
- `data-interactive`
- F2 颜色隔离
- 巫师高亮规则
- 塔切片规则

任何视觉层改造都不能吞掉点击事件。

---

## 6. 每次提交前检查

1. 搜索核心资产 emoji：
   `rg -n "🏰|🛡|🔥|🏠|🧙|✨" packages/client/src`
2. 搜索旧尺寸：
   `rg -n "WORLD_SIZE|CELL_SIZE|const CELL = 90|620|CELL = 90" packages/client/src`
3. 前端类型检查：
   `pnpm --filter @wt/client typecheck`
4. 如改共享类型或规则：
   `pnpm test`

如果环境缺少 `pnpm` 或 `corepack` 失败，说明原因即可，不要把验证写成已通过。

---

## 7. 后续 agent 推荐执行顺序

1. 先完成 Task A。
2. 继续完成 Task B，把比例系统跑通。
3. 做 Task C 和 Task D，让塔和乌鸦堡先变成可交付资产。
4. 做 Task E，统一地图地块和道路。
5. 做 Task F，补巫师站位与高亮。
6. 最后做 Task G，处理侧边 UI 道具化。

每个任务完成后，都要在最终说明里写：

- 改了哪些文件。
- 哪个验收项已完成。
- 哪个验收项还没完成。
- 验证命令是否成功。
