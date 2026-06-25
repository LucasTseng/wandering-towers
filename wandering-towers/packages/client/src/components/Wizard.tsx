import type { WizardID } from '@wt/shared';
import { PLAYER_COLORS } from '../game/config';

interface WizardPieceProps {
  wizardId: WizardID;
  ownerPlayerId: string;
  highlight?: boolean | undefined;
  onClick?: (() => void) | undefined;
  size?: number | undefined;
}

/** 巫师棋子（按所属玩家着色） */
export function WizardPiece({ wizardId, ownerPlayerId, highlight, onClick, size = 20 }: WizardPieceProps) {
  const color = PLAYER_COLORS[ownerPlayerId] ?? '#888';
  const w = wizardId.match(/W_(P\d)/)?.[1] ?? ownerPlayerId;
  return (
    <div
      className="wizard-piece"
      title={`${w} 的巫师`}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        border: highlight ? '2px solid #fff' : '1px solid #333',
        boxShadow: highlight ? '0 0 6px 2px gold' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-block',
      }}
    />
  );
}
