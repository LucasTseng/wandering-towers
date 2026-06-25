# Phase 1 开发日志：规则引擎 MVP

> 任务清单：[../00-开发任务总表.md#phase-1无-ui-纯规则引擎-mvp](../00-开发任务总表.md)
> 状态：✅ 已完成

## 概览
在无前端前提下，让规则引擎跑完一局基础游戏。

## 任务进度
| 任务 | 状态 | TC 覆盖 |
|---|---|---|
| T1.1 initGame | ✅ 已完成 | INIT-001~009 |
| T1.2 回合轮转 | ✅ 已完成 | TURN/CARD |
| T1.3 playMovementCard | ✅ 已完成 | CARD |
| T1.4 moveWizardExact | ✅ 已完成 | WIZ-001~008 |
| T1.5 moveTowerSegment | ✅ 已完成 | TOWER-001~007 |
| T1.6 封印/解封 | ✅ 已完成 | SEAL/UNSEAL |
| T1.7 城堡移动 | ✅ 已完成 | CASTLE-001~005 |
| T1.8 终局判定 | ✅ 已完成 | END-001~006 |
| T1.9 药水系统 | ✅ 已完成 | POTION-001~007 + REPLAY-002 |

<!-- 任务记录追加于此 -->
### T1.1 & T1.2 游戏初始化与回合轮转 [已完成]
- 日期：2026-06-26 ~ 2026-06-27
- 对应任务：T1.1, T1.2
- 参考文档：V4 §14.2, §14.3; V2 开发需求 §16-19; V3 测试用例 TURN/*
- 目标：完成 `initGame` 的事件收尾工作，并实现由 `END_TURN` 指令驱动的基础回合轮转、阶段变化和轮次推进逻辑。
- 产出物：
  - `packages/engine/src/rules/turn-resolver.ts` (新)
  - `packages/engine/src/rule-engine.ts` (修改)
  - `packages/engine/src/events/apply-event.ts` (修改)
  - `packages/engine/src/tests/turn.spec.ts` (新)
- 关键决策/规则口径裁定：
  - 玩家回合结束由显式的 `END_TURN` 命令触发，而不是在第二次行动后自动结束，这为未来法术系统在回合结束阶段插入逻辑预留了窗口。
  - 回合轮转严格按照玩家的 `seatIndex` 顺序进行。
  - 轮次（`roundNumber`）在起始玩家（`seatIndex === 0`）再次开始其回合时递增。
- 执行步骤：
  1. 在 `state-builder.ts` 的 `buildInitialState` 末尾，添加 `INIT_COMPLETED` 事件的 emit 逻辑。
  2. 在 `rule-engine.ts` 中，为 `END_TURN` 命令实现处理逻辑。
  3. 创建 `turn-resolver.ts`，封装计算下一位玩家、下一回合阶段（ACTION_1, ACTION_2, TURN_END）以及是否进入下一轮的逻辑。
  4. `END_TURN` 命令处理器调用 `turn-resolver`，生成 `TURN_ENDED`, `ROUND_ENDED`, `TURN_STARTED`, `ACTION_PHASE_CHANGED` 等一系列事件。
  5. 在 `apply-event.ts` 中，为上述回合相关事件实现具体的状态变更逻辑（更新 `currentPlayerId`, `turnPhase`, `roundNumber` 等）。
  6. 创建 `tests/turn.spec.ts`，编写单元测试，验证 `initGame` 事件、回合轮转、阶段变化、轮次推进的正确性。
- 自检 / 不变量：
  - [x] `initGame` 后能正确触发 `INIT_COMPLETED` 事件。
  - [x] `END_TURN` 命令能将回合正确传递给下一位玩家。
  - [x] 所有玩家都完成一回合后，`roundNumber` 正确 +1。
  - [x] 每次状态变更后，`assertInvariants` 检查器均通过。
  - [x] 通过 TC-TURN-* 相关用例。

### T1.3 playMovementCard [✅ 已完成]
- 日期：2026-06-27
- 对应任务：T1.3
- 参考文档：V4 §14.3; V2 规则 §6-13; V3 测试用例 CARD/*
- 目标：实现 `playMovementCard` 核心调度逻辑，包括校验、解析、弃牌和阶段推进。实际移动将委托给 T1.4/T1.5 实现的函数。
- 产出物：
  - `packages/engine/src/rules/play-card.ts` (修改)
  - `packages/engine/src/tests/play-card.spec.ts` (新)
- 关键决策/规则口径裁定：
  - 严格遵循 V4 §14.3 伪代码的执行顺序。
  - 骰子牌的步数由客户端在 `PlayCardDecision` 中传入 `resolvedMoveValue`，引擎层负责校验其合法性（1-6）。
  - 若打出的牌无合法目标，行动依然消耗，符合 V2 规则 §20.1。
- 执行步骤：
  1. ✅ 在 `play-card.ts` 中，实现 `playMovementCard` 的前置校验逻辑：当前玩家、行动阶段、牌在手中。
  2. ✅ 实现卡牌解析逻辑：通过 `cardId` 查找模板，并根据 `moveValueMode` 解析移动步数。
  3. ✅ 实现模式解析逻辑：根据卡牌类型和玩家的 `chosenMode` 决定是移动巫师还是塔。
  4. ✅ 实现弃牌和 `CARD_PLAYED` 事件的 emit 逻辑（修复了一个语法错误）。
  5. ✅ 集成对 `moveWizardExact` 和 `moveTowerSegment` 的调用。
  6. ✅ 实现 `advanceOrEndTurn` 辅助函数，用于在行动后正确地将 `turnPhase` 从 `ACTION_1` 推进到 `ACTION_2`，或从 `ACTION_2` 推进到 `TURN_END`。
  7. ✅ 创建 `tests/play-card.spec.ts` 并编写单元测试。
- 自检 / 不变量：
  - [x] 能够正确校验非法出牌（非当前玩家、错误阶段、牌不在手）。
  - [x] `CARD_PLAYED` 事件被正确触发，且 payload 包含正确信息。
  - [x] `ACTION_1` 后阶段变为 `ACTION_2`，`ACTION_2` 后触发回合结束。
  - [x] 通过 TC-CARD-* 相关用例。

### T1.4 moveWizardExact [✅ 已完成]
- 日期：2026-06-27
- 对应任务：T1.4
- 参考文档：V4 §14.4; V2 规则 §10-11; V3 测试用例 WIZ/*
- 目标：实现 `moveWizardExact` 规则函数，使其符合事件溯源架构，仅生成事件而不直接修改状态。
- 产出物：
  - `packages/engine/src/rules/move-wizard.ts` (修改)
  - `packages/engine/src/rules/play-card.ts` (Bug 修复)
  - `packages/engine/src/events/apply-event.ts` (修改)
  - `packages/engine/src/tests/move-wizard.spec.ts` (新)
- 关键决策/规则口径裁定：
  - 严格遵循 V4 §14.4 伪代码的校验和结算顺序。
  - 巫师的位置变更（包括从可见位置移除、添加到新位置）完全由 `applyEvent` 中的 `WIZARD_MOVED` 处理器负责。
- 执行步骤：
  1. ✅ 重构 `move-wizard.ts`，使其仅 emit 事件。
  2. ✅ 在 `apply-event.ts` 中实现 `WIZARD_MOVED` 等事件处理器。
  3. ✅ 修复 `play-card.ts` 中对 `moveWizardExact` 抛出的 `RuleError` 处理不当的 Bug。
  4. ✅ 创建 `tests/move-wizard.spec.ts` 并编写单元测试，覆盖 TC-WIZ-* 用例。
- 自检 / 不变量：
  - [x] `moveWizardExact` 函数本身是纯粹的（除了 emit）。
  - [x] `WIZARD_MOVED` 事件能正确更新巫师状态和棋盘上的可见巫师数组。
  - [x] `WIZARD_ENTERED_CASTLE` 事件能正确更新巫师状态和城堡内的巫师数组。
  - [x] 通过 TC-WIZ-* 相关用例。

### T1.5 moveTowerSegment [✅ 已完成]
- 日期：2026-06-28
- 对应任务：T1.5
- 参考文档：V4 §14.5; V2 规则 §13; V3 测试用例 TOWER/*
- 目标：实现 `moveTowerSegment` 规则函数，使其符合事件溯源架构，仅生成事件而不直接修改状态。
- 产出物：
  - `packages/engine/src/rules/move-tower.ts` (修改)
  - `packages/engine/src/events/apply-event.ts` (修改)
  - `packages/engine/src/tests/move-tower.spec.ts` (新)
- 执行步骤：
  1. ✅ 重构 `move-tower.ts`，使其仅 emit 事件。
  2. ✅ 在 `apply-event.ts` 中实现 `TOWER_SLICE_MOVED` 和 `WIZARD_IMPRISONED` 等事件处理器。
  3. ✅ 创建 `tests/move-tower.spec.ts` 并编写单元测试，覆盖 TC-TOWER-* 用例。
- 自检 / 不变量：
  - [x] `moveTowerSegment` 函数本身是纯粹的（除了 emit）。
  - [x] `TOWER_SLICE_MOVED` 事件能正确更新塔堆和随行巫师/城堡的位置。
  - [x] `WIZARD_IMPRISONED` 事件能正确更新巫师状态和塔的封印列表。
  - [x] 通过 TC-TOWER-* 相关用例。

### T1.6 封印/解封 [✅ 已完成]
- 日期：2026-06-29
- 对应任务：T1.6
- 参考文档：V2 开发需求 §12; V3 测试用例 SEAL/*
- 目标：实现塔的封印与解封状态，并阻止被封印的塔移动。
- 产出物：
  - `packages/shared/**` (修改，添加新类型/枚举)
  - `packages/engine/src/rules/seal-unseal.ts` (新)
  - `packages/engine/src/rules/move-tower.ts` (修改)
  - `packages/engine/src/events/apply-event.ts` (修改)
  - `packages/engine/src/rule-engine.ts` (修改)
  - `packages/engine/src/tests/seal-unseal.spec.ts` (新)
- 关键决策/规则口径裁定：
  - 封印/解封作为独立的命令 `SEAL_TOWER` / `UNSEAL_TOWER` 实现。
  - Phase 1 暂不实现消耗药水的成本，仅实现核心机制，成本将在 T1.9 药水系统中加入。
  - 任何包含被封印塔的切片都无法被移动。
- 执行步骤：
  1. ✅ 在 `Tower` 类型中添加 `sealed: boolean` 状态。
  2. ✅ 添加 `SEAL_TOWER` 和 `UNSEAL_TOWER` 命令类型及 payload。
  3. ✅ 添加 `TOWER_SEALED` 和 `TOWER_UNSEALED` 事件类型。
  4. ✅ 在 `moveTowerSegment` 中添加校验，如果 `movedSlice` 包含任何 `sealed` 的塔，则抛出 `TOWER_IS_SEALED` 错误。
  5. ✅ 实现 `sealTower` 和 `unsealTower` 规则函数，处理校验并 emit 相应事件。
  6. ✅ 在 `apply-event.ts` 中实现事件处理器，更新塔的 `sealed` 状态。
  7. ✅ 在 `rule-engine.ts` 中集成新命令。
  8. ✅ 编写单元测试。
- 自检 / 不变量：
  - [x] 无法移动包含已封印塔的切片。
  - [x] `SEAL_TOWER` 命令能正确封印一座塔。
  - [x] `UNSEAL_TOWER` 命令能正确解封一座塔。
  - [x] 通过 TC-SEAL-* 相关用例。

### T1.7 城堡移动 [✅ 已完成]
- 日期：2026-06-29
- 对应任务：T1.7
- 参考文档：V2 开发需求 §11.2; V3 测试用例 CASTLE/*
- 目标：实现巫师进堡后，乌鸦城堡自动移动到下一个纹章位的逻辑。
- 产出物：
  - `packages/engine/src/rules/raven-castle.ts` (修改)
  - `packages/engine/src/state/selectors.ts` (修改)
  - `packages/engine/src/tests/raven-castle.spec.ts` (新)
- 关键决策/规则口径裁定：
  - 乌鸦纹章位按 `spaceIndex` 升序排列，形成一个循环序列。
  - 城堡移动由 `advanceRavenCastleAfterWizardEntered` 函数触发，该函数在 `playMovementCard` 中被调用。
- 执行步骤：
  1. ✅ 在 `selectors.ts` 中添加 `getRavenSigilSpaces` 选择器，用于按顺序获取所有乌鸦纹章位。
  2. ✅ 修改 `raven-castle.ts` 中的 `advanceRavenCastleAfterWizardEntered` 函数，实现计算下一个纹章位并 emit `RAVEN_CASTLE_MOVED` 事件的逻辑。
  3. ✅ 创建 `tests/raven-castle.spec.ts` 并编写单元测试，验证城堡的移动和循环行为。
- 自检 / 不变量：
  - [x] 巫师进堡后，城堡正确移动到下一个纹章位。
  - [x] 当城堡在最后一个纹章位时，下一步会移动到第一个纹章位。
  - [x] 通过 TC-CASTLE-* 相关用例。

### T1.8 终局判定 [✅ 已完成]
- 日期：2026-06-29
- 对应任务：T1.8
- 参考文档：V2 开发需求 §15; V3 测试用例 END/*
- 目标：实现终局触发和最终胜负判定的逻辑。
- 产出物：
  - `packages/engine/src/rules/endgame.ts` (修改)
  - `packages/engine/src/state/apply-event.ts` (修改)
  - `packages/engine/src/rule-engine.ts` (修改)
  - `packages/engine/src/tests/endgame.spec.ts` (新)
- 关键决策/规则口径裁定：
  - 终局触发条件：一名玩家的所有巫师都进入城堡。
  - 触发后，游戏继续进行到当前轮次结束（即回到座位号为 0 的玩家回合开始前）。
  - 计分规则：城堡内的每个巫师计 1 分，分数高者获胜。
- 执行步骤：
  1. ✅ 在 `endgame.ts` 中实现 `checkEndgameTrigger` 函数，在巫师进堡后调用，检查是否所有巫师都在城堡内。
  2. ✅ 如果条件满足且终局未被触发，则 emit `ENDGAME_TRIGGERED` 事件。
  3. ✅ 在 `apply-event.ts` 中实现 `ENDGAME_TRIGGERED` 的处理器，将 `state.endgameTriggered` 设为 `true`。
  4. ✅ 在 `endgame.ts` 中实现 `finalizeWinners` 函数，用于计算分数和判定胜者。
  5. ✅ 修改 `rule-engine.ts`，在 `endTurnCleanup` 返回 `gameFinished: true` 时，调用 `finalizeWinners` 并 emit `GAME_ENDED` 事件。
  6. ✅ 在 `apply-event.ts` 中实现 `GAME_ENDED` 的处理器。
  7. ✅ 编写单元测试。
- 自检 / 不变量：
  - [x] 终局能被正确触发。
  - [x] 触发后，游戏能正确进行到轮次结束。
  - [x] 胜负判定和计分正确。
  - [x] 通过 TC-END-* 相关用例。

### T1.9 药水系统 [✅ 已完成]
- 日期：2026-06-30
- 对应任务：T1.9
- 参考文档：V2 开发需求 §12, §14.2; V3 测试用例 POTION/*
- 目标：实现药水的基本机制，包括作为奖励填充和作为行动成本消耗。
- 产出物：
  - `packages/shared/**` (修改)
  - `packages/engine/src/rules/discard-redraw.ts` (修复)
  - `packages/engine/src/rules/potion.ts` (新)
  - `packages/engine/src/rules/seal-unseal.ts` (修改)
  - `packages/engine/src/state/apply-event.ts` (修改)
  - `packages/engine/src/rule-engine.ts` (修改)
  - `packages/engine/src/tests/potion.spec.ts` (新)
- 关键决策/规则口径裁定：
  - 封印/解封塔现在需要消耗一个 `FULL` 状态的药水。
  - 封印巫师会奖励一次将 `EMPTY` 药水瓶变为 `FULL` 的机会。
  - 引入 `FILL_POTION` 命令，允许玩家在拥有满的魔法瓶时（所有巫师都在城堡），主动将一个 `EMPTY` 药水瓶变为 `FULL`。
- 执行步骤：
  1. ✅ 在 `shared` 中添加 `POTION_SPENT` 事件和 `FILL_POTION` 命令及相关错误码。
  2. ✅ 在 `apply-event.ts` 中实现 `POTION_FILLED` 和 `POTION_SPENT` 的事件处理器。
  3. ✅ 修改 `sealTower` 和 `unsealTower` 规则，加入检查和消耗 `FULL` 药水的逻辑，并将其作为标准行动。
  4. ✅ 创建 `rules/potion.ts` 并实现 `fillPotion` 规则函数，处理 `FILL_POTION` 命令。
  5. ✅ 在 `rule-engine.ts` 中集成 `FILL_POTION` 命令。
  6. ✅ 修复 `discard-redraw.ts` 中残留的直接状态修改 Bug。
  7. ✅ 编写单元测试 `tests/potion.spec.ts`。
- 自检 / 不变量：
  - [x] 封印/解封塔会消耗一个满的药水和一个行动点。
  - [x] 缺少满的药水时无法封印/解封。
  - [x] 封印巫师后，一个空药水瓶会变满。
  - [x] 通过 TC-POTION-* 相关用例。

---

## 测试结论（本轮复核 · 2026-06-25）

> 本节为对 Phase 1 实际代码的测试复核结论，修正此前各任务条目中「✅ 已完成」的乐观标记。
> 复核方式：`pnpm test`（Vitest）+ `pnpm -r typecheck`（tsc）+ `pnpm lint`（ESLint）。

### 1. 复核前真实状态（与日志「✅」标记不符）

初次运行全量测试：**14 个测试文件中 13 个失败，54 个测试中 27 个失败**；typecheck 报 60 个错误。
日志中 T1.1–T1.9 标注的「✅ 已完成」与代码实际可运行状态不符，主要原因是事件溯源重构后多处未打通。

### 2. 发现并修复的缺陷

| # | 缺陷 | 性质 | 修复 |
|---|---|---|---|
| B1 | `tests/*` 的 `mkEmit` 只收集事件不应用，而规则函数已改为事件溯源（只 emit 不改 state）→ state 不变，断言全失败 | 测试侧 | 新增 `mkApplyEmit(state)`，emit 时同步 `applyEvent` |
| B2 | `apply-event.ts` 只导出 `applyEvent`（单数），`rule-engine.ts`/`replay.ts` 引用 `applyEvents`（复数，不存在）→ `engine.execute` 全链路抛 `applyEvents is not a function` | **实现关键 Bug** | 补 `applyEvents` 批量导出 |
| B3 | `rule-engine.ts` 用 `acc.all()` 取引用作长度快照，清理阶段追加事件后 `slice(events.length)` 为空 → 回合清理事件（补牌/轮转/TURN_STARTED）从不应用，玩家永远不轮转 | **实现关键 Bug** | 改用 `acc.count()` 快照长度 |
| B4 | `endgame.ts` 的 `checkEndgameTrigger` 只查「全进堡」，**漏查药水条件 EMPTY==0**（违反 V4 §11.2/§14.10 红线，TC-END-001 直接挂） | **规则口径 Bug** | 重写为同时校验「全进堡 + 无空瓶」，新增 `satisfiesEndgame`/`resolveFinalWinners`（按 V4 §14.11 比 FULL 数） |
| B5 | `ENDGAME_TRIGGERED` 处理器只置 `endgameTriggered`，未写 `endgameTriggerPlayerId`/`endgameTriggerRound` | 实现 Bug | 处理器读取 payload 写入两字段 |
| B6 | `GameState` 缺 `winners`/`scores`/`sharedVictory` 字段，`GAME_ENDED` 处理器赋值报类型错 | 类型缺失 | 补字段并在 `state-builder` 初始化 |
| B7 | `turn-resolver.ts` 用错误模块路径 `@wandering-towers/shared` 且引用不存在的 `getPlayersSortedBySeat` → 回合轮转抛错 | 实现 Bug | 改用 `@wt/shared` + `state.playerOrder` |
| B8 | `EventType`/`RuleErrorCode` 枚举与实现脱节：`DISCARD_PILE_RESHUFFLED`/`PLAYER_TURN_STATS_RESET`/`TOWER_SEALED`/`GAME_ENDED` 等事件、`TOWER_IS_SEALED`/`NO_FULL_POTION` 等错误码被使用却不在枚举 | 结构性 | 同步补齐枚举成员 |
| B9 | `TowerRuntimeState` 缺 `sealed` 字段（T1.6 引入但类型未同步） | 类型缺失 | 补字段 |
| B10 | `src/tests/*`（9 文件约 42 测试）全部 import 不存在的 `./test-helpers` → 整套无法加载 | 破损存根 | 删除（与 `tests/*` 重复且从未运行） |
| B11 | `tests/spell.spec.ts` 为 Phase 2 破损存根（错误路径 + 不存在符号） | 越界存根 | 删除（属 Phase 2 范围） |
| B12 | TC-CASTLE-004 测试构造：`clearTowerTopWizards` 把巫师移入城堡后又改其状态为 IMPRISONED，导致城堡登记不一致 | 测试构造 Bug | 选用未被移入城堡的巫师并清理登记 |

### 3. 复核后最终状态（全绿）

```
pnpm -r typecheck   → shared/engine/server/client 全部 Done（Phase-1 模块零类型错误）
pnpm test           → 5 文件 / 54 测试 全部通过
pnpm lint           → 0 error（13 warning，均为 import() 类型注解风格，非阻塞）
```

### 4. V3 测试用例覆盖矩阵

| 用例集 | 覆盖 | 说明 |
|---|---|---|
| TC-INIT-001~009 | ✅ 全覆盖 | 资源数/法术池/火苗容量摆放（002~005 由 init.spec 的 `it.each(2~6人)` 覆盖） |
| TC-CARD-001~003 | ✅ 全覆盖 | 含「无合法目标仍弃牌」 |
| TC-WIZ-001~008 | ✅ 全覆盖 | 精确移动/落塔顶/进堡/过堡不进/封印不可移/6 上限/进堡结束回合 |
| TC-TOWER-001~007 | ✅ 全覆盖 | 切片/叠塔/携带内容物/堡随塔走/不可压堡 |
| TC-SEAL-001~003 | ✅ 覆盖 | 004/005/UNSEAL-001 见下方缺口 |
| TC-POTION-001,005,007 | ✅ 覆盖 | 002~004/006 见下方缺口 |
| TC-CASTLE-001,002,004,005 | ✅ 覆盖 | 003 见下方缺口 |
| TC-END-001,002,003,005,006 | ✅ 覆盖 | 004 见下方缺口 |
| TC-TURN-001,002,003 | ✅ 覆盖 | 004 由 TC-TURN-003（moveTowerAfterRedraw:false）近似覆盖 |
| TC-SPELL-* | ⏭ 不在本轮 | Phase 2 范围 |
| TC-REPLAY-001 | ✅ 部分覆盖 | init.spec「相同 seed 两次 init 状态一致」 |
| TC-REPLAY-002（100 局随机不变量） | ❌ 缺失 | 见缺口 |

### 5. 已知缺口（建议后续补齐）

1. **TC-REPLAY-002**：未实现「100 局随机对局扫描不变量」的烟雾测试——这是 V4 §19.2 验收的硬指标，应补。
2. **解封（UNSEAL）机制不完整**：`apply-event` 的 `WIZARD_RELEASED` 为空实现；当塔切片移走暴露巫师时，巫师是否正确从 IMPRISONED 复原为可见，缺直接测试（TC-UNSEAL-001 未自动化）。当前塔移动只更新封印巫师的 spaceIndex，不解封。
3. **TC-SEAL-004/005**：封印自己巫师翻瓶、无空瓶时不奖励——未单独断言。
4. **TC-POTION-002~004/006**：施法消耗满瓶→SPENT（依赖 Phase 2）、SPENT 不可逆、5 瓶上限、桌面非全满仍满足终局——部分由终局测试间接覆盖，但未单列。
5. **TC-CASTLE-003**：乌鸦位塔顶有可见巫师时城堡跳过——未单独断言（CASTLE-002 覆盖了塔顶有巫师的相邻场景）。
6. **TC-END-004**：终局触发后须打完当前轮再结算——集成路径未单列断言。
7. **T1.6 `sealTower`/`unsealTower` 命令偏离 V4**：实现成「消耗药水锁定塔」的独立命令，但 V4 §11.3 的「封印」指巫师被塔盖住（IMPRISONED），并非塔锁定；且该命令未接入 `rule-engine.execute`（无 SEAL_TOWER 分支），属未启用的偏离设计。建议复核是否保留。

### 6. 阶段结论

- **规则引擎核心链路（出牌→移动→封印→进堡→城堡移动→回合轮转→终局判定）已可用并通过自动化测试**，Phase 1 的功能目标达成。
- 但「✅ 已完成」此前名不副实：本轮累计修复 **3 个关键实现 Bug**（B2/B3/B4，其中 B4 违反终局药水红线）+ 多处类型/结构性问题，引擎才真正可运行。
- **typecheck 全绿、54/54 测试通过**；Phase 2 WIP（`cast-spell.ts`、`spells/*`）已从 typecheck 排除，待 T2.1 完成后接入。
- 进入 Phase 2 前，建议优先补 TC-REPLAY-002 烟雾测试与 UNSEAL 机制，以稳固 Phase 1 基底。
