import * as THREE from 'three';
import { getGroundY } from './terrain';
import type { PaintedRoadStyle, RoadConfig, TerrainConfig, Vec3 } from '../types/scene';

export interface RoadBrushPresetMeta {
  style: PaintedRoadStyle;
  label: string;
  labelEn: string;
  defaultWidth: number;
  desc: string;
  descEn: string;
}

export const ROAD_BRUSH_PRESETS: RoadBrushPresetMeta[] = [
  { style: 'asphalt_2lane', label: '两车道柏油路', labelEn: '2-Lane Asphalt', defaultWidth: 8, desc: '双向虚线 + 两侧路牙', descEn: 'Dashed centerline + twin curbs' },
  { style: 'asphalt_4lane', label: '四车道主干道', labelEn: '4-Lane Arterial', defaultWidth: 14, desc: '双黄线 + 四车道', descEn: 'Double yellow line + 4 lanes' },
  { style: 'highway', label: '封闭高速公路', labelEn: 'Divided Highway', defaultWidth: 16, desc: '中央隔离墩 + 护栏', descEn: 'Center median + guardrails' },
  { style: 'cobble', label: '石板古街巷', labelEn: 'Cobblestone Alley', defaultWidth: 5, desc: '青石路面 + 矮路牙', descEn: 'Stone pavers + low curbs' },
  { style: 'dirt', label: '乡间泥土路', labelEn: 'Country Dirt Road', defaultWidth: 4.5, desc: '自然土路贴合地形', descEn: 'Natural terrain-hugging dirt' },
  { style: 'sidewalk', label: '人行林荫步道', labelEn: 'Paved Sidewalk', defaultWidth: 3.2, desc: '抬高混凝土人行道', descEn: 'Raised concrete walkway' },
  { style: 'viaduct', label: '高架桥公路', labelEn: 'Elevated Viaduct', defaultWidth: 10, desc: '架空路面 + 自动桥墩', descEn: 'Elevated deck + auto piers' },
  { style: 'rail', label: '铁路铁轨线', labelEn: 'Railway Track', defaultWidth: 3.6, desc: '碎石道床 + 枕木铁轨', descEn: 'Ballast bed + steel rails' },
];

export function getRoadBrushPreset(style: PaintedRoadStyle): RoadBrushPresetMeta {
  return ROAD_BRUSH_PRESETS.find((r) => r.style === style) ?? ROAD_BRUSH_PRESETS[0];
}

/** Smooth and resample dense pointer samples into clean polyline points. */
export function simplifyAndSmoothStroke(rawPoints: Vec3[], minStep = 1.6): Vec3[] {
  if (rawPoints.length <= 2) return rawPoints;
  const filtered: Vec3[] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length - 1; i++) {
    const prev = filtered[filtered.length - 1];
    const cur = rawPoints[i];
    if (Math.hypot(cur[0] - prev[0], cur[2] - prev[2]) >= minStep) {
      filtered.push(cur);
    }
  }
  const last = rawPoints[rawPoints.length - 1];
  const prevEnd = filtered[filtered.length - 1];
  if (Math.hypot(last[0] - prevEnd[0], last[2] - prevEnd[2]) > 0.35 || filtered.length === 1) {
    filtered.push(last);
  }
  if (filtered.length < 3) return filtered;

  // Two-pass Chaikin corner-cutting for silky curves while preserving exact start/end
  let curPts: Vec3[] = filtered;
  for (let pass = 0; pass < 2; pass++) {
    if (curPts.length < 3) break;
    const dense: Vec3[] = [curPts[0]];
    for (let i = 0; i < curPts.length - 1; i++) {
      const a = curPts[i];
      const b = curPts[i + 1];
      if (i > 0) {
        dense.push([
          Number((a[0] * 0.75 + b[0] * 0.25).toFixed(2)),
          Number((a[1] * 0.75 + b[1] * 0.25).toFixed(2)),
          Number((a[2] * 0.75 + b[2] * 0.25).toFixed(2)),
        ]);
      }
      if (i < curPts.length - 2) {
        dense.push([
          Number((a[0] * 0.25 + b[0] * 0.75).toFixed(2)),
          Number((a[1] * 0.25 + b[1] * 0.75).toFixed(2)),
          Number((a[2] * 0.25 + b[2] * 0.75).toFixed(2)),
        ]);
      }
    }
    dense.push(curPts[curPts.length - 1]);
    curPts = dense;
  }
  return curPts;
}

