import * as THREE from 'three';
import type {
  RoadConfig,
  TerrainBrushMaterial,
  TerrainConfig,
} from '../types/scene';

export const TERRAIN_MATERIAL_CODE: Record<TerrainBrushMaterial, number> = {
  auto: 0,
  grass: 1,
  rock: 2,
  sand: 3,
  soil: 4,
  snow: 5,
  water: 6,
};

export const WORLD_SIZE = 960;
export const WORLD_HALF = WORLD_SIZE / 2;
export const MIN_MAP_SIZE = 60;
export const MAX_MAP_SIZE = 2400;
export const SCULPT_GRID_DEFAULT = 240;

export function clampMapSize(size?: number): number {
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
    return WORLD_SIZE;
  }
  return Math.round(Math.max(MIN_MAP_SIZE, Math.min(MAX_MAP_SIZE, size)));
}

export function getTerrainSize(terrain?: Pick<TerrainConfig, 'mapSize'>): number {
  return clampMapSize(terrain?.mapSize);
}

export function getTerrainHalf(terrain?: Pick<TerrainConfig, 'mapSize'>): number {
  return getTerrainSize(terrain) * 0.5;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Centerline X offset for winding_alley pattern at a given Z
 */
export function getWindingRoadOffsetX(z: number): number {
  return Math.sin(z * 0.035) * 10;
}

/**
 * Distance from (x, z) to the nearest road centerline
 */
export function distanceToRoad(x: number, z: number, road: RoadConfig): number {
  if (road.pattern === 'none') {
    return 9999;
  }
  if (road.pattern === 'single_main') {
    return Math.abs(x);
  }
  if (road.pattern === 'avenue') {
    const dMainZ = Math.abs(x);
    const dCross = Math.min(Math.abs(z - 40), Math.abs(z + 40));
    return Math.min(dMainZ, dCross);
  }
  if (road.pattern === 'winding_alley') {
    const cx = getWindingRoadOffsetX(z);
    return Math.min(Math.abs(x - cx), Math.abs(z));
  }
  if (road.pattern === 'boulevard_ring') {
    const dRing = Math.abs(Math.hypot(x, z) - 52);
    return Math.min(Math.abs(x), Math.abs(z), dRing);
  }
  // crossroad
  return Math.min(Math.abs(x), Math.abs(z));
}

interface IslandSpec {
  x: number;
  z: number;
  rx: number;
  rz: number;
  h: number;
  rot: number;
}

const ARCHIPELAGO_ISLANDS: IslandSpec[] = [
  { x: 0, z: -4, rx: 32, rz: 28, h: 9.6, rot: 0.35 },
  { x: -58, z: -42, rx: 36, rz: 30, h: 12.8, rot: -0.45 },
  { x: 56, z: -48, rx: 31, rz: 35, h: 11.2, rot: 0.8 },
  { x: -66, z: 50, rx: 28, rz: 25, h: 7.8, rot: 0.2 },
  { x: 62, z: 44, rx: 34, rz: 28, h: 11.8, rot: -0.6 },
  { x: -8, z: -96, rx: 38, rz: 28, h: 14.2, rot: 0.1 },
  { x: 18, z: 86, rx: 28, rz: 24, h: 7.2, rot: -0.3 },
  { x: 120, z: -12, rx: 36, rz: 42, h: 11.0, rot: 0.5 },
  { x: -128, z: 8, rx: 40, rz: 36, h: 12.2, rot: -0.2 },
  { x: -210, z: -165, rx: 52, rz: 44, h: 15.5, rot: 0.42 },
  { x: 225, z: -180, rx: 48, rz: 54, h: 14.8, rot: -0.55 },
  { x: -235, z: 185, rx: 46, rz: 38, h: 13.0, rot: 0.18 },
  { x: 210, z: 205, rx: 56, rz: 42, h: 16.2, rot: -0.35 },
  { x: 12, z: -260, rx: 62, rz: 40, h: 18.0, rot: 0.08 },
  { x: -28, z: 268, rx: 48, rz: 44, h: 11.6, rot: 0.65 },
];

export type WildcardArchetype =
  | 'alpine_massif'
  | 'caldera_lake'
  | 'fjord_coast'
  | 'atoll_lagoon'
  | 'mesa_canyon'
  | 'karst_spires'
  | 'braided_delta'
  | 'rolling_highlands'
  | 'canyon_archipelago'
  | 'stepped_amphitheater';

export type WildcardBiome =
  | 'alpine_snow'
  | 'emerald_valley'
  | 'red_canyon'
  | 'tropical_atoll'
  | 'volcanic_basalt'
  | 'nordic_fjord'
  | 'golden_steppe'
  | 'karst_mist';

export interface WildcardRecipe {
  seed: number;
  archetype: WildcardArchetype;
  biome: WildcardBiome;
  hasHorizonOcean: boolean;
  hasLakeOrRiver: boolean;
  macroScale: number;
  warpStrength: number;
  heightScale: number;
  ridgeMix: number;
  terraceStep: number;
  terraceMix: number;
  waterBias: number;
  snowlineY: number;
  craterRadius: number;
  riverFreq: number;
  riverAmp: number;
  riverWidth: number;
  coastAngle: number;
  coastOffset: number;
  labelZh: string;
  labelEn: string;
}

const WILDCARD_ARCHETYPES: {
  id: WildcardArchetype;
  zh: string;
  en: string;
  marine: boolean;
  defaultBiomes: WildcardBiome[];
}[] = [
  { id: 'alpine_massif', zh: '极地雪峰群山', en: 'Alpine Massif', marine: false, defaultBiomes: ['alpine_snow', 'nordic_fjord'] },
  { id: 'caldera_lake', zh: '火山口天池', en: 'Volcanic Caldera Lake', marine: false, defaultBiomes: ['volcanic_basalt', 'emerald_valley', 'alpine_snow'] },
  { id: 'fjord_coast', zh: '冰川峡湾海岸', en: 'Glacial Fjord Coast', marine: true, defaultBiomes: ['nordic_fjord', 'alpine_snow', 'emerald_valley'] },
  { id: 'atoll_lagoon', zh: '珊瑚环礁泻湖', en: 'Atoll & Lagoon', marine: true, defaultBiomes: ['tropical_atoll', 'volcanic_basalt'] },
  { id: 'mesa_canyon', zh: '红岩台地峡谷', en: 'Mesa & Gorge', marine: false, defaultBiomes: ['red_canyon', 'golden_steppe'] },
  { id: 'karst_spires', zh: '奇峰喀斯特林', en: 'Karst Spire Peaks', marine: false, defaultBiomes: ['karst_mist', 'emerald_valley'] },
  { id: 'braided_delta', zh: '蜿蜒河谷三角洲', en: 'Braided River Delta', marine: true, defaultBiomes: ['emerald_valley', 'golden_steppe', 'tropical_atoll'] },
  { id: 'rolling_highlands', zh: '高地湖泊丘陵', en: 'Highland Moors & Tarns', marine: false, defaultBiomes: ['emerald_valley', 'nordic_fjord', 'golden_steppe'] },
  { id: 'canyon_archipelago', zh: '裂谷群岛海域', en: 'Shattered Sea Archipelago', marine: true, defaultBiomes: ['tropical_atoll', 'nordic_fjord', 'volcanic_basalt'] },
  { id: 'stepped_amphitheater', zh: '梯田阶地盆地', en: 'Terraced Amphitheater', marine: false, defaultBiomes: ['emerald_valley', 'red_canyon', 'karst_mist'] },
];

const BIOME_NAMES: Record<WildcardBiome, { zh: string; en: string }> = {
  alpine_snow: { zh: '雪域', en: 'Alpine' },
  emerald_valley: { zh: '翠谷', en: 'Emerald' },
  red_canyon: { zh: '丹霞', en: 'Red Rock' },
  tropical_atoll: { zh: '热带海岛', en: 'Tropical' },
  volcanic_basalt: { zh: '玄武火山', en: 'Volcanic' },
  nordic_fjord: { zh: '北欧峡湾', en: 'Nordic' },
  golden_steppe: { zh: '金秋草原', en: 'Steppe' },
  karst_mist: { zh: '青黛峰林', en: 'Karst' },
};

const GRAD_DIRS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.9239, 0.3827], [-0.9239, 0.3827], [0.9239, -0.3827], [-0.9239, -0.3827],
  [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071],
  [0.3827, 0.9239], [-0.3827, 0.9239], [0.3827, -0.9239], [-0.3827, -0.9239],
];

