import type { PlayerID, SpaceIndex, TowerID, WizardID } from '@wt/shared';
import type { SceneCell } from './types';

/**
 * 开发期压力测试：在指定地块的塔顶强塞 N 名巫师。
 *
 * 规则允许单格最多 9 名可见巫师堆叠，但正常对局很难在本地复现，
 * 因此提供 `?stress=9&space=2` 这个 DEV-only 入口来校验棋子比例与占位算法。
 * 生产构建里 `import.meta.env.DEV` 为 false，整段会被摇掉。
 */
export function applyStress(cells: SceneCell[], spaceIndex: SpaceIndex, count: number): SceneCell[] {
  return cells.map((cell) => {
    if (cell.spaceIndex !== spaceIndex) return cell;
    const layer = cell.towerLayers[0] ?? {
      towerId: 'T_STRESS' as TowerID,
      hasRavenShield: false,
      hasCastle: false,
      sealed: false,
      imprisonedWizards: 0,
    };
    return {
      ...cell,
      towerLayers: cell.towerLayers.length > 0 ? cell.towerLayers : [layer],
      groundWizards: [],
      topWizards: Array.from({ length: count }, (_, i) => ({
        wizardId: `W_STRESS_${i}` as WizardID,
        ownerPlayerId: (i % 2 === 0 ? 'P1' : 'P2') as PlayerID,
      })),
    };
  });
}

/** 从 URL 读取压测参数（仅 DEV） */
export function readStressParams(): { count: number; space: SpaceIndex } | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const count = Number(params.get('stress') ?? 0);
  if (!Number.isFinite(count) || count <= 0) return null;
  const space = Number(params.get('space') ?? 2);
  return { count: Math.min(Math.round(count), 12), space: space as SpaceIndex };
}
