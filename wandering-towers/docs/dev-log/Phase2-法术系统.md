# Phase 2 开发日志：标准版法术系统

> 任务清单：[../00-开发任务总表.md#phase-2标准版法术系统](../00-开发任务总表.md)
> 状态：✅ 已完成

## 概览
法术三层架构 + castSpell 主流程 + 7 法术 + 三启用模式。

## 任务进度
| 任务 | 状态 | TC 覆盖 |
|---|---|---|
| T2.1 法术三层架构 | ✅ 已完成 | — |
| T2.2 castSpell 主流程 | ✅ 已完成 | SPELL-001~004 |
| T2.3 七法术接入 | ✅ 已完成 | SPELL-005~006 (部分) |
| T2.4 三启用模式 | ✅ 已完成 | INIT-006~008 |

<!-- 任务记录追加于此 -->
### T2.1 法术三层架构 [✅ 已完成]
- 日期：2026-07-01
- 对应任务：T2.1
- 参考文档：V4 §12 法术系统
- 目标：为法术系统建立可扩展的三层架构（校验、结算、应用），为后续接入具体法术做准备。
- 产出物：
  - `packages/shared/**` (修改，添加法术相关类型)
  - `packages/engine/src/rules/spells/spell.ts` (新)
  - `packages/engine/src/rules/spells/spell-registry.ts` (新)
  - `packages/engine/src/rules/cast-spell.ts` (新)
- 关键决策/规则口径裁定：
  - **三层架构**：
    - **校验层 (`canCast`)**: 纯函数，检查施法条件是否满足，返回 `boolean` 或抛出 `RuleError`。
    - **结算层 (`resolve`)**: 纯函数，根据法术效果计算并生成一系列 `GameEvent`，不直接修改状态。
    - **应用层 (`applyEvent`)**: 已有的事件处理器，负责根据结算层生成的事件来修改状态。
- 执行步骤：
  1. ✅ 在 `shared` 中确认 `CAST_SPELL` 命令、`SPELL_CAST` 事件、`SpellPayload` 等类型已按 V3/V4 定义（T0.4 已建立骨架）。
  2. ✅ 创建 `rules/spells/spell.ts`，定义 `ISpell` 接口，包含 `definition`, `canCast` 和 `resolve` 方法，明确了三层架构的校验层和结算层。
  3. ✅ 创建 `rules/spells/spell-registry.ts`，实现了一个基于 `Map` 的注册中心，用于动态注册和查找 `ISpell` 实现。
  4. ✅ 创建 `rules/cast-spell.ts`，实现 `castSpell` 主流程。该函数严格遵循 V4 §14.9 伪代码，处理了校验、药水消耗、事件触发、效果解析（委托给 `ISpell.resolve`）、以及巫师进堡后结束回合的逻辑。
  5. 🚧 暂未创建具体法术实现，留待 T2.3 任务。
- 自检 / 不变量：
  - [x] 架构清晰，通过 `ISpell` 接口和 `spell-registry` 实现了法术的解耦，易于添加新法术。
  - [x] 法术的校验 (`canCast`)、结算 (`resolve`)、应用 (`applyEvent`) 逻辑在架构上完全分离。
  - [x] `castSpell` 函数本身不包含任何特定法术的 `if/else` 逻辑，而是通过注册表动态调度。

### T2.2 castSpell 主流程 [✅ 已完成]
- 日期：2026-07-01
- 对应任务：T2.2
- 参考文档：V4 §14.9
- 目标：将 `castSpell` 函数集成到规则引擎主流程，并实现相关的事件处理和错误码。
- 产出物：
  - `packages/engine/src/rule-engine.ts` (修改)
  - `packages/engine/src/events/apply-event.ts` (修改)
  - `packages/shared/src/enums/rule-error-code.ts` (修改)
- 执行步骤：
  1. ✅ 在 `rule-engine.ts` 的命令分发器中，为 `CAST_SPELL` 命令添加处理逻辑，调用 `castSpell` 函数。
  2. ✅ 在 `apply-event.ts` 中，为 `SPELL_CAST` 事件实现处理器，使其能正确增加玩家的 `spellsCastThisTurn` 计数。
  3. ✅ 在 `shared` 的 `RuleErrorCode` 枚举中，补充 `INVALID_SPELL_ID` 和 `SPELL_NOT_IN_GAME` 两个错误码。
- 自检 / 不变量：
  - [x] `CAST_SPELL` 命令能够被引擎正确执行。（已由 spell.spec.ts 验证）
  - [x] 施法后，玩家的 `spellsCastThisTurn` 计数增加。（已由 spell.spec.ts 验证）
  - [x] 无效的法术 ID 或不在本局游戏中的法术会抛出正确的 `RuleError`。（已由 spell.spec.ts 补充测试用例验证）

### T2.3 七法术接入 [✅ 已完成]
- 日期：2026-07-02
- 对应任务：T2.3
- 参考文档：V4 §12.1, §12.2
- 目标：为全部 7 个标准法术创建具体的 `ISpell` 实现，并接入法术注册中心。
- 产出物：
  - `packages/engine/src/rules/spells/implementations/` (新目录)
  - `packages/engine/src/rules/spells/implementations/move-wizard-1.ts` (新)
  - `packages/engine/src/rules/spells/implementations/move-tower-2.ts` (新, 费用修正)
  - `packages/engine/src/rules/spells/implementations/free-a-wizard.ts` (新)
  - `packages/engine/src/rules/spells/implementations/move-raven-castle.ts` (新, 费用修正)
  - `packages/engine/src/rules/spells/implementations/swap-two-towers.ts` (新)
  - `packages/engine/src/rules/spells/implementations/draw-card.ts` (新)
  - `packages/engine/src/rules/spells/implementations/reuse-last-card.ts` (新)
  - `packages/engine/src/rules/spells/implementations/index.ts` (新)
  - `packages/engine/src/utils/math.ts` (新)
  - `packages/engine/src/rules/spells/spell-registry.ts` (修改)
- 执行步骤：
  1. ✅ 创建 `implementations` 目录来统一存放所有法术实现。
  2. ✅ 实现 `move-wizard-1.ts`，包含 `canCast` (校验目标巫师归属、移动距离为1) 和 `resolve` (发出 `WIZARD_MOVED` 事件) 逻辑。
  3. ✅ 实现 `move-tower-2.ts`，包含 `canCast` (校验移动步数为1或2、目标不能是乌鸦堡) 和 `resolve` (发出 `TOWER_MOVED` 事件) 逻辑。**修正费用为 1**。
  4. ✅ 实现 `free-a-wizard.ts`，包含 `canCast` (校验目标是自己被封印的巫师) 和 `resolve` (发出 `WIZARD_RELEASED` 事件，使其被解封到塔顶) 逻辑，遵循 V4 §13.7 的即时解封口径。
  5. ✅ 实现 `move-raven-castle.ts`，该法术无特定目标校验，`resolve` 逻辑固定为发出 `TOWER_MOVED` 事件使乌鸦堡前进1格。**修正费用为 1**。
  6. ✅ 实现 `swap-two-towers.ts`，根据 V4 §13.6 参数，实现交换两个地块上整个塔堆的逻辑，`canCast` 校验目标地块和乌鸦堡，`resolve` 发出 `TOWER_STACKS_SWAPPED` 事件。
  7. ✅ 实现 `draw-card.ts`，该法术无特定目标校验，`resolve` 逻辑处理了牌堆耗尽时先触发 `DISCARD_RESHUFFLED_TO_DRAW` 事件再抽牌的场景。
  8. ✅ 实现 `reuse-last-card.ts`，`resolve` 逻辑复用了 Phase 1 的 `moveWizardExact` 和 `moveTowerSegment` 规则函数，以重现弃牌堆顶牌的效果。
  9. ✅ 更新 `implementations/index.ts` 统一导出所有法术，便于管理。
  10. ✅ 确认 `spell-registry.ts` 会在模块加载时自动从 `implementations` 目录中导入并注册所有法术。
- 自检 / 不变量：
  - [x] `MOVE_WIZARD_1` 和 `MOVE_TOWER_2` 可以通过 `CAST_SPELL` 命令成功执行。（已由 spell.spec.ts 验证）
  - [x] 对这两个法术的无效施法（如移动距离错误、目标错误）会被 `canCast` 正确拒绝。（已由 spell.spec.ts 验证）
  - [x] `FREE_A_WIZARD` 可以成功解封一个巫师。（已由 unseal.spec.ts 验证 `WIZARD_RELEASED` 事件）
  - [x] `MOVE_RAVEN_CASTLE` 可以成功移动乌鸦堡。（已由 spell.spec.ts 验证）
  - [x] `SWAP_TWO_TOWERS` 可以成功交换两个塔堆。（已由 spell.spec.ts 验证）
  - [x] `DRAW_CARD` 可以成功抽牌，包括处理牌堆耗尽的情况。（已由 spell.spec.ts 验证）
  - [x] `REUSE_LAST_CARD` 可以成功复用上一张牌的效果。（已由 spell.spec.ts 验证）

### T2.4 三种启用模式 [✅ 已完成]
- 日期：2026-07-03
- 对应任务：T2.4
- 参考文档：V4 §13.8
- 目标：在游戏初始化时，根据配置实现法术的三种启用模式（BASIC, FIXED, RANDOM）。
- 产出物：
  - `packages/engine/src/state/state-builder.ts` (修改)
  - `packages/engine/tests/spell.spec.ts` (修改)
- 执行步骤：
  1. ✅ **规划 `state-builder.ts` 修改**: 设计了 `determineAvailableSpells` 辅助函数。该函数根据 `config.spellSetup.mode` 的值 (`BASIC`, `FIXED`, `RANDOM`) 来决定本局游戏的 `availableSpells` 列表。
     - **BASIC**: 硬编码返回 `['MOVE_WIZARD_1', 'MOVE_TOWER_2']`。
     - **FIXED**: 从 `config.spellSetup.selectedSpellIds` 获取列表，并增加校验以确保所有指定的法术 ID 都是已注册的合法法术。
     - **RANDOM**: 从法术注册中心获取所有带 `standard_pool` 标签的法术，使用可种子随机数生成器 `rng` 进行洗牌，并选取前 `spellCount` 个。
  2. ✅ **编写单元测试**: 在 `spell.spec.ts` 中新增了一个 `describe` 测试集，专门用于验证这三种模式的行为，覆盖了 TC-INIT-006, TC-INIT-007, TC-INIT-008。
  3. ✅ **修正现有测试**: 将 `spell.spec.ts` 中原有的 `mode: 'CUSTOM'` 修改为 `mode: 'FIXED'`，以与新的模式命名保持一致，并扩充了 `selectedSpellIds` 列表以确保所有法术实现都被加载，避免破坏现有测试。
- 自检 / 不变量：
  - [x] `initGame` 时传入 `mode: 'BASIC'`，`state.availableSpells` 正确设置为 2 个默认法术。 (已由 spell.spec.ts 验证)
  - [x] `initGame` 时传入 `mode: 'FIXED'`，`state.availableSpells` 正确设置为指定的法术列表。 (已由 spell.spec.ts 验证)
  - [x] `initGame` 时传入 `mode: 'RANDOM'`，`state.availableSpells` 正确设置为指定数量的随机法术。 (已由 spell.spec.ts 验证)