function buildPermTable(seed: number): Uint8Array {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = (seed || 1337) >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

function quintic(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * True C2-continuous 2D gradient noise (Perlin-style) without periodic sine grids.
 */
function gradNoise2D(x: number, z: number, perm: Uint8Array): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;

  const X = xi & 255;
  const Z = zi & 255;

  const u = quintic(xf);
  const v = quintic(zf);

  const g00 = GRAD_DIRS[perm[perm[X] + Z] & 15];
  const g10 = GRAD_DIRS[perm[perm[X + 1] + Z] & 15];
  const g01 = GRAD_DIRS[perm[perm[X] + Z + 1] & 15];
  const g11 = GRAD_DIRS[perm[perm[X + 1] + Z + 1] & 15];

  const n00 = g00[0] * xf + g00[1] * zf;
  const n10 = g10[0] * (xf - 1) + g10[1] * zf;
  const n01 = g01[0] * xf + g01[1] * (zf - 1);
  const n11 = g11[0] * (xf - 1) + g11[1] * (zf - 1);

  const nx0 = n00 + (n10 - n00) * u;
  const nx1 = n01 + (n11 - n01) * u;
  return (nx0 + (nx1 - nx0) * v) * 1.35;
}

/**
 * Rotated multi-octave FBM gradient noise in roughly [-1, 1].
 */
function fbmSeeded(
  x: number,
  z: number,
  perm: Uint8Array,
  octaves = 5,
  lacunarity = 2.04,
  gain = 0.5
): number {
  let sum = 0;
  let amp = 0.55;
  let norm = 0;
  let px = x;
  let pz = z;
  for (let i = 0; i < octaves; i++) {
    sum += gradNoise2D(px, pz, perm) * amp;
    norm += amp;
    // Rotate octave coordinates (0.8, 0.6) so features never align with axes
    const nx = (px * 0.8 - pz * 0.6) * lacunarity + 17.3;
    const nz = (px * 0.6 + pz * 0.8) * lacunarity - 11.7;
    px = nx;
    pz = nz;
    amp *= gain;
  }
  return sum / Math.max(0.001, norm);
}

/**
 * Domain-warped Musgrave ridged multifractal in [0, 1] for sharp mountain ridges & spires.
 */
function ridgedSeeded(
  x: number,
  z: number,
  perm: Uint8Array,
  octaves = 5,
  lacunarity = 2.12
): number {
  let sum = 0;
  let amp = 0.55;
  let weight = 1;
  let norm = 0;
  let px = x;
  let pz = z;
  for (let i = 0; i < octaves; i++) {
    let signal = 1 - Math.abs(gradNoise2D(px, pz, perm));
    signal = signal * signal * weight;
    weight = Math.max(0.15, Math.min(1, signal * 1.85));
    sum += signal * amp;
    norm += amp;
    const nx = (px * 0.8 - pz * 0.6) * lacunarity + 23.1;
    const nz = (px * 0.6 + pz * 0.8) * lacunarity + 9.4;
    px = nx;
    pz = nz;
    amp *= 0.5;
  }
  return Math.max(0, Math.min(1, sum / Math.max(0.001, norm)));
}

interface SeedParams {
  seed: number;
  worldSize: number;
  cos: number;
  sin: number;
  ox: number;
  oz: number;
  phase: number;
  perm: Uint8Array;
  archipelago: IslandSpec[];
  wildcard: WildcardRecipe;
}

function buildWildcardRecipe(seed: number, rnd: () => number): WildcardRecipe {
  const archMeta =
    WILDCARD_ARCHETYPES[Math.floor(rnd() * WILDCARD_ARCHETYPES.length)];
  // 75% biome aligned to archetype, 25% wild cross-combination ("anything possible")
  const allBiomes = Object.keys(BIOME_NAMES) as WildcardBiome[];
  const biome =
    rnd() < 0.72
      ? archMeta.defaultBiomes[Math.floor(rnd() * archMeta.defaultBiomes.length)]
      : allBiomes[Math.floor(rnd() * allBiomes.length)];

  const hasHorizonOcean = archMeta.marine || rnd() < 0.22;
  const hasLakeOrRiver = !hasHorizonOcean && rnd() < 0.75;
  const macroScale = 0.0045 + rnd() * 0.011; // wide variation: sweeping giant vs intricate
  const warpStrength = 18 + rnd() * 75;
  const heightScale =
    archMeta.id === 'braided_delta' || archMeta.id === 'atoll_lagoon'
      ? 10 + rnd() * 14
      : archMeta.id === 'alpine_massif' || archMeta.id === 'karst_spires'
      ? 26 + rnd() * 34
      : 16 + rnd() * 26;
  const ridgeMix =
    archMeta.id === 'rolling_highlands' || archMeta.id === 'braided_delta'
      ? 0.15 + rnd() * 0.35
      : 0.45 + rnd() * 0.5;
  const terraceStep = 3.2 + rnd() * 5.0;
  const terraceMix =
    archMeta.id === 'mesa_canyon' || archMeta.id === 'stepped_amphitheater'
      ? 0.65 + rnd() * 0.3
      : rnd() < 0.3
      ? 0.25 + rnd() * 0.45
      : 0;
  const snowlineY =
    biome === 'alpine_snow'
      ? 8 + rnd() * 7
      : biome === 'nordic_fjord'
      ? 14 + rnd() * 9
      : biome === 'red_canyon' || biome === 'tropical_atoll'
      ? 999
      : biome === 'volcanic_basalt'
      ? rnd() < 0.35 ? 19 + rnd() * 8 : 999
      : 20 + rnd() * 16;

  const bName = BIOME_NAMES[biome];
  return {
    seed,
    archetype: archMeta.id,
    biome,
    hasHorizonOcean,
    hasLakeOrRiver,
    macroScale,
    warpStrength,
    heightScale,
    ridgeMix,
    terraceStep,
    terraceMix,
    waterBias: -0.4 + rnd() * 1.4,
    snowlineY,
    craterRadius: 34 + rnd() * 48,
    riverFreq: 0.01 + rnd() * 0.022,
    riverAmp: 16 + rnd() * 36,
    riverWidth: 7 + rnd() * 12,
    coastAngle: rnd() * Math.PI * 2,
    coastOffset: (rnd() - 0.5) * 35,
    labelZh: `${bName.zh} · ${archMeta.zh}`,
    labelEn: `${bName.en} ${archMeta.en}`,
  };
}

let cachedSeedParams: SeedParams = (() => {
  let s = 1337 >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return {
    seed: 0,
    worldSize: WORLD_SIZE,
    cos: 1,
    sin: 0,
    ox: 0,
    oz: 0,
    phase: 0,
    perm: buildPermTable(1337),
    archipelago: ARCHIPELAGO_ISLANDS,
    wildcard: buildWildcardRecipe(1337, rnd),
  };
})();

function getSeedParams(seedInput?: number, worldSizeInput = WORLD_SIZE): SeedParams {
  const seed = seedInput && seedInput > 0 ? Math.floor(seedInput) : 0;
  const worldSize = clampMapSize(worldSizeInput);
  if (cachedSeedParams.seed === seed && cachedSeedParams.worldSize === worldSize) {
    return cachedSeedParams;
  }

  const effectiveSeed = seed > 0 ? seed : 1337;
  let s = effectiveSeed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  if (seed === 0) {
    const scale = worldSize / WORLD_SIZE;
    const scaledIslands =
      Math.abs(scale - 1) < 0.01
        ? ARCHIPELAGO_ISLANDS
        : ARCHIPELAGO_ISLANDS.map((isl) => ({
            ...isl,
            x: isl.x * scale,
            z: isl.z * scale,
            rx: Math.max(12, isl.rx * Math.min(1.2, Math.max(0.45, scale))),
            rz: Math.max(12, isl.rz * Math.min(1.2, Math.max(0.45, scale))),
          }));
    cachedSeedParams = {
      seed: 0,
      worldSize,
      cos: 1,
      sin: 0,
      ox: 0,
      oz: 0,
      phase: 0,
      perm: buildPermTable(1337),
      archipelago: scaledIslands,
      wildcard: buildWildcardRecipe(1337, rnd),
    };
    return cachedSeedParams;
  }

  const angle = rnd() * Math.PI * 2;
  const ox = (rnd() - 0.5) * 4000;
  const oz = (rnd() - 0.5) * 4000;
  const phase = rnd() * Math.PI * 2;
  const perm = buildPermTable(effectiveSeed);

  const archipelago: IslandSpec[] = [];
  const spreadSpan = worldSize * 0.72;
  for (let i = 0; i < 16; i++) {
    let px = (rnd() - 0.5) * spreadSpan;
    let pz = (rnd() - 0.5) * spreadSpan;
    if (i === 0) {
      px = (rnd() - 0.5) * Math.min(36, worldSize * 0.18);
      pz = (rnd() - 0.5) * Math.min(32, worldSize * 0.16) - 8;
    } else if (i < 5) {
      px = (rnd() - 0.5) * Math.min(260, spreadSpan * 0.7);
      pz = (rnd() - 0.5) * Math.min(240, spreadSpan * 0.65);
    }
    archipelago.push({
      x: px,
      z: pz,
      rx: 20 + rnd() * 38,
      rz: 18 + rnd() * 36,
      h: 5.5 + rnd() * 14.5,
      rot: rnd() * Math.PI,
    });
  }

  const wildcard = buildWildcardRecipe(effectiveSeed, rnd);

  cachedSeedParams = {
    seed,
    worldSize,
    cos: Math.cos(angle),
    sin: Math.sin(angle),
    ox,
    oz,
    phase,
    perm,
    archipelago,
    wildcard,
  };
  return cachedSeedParams;
}

export function getWildcardRecipe(seed?: number): WildcardRecipe {
  return getSeedParams(seed).wildcard;
}

export function describeWildcardSeed(seed?: number, lang: 'zh' | 'en' = 'zh'): string {
  const rec = getWildcardRecipe(seed);
  return lang === 'en' ? rec.labelEn : rec.labelZh;
}

export function isMarineTerrainTheme(theme: TerrainConfig['theme']): boolean {
  return (
    theme === 'coastal_canal' ||
    theme === 'ocean' ||
    theme === 'lone_island' ||
    theme === 'archipelago' ||
    theme === 'coastal_bay'
  );
}

export function isMarineTerrain(terrain: TerrainConfig): boolean {
  if (isMarineTerrainTheme(terrain.theme)) return true;
  if (terrain.theme === 'wildcard') {
    return getWildcardRecipe(terrain.seed).hasHorizonOcean;
  }
  return false;
}

/**
 * Domain-warped organic multi-octave FBM using true seeded gradient noise.
 */
function fbm2(x: number, z: number, perm?: Uint8Array): number {
  const p = perm ?? cachedSeedParams.perm;
  const wx = fbmSeeded(x * 0.008 + 31.4, z * 0.008 - 17.2, p, 2);
  const wz = fbmSeeded(x * 0.008 - 19.7, z * 0.008 + 43.1, p, 2);
  return fbmSeeded((x + wx * 28) * 0.011, (z + wz * 28) * 0.011, p, 5) * 1.45;
}

/**
 * Domain-warped ridged multifractal using true seeded gradient noise.
 */
function ridge2(x: number, z: number, perm?: Uint8Array): number {
  const p = perm ?? cachedSeedParams.perm;
  const wx = fbmSeeded(x * 0.007 + 12.1, z * 0.007 + 7.8, p, 3);
  const wz = fbmSeeded(x * 0.007 - 27.3, z * 0.007 - 5.4, p, 3);
  return ridgedSeeded((x + wx * 34) * 0.0095, (z + wz * 34) * 0.0095, p, 5);
}

/**
 * Smooth geological cliff strata terrace helper for plateau & canyon walls
 */
function smoothTerrace(val: number, stepHeight: number, sharpness = 0.28): number {
  const scaled = val / stepHeight;
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const ramp = smoothstep(0.5 - sharpness, 0.5 + sharpness, frac);
  return (idx + ramp) * stepHeight;
}

/**
 * Procedural baseline heightfield without custom ZBrush sculpt deltas.
 */
export function getProceduralGroundY(
  x: number,
  z: number,
  terrain: TerrainConfig,
  road: RoadConfig
): number {
  const worldSize = getTerrainSize(terrain);
  const worldHalf = worldSize * 0.5;
  const relief = Math.max(0.15, Math.min(1, terrain.relief || 0.75));
  const sp = getSeedParams(terrain.seed, worldSize);
  const rx = x * sp.cos - z * sp.sin;
  const rz = x * sp.sin + z * sp.cos;
  const sx = rx + sp.ox;
  const sz = rz + sp.oz;
  let h = 0;

  const distFromCenter = Math.hypot(x, z);
  const outerMask = smoothstep(28, 75, distFromCenter);

  const perm = sp.perm;
  const baseFbm = fbmSeeded(sx * 0.012, sz * 0.012, perm, 3);
  const baseNoise = baseFbm * 4.2 * relief;

  const ridgeC = ridgedSeeded(sx * 0.016, sz * 0.016, perm, 3);

  switch (terrain.theme) {
    case 'flat_plain':
    case 'urban_flat': {
      if (terrain.relief > 0.05) {
        h = baseFbm * 1.6 * terrain.relief * outerMask;
      } else {
        h = 0;
      }
      break;
    }
    case 'meadow': {
      // Sweeping rolling emerald prairie + meandering turquoise grassland stream
      const broadSwell = (fbm2(sx, sz, perm) + 0.55) * 3.6;
      const gentleRise = smoothstep(26, 110, -rz) * 4.2;
      const streamCenterOffset = sp.seed > 0 ? Math.sin(sp.phase) * 24 : -22;
      const streamWarp = fbmSeeded(rz * 0.008 + 5.1, sp.phase, perm, 2) * 28;
      const streamX = streamCenterOffset + streamWarp;
      const distStream = Math.abs(rx - streamX);
      const streamCarve = 1 - smoothstep(5.5, 16, distStream);
      h = (broadSwell + gentleRise) * relief * (1 - streamCarve) - 1.75 * streamCarve;
      break;
    }
    case 'hills': {
      // Domain-warped organic rolling hills & sunlit saddle valleys
      const macro = (fbm2(sx * 0.78, sz * 0.78, perm) + 0.45) * 9.5;
      const subDomes = (fbmSeeded(sx * 0.022 + 9.4, sz * 0.022 - 4.2, perm, 3) + 0.35) * 4.8;
      const foregroundBowl = 1 - (1 - smoothstep(10, 32, Math.hypot(x, z - 8))) * 0.52;
      h = (macro + subDomes) * relief * foregroundBowl;
      break;
    }
    case 'mountains': {
      // Interlocking rugged mountain ridges framing a scenic valley pass
      const rVal = ridge2(sx, sz, perm);
      const peakMass = Math.pow(rVal, 1.45) * 34.0;
      const detail = (fbm2(sx * 1.4, sz * 1.4, perm) + 0.4) * 5.2;
      const passValley = smoothstep(8, 36, Math.hypot(x * 0.85, z - 12)) * 0.74 + 0.26;
      h = (peakMass + detail - 1.5) * relief * passValley;
      break;
    }
    case 'alpine_peaks': {
      // Towering snow peaks surrounding an elevated glacial cirque & pass
      const rVal = ridge2(sx * 0.92 + 18, sz * 0.92 - 14, perm);
      const massif = Math.pow(rVal, 1.55) * 56.0;
      const horizonTower = smoothstep(16, 84, Math.hypot(x * 0.9, z - 16)) * 18.0;
      const northGlacierWall = smoothstep(10, 68, -rz + 10) * 11.5;
      const glacialDetail = ridge2(sx * 1.85, sz * 1.85, perm) * 6.4;
      const passOpening = smoothstep(10, 34, Math.hypot(x * 0.95, z - 14));
      h =
        (massif * (0.06 + 0.94 * passOpening) +
          horizonTower * (0.22 + 0.78 * passOpening) +
          northGlacierWall * passOpening +
          glacialDetail * (0.22 + 0.78 * passOpening) -
          0.5) *
        Math.max(0.65, relief);
      break;
    }
    case 'plateau': {
      // Stepped highland mesas separated by an eroded canyon corridor
      const canyonWarp = fbmSeeded(rz * 0.009 + 2.3, sp.phase, perm, 2) * 26;
      const rawMesaField =
        fbm2(sx * 0.6, sz * 0.6, perm) * 11.0 +
        smoothstep(20, 68, Math.abs(rx + canyonWarp)) * 15.0 +
        smoothstep(8, 58, -rz + 6) * 10.5;
      const clampedField = Math.max(0.5, Math.min(29, rawMesaField + 8.0));
      const terraced = smoothTerrace(clampedField, 6.2, 0.19);
      const flatTopDetail = fbmSeeded(sx * 0.025, sz * 0.025, perm, 3) * 0.7;
      const notch =
        1 -
        smoothstep(12, 26, Math.abs(rx - canyonWarp * 0.5)) *
          smoothstep(28, -8, z);
      h = Math.max(
        0.2,
        (terraced + flatTopDetail) * (1 - (1 - notch) * 0.55) * Math.max(0.65, relief)
      );
      break;
    }
    case 'ocean': {
      const sandBars = fbmSeeded(sx * 0.014, sz * 0.014, perm, 2) * 0.9;
      h = -3.65 + sandBars;
      break;
    }
    case 'lone_island': {
      // Single scenic volcanic/tropical island with organic coastline
      const cx = sp.seed > 0 ? Math.cos(sp.phase) * 12 : 0;
      const cz = sp.seed > 0 ? Math.sin(sp.phase * 1.3) * 12 : 0;
      const idx = (x - cx) * sp.cos - (z - cz) * sp.sin;
      const idz = (x - cx) * sp.sin + (z - cz) * sp.cos;
      const stretchedDist = Math.hypot(
        idx * (sp.seed > 0 ? 0.85 + 0.28 * Math.sin(sp.phase) : 1),
        idz * (sp.seed > 0 ? 0.85 + 0.28 * Math.cos(sp.phase) : 1)
      );
      const shoreJitter = fbmSeeded(sx * 0.02, sz * 0.02, perm, 3) * 14.0;
      const rIsland = stretchedDist + shoreJitter;
      const landProfile = 1 - smoothstep(26, 62, rIsland);
      const peakCone =
        Math.exp(-(rIsland * rIsland) / (2 * 18 * 18)) * 12.2 * Math.max(0.55, relief);
      const ridgeDetail = ridgeC * 3.8 * landProfile;
      h = -3.7 + landProfile * 5.0 + peakCone + ridgeDetail;
      break;
    }
    case 'archipelago': {
      let maxIslandLift = 0;
      for (const isl of sp.archipelago) {
        const dx = x - isl.x;
        const dz = z - isl.z;
        const c = Math.cos(isl.rot);
        const s = Math.sin(isl.rot);
        const lx = (dx * c + dz * s) / isl.rx;
        const lz = (-dx * s + dz * c) / isl.rz;
        const dNorm = Math.hypot(lx, lz);
        if (dNorm < 1.45) {
          const wobble = fbmSeeded(x * 0.025, z * 0.025, perm, 3) * 0.28;
          const t = 1 - smoothstep(0.18, 1.12, dNorm + wobble);
          const dome = Math.exp(-(dNorm * dNorm) * 2.0) * isl.h;
          const crag = ridgeC * isl.h * 0.22 * t;
          const lift = t * 4.4 + dome * t + crag;
          if (lift > maxIslandLift) maxIslandLift = lift;
        }
      }
      const seabedWave = fbmSeeded(sx * 0.015, sz * 0.015, perm, 2) * 0.7;
      h = -3.75 + seabedWave + maxIslandLift * Math.max(0.55, relief);
      break;
    }
    case 'canyon_valley': {
      // Sinuous deep river gorge framed by stratified terraced rock canyon cliffs
      const riverWarp = fbmSeeded(rz * 0.008 + 7.2, sp.phase, perm, 3) * 34;
      const distRiver = Math.abs(rx - riverWarp);
      const rawWall = smoothstep(11, 68, distRiver) * 33.0;
      const steppedWalls = smoothTerrace(rawWall, 6.0, 0.2);
      const tributaryWarp = fbmSeeded(rx * 0.01, sp.phase + 4.1, perm, 2) * 14;
      const tributaryCut =
        1 -
        (1 - smoothstep(6, 17, Math.abs(rz + 22 - rx * 0.35 + tributaryWarp))) *
          smoothstep(14, 48, distRiver) *
          0.6;
      const riverCut = (1 - smoothstep(6.5, 13.5, distRiver)) * -3.3;
      const cliffRoughness = ridge2(sx * 1.4, sz * 1.4, perm) * 4.5 * smoothstep(16, 42, distRiver);
      h = (steppedWalls * tributaryCut + cliffRoughness) * Math.max(0.65, relief) + riverCut;
      break;
    }
    case 'coastal_bay':
    case 'coastal_canal': {
      if (terrain.theme === 'coastal_bay') {
        const bayWarp = fbmSeeded(rx * 0.007 + 3.4, sp.phase, perm, 3) * 38;
        const bayCurve = rz - (Math.cos(rx * 0.022 + sp.phase) * 22 - 8 + bayWarp * 0.65);
        const seaDrop = smoothstep(2, 32, bayCurve);
        const headlandLift =
          smoothstep(22, 68, Math.abs(rx)) * smoothstep(26, -16, rz) * 11.5;
        const backCliff = smoothstep(-6, -75, bayCurve) * 14.0 + ridge2(sx, sz, perm) * 6.5 * smoothstep(0, -45, bayCurve);
        const dune = (fbm2(sx * 1.1, sz * 1.1, perm) + 0.55) * 2.4 * (1 - seaDrop);
        h = (headlandLift + backCliff + dune) * Math.max(0.55, relief) - seaDrop * 3.7;
      } else {
        h += baseNoise * outerMask * 0.65;
      }
      break;
    }
    case 'wildcard': {
      // True multi-archetype procedural generator: every seed creates a distinct landform & geology
      const wc = sp.wildcard;
      const wx = fbmSeeded(sx * wc.macroScale * 0.7 + 19.3, sz * wc.macroScale * 0.7 - 11.1, perm, 3) * wc.warpStrength;
      const wz = fbmSeeded(sx * wc.macroScale * 0.7 - 29.7, sz * wc.macroScale * 0.7 + 23.8, perm, 3) * wc.warpStrength;
      const px = (sx + wx) * wc.macroScale;
      const pz = (sz + wz) * wc.macroScale;

      const fbmVal = fbmSeeded(px, pz, perm, 5);
      const ridgeVal = ridgedSeeded(px * 0.92, pz * 0.92, perm, 5);
      const fineDetail = fbmSeeded(px * 2.7, pz * 2.7, perm, 3) * 1.4;
      const blend = (fbmVal * 0.5 + 0.5) * (1 - wc.ridgeMix) + ridgeVal * wc.ridgeMix;

      switch (wc.archetype) {
        case 'alpine_massif': {
          const mass = Math.pow(Math.max(0, blend), 1.35) * wc.heightScale;
          const cirque = smoothstep(8, 42, Math.hypot(x * 0.9, z - 12));
          h = (mass * (0.14 + 0.86 * cirque) + fineDetail - 1.2) * Math.max(0.65, relief);
          break;
        }
        case 'caldera_lake': {
          const rDist = Math.hypot(x + wx * 0.35, z + wz * 0.35);
          const rim = Math.exp(-Math.pow((rDist - wc.craterRadius) / (wc.craterRadius * 0.42), 2)) * wc.heightScale * 0.85;
          const outerSlope = (1 - smoothstep(wc.craterRadius, wc.craterRadius * 3.2, rDist)) * 6.5;
          const innerLake = (1 - smoothstep(wc.craterRadius * 0.38, wc.craterRadius * 0.76, rDist)) * -5.2;
          const crags = ridgeVal * wc.heightScale * 0.35 * smoothstep(wc.craterRadius * 0.45, wc.craterRadius * 1.1, rDist);
          h = (rim + outerSlope + crags + fineDetail) * Math.max(0.6, relief) + innerLake;
          break;
        }
        case 'fjord_coast': {
          const ca = Math.cos(wc.coastAngle);
          const sa = Math.sin(wc.coastAngle);
          const proj = x * ca + z * sa + wc.coastOffset + wx * 0.7;
          const fjordCut = Math.pow(Math.max(0, 1 - Math.abs(fbmSeeded((x * sa - z * ca) * 0.015, proj * 0.008, perm, 3))), 2.2);
          const seaMask = smoothstep(-28, 36, proj - fjordCut * 38);
          const cliffMass = Math.pow(Math.max(0, blend), 1.15) * wc.heightScale * (1 - seaMask);
          h = cliffMass * Math.max(0.6, relief) - seaMask * 4.2 + (1 - seaMask) * fineDetail;
          break;
        }
        case 'atoll_lagoon': {
          const rDist = Math.hypot(x * 0.95 + wx * 0.32, z * 1.05 + wz * 0.32);
          const ringR = wc.craterRadius * 1.15;
          const gapAngle = Math.atan2(z, x) - wc.coastAngle;
          const lagoonChannel = 1 - Math.exp(-Math.pow(Math.sin(gapAngle * 0.5), 2) * 14);
          const ringMask = Math.exp(-Math.pow((rDist - ringR) / (ringR * 0.34), 2)) * lagoonChannel;
          const islandLift = ringMask * (5.5 + ridgeVal * wc.heightScale * 0.55);
          h = -3.4 + islandLift * Math.max(0.6, relief) + fbmVal * 1.1;
          break;
        }
        case 'mesa_canyon': {
          const rawMesa = Math.max(0.2, blend * wc.heightScale * 1.15);
          const terraced = smoothTerrace(rawMesa, wc.terraceStep, 0.16);
          const canyonLine = Math.abs(rx - fbmSeeded(rz * wc.riverFreq, sp.phase, perm, 3) * wc.riverAmp);
          const gorgeCut = (1 - smoothstep(wc.riverWidth * 0.65, wc.riverWidth * 1.8, canyonLine)) * -3.8;
          h = terraced * Math.max(0.65, relief) + fineDetail * 0.4 + gorgeCut;
          break;
        }
        case 'karst_spires': {
          // Tall steep isolated limestone towers rising from flat misty valley floor
          const towerNoise = ridgedSeeded(px * 1.35, pz * 1.35, perm, 4);
          const towerMask = smoothstep(0.46, 0.78, towerNoise);
          const spire = Math.pow(towerMask, 1.25) * wc.heightScale * 1.25;
          const riverLine = Math.abs(rx - fbmSeeded(rz * wc.riverFreq, sp.phase, perm, 2) * wc.riverAmp);
          const riverCut = (1 - smoothstep(wc.riverWidth * 0.5, wc.riverWidth * 1.35, riverLine)) * -2.6;
          h = (spire + Math.max(-0.2, fbmVal * 1.4)) * Math.max(0.65, relief) + riverCut;
          break;
        }
        case 'braided_delta': {
          const ca = Math.cos(wc.coastAngle);
          const sa = Math.sin(wc.coastAngle);
          const coastProj = x * ca + z * sa + wc.coastOffset;
          const seaDrop = smoothstep(25, 110, coastProj + wx * 0.5);
          const channel1 = Math.abs(Math.sin((x * sa - z * ca) * 0.045 + fbmVal * 3.5));
          const channelCut = (1 - smoothstep(0.08, 0.34, channel1)) * 2.5;
          const uplands = smoothstep(10, -140, coastProj) * wc.heightScale * Math.pow(Math.max(0, blend), 1.1);
          h = (uplands + fbmVal * 2.5) * Math.max(0.55, relief) - channelCut - seaDrop * 3.6;
          break;
        }
        case 'rolling_highlands': {
          const swell = (fbmVal * 0.5 + 0.55) * wc.heightScale * 0.72 + ridgeVal * wc.heightScale * 0.25;
          const tarnNoise = fbmSeeded(px * 0.7 + 9.1, pz * 0.7 - 5.4, perm, 3);
          const lakeBasin = tarnNoise < -0.28 ? (tarnNoise + 0.28) * 10.5 : 0;
          h = swell * Math.max(0.55, relief) + lakeBasin + fineDetail * 0.6;
          break;
        }
        case 'canyon_archipelago': {
          const islField = fbmSeeded(px * 0.85, pz * 0.85, perm, 4) + 0.12;
          const land = smoothstep(-0.08, 0.28, islField);
          const cliffs = land * (4.5 + Math.pow(ridgeVal, 1.3) * wc.heightScale * 0.75);
          h = -3.8 + cliffs * Math.max(0.6, relief) + fbmVal * 0.8;
          break;
        }
        case 'stepped_amphitheater':
        default: {
          const rDist = Math.hypot(x + wx * 0.25, z + wz * 0.25);
          const bowl = smoothstep(16, 125, rDist) * wc.heightScale * 0.95;
          const raw = Math.max(0.2, bowl * (0.45 + 0.55 * blend) + ridgeVal * 6.0);
          const terraced = smoothTerrace(raw, wc.terraceStep, 0.18);
          const pond = (1 - smoothstep(10, 24, rDist)) * -2.8;
          h = terraced * Math.max(0.6, relief) + pond + fineDetail * 0.35;
          break;
        }
      }

      if (wc.terraceMix > 0.05 && wc.archetype !== 'mesa_canyon' && wc.archetype !== 'stepped_amphitheater' && h > 0.4) {
        const tVal = smoothTerrace(h, wc.terraceStep, 0.22);
        h = h * (1 - wc.terraceMix) + tVal * wc.terraceMix;
      }

      if (wc.hasLakeOrRiver && wc.archetype !== 'caldera_lake' && wc.archetype !== 'mesa_canyon' && wc.archetype !== 'karst_spires' && wc.archetype !== 'stepped_amphitheater') {
        const riverCenter = fbmSeeded(rz * wc.riverFreq + 3.7, sp.phase, perm, 3) * wc.riverAmp;
        const dRiv = Math.abs(rx - riverCenter);
        if (dRiv < wc.riverWidth * 1.8) {
          const carve = 1 - smoothstep(wc.riverWidth * 0.45, wc.riverWidth * 1.75, dRiv);
          h = h * (1 - carve * 0.88) - 2.6 * carve;
        }
      }
      break;
    }
    case 'hillside_district': {
      const hillRise =
        smoothstep(Math.min(32, worldHalf * 0.35), worldHalf * 0.65, Math.abs(rx)) * 9.0 * Math.max(0.4, relief);
      const northSlope =
        smoothstep(Math.min(25, worldHalf * 0.3), worldHalf * 0.65, -rz) * 6.5 * Math.max(0.35, relief);
      h += hillRise + northSlope + baseNoise * outerMask;
      break;
    }
    case 'industrial_valley': {
      const rim =
        smoothstep(Math.min(55, worldHalf * 0.45), worldHalf * 0.75, distFromCenter) * 12.0 * Math.max(0.4, relief);
      h += rim + baseNoise * outerMask;
      break;
    }
  }

  // Flatten explicit road corridors when global road network is enabled
  if (road.pattern !== 'none') {
    const roadDist = distanceToRoad(x, z, road);
    const roadHalf = road.width * 0.5;
    const padFactor = smoothstep(roadHalf + 4, roadHalf + 22, roadDist);
    h *= padFactor;
  }

  // Optional sunken canal / river channel along x = -46
  if (terrain.hasWaterChannel) {
    const canalCenterX = -46 + Math.sin(z * 0.025) * 6;
    const distCanal = Math.abs(x - canalCenterX);
    if (distCanal < 13) {
      const bank = 1 - smoothstep(6.5, 13, distCanal);
      h = h * (1 - bank) - 2.6 * bank;
    }
  }

  // Legacy coastal_canal outer shoreline drop
  if (terrain.theme === 'coastal_canal') {
    const coastJitter = Math.sin(z * 0.032) * 5.2 + Math.cos(x * 0.028) * 5.2;
    const edgeDist = Math.max(Math.abs(x), Math.abs(z)) + coastJitter;
    const shoreStart = Math.max(12, worldHalf - Math.min(64, worldHalf * 0.18));
    const shoreEnd = Math.max(shoreStart + 8, worldHalf - Math.min(20, worldHalf * 0.06));
    if (edgeDist > shoreStart) {
      const seaDrop = smoothstep(shoreStart, shoreEnd, edgeDist);
      h = h * (1 - seaDrop) - 3.3 * seaDrop;
    }
  } else if (
    !terrain.hasWaterChannel &&
    !isMarineTerrain(terrain) &&
    terrain.theme !== 'canyon_valley' &&
    terrain.theme !== 'meadow' &&
    terrain.theme !== 'wildcard'
  ) {
    // Keep terrestrial maps safely above sea level (-1.15m) unless the user carves a basin
    h = Math.max(-0.85, h);
  }

  return h;
}

/**
 * Bilinear sampling of ZBrush-sculpted delta map over the active world bounds.
 */
export function sampleSculptDelta(
  x: number,
  z: number,
  deltas?: number[] | Float32Array,
  resInput?: number,
  worldSizeInput = WORLD_SIZE
): number {
  if (!deltas || deltas.length === 0) return 0;
  const worldSize = clampMapSize(worldSizeInput);
  const worldHalf = worldSize * 0.5;
  const res = resInput && resInput > 0 ? resInput : SCULPT_GRID_DEFAULT;
  const stride = res + 1;
  if (deltas.length < stride * stride) return 0;

  const u = Math.max(0, Math.min(1, (x + worldHalf) / worldSize));
  const v = Math.max(0, Math.min(1, (z + worldHalf) / worldSize));
  const gx = u * res;
  const gz = v * res;
  const x0 = Math.min(res - 1, Math.floor(gx));
  const z0 = Math.min(res - 1, Math.floor(gz));
  const x1 = x0 + 1;
  const z1 = z0 + 1;
  const tx = gx - x0;
  const tz = gz - z0;

  const h00 = deltas[z0 * stride + x0] ?? 0;
  const h10 = deltas[z0 * stride + x1] ?? 0;
  const h01 = deltas[z1 * stride + x0] ?? 0;
  const h11 = deltas[z1 * stride + x1] ?? 0;

  const h0 = h00 + (h10 - h00) * tx;
  const h1 = h01 + (h11 - h01) * tx;
  return h0 + (h1 - h0) * tz;
}

/**
 * Deterministic heightfield (procedural baseline + bilinear ZBrush sculpt deltas).
 */
export function getGroundY(
  x: number,
  z: number,
  terrain: TerrainConfig,
  road: RoadConfig
): number {
  const base = getProceduralGroundY(x, z, terrain, road);
  const delta = sampleSculptDelta(
    x,
    z,
    terrain.sculptDeltas,
    terrain.sculptGridRes,
    getTerrainSize(terrain)
  );
  return Number((base + delta).toFixed(3));
}

// Natural multi-biome terrain palette (grass, shoreline sand, soil, cool rock, snow & vivid water)
const BIOME_PALETTE = {
  grassLush: new THREE.Color('#62984b'),
  grassSage: new THREE.Color('#4f803d'),
  grassWarm: new THREE.Color('#7ca352'),
  highlandMoss: new THREE.Color('#4e7442'),
  earthSoil: new THREE.Color('#846244'),
  earthDark: new THREE.Color('#6b4c32'),
  sandShore: new THREE.Color('#e0c792'),
  sandWet: new THREE.Color('#c2a673'),
  rockSlate: new THREE.Color('#475569'),
  rockGranite: new THREE.Color('#64748b'),
  peakLimestone: new THREE.Color('#cbd5e1'),
  snowPure: new THREE.Color('#f8fafc'),
  snowShadow: new THREE.Color('#dbeafe'),
  waterSurface: new THREE.Color('#0ea5e9'),
  waterLagoon: new THREE.Color('#0284c7'),
  waterDeep: new THREE.Color('#0369a1'),
  waterFoam: new THREE.Color('#7dd3fc'),
  seafloor: new THREE.Color('#0284c7'),
  deepBed: new THREE.Color('#075985'),
};

const _tmpGrass = new THREE.Color();
const _tmpRock = new THREE.Color();

export function writeBiomeVertexColor(
  vx: number,
  vy: number,
  vz: number,
  terrain: TerrainConfig,
  road: RoadConfig,
  outColor: THREE.Color,
  slope = 0,
  paintCode = 0
): void {
  const spColor = getSeedParams(terrain.seed);
  const n1 = gradNoise2D(vx * 0.028, vz * 0.028, spColor.perm);
  const n2 = gradNoise2D(vx * 0.065 + 11.3, vz * 0.065 - 7.1, spColor.perm) * 0.5;
  const n3 = Math.max(0, Math.min(1, gradNoise2D(vx * 0.045 - 5.2, vz * 0.045 + 9.4, spColor.perm) * 0.5 + 0.5));
  const meadowMix = Math.max(0, Math.min(1, (n1 + n2) * 0.42 + 0.5));

  const wc = terrain.theme === 'wildcard' ? spColor.wildcard : null;

  _tmpGrass
    .copy(BIOME_PALETTE.grassSage)
    .lerp(BIOME_PALETTE.grassLush, meadowMix)
    .lerp(BIOME_PALETTE.grassWarm, n3 * 0.32);

  if (wc) {
    if (wc.biome === 'red_canyon') {
      _tmpGrass.set('#c27d4e').lerp(BIOME_PALETTE.sandWet, meadowMix * 0.55);
    } else if (wc.biome === 'golden_steppe') {
      _tmpGrass.set('#a39344').lerp(BIOME_PALETTE.grassWarm, meadowMix * 0.5).lerp(BIOME_PALETTE.sandShore, n3 * 0.35);
    } else if (wc.biome === 'volcanic_basalt') {
      _tmpGrass.set('#3f4852').lerp(BIOME_PALETTE.highlandMoss, meadowMix * 0.42);
    } else if (wc.biome === 'tropical_atoll') {
      _tmpGrass.set('#4d9c47').lerp(BIOME_PALETTE.grassLush, meadowMix * 0.6);
    } else if (wc.biome === 'alpine_snow' || wc.biome === 'nordic_fjord') {
      _tmpGrass.set('#476b48').lerp(BIOME_PALETTE.highlandMoss, meadowMix * 0.6);
    } else if (wc.biome === 'karst_mist') {
      _tmpGrass.set('#46794d').lerp(BIOME_PALETTE.grassSage, meadowMix * 0.55);
    }
  }

  if (paintCode > 0) {
    switch (paintCode) {
      case 1: // grass (草地)
        outColor
          .copy(_tmpGrass)
          .lerp(BIOME_PALETTE.highlandMoss, Math.min(0.28, slope * 0.5));
        return;
      case 2: // rock (岩石 — cool slate & granite stone, never muddy brown)
        outColor
          .copy(BIOME_PALETTE.rockGranite)
          .lerp(BIOME_PALETTE.rockSlate, 0.3 + n3 * 0.5)
          .lerp(BIOME_PALETTE.peakLimestone, meadowMix * 0.24 + Math.min(0.25, slope * 0.4));
        return;
      case 3: // sand (沙滩 — warm golden beach sand)
        outColor
          .copy(BIOME_PALETTE.sandShore)
          .lerp(BIOME_PALETTE.sandWet, n3 * 0.28 + (vy < -0.5 ? 0.25 : 0));
        return;
      case 4: // soil (泥土 — rich brown earth)
        outColor
          .copy(BIOME_PALETTE.earthSoil)
          .lerp(BIOME_PALETTE.earthDark, 0.25 + n3 * 0.42);
        return;
      case 5: // snow (雪峰 — crisp alpine white with subtle ice-blue shadow)
        outColor
          .copy(BIOME_PALETTE.snowPure)
          .lerp(BIOME_PALETTE.snowShadow, n3 * 0.22 + Math.min(0.32, slope * 0.55));
        return;
      case 6: { // water (水域 — vivid azure/cyan water at any elevation, with wave ripples & waterfall foam)
        const waveRipple = Math.sin(vx * 0.42 + vz * 0.36) * 0.5 + 0.5;
        if (vy < -1.15) {
          const depthT = smoothstep(-1.15, -2.6, vy);
          outColor
            .copy(BIOME_PALETTE.waterLagoon)
            .lerp(BIOME_PALETTE.waterSurface, waveRipple * 0.28)
            .lerp(BIOME_PALETTE.waterDeep, depthT * 0.72);
        } else {
          // Ground-level pond/river OR raised/accumulated water pool & cascading waterfall
          const foamMix = Math.min(0.62, slope * 1.35 + waveRipple * 0.18);
          outColor
            .copy(BIOME_PALETTE.waterLagoon)
            .lerp(BIOME_PALETTE.waterSurface, 0.52 + n3 * 0.35)
            .lerp(BIOME_PALETTE.waterFoam, foamMix);
        }
        return;
      }
      default:
        break;
    }
  }

  // Check proximity to canal/coastline for warm beach transition
  let shoreWeight = 0;
  if (terrain.hasWaterChannel) {
    const canalCenterX = -46 + Math.sin(vz * 0.025) * 6;
    const distCanal = Math.abs(vx - canalCenterX);
    if (distCanal < 17) {
      shoreWeight = Math.max(shoreWeight, 1 - smoothstep(10, 17, distCanal));
    }
  }
  if (isMarineTerrain(terrain) && vy > -1.2 && vy < 0.65) {
    shoreWeight = Math.max(shoreWeight, 1 - smoothstep(-0.35, 0.55, vy));
  }
  if (terrain.theme === 'coastal_canal') {
    const worldHalf = getTerrainHalf(terrain);
    const edgeDist = Math.max(Math.abs(vx), Math.abs(vz));
    const shoreStart = Math.max(10, worldHalf - Math.min(74, worldHalf * 0.2));
    const shoreEnd = Math.max(shoreStart + 6, worldHalf - Math.min(48, worldHalf * 0.12));
    if (edgeDist > shoreStart) {
      shoreWeight = Math.max(shoreWeight, smoothstep(shoreStart, shoreEnd, edgeDist));
    }
  }

  if (vy < -1.25) {
    // Underwater ocean floor & riverbed
    const t = Math.min(1, (-vy - 1.25) / 2.2);
    outColor.copy(BIOME_PALETTE.seafloor).lerp(BIOME_PALETTE.deepBed, t);
  } else if (vy < -0.55) {
    // Shallow submerged basin transitioning into water
    const t = (-vy - 0.55) / 0.7;
    outColor
      .copy(BIOME_PALETTE.sandShore)
      .lerp(BIOME_PALETTE.waterSurface, Math.min(1, t * 1.15))
      .lerp(BIOME_PALETTE.seafloor, smoothstep(0.35, 1.0, t));
  } else if (vy < 0.85) {
    // Keep flat ground (vy >= -0.15) lush green unless near an active canal/coastline
    const heightBeach = vy < -0.15 ? 1 - smoothstep(-0.55, -0.15, vy) : 0;
    const coastBeach = shoreWeight * (1 - smoothstep(0.1, 0.8, vy)) * 0.88;
    const sandMix = Math.max(heightBeach, coastBeach);
    outColor.copy(_tmpGrass).lerp(BIOME_PALETTE.sandShore, sandMix);
  } else if (vy < 8.5) {
    // Rolling hillsides: rich grass -> highland moss
    const t = (vy - 0.85) / 7.65;
    outColor
      .copy(_tmpGrass)
      .lerp(
        wc?.biome === 'red_canyon'
          ? BIOME_PALETTE.earthSoil
          : wc?.biome === 'volcanic_basalt'
          ? BIOME_PALETTE.rockSlate
          : BIOME_PALETTE.highlandMoss,
        t * 0.72
      );
  } else {
    // Mountain slopes & high peaks -> cool stone -> alpine snow cap
    const snowScale = wc
      ? Math.max(10, wc.snowlineY)
      : terrain.theme === 'alpine_peaks'
      ? 18.0
      : 24.0;
    const t = Math.min(1, (vy - 8.5) / snowScale);
    _tmpRock
      .copy(wc?.biome === 'red_canyon' ? BIOME_PALETTE.earthSoil : BIOME_PALETTE.rockGranite)
      .lerp(
        wc?.biome === 'volcanic_basalt' ? BIOME_PALETTE.rockSlate : BIOME_PALETTE.rockSlate,
        n3 * 0.55
      );
    const snowFactor =
      wc && wc.snowlineY > 200
        ? 0
        : smoothstep(0.58, 0.94, t) * 0.88;
    outColor
      .copy(wc?.biome === 'red_canyon' ? BIOME_PALETTE.earthDark : BIOME_PALETTE.highlandMoss)
      .lerp(_tmpRock, smoothstep(0.0, 0.48, t))
      .lerp(BIOME_PALETTE.snowPure, snowFactor);
  }

  // Optional subtle path tint if an explicit road pattern is enabled
  if (road.pattern !== 'none') {
    const roadDist = distanceToRoad(vx, vz, road);
    const roadHalf = road.width * 0.5;
    const roadMix = 1 - smoothstep(roadHalf, roadHalf + 4, roadDist);
    outColor.lerp(BIOME_PALETTE.earthSoil, roadMix * 0.35);
  }

  // Steep terrain cliffs reveal cool grey stone faces or warm geological strata on plateaus/canyons
  if (slope > 0.24) {
    const rockFactor = smoothstep(0.24, 0.5, slope);
    if (
      terrain.theme === 'plateau' ||
      terrain.theme === 'canyon_valley' ||
      wc?.biome === 'red_canyon'
    ) {
      const strataBand = Math.sin(vy * 1.45) * 0.5 + 0.5;
      _tmpRock
        .copy(BIOME_PALETTE.earthSoil)
        .lerp(BIOME_PALETTE.sandWet, strataBand * 0.65)
        .lerp(BIOME_PALETTE.rockSlate, (1 - strataBand) * 0.35);
    } else if (wc?.biome === 'volcanic_basalt') {
      _tmpRock
        .copy(BIOME_PALETTE.rockSlate)
        .lerp(BIOME_PALETTE.earthDark, 0.2 + n3 * 0.35);
    } else {
      _tmpRock
        .copy(BIOME_PALETTE.rockGranite)
        .lerp(BIOME_PALETTE.rockSlate, 0.3 + n3 * 0.45);
    }
    outColor.lerp(_tmpRock, rockFactor * 0.8);
  }
}

export function createTerrainGeometry(
  terrain: TerrainConfig,
  road: RoadConfig
): THREE.BufferGeometry {
  const worldSize = getTerrainSize(terrain);
  const segments = terrain.sculptGridRes ?? SCULPT_GRID_DEFAULT;
  const geo = new THREE.PlaneGeometry(worldSize, worldSize, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const waterMask = new Float32Array(pos.count);
  const tempColor = new THREE.Color();
  const stride = segments + 1;
  const cellSpan = (worldSize / segments) * 2;
  const deltas = terrain.sculptDeltas;
  const hasDeltas = Boolean(deltas && deltas.length >= stride * stride);
  const paints = terrain.paintMaterials;
  const hasPaints = Boolean(paints && paints.length >= stride * stride);

  // Pass 1: Compute heightfield Y values
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const baseY = getProceduralGroundY(vx, vz, terrain, road);
    const deltaY = hasDeltas && deltas ? deltas[i] ?? 0 : 0;
    pos.setY(i, baseY + deltaY);
  }

  // Pass 2: Compute local finite-difference slope & write biome vertex colors
  for (let gz = 0; gz < stride; gz++) {
    const zPrev = Math.max(0, gz - 1);
    const zNext = Math.min(segments, gz + 1);
    for (let gx = 0; gx < stride; gx++) {
      const xPrev = Math.max(0, gx - 1);
      const xNext = Math.min(segments, gx + 1);
      const idx = gz * stride + gx;

      const vx = pos.getX(idx);
      const vy = pos.getY(idx);
      const vz = pos.getZ(idx);

      const dx = (pos.getY(gz * stride + xNext) - pos.getY(gz * stride + xPrev)) / cellSpan;
      const dz = (pos.getY(zNext * stride + gx) - pos.getY(zPrev * stride + gx)) / cellSpan;
      const ny = 1 / Math.sqrt(1 + dx * dx + dz * dz);
      const slope = 1 - ny;

      const paintCode = hasPaints && paints ? paints[idx] ?? 0 : 0;
      waterMask[idx] = paintCode === TERRAIN_MATERIAL_CODE.water ? 1 : 0;
      writeBiomeVertexColor(vx, vy, vz, terrain, road, tempColor, slope, paintCode);
      colors[idx * 3] = tempColor.r;
      colors[idx * 3 + 1] = tempColor.g;
      colors[idx * 3 + 2] = tempColor.b;
    }
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aWaterMask', new THREE.BufferAttribute(waterMask, 1));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sample terrain height beneath left and right feet independently so characters
 * standing on sloped hillsides or canal banks remain grounded without floating.
 */
export function getFootGroundingOffsets(
  x: number,
  z: number,
  rotY: number,
  terrain: TerrainConfig,
  road: RoadConfig
): { groundY: number; leftDelta: number; rightDelta: number } {
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const hipHalf = 0.11;
  const centerY = getGroundY(x, z, terrain, road);
  const leftY = getGroundY(x - cos * hipHalf, z + sin * hipHalf, terrain, road);
  const rightY = getGroundY(x + cos * hipHalf, z - sin * hipHalf, terrain, road);
  return {
    groundY: centerY,
    leftDelta: Math.max(-0.22, Math.min(0.22, leftY - centerY)),
    rightDelta: Math.max(-0.22, Math.min(0.22, rightY - centerY)),
  };
}
