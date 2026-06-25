
《巫师飞塔》标准版开发总控文档（V4）

版本：V4
定位：本文件是《巫师飞塔》标准版项目的开发总控文档。
用途：配合此前已交付的 V1 / V2 / V3 附件，一起作为 AI agent 的开发输入，指导其从 0 到 1 完成《巫师飞塔》标准版的可玩项目开发。
重要原则：本文件不是孤立规则书，而是开发执行手册 + 文档导航 + 缺失规则补完。

⸻

0. 文档使用说明

0.1 本文档的职责

本文件负责 4 件事：

1. 定义本项目的开发边界
    * 只做《巫师飞塔》标准版 / 基础游戏
    * 不实现扩展包地图、扩展包新组件、扩展包专属规则
    * 但底层代码结构应为后续扩展预留
2. 定义 AI agent 的开发步骤
    * 先做什么
    * 后做什么
    * 每一步要达到什么完成标准
3. 把之前附件的使用关系串起来
    * 某一模块开发时，应该优先参考哪份附件的哪一部分
4. 补足之前最缺的两块工程信息
    * 标准版法术定义总表
    * 规则引擎核心伪代码

⸻

0.2 本文档与此前附件的关系

本项目此前已经形成的核心文档包括：

A. 规则与需求类

1. 《巫师飞塔》完整规则与说明文档（V2）
2. 《巫师飞塔》完整开发需求文档（V2）

B. 工程配套类

3. 《巫师飞塔》规则测试用例全集（V3）
4. 《巫师飞塔》数据字典与 JSON Schema（V3）
5. 《巫师飞塔》后端接口协议草案（V3）

C. 当前文档

6. 《巫师飞塔》标准版开发总控文档（V4） —— 即本文

⸻

0.3 AI agent 的使用原则

AI agent 在开发过程中，必须遵循以下优先级：

优先级 1：V4 总控文档

本文档用于：

* 明确开发范围
* 明确开发顺序
* 明确引用哪个附件
* 明确法术表与核心伪代码

优先级 2：V2 完整规则与说明文档

当遇到“这个规则到底是什么”的问题时，优先查 V2 规则文档。

优先级 3：V2 开发需求文档

当遇到“这个系统应该怎么建模、怎么拆模块”的问题时，优先查 V2 开发需求文档。

优先级 4：V3 测试 / 数据字典 / 接口文档

当进入编码和联调时：

* 数据结构 → 看数据字典
* 接口 → 看后端协议
* 单元测试 / 验收 → 看测试用例全集

⸻

1. 项目开发目标与边界

1.1 项目目标

开发一个《巫师飞塔》**标准版（基础游戏）**的数字化可玩版本，至少支持：

1. 2–6 人对局
2. 完整基础规则
3. 完整标准版法术系统（以标准版法术为准，不含扩展包新增法术）
4. 本地单机 / 本地托管模式
5. 规则引擎、前端棋盘、基础回放能力
6. 为后续联机与扩展包预留数据结构

⸻

1.2 本次开发范围（必须实现）

1.2.1 基础规则必须实现

必须实现以下基础规则模块：

1. 地图与空间系统
2. 塔堆系统
3. 巫师状态系统
4. 乌鸦城堡系统
5. 移动牌系统
6. 弃 3 重抽系统
7. 封印 / 解封系统
8. 魔法药水系统
9. 标准版法术系统
10. 终局判定与同轮结算
11. 基础回放 / 事件流记录

⸻

1.2.2 前端最小可玩能力必须实现

至少实现：

1. 棋盘渲染
2. 巫师 / 塔 / 城堡 / 药水展示
3. 手牌展示与出牌
4. 巫师移动目标选择
5. 塔切片选择与塔移动
6. 法术施放入口
7. 当前玩家 / 当前行动提示
8. 非法操作提示
9. 胜负结算展示

⸻

1.2.3 本次不实现的内容

以下内容不在本轮范围内：

1. 扩展包地图与扩展包规则
2. 扩展包组件（如蜘蛛网、女巫、额外地块等）
3. 扩展包专属法术
4. 排位 / 匹配 / 账号系统
5. 复杂社交功能
6. 高级动画与美术精修
7. AI 对手强策略

⸻

