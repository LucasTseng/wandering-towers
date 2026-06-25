# @wt/ui — 前端组件层

> ⚠️ **状态：半成品，不编译、未接线。** 仅供 Phase C 重写时参考设计，当前不可用。

## 现状

本包是 Phase 3 前端 MVP 的早期半成品，**当前基于一套不存在的旧 API 编写，无法编译，也未接入 client**。具体问题：

- 选择器用了 `getPlayer` / `getPotionsByPlayer` / `getTowerStack` / `getWizardsAt` — 真实选择器见 [engine/src/state/selectors.ts](../engine/src/state/selectors.ts)（`wizardsOfPlayer` / `potionsByState` / `towerStackAt` / `visibleWizardsAt` 等）。
- `GameConfig` 用了编造的结构（`board.spaces` / `towers.count` / `wizards.perPlayer` / `cards.templates` / `ravenCastle.maxHeight`）— 真实结构见 [shared/src/types/game-config.ts](../shared/src/types/game-config.ts)。
- `useGame` 用 `new RuleEngine(state)` — 真实是 `new RuleEngine(config, {seed})`，且 `applyEvent` 路径是 `state/apply-event` 而非 `events/apply-event`。
- 类型用了 `Player` / `BoardSpace` / `Tower` / `Wizard` — 真实是 `PlayerState` / `SpaceState` / `TowerRuntimeState` / `WizardRuntime`，且字段不同（如 `tower.hasRavenShield` 而非 `isRavenTower`，`wizard.state` 而非 `wizard.position`）。
- 核心交互（施法目标选择）依赖 `CAST_SPELL`，而法术系统 Phase B 才实装。

## 不参与编译

本包未配置 `typecheck` script 与 `tsconfig.json`，因此根目录 `pnpm typecheck` 会跳过本包（避免其幻想 API 拖垮类型检查）。这是有意为之。

## Phase C 重写计划

Phase C 将基于以下真实契约从零重建本包（详见 [docs/开发设计文档-架构与实现基线.md §6/§12](../../docs/开发设计文档-架构与实现基线.md)）：

1. 引擎 API：`RuleEngine(config, {seed})` + `execute(ActionCommand) → ExecuteResult`。
2. 真实选择器与类型。
3. LocalGameAdapter（接口形态对齐 V3 协议）+ `useGame` Hook。
4. 组件分层：GameContainer（智能）/ GameScreen（哑）/ Board·Space·Tower·Wizard（原子）。
5. 交互：手牌两步、塔切片选择、法术施放（依赖 Phase B）、封印/药水/状态展示、日志与胜负。

## 保留的设计参考价值

- 组件分层结构（智能/哑/原子）。
- `UIIntent` 多步交互意图模式（GameContainer）。
- CSS 布局（GameScreen.css 的 grid 布局、Board.css 的环形棋盘定位思路）。
- ControlPanel / PlayerInfo 的展示思路。

重写时可直接参考这些结构，替换 API 调用与类型。
