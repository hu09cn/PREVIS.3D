import { cloneJoints, POSE_PRESETS, PROP_CATALOG } from '../data/presets';
import {
  generateRoadLayout,
  getDefaultDistricts,
  inferDistrict,
} from '../engine/roadNetwork';
import { distanceToRoad, getGroundY } from '../engine/terrain';
import {
  inferDslTypeFromToken,
  parseRequestedCount,
} from './dslTemplates';
import type { IntentSummary } from './dslSchema';
import type {
  BuildingSpec,
  BuildingStyle,
  CharacterActor,
  CustomModelAsset,
  CustomModelPart,
  DistrictId,
  HeroCompoundSpec,
  PosePreset,
  PrimitiveShape,
  ProceduralMaterialKind,
  PropType,
  RoadConfig,
  RoadPattern,
  ScatteredPropSpec,
  ScatteredPropType,
  SceneAsset,
  ShotData,
  TerrainConfig,
  TerrainTheme,
  Vec3,
  WorldEnvironment,
  WorldPlan,
  WorldState,
} from '../types/scene';

export type SpatialRelation =
  | 'in_front_of'
  | 'behind'
  | 'left_of'
  | 'right_of'
  | 'around'
  | 'on_top_of'
  | 'along'
  | 'inside'
  | 'at';

export type SpatialArrangement =
  | 'single'
  | 'cluster'
  | 'line'
  | 'ring'
  | 'grid'
  | 'scatter'
  | 'convoy'
  | 'pair';

export interface CharacterStageRequest {
  id?: string;
  role: string;
  action?: string;
  placement_rule?: string;
  anchor?: string;
  relative_to?: string;
  relation?: SpatialRelation;
  distance_m?: number;
  facing?: string;
}

export interface SceneElementRequest {
  id?: string;
  item: string;
  label?: string;
  count?: number;
  arrangement?: SpatialArrangement;
  anchor?: string;
  relation?: SpatialRelation;
  distance_m?: number;
  facing?: string;
  offset_m?: [number, number, number];
  scale?: [number, number, number];
  rotation_y_deg?: number;
}

export interface CustomModelPartRequest {
  name?: string;
  shape: PrimitiveShape;
  position?: Vec3;
  local_position?: Vec3;
  rotation_deg?: Vec3;
  local_rotation_deg?: Vec3;
  size: Vec3;
  top_ratio?: number;
  color: string;
  material?: ProceduralMaterialKind;
}

export interface CustomModelRequest {
  id?: string;
  name: string;
  description?: string;
  anchor?: string;
  relation?: SpatialRelation;
  distance_m?: number;
  facing?: string;
  offset_m?: Vec3;
  place_on?: 'ground' | 'water_surface';
  rotation_y_deg?: number;
  scale?: Vec3;
  count?: number;
  arrangement?: SpatialArrangement;
  parts: CustomModelPartRequest[];
  composite_primitives?: CustomModelPartRequest[];
}

export interface SemanticPatchOp {
  op: 'add' | 'remove' | 'update';
  target_id?: string;
  remove_all?: boolean;
  relation?: SpatialRelation;
  relative_to?: string;
  anchor?: string;
  distance_m?: number;
  offset_m?: Vec3;
  facing?: string;
  action?: string;
  scale?: Vec3;
  rotation_y_deg?: number;
  name?: string;
  element?: SceneElementRequest;
  composite_model?: CustomModelRequest;
  character?: CharacterStageRequest;
}

export type FocusStyle =
  | 'street_chase'
  | 'indoor_outdoor'
  | 'plaza_standoff'
  | 'sniper_overwatch'
  | 'canal_patrol';

export type SemanticCommand =
  | {
      cmd: 'set_terrain';
      theme?: TerrainTheme;
      relief?: number;
      has_water_channel?: boolean;
      hero_zone?: DistrictId;
      sun_elevation?: number;
      sun_azimuth?: number;
      fog_density?: number;
    }
  | {
      cmd: 'build_road_grid';
      pattern?: RoadPattern;
      width?: number;
    }
  | {
      cmd: 'spawn_district_buildings';
      zone?: DistrictId;
      style?: BuildingStyle;
      count?: number;
      min_floors?: number;
      max_floors?: number;
      enterable_hero_building?: boolean;
    }
  | {
      cmd: 'scatter_props';
      zone?: DistrictId;
      preset?: 'street_urban' | 'industrial_cargo' | 'canal_trees' | 'tactical_cover';
      density?: number;
      focus_items?: ScatteredPropType[];
    }
  | {
      cmd: 'place_scene_elements';
      zone?: DistrictId;
      elements: SceneElementRequest[];
    }
  | {
      cmd: 'create_custom_models';
      zone?: DistrictId;
      models: CustomModelRequest[];
    }
  | {
      cmd: 'stage_characters';
      zone?: DistrictId;
      cast: CharacterStageRequest[];
    }
  | {
      cmd: 'apply_scene_patches';
      zone?: DistrictId;
      patches: SemanticPatchOp[];
    }
  | {
      cmd: 'generate_multi_shot_coverage';
      shot_count?: number;
      focus_style?: FocusStyle;
    };

export interface UncertaintyItem {
  topic: string;
  question: string;
  assumption: string;
}

export interface SemanticProgram {
  world_plan: WorldPlan;
  commands: SemanticCommand[];
  uncertainties?: UncertaintyItem[];
  unsupported_elements?: string[];
}

interface Box2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function boxesOverlap(a: Box2D, b: Box2D, margin = 1.2): boolean {
  return (
    a.minX - margin < b.maxX &&
    a.maxX + margin > b.minX &&
    a.minZ - margin < b.maxZ &&
    a.maxZ + margin > b.minZ
  );
}

function pointInsideAnyBox(x: number, y: number, z: number, boxes: Box2D[]): boolean {
  return boxes.some(
    (b) =>
      x >= b.minX - 0.8 &&
      x <= b.maxX + 0.8 &&
      z >= b.minZ - 0.8 &&
      z <= b.maxZ + 0.8 &&
      y <= b.height + 0.5
  );
}

function normalizePose(action?: string): PosePreset {
  const s = (action ?? '').toLowerCase();
  if (s.includes('crouch') || s.includes('蹲') || s.includes('掩体') || s.includes('cover') || s.includes('隐蔽')) return 'crouch_cover';
  if (s.includes('aim') || s.includes('瞄') || s.includes('射') || s.includes('持枪') || s.includes('举枪')) return 'aim';
  if (s.includes('run') || s.includes('跑') || s.includes('冲') || s.includes('追')) return 'run';
  if (s.includes('walk') || s.includes('走') || s.includes('巡')) return 'walk';
  if (s.includes('sit') || s.includes('坐')) return 'sit';
  if (s.includes('lean') || s.includes('靠墙')) return 'lean_wall';
  if (s.includes('look') || s.includes('俯瞰') || s.includes('侦察') || s.includes('观察') || s.includes('望')) return 'look_over_edge';
  return 'idle';
}

function getZoneBounds(zone: DistrictId): {
  center: [number, number];
  xRange: [number, number];
  zRange: [number, number];
} {
  switch (zone) {
    case 'old_industrial':
      return { center: [48, -42], xRange: [20, 86], zRange: [-84, -14] };
    case 'overpass_plaza':
      return { center: [46, 46], xRange: [20, 84], zRange: [14, 84] };
    case 'canal_bank':
      return { center: [-30, 8], xRange: [-88, -18], zRange: [-80, 80] };
    case 'commercial_main':
    default:
      return { center: [0, 0], xRange: [-28, 28], zRange: [-84, 84] };
  }
}

const VALID_SCATTER_ITEMS = new Set<ScatteredPropType>([
  'lamp',
  'barrier',
  'cargo_stack',
  'car',
  'tree',
  'bush',
  'rock',
]);

const SCATTER_ANCHOR_META: Record<
  ScatteredPropType,
  { cnLabel: string; height: number; radius: number; aliases: string[] }
> = {
  car: { cnLabel: '汽车', height: 1.6, radius: 2.3, aliases: ['汽车', '轿车', '车辆', 'vehicle', 'sedan', 'truck', 'car_01', 'car_1'] },
  barrier: { cnLabel: '路障', height: 1.0, radius: 1.2, aliases: ['路障', '防撞墩', '护栏', 'barricade', 'cover', '掩体'] },
  cargo_stack: { cnLabel: '货箱堆', height: 2.0, radius: 1.8, aliases: ['货箱', '货箱堆', '集装箱', 'crate', 'cargo'] },
  tree: { cnLabel: '树木', height: 4.5, radius: 1.6, aliases: ['树', '大树', '树木'] },
  bush: { cnLabel: '灌木', height: 1.1, radius: 1.1, aliases: ['灌木', '草丛'] },
  rock: { cnLabel: '岩石', height: 1.4, radius: 1.5, aliases: ['岩石', '巨石', '石头', 'stone'] },
  lamp: { cnLabel: '路灯', height: 4.8, radius: 0.6, aliases: ['路灯', '街灯', 'streetlight'] },
};

const VALID_PROP_TYPES = new Set<PropType>(PROP_CATALOG.map((p) => p.type));

function mapElementItem(raw: string): {
  scatterType?: ScatteredPropType;
  propType?: PropType;
  unsupported?: boolean;
} {
  const s = raw.trim().toLowerCase();
  if (
    s === 'car' ||
    s === 'vehicle' ||
    s === 'sedan' ||
    s === 'truck' ||
    s === 'van' ||
    s.includes('汽车') ||
    s.includes('警车') ||
    s.includes('卡车') ||
    s.includes('轿车') ||
    s.includes('越野车')
  ) {
    return { scatterType: 'car' };
  }
  if (s === 'cargo_stack' || s.includes('货箱堆') || s.includes('集装箱')) {
    return { scatterType: 'cargo_stack' };
  }
  if (s === 'bush' || s.includes('灌木') || s.includes('草丛')) {
    return { scatterType: 'bush' };
  }
  if (
    s === 'barrier' ||
    s === 'fence' ||
    s === 'guardrail' ||
    s === 'barricade' ||
    s.includes('防撞墩') ||
    s.includes('路障') ||
    s.includes('护栏') ||
    s.includes('围栏')
  ) {
    return { scatterType: 'barrier' };
  }
  if (s === 'tree' || s === 'pine' || s.includes('树') || s.includes('乔木')) {
    return { scatterType: 'tree' };
  }
  if (
    s === 'rock' ||
    s === 'stone' ||
    s === 'boulder' ||
    s.includes('岩石') ||
    s.includes('巨石') ||
    s.includes('石头') ||
    s.includes('礁石')
  ) {
    return { scatterType: 'rock' };
  }
  if (s === 'lamp' || s === 'streetlight' || s.includes('路灯') || s.includes('街灯')) {
    return { scatterType: 'lamp' };
  }
  if (VALID_SCATTER_ITEMS.has(s as ScatteredPropType)) {
    return { scatterType: s as ScatteredPropType };
  }
  if (s.includes('柱') || s === 'pillar' || s === 'column') return { propType: 'pillar' };
  if (s.includes('楼梯') || s.includes('台阶') || s === 'stairs') return { propType: 'stairs' };
  if (s.includes('斜坡') || s.includes('坡道') || s === 'ramp' || s === 'slope') return { propType: 'ramp' };
  if (s.includes('门') || s === 'doorway' || s === 'gate' || s === 'arch') return { propType: 'doorway' };
  if (s.includes('墙') || s === 'wall') return { propType: 'wall' };
  if (
    s.includes('地板') ||
    s.includes('高台') ||
    s.includes('平台') ||
    s.includes('舞台') ||
    s === 'floor' ||
    s === 'platform' ||
    s === 'stage'
  ) {
    return { propType: 'floor' };
  }
  if (s.includes('顶棚') || s.includes('雨棚') || s.includes('屋顶') || s === 'roof') return { propType: 'roof' };
  if (s.includes('桌') || s.includes('台面') || s === 'table' || s === 'desk') return { propType: 'table' };
  if (s.includes('箱') || s === 'crate') return { propType: 'crate' };
  if (s === 'box' || s.includes('体块') || s.includes('方块')) return { propType: 'box' };
  if (s === 'building' || s.includes('楼') || s.includes('建筑') || s.includes('厂房')) return { propType: 'building' };
  if (VALID_PROP_TYPES.has(s as PropType)) return { propType: s as PropType };
  // Never silently disguise unsupported requests as crates; mark explicitly as unsupported
  return { propType: 'box', unsupported: true };
}

export interface CompileResult {
  world: WorldState;
  shots: ShotData[];
  logs: string[];
  focusCenter: Vec3;
  warnings: string[];
  unsupportedItems: string[];
  forbiddenFiltered: string[];
}

export interface WorldVerificationReport {
  passed: boolean;
  missingMustHave: string[];
  issues: string[];
  warnings: string[];
  unsupportedItems: string[];
}

/**
 * Deterministic TypeScript Spatial Compiler:
 * Translates high-level LLM semantic commands into collision-free 240m x 240m 3D world geometry,
 * prompt-specific prop/structure layouts, foot-grounded 16-joint mannequins, and prompt-aligned cameras.
 */
