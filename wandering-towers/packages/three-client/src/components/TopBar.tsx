import type { PlayerID } from '@wt/shared';

interface TopBarProps {
  roundNumber: number;
  phaseLabel: string;
  actionIndex: number;
  currentPlayerId: PlayerID;
  onResetCamera: () => void;
  onToggleFullscreen: () => void;
  onExport: () => void;
  /** 经典模式：打开存档选择器 */
  onLoadReplay?: (() => void) | undefined;
  /** 回放模式：只读，替换导出按钮为退出 */
  replay?: { cursor: number; total: number; onExit: () => void } | null;
}

function Crest() {
  return (
    <svg className="brand-crest" viewBox="0 0 100 112" aria-hidden="true">
      <defs>
        <linearGradient id="brandGold" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f2d88e" />
          <stop offset="0.55" stopColor="#c7953f" />
          <stop offset="1" stopColor="#8f682d" />
        </linearGradient>
        <linearGradient id="brandTeal" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#61aab0" />
          <stop offset="1" stopColor="#27626f" />
        </linearGradient>
      </defs>
      <path d="M50 2 L91 18 L86 70 Q70 96 50 108 Q30 96 14 70 L9 18Z" fill="url(#brandGold)" />
      <path d="M50 7 L84 22 L79 67 Q66 89 50 100 Q34 89 21 67 L16 22Z" fill="url(#brandTeal)" stroke="#e8ce88" strokeWidth="1" />
      <path d="M30 55 Q37 38 50 47 Q63 38 70 55 Q64 53 58 57 Q54 69 50 78 Q45 66 42 57 Q36 54 30 55Z" fill="#12313b" />
      <path d="M23 82 Q50 90 77 82" fill="none" stroke="#ecd58f" strokeWidth="1" opacity="0.75" />
    </svg>
  );
}

export function TopBar(props: TopBarProps) {
  const {
    roundNumber,
    phaseLabel,
    actionIndex,
    currentPlayerId,
    onResetCamera,
    onToggleFullscreen,
    onExport,
    onLoadReplay,
    replay,
  } = props;
  const isReplay = !!replay;
  return (
    <header className={`topbar${isReplay ? ' is-replay' : ''}`}>
      <Crest />
      <div className="brand-copy">
        <div className="brand-kicker">Ravenrealm Chronicles</div>
        <h1 className="brand-title">巫师飞塔</h1>
        <div className="brand-subtitle">云野魔典 · 三维战场</div>
      </div>
      <div className="top-divider" />
      <div className="chapter-copy">
        <span className="chapter-label">{isReplay ? 'REPLAY' : 'CHAPTER III'}</span>
        <span className="chapter-name">
          {isReplay ? `鸦堡之路 · 第 ${replay.cursor}/${replay.total} 步` : '雾晨试炼 · 鸦堡之路'}
        </span>
      </div>
      <div className="top-actions">
        <span className={`engine-chip${isReplay ? ' is-replay' : ''}`}>
          <i className="engine-dot" />
          {isReplay ? 'READ ONLY · REPLAY' : 'THREE.JS · ENGINE v1'}
        </span>
        <span className="round-chip">
          第 <strong>{roundNumber}</strong> 轮 · {phaseLabel} {actionIndex}/2
        </span>
        {!isReplay && (
          <button className="tool-button" type="button" title="导出对局 JSON" aria-label="导出对局" onClick={onExport}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </button>
        )}
        {!isReplay && onLoadReplay && (
          <button className="tool-button" type="button" title="加载回放" aria-label="加载回放" onClick={onLoadReplay}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-6.2l-1.6-2H5a2 2 0 0 0-2 1.5Z" />
              <path d="M3.4 9h17.2" />
            </svg>
          </button>
        )}
        <button className="tool-button" type="button" title="全屏体验" aria-label="全屏体验" onClick={onToggleFullscreen}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
          </svg>
        </button>
        {isReplay ? (
          <button className="reset-button is-exit" type="button" onClick={replay.onExit} title="退出回放">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M15 5 8 12l7 7" />
              <path d="M8 12h12" />
            </svg>
            退出回放
          </button>
        ) : (
          <button className="reset-button" type="button" onClick={onResetCamera} title={`当前行动：${currentPlayerId}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 10a8 8 0 1 1 2.3 6.7M4 10V4m0 6h6" />
            </svg>
            复位镜头
          </button>
        )}
      </div>
    </header>
  );
}