export function groundPolylinePoints(
  points: Vec3[],
  terrain: TerrainConfig,
  road: RoadConfig,
  yOffset = 0,
  maxSegmentLen = 1.4
): Vec3[] {
  if (points.length === 0) return [];
  const resampled: Vec3[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dist = Math.hypot(b[0] - a[0], b[2] - a[2]);
    if (dist > maxSegmentLen) {
      const steps = Math.ceil(dist / maxSegmentLen);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        resampled.push([
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          a[2] + (b[2] - a[2]) * t,
        ]);
      }
    }
    resampled.push(b);
  }
  return resampled.map(([x, , z]) => [
    Number(x.toFixed(2)),
    Number((getGroundY(x, z, terrain, road) + yOffset).toFixed(2)),
    Number(z.toFixed(2)),
  ]);
}

function computeXZFrames(points: Vec3[]): { tx: number; tz: number; nx: number; nz: number }[] {
  const n = points.length;
  const frames: { tx: number; tz: number; nx: number; nz: number }[] = [];
  for (let i = 0; i < n; i++) {
    const pPrev = points[Math.max(0, i - 1)];
    const pNext = points[Math.min(n - 1, i + 1)];
    let dx = pNext[0] - pPrev[0];
    let dz = pNext[2] - pPrev[2];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    // Right perpendicular in XZ
    frames.push({ tx: dx, tz: dz, nx: -dz, nz: dx });
  }
  return frames;
}

export interface RoadCrossFrame {
  cx: number;
  cz: number;
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  centerY: number;
  crossSlope: number; // dy per lateral meter (+right)
  minGroundL: number;
  minGroundR: number;
}

/**
 * Computes terrain-conforming cross-section frames across the full road width:
 * - Samples ground height across [-halfW, +halfW] so no hillside pokes through either road edge.
 * - Applies comfortable clamped banking + longitudinal smoothing for smooth uphill/downhill grading.
 * - Anchors downhill ground heights for solid retaining skirts without floating air gaps.
 */
