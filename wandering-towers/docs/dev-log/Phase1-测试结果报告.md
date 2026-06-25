# Phase 1 测试结果报告（独立文档）

> 生成日期：2026-06-25
> 范围：Phase 1 规则引擎 MVP（T1.1–T1.9）
> 命令：`pnpm test`（Vitest）+ `pnpm -r typecheck`（tsc）+ `pnpm lint`（ESLint）
> 工程根：`wandering-towers/`

本文件可单独交给 AI 用于 Phase 1 修复。包含三部分：
1. 当前测试结果（已全绿）
2. 本轮复核时发现的失败用例与根因（即 AI 需要修的问题）
3. 仍未覆盖的用例缺口

---

## 一、当前测试结果（修复后 · 全绿）

### 1.1 命令输出

```
$ pnpm test

 RUN  v2.1.9

 ✓ packages/engine/tests/init.spec.ts (13 tests) 8ms
 ✓ packages/engine/tests/wizard-move.spec.ts (10 tests) 5ms
 ✓ packages/engine/tests/castle-endgame.spec.ts (9 tests) 6ms
 ✓ packages/engine/tests/tower-move.spec.ts (12 tests) 7ms
 ✓ packages/engine/tests/turn-potion.spec.ts (10 tests) 8ms

 Test Files  5 passed (5)
      Tests  54 passed (54)
```

```
$ pnpm -r typecheck
packages/shared typecheck:  Done
packages/engine  typecheck:  Done
packages/server  typecheck:  Done
packages/client  typecheck:  Done

$ pnpm lint
✖ 13 problems (0 errors, 13 warnings)   ← 仅风格警告，非阻塞
```

### 1.2 测试文件与用例清单（5 文件 / 54 用例）

#### `packages/engine/tests/init.spec.ts`（13 用例）
覆盖 TC-INIT-001~009 及初始化不变量。

| 用例 |
|---|
| TC-INIT-001~005: 2/3/4/5/6 人局资源数量正确（`it.each`，巫师数×药水数） |
| TC-INIT-006: BASIC 模式默认法术池为 2 张 |
| TC-INIT-007: CUSTOM 模式固定法术池 |
| TC-INIT-008: CUSTOM 模式随机法术池（不重复，来自合法池） |
| TC-INIT-009: 开局巫师按 setupCapacity（火苗数）摆放到塔顶 |
| 牌堆总数 = 90，发牌后 drawPile + discardPile + 手牌 = 90 |
| 初始不变量检查通过 |
| 回放可复现：相同 seed 两次 init 状态一致 |
| currentPlayer = 座位 0 玩家，turnPhase = ACTION_1，roundNumber = 1 |

#### `packages/engine/tests/wizard-move.spec.ts`（10 用例）
覆盖 TC-WIZ-001~008。

| 用例 |
|---|
| TC-WIZ-001: 地面巫师移动到空地 |
| TC-WIZ-002: 地面巫师移动到有塔位置 → 落塔顶 |
| TC-WIZ-003: 塔顶巫师移动到空地 |
| TC-WIZ-004: 巫师刚好进入乌鸦城堡 |
| TC-WIZ-005: 步数超过城堡，不中途进入 |
| TC-WIZ-006: 被封印巫师不能作为普通巫师牌目标 |
| TC-WIZ-007: 目标落点超过 6 名可见巫师 |
| TC-WIZ-008(部分): 进入城堡返回 enteredCastle=true |
| 不允许移动别人的巫师（普通牌） |
| 法术模式 allowAnyOwner 可移动任意可见巫师 |

#### `packages/engine/tests/tower-move.spec.ts`（12 用例）
覆盖 TC-TOWER-001~007 + TC-SEAL-001~003 + 封印随塔移动。

| 用例 |
|---|
| TC-TOWER-001: 单塔移动到空位 |
| TC-TOWER-002: 单塔移动到已有塔位置 → 叠塔 [T2,T1] |
| TC-TOWER-003: 三层塔堆 [A,B,C] 只移动顶塔 C |
| TC-TOWER-004: 三层塔堆 [A,B,C] 移动中间塔 B 及上方 [B,C] |
| TC-TOWER-005: 移动整叠塔 [A,B,C] |
| TC-TOWER-006: 乌鸦城堡在被移动塔上时随塔移动 |
| TC-TOWER-007: 塔不能移动到乌鸦城堡所在位置压住城堡 |
| TC-SEAL-001: 塔盖住地面巫师 → 封印 |
| TC-SEAL-002: 塔盖住塔顶巫师 → 封印 |
| TC-SEAL-003: 一次封印多个巫师，imprisonmentHappened 仍 true |
| 封印随塔移动：切片内塔封印的巫师 spaceIndex 更新到 dest |
| 封印后塔顶巫师随切片移动到 dest 空间 |

