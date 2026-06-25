import { useCallback, useRef, useState } from 'react';
import { RuleEngine } from '@wt/engine';
import type { ActionCommand, GameConfig, GameState, GameEvent } from '@wt/shared';

/**
 * useGame — 前端与规则引擎的连接层（本地单机模式）
 *
 * 引擎权威：所有状态变更经 RuleEngine.execute，前端只发 ActionCommand。
 * 引擎内部 mutate engine.state（同引用），故每次 execute 后递增 version
 * 触发 React 重渲染，并暴露最新事件流供日志面板使用。
 */
export interface UseGameResult {
  state: GameState;
  /** 本回合累计事件流（日志面板用） */
  events: GameEvent[];
  /** 派发命令；非法操作抛 RuleError，由调用方捕获提示 */
  dispatch: (command: ActionCommand) => void;
  /** 当前局是否已结束 */
  isFinished: boolean;
}

let cmdSeq = 0;
function nextCommandId(playerId: string): string {
  cmdSeq += 1;
  return `CMD_${playerId}_${cmdSeq}`;
}

export function useGame(config: GameConfig, seed: number): UseGameResult {
  // 引擎实例只创建一次
  const engineRef = useRef<RuleEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new RuleEngine(config, { seed });
  }
  const engine = engineRef.current;

  const [, setVersion] = useState(0);
  const [events, setEvents] = useState<GameEvent[]>(engine.getInitEvents());
  const [isFinished, setIsFinished] = useState<boolean>(
    engine.state.turnPhase === 'GAME_FINISHED',
  );

  const dispatch = useCallback(
    (command: ActionCommand) => {
      const fullCommand: ActionCommand = {
        ...command,
        commandId: command.commandId || nextCommandId(command.playerId),
        expectedStateVersion: engine.state.stateVersion,
      };
      const result = engine.execute(fullCommand);
      setEvents((prev) => [...prev, ...result.events]);
      setIsFinished(engine.state.turnPhase === 'GAME_FINISHED');
      // state 是同引用 mutate，用 version 递增触发重渲染
      setVersion((v) => v + 1);
    },
    [engine],
  );

  // engine.state 是同引用 mutate；setVersion 触发重渲染后此处返回最新引用
  const state: GameState = engine.state;

  return { state, events, dispatch, isFinished };
}