export function computeRoadCrossFrames(
  points: Vec3[],
  deckWidth: number,
  sampleGroundY?: (x: number, z: number) => number,
  options?: { maxCrossSlope?: number; clearance?: number }
): RoadCrossFrame[] {
  const n = points.length;
  if (n < 2) return [];
  const xz = computeXZFrames(points);
  const halfW = Math.max(0.5, deckWidth * 0.5);
  const maxSlope = options?.maxCrossSlope ?? 0.22;
  const minClear = options?.clearance ?? 0.14;

  const rawSlopes: number[] = [];
  const minFloors: number[] = [];
  const minLList: number[] = [];
  const minRList: number[] = [];

  for (let i = 0; i < n; i++) {
    const [cx, py, cz] = points[i];
    const { nx, nz } = xz[i];
    if (!sampleGroundY) {
      rawSlopes.push(0);
      minFloors.push(py);
      minLList.push(py - 0.5);
      minRList.push(py - 0.5);
      continue;
    }

    const hL = sampleGroundY(cx - nx * (halfW + 0.35), cz - nz * (halfW + 0.35));
    const hML = sampleGroundY(cx - nx * halfW * 0.5, cz - nz * halfW * 0.5);
    const hC = sampleGroundY(cx, cz);
    const hMR = sampleGroundY(cx + nx * halfW * 0.5, cz + nz * halfW * 0.5);
    const hR = sampleGroundY(cx + nx * (halfW + 0.35), cz + nz * (halfW + 0.35));

    const slope = Math.max(
      -maxSlope,
      Math.min(maxSlope, ((hR - hL) / Math.max(1, deckWidth)) * 0.72)
    );
    rawSlopes.push(slope);

    const floorY = Math.max(
      py,
      hL + minClear - slope * -halfW,
      hML + minClear - slope * (-halfW * 0.5),
      hC + minClear,
      hMR + minClear - slope * (halfW * 0.5),
      hR + minClear - slope * halfW
    );
    minFloors.push(floorY);
    minLList.push(Math.min(hL, hML, hC));
    minRList.push(Math.min(hR, hMR, hC));
  }

  // Smooth cross-slope & deck elevation along the road without ever dropping below terrain floor
  const smoothSlopes = [...rawSlopes];
  for (let pass = 0; pass < 2; pass++) {
    const prev = [...smoothSlopes];
    for (let i = 1; i < n - 1; i++) {
      smoothSlopes[i] = prev[i - 1] * 0.25 + prev[i] * 0.5 + prev[i + 1] * 0.25;
    }
  }

  // Re-evaluate required floor after cross-slope smoothing
  const requiredFloors = [...minFloors];
  if (sampleGroundY) {
    for (let i = 0; i < n; i++) {
      const [cx, py, cz] = points[i];
      const { nx, nz } = xz[i];
      const sl = smoothSlopes[i];
      const hL = sampleGroundY(cx - nx * (halfW + 0.35), cz - nz * (halfW + 0.35));
      const hML = sampleGroundY(cx - nx * halfW * 0.5, cz - nz * halfW * 0.5);
      const hC = sampleGroundY(cx, cz);
      const hMR = sampleGroundY(cx + nx * halfW * 0.5, cz + nz * halfW * 0.5);
      const hR = sampleGroundY(cx + nx * (halfW + 0.35), cz + nz * (halfW + 0.35));
      requiredFloors[i] = Math.max(
        py,
        hL + minClear - sl * -halfW,
        hML + minClear - sl * (-halfW * 0.5),
        hC + minClear,
        hMR + minClear - sl * (halfW * 0.5),
        hR + minClear - sl * halfW
      );
    }
  }

  const smoothY = [...requiredFloors];
  for (let pass = 0; pass < 2; pass++) {
    const prev = [...smoothY];
    for (let i = 1; i < n - 1; i++) {
      const avg = prev[i - 1] * 0.25 + prev[i] * 0.5 + prev[i + 1] * 0.25;
      smoothY[i] = Math.max(requiredFloors[i], avg);
    }
  }

  return points.map(([cx, , cz], i) => ({
    cx,
    cz,
    tx: xz[i].tx,
    tz: xz[i].tz,
    nx: xz[i].nx,
    nz: xz[i].nz,
    centerY: smoothY[i],
    crossSlope: smoothSlopes[i],
    minGroundL: minLList[i],
    minGroundR: minRList[i],
  }));
}

/**
 * Builds an extruded, watertight 3D road ribbon with outward CCW winding,
 * anti-fold corner clamping, terrain-conforming cross-slope, and grounded skirts.
 */