export function compileSemanticProgram(
  program: SemanticProgram,
  existingWorld?: WorldState,
  mode: 'replace' | 'append' = 'replace',
  intent?: IntentSummary
): CompileResult {
  const logs: string[] = [];
  const warnings: string[] = [];
  const unsupportedItems: string[] = Array.isArray(program.unsupported_elements)
    ? [...program.unsupported_elements]
    : [];
  const forbiddenFiltered: string[] = [];

  const environment: WorldEnvironment =
    mode === 'append' && existingWorld
      ? { ...existingWorld.environment }
      : {
          sunAzimuth: 52,
          sunElevation: 42,
          fogDensity: 0.005,
          bgColor: '#eae8e3',
        };

  const terrain: TerrainConfig =
    mode === 'append' && existingWorld
      ? { ...existingWorld.terrain }
      : { theme: 'urban_flat', relief: 0.35, hasWaterChannel: false };

  const road: RoadConfig =
    mode === 'append' && existingWorld
      ? { ...existingWorld.road, pattern: 'none' }
      : { pattern: 'none', width: 12 };

  const buildings: BuildingSpec[] =
    mode === 'append' && existingWorld ? [...existingWorld.buildings] : [];
  let heroCompound: HeroCompoundSpec | null =
    mode === 'append' && existingWorld ? existingWorld.heroCompound : null;
  const scatteredProps: ScatteredPropSpec[] =
    mode === 'append' && existingWorld ? [...existingWorld.scatteredProps] : [];
  const characters: CharacterActor[] =
    mode === 'append' && existingWorld ? [...existingWorld.characters] : [];
  const assets: SceneAsset[] =
    mode === 'append' && existingWorld ? [...existingWorld.assets] : [];
  const customModels: CustomModelAsset[] =
    mode === 'append' && existingWorld ? [...(existingWorld.customModels ?? [])] : [];

  const occupiedBoxes: Box2D[] = [];
  for (const b of buildings) {
    occupiedBoxes.push({
      minX: b.position[0] - b.width * 0.5,
      maxX: b.position[0] + b.width * 0.5,
      minZ: b.position[2] - b.depth * 0.5,
      maxZ: b.position[2] + b.depth * 0.5,
      height: b.floors * 3.2 + 1,
    });
  }
  if (heroCompound) {
    occupiedBoxes.push({
      minX: heroCompound.position[0] - 8,
      maxX: heroCompound.position[0] + 8,
      minZ: heroCompound.position[2] - 8,
      maxZ: heroCompound.position[2] + 8,
      height: 8.5,
    });
  }

  let heroZone: DistrictId = 'commercial_main';
  let shots: ShotData[] = [];

  // Pass 1: Finalize terrain, atmosphere & road layout before placing geometry
  for (const c of program.commands) {
    if (c.cmd === 'set_terrain') {
      if (c.theme) terrain.theme = c.theme;
      if (typeof c.relief === 'number') {
        terrain.relief = Math.max(0, Math.min(1, c.relief));
      }
      if (typeof c.has_water_channel === 'boolean') {
        terrain.hasWaterChannel = c.has_water_channel;
      }
      if (c.hero_zone) heroZone = c.hero_zone;
      if (typeof c.sun_elevation === 'number') {
        environment.sunElevation = Math.max(6, Math.min(82, c.sun_elevation));
      }
      if (typeof c.sun_azimuth === 'number') {
        environment.sunAzimuth = ((c.sun_azimuth % 360) + 360) % 360;
      }
      if (typeof c.fog_density === 'number') {
        environment.fogDensity = Math.max(0, Math.min(0.035, c.fog_density));
      }
      if (mode === 'replace') {
        const themeText = `${program.world_plan?.theme ?? ''} ${program.world_plan?.terrainSummary ?? ''}`.toLowerCase();
        if (/夜|黑夜|深夜|night/.test(themeText)) {
          environment.bgColor = '#182233';
          environment.timeMinutes = 1350;
        } else if (environment.sunElevation <= 20 || /黄昏|夕阳|日落|dusk|sunset/.test(themeText)) {
          environment.bgColor = '#d9c5b4';
          environment.timeMinutes = 1060;
        } else if (environment.fogDensity >= 0.012) {
          environment.bgColor = '#e2e5e8';
          environment.timeMinutes = 555;
        } else {
          environment.bgColor = '#eae8e3';
          environment.timeMinutes = 555;
        }
      }
      logs.push(
        `✓ 地形与氛围完成：${terrain.theme}（核心区 ${heroZone} · 起伏 ${(terrain.relief * 100).toFixed(0)}%${
          terrain.hasWaterChannel ? ' · 含下沉河道' : ''
        }）`
      );
    } else if (c.cmd === 'build_road_grid') {
      road.pattern = 'none';
      if (typeof c.width === 'number') road.width = Math.max(8, Math.min(18, c.width));
      logs.push('✓ 纯白模无路网地表已就绪');
    }
  }

  const districts = getDefaultDistricts(terrain, road);
  const roadLayout = generateRoadLayout(road, terrain);
  const heroZoneBounds = getZoneBounds(heroZone);

  interface AnchorEntry {
    pos: Vec3;
    rotY: number;
    topY: number;
    radius: number;
  }
  const anchorRegistry = new Map<string, AnchorEntry>();
  const registerAnchor = (
    keys: (string | undefined)[],
    pos: Vec3,
    rotY = 0,
    height = 1.5,
    radius = 1.5
  ) => {
    const entry: AnchorEntry = {
      pos: [pos[0], pos[1], pos[2]],
      rotY,
      topY: pos[1] + Math.max(0.1, height),
      radius: Math.max(0.4, radius),
    };
    for (const k of keys) {
      if (!k || !k.trim()) continue;
      anchorRegistry.set(k.trim().toLowerCase(), entry);
    }
  };

  // Pre-register semantic landmarks
  const registerSemanticLandmarks = () => {
    const hc = heroZoneBounds.center;
    const hgy = getGroundY(hc[0], hc[1], terrain, road);
    registerAnchor(
      ['scene_center', 'hero_zone_center', 'ground_level', 'center'],
      [hc[0], hgy, hc[1]],
      0,
      0,
      4
    );
    registerAnchor(['canal_water', 'water_channel', 'river_center'], [-46, -1.15, 0], 0, 0, 6);
    registerAnchor(['coast', 'beach', 'shore'], [-94, getGroundY(-94, -12, terrain, road), -12], 0, 0, 6);
    registerAnchor(['canal', 'river', 'canal_bank'], [-30, getGroundY(-30, 8, terrain, road), 8], 0, 0, 5);
    registerAnchor(['industrial', 'warehouse', 'old_industrial'], [48, getGroundY(48, -42, terrain, road), -42], 0, 0, 6);
    registerAnchor(['plaza', 'overpass', 'overpass_plaza'], [42, getGroundY(42, 42, terrain, road), 42], 0, 0, 6);
    registerAnchor(['road_axis', 'main_road', 'road', 'street'], [0, getGroundY(0, 0, terrain, road), 0], 0, 0, 4);
    if (heroCompound) {
      const hx = heroCompound.position[0];
      const hy = heroCompound.position[1];
      const hz = heroCompound.position[2];
      registerAnchor([heroCompound.id, heroCompound.name, 'hero_building'], [hx, hy, hz], heroCompound.rotationY, 6.8, 7);
      registerAnchor(['door_main', 'main_door'], [hx + 5.2, hy, hz], Math.PI / 2, 0.2, 1.5);
      registerAnchor(['inside_lobby', 'lobby'], [hx - 0.5, hy + 0.25, hz], Math.PI / 2, 0.1, 3);
      registerAnchor(['balcony', 'on_balcony'], [hx + 5.8, hy + 3.56, hz], Math.PI / 2, 0.1, 2);
      registerAnchor(['rooftop', 'on_rooftop_edge'], [hx + 4.2, hy + 6.82, hz], Math.PI / 2, 0.1, 3);
    }
  };
  registerSemanticLandmarks();

  // Pre-register existing scene objects when in append/patch mode
  const registerIfMissing = (
    keys: (string | undefined)[],
    pos: Vec3,
    rotY = 0,
    height = 1.5,
    radius = 1.5
  ) => {
    const entry: AnchorEntry = {
      pos: [pos[0], pos[1], pos[2]],
      rotY,
      topY: pos[1] + Math.max(0.1, height),
      radius: Math.max(0.4, radius),
    };
    for (const k of keys) {
      if (!k || !k.trim()) continue;
      const lower = k.trim().toLowerCase();
      if (!anchorRegistry.has(lower)) {
        anchorRegistry.set(lower, entry);
      }
    }
  };

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    registerAnchor([b.id, b.name, `building_${i + 1}`], b.position, b.rotationY, b.floors * 3.2, Math.max(b.width, b.depth) * 0.5);
  }
  const typeCounters = new Map<string, number>();
  for (const a of assets) {
    const h = (a.type === 'floor' ? 0.2 : a.type === 'pillar' ? 3.5 : a.type === 'wall' ? 3 : 1.2) * (a.scale[1] ?? 1);
    const cnt = (typeCounters.get(a.type) ?? 0) + 1;
    typeCounters.set(a.type, cnt);
    registerAnchor([a.id, a.name, `${a.type}_${cnt}`, `${a.type}_${String(cnt).padStart(2, '0')}`], a.position, a.rotation[1], h, 1.5);
    registerIfMissing([a.type], a.position, a.rotation[1], h, 1.5);
  }
  for (const cm of customModels) {
    const maxTop = cm.parts.reduce((m, p) => Math.max(m, p.position[1] + p.size[1] * 0.5), 1.5) * (cm.scale[1] ?? 1);
    registerAnchor([cm.id, cm.name], cm.position, cm.rotation[1], maxTop, 2.0);
  }
  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    registerAnchor([ch.id, ch.name, `character_${i + 1}`, `char_${i + 1}`], ch.position, ch.rotation[1], 1.75, 0.6);
    if (i === 0) registerIfMissing(['hero', 'protagonist', 'player', '主角'], ch.position, ch.rotation[1], 1.75, 0.6);
    if (i === 1) registerIfMissing(['opponent', 'rival', 'enemy', 'guard', '对手', '敌人'], ch.position, ch.rotation[1], 1.75, 0.6);
  }
  for (const sp of scatteredProps) {
    const cnt = (typeCounters.get(sp.type) ?? 0) + 1;
    typeCounters.set(sp.type, cnt);
    const meta = SCATTER_ANCHOR_META[sp.type];
    registerAnchor(
      [
        sp.id,
        `${sp.type}_${cnt}`,
        `${sp.type}_${String(cnt).padStart(2, '0')}`,
        ...(meta ? [`${meta.cnLabel} ${cnt}`, `${meta.cnLabel}${cnt}`] : []),
      ],
      sp.position,
      sp.rotationY,
      meta?.height ?? 1.4,
      meta?.radius ?? 1.2
    );
    registerIfMissing(
      [sp.type, ...(meta?.aliases ?? [])],
      sp.position,
      sp.rotationY,
      meta?.height ?? 1.4,
      meta?.radius ?? 1.2
    );
  }

  const lookupAnchorEntry = (anchor?: string, zone?: DistrictId): AnchorEntry => {
    const raw = (anchor ?? '').trim().toLowerCase();
    if (raw) {
      const exact = anchorRegistry.get(raw);
      if (exact) return exact;
      for (const [k, v] of anchorRegistry.entries()) {
        if (k.includes(raw) || raw.includes(k)) return v;
      }
    }
    const zc = getZoneBounds(zone ?? heroZone).center;
    const gy = getGroundY(zc[0], zc[1], terrain, road);
    return { pos: [zc[0], gy, zc[1]], rotY: 0, topY: gy, radius: 3 };
  };

  const onTopSequenceMap = new Map<string, number>();

  const resolveRelativePlacement = (
    anchorKey: string | undefined,
    zone: DistrictId | undefined,
    relation: SpatialRelation | undefined,
    distanceM: number | undefined,
    offsetM?: Vec3,
    hintLabel?: string
  ): { baseX: number; baseYOffset: number; baseZ: number; supportY: number | null; anc: AnchorEntry } => {
    const anc = lookupAnchorEntry(anchorKey, zone);
    const rel = relation ?? 'at';
    const dist =
      typeof distanceM === 'number' && Number.isFinite(distanceM)
        ? Math.max(0, Math.min(80, distanceM))
        : rel === 'at' || rel === 'on_top_of' || rel === 'inside' || rel === 'around'
        ? 0
        : 3.5;

    // Forward (+Z in local frame rotated by rotY) & Right (+X in local frame)
    const fwdX = Math.sin(anc.rotY);
    const fwdZ = Math.cos(anc.rotY);
    const rightX = Math.cos(anc.rotY);
    const rightZ = -Math.sin(anc.rotY);

    let dx = 0;
    let dz = 0;
    let supportY: number | null = null;
    const outerClearance =
      anc.radius >= 3.0 ? anc.radius + Math.max(1.5, dist * 0.5) : dist + anc.radius * 0.5;

    switch (rel) {
      case 'in_front_of':
        dx = fwdX * outerClearance;
        dz = fwdZ * outerClearance;
        break;
      case 'behind':
        dx = -fwdX * outerClearance;
        dz = -fwdZ * outerClearance;
        break;
      case 'left_of':
        dx = -rightX * outerClearance;
        dz = -rightZ * outerClearance;
        break;
      case 'right_of':
        dx = rightX * outerClearance;
        dz = rightZ * outerClearance;
        break;
      case 'on_top_of': {
        supportY = anc.topY;
        const hint = (hintLabel ?? '').toLowerCase();
        if (hint && (dist > 0.3 || /西北|东北|西南|东南|左前|右前|左后|右后|nw|ne|sw|se|立柱|pillar/.test(hint))) {
          const span = Math.min(
            dist > 0.3 ? dist : anc.radius * 0.72,
            Math.max(1.6, anc.radius * 0.78)
          );
          let cx = 0;
          let cz = 0;
          if (/西北|左后|\bnw\b/.test(hint)) {
            cx = -1;
            cz = -1;
          } else if (/东北|右后|\bne\b/.test(hint)) {
            cx = 1;
            cz = -1;
          } else if (/西南|左前|\bsw\b/.test(hint)) {
            cx = -1;
            cz = 1;
          } else if (/东南|右前|\bse\b/.test(hint)) {
            cx = 1;
            cz = 1;
          } else {
            const seqKey = `${anc.pos[0].toFixed(1)}_${anc.pos[2].toFixed(1)}`;
            const seqIdx = onTopSequenceMap.get(seqKey) ?? 0;
            onTopSequenceMap.set(seqKey, seqIdx + 1);
            const corners: Array<[number, number]> = [
              [-1, -1],
              [1, -1],
              [-1, 1],
              [1, 1],
              [0, -1],
              [0, 1],
              [-1, 0],
              [1, 0],
            ];
            const picked = corners[seqIdx % corners.length];
            cx = picked[0];
            cz = picked[1];
          }
          dx = cx * span;
          dz = cz * span;
        }
        break;
      }
      case 'along':
        dz = dist;
        break;
      default:
        break;
    }

    const ox = offsetM && Number.isFinite(offsetM[0]) ? offsetM[0] : 0;
    const oy = offsetM && Number.isFinite(offsetM[1]) ? offsetM[1] : 0;
    const oz = offsetM && Number.isFinite(offsetM[2]) ? offsetM[2] : 0;

    return {
      baseX: anc.pos[0] + dx + ox,
      baseYOffset: supportY !== null ? supportY + oy : oy,
      baseZ: anc.pos[2] + dz + oz,
      supportY,
      anc,
    };
  };

  const computeFacingRotY = (
    px: number,
    pz: number,
    facing: string | undefined,
    anc: AnchorEntry,
    fallbackRotY: number
  ): number => {
    const f = (facing ?? '').trim().toLowerCase();
    if (!f) return fallbackRotY;
    if (f.includes('toward') || f.includes('anchor') || f.includes('target') || f.includes('hero') || f.includes('center')) {
      if (Math.hypot(anc.pos[0] - px, anc.pos[2] - pz) > 0.05) {
        return Math.atan2(anc.pos[0] - px, anc.pos[2] - pz);
      }
    }
    if (f.includes('away') || f.includes('outward')) {
      if (Math.hypot(px - anc.pos[0], pz - anc.pos[2]) > 0.05) {
        return Math.atan2(px - anc.pos[0], pz - anc.pos[2]);
      }
    }
    if (f === 'north') return Math.PI;
    if (f === 'south') return 0;
    if (f === 'east') return Math.PI / 2;
    if (f === 'west') return -Math.PI / 2;
    return fallbackRotY;
  };

  // Track hero props placed explicitly by prompt so characters/cameras can frame them!
  const placedStoryProps: Vec3[] = [];

  // Pass 2: Compile buildings, scatters, explicit scene elements, characters & cameras
  for (const c of program.commands) {
    if (c.cmd === 'spawn_district_buildings') {
      const zone: DistrictId = c.zone ?? 'commercial_main';
      const style: BuildingStyle = c.style ?? 'modern';
      const targetCount = Math.max(0, Math.min(16, c.count ?? 6));
      const minFloors = Math.max(1, Math.min(8, c.min_floors ?? 2));
      const maxFloors = Math.max(minFloors, Math.min(10, c.max_floors ?? 5));

      if (c.enterable_hero_building && !heroCompound) {
        const anchorCenter = getZoneBounds(zone).center;
        const hx =
          zone === 'commercial_main'
            ? -(road.width * 0.5 + 8.5)
            : anchorCenter[0] - 12;
        const hz = zone === 'commercial_main' ? 4 : anchorCenter[1];
        const hy = getGroundY(hx, hz, terrain, road);
        heroCompound = {
          id: makeId('hero_compound'),
          kind: 'hero_compound',
          name: '英雄建筑 (可进入室内外)',
          position: [hx, hy, hz],
          rotationY: Math.PI / 2,
          visible: true,
          locked: false,
        };
        occupiedBoxes.push({
          minX: hx - 8,
          maxX: hx + 8,
          minZ: hz - 8,
          maxZ: hz + 8,
          height: 8.5,
        });
        registerSemanticLandmarks();
      }

      const bounds = getZoneBounds(zone);
      let placed = 0;
      const candidates: { x: number; z: number; rotY: number }[] = [];
      if (zone === 'commercial_main') {
        for (let z = -72; z <= 72; z += 18) {
          if (Math.abs(z) < road.width * 0.5 + 10) continue;
          candidates.push({ x: -(road.width * 0.5 + 10), z, rotY: Math.PI / 2 });
          candidates.push({ x: road.width * 0.5 + 10, z, rotY: -Math.PI / 2 });
        }
      } else {
        for (let x = bounds.xRange[0]; x <= bounds.xRange[1]; x += 18) {
          for (let z = bounds.zRange[0]; z <= bounds.zRange[1]; z += 18) {
            if (terrain.hasWaterChannel && Math.abs(x - -46) < 20) continue;
            const rotY = x < 0 ? Math.PI / 2 : -Math.PI / 2;
            candidates.push({ x, z, rotY });
          }
        }
      }

      for (const cand of candidates) {
        if (placed >= targetCount) break;
        const rDist = distanceToRoad(cand.x, cand.z, road);
        if (rDist < road.width * 0.5 + 6.5) continue;
        if (terrain.hasWaterChannel && Math.abs(cand.x - -46) < 19) continue;

        const w = 9 + ((placed * 3) % 5);
        const d = 8 + ((placed * 2) % 4);
        const floors =
          minFloors + ((placed * 7 + style.length) % (maxFloors - minFloors + 1));

        const box: Box2D = {
          minX: cand.x - w * 0.5,
          maxX: cand.x + w * 0.5,
          minZ: cand.z - d * 0.5,
          maxZ: cand.z + d * 0.5,
          height: floors * 3.2 + 1,
        };
        if (occupiedBoxes.some((ex) => boxesOverlap(box, ex, 2.2))) continue;

        const gy = getGroundY(cand.x, cand.z, terrain, road);
        occupiedBoxes.push(box);
        const bId = makeId('bldg');
        const bName = `${
          zone === 'old_industrial'
            ? '工业厂房'
            : zone === 'canal_bank'
            ? '河岸建筑'
            : '街区大厦'
        } ${buildings.length + 1}`;
        buildings.push({
          id: bId,
          kind: 'building',
          name: bName,
          district: inferDistrict(cand.x, cand.z),
          style,
          position: [cand.x, gy, cand.z],
          rotationY: cand.rotY,
          width: w,
          depth: d,
          floors,
          hasFireEscape: style === 'industrial' || placed % 2 === 0,
          visible: true,
          locked: false,
        });
        registerAnchor(
          [bId, bName, `building_${buildings.length}`],
          [cand.x, gy, cand.z],
          cand.rotY,
          floors * 3.2,
          Math.max(w, d) * 0.5
        );
        placed++;
      }
      logs.push(`✓ 街区 [${zone}] 生成 ${placed} 栋复合建筑`);
    } else if (c.cmd === 'scatter_props') {
      const zone = c.zone ?? heroZone;
      const preset = c.preset ?? 'street_urban';
      const density = Math.max(0.2, Math.min(1, c.density ?? 0.65));
      const bounds = getZoneBounds(zone);
      const [zx, zz] = bounds.center;
      const focusFilter =
        c.focus_items && c.focus_items.length > 0 ? new Set(c.focus_items) : null;
      const allow = (t: ScatteredPropType) => !focusFilter || focusFilter.has(t);
      let added = 0;

      // Zone-matched sidewalk lamps & greenery
      const zoneAnchors = roadLayout.sidewalkAnchors.filter(
        (a) => a.district === zone || (zone === 'commercial_main' && Math.hypot(a.position[0], a.position[2]) < 55)
      );
      const stride = density > 0.7 ? 1 : 2;
      zoneAnchors.forEach((anc, idx) => {
        if (idx % stride !== 0) return;
        if ((preset === 'street_urban' || preset === 'tactical_cover') && allow('lamp')) {
          scatteredProps.push({
            id: makeId('lamp'),
            type: 'lamp',
            position: anc.position,
            rotationY: anc.rotationY,
            scale: 1,
          });
          added++;
        }
        if ((preset === 'canal_trees' || (preset === 'street_urban' && idx % 2 === 0)) && (allow('tree') || allow('bush'))) {
          const tx = anc.position[0] + (anc.position[0] < 0 ? -1.8 : 1.8);
          const tz = anc.position[2] + 4.2;
          if (!pointInsideAnyBox(tx, 1, tz, occupiedBoxes)) {
            scatteredProps.push({
              id: makeId('tree'),
              type: idx % 3 === 0 ? 'bush' : 'tree',
              position: [tx, getGroundY(tx, tz, terrain, road), tz],
              rotationY: (idx * 1.1) % (Math.PI * 2),
              scale: 0.9 + (idx % 3) * 0.15,
            });
            added++;
          }
        }
      });

      // Zone-centered props (never hardcoded to origin only!)
      const half = road.width * 0.5;
      if ((preset === 'street_urban' || preset === 'tactical_cover') && allow('car')) {
        const carSpots: [number, number, number][] =
          zone === 'commercial_main'
            ? [
                [half - 1.7, -10, 0],
                [-(half - 1.7), 14, Math.PI],
                [half - 1.7, 24, 0.08],
                [-(half - 1.7), -26, Math.PI - 0.1],
              ]
            : [
                [zx - 3, zz + 4, 0.1],
                [zx + 4, zz - 5, Math.PI + 0.15],
                [zx - 5, zz - 12, -0.2],
              ];
        carSpots.slice(0, Math.ceil(carSpots.length * density)).forEach(([cx, cz, ry]) => {
          if (!pointInsideAnyBox(cx, 1, cz, occupiedBoxes)) {
            const p: Vec3 = [cx, getGroundY(cx, cz, terrain, road), cz];
            scatteredProps.push({ id: makeId('car'), type: 'car', position: p, rotationY: ry, scale: 1 });
            placedStoryProps.push(p);
            added++;
          }
        });
      }

      if ((preset === 'tactical_cover' || preset === 'street_urban') && allow('barrier')) {
        const bBaseX = zone === 'commercial_main' ? 0 : zx;
        const bBaseZ = zone === 'commercial_main' ? 0 : zz;
        const bSpots: [number, number, number][] = [
          [bBaseX - 2.2, bBaseZ + 5.5, 0.15],
          [bBaseX + 1.9, bBaseZ - 5.5, -0.2],
          [bBaseX - 2.5, bBaseZ - 14, 0.25],
        ];
        bSpots.slice(0, Math.max(1, Math.ceil(bSpots.length * density))).forEach(([bx, bz, ry]) => {
          if (!pointInsideAnyBox(bx, 1, bz, occupiedBoxes)) {
            const p: Vec3 = [bx, getGroundY(bx, bz, terrain, road), bz];
            scatteredProps.push({ id: makeId('barrier'), type: 'barrier', position: p, rotationY: ry, scale: 1 });
            placedStoryProps.push(p);
            added++;
          }
        });
      }

      if ((preset === 'industrial_cargo' || preset === 'tactical_cover') && allow('cargo_stack')) {
        const cSpots: [number, number, number][] = [
          [zx - 3.5, zz + 2, 0.2],
          [zx + 4.5, zz - 3, -0.4],
          [zx + 9, zz + 7, 0.5],
          [zx - 8, zz - 9, 0.1],
        ];
        cSpots.slice(0, Math.max(1, Math.ceil(cSpots.length * density))).forEach(([kx, kz, ry]) => {
          if (!pointInsideAnyBox(kx, 1, kz, occupiedBoxes)) {
            const p: Vec3 = [kx, getGroundY(kx, kz, terrain, road), kz];
            scatteredProps.push({ id: makeId('cargo'), type: 'cargo_stack', position: p, rotationY: ry, scale: 1 });
            placedStoryProps.push(p);
            added++;
          }
        });
      }

      if (preset === 'canal_trees' && (allow('tree') || allow('bush') || allow('rock'))) {
        for (let i = 0; i < Math.round(10 * density); i++) {
          const tx = -40 + ((i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 3));
          const tz = -50 + i * 11;
          if (!pointInsideAnyBox(tx, 1, tz, occupiedBoxes)) {
            scatteredProps.push({
              id: makeId('canal_tree'),
              type: i % 3 === 0 ? 'bush' : 'tree',
              position: [tx, getGroundY(tx, tz, terrain, road), tz],
              rotationY: i * 0.9,
              scale: 1.0 + (i % 3) * 0.15,
            });
            added++;
          }
        }
        // Coastal / canal bank weathered boulders
        const rockCoords: [number, number, number][] = [
          [-34, -38, 1.3],
          [-58, -22, 1.6],
          [-33, 18, 1.15],
          [-59, 34, 1.45],
          [-86, -62, 1.8],
          [-90, 28, 1.65],
          [88, -56, 1.55],
          [90, 42, 1.75],
          [-18, -90, 1.4],
          [24, 91, 1.6],
        ];
        rockCoords.forEach(([rx, rz, rScale], rIdx) => {
          if (!pointInsideAnyBox(rx, 0.5, rz, occupiedBoxes)) {
            scatteredProps.push({
              id: makeId('rock'),
              type: 'rock',
              position: [rx, getGroundY(rx, rz, terrain, road) - 0.12, rz],
              rotationY: rIdx * 1.17,
              scale: rScale,
            });
            added++;
          }
        });
      }

      logs.push(`✓ 区块 [${zone}] 资产散射 [${preset}]：部署 ${added} 组道具`);
    } else if (c.cmd === 'place_scene_elements') {
      const cmdZone = c.zone ?? heroZone;
      let placedCount = 0;

      for (const el of c.elements) {
        const mapped = mapElementItem(el.item);
        const count = Math.max(1, Math.min(18, el.count ?? 1));
        const arrangement = el.arrangement ?? (count > 1 ? 'cluster' : 'single');
        const effectiveRelation =
          arrangement === 'ring' && el.relation !== 'on_top_of' ? 'around' : el.relation;
        const singleHint =
          count === 1 && mapped.propType !== 'floor'
            ? `${el.id ?? ''} ${el.label ?? ''} ${el.item ?? ''}`
            : undefined;
        const { baseX, baseYOffset, baseZ, anc } = resolveRelativePlacement(
          el.anchor,
          cmdZone,
          effectiveRelation,
          el.distance_m,
          el.offset_m,
          singleHint
        );
        const baseRot = ((el.rotation_y_deg ?? 0) * Math.PI) / 180;

        for (let i = 0; i < count; i++) {
          let px = baseX;
          let pz = baseZ;
          let ry = baseRot;

          if (count > 1) {
            if (arrangement === 'ring') {
              const ang = (i / count) * Math.PI * 2 + Math.PI * 0.25;
              const rad =
                el.relation === 'on_top_of'
                  ? Math.min(
                      Math.max(2.2, el.distance_m ?? 4.5),
                      Math.max(2.4, anc.radius * 0.78)
                    )
                  : Math.max(anc.radius + 2.0, Math.min(16, el.distance_m ?? count * 1.2));
              px = anc.pos[0] + Math.cos(ang) * rad;
              pz = anc.pos[2] + Math.sin(ang) * rad;
              ry = -ang + Math.PI / 2;
            } else if (effectiveRelation === 'around') {
              const ang = (i / count) * Math.PI * 2 + (i % 2) * 0.35;
              const rad =
                Math.max(anc.radius + 1.8, el.distance_m ?? 5.2) + (i % 3) * 1.1;
              px = anc.pos[0] + Math.cos(ang) * rad;
              pz = anc.pos[2] + Math.sin(ang) * rad;
              ry = baseRot + i * 0.55;
            } else if (arrangement === 'grid') {
              const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
              const rows = Math.max(1, Math.ceil(count / cols));
              const step = mapped.scatterType === 'car' ? 5.2 : 3.2;
              const col = i % cols;
              const row = Math.floor(i / cols);
              px = baseX + (col - (cols - 1) * 0.5) * step;
              pz = baseZ + (row - (rows - 1) * 0.5) * step;
            } else if (arrangement === 'convoy' || arrangement === 'line') {
              const step = mapped.scatterType === 'car' ? 6.5 : 2.8;
              if (effectiveRelation === 'behind' || effectiveRelation === 'in_front_of') {
                px = baseX + (i - (count - 1) * 0.5) * step;
                pz = baseZ + (i % 2 === 0 ? -0.35 : 0.35);
              } else {
                pz = baseZ - (i - (count - 1) * 0.5) * step;
                px = baseX + (i % 2 === 0 ? -0.35 : 0.35);
              }
            } else if (arrangement === 'pair') {
              px = baseX + (i % 2 === 0 ? -2.2 : 2.2);
              pz = baseZ + Math.floor(i / 2) * 3.0;
            } else {
              // cluster or scatter
              const angle = i * 2.39996;
              const radius = 1.6 + Math.sqrt(i + 1) * 1.4;
              px = baseX + Math.cos(angle) * radius;
              pz = baseZ + Math.sin(angle) * radius;
              ry = baseRot + i * 0.45;
            }
          }

          ry = computeFacingRotY(px, pz, el.facing, anc, ry);

          // Snap ramp and stairs flush to the outer edge of a raised platform
          if (
            (mapped.propType === 'ramp' || mapped.propType === 'stairs') &&
            anc.radius >= 3.0
          ) {
            const edgeDist = anc.radius + 1.35;
            if (effectiveRelation === 'left_of') {
              px = anc.pos[0] - edgeDist;
              pz = anc.pos[2];
              ry = Math.PI / 2;
            } else if (effectiveRelation === 'right_of') {
              px = anc.pos[0] + edgeDist;
              pz = anc.pos[2];
              ry = -Math.PI / 2;
            } else if (effectiveRelation === 'behind') {
              px = anc.pos[0];
              pz = anc.pos[2] - edgeDist;
              ry = 0;
            } else {
              px = anc.pos[0];
              pz = anc.pos[2] + edgeDist;
              ry = Math.PI;
            }
          }

          if (pointInsideAnyBox(px, 1, pz, occupiedBoxes) && !(el.anchor ?? '').includes('lobby')) {
            px = baseX;
          }

          let py =
            el.relation === 'on_top_of'
              ? baseYOffset
              : getGroundY(px, pz, terrain, road) + Math.max(0, baseYOffset);

          // If explicitly placed on_top_of or inside an existing floor/platform, stack cleanly on its top surface
          if (
            mapped.propType !== 'floor' &&
            mapped.propType !== 'ramp' &&
            mapped.propType !== 'stairs' &&
            (el.relation === 'on_top_of' ||
              el.relation === 'at' ||
              el.relation === 'inside' ||
              !el.relation)
          ) {
            for (const existingAsset of assets) {
              if (existingAsset.type !== 'floor') continue;
              const halfW = 3.0 * (existingAsset.scale[0] ?? 1);
              const halfD = 3.0 * (existingAsset.scale[2] ?? 1);
              const topSurfaceY = existingAsset.position[1] + 0.2 * (existingAsset.scale[1] ?? 1);
              if (
                Math.abs(px - existingAsset.position[0]) <= halfW + 0.2 &&
                Math.abs(pz - existingAsset.position[2]) <= halfD + 0.2
              ) {
                py = Math.max(py, Number(topSurfaceY.toFixed(3)));
              }
            }
          }

          if (mapped.unsupported) {
            const itemName = `${el.label || el.item} (${el.item})`;
            if (!unsupportedItems.includes(itemName)) {
              unsupportedItems.push(itemName);
              warnings.push(
                `资产库暂无原生 "${el.item}" 模型，已用几何体块 [box] 代用标注：${el.label || el.item}`
              );
            }
          }

          const explicitId =
            typeof el.id === 'string' && el.id.trim()
              ? count > 1
                ? `${el.id.trim()}_${i + 1}`
                : el.id.trim()
              : null;

          if (mapped.scatterType) {
            const propId = explicitId ?? makeId('el_prop');
            const propLabel = el.label || `${el.item}_${i + 1}`;
            scatteredProps.push({
              id: propId,
              type: mapped.scatterType,
              position: [px, py, pz],
              rotationY: ry,
              scale: el.scale ? Math.max(0.4, Math.min(3, el.scale[0])) : 1,
            });
            registerAnchor(
              [propId, propLabel, el.id ?? '', el.label ?? ''],
              [px, py, pz],
              ry,
              mapped.scatterType === 'tree' ? 4.5 : 1.6,
              1.6
            );
            placedStoryProps.push([px, py, pz]);
          } else if (mapped.propType) {
            const defaultScale: Vec3 =
              mapped.propType === 'floor'
                ? [2.2, 4.0, 2.2]
                : [1, 1, 1];
            const scaleVec: Vec3 = [...(el.scale ?? defaultScale)] as Vec3;
            if (
              (mapped.propType === 'ramp' || mapped.propType === 'stairs') &&
              anc.radius >= 3.0 &&
              anc.topY > py + 0.2
            ) {
              const unitH = mapped.propType === 'stairs' ? 2.0 : 1.5;
              scaleVec[1] = Number(Math.max(0.35, (anc.topY - py) / unitH).toFixed(2));
            }
            const assetId = explicitId ?? makeId('el_asset');
            const assetName = mapped.unsupported
              ? `[代用] ${el.label || el.item} ${i + 1}`
              : el.label || (count > 1 ? `${el.item} ${i + 1}` : el.item);
            assets.push({
              id: assetId,
              kind: 'asset',
              type: mapped.propType,
              name: assetName,
              position: [px, py, pz],
              rotation: [0, ry, 0],
              scale: scaleVec,
              visible: true,
              locked: false,
            });
            const baseHeightMap: Partial<Record<PropType, number>> = {
              floor: 0.2,
              roof: 0.25,
              stairs: 2.0,
              ramp: 1.5,
              pillar: 3.5,
              wall: 3.0,
              doorway: 3.0,
              crate: 1.1,
              table: 0.78,
              barrier: 1.0,
            };
            const baseRadiusMap: Partial<Record<PropType, number>> = {
              floor: 3.0,
              roof: 3.0,
              stairs: 1.5,
              ramp: 1.5,
              pillar: 0.4,
              wall: 2.0,
              doorway: 2.0,
              crate: 0.6,
              table: 0.9,
              barrier: 1.2,
            };
            const realH = (baseHeightMap[mapped.propType] ?? 1.2) * (scaleVec[1] ?? 1);
            const realR =
              (baseRadiusMap[mapped.propType] ?? 1.0) *
              Math.max(scaleVec[0] ?? 1, scaleVec[2] ?? 1);
            const extraPlatformAliases =
              mapped.propType === 'floor' ? ['platform', 'high_platform', '高台', '中央高台'] : [];
            registerAnchor(
              [assetId, assetName, el.id ?? '', el.label ?? '', ...extraPlatformAliases],
              [px, py, pz],
              ry,
              realH,
              realR
            );
            placedStoryProps.push([px, py, pz]);
          }
          placedCount++;
        }
      }
      logs.push(`✓ 语义元素布置：按相对空间关系精确构建 ${placedCount} 个场景构件/道具`);
    } else if (c.cmd === 'create_custom_models') {
      const cmdZone = c.zone ?? heroZone;
      let builtModelsCount = 0;

      const VALID_SHAPES = new Set<PrimitiveShape>([
        'box',
        'cylinder',
        'sphere',
        'cone',
        'plane',
        'torus',
        'dodecahedron',
        'capsule',
      ]);
      const VALID_MATS = new Set<ProceduralMaterialKind>([
        'matte',
        'wood',
        'stone',
        'metal',
        'glass',
        'foliage',
        'emissive',
        'fabric',
      ]);
      const WATER_LEVEL_Y = -1.15;

      for (const req of c.models) {
        const rawParts =
          Array.isArray(req.composite_primitives) && req.composite_primitives.length > 0
            ? req.composite_primitives
            : req.parts;
        if (!Array.isArray(rawParts) || rawParts.length === 0) continue;
        const count = Math.max(1, Math.min(12, req.count ?? 1));
        const arrangement = req.arrangement ?? (count > 1 ? 'cluster' : 'single');
        const { baseX, baseYOffset, baseZ, anc } = resolveRelativePlacement(
          req.anchor,
          cmdZone,
          req.relation,
          req.distance_m,
          req.offset_m
        );
        const baseRot = ((req.rotation_y_deg ?? 0) * Math.PI) / 180;
        const modelScale: Vec3 = req.scale
          ? [
              Math.max(0.2, Math.min(5, req.scale[0] || 1)),
              Math.max(0.2, Math.min(5, req.scale[1] || 1)),
              Math.max(0.2, Math.min(5, req.scale[2] || 1)),
            ]
          : [1, 1, 1];

        let maxPartTopY = 1.5;
        const normalizedParts: CustomModelPart[] = rawParts.slice(0, 32).map((p, idx) => {
          const shape = VALID_SHAPES.has(p.shape) ? p.shape : 'box';
          const mat = p.material && VALID_MATS.has(p.material) ? p.material : 'matte';
          const rawPos = p.local_position ?? p.position ?? [0, 0.5, 0];
          const deg = p.local_rotation_deg ?? p.rotation_deg ?? [0, 0, 0];
          const sizeVec: Vec3 = [
            Math.max(0.05, Math.min(60, Number.isFinite(p.size?.[0]) ? p.size[0] : 1)),
            Math.max(0.05, Math.min(60, Number.isFinite(p.size?.[1]) ? p.size[1] : 1)),
            Math.max(0.05, Math.min(60, Number.isFinite(p.size?.[2]) ? p.size[2] : 1)),
          ];
          const posY = Number.isFinite(rawPos[1]) ? rawPos[1] : 0.5;
          maxPartTopY = Math.max(maxPartTopY, posY + sizeVec[1] * 0.5);
          return {
            id: makeId(`part_${idx}`),
            name: p.name,
            shape,
            position: [
              Number.isFinite(rawPos[0]) ? rawPos[0] : 0,
              posY,
              Number.isFinite(rawPos[2]) ? rawPos[2] : 0,
            ],
            rotation: [
              ((Number.isFinite(deg[0]) ? deg[0] : 0) * Math.PI) / 180,
              ((Number.isFinite(deg[1]) ? deg[1] : 0) * Math.PI) / 180,
              ((Number.isFinite(deg[2]) ? deg[2] : 0) * Math.PI) / 180,
            ],
            size: sizeVec,
            topRatio: typeof p.top_ratio === 'number' ? p.top_ratio : undefined,
            color:
              typeof p.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(p.color.trim())
                ? p.color.trim()
                : '#cbd5e1',
            materialKind: mat,
          };
        });

        for (let i = 0; i < count; i++) {
          let px = baseX;
          let pz = baseZ;
          let ry = baseRot;

          if (count > 1) {
            if (arrangement === 'ring') {
              const ang = (i / count) * Math.PI * 2 + 0.3;
              const rad = Math.max(4.5, req.distance_m ?? count * 1.4);
              px = baseX + Math.cos(ang) * rad;
              pz = baseZ + Math.sin(ang) * rad;
              ry = -ang + Math.PI / 2;
            } else if (arrangement === 'grid') {
              const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
              const rows = Math.max(1, Math.ceil(count / cols));
              const step = 5.5;
              const col = i % cols;
              const row = Math.floor(i / cols);
              px = baseX + (col - (cols - 1) * 0.5) * step;
              pz = baseZ + (row - (rows - 1) * 0.5) * step;
            } else if (arrangement === 'line') {
              pz = baseZ - (i - (count - 1) * 0.5) * 4.5;
            } else if (arrangement === 'pair') {
              px = baseX + (i % 2 === 0 ? -3.0 : 3.0);
              pz = baseZ + Math.floor(i / 2) * 4.0;
            } else {
              const ang = i * 2.39996;
              const rad = 2.4 + Math.sqrt(i + 1) * 2.0;
              px = baseX + Math.cos(ang) * rad;
              pz = baseZ + Math.sin(ang) * rad;
              ry = baseRot + i * 0.4;
            }
          }

          ry = computeFacingRotY(px, pz, req.facing, anc, ry);

          if (
            req.place_on !== 'water_surface' &&
            pointInsideAnyBox(px, 1, pz, occupiedBoxes) &&
            !(req.anchor ?? '').includes('lobby')
          ) {
            px = baseX;
          }

          const py =
            req.place_on === 'water_surface'
              ? WATER_LEVEL_Y + baseYOffset
              : req.relation === 'on_top_of'
              ? baseYOffset
              : getGroundY(px, pz, terrain, road) + baseYOffset;

          const modelId =
            typeof req.id === 'string' && req.id.trim()
              ? count > 1
                ? `${req.id.trim()}_${i + 1}`
                : req.id.trim()
              : makeId('cmodel');
          const modelName = count > 1 ? `${req.name} ${i + 1}` : req.name;

          customModels.push({
            id: modelId,
            kind: 'custom_model',
            name: modelName,
            description: req.description,
            position: [px, py, pz],
            rotation: [0, ry, 0],
            scale: modelScale,
            parts: normalizedParts.map((part) => ({ ...part, id: makeId('part') })),
            visible: true,
            locked: false,
          });
          registerAnchor(
            [modelId, modelName, req.id ?? '', req.name],
            [px, py, pz],
            ry,
            maxPartTopY * modelScale[1],
            2.2
          );
          placedStoryProps.push([px, Math.max(py, 0), pz]);
          builtModelsCount++;
        }
      }

      logs.push(`✓ 开放词表复合体拼装 (composite_primitives)：已组装 ${builtModelsCount} 组 THREE.Group 层级构件`);
    } else if (c.cmd === 'stage_characters') {
      const stageZone = c.zone ?? heroZone;
      const stageCenter = getZoneBounds(stageZone).center;
      const cast = Array.isArray(c.cast) ? c.cast : [];
      const startIndex = characters.length;

      cast.forEach((member, idx) => {
        const charIndex = startIndex + idx;
        const pose = normalizePose(member.action);
        const rule = (member.placement_rule ?? '').toLowerCase();
        const dist = Math.max(0.8, Math.min(40, Number(member.distance_m) || 2.2));

        let pos: Vec3 = [
          stageCenter[0] + (charIndex % 2 === 0 ? -1.8 : 1.8),
          getGroundY(stageCenter[0], stageCenter[1] + charIndex * 2, terrain, road),
          stageCenter[1] + 2 - charIndex * 3.5,
        ];
        let rotY = charIndex % 2 === 0 ? Math.PI : 0;

        // 1) Relative placement if anchor / relative_to / relation refers to any registered anchor or character
        const anchorKey = member.anchor ?? member.relative_to;
        const matchedAnchor = lookupAnchorEntry(anchorKey);
        let relActor: CharacterActor | undefined;
        if (member.relative_to) {
          const targetKey = member.relative_to.toLowerCase();
          relActor =
            characters.find(
              (ch) =>
                ch.id.toLowerCase() === targetKey || ch.name.toLowerCase().includes(targetKey)
            ) ?? characters[0];
        }

        // Check if there is a raised platform in the scene
        const floorAsset = assets.find((a) => a.type === 'floor');
        const floorTopY = floorAsset
          ? floorAsset.position[1] + 0.2 * (floorAsset.scale[1] ?? 1)
          : null;
        const floorRadius = floorAsset
          ? 3.0 * Math.max(floorAsset.scale[0] ?? 1, floorAsset.scale[2] ?? 1)
          : 0;

        if (relActor && floorAsset && floorTopY !== null && relActor.position[1] >= floorTopY - 0.2) {
          const span = Math.min(Math.max(2.0, dist * 0.6), floorRadius * 0.58);
          const rx = floorAsset.position[0] + (charIndex % 2 === 0 ? -0.4 : 0.4);
          const rz =
            relActor.position[2] >= floorAsset.position[2]
              ? floorAsset.position[2] - span
              : floorAsset.position[2] + span;
          pos = [rx, Number(floorTopY.toFixed(3)), rz];
          rotY = Math.atan2(relActor.position[0] - rx, relActor.position[2] - rz);
        } else if (matchedAnchor && (member.relation || member.anchor || member.relative_to)) {
          const anchorGroundY = getGroundY(
            matchedAnchor.pos[0],
            matchedAnchor.pos[2],
            terrain,
            road
          );
          const isPlatformAnchor =
            matchedAnchor.radius >= 3.0 && matchedAnchor.topY >= anchorGroundY + 0.35;
          if (isPlatformAnchor && dist <= matchedAnchor.radius) {
            const span = Math.min(Math.max(2.2, dist), matchedAnchor.radius * 0.58);
            let ox = charIndex % 2 === 0 ? -0.35 : 0.35;
            let oz = 0;
            const rel = member.relation;
            if (rel === 'in_front_of') oz = span;
            else if (rel === 'behind') oz = -span;
            else if (rel === 'left_of') ox = -span;
            else if (rel === 'right_of') ox = span;
            else {
              oz = charIndex % 2 === 0 ? span : -span;
            }
            // Prevent two characters from landing at the same spot on the platform
            if (
              characters.some(
                (ch) =>
                  Math.hypot(
                    ch.position[0] - (matchedAnchor.pos[0] + ox),
                    ch.position[2] - (matchedAnchor.pos[2] + oz)
                  ) < 1.8
              )
            ) {
              oz = -oz || (charIndex % 2 === 0 ? span : -span);
            }
            const rx = matchedAnchor.pos[0] + ox;
            const rz = matchedAnchor.pos[2] + oz;
            pos = [rx, matchedAnchor.topY, rz];
            rotY = Math.atan2(matchedAnchor.pos[0] - rx, matchedAnchor.pos[2] - rz);
          } else {
            const relPlacement = resolveRelativePlacement(
              anchorKey,
              stageZone,
              member.relation ?? 'in_front_of',
              dist
            );
            const rx = relPlacement.baseX;
            const rz = relPlacement.baseZ;
            const ry =
              member.relation === 'on_top_of'
                ? relPlacement.baseYOffset
                : getGroundY(rx, rz, terrain, road) + Math.max(0, relPlacement.baseYOffset);
            pos = [rx, ry, rz];
            rotY = computeFacingRotY(rx, rz, member.facing ?? 'toward_anchor', relPlacement.anc, 0);
          }
        } else if (rule.includes('rooftop') && heroCompound) {
          const hx = heroCompound.position[0];
          const hy = heroCompound.position[1];
          const hz = heroCompound.position[2];
          pos = [hx + 4.2, hy + 6.82, hz - 1.2 + idx * 1.4];
          rotY = Math.PI / 2;
        } else if (rule.includes('balcony') && heroCompound) {
          const hx = heroCompound.position[0];
          const hy = heroCompound.position[1];
          const hz = heroCompound.position[2];
          pos = [hx + 5.8, hy + 3.56, hz + (idx % 2 === 0 ? -1.2 : 1.2)];
          rotY = Math.PI / 2;
        } else if ((rule.includes('lobby') || rule.includes('inside')) && heroCompound) {
          const hx = heroCompound.position[0];
          const hy = heroCompound.position[1];
          const hz = heroCompound.position[2];
          pos = [hx - 0.6, hy + 0.25, hz + (idx % 2 === 0 ? 1.1 : -1.1)];
          rotY = Math.PI / 2;
        } else if (relActor) {
          const rx = relActor.position[0] + Math.sin(idx * 1.7) * dist * 0.4;
          const rz = relActor.position[2] - dist;
          pos = [rx, getGroundY(rx, rz, terrain, road), rz];
          rotY = 0;
        } else if (rule.includes('cover') || rule.includes('behind')) {
          const coverPool = scatteredProps.filter(
            (p) => p.type === 'barrier' || p.type === 'car' || p.type === 'cargo_stack'
          );
          const sortedCovers = [...coverPool].sort(
            (a, b) =>
              Math.hypot(a.position[0] - stageCenter[0], a.position[2] - stageCenter[1]) -
              Math.hypot(b.position[0] - stageCenter[0], b.position[2] - stageCenter[1])
          );
          const cover = sortedCovers[idx % Math.max(1, sortedCovers.length)];
          if (cover) {
            const cx = cover.position[0];
            const cz = cover.position[2] + Math.min(2.4, dist);
            pos = [cx, getGroundY(cx, cz, terrain, road), cz];
            rotY = Math.PI;
          }
        } else if (rule.includes('plaza') || rule.includes('center') || rule.includes('platform')) {
          const px = stageCenter[0] + (idx - (cast.length - 1) * 0.5) * 3.2;
          const pz = stageCenter[1] + (idx % 2 === 0 ? 2.5 : -2.5);
          pos = [px, getGroundY(px, pz, terrain, road), pz];
          rotY = idx % 2 === 0 ? Math.PI : 0;
        } else if (rule.includes('canal') || rule.includes('river')) {
          const cx = -34 - (idx % 2) * 3;
          const cz = -12 + idx * 8;
          pos = [cx, getGroundY(cx, cz, terrain, road), cz];
          rotY = -Math.PI / 2;
        } else if (rule.includes('wall') && buildings.length > 0) {
          const b = buildings[0];
          const wx = b.position[0] + (b.position[0] < 0 ? b.width * 0.5 + 0.6 : -b.width * 0.5 - 0.6);
          const wz = b.position[2];
          pos = [wx, getGroundY(wx, wz, terrain, road), wz];
          rotY = b.position[0] < 0 ? Math.PI / 2 : -Math.PI / 2;
        } else if (rule.includes('street') || rule.includes('down')) {
          const sx = stageCenter[0] + (idx % 2 === 0 ? 1.8 : -1.8);
          const sz = stageCenter[1] - 12 - idx * 4;
          pos = [sx, getGroundY(sx, sz, terrain, road), sz];
          rotY = 0;
        }

        // Apply semantic facing if specified
        const facingStr = (member.facing ?? '').toLowerCase();
        if (relActor && (facingStr.includes('target') || facingStr.includes('hero') || facingStr.includes('toward'))) {
          rotY = Math.atan2(relActor.position[0] - pos[0], relActor.position[2] - pos[2]);
        } else if (characters.length > 0 && (facingStr.includes('toward') || facingStr.includes('opponent'))) {
          const opp = characters[startIndex] ?? characters[0];
          rotY = Math.atan2(opp.position[0] - pos[0], opp.position[2] - pos[2]);
        }

        const BASE_DIMS: Partial<Record<PropType, [number, number, number]>> = {
          floor: [6, 0.2, 6],
          stairs: [2, 2, 3],
          ramp: [2, 1.5, 3],
          pillar: [0.6, 3.5, 0.6],
          crate: [1.1, 1.1, 1.1],
          wall: [4, 3, 0.3],
          table: [1.8, 0.78, 0.9],
        };
        for (const a of assets) {
          const base = BASE_DIMS[a.type];
          if (!base) continue;
          const halfX = base[0] * (a.scale[0] ?? 1) * 0.5;
          const halfZ = base[2] * (a.scale[2] ?? 1) * 0.5;
          const height = base[1] * (a.scale[1] ?? 1);
          const insideX = Math.abs(pos[0] - a.position[0]) <= halfX + 0.35;
          const insideZ = Math.abs(pos[2] - a.position[2]) <= halfZ + 0.35;
          if (!insideX || !insideZ) continue;
          if (a.type === 'floor' && pos[1] >= a.position[1] - 0.5) {
            pos = [pos[0], Number((a.position[1] + height).toFixed(3)), pos[2]];
          } else if (a.type === 'stairs' || a.type === 'ramp' || a.type === 'pillar' || a.type === 'crate' || a.type === 'table') {
            const sideSign = pos[0] >= a.position[0] ? 1 : -1;
            const nx = a.position[0] + sideSign * (halfX + 1.1);
            pos = [nx, getGroundY(nx, pos[2], terrain, road), pos[2]];
          }
        }

        const presetCfg = POSE_PRESETS[pose];
        const charId =
          typeof member.id === 'string' && member.id.trim()
            ? member.id.trim()
            : makeId('char');
        const charName = member.role || `角色 ${characters.length + 1}`;
        characters.push({
          id: charId,
          kind: 'character',
          name: charName,
          position: pos,
          rotation: [0, rotY, 0],
          scale: [1, 1, 1],
          pose,
          pelvisOffsetY: presetCfg.pelvisOffsetY,
          joints: cloneJoints(presetCfg.joints),
          visible: true,
          locked: false,
        });
        registerAnchor(
          [charId, charName, member.id ?? '', member.role ?? ''],
          pos,
          rotY,
          1.75,
          0.6
        );
      });
      if (characters.length >= 2) {
        const c0 = characters[0];
        const c1 = characters[1];
        c0.rotation = [
          0,
          Math.atan2(c1.position[0] - c0.position[0], c1.position[2] - c0.position[2]),
          0,
        ];
        c1.rotation = [
          0,
          Math.atan2(c0.position[0] - c1.position[0], c0.position[2] - c1.position[2]),
          0,
        ];
      }
      logs.push(`✓ 已按提示词与空间规则部署 ${cast.length} 名 16 关节角色`);
    } else if (c.cmd === 'apply_scene_patches') {
      const patches = Array.isArray(c.patches) ? c.patches : [];
      let appliedCount = 0;

      const normalizeAliasKey = (raw: string) =>
        raw.trim().toLowerCase().replace(/^#/, '');

      const stripNumericSuffix = (key: string) =>
        key.replace(/[_#\-\s]*0*(\d+)$/, (_, d) => `:${d}`);

      const inferSemanticTypeFromKey = (key: string): string | null => {
        if (/^(car|vehicle|sedan|truck|van|汽车|车|轿车|卡车|警车)/.test(key)) return 'car';
        if (/^(barrier|barricade|fence|路障|防撞墩|护栏|掩体)/.test(key)) return 'barrier';
        if (/^(cargo|cargo_stack|container|货箱|集装箱)/.test(key)) return 'cargo_stack';
        if (/^(crate|box|木箱|箱子)/.test(key)) return 'crate';
        if (/^(tree|pine|树|大树|树木)/.test(key)) return 'tree';
        if (/^(bush|shrub|灌木|草丛)/.test(key)) return 'bush';
        if (/^(rock|stone|boulder|岩石|石头|巨石)/.test(key)) return 'rock';
        if (/^(lamp|streetlight|路灯|街灯)/.test(key)) return 'lamp';
        if (/^(floor|platform|high_platform|高台|平台|地板)/.test(key)) return 'floor';
        if (/^(pillar|column|立柱|柱子)/.test(key)) return 'pillar';
        if (/^(stairs|steps|楼梯|台阶)/.test(key)) return 'stairs';
        if (/^(ramp|slope|斜坡|坡道)/.test(key)) return 'ramp';
        if (/^(wall|墙壁|矮墙|墙)/.test(key)) return 'wall';
        if (/^(doorway|gate|门|门口)/.test(key)) return 'doorway';
        return null;
      };

      const matchIdOrName = (item: { id: string; name?: string }, targetId: string) => {
        const key = normalizeAliasKey(targetId);
        if (!key) return false;
        if (item.id.toLowerCase() === key) return true;
        if (item.name && item.name.toLowerCase() === key) return true;
        if (item.name && item.name.toLowerCase().includes(key)) return true;
        if (item.name && key.length >= 2 && key.includes(item.name.toLowerCase())) return true;
        return false;
      };

      const resolveCharacterIndex = (targetId: string): number => {
        const idx = characters.findIndex((ch) => matchIdOrName(ch, targetId));
        if (idx >= 0) return idx;
        const key = normalizeAliasKey(targetId);
        if (['hero', 'protagonist', 'player', 'main', '主角', '主人公', '我方'].some((k) => key === k || key.includes(k))) {
          return characters.length > 0 ? 0 : -1;
        }
        if (['opponent', 'rival', 'enemy', 'guard', 'sentinel', '对手', '反派', '敌人', '哨兵'].some((k) => key === k || key.includes(k))) {
          return characters.length > 1 ? 1 : characters.length > 0 ? 0 : -1;
        }
        const m = /^(?:char|character|actor|角色)[_\-\s]*0*(\d+)$/.exec(key);
        if (m) {
          const n = Number(m[1]) - 1;
          if (n >= 0 && n < characters.length) return n;
        }
        return -1;
      };

      const resolveNthByType = <T extends { id: string; name?: string; type?: string }>(
        list: T[],
        targetId: string
      ): number => {
        const direct = list.findIndex((it) => matchIdOrName(it, targetId));
        if (direct >= 0) return direct;
        const key = normalizeAliasKey(targetId);
        const stripped = stripNumericSuffix(key);
        const [baseKey, idxStr] = stripped.includes(':') ? stripped.split(':') : [key, '1'];
        const semanticType = inferSemanticTypeFromKey(baseKey) ?? baseKey;
        const desiredNth = Math.max(1, Number(idxStr) || 1);
        let seen = 0;
        for (let i = 0; i < list.length; i++) {
          const it = list[i];
          const t = (it.type ?? '').toLowerCase();
          if (
            t === semanticType ||
            (semanticType === 'crate' && t === 'cargo_stack') ||
            (semanticType === 'cargo_stack' && t === 'crate')
          ) {
            seen++;
            if (seen === desiredNth) return i;
          }
        }
        return -1;
      };

      for (const patch of patches) {
        if (patch.op === 'remove' && patch.target_id) {
          const rawTid = patch.target_id.trim();
          const removeAll = Boolean(patch.remove_all || /^all[:_\s]|全部|所有/.test(rawTid.toLowerCase()));
          const tid = rawTid.replace(/^(all[:_\s]+|全部|所有)/i, '').trim() || rawTid;
          let removedCount = 0;

          if (removeAll) {
            const semType = inferSemanticTypeFromKey(normalizeAliasKey(tid));
            for (let i = scatteredProps.length - 1; i >= 0; i--) {
              if (
                scatteredProps[i].id.toLowerCase() === tid.toLowerCase() ||
                (semType && scatteredProps[i].type.toLowerCase() === semType)
              ) {
                scatteredProps.splice(i, 1);
                removedCount++;
              }
            }
            for (let i = assets.length - 1; i >= 0; i--) {
              if (
                matchIdOrName(assets[i], tid) ||
                (semType && assets[i].type.toLowerCase() === semType)
              ) {
                assets.splice(i, 1);
                removedCount++;
              }
            }
            for (let i = customModels.length - 1; i >= 0; i--) {
              if (matchIdOrName(customModels[i], tid)) {
                customModels.splice(i, 1);
                removedCount++;
              }
            }
            for (let i = characters.length - 1; i >= 0; i--) {
              if (matchIdOrName(characters[i], tid)) {
                characters.splice(i, 1);
                removedCount++;
              }
            }
            for (let i = buildings.length - 1; i >= 0; i--) {
              if (matchIdOrName(buildings[i], tid)) {
                buildings.splice(i, 1);
                removedCount++;
              }
            }
          } else {
            const charIdx = resolveCharacterIndex(tid);
            if (charIdx >= 0) {
              characters.splice(charIdx, 1);
              removedCount++;
            }
            const assetIdx = removedCount === 0 ? resolveNthByType(assets, tid) : -1;
            if (assetIdx >= 0) {
              assets.splice(assetIdx, 1);
              removedCount++;
            }
            const cmIdx = removedCount === 0 ? customModels.findIndex((cm) => matchIdOrName(cm, tid)) : -1;
            if (cmIdx >= 0) {
              customModels.splice(cmIdx, 1);
              removedCount++;
            }
            const scatIdx = removedCount === 0 ? resolveNthByType(scatteredProps, tid) : -1;
            if (scatIdx >= 0) {
              scatteredProps.splice(scatIdx, 1);
              removedCount++;
            }
            const bldgIdx = removedCount === 0 ? buildings.findIndex((b) => matchIdOrName(b, tid)) : -1;
            if (bldgIdx >= 0) {
              buildings.splice(bldgIdx, 1);
              removedCount++;
            }
            if (
              removedCount === 0 &&
              heroCompound &&
              (matchIdOrName(heroCompound, tid) || /hero_compound|hero_building|安全屋|主建筑/.test(tid.toLowerCase()))
            ) {
              heroCompound = null;
              removedCount++;
            }
          }

          if (removedCount > 0) {
            appliedCount++;
            logs.push(`✓ 语义 Patch [remove]：已精准移除目标 "${rawTid}" (${removedCount} 项)`);
          } else {
            warnings.push(`Patch [remove] 未找到 target_id "${rawTid}"`);
          }
        } else if (patch.op === 'update' && patch.target_id) {
          const tid = patch.target_id.trim();
          const anchorKey = patch.relative_to ?? patch.anchor;
          const hasExplicitAnchor = Boolean(anchorKey && anchorKey.trim());
          const hasSelfOffsetOrRel = Boolean(
            !hasExplicitAnchor && (patch.offset_m || patch.relation || patch.distance_m !== undefined)
          );
          const relPlacement = hasExplicitAnchor
            ? resolveRelativePlacement(
                anchorKey,
                heroZone,
                patch.relation ?? 'in_front_of',
                patch.distance_m ?? 2.5,
                patch.offset_m
              )
            : null;

          const computeUpdatedPosAndRot = (oldPos: Vec3, oldRotY: number): { pos: Vec3; rotY: number } => {
            let nx = oldPos[0];
            let ny = oldPos[1];
            let nz = oldPos[2];
            let nRotY = oldRotY;
            if (relPlacement) {
              nx = relPlacement.baseX;
              nz = relPlacement.baseZ;
              ny =
                patch.relation === 'on_top_of'
                  ? relPlacement.baseYOffset
                  : getGroundY(nx, nz, terrain, road) + Math.max(0, relPlacement.baseYOffset);
              if (patch.facing) {
                nRotY = computeFacingRotY(nx, nz, patch.facing, relPlacement.anc, oldRotY);
              }
            } else if (hasSelfOffsetOrRel) {
              const dist =
                typeof patch.distance_m === 'number' && Number.isFinite(patch.distance_m)
                  ? patch.distance_m
                  : 2.0;
              let dx = patch.offset_m?.[0] ?? 0;
              let dy = patch.offset_m?.[1] ?? 0;
              let dz = patch.offset_m?.[2] ?? 0;
              if (!patch.offset_m && patch.relation) {
                const fwdX = Math.sin(oldRotY);
                const fwdZ = Math.cos(oldRotY);
                const rightX = Math.cos(oldRotY);
                const rightZ = -Math.sin(oldRotY);
                if (patch.relation === 'in_front_of') {
                  dx = fwdX * dist;
                  dz = fwdZ * dist;
                } else if (patch.relation === 'behind') {
                  dx = -fwdX * dist;
                  dz = -fwdZ * dist;
                } else if (patch.relation === 'left_of') {
                  dx = -rightX * dist;
                  dz = -rightZ * dist;
                } else if (patch.relation === 'right_of') {
                  dx = rightX * dist;
                  dz = rightZ * dist;
                }
              }
              nx = oldPos[0] + dx;
              nz = oldPos[2] + dz;
              ny =
                dy !== 0
                  ? oldPos[1] + dy
                  : getGroundY(nx, nz, terrain, road);
            }
            if (typeof patch.rotation_y_deg === 'number' && Number.isFinite(patch.rotation_y_deg)) {
              nRotY = (patch.rotation_y_deg * Math.PI) / 180;
            }
            return { pos: [nx, ny, nz], rotY: nRotY };
          };

          let updated = false;
          const charIdx = resolveCharacterIndex(tid);
          if (charIdx >= 0) {
            const charTarget = characters[charIdx];
            const { pos, rotY } = computeUpdatedPosAndRot(charTarget.position, charTarget.rotation[1]);
            charTarget.position = pos;
            charTarget.rotation = [0, rotY, 0];
            if (patch.action) {
              const newPose = normalizePose(patch.action);
              const presetCfg = POSE_PRESETS[newPose];
              charTarget.pose = newPose;
              charTarget.pelvisOffsetY = presetCfg.pelvisOffsetY;
              charTarget.joints = cloneJoints(presetCfg.joints);
            }
            if (patch.scale) charTarget.scale = patch.scale;
            if (patch.name) charTarget.name = patch.name;
            registerAnchor([charTarget.id, charTarget.name], pos, rotY, 1.75, 0.6);
            updated = true;
          }

          const assetIdx = !updated ? resolveNthByType(assets, tid) : -1;
          if (assetIdx >= 0) {
            const assetTarget = assets[assetIdx];
            const { pos, rotY } = computeUpdatedPosAndRot(assetTarget.position, assetTarget.rotation[1]);
            assetTarget.position = pos;
            assetTarget.rotation = [0, rotY, 0];
            if (patch.scale) assetTarget.scale = patch.scale;
            if (patch.name) assetTarget.name = patch.name;
            registerAnchor([assetTarget.id, assetTarget.name], pos, rotY, 1.6, 1.2);
            updated = true;
          }

          const cmTarget = !updated ? customModels.find((cm) => matchIdOrName(cm, tid)) : undefined;
          if (cmTarget) {
            const { pos, rotY } = computeUpdatedPosAndRot(cmTarget.position, cmTarget.rotation[1]);
            cmTarget.position = pos;
            cmTarget.rotation = [0, rotY, 0];
            if (patch.scale) cmTarget.scale = patch.scale;
            if (patch.name) cmTarget.name = patch.name;
            registerAnchor([cmTarget.id, cmTarget.name], pos, rotY, 2.5, 2.0);
            updated = true;
          }

          const scatIdx = !updated ? resolveNthByType(scatteredProps, tid) : -1;
          if (scatIdx >= 0) {
            const scatTarget = scatteredProps[scatIdx];
            const { pos, rotY } = computeUpdatedPosAndRot(scatTarget.position, scatTarget.rotationY);
            scatTarget.position = pos;
            scatTarget.rotationY = rotY;
            if (patch.scale) {
              scatTarget.scale = Math.max(0.25, Math.min(5, patch.scale[0] || scatTarget.scale));
            }
            const meta = SCATTER_ANCHOR_META[scatTarget.type];
            registerAnchor([scatTarget.id, scatTarget.type], pos, rotY, meta?.height ?? 1.5, meta?.radius ?? 1.5);
            updated = true;
          }

          const bldgTarget = !updated ? buildings.find((b) => matchIdOrName(b, tid)) : undefined;
          if (bldgTarget) {
            const { pos, rotY } = computeUpdatedPosAndRot(bldgTarget.position, bldgTarget.rotationY);
            bldgTarget.position = pos;
            bldgTarget.rotationY = rotY;
            if (patch.scale) {
              bldgTarget.width = Math.max(3, Math.round(bldgTarget.width * (patch.scale[0] || 1)));
              bldgTarget.floors = Math.max(1, Math.min(14, Math.round(bldgTarget.floors * (patch.scale[1] || 1))));
              bldgTarget.depth = Math.max(3, Math.round(bldgTarget.depth * (patch.scale[2] || 1)));
            }
            if (patch.name) bldgTarget.name = patch.name;
            registerAnchor(
              [bldgTarget.id, bldgTarget.name],
              pos,
              rotY,
              bldgTarget.floors * 3.2,
              Math.max(bldgTarget.width, bldgTarget.depth) * 0.5
            );
            updated = true;
          }

          if (
            !updated &&
            heroCompound &&
            (matchIdOrName(heroCompound, tid) || /hero_compound|hero_building|安全屋|主建筑/.test(tid.toLowerCase()))
          ) {
            const { pos, rotY } = computeUpdatedPosAndRot(heroCompound.position, heroCompound.rotationY);
            heroCompound = { ...heroCompound, position: pos, rotationY: rotY };
            registerAnchor([heroCompound.id, heroCompound.name, 'hero_building'], pos, rotY, 6.8, 7);
            updated = true;
          }

          if (updated) {
            appliedCount++;
            logs.push(`✓ 语义 Patch [update]：已更新 "${tid}" 的位置/姿态/属性`);
          } else {
            warnings.push(`Patch [update] 未找到 target_id "${tid}"`);
          }
        } else if (patch.op === 'add') {
          if (patch.element) {
            const el = patch.element;
            const mapped = mapElementItem(el.item);
            const count = Math.max(1, Math.min(12, el.count ?? 1));
            const { baseX, baseYOffset, baseZ, anc } = resolveRelativePlacement(
              el.anchor,
              heroZone,
              el.relation,
              el.distance_m,
              el.offset_m
            );
            for (let idx = 0; idx < count; idx++) {
              let px = baseX;
              let pz = baseZ;
              if (count > 1) {
                const ang = (idx / count) * Math.PI * 2;
                const rad = 2.6 + (idx % 2) * 0.8;
                px = baseX + Math.cos(ang) * rad;
                pz = baseZ + Math.sin(ang) * rad;
              }
              const ry = computeFacingRotY(
                px,
                pz,
                el.facing,
                anc,
                ((el.rotation_y_deg ?? 0) * Math.PI) / 180
              );
              const py =
                el.relation === 'on_top_of'
                  ? baseYOffset
                  : getGroundY(px, pz, terrain, road) + Math.max(0, baseYOffset);
              if (mapped.scatterType) {
                const scatId = el.id?.trim() ? (count > 1 ? `${el.id.trim()}_${idx + 1}` : el.id.trim()) : makeId('patch_scat');
                const meta = SCATTER_ANCHOR_META[mapped.scatterType];
                scatteredProps.push({
                  id: scatId,
                  type: mapped.scatterType,
                  position: [px, py, pz],
                  rotationY: ry,
                  scale: el.scale ? Math.max(0.3, Math.min(4, el.scale[0] || 1)) : 1,
                });
                registerAnchor(
                  [scatId, el.label, el.item, meta?.cnLabel],
                  [px, py, pz],
                  ry,
                  meta?.height ?? 1.5,
                  meta?.radius ?? 1.5
                );
                appliedCount++;
                logs.push(`✓ 语义 Patch [add]：新增场景道具 "${el.label || meta?.cnLabel || el.item}" (${scatId})`);
              } else {
                const elemId = el.id?.trim() ? (count > 1 ? `${el.id.trim()}_${idx + 1}` : el.id.trim()) : makeId('patch_el');
                const elemName = el.label || el.item;
                assets.push({
                  id: elemId,
                  kind: 'asset',
                  type: mapped.propType ?? 'crate',
                  name: count > 1 ? `${elemName} ${idx + 1}` : elemName,
                  position: [px, py, pz],
                  rotation: [0, ry, 0],
                  scale: el.scale ?? [1, 1, 1],
                  visible: true,
                  locked: false,
                });
                registerAnchor([elemId, elemName], [px, py, pz], ry, 1.5, 1.2);
                appliedCount++;
                logs.push(`✓ 语义 Patch [add]：新增构件 "${elemName}" (${elemId})`);
              }
            }
          }
          if (patch.character) {
            const member = patch.character;
            const pose = normalizePose(member.action);
            const presetCfg = POSE_PRESETS[pose];
            const { baseX, baseYOffset, baseZ, anc } = resolveRelativePlacement(
              member.anchor ?? member.relative_to ?? 'scene_center',
              heroZone,
              member.relation ?? 'in_front_of',
              member.distance_m ?? 2.5
            );
            const py =
              member.relation === 'on_top_of'
                ? baseYOffset
                : getGroundY(baseX, baseZ, terrain, road) + Math.max(0, baseYOffset);
            const rotY = computeFacingRotY(baseX, baseZ, member.facing ?? 'toward_anchor', anc, 0);
            const charId = member.id?.trim() || makeId('patch_char');
            const charName = member.role || `角色 ${characters.length + 1}`;
            characters.push({
              id: charId,
              kind: 'character',
              name: charName,
              position: [baseX, py, baseZ],
              rotation: [0, rotY, 0],
              scale: [1, 1, 1],
              pose,
              pelvisOffsetY: presetCfg.pelvisOffsetY,
              joints: cloneJoints(presetCfg.joints),
              visible: true,
              locked: false,
            });
            registerAnchor([charId, charName], [baseX, py, baseZ], rotY, 1.75, 0.6);
            appliedCount++;
            logs.push(`✓ 语义 Patch [add]：新增角色 "${charName}" (${charId})`);
          }
        }
      }
      if (appliedCount > 0) {
        logs.push(`✓ 本轮共生效 ${appliedCount} 条语义 Patch 修改`);
      }
    }
  }

  // Pass 2.5: Strictly enforce forbidden items from user intent
  if (intent && intent.forbidden.length > 0) {
    const matchesForbidden = (label: string, typeStr: string, f: string): boolean => {
      const fl = f.trim().toLowerCase();
      const lbl = label.toLowerCase();
      const t = typeStr.toLowerCase();
      if (!fl) return false;
      if (lbl.includes(fl)) return true;
      if ((fl.includes('灯') || fl.includes('lamp')) && t === 'lamp') return true;
      if ((fl.includes('车') || fl.includes('car') || fl.includes('vehicle')) && (t === 'car' || t === 'vehicle')) return true;
      if ((fl.includes('树') || fl.includes('灌木') || fl.includes('tree')) && (t === 'tree' || t === 'bush')) return true;
      if ((fl.includes('墩') || fl.includes('路障') || fl.includes('barrier')) && t === 'barrier') return true;
      if ((fl.includes('箱') || fl.includes('crate') || fl.includes('cargo')) && (t === 'crate' || t === 'cargo_stack')) return true;
      if ((fl.includes('楼') || fl.includes('建筑') || fl.includes('高楼') || fl.includes('building')) && (t === 'building' || t === 'hero_compound')) return true;
      if ((fl.includes('柱') || fl.includes('pillar')) && t === 'pillar') return true;
      if ((fl.includes('墙') || fl.includes('wall')) && t === 'wall') return true;
      return false;
    };

    for (const f of intent.forbidden) {
      const prevScat = scatteredProps.length;
      for (let i = scatteredProps.length - 1; i >= 0; i--) {
        if (matchesForbidden(scatteredProps[i].type, scatteredProps[i].type, f)) {
          scatteredProps.splice(i, 1);
        }
      }
      const prevAssets = assets.length;
      for (let i = assets.length - 1; i >= 0; i--) {
        if (matchesForbidden(assets[i].name, assets[i].type, f)) {
          assets.splice(i, 1);
        }
      }
      const prevBldgs = buildings.length;
      for (let i = buildings.length - 1; i >= 0; i--) {
        if (matchesForbidden(buildings[i].name, 'building', f)) {
          buildings.splice(i, 1);
        }
      }
      let removedHero = 0;
      if (heroCompound && matchesForbidden(heroCompound.name, 'hero_compound', f)) {
        heroCompound = null;
        removedHero = 1;
      }
      const totalRemoved =
        (prevScat - scatteredProps.length) +
        (prevAssets - assets.length) +
        (prevBldgs - buildings.length) +
        removedHero;
      if (totalRemoved > 0) {
        forbiddenFiltered.push(`${f} (已移除 ${totalRemoved} 处)`);
      }
    }
    if (forbiddenFiltered.length > 0) {
      logs.push(`✓ 已按禁用要求剔除：${forbiddenFiltered.join('、')}`);
    }
  }

  // Compute the TRUE focus center from generated characters, story props, or heroZone
  let focusCenter: Vec3 = [
    heroZoneBounds.center[0],
    getGroundY(heroZoneBounds.center[0], heroZoneBounds.center[1], terrain, road) + 1.4,
    heroZoneBounds.center[1],
  ];
  if (characters.length > 0) {
    const sum = characters.reduce(
      (acc, ch) => [acc[0] + ch.position[0], acc[1] + ch.position[1] + 1.15, acc[2] + ch.position[2]],
      [0, 0, 0]
    );
    focusCenter = [
      sum[0] / characters.length,
      sum[1] / characters.length,
      sum[2] / characters.length,
    ];
  } else if (placedStoryProps.length > 0) {
    const sum = placedStoryProps.reduce(
      (acc, p) => [acc[0] + p[0], acc[1] + p[1] + 1.2, acc[2] + p[2]],
      [0, 0, 0]
    );
    focusCenter = [
      sum[0] / placedStoryProps.length,
      sum[1] / placedStoryProps.length,
      sum[2] / placedStoryProps.length,
    ];
  }

  // Pass 3: Generate prompt-aligned multi-shot camera coverage around actual focus!
  const coverageCmd = program.commands.find(
    (c): c is Extract<SemanticCommand, { cmd: 'generate_multi_shot_coverage' }> =>
      c.cmd === 'generate_multi_shot_coverage'
  );
  if (coverageCmd || (mode === 'replace' && shots.length === 0)) {
    const count = Math.max(1, Math.min(4, coverageCmd?.shot_count ?? 3));
    const focusStyle = coverageCmd?.focus_style ?? 'street_chase';
    const heroChar = characters[0];
    const oppChar = characters[1] ?? characters[0];
    const heroFocus: Vec3 = heroChar
      ? [heroChar.position[0], heroChar.position[1] + 1.25, heroChar.position[2]]
      : focusCenter;
    const oppFocus: Vec3 = oppChar
      ? [oppChar.position[0], oppChar.position[1] + 1.25, oppChar.position[2]]
      : [focusCenter[0], focusCenter[1], focusCenter[2] - 10];

    const safePos = (p: Vec3): Vec3 => {
      if (!pointInsideAnyBox(p[0], p[1], p[2], occupiedBoxes)) return p;
      return [
        heroZoneBounds.center[0],
        Math.max(p[1], getGroundY(heroZoneBounds.center[0], p[2], terrain, road) + 2.2),
        p[2],
      ];
    };

    const builtShots: ShotData[] = [
      {
        id: makeId('shot'),
        name: 'Shot 01',
        focalLength: 24,
        aspectRatio: '2.39:1',
        duration: 6,
        fps: 24,
        lookAtTargetId: null,
        keyframes: [
          {
            id: makeId('kf'),
            time: 0,
            position: safePos([
              focusCenter[0] + 6.2,
              Math.max(
                focusCenter[1] + 2.2,
                getGroundY(focusCenter[0] + 6.2, focusCenter[2] + 15, terrain, road) + 3.8
              ),
              focusCenter[2] + 15,
            ]),
            target: focusCenter,
            focalLength: 26,
          },
          {
            id: makeId('kf'),
            time: 3,
            position: safePos([
              focusCenter[0] + 3.2,
              Math.max(
                focusCenter[1] + 0.85,
                getGroundY(focusCenter[0] + 3.2, focusCenter[2] + 8.5, terrain, road) + 2.2
              ),
              focusCenter[2] + 8.5,
            ]),
            target: heroFocus,
            focalLength: 32,
          },
          {
            id: makeId('kf'),
            time: 6,
            position: safePos([
              heroFocus[0] - 1.2,
              heroFocus[1] + 0.5,
              heroFocus[2] + 4.8,
            ]),
            target: oppFocus,
            focalLength: 35,
          },
        ],
      },
      {
        id: makeId('shot'),
        name: 'Shot 02',
        focalLength: 50,
        aspectRatio: '16:9',
        duration: 4,
        fps: 24,
        lookAtTargetId: heroChar?.id ?? null,
        keyframes: [
          {
            id: makeId('kf'),
            time: 0,
            position: safePos([heroFocus[0] + 2.8, heroFocus[1] + 0.4, heroFocus[2] + 4.2]),
            target: heroFocus,
            focalLength: 45,
          },
          {
            id: makeId('kf'),
            time: 4,
            position: safePos([heroFocus[0] + 1.5, heroFocus[1] + 0.25, heroFocus[2] + 2.3]),
            target: heroFocus,
            focalLength: 65,
          },
        ],
      },
    ];

    if (count >= 3) {
      if (focusStyle === 'indoor_outdoor' && heroCompound) {
        const hx = heroCompound.position[0];
        const hy = heroCompound.position[1];
        const hz = heroCompound.position[2];
        builtShots.push({
          id: makeId('shot'),
          name: 'Shot 03',
          focalLength: 28,
          aspectRatio: '2.39:1',
          duration: 5,
          fps: 24,
          lookAtTargetId: null,
          keyframes: [
            {
              id: makeId('kf'),
              time: 0,
              position: [hx + 10.5, hy + 1.65, hz],
              target: [hx, hy + 1.5, hz],
              focalLength: 28,
            },
            {
              id: makeId('kf'),
              time: 2.5,
              position: [hx + 4.8, hy + 1.65, hz],
              target: [hx - 2.0, hy + 1.5, hz],
              focalLength: 28,
            },
            {
              id: makeId('kf'),
              time: 5,
              position: [hx + 1.2, hy + 1.6, hz + 0.4],
              target: [hx - 3.5, hy + 2.2, hz - 1.0],
              focalLength: 32,
            },
          ],
        });
      } else {
        builtShots.push({
          id: makeId('shot'),
          name: 'Shot 03',
          focalLength: 40,
          aspectRatio: '16:9',
          duration: 5,
          fps: 24,
          lookAtTargetId: null,
          keyframes: [
            {
              id: makeId('kf'),
              time: 0,
              position: safePos([oppFocus[0] - 5.5, oppFocus[1] + 3.2, oppFocus[2] + 6.5]),
              target: heroFocus,
              focalLength: 35,
            },
            {
              id: makeId('kf'),
              time: 5,
              position: safePos([heroFocus[0] - 4.0, heroFocus[1] + 1.6, heroFocus[2] + 3.5]),
              target: oppFocus,
              focalLength: 55,
            },
          ],
        });
      }
    }

    shots = builtShots;
    logs.push(`✓ 已对准主场景重心生成 ${shots.length} 组防穿模多机位分镜`);
  }

  return {
    world: {
      environment,
      terrain,
      road,
      districts,
      buildings,
      heroCompound,
      scatteredProps,
      assets,
      customModels,
      characters,
      lastWorldPlan: program.world_plan,
    },
    shots,
    logs,
    focusCenter,
    warnings,
    unsupportedItems,
    forbiddenFiltered,
  };
}

/**
 * Deterministic prompt-fidelity verifier for Open-World scenes.
 * Identifies missing `must_have` elements, count mismatches, unsupported asset names,
 * and water/placement glitches so DeepSeek can be told exact errors to correct.
 */
export function verifyCompiledWorldAgainstPrompt(
  prompt: string,
  intent: IntentSummary,
  program: SemanticProgram,
  compiled: CompileResult,
  mode: 'replace' | 'append' = 'replace'
): WorldVerificationReport {
  const issues: string[] = [];
  const missingMustHave: string[] = [];
  const { world } = compiled;

  if (mode === 'append') {
    for (const w of compiled.warnings) {
      if (w.includes('Patch')) {
        issues.push(w);
      }
    }
    const hasPatchOrEditCmd = program.commands.some(
      (c) =>
        c.cmd === 'apply_scene_patches' ||
        c.cmd === 'place_scene_elements' ||
        c.cmd === 'create_custom_models' ||
        c.cmd === 'stage_characters' ||
        c.cmd === 'set_terrain' ||
        c.cmd === 'spawn_district_buildings' ||
        c.cmd === 'generate_multi_shot_coverage'
    );
    if (!hasPatchOrEditCmd) {
      issues.push('增量编辑模式下未产出任何有效的修改或 Patch 指令');
    }
    return {
      passed: issues.length === 0,
      missingMustHave,
      issues,
      warnings: compiled.warnings,
      unsupportedItems: compiled.unsupportedItems,
    };
  }

  const countByType = (dslType: string): number => {
    if (dslType === 'character') return world.characters.length;
    if (dslType === 'hero_compound') return world.heroCompound ? 1 : 0;
    if (dslType === 'building') {
      return (
        world.buildings.length +
        (world.heroCompound ? 1 : 0) +
        world.assets.filter((a) => a.type === 'building').length
      );
    }
    const assetMatches = world.assets.filter((a) => a.type === dslType).length;
    const scatterType = dslType === 'vehicle' ? 'car' : dslType;
    const scatterMatches = world.scatteredProps.filter((p) => p.type === scatterType).length;
    const extraCargo =
      dslType === 'crate'
        ? world.scatteredProps.filter((p) => p.type === 'cargo_stack').length
        : 0;
    const customMatches = (world.customModels ?? []).filter((cm) => {
      const n = `${cm.name} ${cm.description ?? ''}`.toLowerCase();
      if (dslType === 'vehicle') return /船|帆船|游艇|车|飞船|直升机|boat|ship|car|craft/.test(n);
      if (dslType === 'building') return /塔|亭|屋|殿|仓|楼|站|桥|gate|tower|pavilion/.test(n);
      return n.includes(dslType.toLowerCase());
    }).length;
    return assetMatches + scatterMatches + extraCargo + customMatches;
  };

  for (const token of intent.must_have) {
    const tLower = token.toLowerCase();
    // Skip pure district/biome keywords handled via terrain/zone choices
    if (/^(河道|运河|河岸|海滨|天台|屋顶|废墟|工业区|商业街)$/.test(tLower)) {
      if ((tLower === '河道' || tLower === '运河') && !world.terrain.hasWaterChannel) {
        missingMustHave.push(token);
        issues.push(`缺少用户明确要求的"${token}"（terrain.has_water_channel 未开启）`);
      }
      continue;
    }

    // Check if an AI custom-modeled assembly directly matches this user must_have token
    const cleanToken = tLower.replace(/^[0-9一二三四五六七八九十两]+[座栋辆根棵只艘条门座]+/, '');
    const customMatchedCount = (world.customModels ?? []).filter((cm) => {
      const text = `${cm.name} ${cm.description ?? ''}`.toLowerCase();
      return text.includes(cleanToken) || (cleanToken.length >= 2 && text.includes(cleanToken.slice(-2)));
    }).length;
    if (customMatchedCount >= parseRequestedCount(token)) {
      continue;
    }

    const expectedType = inferDslTypeFromToken(token);
    if (expectedType === 'lighting') {
      if (/雾|迷雾|fog/.test(tLower) && world.environment.fogDensity < 0.008) {
        missingMustHave.push(token);
        issues.push(`大气氛围缺少"${token}"（当前 fog_density=${world.environment.fogDensity} 过低，应 >= 0.012）`);
      }
      if (/黄昏|夕阳|日落|dusk/.test(tLower) && world.environment.sunElevation > 26) {
        missingMustHave.push(token);
        issues.push(`光照时段未体现"${token}"（当前 sun_elevation=${world.environment.sunElevation}°，应 <= 20°）`);
      }
      continue;
    }

    const requiredCount = parseRequestedCount(token);
    const actualCount = countByType(expectedType);
    if (actualCount < requiredCount) {
      missingMustHave.push(token);
      issues.push(
        `必含元素"${token}"数量不足（映射到类型 ${expectedType}，要求至少 ${requiredCount} 个，实际仅生成 ${actualCount} 个）`
      );
    }
  }

  // Check if any characters or story assets landed inside water channel
  if (world.terrain.hasWaterChannel) {
    for (const ch of world.characters) {
      if (Math.abs(ch.position[0] - -46) < 9.5) {
        issues.push(`角色"${ch.name}"站位 X=${ch.position[0].toFixed(1)} 落入河道水面内部，应移至河岸 [-30, 8] 附近`);
      }
    }
  }

  if (compiled.unsupportedItems.length > 0) {
    issues.push(
      `以下需求/元素不在白模基础资产库中（当前已临时用体块代用或跳过）：${compiled.unsupportedItems.join('、')}`
    );
  }

  // Note: if prompt has forbidden words like 路灯/大楼 and DeepSeek generated them, note it clearly
  if (compiled.forbiddenFiltered.length > 0) {
    issues.push(
      `DeepSeek 首轮输出了用户禁止的元素（已在编译阶段自动剔除）：${compiled.forbiddenFiltered.join('、')}`
    );
  }

  if (
    world.assets.length + world.scatteredProps.length + world.characters.length + world.buildings.length ===
    0
  ) {
    issues.push(`生成结果为空场景（没有任何可见构件、建筑或角色），请重新根据提示词 "${prompt.slice(0, 40)}" 生成。`);
  }

  return {
    passed: issues.length === 0,
    missingMustHave,
    issues,
    warnings: compiled.warnings,
    unsupportedItems: compiled.unsupportedItems,
  };
}

/**
 * Lists all registered element IDs and labels in the current WorldState
 * so incremental Patch mode can expose exact IDs to deepseek-chat and validate target_id.
 */
export function listSceneRegisteredIds(world?: WorldState | null): {
  ids: string[];
  summaryLines: string[];
} {
  if (!world) return { ids: [], summaryLines: [] };
  const ids: string[] = [];
  const summaryLines: string[] = [];

  for (let i = 0; i < (world.characters ?? []).length; i++) {
    const ch = world.characters[i];
    ids.push(ch.id, ch.name, `character_${i + 1}`, `char_${i + 1}`);
    if (i === 0) ids.push('hero', '主角', 'protagonist', 'player');
    if (i === 1) ids.push('opponent', 'enemy', '对手', '敌人');
    summaryLines.push(
      `- [角色${i === 0 ? ' · 主角(hero)' : ''}] id="${ch.id}" name="${ch.name}" pose=${ch.pose} pos=[${ch.position.map((n) => n.toFixed(1)).join(',')}]`
    );
  }
  if (world.heroCompound) {
    const hc = world.heroCompound;
    ids.push(hc.id, hc.name, 'hero_compound', 'hero_building', '安全屋', '主建筑');
    summaryLines.push(
      `- [可进入复合建筑] id="${hc.id}" name="${hc.name}" pos=[${hc.position.map((n) => n.toFixed(1)).join(',')}]`
    );
  }
  for (const cm of world.customModels ?? []) {
    ids.push(cm.id, cm.name);
    summaryLines.push(
      `- [复合构件] id="${cm.id}" name="${cm.name}" parts=${cm.parts.length} pos=[${cm.position.map((n) => n.toFixed(1)).join(',')}]`
    );
  }
  const typeCounters = new Map<string, number>();
  for (const a of world.assets ?? []) {
    const cnt = (typeCounters.get(a.type) ?? 0) + 1;
    typeCounters.set(a.type, cnt);
    ids.push(a.id, a.name, a.type, `${a.type}_${cnt}`, `${a.type}_${String(cnt).padStart(2, '0')}`);
    summaryLines.push(
      `- [道具构件] id="${a.id}" name="${a.name}" type=${a.type} pos=[${a.position.map((n) => n.toFixed(1)).join(',')}]`
    );
  }
  for (let i = 0; i < (world.buildings ?? []).length; i++) {
    const b = world.buildings[i];
    ids.push(b.id, b.name, `building_${i + 1}`);
    if (i < 10) {
      summaryLines.push(
        `- [建筑] id="${b.id}" name="${b.name}" floors=${b.floors} pos=[${b.position.map((n) => n.toFixed(1)).join(',')}]`
      );
    }
  }
  for (const sp of world.scatteredProps ?? []) {
    const cnt = (typeCounters.get(sp.type) ?? 0) + 1;
    typeCounters.set(sp.type, cnt);
    const meta = SCATTER_ANCHOR_META[sp.type];
    ids.push(
      sp.id,
      sp.type,
      `${sp.type}_${cnt}`,
      `${sp.type}_${String(cnt).padStart(2, '0')}`,
      ...(meta ? [meta.cnLabel, `${meta.cnLabel}${cnt}`, ...meta.aliases] : [])
    );
    if (summaryLines.length < 48 && (sp.type === 'car' || sp.type === 'barrier' || sp.type === 'cargo_stack' || cnt <= 2)) {
      summaryLines.push(
        `- [散布道具:${meta?.cnLabel ?? sp.type}] id="${sp.id}" alias="${sp.type}_${String(cnt).padStart(2, '0')}" pos=[${sp.position.map((n) => n.toFixed(1)).join(',')}]`
      );
    }
  }
  return { ids: Array.from(new Set(ids)), summaryLines };
}

const KNOWN_SEMANTIC_LANDMARKS = new Set([
  'scene_center',
  'ground_level',
  'center',
  'plaza',
  'door_main',
  'inside_lobby',
  'rooftop',
  'balcony',
  'canal',
  'canal_water',
  'canal_bank',
  'water',
  'river',
  'coast',
  'sea',
  'beach',
  'industrial',
  'old_industrial',
  'commercial_main',
  'residential_north',
  'rooftop_helipad',
  'north_street',
  'south_street',
  'road',
  'street',
]);

function isKnownOrMatchingId(candidate: string, registeredLowerSet: Set<string>): boolean {
  const key = candidate.trim().toLowerCase().replace(/^(all[:_\s]+|全部|所有)/i, '').trim();
  if (!key) return true;
  if (KNOWN_SEMANTIC_LANDMARKS.has(key)) return true;
  for (const lm of KNOWN_SEMANTIC_LANDMARKS) {
    if (key.includes(lm)) return true;
  }
  if (registeredLowerSet.has(key)) return true;
  for (const existing of registeredLowerSet) {
    if (existing.includes(key) || key.includes(existing)) return true;
  }
  return false;
}

/**
 * Strict Front-end Post-Validation (Zod/Ajv-equivalent schema & state defense):
 * Validates tool call commands, enum bounds, composite_primitives non-degeneracy,
 * and semantic Patch target_id / anchor existence before or during compilation.
 */
export function validateSemanticProgramStrict(
  program: SemanticProgram | null | undefined,
  currentWorld?: WorldState | null,
  _mode: 'replace' | 'append' = 'replace'
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!program || !Array.isArray(program.commands) || program.commands.length === 0) {
    errors.push('未输出任何有效的工具调用或场景指令 (commands 为空)。请至少调用一个场景构建或 Patch 工具。');
    return { valid: false, errors };
  }

  const { ids: initialIds } = listSceneRegisteredIds(currentWorld);
  const registeredSet = new Set<string>(initialIds.map((s) => s.toLowerCase()));

  const VALID_RELATIONS = new Set([
    'in_front_of',
    'behind',
    'left_of',
    'right_of',
    'around',
    'on_top_of',
    'along',
  ]);
  const VALID_SHAPES = new Set([
    'box',
    'cylinder',
    'cone',
    'plane',
    'torus',
    'sphere',
    'dodecahedron',
    'capsule',
  ]);

  for (const cmd of program.commands) {
    if (cmd.cmd === 'place_scene_elements') {
      for (const el of cmd.elements ?? []) {
        if (el.id) registeredSet.add(el.id.trim().toLowerCase());
        if (el.label) registeredSet.add(el.label.trim().toLowerCase());
        if (el.item) registeredSet.add(el.item.trim().toLowerCase());
        if (el.relation && !VALID_RELATIONS.has(el.relation)) {
          errors.push(
            `构件 "${el.label || el.item}" 的 relation="${el.relation}" 非法，仅允许 in_front_of | behind | left_of | right_of | around | on_top_of | along`
          );
        }
      }
    } else if (cmd.cmd === 'create_custom_models') {
      for (const m of cmd.models ?? []) {
        if (m.id) registeredSet.add(m.id.trim().toLowerCase());
        if (m.name) registeredSet.add(m.name.trim().toLowerCase());
        const parts = m.composite_primitives ?? m.parts ?? [];
        if (!Array.isArray(parts) || parts.length < 2) {
          errors.push(
            `开放词表复合体 "${m.name || m.id || '未命名'}" 退化为了单个几何体（当前仅 ${parts.length} 个部件）！必须使用至少 2~6 个基础几何体 (box/cylinder/cone/plane/torus) 搭积木组装层级结构。`
          );
        }
        for (const p of parts) {
          if (p.shape && !VALID_SHAPES.has(p.shape)) {
            errors.push(
              `复合体 "${m.name}" 的部件 "${p.name}" 使用了非法几何体 shape="${p.shape}"，仅允许 box | cylinder | cone | plane | torus`
            );
          }
        }
      }
    } else if (cmd.cmd === 'stage_characters') {
      for (const ch of cmd.cast ?? []) {
        if (ch.id) registeredSet.add(ch.id.trim().toLowerCase());
        if (ch.role) registeredSet.add(ch.role.trim().toLowerCase());
      }
    } else if (cmd.cmd === 'apply_scene_patches') {
      for (const patch of cmd.patches ?? []) {
        if (patch.op === 'remove' || patch.op === 'update') {
          if (!patch.target_id || !patch.target_id.trim()) {
            errors.push(`语义 Patch [${patch.op}] 缺少必填的 target_id 字段。`);
          } else if (!isKnownOrMatchingId(patch.target_id, registeredSet)) {
            const availablePreview = Array.from(registeredSet).slice(0, 20).join(', ') || '无';
            errors.push(
              `语义 Patch [${patch.op}] 找不到 target_id "${patch.target_id}"，请检查！当前场景中已注册的对象 ID/名称为：[${availablePreview}]`
            );
          }
        }
        if (patch.op === 'update' && patch.relative_to) {
          if (!isKnownOrMatchingId(patch.relative_to, registeredSet)) {
            const availablePreview = Array.from(registeredSet).slice(0, 20).join(', ') || '无';
            errors.push(
              `语义 Patch [update] 中 relative_to="${patch.relative_to}" 不存在于当前场景状态中，请检查！可用锚点 ID：[${availablePreview}]`
            );
          }
        }
        if (patch.op === 'add') {
          if (patch.element?.id) registeredSet.add(patch.element.id.trim().toLowerCase());
          if (patch.element?.label) registeredSet.add(patch.element.label.trim().toLowerCase());
          if (patch.composite_model?.id) registeredSet.add(patch.composite_model.id.trim().toLowerCase());
          if (patch.composite_model?.name) registeredSet.add(patch.composite_model.name.trim().toLowerCase());
          if (patch.character?.id) registeredSet.add(patch.character.id.trim().toLowerCase());
          if (patch.character?.role) registeredSet.add(patch.character.role.trim().toLowerCase());
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