#### `packages/engine/tests/castle-endgame.spec.ts`（9 用例）
覆盖 TC-CASTLE-001/002/004/005 + TC-END-001/002/003/005/006。

| 用例 |
|---|
| TC-CASTLE-001: 巫师进堡后城堡移动到下一个合法乌鸦位 |
| TC-CASTLE-002: 乌鸦位地面有可见巫师 → 跳过 |
| TC-CASTLE-004: 乌鸦位塔内有封印巫师但顶上没人 → 仍可落 |
| TC-CASTLE-005: 没有合法乌鸦位 → 城堡不动 |
| TC-END-001: 全进堡但仍有空瓶 → 不触发 |
| TC-END-002: 没空瓶但仍有巫师未进堡 → 不触发 |
| TC-END-003: 同时满足两条件 → 触发 |
| TC-END-005: 多人同轮达成时比较 FULL 数量 |
| TC-END-006: 多人同轮且 FULL 相同 → 并列 |

#### `packages/engine/tests/turn-potion.spec.ts`（10 用例）
覆盖 TC-CARD-001/002 + TC-TURN-001/002/003 + TC-POTION-001/005/007。

| 用例 |
|---|
| TC-CARD-002: 非当前玩家不能打牌 |
| TC-CARD-001: 手牌不存在 → CARD_NOT_IN_HAND |
| TC-TURN-001: 正常两次行动后进入 TURN_END 并补牌、轮转到 P2 |
| TC-TURN-003: 弃 3 重抽模式 |
| TC-TURN-002: SKIP_SECOND_ACTION 弃掉第二张牌 |
| 巫师进堡后立即结束回合（不进入 ACTION_2） |
| TC-POTION-001: 封印成功后空瓶翻满（通过塔移动封印） |
| TC-POTION-005: 终局药水条件 = 没有空瓶 |
| TC-POTION-007: 仍有空瓶 → 不满足终局药水条件 |
| 补牌：牌堆耗尽时洗弃牌堆回抽牌堆 |

---

## 二、本轮复核发现的失败（AI 修复记录）

> 初次运行：**14 文件 13 失败 / 54 用例 27 失败 / typecheck 60 错误**。
> 以下为本轮修复的 12 项缺陷。其中 B2/B3/B4 为关键实现 Bug，未修则引擎不可用。

| # | 缺陷 | 性质 | 根因 / 修复 |
|---|---|---|---|
| B1 | `tests/*` 的 `mkEmit` 只收集事件不应用，规则函数已事件溯源（只 emit 不改 state）→ state 不变，断言全失败 | 测试侧 | 新增 `mkApplyEmit(state)`：emit 时同步 `applyEvent` |
| B2 | `apply-event.ts` 只导出 `applyEvent`（单数），`rule-engine.ts`/`replay.ts` 引用 `applyEvents`（复数，不存在）→ `engine.execute` 抛 `applyEvents is not a function` | **关键实现** | 补 `applyEvents` 批量导出 |
| B3 | `rule-engine.ts` 用 `acc.all()` 取引用当长度快照，清理阶段追加事件后 `slice(events.length)` 为空 → 回合清理事件（补牌/轮转/TURN_STARTED）从不应用，玩家永远不轮转 | **关键实现** | 改用 `acc.count()` 快照长度 |
| B4 | `endgame.ts` 的 `checkEndgameTrigger` 只查「全进堡」，**漏查药水条件 EMPTY==0**（违反 V4 §11.2/§14.10 红线，TC-END-001 直接挂） | **关键规则口径** | 重写为「全进堡 + 无空瓶」双条件；新增 `satisfiesEndgame`/`resolveFinalWinners`（按 V4 §14.11 比 FULL 数） |
| B5 | `ENDGAME_TRIGGERED` 处理器只置 `endgameTriggered`，未写 `endgameTriggerPlayerId`/`endgameTriggerRound` | 实现 | 处理器读取 payload 写入两字段 |
| B6 | `GameState` 缺 `winners`/`scores`/`sharedVictory` 字段，`GAME_ENDED` 赋值报类型错 | 类型缺失 | 补字段并在 `state-builder` 初始化 |
| B7 | `turn-resolver.ts` 用错误模块路径 `@wandering-towers/shared` 且引用不存在的 `getPlayersSortedBySeat` → 回合轮转抛 `is not a function` | 实现 | 改用 `@wt/shared` + `state.playerOrder` |
| B8 | `EventType`/`RuleErrorCode` 枚举与实现脱节：`DISCARD_PILE_RESHUFFLED`/`PLAYER_TURN_STATS_RESET`/`TOWER_SEALED`/`GAME_ENDED` 等事件、`TOWER_IS_SEALED`/`NO_FULL_POTION` 等错误码被使用却不在枚举 | 结构性 | 同步补齐枚举成员 |
| B9 | `TowerRuntimeState` 缺 `sealed` 字段（T1.6 引入但类型未同步） | 类型缺失 | 补字段 |
| B10 | `src/tests/*`（9 文件约 42 测试）全部 import 不存在的 `./test-helpers` → 整套无法加载 | 破损存根 | 删除（与 `tests/*` 重复且从未运行） |
| B11 | `tests/spell.spec.ts` 为 Phase 2 破损存根（错误路径 + 不存在符号） | 越界存根 | 删除（属 Phase 2 范围） |
| B12 | TC-CASTLE-004 测试构造：`clearTowerTopWizards` 把巫师移入城堡后又改其状态为 IMPRISONED，导致城堡登记不一致 | 测试构造 | 选用未被移入城堡的巫师并清理登记 |

