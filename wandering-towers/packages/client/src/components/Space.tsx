import type { CSSProperties } from 'react';
import type { PlayerID, TowerID, WizardID } from '@wt/shared';
import { tileSurfaceZ, towerStackHeight, VISUAL_3D } from '../game/visual3d';
import { Tower3D } from './Tower3D';
import { Wizard3D } from './Wizard3D';
import { Castle3D } from './Castle3D';
import { Prism3D } from './Prism3D';

export interface TowerLayerData {
  towerId: TowerID;
  hasRavenShield: boolean;
  hasCastle: boolean;
  imprisonedWizards: number;
  tier?: number | undefined;
  selectableStart?: boolean | undefined;
  inSlice?: boolean | undefined;
  onTowerClick?: (() => void) | undefined;
}

export interface SpaceCellData {
  spaceIndex: number;
  isRavenShieldGround: boolean;
  isRavenShieldPosition: boolean;
  setupCapacity: number;
  castleHere: boolean;
  castleOnTowerId: TowerID | null;
  towerLayers: TowerLayerData[];
  groundWizards: { wizardId: WizardID; ownerPlayerId: string }[];
  topWizards: { wizardId: WizardID; ownerPlayerId: string }[];
  highlight?: 'target' | 'selectable' | undefined;
  onSpaceClick?: (() => void) | undefined;
  onWizardClick?: ((wizardId: WizardID) => void) | undefined;
  selectableWizardOwnerId?: PlayerID | undefined;
  highlightWizards?: Set<WizardID> | undefined;
}

