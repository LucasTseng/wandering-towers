附件二：《巫师飞塔》数据字典与 JSON Schema（V3）

0. 文档目标

本文档定义《巫师飞塔》项目中推荐采用的数据结构、字段语义与 JSON 表达方式。
目标：

1. 统一前后端数据口径；
2. 支持存档、回放、联机同步；
3. 作为规则引擎输入/输出的标准载体。

说明：

* 下文以 JSON Schema 风格 + 字段说明 的方式描述；
* 实际代码可用 TypeScript / Kotlin / Go / Java 等语言实现，但字段语义保持一致。

⸻

1. 顶层对象概览

系统核心对象建议包括：

1. GameConfig：本局配置
2. GameState：本局实时状态
3. PlayerState：玩家状态
4. WizardRuntime：巫师状态
5. TowerRuntimeState：塔状态
6. Potion：药水状态
7. MovementCardDefinition / MovementCardInstance
8. SpellDefinition
9. GameEvent：事件流
10. ActionCommand：玩家操作指令

⸻

2. 基础 ID 规范

{
  "PlayerID": "P1",
  "WizardID": "W_P1_01",
  "TowerID": "T03",
  "PotionID": "PT_P1_02",
  "CardID": "C_00045",
  "SpellID": "MOVE_WIZARD_1"
}

2.1 推荐命名约束

* PlayerID：P1 / P2 / ...
* WizardID：W_<PlayerID>_<序号>
* PotionID：PT_<PlayerID>_<序号>
* TowerID：T01 ~ T09
* CardID：牌库实例唯一 ID
* SpellID：固定法术定义 ID

⸻

3. 枚举字典

3.1 GameMode

["BASIC", "CUSTOM", "MASTER_VARIANT"]

3.2 TurnPhase

[
  "TURN_START",
  "ACTION_1",
  "ACTION_2",
  "TURN_END",
  "GAME_END_PENDING",
  "GAME_FINISHED"
]

3.3 WizardStateType

["ON_GROUND", "ON_TOWER_TOP", "IMPRISONED", "IN_CASTLE"]

3.4 PotionState

["EMPTY", "FULL", "SPENT"]

3.5 MovementCardType

["MOVE_WIZARD", "MOVE_TOWER", "MOVE_WIZARD_OR_TOWER"]

3.6 ActionSource

["MOVEMENT_CARD", "SPELL", "DISCARD_REDRAW_TOWER_BONUS"]

⸻

4. GameConfig

4.1 结构

{
  "playerCount": 4,
  "mode": "BASIC",
  "spellSetup": {
    "mode": "BASIC",
    "selectedSpellIds": ["MOVE_WIZARD_1", "MOVE_TOWER_2"],
    "spellPoolSource": "ALL",
    "spellSelectionMode": "FIXED",
    "spellCount": 2,
    "maxSpellsPerTurn": 1,
    "nonActivePlayersCanCast": false,
    "castTimingMode": "ACTIVE_ONLY"
  }
}

4.2 字段说明

playerCount

* 类型：integer
* 允许值：2~6

mode

* 类型：GameMode
* 说明：本局模式

spellSetup

* 类型：SpellSetupConfig

⸻

5. SpellSetupConfig

5.1 Schema

{
  "mode": "CUSTOM",
  "selectedSpellIds": ["MOVE_WIZARD_1", "MOVE_TOWER_2", "DRAW_CARD"],
  "spellPoolSource": "ALL",
  "spellSelectionMode": "FIXED",
  "spellCount": 3,
  "maxSpellsPerTurn": 1,
  "nonActivePlayersCanCast": false,
  "castTimingMode": "ACTIVE_ONLY"
}

5.2 字段说明

selectedSpellIds

* 类型：string[]
* 含义：本局实际启用的法术 ID 列表
* BASIC 模式可由初始化逻辑自动生成

spellPoolSource

* 当前建议固定为 "ALL"
* 预留未来区分“基础法术池 / 扩展法术池”

spellSelectionMode

* FIXED：指定法术列表
* RANDOM：从法术池随机抽取