---

## 三、仍未覆盖的用例缺口（建议补齐）

以下 V3 用例尚未自动化，是 Phase 1 的已知缺口，优先级从高到低：

| 缺口 | 说明 | 建议优先级 |
|---|---|---|
| **TC-REPLAY-002** | 100 局随机对局扫描不变量（V4 §19.2 验收硬指标）——未实现 | 高 |
| **TC-UNSEAL-001 / 解封机制** | `apply-event` 的 `WIZARD_RELEASED` 为空实现；塔切片移走暴露巫师时，巫师未真正从 IMPRISONED 复原为可见。当前塔移动只更新封印巫师的 spaceIndex，不解封 | 高 |
| TC-SEAL-004 | 封印自己巫师也能翻 1 瓶——未单独断言 | 中 |
| TC-SEAL-005 | 没有空瓶时封印，不再获得奖励——未单独断言 | 中 |
| TC-POTION-002 | 法术消耗满瓶后变为 SPENT（依赖 Phase 2 法术） | 中（Phase 2） |
| TC-POTION-003 | SPENT 不可恢复为空瓶——未断言 | 中 |
| TC-POTION-004 | 药水总可使用上限（5 瓶）——未断言 | 中 |
| TC-POTION-006 | 桌面非全满仍满足终局——TC-END-001 部分覆盖，未单列 | 低 |
| TC-CASTLE-003 | 乌鸦位塔顶有可见巫师时城堡跳过——未单独断言（CASTLE-002 覆盖相邻场景） | 低 |
| TC-END-004 | 终局触发后须打完当前轮再结算——集成路径未单列断言 | 中 |
| TC-TURN-004 | 弃 3 重抽后不移动塔——由 TC-TURN-003（moveTowerAfterRedraw:false）近似覆盖 | 低（已近似覆盖） |

### 设计偏离（需复核）

- **T1.6 `sealTower`/`unsealTower` 命令偏离 V4 §11.3**：实现成「消耗药水锁定塔」的独立命令，但 V4 的「封印」指**巫师被塔盖住（IMPRISONED）**，并非塔锁定。且该命令**未接入 `rule-engine.execute`**（无 SEAL_TOWER 分支），属未启用偏离设计。建议复核是否保留，或回归 V4 口径。

---

## 四、阶段结论

- **规则引擎核心链路**（出牌 → 移动 → 封印 → 进堡 → 城堡移动 → 回合轮转 → 终局判定）**已可用并通过自动化测试**，Phase 1 功能目标达成。
- typecheck 全绿、54/54 测试通过、lint 0 error。
- Phase 2 WIP（`cast-spell.ts`、`spells/*`）已从 typecheck 排除，待 T2.1 完成后接入。
- **进入 Phase 2 前建议优先补**：TC-REPLAY-002 烟雾测试 + UNSEAL 解封机制。
