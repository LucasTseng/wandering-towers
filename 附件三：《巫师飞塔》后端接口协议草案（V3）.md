附件三：《巫师飞塔》后端接口协议草案（V3）

0. 文档目标

本文档定义《巫师飞塔》项目推荐的后端接口协议。
目标：

1. 支持单机托管、局域网、在线联机三种模式；
2. 统一客户端与规则引擎的通信格式；
3. 为后续“回放、断线重连、旁观、AI 托管”预留空间。

本文档默认采用：

* HTTP/REST：提交指令、拉取快照
* WebSocket：实时推送事件流与状态变化

⸻

1. 协议总原则

1.1 服务端权威

建议采用服务端权威状态：

* 客户端只发“操作请求”
* 服务端负责：
    * 校验合法性
    * 更新 GameState
    * 生成 GameEvent
    * 广播结果

1.2 前端不直接改规则状态

前端可以本地做动画预测，但不得把本地预测视为最终状态。
最终状态以服务端返回为准。

1.3 所有规则变化必须能还原为事件流

任何动作都应拆解为：

1. ActionCommand
2. 规则校验
3. 若合法，则生成一组 GameEvent
4. 应用事件，得到新 GameState

⸻

2. API 资源概览

建议最小资源集合：

1. POST /games：创建游戏
2. GET /games/{gameId}：获取游戏基本信息
3. GET /games/{gameId}/state：获取完整局面快照
4. GET /games/{gameId}/events：获取事件流
5. POST /games/{gameId}/commands：提交统一指令
6. WS /games/{gameId}/stream：订阅实时事件

⸻

3. 创建游戏

3.1 请求

POST /games

Request Body

{
  "config": {
    "playerCount": 4,
    "mode": "CUSTOM",
    "spellSetup": {
      "mode": "CUSTOM",
      "selectedSpellIds": [
        "MOVE_WIZARD_1",
        "MOVE_TOWER_2",
        "DRAW_CARD"
      ],
      "spellSelectionMode": "FIXED",
      "spellCount": 3,
      "maxSpellsPerTurn": 1,
      "nonActivePlayersCanCast": false,
      "castTimingMode": "ACTIVE_ONLY"
    }
  },
  "players": [
    { "playerId": "P1", "name": "A" },
    { "playerId": "P2", "name": "B" },
    { "playerId": "P3", "name": "C" },
    { "playerId": "P4", "name": "D" }
  ]
}

3.2 Response

{
  "gameId": "GAME_001",
  "status": "CREATED",
  "state": {}
}

⸻

4. 获取游戏信息

4.1 GET /games/{gameId}

返回轻量级元数据：

{
  "gameId": "GAME_001",
  "status": "IN_PROGRESS",
  "mode": "CUSTOM",
  "playerCount": 4,
  "currentPlayerId": "P1",
  "roundNumber": 3
}

⸻

5. 获取完整状态快照

5.1 GET /games/{gameId}/state

返回完整 GameState。

Response