spellCount

* 随机抽取时使用

maxSpellsPerTurn

* BASIC / CUSTOM 通常为 1
* MASTER_VARIANT 可扩展

nonActivePlayersCanCast

* 基础模式为 false

castTimingMode

* ACTIVE_ONLY：只允许当前玩家在自己回合窗口施法
* REACTION_WINDOW：预留大师法师变体

⸻

6. BoardState / SpaceState

6.1 BoardState

{
  "spaces": []
}

6.2 SpaceState

{
  "index": 0,
  "groundHasRavenShield": false,
  "setupCapacity": 3,
  "groundVisibleWizards": ["W_P1_01"],
  "towerStack": ["T01", "T03"]
}

6.3 字段说明

index

* 0~15
* 顺时针环形编号

groundHasRavenShield

* 表示该地面格本身是否为乌鸦纹章位

setupCapacity

* 开局巫师容量
* 来自地图火苗数
* 只用于初始化，不用于正常游戏过程中的巫师上限

groundVisibleWizards

* 当前站在该地面的可见巫师 ID 列表

towerStack

* 自下而上排列的塔 ID 列表

⸻

7. TowerRuntimeState

7.1 Schema

{
  "id": "T03",
  "hasRavenShield": true,
  "imprisonedWizards": ["W_P2_01", "W_P1_03"]
}

7.2 字段说明

hasRavenShield

* 表示这座塔自身是否带乌鸦纹章

imprisonedWizards

* 当前封印在此塔内的巫师 ID 列表
* 列表顺序不是强约束，但建议保持进入顺序

⸻

8. WizardRuntime

8.1 Schema

{
  "id": "W_P1_01",
  "ownerPlayerId": "P1",
  "state": {
    "mode": "ON_TOWER_TOP",
    "spaceIndex": 6,
    "topTowerId": "T03"
  }
}

8.2 state 四种结构

A. ON_GROUND

{
  "mode": "ON_GROUND",
  "spaceIndex": 5
}

B. ON_TOWER_TOP

{
  "mode": "ON_TOWER_TOP",
  "spaceIndex": 6,
  "topTowerId": "T03"
}

C. IMPRISONED

{
  "mode": "IMPRISONED",
  "spaceIndex": 6,
  "insideTowerId": "T03"
}

D. IN_CASTLE

{
  "mode": "IN_CASTLE"
}

⸻

9. Potion

9.1 Schema

{
  "id": "PT_P1_03",
  "ownerPlayerId": "P1",
  "state": "FULL"
}

9.2 设计约束

每个药水瓶在一局中只能经历以下合法路径：

EMPTY -> FULL -> SPENT

⸻

10. PlayerState

10.1 Schema

{
  "id": "P1",
  "seatIndex": 0,
  "color": "red",
  "wizardIds": ["W_P1_01", "W_P1_02", "W_P1_03", "W_P1_04"],
  "potionIds": ["PT_P1_01", "PT_P1_02", "PT_P1_03", "PT_P1_04", "PT_P1_05"],
  "hand": ["C_001", "C_023", "C_089"],
  "spellsCastThisTurn": 0
}

10.2 字段说明

seatIndex

* 座位顺序，用于确定回合顺序

hand

* 当前手牌 ID 列表
* 正常回合结束后目标数量为 3

spellsCastThisTurn

* 当前回合已施法次数
* 回合开始时重置为 0

⸻

11. RavenCastleState

11.1 Schema

{
  "position": {
    "mode": "ON_SPACE",
    "spaceIndex": 8
  },
  "wizardIdsInside": ["W_P1_01", "W_P3_02"]
}

11.2 位置结构

A. 城堡在地面

{
  "mode": "ON_SPACE",
  "spaceIndex": 8
}

B. 城堡在塔顶

{
  "mode": "ON_TOWER",
  "spaceIndex": 8,
  "topTowerId": "T07"
}

⸻

12. MovementCardDefinition 与实例

12.1 牌定义