export function buildRoadRibbonGeometry(
  points: Vec3[],
  width: number,
  thickness = 0.14,
  yTopOffset = 0.06,
  lateralShift = 0,
  options?: {
    roadFrames?: RoadCrossFrame[];
    anchorSkirtToGround?: boolean;
  }
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  if (points.length < 2) return geo;

  const frames =
    options?.roadFrames && options.roadFrames.length === points.length
      ? options.roadFrames
      : computeRoadCrossFrames(points, Math.max(width, Math.abs(lateralShift) * 2 + width));
  const halfW = width * 0.5;
  const anchorSkirt = options?.anchorSkirtToGround ?? false;
  const positions: number[] = [];
  const indices: number[] = [];

  let prevLx = 0;
  let prevLz = 0;
  let prevRx = 0;
  let prevRz = 0;

  // 8 vertices per cross-section so each face keeps independent normals:
  // 0: topL, 1: topR, 2: botL, 3: botR, 4: sideL_top, 5: sideL_bot, 6: sideR_top, 7: sideR_bot
  const stride = 8;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const cx = f.cx + f.nx * lateralShift;
    const cz = f.cz + f.nz * lateralShift;
    let lx = cx - f.nx * halfW;
    let lz = cz - f.nz * halfW;
    let rx = cx + f.nx * halfW;
    let rz = cz + f.nz * halfW;

    // Anti-fold miter clamp: prevent inner turn edge from reversing behind previous cross-section
    if (i > 0) {
      const segDx = f.cx - frames[i - 1].cx;
      const segDz = f.cz - frames[i - 1].cz;
      const segLen = Math.hypot(segDx, segDz);
      if (segLen > 0.05) {
        const utx = segDx / segLen;
        const utz = segDz / segLen;
        const dotL = (lx - prevLx) * utx + (lz - prevLz) * utz;
        if (dotL < 0.04) {
          const pushL = 0.04 - dotL;
          lx += utx * pushL;
          lz += utz * pushL;
        }
        const dotR = (rx - prevRx) * utx + (rz - prevRz) * utz;
        if (dotR < 0.04) {
          const pushR = 0.04 - dotR;
          rx += utx * pushR;
          rz += utz * pushR;
        }
      }
    }
    prevLx = lx;
    prevLz = lz;
    prevRx = rx;
    prevRz = rz;

    const offL = lateralShift - halfW;
    const offR = lateralShift + halfW;
    const topYL = f.centerY + f.crossSlope * offL + yTopOffset;
    const topYR = f.centerY + f.crossSlope * offR + yTopOffset;
    const botYL = anchorSkirt
      ? Math.min(topYL - thickness, f.minGroundL - 0.65)
      : topYL - thickness;
    const botYR = anchorSkirt
      ? Math.min(topYR - thickness, f.minGroundR - 0.65)
      : topYR - thickness;

    positions.push(
      lx, topYL, lz, // 0 topL
      rx, topYR, rz, // 1 topR
      lx, botYL, lz, // 2 botL
      rx, botYR, rz, // 3 botR
      lx, topYL, lz, // 4 sideL_top
      lx, botYL, lz, // 5 sideL_bot
      rx, topYR, rz, // 6 sideR_top
      rx, botYR, rz  // 7 sideR_bot
    );
  }

  for (let i = 0; i < frames.length - 1; i++) {
    const a = i * stride;
    const b = (i + 1) * stride;
    // Top surface (+Y outward CCW)
    indices.push(a + 0, a + 1, b + 0);
    indices.push(a + 1, b + 1, b + 0);
    // Bottom surface (-Y outward CCW)
    indices.push(a + 2, b + 2, a + 3);
    indices.push(a + 3, b + 2, b + 3);
    // Left skirt (-R outward CCW)
    indices.push(a + 5, a + 4, b + 5);
    indices.push(a + 4, b + 4, b + 5);
    // Right skirt (+R outward CCW)
    indices.push(a + 6, a + 7, b + 6);
    indices.push(a + 7, b + 7, b + 6);
  }

  // Dedicated cap vertices for crisp start (-T) & end (+T) normals
  const capBase = positions.length / 3;
  const s0 = 0;
  const sEnd = (frames.length - 1) * stride;
  positions.push(
    positions[s0 * 3], positions[s0 * 3 + 1], positions[s0 * 3 + 2],
    positions[s0 * 3 + 3], positions[s0 * 3 + 4], positions[s0 * 3 + 5],
    positions[s0 * 3 + 6], positions[s0 * 3 + 7], positions[s0 * 3 + 8],
    positions[s0 * 3 + 9], positions[s0 * 3 + 10], positions[s0 * 3 + 11],
    positions[sEnd * 3], positions[sEnd * 3 + 1], positions[sEnd * 3 + 2],
    positions[sEnd * 3 + 3], positions[sEnd * 3 + 4], positions[sEnd * 3 + 5],
    positions[sEnd * 3 + 6], positions[sEnd * 3 + 7], positions[sEnd * 3 + 8],
    positions[sEnd * 3 + 9], positions[sEnd * 3 + 10], positions[sEnd * 3 + 11]
  );
  // Start cap (-T outward)
  indices.push(capBase + 0, capBase + 2, capBase + 1, capBase + 1, capBase + 2, capBase + 3);
  // End cap (+T outward)
  indices.push(capBase + 4, capBase + 5, capBase + 6, capBase + 5, capBase + 7, capBase + 6);

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

export interface StampedRibbonTransform {
  position: Vec3;
  rotationY: number;
  pitchX: number;
  rollZ: number;
  length: number;
}

