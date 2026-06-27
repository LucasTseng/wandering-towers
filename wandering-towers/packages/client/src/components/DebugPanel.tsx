import { useState } from 'react';
import type { ActionCommand, GameState, PlayerID } from '@wt/shared';
import { CommandType, WizardStateType } from '@wt/shared';
import { RuleError } from '@wt/engine';

/**
 * DebugPanel — 开发模式调试面板（T4.3 / V4 §15.6）
 *
 * 通过 URL `?debug` 激活（默认不渲染，避免干扰正常游玩）。
 * 展示：状态总览 / 乌鸦城堡 / 全巫师状态 / 塔内封印 / 命令注入器。
 *
 * 命令注入器可绕过 UI 交互流，直接向引擎派发任意 ActionCommand，
 * 用于复现 bug、测试边界命令组合。payload 为原始 JSON。
 */
interface DebugPanelProps {
  state: GameState;
  /** 直接派发到引擎的原始 dispatch（不经过 UI safeDispatch 包装） */
  dispatch: (cmd: ActionCommand) => void;
}

const WIZ_MODE_ZH: Record<string, string> = {
  ON_GROUND: '地面',
  ON_TOWER_TOP: '塔顶',
  IMPRISONED: '封印',
  IN_CASTLE: '城堡',
};

const PHASE_ZH: Record<string, string> = {
  TURN_START: '回合开始',
  ACTION_1: '行动1',
  ACTION_2: '行动2',
  TURN_END: '回合结束',
  GAME_END_PENDING: '终局待结算',
  GAME_FINISHED: '游戏结束',
};

function castlePosStr(state: GameState): string {
  const p = state.ravenCastle.position;
  return p.mode === 'ON_TOWER'
    ? `塔顶@${p.spaceIndex}(${p.topTowerId})`
    : `地面@${p.spaceIndex}`;
}

function wizDetail(state: GameState, wizId: string): string {
  const w = state.wizards[wizId];
  if (!w) return '?';
  if (w.state.mode === WizardStateType.ON_GROUND) return `空间${w.state.spaceIndex}`;
  if (w.state.mode === WizardStateType.ON_TOWER_TOP) return `空间${w.state.spaceIndex}/${w.state.topTowerId}`;
  if (w.state.mode === WizardStateType.IMPRISONED) return `空间${w.state.spaceIndex}/${w.state.insideTowerId}`;
  return '';
}

/** 塔所在空间 + 层级（自下而上索引） */
function towerLocation(state: GameState, towerId: string): string {
  for (const sp of state.board.spaces) {
    const idx = sp.towerStack.indexOf(towerId);
    if (idx >= 0) return `${sp.index}[${idx}/${sp.towerStack.length}]`;
  }
  return '不在棋盘';
}

