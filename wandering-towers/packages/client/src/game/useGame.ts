import { useCallback, useMemo, useRef, useState } from 'react';
import { RuleEngine } from '@wt/engine';
import type { ActionCommand, GameConfig, GameState, GameEvent } from '@wt/shared';

/**
 * useGame — 前端与规则引擎的连接层（本地单机模式）
 *
 * 引擎权威：所有状态变更经 RuleEngine.execute，前端只发 ActionCommand。
 * 引擎内部 mutate engine.state（同引用），故每次 execute 后用 tick 触发重渲染。
 * 为让 React 感知 state 变化（下游 useMemo 失效），返回的 state 是浅拷贝
 * —— 引用每次变化，但子对象仍是 engine.state 的引用（已被引擎 mutate 为最新）。
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

  const [tick, setTick] = useState(0);
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
      // tick 触发重渲染；下面 state 的 useMemo 依赖 tick 会重新浅拷贝 engine.state
      setTick((t) => t + 1);
    },
    [engine],
  );

  // 浅拷贝 engine.state 得到新引用，但所有子对象（board/towers/wizards/...）
  // 仍是 engine 内部 mutate 的引用——下游读取到的就是最新状态。
  const state = useMemo(() => ({ ...engine.state }), [tick, engine]);

  return { state, events, dispatch, isFinished };
}