{
  "templateId": "MOVE_WIZARD_3",
  "type": "MOVE_WIZARD",
  "moveValueMode": "FIXED",
  "fixedValue": 3,
  "maxRerolls": 0
}

12.2 骰子牌定义

{
  "templateId": "MOVE_TOWER_DICE2",
  "type": "MOVE_TOWER",
  "moveValueMode": "DICE",
  "maxRerolls": 2
}

12.3 牌实例

{
  "id": "C_00045",
  "templateId": "MOVE_WIZARD_3"
}

说明：

* 推荐采用“牌定义 + 牌实例”双层结构
* 这样洗牌、抽牌、弃牌只操作实例 ID；规则读取牌面时再查模板

⸻

13. SpellDefinition

13.1 Schema

{
  "id": "MOVE_WIZARD_1",
  "name": "Move a Wizard",
  "cost": 1,
  "effectType": "MOVE_WIZARD",
  "params": {
    "steps": 1,
    "targetRule": "SPELL_DEFAULT"
  }
}

13.2 另一个例子

{
  "id": "MOVE_TOWER_2",
  "name": "Move a Tower",
  "cost": 1,
  "effectType": "MOVE_TOWER",
  "params": {
    "steps": 2,
    "targetRule": "SPELL_DEFAULT"
  }
}

13.3 字段说明

effectType

建议使用统一枚举，例如：

* MOVE_WIZARD
* MOVE_TOWER
* DRAW_CARD
* FILL_POTION
* LOCK_CASTLE
* REUSE_CARD
* CUSTOM

params

法术具体参数：

* 步数
* 目标限制
* 是否允许选任意玩家巫师
* 是否允许移动任意塔切片等

⸻

14. GameState 顶层结构

14.1 Schema

{
  "config": {},
  "currentPlayerId": "P1",
  "turnPhase": "ACTION_1",
  "roundNumber": 1,
  "board": {},
  "towers": {},
  "wizards": {},
  "potions": {},
  "players": {},
  "ravenCastle": {},
  "drawPile": [],
  "discardPile": [],
  "availableSpells": [],
  "endgameTriggered": false,
  "endgameTriggerPlayerId": null,
  "endgameTriggerRound": null
}

14.2 字段说明

drawPile

* 牌堆顶建议定义为数组尾部，或统一封装 pop() 逻辑

discardPile

* 弃牌堆

availableSpells

* 本局启用法术 ID 列表

endgameTriggered

* 是否已触发终局

endgameTriggerRound

* 记录触发终局时所在轮次，用于“打完整轮再结算”

⸻

15. ActionCommand 统一格式

建议所有前端/客户端发给规则引擎的动作都统一为 ActionCommand。

15.1 通用结构

{
  "commandId": "CMD_0001",
  "gameId": "GAME_001",
  "playerId": "P1",
  "type": "PLAY_CARD",
  "payload": {}
}

15.2 type 建议枚举

[
  "PLAY_CARD",
  "DISCARD_REDRAW",
  "CAST_SPELL",
  "END_TURN",
  "CHOOSE_DICE_RESULT",
  "SKIP_SECOND_ACTION"
]

⸻

16. PLAY_CARD payload

16.1 Schema

{
  "cardId": "C_00045",
  "chosenMode": "TOWER",
  "resolvedMoveValue": 3,
  "wizardId": null,
  "towerSourceSpaceIndex": 7,
  "pickedTowerId": "T05"
}

16.2 字段说明

chosenMode

* 仅当卡牌类型为 MOVE_WIZARD_OR_TOWER 时需要

resolvedMoveValue

* 骰子牌结算后的最终步数
* 服务端也可自行掷骰，则客户端无需传

wizardId

* 巫师移动时使用

towerSourceSpaceIndex

* 塔切片起始空间

pickedTowerId

* 从该塔起向上切出塔切片

⸻

17. DISCARD_REDRAW payload

{
  "moveTowerAfterRedraw": true,
  "towerSourceSpaceIndex": 4,
  "pickedTowerId": "T02"
}

说明：

