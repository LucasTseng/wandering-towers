import type { ISpell } from '../spell';
import { moveWizard1 } from './move-wizard-1';
import { moveTower2 } from './move-tower-2';
import { freeAWizard } from './free-a-wizard';
import { moveRavenCastle } from './move-raven-castle';
import { swapTwoTowers } from './swap-two-towers';
import { drawCard } from './draw-card';
import { reuseLastCard } from './reuse-last-card';

/** 全部标准版法术实现（模块加载时由 spell-registry 注册） */
export const allSpells: ISpell[] = [
  moveWizard1,
  moveTower2,
  freeAWizard,
  moveRavenCastle,
  swapTwoTowers,
  drawCard,
  reuseLastCard,
];