1.3 架构要求：必须“只做标准版功能，但保留扩展能力”

虽然本轮只做标准版，但底层必须为后续扩展预留：

1. 法术不可写死成 if-else 两张卡
    * 必须做成“法术定义 + 施法执行器”的结构
2. 地图不可写死为一套固定格子逻辑
    * 地图定义、乌鸦位、起始火苗容量应数据化
3. 规则引擎必须支持事件流
    * 方便回放、联机、调试
4. 塔、巫师、药水、城堡必须使用显式状态模型
    * 禁止把关键状态只藏在前端 UI 层

⸻

2. AI agent 的开发执行顺序（强制）

本项目建议按 Phase 0 ~ Phase 6 开发。
AI agent 必须按阶段推进，不允许一上来把所有前后端混在一起乱写。

⸻

3. Phase 0：建立工程骨架

3.1 目标

完成项目目录、核心数据结构、规则引擎骨架与事件总线骨架。

3.2 必须产出

1. 项目目录结构
2. 核心实体与枚举
3. GameState / GameConfig / ActionCommand / GameEvent
4. 规则引擎入口
5. 存档 / 回放数据结构
6. 测试框架

3.3 本阶段必须参考的文档

主要参考

* V3《数据字典与 JSON Schema》
* V2《完整开发需求文档》中的数据建模部分

同时参考

* V3《后端接口协议草案》：决定 command / event 结构
* V3《测试用例全集》：提前设计好测试骨架

⸻

4. Phase 1：实现“无 UI 的纯规则引擎 MVP”

4.1 目标

在没有前端的情况下，让规则引擎可以通过测试或脚本跑完一局基础游戏。

4.2 必须实现的规则能力

1. 初始化
2. 回合轮转
3. 出牌
4. 巫师移动
5. 塔切片移动
6. 封印 / 解封
7. 乌鸦城堡移动
8. 药水翻满 / 消耗
9. 终局判定

4.3 本阶段禁止事项

禁止 1：不要先做 UI 再补规则

规则引擎必须先能通过测试。

禁止 2：不要把“塔上压着谁”只存在前端

封印 / 解封必须是后端状态的一部分。

⸻

5. Phase 2：实现标准版法术系统

5.1 目标

在 Phase 1 基础上接入完整标准版法术系统，并让法术与基础行动共用统一结算逻辑。

5.2 核心原则

原则 1：法术不能另起一套“伪规则”

法术如果本质上是“移动巫师 1 格”“移动塔 2 格”，应直接复用基础移动逻辑。

原则 2：法术时机必须纳入统一回合状态机

基础模式下：

* 当前玩家在自己回合中施法
* 每回合施法次数有限
* 施法可发生在行动前 / 行动中 / 行动后（具体以法术规则和 FAQ 为准）

原则 3：药水消耗必须走统一资源系统

施法不是“免费附加动作”，必须消耗药水资源。

⸻

6. Phase 3：实现前端可玩 MVP

6.1 目标

完成本地可玩版本。

6.2 最小前端要求

1. 棋盘可视化
2. 牌与法术可点击
3. 目标选择交互
4. 行动日志
5. 胜利结算页

⸻

7. Phase 4：接入回放与调试面板

7.1 目标

让开发与排错成本可控。

7.2 至少实现

1. 保存事件流
2. 从初始状态 + 事件流回放
3. 开发模式下显示：
    * 当前 phase
    * 当前玩家
    * 所有巫师状态
    * 塔内封印巫师
    * 药水状态
    * 城堡位置

⸻

8. Phase 5：补完联机协议层（可选）

如果本轮要继续做联机，则按 V3 后端接口协议推进。
如果本轮只做本地可玩版，这一阶段可以延后。

⸻

9. 各阶段的“文档引用地图”

9.1 规则判定时优先看哪里？

一般规则问题

优先看：

1. V2《完整规则与说明文档》
2. 本文档第 13～14 章（法术总表、伪代码）

工程结构问题

优先看：

1. V2《完整开发需求文档》
2. V3《数据字典与 JSON Schema》

测试设计问题

优先看：

* V3《规则测试用例全集》

接口设计问题

优先看：

* V3《后端接口协议草案》

⸻

