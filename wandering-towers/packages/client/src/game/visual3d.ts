export const VISUAL_3D = {
  boardRadius: 460,
  boardHeight: 28,
  boardRimDepth: 34,

  tileRadius: 74,
  tileHeight: 10,
  tileRingRadius: 342,

  towerBaseWidth: 80,
  towerTopWidth: 76,
  towerLayerHeight: 44,
  towerSideDepth: 7,
  maxTowerLayers: 9,

  castleSize: 58,
  castleHeight: 48,

  wizardRadius: 8,
  wizardHeight: 30,
  wizardHeadRadius: 4,
  wizardGridGap: 5,

  cameraPitchDeg: 58,
  pitchMinDeg: 34,
  pitchMaxDeg: 72,
  perspective: 1200,
  perspectiveOriginY: 40,

  zoomMin: 0.48,
  zoomMax: 3.2,
  zoomStep: 1.1,

  worldSize: 980,
  safeMarginTop: 170,
  safeMarginBottom: 70,
} as const;

export const tileSurfaceZ = VISUAL_3D.boardHeight + VISUAL_3D.tileHeight;

export function towerStackHeight(layerCount: number): number {
  return Math.max(0, layerCount) * VISUAL_3D.towerLayerHeight;
}

export function fitWorldZoom(viewportSide: number): number {
  const pitchRad = (VISUAL_3D.cameraPitchDeg * Math.PI) / 180;
  const tallestStack =
    VISUAL_3D.boardHeight +
    VISUAL_3D.tileHeight +
    towerStackHeight(VISUAL_3D.maxTowerLayers) +
    VISUAL_3D.castleHeight +
    VISUAL_3D.wizardHeight;
  const projectedHeight = tallestStack * Math.cos(pitchRad);
  const effectiveSize =
    VISUAL_3D.worldSize + VISUAL_3D.safeMarginTop + VISUAL_3D.safeMarginBottom + projectedHeight;
  return viewportSide / effectiveSize;
}