/** Samples evenly spaced transforms along precomputed RoadCrossFrames (preserving bank rollZ). */
export function sampleAlongRoadFrames(
  frames: RoadCrossFrame[],
  stepMeters: number,
  yOffset = 0
): StampedRibbonTransform[] {
  if (frames.length < 2 || stepMeters <= 0.1) return [];
  const results: StampedRibbonTransform[] = [];
  let carry = stepMeters * 0.5;

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    const dx = b.cx - a.cx;
    const dy = b.centerY - a.centerY;
    const dz = b.cz - a.cz;
    const segLen = Math.hypot(dx, dz);
    if (segLen < 0.05) continue;

    const rotY = Math.atan2(dx, dz);
    const pitchX = -Math.atan2(dy, segLen);
    let dist = carry;
    while (dist <= segLen) {
      const t = dist / segLen;
      const crossSlope = a.crossSlope + (b.crossSlope - a.crossSlope) * t;
      results.push({
        position: [a.cx + dx * t, a.centerY + dy * t + yOffset, a.cz + dz * t],
        rotationY: rotY,
        pitchX,
        rollZ: -Math.atan(crossSlope),
        length: segLen,
      });
      dist += stepMeters;
    }
    carry = dist - segLen;
  }

  return results;
}

/** Samples evenly spaced transforms along polyline for lane dashes, ties, or bridge piers. */
export function sampleAlongPolyline(
  points: Vec3[],
  stepMeters: number,
  yOffset = 0
): StampedRibbonTransform[] {
  if (points.length < 2 || stepMeters <= 0.1) return [];
  const results: StampedRibbonTransform[] = [];
  let carry = stepMeters * 0.5;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const segLen = Math.hypot(dx, dz);
    if (segLen < 0.05) continue;

    const rotY = Math.atan2(dx, dz);
    const pitchX = -Math.atan2(dy, segLen);
    let dist = carry;
    while (dist <= segLen) {
      const t = dist / segLen;
      results.push({
        position: [a[0] + dx * t, a[1] + dy * t + yOffset, a[2] + dz * t],
        rotationY: rotY,
        pitchX,
        rollZ: 0,
        length: segLen,
      });
      dist += stepMeters;
    }
    carry = dist - segLen;
  }

  return results;
}

/**
 * Walks along a polyline in exact segmentLength chords so each barrier/wall unit
 * connects end-to-end continuously across flat ground and slopes.
 */
export function sampleFenceSegmentsAlongPolyline(
  points: Vec3[],
  segmentLength: number,
  spanAxis: 'x' | 'z',
  terrain: TerrainConfig,
  road: RoadConfig
): { position: Vec3; rotationY: number }[] {
  if (points.length < 2) return [];
  const step = Math.max(0.8, segmentLength * 0.96);

  // Build cumulative arc lengths along polyline
  const cumLen: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    cumLen.push(cumLen[i - 1] + Math.hypot(b[0] - a[0], b[2] - a[2]));
  }
  const totalLen = cumLen[cumLen.length - 1];
  if (totalLen < 0.35) return [];

  const sampleAt = (s: number): [number, number] => {
    const clamped = Math.max(0, Math.min(totalLen, s));
    for (let i = 1; i < cumLen.length; i++) {
      if (clamped <= cumLen[i] || i === cumLen.length - 1) {
        const span = Math.max(0.0001, cumLen[i] - cumLen[i - 1]);
        const t = (clamped - cumLen[i - 1]) / span;
        return [
          points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t,
          points[i - 1][2] + (points[i][2] - points[i - 1][2]) * t,
        ];
      }
    }
    return [points[0][0], points[0][2]];
  };

  const count = Math.max(1, Math.round(totalLen / step));
  const actualStep = totalLen / count;
  const out: { position: Vec3; rotationY: number }[] = [];

  for (let i = 0; i < count; i++) {
    const s0 = i * actualStep;
    const s1 = (i + 1) * actualStep;
    const [x0, z0] = sampleAt(s0);
    const [x1, z1] = sampleAt(s1);
    const mx = (x0 + x1) * 0.5;
    const mz = (z0 + z1) * 0.5;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const gy = getGroundY(mx, mz, terrain, road);
    const rotY =
      spanAxis === 'x'
        ? Math.atan2(-dz, dx)
        : Math.atan2(dx, dz);
    out.push({
      position: [Number(mx.toFixed(2)), Number(gy.toFixed(2)), Number(mz.toFixed(2))],
      rotationY: Number(rotY.toFixed(3)),
    });
  }

  return out;
}
