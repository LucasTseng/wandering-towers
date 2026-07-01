import { useCallback, useMemo, useRef, useState } from 'react';
import { RuleEngine } from '@wt/engine';
import type { ExecuteResult } from '@wt/engine';
import type {
  ActionCommand,
  GameConfig,
  GameEvent,
  GameState,
  SaveGame,
} from '@wt/shared';

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
  /** 本回合累计事件流（init + 所有命令），日志面板用 */
  events: GameEvent[];
  /** 仅玩家命令产生的事件（用于 SaveGame.recordedEvents） */
  recordedEvents: GameEvent[];
  /** 派发命令；非法操作抛 RuleError，由调用方捕获提示。成功时返回引擎结算结果（含事件流） */
  dispatch: (command: ActionCommand) => ExecuteResult;
  /** 当前局是否已结束 */
  isFinished: boolean;
  /** 导出当前对局为 SaveGame（用于回放） */
  exportSave: (gameId?: string) => SaveGame;
  /** 本局 seed（用于回放构造 SaveGame） */
  seed: number;
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

  const initEvents = useMemo(() => engine.getInitEvents(), [engine]);
  const [recordedEvents, setRecordedEvents] = useState<GameEvent[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(
    engine.state.turnPhase === 'GAME_FINISHED',
  );
  const [tick, setTick] = useState(0);

  const dispatch = useCallback(
    (command: ActionCommand): ExecuteResult => {
      const fullCommand: ActionCommand = {
        ...command,
        commandId: command.commandId || nextCommandId(command.playerId),
        expectedStateVersion: engine.state.stateVersion,
      };
      const result = engine.execute(fullCommand);
      setRecordedEvents((prev) => [...prev, ...result.events]);
      setIsFinished(engine.state.turnPhase === 'GAME_FINISHED');
      // tick 触发重渲染；下面 state 的 useMemo 依赖 tick 会重新浅拷贝 engine.state
      setTick((t) => t + 1);
      return result;
    },
    [engine],
  );

  // 浅拷贝 engine.state 得到新引用，但所有子对象（board/towers/wizards/...）
  // 仍是 engine 内部 mutate 的引用——下游读取到的就是最新状态。
  const state = useMemo(() => ({ ...engine.state }), [tick, engine]);

  const events = useMemo(
    () => [...initEvents, ...recordedEvents],
    [initEvents, recordedEvents],
  );

  const exportSave = useCallback(
    (gameId?: string): SaveGame => {
      // 浅拷贝 state 作为 finalState 快照
      const finalSnapshot: GameState = { ...engine.state };
      return {
        gameId: gameId ?? `SG_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        version: '1.0',
        savedAt: new Date().toISOString(),
        config,
        seed,
        initialEvents: [...initEvents],
        recordedEvents: [...recordedEvents],
        finalState: finalSnapshot,
      };
    },
    [engine, config, seed, initEvents, recordedEvents],
  );

  return { state, events, recordedEvents, dispatch, isFinished, exportSave, seed };
}