10. 核心开发约束（必须遵守）

10.1 必须采用“服务端/规则引擎权威状态”

即使是本地单机，也必须把规则状态放在统一引擎层，而不是由 UI 自己决定结果。

⸻

10.2 必须采用显式状态机

至少包括：

巫师状态

* ON_GROUND
* ON_TOWER_TOP
* IMPRISONED
* IN_CASTLE

药水状态

* EMPTY
* FULL
* SPENT

回合阶段

* TURN_START
* ACTION_1
* ACTION_2
* TURN_END
* GAME_END_PENDING
* GAME_FINISHED

⸻

10.3 必须保留事件流

所有关键动作必须落为事件，例如：

* CARD_PLAYED
* WIZARD_MOVED
* TOWER_SLICE_MOVED
* WIZARD_IMPRISONED
* WIZARD_RELEASED
* POTION_FILLED
* POTION_SPENT
* SPELL_CAST
* RAVEN_CASTLE_MOVED
* ENDGAME_TRIGGERED

⸻

11. 关键规则口径（总复核版）

本章只列最重要、最容易出错的口径，详细规则仍以 V2 文档为主。

⸻

11.1 开局巫师摆放

* 开局时，玩家按顺位轮流放置巫师。
* 每个可放置区域的容量，依据地图上对应区域的小火苗数量。
* 实现时不得把初始容量写死为“前 3 区 3 个、中 3 区 2 个、后 3 区 1 个”这种未经地图抽象的逻辑。
* 应在 MapDefinition / SpaceDefinition 中通过 setupCapacity 数据化。

⸻

11.2 终局药水条件

终局不是“所有药水当前都显示为满瓶”，而是：

终局条件中的药水要求 = 玩家已经没有空瓶

也就是：

* 所有药水要么是 FULL
* 要么已经因施法被消耗为 SPENT

换言之，终局判定看的是：

EMPTY == 0

而不是：

FULL == 初始总数

这一点来自官方 FAQ 的口径：你要把自己的药水都翻到满面，或者把它们用于施法弃掉，最终总之不能再有未填满的空瓶。 

⸻

11.3 封印 / 解封术语

项目统一使用：

* 封印 = 巫师被塔盖住、进入被压住状态
* 解封 = 因移塔或法术而重新变为可见

不再使用“囚禁 / 释放”作为系统内部术语。

⸻

11.4 基础游戏的法术口径

基础游戏不是“只有 2 张法术存在于世界上”，而是：

1. 新手入门推荐只使用指定的 2 张法术
2. 但标准版法术系统本身应允许启用更多标准法术
3. 基础游戏下默认每回合施法上限通常为 1 次
4. 法术可在允许的窗口中于行动前 / 中 / 后使用，具体取决于该法术及 FAQ 口径 

因此，代码层必须支持：

* 固定法术列表模式
* 随机 N 张法术模式
* 未来扩展更多法术模式

⸻

11.5 进入乌鸦城堡的关键口径

1. 必须刚好走到城堡，不能浪费步数停进去。
2. 如果还有剩余步数，则必须越过城堡继续前进。
3. 一名巫师进入城堡后：
    * 该巫师永久留在城堡中
    * 立刻触发乌鸦城堡移动
    * 当前玩家本次回合立即结束，不能再继续后续行动 

⸻

12. 标准版法术系统：开发要求

12.1 法术系统必须分为 3 层

第一层：法术定义层 SpellDefinition

静态配置：

* 法术 ID
* 名称
* 费用
* 目标规则
* 结算时机
* 效果类型
* 参数

第二层：法术校验层 SpellValidator

校验：

* 当前模式是否允许
* 当前时机是否允许
* 当前玩家药水是否足够
* 目标是否符合该法术规则

第三层：法术执行层 SpellResolver

负责：

* 扣药水
* 生成事件
* 调用通用规则函数

⸻

13. 标准版法术定义总表（开发版）

13.1 说明

本章的目标不是还原纸质说明书的排版，而是提供程序可直接消费的标准法术定义结构。
如果后续你拿到更完整的中文版/德文版法术原文，可以继续把中文文案替换掉，但数据结构与 effect 分类应保持不变。

