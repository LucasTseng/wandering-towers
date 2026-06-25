import type { TowerID } from '@wt/shared';

interface TowerBlockProps {
  towerId: TowerID;
  hasRavenShield: boolean;
  /** 是否带乌鸦城堡（顶塔） */
  hasCastle?: boolean | undefined;
  /** 是否为可选择的切片起点（高亮） */
  selectable?: boolean | undefined;
  /** 是否在选中切片内（含其及以上） */
  inSlice?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

/** 单座塔（堆叠时作为一层） */
export function TowerBlock({ towerId, hasRavenShield, hasCastle, selectable, inSlice, onClick }: TowerBlockProps) {
  return (
    <div
      className="tower-block"
      onClick={onClick}
      title={`${towerId}${hasRavenShield ? '（纹章塔）' : ''}`}
      style={{
        width: 36,
        height: 20,
        background: hasRavenShield ? '#5d4037' : '#8d6e63',
        border: inSlice ? '2px solid gold' : selectable ? '2px dashed #fff' : '1px solid #3e2723',
        borderRadius: 3,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 9,
      }}
    >
      {towerId}
      {hasCastle && <span style={{ position: 'absolute', top: -14, fontSize: 14 }}>🏰</span>}
      {hasRavenShield && <span style={{ marginLeft: 2, fontSize: 8 }}>🛡</span>}
    </div>
  );
}
