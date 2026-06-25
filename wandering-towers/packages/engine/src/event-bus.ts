import type { GameEvent } from '@wt/shared';

/**
 * 事件累加器（V3 后端协议 §20 结算管线 §5 ProduceEvents）
 *
 * 规则函数在结算过程中向累加器推事件，统一分配 sequence 与 eventId，
 * 结算结束后由引擎批量 applyEvent 并返回给调用方。
 */
export class EventAccumulator {
  private events: GameEvent[] = [];
  private sequence: number;

  constructor(startSequence: number) {
    this.sequence = startSequence;
  }

  push(
    type: GameEvent['type'],
    payload: unknown,
    actorPlayerId?: string | undefined,
    gameId?: string | undefined,
  ): GameEvent {
    this.sequence += 1;
    const evt: GameEvent = {
      eventId: `EVT_${String(this.sequence).padStart(5, '0')}`,
      gameId,
      sequence: this.sequence,
      type,
      actorPlayerId,
      payload,
    };
    this.events.push(evt);
    return evt;
  }

  all(): GameEvent[] {
    return this.events;
  }

  count(): number {
    return this.events.length;
  }

  nextSequence(): number {
    return this.sequence + 1;
  }
}