{
  "gameId": "GAME_001",
  "stateVersion": 57,
  "state": {
    "config": {},
    "currentPlayerId": "P1",
    "turnPhase": "ACTION_2",
    "roundNumber": 3,
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
}

5.2 stateVersion

* 每次成功结算一个命令后，stateVersion +1
* 客户端可据此做乐观锁 / 断线恢复 / 增量同步

⸻

6. 获取事件流

6.1 GET /games/{gameId}/events?afterSequence=120

用于断线后补拉事件。

Response

{
  "gameId": "GAME_001",
  "events": [
    {
      "eventId": "EVT_121",
      "sequence": 121,
      "type": "CARD_PLAYED",
      "actorPlayerId": "P1",
      "payload": {}
    },
    {
      "eventId": "EVT_122",
      "sequence": 122,
      "type": "WIZARD_MOVED",
      "actorPlayerId": "P1",
      "payload": {}
    }
  ]
}

⸻

7. 统一命令提交接口

建议所有玩家操作统一走：

7.1 POST /games/{gameId}/commands

Request Body

{
  "commandId": "CMD_001",
  "playerId": "P1",
  "expectedStateVersion": 57,
  "command": {
    "type": "PLAY_CARD",
    "payload": {}
  }
}

字段说明

commandId

* 客户端生成，用于幂等控制
* 同一命令重复提交时，服务端应可识别

expectedStateVersion

* 客户端认为当前局面版本号
* 若服务端当前版本不一致，可返回冲突错误，要求客户端先同步

⸻

8. 命令类型定义

⸻

9. PLAY_CARD

9.1 请求体

{
  "commandId": "CMD_002",
  "playerId": "P1",
  "expectedStateVersion": 57,
  "command": {
    "type": "PLAY_CARD",
    "payload": {
      "cardId": "C_00045",
      "chosenMode": "TOWER",
      "resolvedMoveValue": 3,
      "wizardId": null,
      "towerSourceSpaceIndex": 7,
      "pickedTowerId": "T05"
    }
  }
}

9.2 服务端处理流程

1. 校验玩家是否为当前行动方
2. 校验阶段是否合法
3. 校验牌是否在玩家手中
4. 校验目标是否合法
5. 生成事件流，例如：
    * CARD_PLAYED
    * TOWER_SLICE_MOVED
    * WIZARD_IMPRISONED
    * POTION_FILLED
    * ACTION_PHASE_CHANGED

⸻

10. DISCARD_REDRAW

10.1 请求体

{
  "commandId": "CMD_003",
  "playerId": "P1",
  "expectedStateVersion": 57,
  "command": {
    "type": "DISCARD_REDRAW",
    "payload": {
      "moveTowerAfterRedraw": true,
      "towerSourceSpaceIndex": 4,
      "pickedTowerId": "T02"
    }
  }
}

10.2 说明

* 若 moveTowerAfterRedraw = false，则只做弃牌重抽，不执行塔移动

⸻

11. CAST_SPELL

11.1 请求体

{
  "commandId": "CMD_004",
  "playerId": "P1",
  "expectedStateVersion": 57,
  "command": {
    "type": "CAST_SPELL",
    "payload": {
      "spellId": "MOVE_WIZARD_1",
      "targetDecision": {
        "wizardId": "W_P1_03"
      }
    }
  }
}

11.2 服务端处理流程

1. 校验是否允许此时施法
2. 校验施法次数上限
3. 校验满瓶数量是否足够
4. 先生成 SPELL_CAST
5. 再生成 POTION_SPENT
6. 再生成法术对应的移动/状态事件

⸻

12. SKIP_SECOND_ACTION

用于支持 FAQ 口径：
玩家完成第 1 次行动后，可以放弃第 2 次行动并弃掉一张移动牌。

12.1 请求体

{
  "commandId": "CMD_005",
  "playerId": "P1",
  "expectedStateVersion": 58,
  "command": {
    "type": "SKIP_SECOND_ACTION",
    "payload": {
      "discardCardId": "C_00052"
    }
  }
}

⸻

13. END_TURN

在大多数情况下，服务端可以自动结束回合；
但如果你希望前端显式确认，也可以保留该接口。

13.1 请求体

{
  "commandId": "CMD_006",
  "playerId": "P1",
  "expectedStateVersion": 59,
  "command": {
    "type": "END_TURN",
    "payload": {}
  }
}

⸻

14. 命令响应格式

14.1 成功响应

{
  "ok": true,
  "gameId": "GAME_001",
  "acceptedCommandId": "CMD_002",
  "stateVersion": 58,
  "events": [
    {
      "eventId": "EVT_201",
      "sequence": 201,
      "type": "CARD_PLAYED",
      "actorPlayerId": "P1",
      "payload": {}
    },
    {
      "eventId": "EVT_202",
      "sequence": 202,
      "type": "TOWER_SLICE_MOVED",
      "actorPlayerId": "P1",
      "payload": {}
    }
  ],
  "stateDelta": {
    "turnPhase": "ACTION_2"
  }
}

14.2 失败响应

{
  "ok": false,
  "gameId": "GAME_001",
  "rejectedCommandId": "CMD_002",
  "error": {
    "code": "INVALID_TOWER_TARGET",
    "message": "pickedTowerId is not movable from the specified space"
  },
  "currentStateVersion": 57
}

⸻

15. 错误码规范

建议统一使用以下错误码：

[
  "NOT_CURRENT_PLAYER",
  "INVALID_PHASE",
  "CARD_NOT_IN_HAND",
  "INVALID_WIZARD_TARGET",
  "INVALID_TOWER_TARGET",
  "INVALID_MOVE_VALUE",
  "NO_LEGAL_TARGET",
  "TARGET_CAPACITY_EXCEEDED",
  "TOWER_CANNOT_LAND_ON_CASTLE",
  "SPELL_LIMIT_REACHED",
  "NOT_ENOUGH_FULL_POTIONS",
  "INVALID_SPELL_TARGET",
  "STATE_VERSION_CONFLICT",
  "COMMAND_ALREADY_APPLIED"
]

⸻

16. WebSocket 实时流协议

建议提供：

16.1 连接地址

WS /games/{gameId}/stream

16.2 服务端推送消息格式

{
  "type": "GAME_EVENTS",
  "gameId": "GAME_001",
  "stateVersion": 58,
  "events": [
    {
      "eventId": "EVT_201",
      "sequence": 201,
      "type": "CARD_PLAYED",
      "actorPlayerId": "P1",
      "payload": {}
    }
  ]
}

⸻

17. WebSocket 消息类型建议

17.1 服务端 -> 客户端

* GAME_EVENTS
* STATE_SNAPSHOT
* PLAYER_JOINED
* PLAYER_RECONNECTED
* GAME_FINISHED
* ERROR_NOTICE

17.2 客户端 -> 服务端

* PING
* SUBSCRIBE_GAME
* REQUEST_RESYNC

⸻

18. 断线重连流程建议

18.1 客户端保存

* gameId
* 最近收到的 stateVersion
* 最近收到的 event.sequence

18.2 重连流程

1. 建立 WebSocket
2. 发送：

{
  "type": "REQUEST_RESYNC",
  "gameId": "GAME_001",
  "afterSequence": 200
}

3. 服务端返回：

* 若事件仍可补齐：返回增量事件
* 若事件窗口已过：直接推送完整 STATE_SNAPSHOT

⸻

19. 回放协议建议

19.1 获取完整录像

GET /games/{gameId}/replay

Response

{
  "gameId": "GAME_001",
  "initialState": {},
  "events": []
}

19.2 说明

* initialState：初始化完成后的标准起点
* events：从第一个玩家动作开始的完整事件序列

这样前端可以：

* 一步步回放
* 快进 / 回退
* 做“本局复盘”

⸻

20. 服务端结算管线建议

对于任何命令，统一走以下流水线：

20.1 Pipeline

1. LoadState
2. ValidateCommand
3. TranslateToDomainAction
4. RunRuleEngine
5. ProduceEvents
6. ApplyEvents
7. PersistState + PersistEvents
8. PublishEvents
9. ReturnResponse

⸻

21. 规则引擎输出格式建议

建议规则引擎不直接返回“最终大对象”，而是返回：

{
  "success": true,
  "events": [],
  "endTurn": false,
  "endgameTriggered": false
}

然后由状态仓储层把事件应用到 GameState。

这样有三个好处：

1. 回放天然可用
2. 日志清晰
3. 更适合多人联机与 AI 复盘

⸻

22. 幂等与防重放

22.1 commandId 必须全局唯一

同一个 playerId + commandId 若已处理过：

* 直接返回第一次处理结果
* 不再重复执行

22.2 防并发冲突

使用 expectedStateVersion：

* 若客户端状态过旧，则拒绝并返回 STATE_VERSION_CONFLICT

⸻

23. 安全与校验建议

23.1 客户端不可信

服务端必须重新校验：

* 手牌是否真的在该玩家手中
* 当前是否轮到该玩家
* 目标巫师 / 塔是否真的合法
* 施法费用是否足够
* 步数是否与牌面 / 骰子结果一致

23.2 骰子策略

有两种方案：

方案 A：服务端掷骰

* 最安全
* 客户端只发“我要掷这张牌”

方案 B：客户端先掷，服务端校验

* 不推荐，除非是纯本地单机

建议本项目优先使用服务端掷骰。

⸻

24. 最小落地接口集（建议先做）

如果你要尽快把项目跑起来，第一阶段只做以下 5 个接口就够了：

1. POST /games
2. GET /games/{gameId}/state
3. POST /games/{gameId}/commands（统一命令入口）
4. GET /games/{gameId}/events
5. WS /games/{gameId}/stream

其余接口都可以由这 5 个扩展出来。

⸻

25. 推荐的前后端分工

后端负责

* 规则引擎
* 终局判定
* 随机性（洗牌 / 掷骰）
* 状态持久化
* 事件流

前端负责

* 动画与交互
* 可点击高亮
* 目标选择
* 事件回放展示
* 局面渲染

⸻

26. 最终接口设计结论

本项目后端协议应坚持以下 6 条：

1. 服务端权威状态
2. 统一命令入口
3. 事件流驱动
4. 状态版本号防并发冲突
5. 规则引擎与存储层分离
6. 所有随机性尽量服务端生成

这样后续无论你要做：

* 本地单机
* 局域网联机
* 在线多人
* 录像回放
* AI 托管

都不用推翻现有协议。

⸻

