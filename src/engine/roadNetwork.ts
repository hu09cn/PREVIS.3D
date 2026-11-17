import {
  getGroundY,
  getTerrainHalf,
  getTerrainSize,
  getWindingRoadOffsetX,
} from './terrain';
import type {
  DistrictId,
  DistrictInfo,
  RoadConfig,
  TerrainConfig,
  Vec3,
} from '../types/scene';

export interface RoadSegment {
  position: Vec3;
  rotationY: number;
  width: number;
  length: number;
}

export interface CurbSegment {
  position: Vec3;
  rotationY: number;
  length: number;
}

export interface CrosswalkStripe {
  position: Vec3;
  rotationY: number;
}

export interface RoadLayout {
  roads: RoadSegment[];
  curbs: CurbSegment[];
  crosswalks: CrosswalkStripe[];
  sidewalkAnchors: { position: Vec3; rotationY: number; district: DistrictId }[];
}

export function getDefaultDistricts(
  terrain: TerrainConfig,
  road: RoadConfig
): DistrictInfo[] {
  const sample = (x: number, z: number) => getGroundY(x, z, terrain, road);
  return [
    {
      id: 'commercial_main',
      name: '商业主街',
      center: [0, sample(0, 0), 0],
      cameraPos: [14, sample(14, 24) + 9, 24],
      cameraTarget: [0, sample(0, 0) + 2, 0],
    },
    {
      id: 'old_industrial',
      name: '旧工业区',
      center: [48, sample(48, -36), -36],
      cameraPos: [62, sample(62, -16) + 11, -16],
      cameraTarget: [44, sample(44, -36) + 2.5, -36],
    },
    {
      id: 'overpass_plaza',
      name: '高地广场',
      center: [42, sample(42, 42), 42],
      cameraPos: [58, sample(58, 58) + 12, 58],
      cameraTarget: [38, sample(38, 38) + 2, 38],
    },
    {
      id: 'canal_bank',
      name: '河岸街区',
      center: [-46, sample(-32, 12), 12],
      cameraPos: [-22, sample(-22, 30) + 11, 30],
      cameraTarget: [-46, sample(-46, 8), 8],
    },
  ];
}

export function inferDistrict(x: number, z: number): DistrictId {
  if (x < -22) return 'canal_bank';
  if (x > 20 && z < -10) return 'old_industrial';
  if (x > 20 && z >= -10) return 'overpass_plaza';
  return 'commercial_main';
}