重要说明：
此前我们已经确认，标准版中法术并不应只建成“2 张 demo 法术”。本章给出的，是标准版项目应该采用的法术系统数据化结构。
其中：

* core_basic_default：表示新手基础局默认启用的法术
* standard_pool：表示标准版法术池中可被启用的法术
* master_only / reaction_capable：表示仅在更高模式或变体下启用的能力标签

若你后续对某一张法术的中英文名、费用、细节说明有来自纸质规则/官方补充的更高优先级资料，应以官方资料更新本表的文案字段；但effect_type / target_rule / timing_rule / params 的建模方式保持不变。

⸻

13.2 法术字段规范

每张法术至少包含以下字段：

字段	含义
spell_id	法术唯一 ID
zh_name	中文名称
en_name	英文名称
cost_full_potions	施法需要消耗的满瓶数
effect_type	效果类型
target_rule	目标规则
timing_rule	时机规则
usage_scope	可用于 BASIC / CUSTOM / MASTER 的范围
tags	附加标签
params	结算参数

⸻

13.3 effect_type 枚举建议

MOVE_WIZARD
MOVE_TOWER
FREE_WIZARD
MOVE_RAVEN_CASTLE
SWAP_TOWERS
DRAW_CARD
REUSE_CARD
CUSTOM

⸻

13.4 target_rule 枚举建议

OWN_VISIBLE_WIZARD
ANY_VISIBLE_WIZARD
OWN_OR_ANY_VISIBLE_WIZARD
ANY_TOWER_SEGMENT
ANY_TOWER_TOP
NO_TARGET
RAVEN_CASTLE
CUSTOM

⸻

13.5 timing_rule 枚举建议

ACTIVE_PLAYER_TURN_WINDOW
BEFORE_DURING_AFTER_ACTION
REACTION_WINDOW_ONLY
CUSTOM

⸻

13.6 标准版法术定义表（开发口径）

注：下表中的“标准版法术池”是为开发落地而整理的结构化版本。
若项目后续要做“严格按某一纸质印刷批次”的法术内容校对，应在此表基础上替换文案与个别参数，不改建模方式。

Spell-01

字段	值
spell_id	MOVE_WIZARD_1
zh_name	移动一名巫师
en_name	Move a Wizard
cost_full_potions	1
effect_type	MOVE_WIZARD
target_rule	OWN_VISIBLE_WIZARD
timing_rule	BEFORE_DURING_AFTER_ACTION
usage_scope	BASIC,CUSTOM,MASTER
tags	core_basic_default,standard_pool
params	{ "steps": 1 }

Spell-02

字段	值
spell_id	MOVE_TOWER_2
zh_name	移动一座塔
en_name	Move a Tower
cost_full_potions	1
effect_type	MOVE_TOWER
target_rule	ANY_TOWER_SEGMENT
timing_rule	BEFORE_DURING_AFTER_ACTION
usage_scope	BASIC,CUSTOM,MASTER
tags	core_basic_default,standard_pool
params	{ "steps": 2 }

Spell-03

字段	值
spell_id	FREE_A_WIZARD
zh_name	解封一名巫师
en_name	Free a Wizard
cost_full_potions	1
effect_type	FREE_WIZARD
target_rule	CUSTOM
timing_rule	BEFORE_DURING_AFTER_ACTION
usage_scope	CUSTOM,MASTER
tags	standard_pool
params	{ "allowLookUnderTower": true, "placeOnTopAfterFree": true }

Spell-04

字段	值
spell_id	MOVE_RAVEN_CASTLE
zh_name	移动乌鸦城堡
en_name	Move the Raven Castle
cost_full_potions	1
effect_type	MOVE_RAVEN_CASTLE
target_rule	RAVEN_CASTLE
timing_rule	BEFORE_DURING_AFTER_ACTION
usage_scope	CUSTOM,MASTER
tags	standard_pool,reposition
params	{ "steps": 1, "followRavenShieldRule": true }

Spell-05

字段	值
spell_id	SWAP_TWO_TOWERS
zh_name	交换两座塔
en_name	Swap Towers
cost_full_potions	1
effect_type	SWAP_TOWERS
target_rule	CUSTOM
timing_rule	BEFORE_DURING_AFTER_ACTION
usage_scope	CUSTOM,MASTER
tags	standard_pool,positioning
params	{ "count": 2, "moveWholeStacks": true }

