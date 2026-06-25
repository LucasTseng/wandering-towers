# Phase 0 开发日志：工程骨架

> 任务清单：[../00-开发任务总表.md#phase-0建立工程骨架](../00-开发任务总表.md)
> 状态：✅ 已完成（2026-06-25）

## 概览
建立 Monorepo、静态定义层、运行时状态层、命令/事件骨架、引擎入口、测试框架。

## 验证结果（一次性自检）
- `pnpm install` 成功（227 包）
- `pnpm -r typecheck` —— shared/engine/server/client 全部 Done
- `pnpm test` —— 13/13 通过（init + 不变量）
- `pnpm lint` —— 0 error（13 warning，均为 `import()` 类型注解风格，非阻塞）
- `pnpm dev` —— Vite 启动，http://localhost:5173 返回 HTTP 200

## 任务进度
| 任务 | 状态 | 关键产出 |
|---|---|---|
| T0.1 工具链 | ✅ | pnpm workspaces / TS strict / ESLint+Prettier / Vitest / Dockerfile |
| T0.2 静态定义层 | ✅ | 13 枚举 + 全类型 + 标准地图 + 7 法术 + 90 牌 + 资源配置 |
| T0.3 运行时状态层 | ✅ | buildInitialState + selectors + 可种子 Rng |
| T0.4 命令/事件骨架 | ✅ | ActionCommand + GameEvent + applyEvent(全类型分支) + replay |
| T0.5 引擎入口 | ✅ | RuleEngine + EventAccumulator + RuleError + 结算管线 |
| T0.6 测试/不变量 | ✅ | Vitest + invariants(5 类) + init.spec(13 测试) |

---

### T0.1 初始化 Monorepo 与工具链　[已完成]
- 日期：2026-06-25
- 对应任务：T0.1
- 参考文档：V4 §17；架构文档 §2
- 目标：pnpm workspaces + TS strict + ESLint/Prettier + Vitest，Mac/Windows 均可 install/typecheck/test/dev。
- 产出物：
  - 根 `package.json` / `pnpm-workspace.yaml` / `tsconfig.base.json`
  - `.gitignore` / `.editorconfig` / `.gitattributes`(lf) / `.nvmrc`(20)
  - `.eslintrc.cjs` / `.prettierrc` / `.prettierignore`
  - `vitest.config.ts`（根）+ `packages/engine/vitest.config.ts`
  - 4 个 package 各自 `package.json` + `tsconfig.json`
  - `Dockerfile` + `docker-compose.yml`（可选部署，架构文档 §5）
- 关键决策/规则口径裁定：
  - 用 corepack 激活 pnpm@9.15.0；Node 24 环境可用（目标 Node 20+）。
  - TS 开 `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes + verbatimModuleSyntax`，强制类型严谨。
  - 跨平台：脚本用 `cross-env`，路径用 `node:path`，文件名 kebab-case，`.gitattributes` 强制 lf。
  - 舍弃 TS project references/composite，改用 paths 别名直指源码 `../shared/src`，避免 `tsc` 增量构建在 dev/test 下的复杂度（决策记录见架构文档 §8）。
- 自检：
  - [x] `pnpm install` 成功
  - [x] `pnpm -r typecheck` 全部 Done
  - [x] `pnpm test` 13/13 通过
  - [x] `pnpm dev` Vite 启动 HTTP 200
- 遗留：Husky pre-commit 暂未装（本地无 git 仓库，待 Phase 1 起 git init 时补）。

### T0.2 建立静态定义层　[已完成]
- 日期：2026-06-25
- 对应任务：T0.2
- 参考文档：V3 数据字典 §3-13；V4 §13；V2 开发需求 §4-13；V2 规则 §2.3/§5
- 产出物（`packages/shared/src`）：
  - `enums/`：GameMode、TurnPhase、WizardStateType、PotionState、MovementCardType、ActionSource、SpellEffectType、SpellTargetRule、SpellTimingRule、SpellUsageScope、SpellSelectionMode、CastTimingMode、CommandType、EventType、RuleErrorCode（共 15 个）
  - `types/`：ids、wizard、tower、board、potion、raven-castle、player、movement-card、spell-definition、game-config、action-command、game-event、game-state
  - `map-definitions/standard.ts`：16 空间 + 乌鸦纹章位 + setupCapacity(3/3/3/2/2/2/1/1/1 火苗数据化) + 9 塔(首塔带纹章) + 城堡初始位
  - `spell-definitions/standard-pool.ts`：V4 §13.6 的 7 张法术（含 tags）
  - `movement-card-definitions/standard-deck.ts`：17 模板 + 张数表(合计 90) + `assertDeckTotal()`
  - `constants/player-resources.ts`：2–6 人配置表 + 容量常量
- 关键决策：
  - setupCapacity 以数据写入 MapDefinition，引擎不写死 3/2/1（V4 §11.1 红线）。
  - 法术定义字段用 V4 命名（spell_id / cost_full_potions / effect_type / target_rule / timing_rule / usage_scope / tags / params），不改建模方式。
  - 牌定义+实例双层（V3 §12.3），洗牌只操作实例 ID。
- 自检：
  - [x] 不变量单测：9 塔不重不漏、容量合计正确（经 init.spec 间接验证）
  - [x] `assertDeckTotal()` 校验 90 张

### T0.3 建立运行时状态层　[已完成]
- 日期：2026-06-25
- 对应任务：T0.3
- 参考文档：V4 §14.2；V2 开发需求 §5-14；V3 数据字典 §6-14
- 产出物（`packages/engine/src/state`）：
  - `rng.ts`：mulberry32 可种子 PRNG + `rollDie`，回放可复现
  - `selectors.ts`：塔堆/顶塔/可见巫师/封印归属/药水统计/城堡位置/顺时针步进/乌鸦纹章判定 等 12 个查询函数
  - `state-builder.ts`：`buildInitialState(config, seed)` 完整构造 GameState（建棋盘→玩家→塔→巫师→药水→洗牌发牌→法术池→城堡→摆塔→开局摆巫师）
- 关键决策/规则口径裁定：
  - **开局摆巫师口径**（登记裁定 R-001）：玩家按座位顺序轮流，每次放 1 名到塔顶(ON_TOWER_TOP)；按 setupCapacity 槽位顺序消费，先放满当前塔位再进下一座。容量槽总数须 ≥ 巫师总数，否则抛 map 配置错误。（出处：V2 规则 §5 / V4 §11.1）
  - 法术池：BASIC=2 张默认；CUSTOM FIXED=校验后的 selectedSpellIds；RANDOM=从 mode 允许池随机抽 N。
  - 巫师运行时维护显式封印归属（insideTowerId），不靠前端猜测（V4 §14.6 实现建议）。
- 自检：
  - [x] 通过 TC-INIT-001~006、009（见 init.spec）

### T0.4 命令与事件流骨架　[已完成]
- 日期：2026-06-25
- 对应任务：T0.4
- 参考文档：V3 数据字典 §15-21；V3 后端协议 §7-14
- 产出物：
  - `ActionCommand` + 6 类 payload（PLAY_CARD/DISCARD_REDRAW/CAST_SPELL/SKIP_SECOND_ACTION/END_TURN/CHOOSE_DICE_RESULT）
  - `GameEvent` + 21 事件类型 + 各 payload 接口
  - `apply-event.ts`：`applyEvent` 对 21 种事件全部分支（结构性的已实现语义，移动/封印类留 Phase 1 填）
  - `replay/replay.ts`：`replay({config, seed, events})` 回放入口 + `replayEmpty`
- 自检：
  - [x] applyEvent 穷尽性：未处理类型抛错而非静默
  - [x] replay 空事件流可跑（经 init.spec 间接）

### T0.5 规则引擎入口与结算管线骨架　[已完成]
- 日期：2026-06-25
- 对应任务：T0.5
- 参考文档：V3 后端协议 §20-21；V4 §3
- 产出物：
  - `rule-error.ts`：`RuleError` + `isRuleError`
  - `event-bus.ts`：`EventAccumulator`（统一分配 sequence/eventId）
  - `rule-engine.ts`：`RuleEngine` 类 + `execute(command)` 结算管线骨架 + `createEngine` 工厂
- 关键决策：
  - 引擎返回 `{success, events, endTurn, endgameTriggered, stateVersion}`，不直接返回大对象（V3 §21）。
  - Phase 0 各命令 throw INVALID_PHASE 占位，Phase 1/2 实装。
- 自检：
  - [x] GAME_FINISHED 后执行命令抛 GAME_ALREADY_FINISHED

### T0.6 测试框架与不变量检查器　[已完成]
- 日期：2026-06-25
- 对应任务：T0.6
- 参考文档：V3 数据字典 §23；V3 测试用例 INIT 集
- 产出物：
  - `invariants.ts`：`checkInvariants`（5 类：塔计数/塔唯一/封印登记一致/药水总数/城堡巫师一致）+ `assertInvariants`
  - `tests/fixtures.ts`：`basicConfig` / `customConfig` 工厂
  - `tests/init.spec.ts`：13 测试，覆盖 TC-INIT-001~006、008、009 + 牌堆总数 + 不变量 + 回放可复现 + 初始 phase
- 自检：
  - [x] 13/13 通过
  - [x] 初始状态不变量检查 0 违反

## 遗留问题 / 下一步
- Husky pre-commit 待 git init 后补。
- applyEvent 中 TOWER_SLICE_MOVED / DISCARD_RESHUFFLED_TO_DRAW 等留 Phase 1 填语义。
- **进入 Phase 1**：T1.1 initGame（已基本完成，需补回合事件）→ T1.2 回合轮转 → T1.3 playMovementCard …
