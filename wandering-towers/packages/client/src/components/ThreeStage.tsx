import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { PlayerID } from '@wt/shared';
import type { SceneCell, StageInteraction } from '../game/types';
import { TowerScene } from '../scene/SceneController';
import type { CardMode, CardView, PotionView } from '../scene/cardLayer';
import type { TurnNotice } from '../containers/threeTypes';

export interface StageApi {
  resetCamera: () => void;
  zoomBy: (delta: number) => void;
}

/**
 * 场景结构签名：只有棋盘真的变了才重建棋子层。
 *
 * 回放里大量事件（抽牌、切阶段、回合结束）并不改变棋盘；不判重的话
 * 每一步都会 dispose 并重建 16 个地块的全部几何，软件渲染下每步要几百毫秒，
 * 表现为「播放很慢、进度条一顿一顿」。
 */
function sceneSignature(cells: SceneCell[], interaction: StageInteraction, readOnly: boolean): string {
  let sig = readOnly ? 'R|' : 'L|';
  for (const cell of cells) {
    sig += cell.spaceIndex;
    if (cell.groundHasRavenShield) sig += 'G';
    if (cell.castleHere) sig += 'C';
    if (cell.castleOnTowerId) sig += cell.castleOnTowerId;
    for (const layer of cell.towerLayers) {
      sig += `[${layer.towerId}${layer.sealed ? 's' : ''}${layer.hasRavenShield ? 'r' : ''}]`;
    }
    for (const wizard of cell.groundWizards) sig += `g${wizard.wizardId}${wizard.ownerPlayerId}`;
    for (const wizard of cell.topWizards) sig += `t${wizard.wizardId}${wizard.ownerPlayerId}`;
    sig += ';';
  }
  sig += '|';
  sig += [...interaction.highlightWizards].sort().join(',');
  sig += '|';
  sig += [...interaction.selectableSpaces].sort((a, b) => a - b).join(',');
  sig += '|';
  sig += [...interaction.targetSpaces].sort((a, b) => a - b).join(',');
  // 回调存在性必须进签名：它决定 pickRoots 里有没有可拾取对象。
  // 漏掉这一项时，进入回放（cells 恰好与开局相同）会判定“没变化”而跳过重建，
  // 结果回放里仍能选中塔、浮标也不会被清掉。
  sig += '|';
  sig += (interaction.onWizardClick ? 'w' : '') + (interaction.onTowerClick ? 't' : '');
  sig += (interaction.onSpaceClick ? 's' : '') + (interaction.onCastleClick ? 'c' : '');
  return sig;
}

export interface StageStatus {
  round: number;
  phaseLabel: string;
  actionIndex: number;
  playerId: PlayerID;
  playerName: string;
  playerColor: string;
  inCastle: number;
  totalWizards: number;
  spellsLeft: number;
  onBoard: number;
  imprisoned: number;
}

interface ThreeStageProps {
  cells: SceneCell[];
  interaction: StageInteraction;
  /** 纵深卡牌：手牌 3 张与法术牌堆 */
  hand: readonly CardView[];
  spells: readonly CardView[];
  cardsMode: CardMode;
  selectedCardId: string | null;
  /** 进入「选巫师 / 选塔」的主卡：退到左下缩小，浮层改到卡右侧 */
  targetingCardId?: string | null;
  onCardSelect: (id: string) => void;
  onCardHover?: (id: string | null) => void;
  /** 贴在卡牌下缘的浮层（可空） */
  popover?: ReactNode;
  popoverAnchorId?: string | null;
  status: StageStatus;
  potions: readonly PotionView[];
  /** 顶部居中：错误优先，其次意图提示 */
  topCenter?: ReactNode;
  onEndTurn?: (() => void) | null;
  /** 回放面板（浮动停靠） */
  replayPanel?: ReactNode;
  turnNotice: TurnNotice | null;
  /** 只读模式（回放）：禁止场景拾取并清空选中 */
  readOnly?: boolean;
  onReady?: () => void;
}

/**
 * 3D 舞台：只负责挂载 TowerScene、渲染 HUD 与相机按钮。
 * 场景挂载一次；每次状态变化通过 update() 重建棋子层。
 */