Spell-06

字段	值
spell_id	DRAW_CARD
zh_name	抽一张牌
en_name	Draw a Card
cost_full_potions	1
effect_type	DRAW_CARD
target_rule	NO_TARGET
timing_rule	BEFORE_DURING_AFTER_ACTION
usage_scope	CUSTOM,MASTER
tags	standard_pool,utility
params	{ "count": 1 }

Spell-07

字段	值
spell_id	REUSE_LAST_CARD
zh_name	再次使用上一张移动牌
en_name	Reuse Card
cost_full_potions	1
effect_type	REUSE_CARD
target_rule	NO_TARGET
timing_rule	BEFORE_DURING_AFTER_ACTION
usage_scope	CUSTOM,MASTER
tags	standard_pool,combo
params	{ "reuseLastMovementCard": true }

⸻

13.7 关于 FREE_A_WIZARD 的强制开发口径

官方 FAQ 已明确：

* “解封巫师”可以在行动前、中、后使用；
* 可用于把被压住的巫师提前放到塔顶，再随塔一起移动；
* 也可以在巫师刚被封印后立刻解封；
* 甚至可配合城堡移动使用。 

因此，FREE_A_WIZARD 必须被建模成可插入行动流程中的即时法术，不能只写成“回合开始时才能释放”。

⸻

13.8 法术启用模式要求

系统必须支持 3 种启用方式：

模式 A：基础默认法术模式

* 默认启用：
    * MOVE_WIZARD_1
    * MOVE_TOWER_2

模式 B：固定法术列表模式

由配置指定若干 spell_id。

模式 C：随机 N 张法术模式

从标准法术池随机抽取 N 张启用。

⸻

14. 规则引擎核心伪代码（开发主线）

14.1 总体要求

以下伪代码不是示意图，而是开发主流程约束。
AI agent 编码时，必须保持同等语义顺序；允许调整代码风格，但不允许改变核心结算顺序。

⸻

14.2 initGame(config)

1. validate config
2. build board from map definition
3. create players
4. create towers
5. create wizards
6. create potion bottles
7. create movement deck and shuffle
8. determine spell pool according to spellSetup
9. place raven castle at initial position
10. place towers at initial board positions
11. place wizards by player order, according to each setup area's flame capacity
12. draw 3 movement cards for each player
13. set currentPlayer = startingPlayer
14. set turnPhase = ACTION_1
15. set roundNumber = 1
16. emit INIT_COMPLETED

⸻

14.3 playMovementCard(playerId, cardId, decision)

1. validate:
   1.1 player is current player
   1.2 turn phase allows a movement action
   1.3 card exists in player's hand
2. resolve card template and movement value
   2.1 if fixed card -> use fixed value
   2.2 if dice card -> roll / choose final accepted result
3. determine chosen mode
   3.1 wizard-only card -> mode = wizard
   3.2 tower-only card -> mode = tower
   3.3 wizard-or-tower card -> use player's chosen mode
4. discard played card
5. emit CARD_PLAYED
6. if chosen mode == wizard:
   6.1 validate target wizard
   6.2 if no legal target:
       - action is still consumed
       - goto post_action
   6.3 call moveWizardExact(...)
   6.4 if moveWizardExact returns enteredCastle = true:
       - call advanceRavenCastleAfterWizardEntered()
       - mark current turn as ended immediately
       - goto turn_end_cleanup
7. if chosen mode == tower:
   7.1 validate selected tower slice
   7.2 if no legal target:
       - action is still consumed
       - goto post_action
   7.3 call moveTowerSegment(...)
8. post_action:
   8.1 if current phase == ACTION_1 -> turnPhase = ACTION_2
   8.2 else -> goto turn_end_cleanup
9. turn_end_cleanup:
   9.1 if turn should end:
       - refill hand to 3
       - reset turn counters
       - pass to next player

⸻

14.4 moveWizardExact(playerId, wizardId, steps, source)

1. validate wizard is visible and movable
2. compute destination by exact clockwise movement
3. if wizard would pass raven castle with steps remaining:
   - wizard does NOT enter castle
   - continue movement beyond castle