export function generateRoadLayout(
  road: RoadConfig,
  terrain: TerrainConfig
): RoadLayout {
  const roads: RoadSegment[] = [];
  const curbs: CurbSegment[] = [];
  const crosswalks: CrosswalkStripe[] = [];
  const sidewalkAnchors: {
    position: Vec3;
    rotationY: number;
    district: DistrictId;
  }[] = [];

  const worldSize = getTerrainSize(terrain);
  const worldHalf = getTerrainHalf(terrain);
  const rw = road.width;
  const half = rw * 0.5;
  const roadSpan = Math.max(20, worldSize - 40);
  const halfRoadSpan = roadSpan * 0.5;
  const anchorSpan = Math.max(16, Math.min(260, worldHalf - 20));

  if (road.pattern === 'none') {
    return { roads, curbs, crosswalks, sidewalkAnchors };
  }

  if (road.pattern === 'single_main') {
    roads.push({
      position: [0, 0.03, 0],
      rotationY: 0,
      width: rw,
      length: roadSpan,
    });
    for (const side of [-1, 1]) {
      curbs.push({
        position: [side * (half + 0.35), 0.12, 0],
        rotationY: 0,
        length: roadSpan - 4,
      });
    }
    for (const cz of [-40, 0, 40]) {
      for (let s = -2; s <= 2; s++) {
        crosswalks.push({ position: [s * (rw * 0.16), 0.05, cz], rotationY: 0 });
      }
    }
    for (let z = -anchorSpan; z <= anchorSpan; z += 24) {
      for (const side of [-1, 1]) {
        const x1 = side * (half + 1.4);
        sidewalkAnchors.push({
          position: [x1, getGroundY(x1, z, terrain, road), z],
          rotationY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
          district: inferDistrict(x1, z),
        });
      }
    }
    return { roads, curbs, crosswalks, sidewalkAnchors };
  }

  if (road.pattern === 'boulevard_ring') {
    // Central crossroad + 52m radius ring road
    roads.push({ position: [0, 0.03, 0], rotationY: 0, width: rw * 0.85, length: roadSpan });
    roads.push({ position: [0, 0.032, 0], rotationY: Math.PI / 2, width: rw * 0.85, length: roadSpan });
    const radius = 52;
    const segs = 28;
    const arcStep = (Math.PI * 2) / segs;
    const segLen = 2 * radius * Math.sin(arcStep / 2) + 0.8;
    for (let i = 0; i < segs; i++) {
      const theta = (i + 0.5) * arcStep;
      const cx = Math.cos(theta) * radius;
      const cz = Math.sin(theta) * radius;
      const rotY = -theta;
      roads.push({
        position: [cx, 0.034, cz],
        rotationY: rotY,
        width: rw * 0.88,
        length: segLen,
      });
      const outerR = radius + rw * 0.44 + 0.35;
      const innerR = radius - rw * 0.44 - 0.35;
      const nearCross = Math.abs(cx) < half + 2 || Math.abs(cz) < half + 2;
      if (!nearCross) {
        curbs.push(
          { position: [Math.cos(theta) * outerR, 0.12, Math.sin(theta) * outerR], rotationY: rotY, length: segLen },
          { position: [Math.cos(theta) * innerR, 0.12, Math.sin(theta) * innerR], rotationY: rotY, length: segLen * 0.86 }
        );
      }
    }
    const cwOffset = half + 2.2;
    for (let s = -2; s <= 2; s++) {
      const laneOff = s * (rw * 0.14);
      crosswalks.push(
        { position: [laneOff, 0.05, cwOffset], rotationY: 0 },
        { position: [laneOff, 0.05, -cwOffset], rotationY: 0 },
        { position: [cwOffset, 0.05, laneOff], rotationY: Math.PI / 2 },
        { position: [-cwOffset, 0.05, laneOff], rotationY: Math.PI / 2 }
      );
    }
    return { roads, curbs, crosswalks, sidewalkAnchors };
  }

  if (road.pattern === 'crossroad') {
    // N-S main road (along Z, x=0) and E-W main road (along X, z=0)
    roads.push({
      position: [0, 0.03, 0],
      rotationY: 0,
      width: rw,
      length: roadSpan,
    });
    roads.push({
      position: [0, 0.032, 0],
      rotationY: Math.PI / 2,
      width: rw,
      length: roadSpan,
    });

    // Curbs along N-S road (skip intersection gap)
    const wingLen = halfRoadSpan - half - 4;
    const wingCenter = (half + 4 + halfRoadSpan) * 0.5;
    for (const side of [-1, 1]) {
      for (const zCenter of [-wingCenter, wingCenter]) {
        curbs.push({
          position: [side * (half + 0.35), 0.12, zCenter],
          rotationY: 0,
          length: wingLen,
        });
      }
      for (const xCenter of [-wingCenter, wingCenter]) {
        curbs.push({
          position: [xCenter, 0.12, side * (half + 0.35)],
          rotationY: Math.PI / 2,
          length: wingLen,
        });
      }
    }

    // Crosswalks around (0, 0) intersection
    const cwOffset = half + 2.2;
    for (let s = -2; s <= 2; s++) {
      const laneOff = s * (rw * 0.16);
      crosswalks.push(
        { position: [laneOff, 0.05, cwOffset], rotationY: 0 },
        { position: [laneOff, 0.05, -cwOffset], rotationY: 0 },
        { position: [cwOffset, 0.05, laneOff], rotationY: Math.PI / 2 },
        { position: [-cwOffset, 0.05, laneOff], rotationY: Math.PI / 2 }
      );
    }

    // Sidewalk lamp/prop anchors
    for (let d = -anchorSpan; d <= anchorSpan; d += 24) {
      if (Math.abs(d) < half + 4) continue;
      for (const side of [-1, 1]) {
        const x1 = side * (half + 1.4);
        sidewalkAnchors.push({
          position: [x1, getGroundY(x1, d, terrain, road), d],
          rotationY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
          district: inferDistrict(x1, d),
        });
        const z2 = side * (half + 1.4);
        sidewalkAnchors.push({
          position: [d, getGroundY(d, z2, terrain, road), z2],
          rotationY: side < 0 ? 0 : Math.PI,
          district: inferDistrict(d, z2),
        });
      }
    }
  } else if (road.pattern === 'avenue') {
    // Central grand N-S avenue + two cross streets at z = -40 and z = +40
    roads.push({ position: [0, 0.03, 0], rotationY: 0, width: rw, length: roadSpan });
    roads.push({ position: [0, 0.032, -40], rotationY: Math.PI / 2, width: rw * 0.85, length: roadSpan });
    roads.push({ position: [0, 0.032, 40], rotationY: Math.PI / 2, width: rw * 0.85, length: roadSpan });

    const outerStart = 40 + rw * 0.425 + 1;
    const outerLen = Math.max(20, halfRoadSpan - outerStart);
    const outerCenter = outerStart + outerLen * 0.5;
    for (const side of [-1, 1]) {
      curbs.push({ position: [side * (half + 0.35), 0.12, 0], rotationY: 0, length: 66 });
      curbs.push({ position: [side * (half + 0.35), 0.12, -outerCenter], rotationY: 0, length: outerLen });
      curbs.push({ position: [side * (half + 0.35), 0.12, outerCenter], rotationY: 0, length: outerLen });
    }

    for (const cz of [-40, 40]) {
      const cwOff = half + 2.2;
      for (let s = -2; s <= 2; s++) {
        const laneOff = s * (rw * 0.16);
        crosswalks.push(
          { position: [laneOff, 0.05, cz + cwOff], rotationY: 0 },
          { position: [laneOff, 0.05, cz - cwOff], rotationY: 0 }
        );
      }
    }

    for (let z = -anchorSpan; z <= anchorSpan; z += 24) {
      if (Math.abs(z - 40) < half + 3 || Math.abs(z + 40) < half + 3) continue;
      for (const side of [-1, 1]) {
        const x = side * (half + 1.4);
        sidewalkAnchors.push({
          position: [x, getGroundY(x, z, terrain, road), z],
          rotationY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
          district: inferDistrict(x, z),
        });
      }
    }
  } else {
    // winding_alley: segmented winding main road + cross alley at z=0
    roads.push({ position: [0, 0.032, 0], rotationY: Math.PI / 2, width: rw * 0.85, length: roadSpan });
    const step = 16;
    const alleyHalf = Math.max(16, worldHalf - 32);
    for (let z = -alleyHalf; z < alleyHalf; z += step) {
      const zMid = z + step / 2;
      const x0 = getWindingRoadOffsetX(z);
      const x1 = getWindingRoadOffsetX(z + step);
      const xMid = (x0 + x1) / 2;
      const angle = Math.atan2(x1 - x0, step);
      const segLen = Math.hypot(x1 - x0, step) + 0.6;
      roads.push({
        position: [xMid, 0.03, zMid],
        rotationY: angle,
        width: rw,
        length: segLen,
      });

      const nx = Math.cos(angle);
      const nz = -Math.sin(angle);
      for (const side of [-1, 1]) {
        const cx = xMid + side * nx * (half + 0.35);
        const cz = zMid + side * nz * (half + 0.35);
        if (Math.abs(cz) > half + 3) {
          curbs.push({ position: [cx, 0.12, cz], rotationY: angle, length: segLen });
        }
        if (Math.abs(z) % 24 === 0 && Math.abs(cz) > half + 4) {
          const lx = xMid + side * nx * (half + 1.3);
          const lz = zMid + side * nz * (half + 1.3);
          sidewalkAnchors.push({
            position: [lx, getGroundY(lx, lz, terrain, road), lz],
            rotationY: side < 0 ? angle + Math.PI / 2 : angle - Math.PI / 2,
            district: inferDistrict(lx, lz),
          });
        }
      }
    }
  }

  return { roads, curbs, crosswalks, sidewalkAnchors };
}
