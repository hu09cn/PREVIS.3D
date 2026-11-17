import * as THREE from 'three';
import type {
  RoadConfig,
  TerrainBrushMaterial,
  TerrainBrushTool,
  TerrainConfig,
} from '../types/scene';
import {
  getProceduralGroundY,
  getTerrainSize,
  SCULPT_GRID_DEFAULT,
  TERRAIN_MATERIAL_CODE,
  writeBiomeVertexColor,
} from './terrain';

export interface SculptStrokeInput {
  hitX: number;
  hitZ: number;
  anchorY: number;
  tool: TerrainBrushTool;
  material: TerrainBrushMaterial;
  radius: number;
  strength: number;
  falloff: number;
  invert: boolean;
  shiftSmooth: boolean;
}

const MIN_DELTA = -35;
const MAX_DELTA = 120;

/**
 * Computes ZBrush-style focal falloff in [0, 1] from normalized radial distance rNorm (0 at center, 1 at rim).
 */
function computeBrushFalloff(rNorm: number, falloff: number): number {
  if (rNorm >= 1) return 0;
  const plateauRatio = Math.max(0.02, Math.min(0.85, 1 - falloff));
  if (rNorm <= plateauRatio) {
    // Gentle dome inside focal plateau
    const t = rNorm / plateauRatio;
    return 1 - 0.12 * t * t;
  }
  const edgeT = (rNorm - plateauRatio) / Math.max(0.001, 1 - plateauRatio);
  const s = 1 - edgeT;
  return 0.88 * s * s * (3 - 2 * s);
}

/**
 * Applies one ZBrush-style terrain sculpt dab directly to `deltas` and updates
 * the Three.js terrain BufferGeometry positions, biome colors, and vertex normals.
 */
