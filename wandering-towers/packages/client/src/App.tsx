import { useState } from 'react';
import { GameContainer } from './containers/GameContainer';
import { ReplayLauncher } from './components/ReplayView';
import type { SaveGame } from '@wt/shared';

/**
 * 前端入口 — 本地可玩 MVP + 回放模式（Phase C + Phase D）
 *
 * 模式：
 *  - 'live'：正常对局（GameContainer）
 *  - 'replay-load'：从文件加载回放（ReplayLauncher）
 *  - 'replay-view'：进入回放视图（ReplayLauncher 内嵌 ReplayView）
 *
 * 详见 docs/开发设计文档-架构与实现基线.md §12/§14 Phase D。
 */
type Mode = 'live' | 'replay-load' | 'replay-view';

export function App() {
  const [mode, setMode] = useState<Mode>('live');
  const [loadedSave] = useState<SaveGame | null>(null);

  if (mode === 'replay-load' || mode === 'replay-view') {
    return (
      <ReplayLauncher
        save={null}
        onExit={() => {
          setMode('live');
        }}
      />
    );
  }

  return (
    <GameContainer
      onEnterReplay={() => setMode('replay-load')}
    />
  );
}