export const ThreeStage = forwardRef<StageApi, ThreeStageProps>(function ThreeStage(props, ref) {
  const {
    cells,
    interaction,
    hand,
    spells,
    cardsMode,
    selectedCardId,
    targetingCardId = null,
    onCardSelect,
    onCardHover,
    popover = null,
    popoverAnchorId = null,
    status,
    potions,
    topCenter = null,
    onEndTurn = null,
    replayPanel = null,
    turnNotice,
    readOnly = false,
    onReady,
  } = props;

  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const pinKickerRef = useRef<HTMLDivElement>(null);
  const pinNameRef = useRef<HTMLDivElement>(null);
  const pinMetaRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TowerScene | null>(null);
  const latestRef = useRef({ cells, interaction });
  latestRef.current = { cells, interaction };
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const lastSignatureRef = useRef<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const onCardSelectRef = useRef(onCardSelect);
  onCardSelectRef.current = onCardSelect;
  const onCardHoverRef = useRef(onCardHover);
  onCardHoverRef.current = onCardHover;

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    resetCamera: () => sceneRef.current?.resetCamera(),
    zoomBy: (delta: number) => sceneRef.current?.zoomBy(delta),
  }), []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const pinRoot = pinRef.current;
    if (!stage || !canvas || !pinRoot) return;

    const scene = new TowerScene({
      stage,
      canvas,
      pin: {
        root: pinRoot,
        kicker: pinKickerRef.current as HTMLElement,
        name: pinNameRef.current as HTMLElement,
        meta: pinMetaRef.current as HTMLElement,
      },
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    sceneRef.current = scene;
    scene.onCardClick = (id: string) => onCardSelectRef.current(id);
    scene.onCardHover = (id: string | null) => onCardHoverRef.current?.(id);
    let cancelled = false;

    scene
      .init()
      .then(() => {
        if (cancelled) return;
        scene.update(latestRef.current.cells, latestRef.current.interaction);
        setReady(true);
        onReadyRef.current?.();
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) setError('无法启动 3D 场景：当前浏览器未启用 WebGL 2。请使用最新版 Chrome / Edge，或开启硬件加速。');
      });

    return () => {
      cancelled = true;
      scene.dispose();
      sceneRef.current = null;
    };
    // 场景只挂载一次；cells/interaction 由下方 update effect 处理
  }, []);

  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.setCards(hand, spells, cardsMode, selectedCardId, targetingCardId);
  }, [hand, spells, cardsMode, selectedCardId, targetingCardId, ready]);

  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.setPotions(potions);
  }, [potions, ready]);

  // 浮层跟随卡牌投影：每帧读一次锚点，卡牌移动/镜头旋转都能贴住
  useEffect(() => {
    if (!popoverAnchorId) return;
    let raf = 0;
    const tick = (): void => {
      raf = requestAnimationFrame(tick);
      const el = popoverRef.current;
      const scene = sceneRef.current;
      const stage = stageRef.current;
      if (!el || !scene || !stage) return;
      const anchor = scene.getCardAnchor(popoverAnchorId);
      if (!anchor) {
        el.style.opacity = '0';
        return;
      }
      el.style.opacity = '1';
      const width = el.offsetWidth || 300;
      const height = el.offsetHeight || 110;
      const maxLeft = Math.max(8, stage.clientWidth - width - 8);
      const maxTop = Math.max(8, stage.clientHeight - height - 8);

      // 选目标态：主卡退到左下，浮层贴到卡右侧（横向排布），避免压住棋盘中部
      const side = el.classList.contains('is-side');
      if (side) {
        const cardW = anchor.h * (166 / 249); // 卡牌宽高比 1.66 : 2.49
        const left = anchor.x + cardW / 2 + 18;
        el.style.left = `${Math.min(Math.max(left, 8), maxLeft)}px`;
        const centerY = anchor.y - anchor.h / 2;
        el.style.top = `${Math.min(Math.max(centerY - height / 2, 8), maxTop)}px`;
      } else {
        el.style.left = `${Math.min(Math.max(anchor.x - width / 2, 8), maxLeft)}px`;
        el.style.top = `${Math.min(anchor.y + 22, maxTop)}px`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [popoverAnchorId]);

  useEffect(() => {
    if (!ready) return;
    const signature = sceneSignature(cells, interaction, readOnly);
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;
    sceneRef.current?.update(cells, interaction);
    sceneRef.current?.setReadOnly(readOnly);
    if (readOnly) sceneRef.current?.clearSelection();
  }, [cells, interaction, ready, readOnly]);

  return (
    <div className="stage-wrap">
      <section className="stage" ref={stageRef} aria-label="巫师飞塔三维棋盘">
        <canvas ref={canvasRef} />
        <div className="stage-light-shaft" />
        <div className="stage-sun" />
        <div className="stage-color-grade" />
        <div className="stage-mist" />
        <div className="stage-vignette" />
        <div className="stage-grain" />
        <div className="stage-hud">
          <div className="hud-plaque">
            <div className="location-kicker">CLOUDFIELD · RAVENREALM</div>
            <div className="location-title">雾晨试炼场</div>
            <div className="hud-round">
              第 {status.round} 轮 · 行动 {Math.min(status.actionIndex, 2)} / 2
            </div>
            <div className="hud-phase">{status.phaseLabel}</div>
          </div>

          <div className="hud-top-center">{topCenter}</div>

          <div className="hud-status">
            <div className="hud-status-head">
              <span className="hud-avatar" style={{ background: status.playerColor }} />
              <div className="hud-status-copy">
                <div className="hud-player">
                  {status.playerId} · {status.playerName}
                </div>
                <div className="hud-goal">目标：{status.totalWizards} 名巫师进入鸦堡</div>
              </div>
            </div>
            <div className="hud-progress">
              <i
                style={{
                  width: `${Math.round((status.inCastle / Math.max(1, status.totalWizards)) * 100)}%`,
                  background: `linear-gradient(90deg, ${status.playerColor}, #d8a95c)`,
                }}
              />
            </div>
            <div className="hud-tags">
              <span>已进堡 {status.inCastle}</span>
              <span>法术 {status.spellsLeft}</span>
              <span>场上 {status.onBoard}</span>
              {status.imprisoned > 0 && <span className="is-warn">封印 {status.imprisoned}</span>}
            </div>
          </div>

          <div className="entity-pin" ref={pinRef}>
            <div className="entity-card">
              <div className="entity-kicker" ref={pinKickerRef}>FOCUS</div>
              <div className="entity-name" ref={pinNameRef} />
              <div className="entity-meta" ref={pinMetaRef} />
            </div>
            <div className="entity-line" />
            <div className="entity-dot" />
          </div>

          <div className="camera-controls">
            <button type="button" title="放大" aria-label="放大" onClick={() => sceneRef.current?.zoomBy(-0.08)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button type="button" title="缩小" aria-label="缩小" onClick={() => sceneRef.current?.zoomBy(0.08)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M5 12h14" />
              </svg>
            </button>
            <button type="button" title="复位镜头" aria-label="复位镜头" onClick={() => sceneRef.current?.resetCamera()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 10a8 8 0 1 1 2.3 6.7M4 10V4m0 6h6" />
              </svg>
            </button>
          </div>

          <div className="stage-bottom">
            <div className="control-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M9 3v7m0 0 4-2V5m-4 5L4 8v4l5 2m0-7 4-2M5 14c2.3 2 4.8 3 8 3s5.7-1 7-3" />
              </svg>
              <span>拖动旋转</span>
              <i className="control-sep" />
              <span>滚轮缩放</span>
              <i className="control-sep" />
              <span>悬停左后方法术牌堆</span>
            </div>
            <div className="legend">
              <span className="legend-item"><i className="legend-ring gold" />目标</span>
              <span className="legend-item"><i className="legend-ring green" />可选</span>
              <span className="legend-item"><i className="legend-ring teal" />纹章</span>
            </div>
          </div>

          {onEndTurn && (
            <button className="hud-endturn" type="button" onClick={onEndTurn} title="结束本回合（补牌并轮转到下一玩家）">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
              结束回合
            </button>
          )}
        </div>

        {replayPanel}

        {popover && (
          <div className={`card-popover${targetingCardId ? ' is-side' : ''}`} ref={popoverRef}>
            {popover}
          </div>
        )}

        {turnNotice && (
          <div className="turn-notice" key={turnNotice.key} aria-live="polite">
            <div className="turn-notice-card">
              <div className="turn-notice-kicker">第 {turnNotice.roundNumber} 轮</div>
              <div className="turn-notice-title" style={{ color: turnNotice.color }}>
                {turnNotice.playerId} 的回合
              </div>
              <div className="turn-notice-sub">请开始行动</div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="stage-error"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              zIndex: 50,
              width: 'min(360px, calc(100% - 40px))',
              padding: '16px 18px',
              border: '1px solid #a57d4c',
              borderRadius: 10,
              background: '#f6e9c7',
              color: '#56462f',
              boxShadow: '0 14px 40px rgba(43,58,47,0.24)',
              transform: 'translate(-50%,-50%)',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <strong style={{ display: 'block', marginBottom: 5, fontFamily: 'Georgia, serif', fontSize: 14 }}>
              无法启动 3D 场景
            </strong>
            {error}
          </div>
        )}
      </section>
    </div>
  );
});
