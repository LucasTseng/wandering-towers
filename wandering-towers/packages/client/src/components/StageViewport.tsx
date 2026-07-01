import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpaceIndex, TowerID, WizardID } from '@wt/shared';
import { fitWorldZoom, VISUAL_3D } from '../game/visual3d';
import type { SpaceCellData } from './Space';
import { Board } from './Board';
import { StageBackground, type StageBgTheme } from './StageBackground';

/** 棋盘整体放大倍数（含地形、塔、巫师、城堡）。
 *  fitWorldZoom 把世界恰好塞进舞台的短边；>1 时世界会超出短边，
 *  由 .wt-stage-viewport 的 overflow:hidden 裁掉 3D 边缘（远端塔顶 / 近端台沿）。
 *  调到 1.0 即恢复原大小。 */
const BOARD_SCALE = 2.0;

interface StageViewportProps {
  cells: SpaceCellData[];
  targetSpaces?: Set<SpaceIndex> | undefined;
  selectableSpaces?: Set<SpaceIndex> | undefined;
  sliceStart?: { spaceIndex: SpaceIndex; towerId: TowerID } | null | undefined;
  highlightWizards?: Set<WizardID> | undefined;
  onSpaceClick?: ((spaceIndex: SpaceIndex) => void) | undefined;
  onWizardClick?: ((wizardId: WizardID) => void) | undefined;
  onTowerClick?: ((spaceIndex: SpaceIndex, towerId: TowerID) => void) | undefined;
  glowOff?: boolean;
}

export function StageViewport(props: StageViewportProps) {
  const { glowOff } = props;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pitch, setPitch] = useState<number>(VISUAL_3D.cameraPitchDeg);
  const [dragging, setDragging] = useState(false);
  const [bgTheme, setBgTheme] = useState<StageBgTheme>('sky');

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const s = Math.max(0, Math.min(el.clientWidth, el.clientHeight));
      setSide(s);
      setZoom(clampZoom(fitWorldZoom(s)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitAll = side > 0 ? fitWorldZoom(side) : 1;

  const reset = useCallback(() => {
    setZoom(clampZoom(fitAll));
    setRotation(0);
    setPitch(VISUAL_3D.cameraPitchDeg);
  }, [fitAll]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    setZoom((oldZoom) => clampZoom(e.deltaY < 0 ? oldZoom * VISUAL_3D.zoomStep : oldZoom / VISUAL_3D.zoomStep));
  }, []);

  const dragStart = useRef<{ x: number; y: number; rotation: number; pitch: number } | null>(null);
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('[data-interactive]')) return;
      dragStart.current = { x: e.clientX, y: e.clientY, rotation, pitch };
      setDragging(true);
    },
    [rotation, pitch],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const start = dragStart.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      setRotation(start.rotation - dx * 0.45);
      setPitch(clampPitch(start.pitch - dy * 0.25));
    };
    const onUp = () => {
      dragStart.current = null;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  return (
    <div
      ref={wrapperRef}
      style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className={'wt-stage-viewport wt-stage-glow' + (dragging ? ' wt-dragging' : '')}
        data-glow-off={glowOff ? '1' : undefined}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
      >
        {/* 3D 背景层（z-index:0，pointer-events:none）填满整个舞台区域 */}
        <StageBackground theme={bgTheme} />
        <div
          className="wt-stage-world"
          style={{
            transform: `translate(-50%, -50%) scale(${zoom * BOARD_SCALE}) rotateX(${pitch}deg) rotateZ(${rotation}deg)`,
          }}
        >
          <Board {...props} />
        </div>
        <div className="wt-stage-bg-select" data-interactive title="切换舞台背景主题">
          <label htmlFor="wt-stage-bg">背景</label>
          <select
            id="wt-stage-bg"
            value={bgTheme}
            onChange={(e) => setBgTheme(e.target.value as StageBgTheme)}
          >
            <option value="sky">蓝天白云</option>
            <option value="cosmic">宇宙星空</option>
            <option value="dark">暗夜</option>
          </select>
        </div>
        <button className="wt-stage-reset" onClick={reset} title="一键还原" data-interactive>
          Reset
        </button>
      </div>
    </div>
  );
}

function clampZoom(z: number): number {
  return Math.max(VISUAL_3D.zoomMin, Math.min(VISUAL_3D.zoomMax, z));
}

function clampPitch(p: number): number {
  return Math.max(VISUAL_3D.pitchMinDeg, Math.min(VISUAL_3D.pitchMaxDeg, p));
}