export function DebugPanel({ state, dispatch }: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdType, setCmdType] = useState<ActionCommand['type']>('PLAY_CARD');
  const [playerId, setPlayerId] = useState<PlayerID>(state.currentPlayerId);
  const [payloadText, setPayloadText] = useState('{}');
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const inject = () => {
    let payload: unknown;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setResult({ ok: false, msg: 'payload 不是合法 JSON' });
      return;
    }
    try {
      dispatch({ commandId: '', playerId, type: cmdType, payload: payload as ActionCommand['payload'] });
      setResult({ ok: true, msg: '已注入' });
    } catch (e) {
      const msg = e instanceof RuleError ? `${e.code}: ${e.message}` : (e as Error).message;
      setResult({ ok: false, msg });
    }
  };

  const wizards = Object.values(state.wizards);
  const towers = Object.values(state.towers);

  const section: React.CSSProperties = {
    borderBottom: '1px solid #ddd',
    padding: '6px 0',
  };
  const table: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
  };
  const th: React.CSSProperties = {
    textAlign: 'left',
    borderBottom: '1px solid #eee',
    padding: '2px 4px',
    fontWeight: 'bold',
  };
  const td: React.CSSProperties = { padding: '2px 4px', borderBottom: '1px solid #f5f5f5' };

  return (
    <div
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        width: 420,
        maxHeight: '85vh',
        background: '#fafafa',
        border: '2px solid #888',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px',
          background: '#333',
          color: '#fff',
          borderRadius: '6px 6px 0 0',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <strong>🐞 调试面板</strong>
        <span>{collapsed ? '展开 ▲' : '收起 ▼'}</span>
      </div>

      {!collapsed && (
        <div style={{ overflowY: 'auto', padding: '0 8px 8px' }}>
          {/* 总览 */}
          <div style={section}>
            <div style={{ fontWeight: 'bold', marginBottom: 2 }}>状态总览</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              阶段：<strong>{PHASE_ZH[state.turnPhase] ?? state.turnPhase}</strong> ·
              当前：<strong>{state.currentPlayerId}</strong> · 轮次 {state.roundNumber}
              <br />
              stateVersion {state.stateVersion} · drawPile {state.drawPile.length} · discardPile {state.discardPile.length}
              <br />
              终局触发：{state.endgameTriggered ? `是(${state.endgameTriggerPlayerId}@R${state.endgameTriggerRound})` : '否'}
              {state.winners.length > 0 && ` · 胜者：${state.winners.join(',')}`}
            </div>
          </div>

          {/* 城堡 */}
          <div style={section}>
            <div style={{ fontWeight: 'bold', marginBottom: 2 }}>乌鸦城堡</div>
            <div style={{ fontSize: 12 }}>
              位置：{castlePosStr(state)} · 堡内巫师 {state.ravenCastle.wizardIdsInside.length}：
              [{state.ravenCastle.wizardIdsInside.join(', ')}]
            </div>
          </div>

          {/* 全巫师 */}
          <div style={section}>
            <div style={{ fontWeight: 'bold', marginBottom: 2 }}>全巫师状态（{wizards.length}）</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>归属</th>
                  <th style={th}>状态</th>
                  <th style={th}>详情</th>
                </tr>
              </thead>
              <tbody>
                {wizards.map((w) => (
                  <tr key={w.id}>
                    <td style={td}>{w.id}</td>
                    <td style={td}>{w.ownerPlayerId}</td>
                    <td style={td}>{WIZ_MODE_ZH[w.state.mode] ?? w.state.mode}</td>
                    <td style={td}>{wizDetail(state, w.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 塔 */}
          <div style={section}>
            <div style={{ fontWeight: 'bold', marginBottom: 2 }}>塔与封印（{towers.length}）</div>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>塔</th>
                  <th style={th}>位置</th>
                  <th style={th}>纹章</th>
                  <th style={th}>封印</th>
                  <th style={th}>塔内巫师</th>
                </tr>
              </thead>
              <tbody>
                {towers.map((t) => (
                  <tr key={t.id}>
                    <td style={td}>{t.id}</td>
                    <td style={td}>{towerLocation(state, t.id)}</td>
                    <td style={td}>{t.hasRavenShield ? '✓' : ''}</td>
                    <td style={td}>{t.sealed ? '🔒' : ''}</td>
                    <td style={td}>[{t.imprisonedWizards.join(', ')}]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 命令注入器 */}
          <div style={{ ...section, borderBottom: 'none' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>命令注入器</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4, fontSize: 12 }}>
              <select value={cmdType} onChange={(e) => setCmdType(e.target.value as ActionCommand['type'])}>
                {Object.values(CommandType).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select value={playerId} onChange={(e) => setPlayerId(e.target.value as PlayerID)}>
                {state.playerOrder.map((pid) => (
                  <option key={pid} value={pid}>{pid}</option>
                ))}
              </select>
            </div>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={3}
              style={{ width: '100%', fontSize: 11, fontFamily: 'monospace', boxSizing: 'border-box' }}
              placeholder='例如：{"cardId":"C_00001","wizardId":"W_P1_01"}'
            />
            <button
              onClick={inject}
              style={{ marginTop: 4, cursor: 'pointer', fontSize: 12, padding: '2px 10px' }}
            >
              注入命令
            </button>
            {result && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: result.ok ? '#27ae60' : '#c0392b',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                }}
              >
                {result.ok ? '✓ ' : '✗ '}{result.msg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 是否激活调试面板（URL 含 ?debug） */
export function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('debug');
}