4. if destination is raven castle by exact count:
   4.1 remove wizard from current visible location
   4.2 set wizard.state = IN_CASTLE
   4.3 add wizard to ravenCastle.wizardIdsInside
   4.4 emit WIZARD_ENTERED_CASTLE
   4.5 return enteredCastle = true
5. otherwise:
   5.1 validate destination wizard capacity <= 6 visible wizards
   5.2 remove wizard from source visible location
   5.3 if destination has tower stack:
       - place wizard on top of top tower
       - set state = ON_TOWER_TOP
     else:
       - place wizard on ground
       - set state = ON_GROUND
   5.4 emit WIZARD_MOVED
   5.5 return enteredCastle = false

⸻

14.5 moveTowerSegment(playerId, sourceSpaceIndex, pickedTowerId, steps, source)

1. validate source space contains pickedTowerId
2. extract moving slice:
   - from pickedTowerId upward to the top of that stack
3. compute destination space by clockwise movement
4. validate destination is legal for tower landing
   4.1 if raven castle is on destination space but not on moving slice -> illegal
   4.2 if other custom restrictions exist -> validate
5. detach moving slice from source stack
6. rebuild source stack and visible wizard state
   6.1 any wizard previously imprisoned inside moved slice stays with those moved towers
   6.2 any wizard previously imprisoned below the removed slice remains with the source stack
   6.3 if removing slice exposes a wizard, call releaseVisibleWizardsAtSource()
7. attach moving slice onto destination
8. rebuild destination stack
9. resolve newly covered visible wizards at destination
   9.1 check destination ground visible wizards covered by arriving bottom of moving slice
   9.2 check destination top visible wizard(s) covered by arriving slice
   9.3 for all newly covered visible wizards:
       - set state = IMPRISONED
       - attach them to the specific covering tower runtime state
       - mark imprisonment happened = true
10. if imprisonment happened:
   10.1 fill exactly one EMPTY potion of active player, if any exists
   10.2 emit POTION_FILLED
11. if raven castle is standing on a tower within the moving slice:
   11.1 move raven castle together with that slice
   11.2 update raven castle position
12. emit TOWER_SLICE_MOVED
13. return

⸻

14.6 releaseVisibleWizardsAtSource(sourceSpaceIndex)

1. inspect the source space after a tower slice has been removed
2. for each wizard that was imprisoned inside a tower that is no longer covered:
   2.1 remove wizard from imprisoned list of that tower
   2.2 determine new visible position:
       - if wizard should stand on top of the now-top tower -> ON_TOWER_TOP
       - if no tower remains and wizard belongs on ground -> ON_GROUND
   2.3 emit WIZARD_RELEASED

实现建议：
这里不要写成“猜测谁在最上面”。
应在运行时维护清晰的封印归属关系：某个巫师被封印在哪一座塔里。
当该塔失去覆盖时，再把该巫师恢复为可见状态。

⸻

14.7 resolveImprisonmentAfterTowerLands(activePlayerId, destinationSpaceIndex, movedSlice)

1. collect all visible wizards at destination that become covered by movedSlice
2. if none -> return
3. for each covered wizard:
   3.1 remove wizard from visible position
   3.2 set wizard.state = IMPRISONED
   3.3 attach wizard to the specific tower runtime that covered it
   3.4 emit WIZARD_IMPRISONED
4. if active player has at least one EMPTY potion:
   4.1 flip exactly one EMPTY -> FULL
   4.2 emit POTION_FILLED

⸻

14.8 advanceRavenCastleAfterWizardEntered()

1. read current raven castle position
2. scan clockwise over all raven-shield positions after the current one
3. find the next position where:
   - no visible wizard stands on the ground
   - no visible wizard stands on the tower top
4. if found:
   4.1 move raven castle there
   4.2 emit RAVEN_CASTLE_MOVED
5. if none found:
   5.1 raven castle stays in place

⸻

14.9 castSpell(playerId, spellId, decision)

1. validate:
   1.1 player is allowed to cast now
   1.2 spell is in current game's availableSpells
   1.3 player has enough FULL potions
   1.4 spell usage limit this turn not exceeded
   1.5 target satisfies spell.target_rule
