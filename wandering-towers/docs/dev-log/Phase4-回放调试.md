# Phase 4 开发日志：回放与调试面板

> 任务清单：[../00-开发任务总表.md#phase-4回放与调试面板](../00-开发任务总表.md)
> 状态：T4.1 / T4.2 / T4.3 全部完成（2026-06-27）

## 概览
事件流持久化 + 回放引擎 + 调试面板。

## 任务进度
| 任务 | 状态 | TC 覆盖 |
|---|---|---|
| T4.1 事件流持久化 | ✅ 已完成 | — |
| T4.2 回放引擎 | ✅ 已完成 | TC-REPLAY-001 / TC-REPLAY-002 |
| T4.3 调试面板 | ✅ 已完成 | — |

## T4.1 事件流持久化
- `packages/shared/src/types/save-game.ts`：SaveGame 结构（gameId / version / savedAt / config / seed / initialEvents / recordedEvents / finalState?）。
- `packages/engine/src/replay/replay.ts`：`replay({config, seed, events})` 一次性重建最终状态；`replayEmpty` 骨架。
- `packages/client/src/game/useGame.ts`：`exportSave(gameId?)` 导出当前对局；`recordedEvents` 仅累计玩家命令事件。
- `packages/client/src/game/replay.ts`：`snapshotAt(save, cursor)` 按 cursor 步进回放（增量 applyEvent）、`buildFinalReplayState`、`isValidSave`。
- `packages/client/src/components/ReplayView.tsx`：回放视图（ReplayLauncher 加载存档 + 步进 UI），已接线进 App。

## T4.2 回放引擎 + 一致性测试
- 新增 `packages/engine/tests/replay/random-game.spec.ts`（由根 `pnpm replay:check` 与默认 `pnpm test` 共同收集）：
  - **TC-REPLAY-001**：实跑一局 → 用 initEvents + recordedEvents 经 `replay()` 重建 → 重建态与引擎实跑态在所有游戏状态字段上一致（多 seed / 2-3 人覆盖）。
  - **TC-REPLAY-002**：100 局随机对局，每条命令后断言五类不变量始终成立（DoD T1.9 / invariants §23）。
- 自动化玩家（`playRandomGame`）：确定性 mulberry32 PRNG 驱动，每 ACTION 阶段尝试 PLAY_CARD 候选，全部非法时 ACTION_1 回退 DISCARD_REDRAW、ACTION_2 回退 SKIP_SECOND_ACTION，保证每轮推进。

### 关键 bug 修复：WIZARD_RELEASED 事件溯源
- **现象**：TC-REPLAY-001 一致性测试暴露——跑多命令后，引擎实跑态的 `towers[*].imprisonedWizards` 与回放态发散（回放态保留本应解封的巫师）。
- **根因**：`rules/move-tower.ts` 的 `releaseVisibleWizardsAtSource` **直接 mutate state**（`wizard.state = ...`、`tower.imprisonedWizards.splice`），同时 emit `WIZARD_RELEASED` 作为「标记事件」；而 `apply-event.ts` 的 `WIZARD_RELEASED` 是 no-op。违反「applyEvent 是唯一改 state 的地方」红线——纯事件回放无法复现解封。
- **修复**：
  1. `apply-event.ts` 实装 `WIZARD_RELEASED` handler：从原封印塔 `imprisonedWizards` 移除、置 `wizard.state = to`、解封到地面时登记 `groundVisibleWizards`。
  2. `move-tower.ts` `releaseVisibleWizardsAtSource` 改为只 emit、不 mutate。
- **影响面**：`spells/implementations/free-a-wizard.ts` 也 emit `WIZARD_RELEASED`（仍含直接 mutate，幂等）；spell.spec 18 测试 + tower-move E1 解封测试均仍通过。

### 已知限制
- 随机玩家不主动朝乌鸦城堡推进，100 局均未自然终局（命中 800 命令上限）。TC-REPLAY-002 的 DoD 是「无非法状态」（已满足），不要求自然终局；终局/胜负结算路径由 `castle-endgame.spec.ts` 单测覆盖。
- `stateVersion` 是按命令自增的并发控制元数据（V3 §5.2），不在事件流中——纯事件回放无法复现该计数。TC-REPLAY-001 比较前将双方 stateVersion 归零（联机防冲突用，非游戏状态）。

## T4.3 调试面板
- 新增 `packages/client/src/components/DebugPanel.tsx`：浮动可折叠面板，通过 URL `?debug` 激活（默认不渲染，避免干扰正常游玩）。
- 展示分区：
  - 状态总览：阶段/当前玩家/轮次/stateVersion/drawPile 长度/discardPile 长度/终局触发/胜者。
  - 乌鸦城堡：位置模式 + 堡内巫师列表。
  - 全巫师状态：10 张表行（ID/归属/状态/详情），含塔内封印位置。
  - 塔与封印：9 座塔的位置/层级/纹章/sealed/塔内巫师。
  - 命令注入器：CommandType 下拉（6 个）+ 玩家下拉（state.playerOrder）+ 原始 JSON payload 文本框 + 注入按钮；错误时显示 `RuleError.code: message`。
- 接线 `GameContainer`：`isDebugMode()` 时挂载 `<DebugPanel state dispatch />`（dispatch 为 useGame 原始派发）。
- 实测：注入 `END_TURN` 正确推进轮次；非法命令显示 ✗ + 错误码（结构对称、try/catch 明确）。
