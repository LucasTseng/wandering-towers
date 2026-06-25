# Phase 4 开发日志：UI 状态管理

> 任务清单：[../00-开发任务总表.md#phase-4-ui-状态管理](../00-开发任务总表.md)
> 状态：🚧 进行中

## 概览
本阶段的目标是创建一个 React Hooks-based 的状态管理层，将 UI 组件与游戏引擎连接起来，实现一个可玩的应用。

## 任务进度
| 任务 | 状态 | TC 覆盖 |
|---|---|---|
| T4.1 `useGame` Hook | ✅ 已完成 | — |
| T4.2 接入主界面 | 🚧 进行中 | — |

<!-- 任务记录追加于此 -->
### T4.1 `useGame` Hook [🚧 进行中]
- 日期：2026-07-07
- 对应任务：T4.1
- 目标：创建一个名为 `useGame` 的自定义 Hook，用于封装游戏引擎的初始化和命令分发逻辑。
- 产出物：
  - `packages/ui/src/hooks/useGame.ts` (新)
- 执行步骤：
  1. ✅ **创建 `useGame.ts`**: 在 `packages/ui/src/hooks` 目录下创建新文件。
  2. ✅ **实现 Hook 逻辑**:
     - Hook 接收 `GameConfig` 和 `seed` 作为参数。
     - 内部使用 `useState` 来管理 `GameState`，并用 `useMemo` 创建初始状态。
     - 暴露 `state` 和一个用 `useCallback` 包装的 `dispatch` 函数。
     - `dispatch` 函数接收一个 `GameCommand`，创建 `RuleEngine` 实例，执行命令，然后用返回的事件序列通过 `applyEvent` 来更新 `GameState`。
- 自检 / 不变量：
  - [ ] `useGame` Hook 返回的 `state` 始终是一个合法的 `GameState` 对象。
  - [ ] 调用 `dispatch` 函数后，`state` 会被正确地更新以反映命令执行后的结果。

### T4.2 接入主界面 [🚧 进行中]
- 日期：2026-07-08
- 对应任务：T4.2
- 目标：将 `useGame` Hook 集成到 UI 中，以驱动 `GameScreen` 组件，创建一个可交互的应用。
- 产出物：
  - `packages/ui/src/containers/GameContainer.tsx` (新)
- 执行步骤：
  1. ✅ **创建容器组件**: 新建 `GameContainer.tsx`，它将作为“智能”组件，负责状态管理和逻辑处理。
  2. ✅ **调用 `useGame`**: 在 `GameContainer` 内部调用 `useGame` Hook，获取 `state` 和 `dispatch` 函数。
  3. ✅ **数据转换 (Selector Logic)**: 使用 `useMemo` 从完整的 `state` 中派生出 `GameScreen` 所需的 props（如 `playersData`）。这一步将 `engine` 的选择器逻辑正确地放置在了 UI 和引擎的连接层，而不是在纯 UI 组件内部。
  4. ✅ **实现事件处理器**: 创建 `handleEndTurn`, `handleCastSpell`, `handleWizardClick` 等函数。这些函数将用户的交互（如点击按钮）转换为对 `dispatch` 的调用，并传入符合 `GameCommand` 格式的对象。
  5. ✅ **连接 UI**: 将派生出的数据和事件处理器作为 props 传递给“哑”组件 `GameScreen`。
- 自检 / 不变量：
  - [ ] `GameContainer` 成功渲染 `GameScreen`。
  - [ ] 点击 `GameScreen` 上的按钮（如“结束回合”）会调用 `dispatch` 并更新游戏状态。
  - [ ] 游戏状态的更新会正确地反映在 UI 上（例如，当前玩家高亮变化）。