2. spend potion resources
   2.1 choose required number of FULL potions
   2.2 set them to SPENT
   2.3 emit POTION_SPENT
3. emit SPELL_CAST
4. resolve by spell.effect_type
5. switch spell.effect_type:
   - MOVE_WIZARD -> call moveWizardExact(...)
   - MOVE_TOWER -> call moveTowerSegment(...)
   - FREE_WIZARD -> free wizard according to spell params
   - MOVE_RAVEN_CASTLE -> move castle according to spell params
   - SWAP_TOWERS -> swap towers according to spell params
   - DRAW_CARD -> draw cards
   - REUSE_CARD -> resolve reuse logic
6. if spell effect caused a wizard to enter raven castle:
   6.1 advanceRavenCastleAfterWizardEntered()
   6.2 current player's turn ends immediately
7. increase player's spellsCastThisTurn

⸻

14.10 checkEndgameTrigger(playerId)

1. check all wizards of player:
   - all must be IN_CASTLE
2. check potion condition:
   - player must have no EMPTY potion
   - FULL and SPENT are both acceptable
3. if both satisfied:
   3.1 if endgame not yet triggered:
       - set endgameTriggered = true
       - set endgameTriggerPlayerId = playerId
       - set endgameTriggerRound = current round
       - emit ENDGAME_TRIGGERED

⸻

14.11 resolveFinalWinners()

1. after the full round finishes, collect all players who satisfy endgame conditions
2. if only one player -> winner
3. if multiple players:
   3.1 compare remaining FULL potion count
   3.2 highest FULL count wins
   3.3 if tied -> shared victory

⸻

15. 前端交互开发要求（MVP）

15.1 目标

前端不是只做“显示棋盘”，而是必须把《巫师飞塔》里最容易误操作的动作做成明确、可控、可解释的交互。

⸻

15.2 手牌交互要求

移动牌点击后必须分两步

情况 A：巫师牌

流程：

1. 点牌
2. 高亮可选巫师
3. 点巫师
4. 若只有一个合法落点，则直接结算；若有多个依赖额外选择，则继续引导

情况 B：塔牌

流程：

1. 点牌
2. 高亮所有可选塔堆
3. 玩家点击某塔堆
4. 如果该塔堆可从多个层级切片，则展示“从哪一层开始移动”
5. 玩家确定切片后结算

情况 C：巫师 / 塔二选一牌

流程：

1. 点牌
2. 弹出模式选择：移动巫师 / 移动塔
3. 再进入对应流程

⸻

15.3 塔切片选择 UI 要求

玩家点某个塔堆时，必须能够看见：

* 整叠塔的从下到上顺序
* 可选择从哪一座塔开始移动
* 一旦选中某座塔，应高亮“该塔及其上方整段都会移动”

例如塔堆 [A, B, C]：

* 点 A → 移动 [A, B, C]
* 点 B → 移动 [B, C]
* 点 C → 移动 [C]

⸻

15.4 封印 / 解封显示要求

前端必须支持一种开发调试可见、正式 UI 可折叠的表现方式：

开发模式

可以直接显示：

* 每座塔内封印了哪些巫师

正常模式

至少要支持：

* 点击塔堆查看内部被封印巫师（如果规则允许玩家知晓）
* 或提供日志 / 提示让玩家追踪封印状态

⸻

15.5 药水 UI 要求

每位玩家的药水必须明确显示三种状态：

* 空瓶 EMPTY
* 满瓶 FULL
* 已消耗 SPENT

并且终局判定 UI 应提示：

* “当前还剩多少空瓶未处理”

避免玩家误以为必须“桌面全是满瓶”。

⸻

16. 测试与验收要求

16.1 最低要求

在进入前端联调前，规则引擎必须先跑通以下测试集合：

1. 初始化测试
2. 回合与行动测试
3. 巫师移动测试
4. 塔移动测试
5. 封印 / 解封测试
6. 药水测试
7. 法术测试
8. 乌鸦城堡测试
9. 终局测试

⸻

16.2 测试文档引用

测试用例的主来源是：

* V3《规则测试用例全集》

AI agent 必须将其中测试用例转化为真实自动化测试代码。
本 V4 文档只补充开发流程，不替代 V3 测试文档。

