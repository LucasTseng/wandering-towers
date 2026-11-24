import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { PlayerID } from '@wt/shared';
import type { SceneCell, StageInteraction } from '../game/types';
import { TowerScene } from '../scene/SceneController';
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

interface ThreeStageProps {
  cells: SceneCell[];
  interaction: StageInteraction;
  currentPlayerId: PlayerID;
  playerName: string;
  playerColor: string;
  phaseLabel: string;
  roundNumber: number;
  actionIndex: number;
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
    currentPlayerId,
    playerName,
    playerColor,
    phaseLabel,
    roundNumber,
    actionIndex,
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
          <div className="location-plaque">
            <div className="location-kicker">CLOUDFIELD · RAVENREALM</div>
            <div className="location-title">雾晨试炼场</div>
            <div className="location-sub">
              浮空棋盘 · 第 {roundNumber} 轮 · {phaseLabel}
            </div>
          </div>

          <div className="turn-panel">
            <div className="turn-head">
              <span>当前行动</span>
              <strong>{actionIndex} / 2</strong>
            </div>
            <div className="action-pips">
              <i className="action-pip is-on" />
              <i className={actionIndex > 1 ? 'action-pip is-on' : 'action-pip'} />
            </div>
            <div className="turn-caption" style={{ color: playerColor }}>
              {currentPlayerId} · {playerName}
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

          <div className="webgl-badge">
            <span />
            WEBGL 2 · PCF SOFT SHADOW
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
              <span>点击棋子查看</span>
            </div>
            <div className="legend">
              <span className="legend-item"><i className="legend-ring gold" />目标</span>
              <span className="legend-item"><i className="legend-ring green" />可选</span>
              <span className="legend-item"><i className="legend-ring teal" />纹章</span>
            </div>
          </div>
        </div>

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