* 若 moveTowerAfterRedraw = false，则后两项可为空

⸻

18. CAST_SPELL payload

{
  "spellId": "MOVE_WIZARD_1",
  "targetDecision": {
    "wizardId": "W_P1_03",
    "towerSourceSpaceIndex": null,
    "pickedTowerId": null
  }
}

⸻

19. GameEvent 事件模型

建议服务端把所有状态变化都拆成事件流，便于：

* 回放
* 断线重连
* 日志排查
* AI 复盘

19.1 通用结构

{
  "eventId": "EVT_00001",
  "gameId": "GAME_001",
  "sequence": 1,
  "type": "WIZARD_MOVED",
  "actorPlayerId": "P1",
  "payload": {}
}

⸻

20. 推荐事件类型清单

20.1 回合类

* TURN_STARTED
* ACTION_PHASE_CHANGED
* TURN_ENDED
* ROUND_ENDED

20.2 牌类

* CARD_PLAYED
* CARD_DISCARDED
* CARDS_DRAWN
* DISCARD_RESHUFFLED_TO_DRAW

20.3 巫师类

* WIZARD_MOVED
* WIZARD_ENTERED_CASTLE
* WIZARD_IMPRISONED
* WIZARD_RELEASED

20.4 塔类

* TOWER_SLICE_MOVED
* TOWER_STACK_REBUILT

20.5 城堡类

* RAVEN_CASTLE_MOVED

20.6 药水类

* POTION_FILLED
* POTION_SPENT

20.7 法术类

* SPELL_CAST

20.8 终局类

* ENDGAME_TRIGGERED
* WINNER_DETERMINED

⸻

21. 关键事件 payload 示例

21.1 WIZARD_MOVED

{
  "wizardId": "W_P1_01",
  "from": {
    "mode": "ON_GROUND",
    "spaceIndex": 5
  },
  "to": {
    "mode": "ON_TOWER_TOP",
    "spaceIndex": 8,
    "topTowerId": "T03"
  },
  "steps": 3,
  "source": "MOVEMENT_CARD"
}

21.2 POTION_FILLED

{
  "playerId": "P1",
  "potionId": "PT_P1_03",
  "from": "EMPTY",
  "to": "FULL",
  "reason": "IMPRISONMENT_REWARD"
}

21.3 POTION_SPENT

{
  "playerId": "P1",
  "spellId": "MOVE_WIZARD_1",
  "potionIds": ["PT_P1_03"]
}

21.4 ENDGAME_TRIGGERED

{
  "playerId": "P2",
  "roundNumber": 7
}

⸻

22. 存档结构建议

22.1 SaveGame

{
  "gameId": "GAME_001",
  "version": "1.0.0",
  "savedAt": "2026-06-25T12:00:00Z",
  "state": {}
}

22.2 版本字段

必须包含 version，便于后续规则与数据升级兼容。

⸻

23. 不变量约束（必须始终成立）

23.1 药水不变量

对任意玩家：

EMPTY + FULL + SPENT = 初始药水总数

23.2 巫师不变量

每个巫师在任一时刻必须且只能处于以下一种状态：

* ON_GROUND
* ON_TOWER_TOP
* IMPRISONED
* IN_CASTLE

23.3 塔不变量

9 座塔在任一时刻必须全部出现在棋盘某个空间的 towerStack 中，不可丢失、不可重复。

23.4 手牌不变量

正常回合结束时，若抽牌堆足够，玩家手牌应补到 3 张。

23.5 城堡不变量

乌鸦城堡任一时刻只能有一个位置：

* 要么在地面
* 要么在塔顶

⸻

24. 推荐的数据分层

24.1 静态定义层

* MapDefinition
* MovementCardDefinition
* SpellDefinition

24.2 动态状态层

* GameState
* PlayerState
* WizardRuntime
* Potion
* TowerRuntimeState

24.3 指令层

* ActionCommand

24.4 事件层

* GameEvent

这种分层最适合：

* 单机规则引擎
* 服务端权威状态
* 回放 / 录像 / AI 复盘