⸻

17. 推荐目录结构（可直接采用）

/wandering-towers
  /docs
    V2_rules.md
    V2_dev_requirements.md
    V3_test_cases.md
    V3_data_schema.md
    V3_api_protocol.md
    V4_master_dev_doc.md
  /packages
    /shared
      enums/
      types/
      constants/
      map-definitions/
      spell-definitions/
    /engine
      game/
      rules/
      resolvers/
      validators/
      replay/
      tests/
    /server
      api/
      ws/
      persistence/
    /client
      ui/
      board/
      hand/
      spell-panel/
      log-panel/

⸻

18. AI agent 开发执行清单（最关键）

本章是给 AI agent 的直接任务清单。
AI 在执行开发时，应按以下顺序逐项完成，并在每一步结束后自检。

⸻

Step 1：建立静态定义层

必须完成：

1. MapDefinition
2. MovementCardDefinition
3. SpellDefinition
4. 枚举与常量
5. 初始资源配置表（2~6 人）

参考文档：

* V3 数据字典
* 本文档第 13 章法术表

⸻

Step 2：建立运行时状态层

必须完成：

1. GameState
2. PlayerState
3. WizardRuntime
4. TowerRuntimeState
5. Potion
6. RavenCastleState

参考文档：

* V3 数据字典

⸻

Step 3：建立统一命令与事件流

必须完成：

1. ActionCommand
2. GameEvent
3. 事件应用器 applyEvent()
4. 回放入口

参考文档：

* V3 数据字典
* V3 后端协议

⸻

Step 4：实现基础规则函数

必须完成：

1. initGame
2. playMovementCard
3. moveWizardExact
4. moveTowerSegment
5. resolveImprisonmentAfterTowerLands
6. releaseVisibleWizardsAtSource
7. advanceRavenCastleAfterWizardEntered
8. checkEndgameTrigger

参考文档：

* V2 规则文档
* 本文档第 14 章伪代码

⸻

Step 5：实现法术系统

必须完成：

1. SpellValidator
2. SpellResolver
3. castSpell
4. 标准版法术表接入
5. BASIC / FIXED / RANDOM 三种启用模式

参考文档：

* 本文档第 13 章法术总表
* 本文档第 14 章 castSpell 伪代码

⸻

Step 6：把 V3 测试用例转成自动化测试

至少覆盖：

* INIT / TURN / WIZ / TOWER / SEAL / POTION / SPELL / CASTLE / END

⸻

Step 7：实现前端 MVP

必须完成：

1. 棋盘渲染
2. 手牌交互
3. 塔切片选择
4. 法术施放
5. 日志与胜负展示

⸻

19. 交付标准：什么叫“可以交付给我验收”

当 AI agent 完成以下内容时，才算完成本轮标准版开发的第一阶段：

19.1 规则引擎层

1. 可从 initGame() 创建 2~6 人对局
2. 可通过统一命令推进整局
3. 可完成标准版终局判定
4. 可支持标准版法术启用与施法

19.2 测试层

1. 至少 80% 的 V3 核心测试用例已自动化
2. 不变量检查可通过

19.3 前端层

1. 至少能完整玩一局
2. 不依赖手工改状态
3. 非法操作有提示
4. 能看见当前药水与封印状态

⸻

20. 最终执行结论（给 AI agent）

你现在拥有的开发资料体系应按以下方式理解：

V2 规则文档

回答：“游戏规则是什么？”

V2 开发需求文档

回答：“系统应该怎么拆？”

V3 测试文档

回答：“如何验证实现没错？”

V3 数据字典

回答：“状态和数据结构长什么样？”

V3 后端协议

回答：“命令、事件、接口怎么传？”

V4 总控文档（本文）

回答：“下一步应该按什么顺序开发、优先看哪些附件、法术怎么建模、核心规则函数怎么写？”

⸻

21. 本文档的最终定位

本文档不是要替代之前附件，而是把之前附件“串起来”，并补上 AI agent 真正缺的两块：

1. 标准版法术定义总表
2. 规则引擎核心伪代码

因此，在实际开发时，AI agent 应将本文档视为：

《巫师飞塔》标准版项目的开发总入口 + 执行说明书。

⸻