export function applyTerrainSculptDab(
  geometry: THREE.BufferGeometry,
  deltas: Float32Array,
  terrain: TerrainConfig,
  road: RoadConfig,
  stroke: SculptStrokeInput,
  paints?: Uint8Array | null
): boolean {
  const res = terrain.sculptGridRes ?? SCULPT_GRID_DEFAULT;
  const stride = res + 1;
  if (deltas.length < stride * stride) return false;

  const posAttr = geometry.attributes.position as THREE.BufferAttribute | undefined;
  const colAttr = geometry.attributes.color as THREE.BufferAttribute | undefined;
  const waterMaskAttr = geometry.attributes.aWaterMask as THREE.BufferAttribute | undefined;
  if (!posAttr || !colAttr || posAttr.count < stride * stride) return false;

  const worldSize = getTerrainSize(terrain);
  const worldHalf = worldSize * 0.5;
  const cellSize = worldSize / res;
  const radius = Math.max(1.5, Math.min(150, stroke.radius));
  const minI = Math.max(0, Math.floor((stroke.hitX - radius + worldHalf) / cellSize));
  const maxI = Math.min(res, Math.ceil((stroke.hitX + radius + worldHalf) / cellSize));
  const minJ = Math.max(0, Math.floor((stroke.hitZ - radius + worldHalf) / cellSize));
  const maxJ = Math.min(res, Math.ceil((stroke.hitZ + radius + worldHalf) / cellSize));

  const effectiveTool: TerrainBrushTool = stroke.shiftSmooth ? 'smooth' : stroke.tool;
  const dir = stroke.invert ? -1 : 1;
  const strength = Math.max(0.02, Math.min(1, stroke.strength));
  const tempColor = new THREE.Color();

  // For Smooth / Pinch we read a small snapshot first so neighbor reads stay order-independent
  let snapshotY: Float32Array | null = null;
  if (effectiveTool === 'smooth' || effectiveTool === 'pinch') {
    const padMinI = Math.max(0, minI - 1);
    const padMaxI = Math.min(res, maxI + 1);
    const padMinJ = Math.max(0, minJ - 1);
    const padMaxJ = Math.min(res, maxJ + 1);
    snapshotY = new Float32Array(posAttr.count);
    for (let j = padMinJ; j <= padMaxJ; j++) {
      for (let i = padMinI; i <= padMaxI; i++) {
        const idx = j * stride + i;
        snapshotY[idx] = posAttr.getY(idx);
      }
    }
  }

  let heightModified = false;
  let paintModified = false;
  const targetPaintCode = TERRAIN_MATERIAL_CODE[stroke.material] ?? 0;
  const canPaint = Boolean(paints && paints.length >= stride * stride);

  for (let j = minJ; j <= maxJ; j++) {
    for (let i = minI; i <= maxI; i++) {
      const idx = j * stride + i;
      const vx = posAttr.getX(idx);
      const vz = posAttr.getZ(idx);
      const dist = Math.hypot(vx - stroke.hitX, vz - stroke.hitZ);
      if (dist >= radius) continue;

      const rNorm = dist / radius;
      const w = computeBrushFalloff(rNorm, stroke.falloff);
      if (w <= 0.0001) continue;

      const curDelta = deltas[idx];
      const curY = posAttr.getY(idx);
      const baseY = curY - curDelta;
      let nextDelta = curDelta;

      switch (effectiveTool) {
        case 'paint': {
          // Pure surface material brush without distorting terrain elevation
          break;
        }
        case 'clay': {
          // Flat-topped clay buildup (great for hills & ramps)
          const clayWeight = Math.min(1, w * 1.18);
          nextDelta = curDelta + dir * strength * 0.58 * clayWeight;
          break;
        }
        case 'standard': {
          // Bell-shaped smooth elevation
          const bell = Math.cos(rNorm * Math.PI * 0.5);
          nextDelta = curDelta + dir * strength * 0.5 * bell * bell;
          break;
        }
        case 'carve': {
          // When painting Water, excavate cleanly toward a natural -2.35m lake/river basin floor
          if (stroke.material === 'water' && !stroke.invert) {
            const basinFloorY = -2.35;
            if (curY > basinFloorY) {
              const targetY = Math.max(
                basinFloorY,
                curY - strength * 0.65 * Math.pow(w, 1.2)
              );
              nextDelta = targetY - baseY;
            }
          } else {
            // Focused trench / riverbed excavation
            nextDelta = curDelta - dir * strength * 0.65 * Math.pow(w, 1.35);
          }
          break;
        }
        case 'flatten': {
          // Blend total ground Y smoothly toward stroke anchor elevation
          const targetY = stroke.anchorY;
          const nextY = curY + (targetY - curY) * Math.min(0.92, strength * 0.72 * w);
          nextDelta = nextY - baseY;
          break;
        }
        case 'plateau': {
          // Crisp terraced step toward anchor + lift
          const stepSign = dir;
          const targetPlateauY = stroke.anchorY + stepSign * 2.8;
          const mesaWeight = Math.min(1, Math.pow(w, 0.45));
          const nextY = curY + (targetPlateauY - curY) * Math.min(0.85, strength * 0.45 * mesaWeight);
          nextDelta = nextY - baseY;
          break;
        }
        case 'smooth': {
          if (snapshotY) {
            const left = snapshotY[j * stride + Math.max(0, i - 1)];
            const right = snapshotY[j * stride + Math.min(res, i + 1)];
            const up = snapshotY[Math.max(0, j - 1) * stride + i];
            const down = snapshotY[Math.min(res, j + 1) * stride + i];
            const avgY = (left + right + up + down) * 0.25;
            const nextY = curY + (avgY - curY) * Math.min(0.9, strength * 0.8 * w);
            nextDelta = nextY - baseY;
          }
          break;
        }
        case 'pinch': {
          if (snapshotY) {
            const left = snapshotY[j * stride + Math.max(0, i - 1)];
            const right = snapshotY[j * stride + Math.min(res, i + 1)];
            const up = snapshotY[Math.max(0, j - 1) * stride + i];
            const down = snapshotY[Math.min(res, j + 1) * stride + i];
            const avgY = (left + right + up + down) * 0.25;
            const contrast = curY - avgY;
            const pinchBoost = dir * strength * 0.35 * (1 - rNorm) + contrast * strength * 0.45 * w;
            nextDelta = curDelta + pinchBoost;
          }
          break;
        }
        case 'erase': {
          nextDelta = curDelta * (1 - Math.min(0.95, strength * 0.75 * w));
          if (Math.abs(nextDelta) < 0.004) nextDelta = 0;
          break;
        }
      }

      nextDelta = Math.max(MIN_DELTA, Math.min(MAX_DELTA, nextDelta));
      const nextY = baseY + nextDelta;
      if (Math.abs(nextDelta - curDelta) > 1e-5) {
        deltas[idx] = nextDelta;
        posAttr.setY(idx, nextY);
        heightModified = true;
      }

      // Apply or clear painted surface material consistently across the active brush footprint
      if (canPaint && paints) {
        const curCode = paints[idx];
        let nextCode = curCode;
        if (effectiveTool === 'erase') {
          if (w >= 0.08) nextCode = 0;
        } else if (effectiveTool !== 'smooth' && !stroke.shiftSmooth) {
          if (stroke.material === 'water') {
            if (w >= 0.08) {
              nextCode = TERRAIN_MATERIAL_CODE.water;
            }
          } else if (stroke.material === 'auto') {
            if (effectiveTool === 'paint' && w >= 0.08) {
              nextCode = 0;
            }
          } else if (w >= 0.08) {
            nextCode = targetPaintCode;
          }
        }
        if (nextCode !== curCode) {
          paints[idx] = nextCode;
          paintModified = true;
        }
      }
    }
  }

  if (heightModified || paintModified) {
    // Refresh biome & painted vertex colors + glossy water mask on sculpted region + 1-cell border
    const padMinI = Math.max(0, minI - 1);
    const padMaxI = Math.min(res, maxI + 1);
    const padMinJ = Math.max(0, minJ - 1);
    const padMaxJ = Math.min(res, maxJ + 1);
    const cellSpan = cellSize * 2;
    for (let j = padMinJ; j <= padMaxJ; j++) {
      const zPrev = Math.max(0, j - 1);
      const zNext = Math.min(res, j + 1);
      for (let i = padMinI; i <= padMaxI; i++) {
        const xPrev = Math.max(0, i - 1);
        const xNext = Math.min(res, i + 1);
        const idx = j * stride + i;
        const vx = posAttr.getX(idx);
        const vy = posAttr.getY(idx);
        const vz = posAttr.getZ(idx);
        const dx = (posAttr.getY(j * stride + xNext) - posAttr.getY(j * stride + xPrev)) / cellSpan;
        const dz = (posAttr.getY(zNext * stride + i) - posAttr.getY(zPrev * stride + i)) / cellSpan;
        const slope = 1 - 1 / Math.sqrt(1 + dx * dx + dz * dz);
        const paintCode = canPaint && paints ? paints[idx] : 0;
        if (waterMaskAttr) {
          waterMaskAttr.setX(idx, paintCode === TERRAIN_MATERIAL_CODE.water ? 1 : 0);
        }
        writeBiomeVertexColor(vx, vy, vz, terrain, road, tempColor, slope, paintCode);
        colAttr.setXYZ(idx, tempColor.r, tempColor.g, tempColor.b);
      }
    }
    if (heightModified) {
      posAttr.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    if (waterMaskAttr && paintModified) {
      waterMaskAttr.needsUpdate = true;
    }
    colAttr.needsUpdate = true;
  }
  return heightModified || paintModified;
}

/**
 * Rebuilds deltas array cleanly when starting from existing TerrainConfig or empty ground.
 */
export function ensureSculptDeltaBuffer(terrain: TerrainConfig): Float32Array {
  const res = terrain.sculptGridRes ?? SCULPT_GRID_DEFAULT;
  const len = (res + 1) * (res + 1);
  const arr = new Float32Array(len);
  if (terrain.sculptDeltas && terrain.sculptDeltas.length > 0) {
    const count = Math.min(len, terrain.sculptDeltas.length);
    for (let i = 0; i < count; i++) {
      arr[i] = terrain.sculptDeltas[i] || 0;
    }
  }
  return arr;
}

/**
 * Converts runtime Float32Array back to compact rounded number[] for IndexedDB & JSON persistence.
 */
export function serializeSculptDeltas(deltas: Float32Array): number[] {
  let hasNonZero = false;
  const out = new Array<number>(deltas.length);
  for (let i = 0; i < deltas.length; i++) {
    const rounded = Math.round(deltas[i] * 1000) / 1000;
    out[i] = rounded;
    if (rounded !== 0) hasNonZero = true;
  }
  return hasNonZero ? out : [];
}

/**
 * Rebuilds surface paint material byte buffer cleanly from TerrainConfig.
 */
export function ensurePaintMaterialBuffer(terrain: TerrainConfig): Uint8Array {
  const res = terrain.sculptGridRes ?? SCULPT_GRID_DEFAULT;
  const len = (res + 1) * (res + 1);
  const arr = new Uint8Array(len);
  if (terrain.paintMaterials && terrain.paintMaterials.length > 0) {
    const count = Math.min(len, terrain.paintMaterials.length);
    for (let i = 0; i < count; i++) {
      arr[i] = terrain.paintMaterials[i] || 0;
    }
  }
  return arr;
}

/**
 * Serializes runtime Uint8Array paint materials back to compact number[] for IndexedDB storage.
 */
export function serializePaintMaterials(paints: Uint8Array): number[] {
  let hasNonZero = false;
  const out = new Array<number>(paints.length);
  for (let i = 0; i < paints.length; i++) {
    const val = paints[i];
    out[i] = val;
    if (val !== 0) hasNonZero = true;
  }
  return hasNonZero ? out : [];
}

/**
 * Samples procedural + runtime sculpt delta height directly at (x, z) during live brush strokes.
 */
export function sampleLiveTerrainY(
  x: number,
  z: number,
  terrain: TerrainConfig,
  road: RoadConfig,
  liveDeltas: Float32Array | null
): number {
  const base = getProceduralGroundY(x, z, terrain, road);
  if (!liveDeltas || liveDeltas.length === 0) return base;
  const res = terrain.sculptGridRes ?? SCULPT_GRID_DEFAULT;
  const stride = res + 1;
  const worldSize = getTerrainSize(terrain);
  const worldHalf = worldSize * 0.5;
  const u = Math.max(0, Math.min(1, (x + worldHalf) / worldSize));
  const v = Math.max(0, Math.min(1, (z + worldHalf) / worldSize));
  const gx = u * res;
  const gz = v * res;
  const x0 = Math.min(res - 1, Math.floor(gx));
  const z0 = Math.min(res - 1, Math.floor(gz));
  const tx = gx - x0;
  const tz = gz - z0;
  const h00 = liveDeltas[z0 * stride + x0] ?? 0;
  const h10 = liveDeltas[z0 * stride + x0 + 1] ?? 0;
  const h01 = liveDeltas[(z0 + 1) * stride + x0] ?? 0;
  const h11 = liveDeltas[(z0 + 1) * stride + x0 + 1] ?? 0;
  return base + (h00 + (h10 - h00) * tx) * (1 - tz) + (h01 + (h11 - h01) * tx) * tz;
}