export function SpaceCell({ data, angle }: { data: SpaceCellData; angle: number }) {
  const stackHeight = towerStackHeight(data.towerLayers.length);
  const topSurfaceZ = tileSurfaceZ + stackHeight;
  // WizardCluster 对棋子做 rotateX(-90deg)，transform-origin 为 50% 50%：
  // 组件高 30px，中心在 Z=z 时底部落在 z-15。故 z = 面高 + 身高/2 才真正贴面，
  // 原实现用了 +身高，导致巫师整体浮空 15px（在 58° 斜俯下尤其明显）。
  const topWizardZ = topSurfaceZ + VISUAL_3D.wizardHeight / 2;
  const groundWizardZ = tileSurfaceZ + VISUAL_3D.wizardHeight / 2;
  // 16 边形 tile：边法线间隔 22.5°(π/8) 与 16 环邻居圆心夹角一致，
  // 不旋转顶面时 edge i 自然朝向 neighbor i+1，边边可贴边对齐。
  // 半径取 0.92*tileRadius ≈ 68 ≈ R·tan(π/16)，使 flat-to-flat = 邻居弦长，贴边无重叠。
  // 顶面 clip 与侧面墙共用同一组 polygonPoints，杜绝顶面/侧面错位。
  const tileSideCount = 16;
  const tilePoints = polygonPoints(tileSideCount, VISUAL_3D.tileRadius * 0.92, 0);
  const tileClip = `polygon(${tilePoints
    .map(
      (p) =>
        `${((p.x + VISUAL_3D.tileRadius) / (VISUAL_3D.tileRadius * 2)) * 100}% ${((p.y + VISUAL_3D.tileRadius) / (VISUAL_3D.tileRadius * 2)) * 100}%`,
    )
    .join(', ')})`;

  return (
    <div
      style={{
        position: 'relative',
        width: VISUAL_3D.tileRadius * 2,
        height: VISUAL_3D.tileRadius * 2,
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="space-cell va-tile-face"
        data-variant={data.isRavenShieldGround ? 'raven' : 'stone'}
        onClick={data.onSpaceClick}
        data-interactive={data.onSpaceClick ? '' : undefined}
        title={`Space ${data.spaceIndex}`}
        style={{
          ...tileFaceStyle(tileClip, data),
          transform: `translateZ(${tileSurfaceZ}px)`,
          cursor: data.onSpaceClick ? 'pointer' : 'default',
          zIndex: 1,
        }}
      />
      {/* C05 三态状态环：带真实侧壁厚度的 16 边圆盘，环落在地块内切圆内不出界。
          顶面透明只留边框，不遮挡 E01 石材与塔体。 */}
      {data.highlight && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${tileSurfaceZ + 1}px)`,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <Prism3D
            sides={16}
            radius={60}
            height={3}
            start={0}
            topClassName={`va-ring ${data.highlight === 'target' ? 'target' : 'selectable'}`}
            topStyle={{ background: 'transparent', borderRadius: '50%' }}
            sideClassName="va-side-dark"
          />
        </div>
      )}

      {tilePoints.map((point, index) => {
        const next = tilePoints[(index + 1) % tilePoints.length]!;
        const edge = Math.hypot(next.x - point.x, next.y - point.y);
        const midX = (point.x + next.x) / 2;
        const midY = (point.y + next.y) / 2;
        const sideAngle = Math.atan2(next.y - point.y, next.x - point.x);
        return (
          <div
            key={index}
            className="va-tile-side"
            data-variant={data.isRavenShieldGround ? 'raven' : 'stone'}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: edge + 1,
              height: VISUAL_3D.tileHeight,
              marginLeft: -(edge + 1) / 2,
              marginTop: -VISUAL_3D.tileHeight / 2,
              transformOrigin: 'center center',
              transform: `translate3d(${midX}px, ${midY}px, ${
                VISUAL_3D.boardHeight + VISUAL_3D.tileHeight / 2
              }px) rotateZ(${sideAngle}rad) rotateX(90deg)`,
              zIndex: 0,
            }}
          />
        );
      })}

      {/* C01 渡鸦蓝圆徽：16 边圆盘 + 真实侧壁厚度（v2 §3.7 Ø18–22 · h3–4） */}
      {data.isRavenShieldGround && data.towerLayers.length === 0 && (
        <div
          title="乌鸦纹章地面位（乌鸦城堡可落点）"
          style={{
            position: 'absolute',
            left: 25,
            top: 25,
            width: 20,
            height: 20,
            // 落在 16 边形顶面内（内切半径 ~66），仅当地面纹章位无塔遮挡时显示
            transformStyle: 'preserve-3d',
            transform: `translateZ(${tileSurfaceZ + 3}px)`,
            zIndex: 30,
          }}
        >
          <Prism3D
            sides={16}
            radius={10}
            height={3}
            start={0}
            topClassName="va-raven"
            topStyle={{
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            sideClassName="va-side-dark"
            topChildren={<div className="va-raven-bird" style={{ width: 12, height: 9, opacity: 0.9 }} />}
          />
        </div>
      )}

      {data.setupCapacity > 0 && (
        <div
          title={`开局容量 ${data.setupCapacity} 名巫师`}
          style={{
            position: 'absolute',
            right: 26,
            bottom: 26,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '2px 6px 3px',
            borderRadius: 8,
            background: 'rgba(27,31,40,0.82)',
            border: '1px solid rgba(122,108,80,0.8)',
            fontSize: 10,
            fontWeight: 700,
            color: '#f5e9c8',
            textShadow: '0 1px 1px #000',
            transformStyle: 'preserve-3d',
            transform: `translateZ(${tileSurfaceZ + 3}px)`,
            zIndex: 30,
          }}
        >
          {/* C04 竖立烛焰：外层 rotateX(-90deg) 立起 + 底座烛台（v2 §3.7 7×11） */}
          <span style={{ position: 'relative', display: 'inline-block', width: 9, height: 13, transformStyle: 'preserve-3d' }}>
            <span style={{ position: 'absolute', inset: 0, transform: 'rotateX(-90deg)', transformStyle: 'preserve-3d' }}>
              <span className="va-flame" style={{ position: 'absolute', left: 1, bottom: 2 }} />
              <span className="va-flame-holder" style={{ position: 'absolute', bottom: -1, left: 0, width: 9, height: 3 }} />
            </span>
          </span>
          <span>{data.setupCapacity}</span>
        </div>
      )}

      {data.groundWizards.length > 0 && (
        <WizardCluster
          wizards={data.groundWizards}
          z={groundWizardZ}
          radius={26}
          data={data}
        />
      )}

      {/* A06 升腾魔力基座 + C03 星屑：塔底脱离的软阴影 + 蓝白符文环。
          世界平面里是正圆 Ø104（塔宽 80 的 1.3 倍），经 58° rotateX 透视后
          自然呈椭圆，与素材板里已投影的椭圆 rx=46 等价；不做 2D 椭圆贴片。 */}
      {data.towerLayers.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 104,
            height: 104,
            marginLeft: -52,
            marginTop: -52,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${tileSurfaceZ + 2}px)`,
            zIndex: 3,
            pointerEvents: 'none',
          }}
        >
          <div className="va-levitate-shadow" />
          <div className="va-levitate" style={{ position: 'absolute', inset: 0 }} />
          {/* C03 星屑：分布在真实不同 Z 层，外层承载 translateZ，内层做漂移动画 */}
          {([[12, 26, 2, '', 0, 6], [78, 64, 2, 'ruby', 1, 11], [48, 86, 1.5, '', 2, 16]] as const).map(
            ([left, top, size, tone, i, z]) => (
              <span
                key={i}
                style={{ position: 'absolute', left, top, transform: `translateZ(${z}px)`, transformStyle: 'preserve-3d' }}
              >
                <span
                  className="va-spark"
                  data-tone={tone || undefined}
                  style={{ position: 'relative', display: 'block', width: size, height: size, animationDelay: `${i * 0.9}s` }}
                />
              </span>
            ),
          )}
        </div>
      )}

      {data.towerLayers.map((layer, index) => (
        <div
          key={layer.towerId}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: VISUAL_3D.towerBaseWidth,
            height: VISUAL_3D.towerBaseWidth,
            marginLeft: -VISUAL_3D.towerBaseWidth / 2,
            marginTop: -VISUAL_3D.towerBaseWidth / 2,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${tileSurfaceZ + index * VISUAL_3D.towerLayerHeight}px)`,
            zIndex: 4 + index,
          }}
        >
          <Tower3D
            towerId={layer.towerId}
            hasRavenShield={layer.hasRavenShield}
            selectable={layer.selectableStart}
            inSlice={layer.inSlice}
            onClick={layer.onTowerClick}
            tier={layer.tier}
          />
        </div>
      ))}

      {data.topWizards.length > 0 && (
        <WizardCluster
          wizards={data.topWizards}
          z={topWizardZ}
          radius={24}
          data={data}
        />
      )}

      {data.castleHere && (
        <CastleMount z={tileSurfaceZ} />
      )}

      {data.castleOnTowerId && (
        <CastleMount z={topSurfaceZ} />
      )}

      <div
        className="va-space-index"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 22,
          marginLeft: -11,
          marginTop: -8,
          fontSize: 9,
          lineHeight: '14px',
          textAlign: 'center',
          borderRadius: 3,
          transform: `translateZ(${tileSurfaceZ + 5}px)`,
          zIndex: 9,
        }}
      >
        {data.spaceIndex}
      </div>
    </div>
  );
}

function tileFaceStyle(tileClip: string, data: SpaceCellData): CSSProperties {
  // C05 三态语义固定：目标 = 金实环、可选 = 绿虚线环、纹章 = 蓝符文环
  const border =
    data.highlight === 'target'
      ? '2px solid #e8b339'
      : data.highlight === 'selectable'
        ? '2px dashed #27ae60'
        : '1px solid rgba(108,116,130,0.65)';
  return {
    position: 'absolute',
    inset: 0,
    clipPath: tileClip,
    // 背景交给 .va-tile-face / [data-variant]（E01 暗石 + C02 内嵌符文环）
    border,
    boxShadow:
      data.highlight === 'target'
        ? '0 0 14px rgba(232,179,57,0.65), inset 0 2px 0 rgba(255,255,255,0.14)'
        : data.highlight === 'selectable'
          ? '0 0 10px rgba(39,174,96,0.4), inset 0 2px 0 rgba(255,255,255,0.14)'
          : undefined,
  };
}

function polygonPoints(count: number, radius: number, startAngle: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = startAngle + (index / count) * Math.PI * 2;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
}

function WizardCluster({
  wizards,
  z,
  radius,
  data,
}: {
  wizards: { wizardId: WizardID; ownerPlayerId: string }[];
  z: number;
  radius: number;
  data: SpaceCellData;
}) {
  return (
    <>
      {wizards.slice(0, 6).map((wizard, index) => {
        const point = wizardPoint(index, radius);
        const clickable =
          data.onWizardClick &&
          (data.selectableWizardOwnerId === undefined || wizard.ownerPlayerId === data.selectableWizardOwnerId);
        return (
          <div
            key={wizard.wizardId}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: -VISUAL_3D.wizardRadius,
              marginTop: -VISUAL_3D.wizardRadius,
              transformStyle: 'preserve-3d',
              transform: `translate3d(${point.x}px, ${point.y}px, ${z}px) rotateX(-90deg)`,
              zIndex: 12 + index,
              pointerEvents: 'auto',
            }}
          >
            <Wizard3D
              wizardId={wizard.wizardId}
              ownerPlayerId={wizard.ownerPlayerId}
              highlight={data.highlightWizards?.has(wizard.wizardId)}
              dimmed={!!data.onWizardClick && !clickable}
              onClick={clickable ? () => data.onWizardClick!(wizard.wizardId) : undefined}
            />
          </div>
        );
      })}
    </>
  );
}

function CastleMount({ z }: { z: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: VISUAL_3D.castleSize,
        height: VISUAL_3D.castleSize,
        marginLeft: -VISUAL_3D.castleSize / 2,
        marginTop: -VISUAL_3D.castleSize / 2,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${z}px)`,
        zIndex: 20,
      }}
    >
      <Castle3D />
    </div>
  );
}

function wizardPoint(index: number, radius: number) {
  if (index === 0) return { x: 0, y: 0 };
  const angle = ((index - 1) / 5) * Math.PI * 2 - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}
