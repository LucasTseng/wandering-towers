import type { CSSProperties } from 'react';
import type { GameState, PlayerID, PotionState } from '@wt/shared';
import { PotionState as PS } from '@wt/shared';
import { PLAYER_COLORS } from '../game/config';
import { Prism3D } from './Prism3D';

interface PotionPanelProps {
  state: GameState;
  playerId: PlayerID;
}

/**
 * D02 药水瓶三态 —— v2 真 3D：10 边圆柱瓶（Ø18 × 22）+ 液面圆盘按状态
 * 落在 Z=15 / 4 / 0 + 8 边瓶颈 + 木塞，与 3D-asset-stage.html 的 potion() 同源。
 * SPENT 的降饱和只施加在叶子面，不放在 preserve-3d 容器上。
 */
export function PotionPanel({ state, playerId }: PotionPanelProps) {
  const player = state.players[playerId];
  if (!player) return null;
  const color = PLAYER_COLORS[playerId] ?? '#888';
  const states: PotionState[] = player.potionIds.map((pid) => state.potions[pid]?.state ?? PS.EMPTY);
  const full = states.filter((s) => s === PS.FULL).length;
  const empty = states.filter((s) => s === PS.EMPTY).length;
  const spent = states.filter((s) => s === PS.SPENT).length;

  return (
    <div className="va-panel va-panel-thick" style={{ padding: 6 }}>
      <div className="va-panel-title" style={{ color }}>魔法药水 · {playerId}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 9px', paddingLeft: 3 }}>
        {states.map((ps, i) => (
          <PotionBottle key={i} state={ps} color={color} />
        ))}
      </div>
      <div className="va-divider" />
      <div style={{ fontSize: 10, color: '#b8bcc6', marginTop: 4 }}>
        满 {full} · 空 {empty} · 已耗 {spent}
      </div>
    </div>
  );
}

function PotionBottle({ state, color }: { state: PotionState; color: string }) {
  const h = 22;
  const liquidZ = state === PS.FULL ? 15 : state === PS.EMPTY ? 4 : 0;
  const dim = state === PS.SPENT;
  const leafFilter: CSSProperties['filter'] = dim ? 'saturate(0.35) opacity(0.6)' : undefined;
  const label = state === PS.FULL ? '满药水' : state === PS.SPENT ? '已耗' : '空瓶';

  return (
    <div
      className="va-ui-3d"
      title={label}
      style={{ position: 'relative', width: 22, height: 36, flex: '0 0 auto' }}
    >
      <Prism3D
        sides={10}
        radius={9}
        height={h}
        start={Math.PI / 10}
        // 界面层不在 58° 舞台里，局部倾斜后才能看见瓶身侧壁与液面厚度
        extraTransform="rotateX(-52deg)"
        sideClassName="va-potion-side"
        sideVars={() => ({ filter: leafFilter } as CSSProperties)}
        topStyle={{
          background: 'rgba(143,160,168,0.45)',
          borderRadius: '50%',
          filter: leafFilter,
        }}
        overlay={
          <>
            {/* 液面圆盘：真实 Z 位移区分三态 */}
            {liquidZ > 0 && (
              <div
                className="va-potion-liquid-disc"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 15,
                  height: 15,
                  marginLeft: -7.5,
                  marginTop: -7.5,
                  background: state === PS.FULL ? color : 'rgba(154,168,174,0.5)',
                  color: state === PS.FULL ? color : 'transparent',
                  filter: leafFilter,
                  transform: `translateZ(${liquidZ}px)`,
                }}
              />
            )}
            {/* 8 边瓶颈 */}
            <Prism3D
              sides={8}
              radius={4}
              height={5}
              z={h}
              start={Math.PI / 8}
              sideClassName="va-potion-side"
              sideVars={() => ({ filter: leafFilter } as CSSProperties)}
              topStyle={{ background: 'rgba(143,160,168,0.55)', filter: leafFilter }}
            />
            {/* 木塞：已用态倾斜开塞 */}
            <div
              className="va-potion-cork"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 9,
                height: 4,
                marginLeft: -4.5,
                marginTop: -2,
                filter: leafFilter,
                transform: `translateZ(${h + 6}px)${dim ? ' rotateZ(-18deg)' : ''}`,
              }}
            />
            {/* 玻璃竖向高光 */}
            <div className="va-potion-glint-3d" style={{ transform: 'translateZ(2px)' }} />
          </>
        }
      />
    </div>
  );
}
