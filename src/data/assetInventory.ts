import type { ClayVariant } from '../engine/channelMaterials';
import type { BuildingStyle, PropType, Vec3 } from '../types/scene';
import {
  EXTRA_BARRIER_VARIANTS,
  EXTRA_BOX_VARIANTS,
  EXTRA_BUILDING_PROP_VARIANTS,
  EXTRA_CRATE_VARIANTS,
  EXTRA_DOORWAY_VARIANTS,
  EXTRA_FACILITY_VARIANTS,
  EXTRA_FLOOR_VARIANTS,
  EXTRA_FURNITURE_VARIANTS,
  EXTRA_LAMP_VARIANTS,
  EXTRA_PILLAR_VARIANTS,
  EXTRA_RAMP_VARIANTS,
  EXTRA_ROAD_VARIANTS,
  EXTRA_ROCK_VARIANTS,
  EXTRA_ROOF_VARIANTS,
  EXTRA_SCENE_PROP_VARIANTS,
  EXTRA_STAIRS_VARIANTS,
  EXTRA_TABLE_VARIANTS,
  EXTRA_TREE_VARIANTS,
  EXTRA_VEHICLE_VARIANTS,
  EXTRA_WALL_VARIANTS,
} from './assetInventoryExtra';
import { MEGA_INVENTORY_BY_TYPE } from './assetInventoryMega';
import { RICH_ERAS_INVENTORY_BY_TYPE } from './assetInventoryRichEras';
import { CREATURE_VARIANTS } from './assetInventoryCreatures';

export type InventoryPartShape =
  | 'box'
  | 'cylinder'
  | 'cone'
  | 'sphere'
  | 'dodecahedron'
  | 'torus'
  | 'ramp';

export interface InventoryPart {
  shape: InventoryPartShape;
  pos: Vec3;
  rot?: Vec3;
  /**
   * - box / ramp: [widthX, heightY, depthZ]
   * - cylinder: [radiusTop, radiusBottom, height]
   * - cone: [radius, height, radialSegments (optional, default 10)]
   * - sphere / dodecahedron: [scaleX, scaleY, scaleZ] (unit radius=1)
   * - torus: [radius, tube, radialSegments]
   */
  size: Vec3;
  variant?: ClayVariant;
}

export interface AssetVariantSpec {
  id: string;
  label: string;
  heightM: number;
  widthM: number;
  depthM: number;
  parts: InventoryPart[];
}

export interface BuildingInventorySpec {
  id: BuildingStyle;
  label: string;
  heightHint: string;
  parts: InventoryPart[];
}

export interface CharacterInventorySpec {
  id: string;
  label: string;
  scaleVec: Vec3;
  heightM: number;
  shoulderScale: number;
  coatApron?: boolean;
  parts: InventoryPart[];
}

export const QUICK_TINT_SWATCHES: { id: string; label: string; color?: string }[] = [
  { id: 'default', label: '默认原色', color: undefined },
  { id: 'ochre', label: '暖赭黄', color: '#dfa44d' },
  { id: 'terracotta', label: '陶土橘', color: '#cc845f' },
  { id: 'rust', label: '铁锈红', color: '#a85741' },
  { id: 'slate_blue', label: '石板蓝', color: '#7a9ab8' },
  { id: 'sage', label: '鼠尾草绿', color: '#91ab85' },
  { id: 'sand', label: '沙丘米', color: '#cbb993' },
  { id: 'ivory', label: '象牙白', color: '#ebe2cd' },
  { id: 'charcoal', label: '炭岩灰', color: '#525b65' },
];

export const PROP_TYPE_CATEGORY_TITLES: Record<
  PropType,
  { title: string; sectionLabel: string }
> = {
  road: { title: '道路', sectionLabel: '道路路网库存' },
  tree: { title: '树', sectionLabel: '树种库存' },
  vehicle: { title: '车', sectionLabel: '车型库存' },
  building: { title: '楼', sectionLabel: '建筑体量库存' },
  lamp: { title: '灯', sectionLabel: '灯具款式库存' },
  rock: { title: '石', sectionLabel: '岩石形态库存' },
  creature: { title: '生物', sectionLabel: '动物与奇幻生物库存' },
  barrier: { title: '障', sectionLabel: '掩体护栏库存' },
  crate: { title: '箱', sectionLabel: '货箱容器库存' },
  table: { title: '桌', sectionLabel: '桌台家具库存' },
  furniture: { title: '家居', sectionLabel: '室内家居库存' },
  facility: { title: '设施', sectionLabel: '片场工矿设施' },
  scene_prop: { title: '道具', sectionLabel: '街景生活道具' },
  wall: { title: '墙', sectionLabel: '墙体结构库存' },
  doorway: { title: '门', sectionLabel: '门洞门框库存' },
  stairs: { title: '梯', sectionLabel: '楼梯台阶库存' },
  ramp: { title: '坡', sectionLabel: '斜坡坡道库存' },
  pillar: { title: '柱', sectionLabel: '立柱构件库存' },
  floor: { title: '板', sectionLabel: '地台楼板库存' },
  roof: { title: '顶', sectionLabel: '屋顶雨棚库存' },
  box: { title: '块', sectionLabel: '几何体块库存' },
};

// ============================================================================
// 1. 树木库存 (20 Pre-built Tree & Shrub Variants)
// ============================================================================
const TREE_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'round_crown',
    label: '圆冠',
    heightM: 4.0,
    widthM: 2.3,
    depthM: 2.2,
    parts: [
      { shape: 'cylinder', pos: [0, 0.95, 0], size: [0.14, 0.22, 1.9], variant: 'trunk' },
      { shape: 'sphere', pos: [0, 2.7, 0], size: [1.05, 0.95, 1.0], variant: 'foliage' },
      { shape: 'sphere', pos: [-0.58, 2.35, 0.25], size: [0.68, 0.62, 0.68], variant: 'foliage' },
      { shape: 'sphere', pos: [0.58, 2.42, -0.2], size: [0.64, 0.6, 0.64], variant: 'foliage' },
    ],
  },
  {
    id: 'oval_crown',
    label: '卵形',
    heightM: 4.6,
    widthM: 2.0,
    depthM: 2.0,
    parts: [
      { shape: 'cylinder', pos: [0, 1.0, 0], size: [0.13, 0.2, 2.0], variant: 'trunk' },
      { shape: 'sphere', pos: [0, 3.05, 0], size: [0.92, 1.45, 0.92], variant: 'foliage' },
      { shape: 'sphere', pos: [0.32, 2.45, 0.3], size: [0.52, 0.65, 0.52], variant: 'foliage' },
    ],
  },
  {
    id: 'conifer_tower',
    label: '塔形针叶',
    heightM: 4.8,
    widthM: 2.1,
    depthM: 2.1,
    parts: [
      { shape: 'cylinder', pos: [0, 0.6, 0], size: [0.14, 0.22, 1.2], variant: 'trunk' },
      { shape: 'cone', pos: [0, 1.75, 0], size: [1.08, 1.45, 10], variant: 'foliage' },
      { shape: 'cone', pos: [0, 2.65, 0], size: [0.85, 1.35, 10], variant: 'foliage' },
      { shape: 'cone', pos: [0, 3.55, 0], size: [0.6, 1.25, 10], variant: 'foliage' },
      { shape: 'cone', pos: [0, 4.3, 0], size: [0.34, 0.95, 10], variant: 'foliage' },
    ],
  },
  {
    id: 'cypress_column',
    label: '柱形柏',
    heightM: 4.9,
    widthM: 1.1,
    depthM: 1.1,
    parts: [
      { shape: 'cylinder', pos: [0, 0.45, 0], size: [0.11, 0.16, 0.9], variant: 'trunk' },
      { shape: 'sphere', pos: [0, 2.75, 0], size: [0.52, 2.1, 0.52], variant: 'foliage' },
      { shape: 'cone', pos: [0, 4.1, 0], size: [0.36, 1.4, 9], variant: 'foliage' },
    ],
  },
  {
    id: 'palm',
    label: '棕榈',
    heightM: 5.0,
    widthM: 2.8,
    depthM: 2.8,
    parts: [
      { shape: 'cylinder', pos: [0, 1.0, 0], rot: [0, 0, -0.04], size: [0.14, 0.22, 2.0], variant: 'trunk' },
      { shape: 'cylinder', pos: [0.09, 2.8, 0], rot: [0, 0, -0.09], size: [0.1, 0.14, 1.9], variant: 'trunk' },
      { shape: 'box', pos: [0.95, 3.65, 0], rot: [0, 0, -0.35], size: [1.6, 0.08, 0.48], variant: 'foliage' },
      { shape: 'box', pos: [-0.7, 3.65, 0], rot: [0, 0, 0.35], size: [1.6, 0.08, 0.48], variant: 'foliage' },
      { shape: 'box', pos: [0.15, 3.65, 0.85], rot: [0.35, 0, 0], size: [0.48, 0.08, 1.6], variant: 'foliage' },
      { shape: 'box', pos: [0.15, 3.65, -0.85], rot: [-0.35, 0, 0], size: [0.48, 0.08, 1.6], variant: 'foliage' },
      { shape: 'sphere', pos: [0.15, 3.72, 0], size: [0.32, 0.24, 0.32], variant: 'trunk' },
    ],
  },
  {
    id: 'weeping_willow',
    label: '垂柳',
    heightM: 4.3,
    widthM: 2.9,
    depthM: 2.9,
    parts: [
      { shape: 'cylinder', pos: [0, 1.05, 0], size: [0.18, 0.28, 2.1], variant: 'trunk' },
      { shape: 'sphere', pos: [0, 3.1, 0], size: [1.35, 0.9, 1.35], variant: 'foliage' },
      { shape: 'cylinder', pos: [-0.92, 2.15, 0.2], size: [0.32, 0.42, 1.7], variant: 'foliage' },
      { shape: 'cylinder', pos: [0.88, 2.2, -0.25], size: [0.34, 0.44, 1.65], variant: 'foliage' },
      { shape: 'cylinder', pos: [0.1, 2.1, 0.9], size: [0.32, 0.42, 1.75], variant: 'foliage' },
      { shape: 'cylinder', pos: [-0.15, 2.15, -0.88], size: [0.3, 0.4, 1.65], variant: 'foliage' },
    ],
  },
  {
    id: 'umbrella_pine',
    label: '伞形松',
    heightM: 4.4,
    widthM: 2.8,
    depthM: 2.6,
    parts: [
      { shape: 'cylinder', pos: [0, 1.4, 0], rot: [0.05, 0, 0.06], size: [0.13, 0.22, 2.8], variant: 'trunk' },
      { shape: 'cylinder', pos: [-0.4, 2.6, 0.1], rot: [0, 0, 0.6], size: [0.07, 0.1, 1.0], variant: 'trunk' },
      { shape: 'sphere', pos: [0.1, 3.35, 0], size: [1.35, 0.42, 1.25], variant: 'foliage' },
      { shape: 'sphere', pos: [-0.75, 2.95, 0.25], size: [0.75, 0.3, 0.72], variant: 'foliage' },
    ],
  },
  {
    id: 'sakura',
    label: '樱花',
    heightM: 3.9,
    widthM: 2.7,
    depthM: 2.6,
    parts: [
      { shape: 'cylinder', pos: [0, 0.85, 0], size: [0.16, 0.24, 1.7], variant: 'trunk' },
      { shape: 'cylinder', pos: [-0.38, 1.7, 0], rot: [0, 0, 0.55], size: [0.08, 0.12, 1.0], variant: 'trunk' },
      { shape: 'cylinder', pos: [0.36, 1.75, 0.1], rot: [0, 0, -0.52], size: [0.08, 0.12, 1.0], variant: 'trunk' },
      { shape: 'sphere', pos: [0, 2.75, 0], size: [1.1, 0.68, 1.05], variant: 'accent' },
      { shape: 'sphere', pos: [-0.82, 2.35, 0.25], size: [0.72, 0.52, 0.72], variant: 'accent' },
      { shape: 'sphere', pos: [0.78, 2.4, -0.2], size: [0.74, 0.54, 0.74], variant: 'accent' },
    ],
  },
  {
    id: 'dead_tree',
    label: '枯树',
    heightM: 4.1,
    widthM: 2.2,
    depthM: 1.9,
    parts: [
      { shape: 'cylinder', pos: [0, 1.05, 0], size: [0.14, 0.24, 2.1], variant: 'trunk' },
      { shape: 'cylinder', pos: [-0.45, 2.35, 0.1], rot: [0.15, 0, 0.62], size: [0.04, 0.1, 1.4], variant: 'trunk' },
      { shape: 'cylinder', pos: [0.42, 2.45, -0.15], rot: [-0.2, 0, -0.55], size: [0.04, 0.1, 1.45], variant: 'trunk' },
      { shape: 'cylinder', pos: [0.05, 2.95, 0.25], rot: [0.45, 0, -0.1], size: [0.03, 0.08, 1.2], variant: 'trunk' },
      { shape: 'cylinder', pos: [-0.82, 3.0, 0.2], rot: [0, 0, 0.3], size: [0.02, 0.04, 0.75], variant: 'trunk' },
    ],
  },
  {
    id: 'oak',
    label: '橡树',
    heightM: 4.5,
    widthM: 3.1,
    depthM: 3.0,
    parts: [
      { shape: 'cylinder', pos: [0, 0.95, 0], size: [0.22, 0.34, 1.9], variant: 'trunk' },
      { shape: 'sphere', pos: [0, 2.95, 0], size: [1.35, 1.1, 1.3], variant: 'foliage' },
      { shape: 'sphere', pos: [-0.95, 2.45, 0.3], size: [0.82, 0.72, 0.82], variant: 'foliage' },
      { shape: 'sphere', pos: [0.95, 2.5, -0.25], size: [0.85, 0.72, 0.82], variant: 'foliage' },
      { shape: 'sphere', pos: [0.1, 2.55, 0.9], size: [0.75, 0.65, 0.75], variant: 'foliage' },
    ],
  },
  {
    id: 'plane_tree',
    label: '法桐',
    heightM: 4.7,
    widthM: 2.8,
    depthM: 2.6,
    parts: [
      { shape: 'cylinder', pos: [0, 1.3, 0], size: [0.15, 0.22, 2.6], variant: 'trunk' },
      { shape: 'cylinder', pos: [-0.35, 2.3, 0], rot: [0, 0, 0.45], size: [0.08, 0.11, 1.1], variant: 'trunk' },
      { shape: 'cylinder', pos: [0.35, 2.3, 0], rot: [0, 0, -0.45], size: [0.08, 0.11, 1.1], variant: 'trunk' },
      { shape: 'dodecahedron', pos: [-0.62, 3.15, 0.18], size: [0.82, 0.68, 0.78], variant: 'foliage' },
      { shape: 'dodecahedron', pos: [0.62, 3.2, -0.15], size: [0.84, 0.68, 0.78], variant: 'foliage' },
      { shape: 'dodecahedron', pos: [0, 3.55, 0], size: [0.92, 0.72, 0.88], variant: 'foliage' },
    ],
  },
  {
    id: 'bun_willow',
    label: '馒头柳',
    heightM: 3.7,
    widthM: 2.5,
    depthM: 2.5,
    parts: [
      { shape: 'cylinder', pos: [0, 0.75, 0], size: [0.16, 0.24, 1.5], variant: 'trunk' },
      { shape: 'sphere', pos: [0, 2.3, 0], size: [1.22, 0.88, 1.22], variant: 'foliage' },
      { shape: 'sphere', pos: [0, 2.85, 0], size: [0.86, 0.55, 0.86], variant: 'foliage' },
    ],
  },
  {
    id: 'birch',
    label: '白桦',
    heightM: 4.8,
    widthM: 1.9,
    depthM: 1.9,
    parts: [
      { shape: 'cylinder', pos: [-0.14, 1.5, 0], rot: [0, 0, 0.04], size: [0.08, 0.12, 3.0], variant: 'default' },
      { shape: 'cylinder', pos: [0.16, 1.4, 0.08], rot: [0.03, 0, -0.05], size: [0.07, 0.11, 2.8], variant: 'default' },
      { shape: 'sphere', pos: [-0.18, 3.35, -0.05], size: [0.74, 0.92, 0.74], variant: 'foliage' },
      { shape: 'sphere', pos: [0.28, 3.05, 0.18], size: [0.68, 0.82, 0.68], variant: 'foliage' },
    ],
  },
  {
    id: 'poplar',
    label: '白杨',
    heightM: 5.2,
    widthM: 1.4,
    depthM: 1.4,
    parts: [
      { shape: 'cylinder', pos: [0, 1.2, 0], size: [0.12, 0.18, 2.4], variant: 'trunk' },
      { shape: 'sphere', pos: [0, 2.8, 0], size: [0.66, 1.05, 0.66], variant: 'foliage' },
      { shape: 'sphere', pos: [0, 3.8, 0], size: [0.56, 0.95, 0.56], variant: 'foliage' },
      { shape: 'sphere', pos: [0, 4.55, 0], size: [0.36, 0.65, 0.36], variant: 'foliage' },
    ],
  },
  {
    id: 'camphor',
    label: '香樟',
    heightM: 4.4,
    widthM: 2.9,
    depthM: 2.8,
    parts: [
      { shape: 'cylinder', pos: [0, 1.05, 0], size: [0.18, 0.28, 2.1], variant: 'trunk' },
      { shape: 'sphere', pos: [-0.45, 2.75, 0.25], size: [0.95, 0.78, 0.95], variant: 'foliage' },
      { shape: 'sphere', pos: [0.55, 2.85, -0.18], size: [0.9, 0.82, 0.9], variant: 'foliage' },
      { shape: 'sphere', pos: [0.05, 3.45, 0.05], size: [0.85, 0.68, 0.85], variant: 'foliage' },
    ],
  },
  {
    id: 'redwood',
    label: '红杉',
    heightM: 5.8,
    widthM: 1.7,
    depthM: 1.7,
    parts: [
      { shape: 'cylinder', pos: [0, 1.4, 0], size: [0.16, 0.3, 2.8], variant: 'trunk' },
      { shape: 'cylinder', pos: [0, 2.85, 0], size: [0.85, 0.95, 0.7], variant: 'foliage' },
      { shape: 'cylinder', pos: [0, 3.65, 0], size: [0.68, 0.8, 0.7], variant: 'foliage' },
      { shape: 'cylinder', pos: [0, 4.4, 0], size: [0.5, 0.62, 0.7], variant: 'foliage' },
      { shape: 'cone', pos: [0, 5.2, 0], size: [0.46, 1.15, 10], variant: 'foliage' },
    ],
  },
  {
    id: 'cedar',
    label: '雪松',
    heightM: 4.9,
    widthM: 2.6,
    depthM: 2.6,
    parts: [
      { shape: 'cylinder', pos: [0, 0.8, 0], size: [0.14, 0.24, 1.6], variant: 'trunk' },
      { shape: 'cone', pos: [0, 1.6, 0], size: [1.3, 0.85, 8], variant: 'foliage' },
      { shape: 'cone', pos: [0, 2.35, 0], size: [1.05, 0.85, 8], variant: 'foliage' },
      { shape: 'cone', pos: [0, 3.1, 0], size: [0.8, 0.85, 8], variant: 'foliage' },
      { shape: 'cone', pos: [0, 3.85, 0], size: [0.55, 0.85, 8], variant: 'foliage' },
      { shape: 'cone', pos: [0, 4.5, 0], size: [0.3, 0.75, 8], variant: 'foliage' },
    ],
  },
  {
    id: 'banyan',
    label: '榕树',
    heightM: 4.2,
    widthM: 3.3,
    depthM: 3.1,
    parts: [
      { shape: 'cylinder', pos: [0, 0.9, 0], size: [0.24, 0.36, 1.8], variant: 'trunk' },
      { shape: 'cylinder', pos: [-0.75, 1.0, 0.25], size: [0.05, 0.07, 2.0], variant: 'trunk' },
      { shape: 'cylinder', pos: [0.78, 1.0, -0.2], size: [0.05, 0.07, 2.0], variant: 'trunk' },
      { shape: 'sphere', pos: [0, 2.75, 0], size: [1.55, 0.82, 1.45], variant: 'foliage' },
      { shape: 'sphere', pos: [-0.88, 2.35, 0.2], size: [0.76, 0.56, 0.76], variant: 'foliage' },
      { shape: 'sphere', pos: [0.88, 2.4, -0.2], size: [0.76, 0.56, 0.76], variant: 'foliage' },
    ],
  },
  {
    id: 'shrub_cluster',
    label: '灌木丛',
    heightM: 1.4,
    widthM: 2.0,
    depthM: 1.9,
    parts: [
      { shape: 'sphere', pos: [0, 0.62, 0], size: [0.78, 0.62, 0.76], variant: 'foliage' },
      { shape: 'sphere', pos: [-0.58, 0.45, 0.28], size: [0.52, 0.45, 0.52], variant: 'foliage' },
      { shape: 'sphere', pos: [0.56, 0.48, -0.24], size: [0.54, 0.48, 0.54], variant: 'foliage' },
    ],
  },
  {
    id: 'christmas_tree',
    label: '装饰松',
    heightM: 4.5,
    widthM: 2.1,
    depthM: 2.1,
    parts: [
      { shape: 'cylinder', pos: [0, 0.35, 0], size: [0.22, 0.26, 0.7], variant: 'wood' },
      { shape: 'cone', pos: [0, 1.35, 0], size: [1.05, 1.3, 12], variant: 'foliage' },
      { shape: 'cone', pos: [0, 2.3, 0], size: [0.82, 1.2, 12], variant: 'foliage' },
      { shape: 'cone', pos: [0, 3.2, 0], size: [0.58, 1.1, 12], variant: 'foliage' },
      { shape: 'sphere', pos: [0, 4.0, 0], size: [0.16, 0.16, 0.16], variant: 'emissiveLamp' },
    ],
  },
];

// ============================================================================
// 2. 载具库存 (8 Pre-built Vehicle Variants)
// ============================================================================
const VEHICLE_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'sedan',
    label: '城市轿车',
    heightM: 1.5,
    widthM: 2.0,
    depthM: 4.4,
    parts: [
      { shape: 'box', pos: [0, 0.55, 0], size: [1.95, 0.65, 4.4], variant: 'car' },
      { shape: 'box', pos: [0, 1.15, -0.15], size: [1.65, 0.58, 2.2], variant: 'car' },
      { shape: 'cylinder', pos: [-0.95, 0.35, 1.35], rot: [0, 0, Math.PI / 2], size: [0.35, 0.35, 0.24], variant: 'dark' },
      { shape: 'cylinder', pos: [0.95, 0.35, 1.35], rot: [0, 0, Math.PI / 2], size: [0.35, 0.35, 0.24], variant: 'dark' },
      { shape: 'cylinder', pos: [-0.95, 0.35, -1.35], rot: [0, 0, Math.PI / 2], size: [0.35, 0.35, 0.24], variant: 'dark' },
      { shape: 'cylinder', pos: [0.95, 0.35, -1.35], rot: [0, 0, Math.PI / 2], size: [0.35, 0.35, 0.24], variant: 'dark' },
    ],
  },
  {
    id: 'suv',
    label: '越野SUV',
    heightM: 1.85,
    widthM: 2.1,
    depthM: 4.6,
    parts: [
      { shape: 'box', pos: [0, 0.68, 0], size: [2.02, 0.74, 4.55], variant: 'car' },
      { shape: 'box', pos: [0, 1.38, -0.35], size: [1.82, 0.72, 2.85], variant: 'car' },
      { shape: 'box', pos: [0, 1.78, -0.45], size: [1.5, 0.08, 2.2], variant: 'dark' },
      { shape: 'cylinder', pos: [0, 0.98, -2.32], rot: [Math.PI / 2, 0, 0], size: [0.38, 0.38, 0.24], variant: 'dark' },
      { shape: 'cylinder', pos: [-0.98, 0.42, 1.42], rot: [0, 0, Math.PI / 2], size: [0.42, 0.42, 0.28], variant: 'dark' },
      { shape: 'cylinder', pos: [0.98, 0.42, 1.42], rot: [0, 0, Math.PI / 2], size: [0.42, 0.42, 0.28], variant: 'dark' },
      { shape: 'cylinder', pos: [-0.98, 0.42, -1.42], rot: [0, 0, Math.PI / 2], size: [0.42, 0.42, 0.28], variant: 'dark' },
      { shape: 'cylinder', pos: [0.98, 0.42, -1.42], rot: [0, 0, Math.PI / 2], size: [0.42, 0.42, 0.28], variant: 'dark' },
    ],
  },
  {
    id: 'pickup',
    label: '美式皮卡',
    heightM: 1.82,
    widthM: 2.1,
    depthM: 5.0,
    parts: [
      { shape: 'box', pos: [0, 0.66, 0], size: [2.04, 0.68, 4.95], variant: 'car' },
      { shape: 'box', pos: [0, 1.35, 0.55], size: [1.82, 0.72, 1.85], variant: 'car' },
      { shape: 'box', pos: [-0.92, 1.08, -1.42], size: [0.16, 0.34, 1.95], variant: 'car' },
      { shape: 'box', pos: [0.92, 1.08, -1.42], size: [0.16, 0.34, 1.95], variant: 'car' },
      { shape: 'box', pos: [0, 1.08, -2.38], size: [1.96, 0.34, 0.16], variant: 'car' },
      { shape: 'cylinder', pos: [-0.98, 0.42, 1.55], rot: [0, 0, Math.PI / 2], size: [0.42, 0.42, 0.28], variant: 'dark' },
      { shape: 'cylinder', pos: [0.98, 0.42, 1.55], rot: [0, 0, Math.PI / 2], size: [0.42, 0.42, 0.28], variant: 'dark' },
      { shape: 'cylinder', pos: [-0.98, 0.42, -1.55], rot: [0, 0, Math.PI / 2], size: [0.42, 0.42, 0.28], variant: 'dark' },
      { shape: 'cylinder', pos: [0.98, 0.42, -1.55], rot: [0, 0, Math.PI / 2], size: [0.42, 0.42, 0.28], variant: 'dark' },
    ],
  },
  {
    id: 'van',
    label: '厢式面包',
    heightM: 2.15,
    widthM: 2.05,
    depthM: 4.7,
    parts: [
      { shape: 'box', pos: [0, 1.18, -0.35], size: [2.0, 1.72, 3.85], variant: 'car' },
      { shape: 'box', pos: [0, 0.85, 1.72], size: [1.98, 1.02, 0.85], variant: 'car' },
      { shape: 'box', pos: [0, 1.55, 1.55], rot: [-0.3, 0, 0], size: [1.82, 0.65, 0.62], variant: 'dark' },
      { shape: 'cylinder', pos: [-0.96, 0.36, 1.48], rot: [0, 0, Math.PI / 2], size: [0.36, 0.36, 0.24], variant: 'dark' },
      { shape: 'cylinder', pos: [0.96, 0.36, 1.48], rot: [0, 0, Math.PI / 2], size: [0.36, 0.36, 0.24], variant: 'dark' },
      { shape: 'cylinder', pos: [-0.96, 0.36, -1.48], rot: [0, 0, Math.PI / 2], size: [0.36, 0.36, 0.24], variant: 'dark' },
      { shape: 'cylinder', pos: [0.96, 0.36, -1.48], rot: [0, 0, Math.PI / 2], size: [0.36, 0.36, 0.24], variant: 'dark' },
    ],
  },
  {
    id: 'truck',
    label: '重型货车',
    heightM: 2.95,
    widthM: 2.35,
    depthM: 6.4,
    parts: [
      { shape: 'box', pos: [0, 1.38, 1.95], size: [2.22, 1.78, 1.85], variant: 'car' },
      { shape: 'box', pos: [0, 1.82, -1.0], size: [2.32, 2.15, 3.95], variant: 'default' },
      { shape: 'box', pos: [0, 0.68, -0.5], size: [2.1, 0.35, 5.6], variant: 'dark' },
      { shape: 'cylinder', pos: [-1.08, 0.48, 2.05], rot: [0, 0, Math.PI / 2], size: [0.48, 0.48, 0.3], variant: 'dark' },
      { shape: 'cylinder', pos: [1.08, 0.48, 2.05], rot: [0, 0, Math.PI / 2], size: [0.48, 0.48, 0.3], variant: 'dark' },
      { shape: 'cylinder', pos: [-1.08, 0.48, -0.9], rot: [0, 0, Math.PI / 2], size: [0.48, 0.48, 0.3], variant: 'dark' },
      { shape: 'cylinder', pos: [1.08, 0.48, -0.9], rot: [0, 0, Math.PI / 2], size: [0.48, 0.48, 0.3], variant: 'dark' },
      { shape: 'cylinder', pos: [-1.08, 0.48, -2.15], rot: [0, 0, Math.PI / 2], size: [0.48, 0.48, 0.3], variant: 'dark' },
      { shape: 'cylinder', pos: [1.08, 0.48, -2.15], rot: [0, 0, Math.PI / 2], size: [0.48, 0.48, 0.3], variant: 'dark' },
    ],
  },
  {
    id: 'sports',
    label: '低趴跑车',
    heightM: 1.22,
    widthM: 2.05,
    depthM: 4.45,
    parts: [
      { shape: 'box', pos: [0, 0.42, 0], size: [2.02, 0.48, 4.42], variant: 'car' },
      { shape: 'box', pos: [0, 0.88, -0.2], size: [1.55, 0.44, 1.95], variant: 'car' },
      { shape: 'box', pos: [0, 0.96, -1.98], size: [1.92, 0.08, 0.32], variant: 'dark' },
      { shape: 'box', pos: [-0.62, 0.82, -1.85], size: [0.08, 0.25, 0.14], variant: 'dark' },
      { shape: 'box', pos: [0.62, 0.82, -1.85], size: [0.08, 0.25, 0.14], variant: 'dark' },
      { shape: 'cylinder', pos: [-0.98, 0.33, 1.38], rot: [0, 0, Math.PI / 2], size: [0.33, 0.33, 0.28], variant: 'dark' },
      { shape: 'cylinder', pos: [0.98, 0.33, 1.38], rot: [0, 0, Math.PI / 2], size: [0.33, 0.33, 0.28], variant: 'dark' },
      { shape: 'cylinder', pos: [-0.98, 0.33, -1.38], rot: [0, 0, Math.PI / 2], size: [0.33, 0.33, 0.28], variant: 'dark' },
      { shape: 'cylinder', pos: [0.98, 0.33, -1.38], rot: [0, 0, Math.PI / 2], size: [0.33, 0.33, 0.28], variant: 'dark' },
    ],
  },
  {
    id: 'bus',
    label: '城市巴士',
    heightM: 2.95,
    widthM: 2.4,
    depthM: 7.4,
    parts: [
      { shape: 'box', pos: [0, 1.52, 0], size: [2.36, 2.35, 7.3], variant: 'car' },
      { shape: 'box', pos: [0, 2.75, -0.4], size: [1.5, 0.26, 3.2], variant: 'accent' },
      { shape: 'box', pos: [0, 1.75, 3.66], size: [2.1, 1.2, 0.08], variant: 'dark' },
      { shape: 'cylinder', pos: [-1.1, 0.48, 2.35], rot: [0, 0, Math.PI / 2], size: [0.48, 0.48, 0.3], variant: 'dark' },
      { shape: 'cylinder', pos: [1.1, 0.48, 2.35], rot: [0, 0, Math.PI / 2], size: [0.48, 0.48, 0.3], variant: 'dark' },
      { shape: 'cylinder', pos: [-1.1, 0.48, -2.15], rot: [0, 0, Math.PI / 2], size: [0.48, 0.48, 0.3], variant: 'dark' },
      { shape: 'cylinder', pos: [1.1, 0.48, -2.15], rot: [0, 0, Math.PI / 2], size: [0.48, 0.48, 0.3], variant: 'dark' },
    ],
  },
  {
    id: 'forklift',
    label: '工业叉车',
    heightM: 2.3,
    widthM: 1.35,
    depthM: 2.9,
    parts: [
      { shape: 'box', pos: [0, 0.62, -0.35], size: [1.28, 0.72, 1.9], variant: 'car' },
      { shape: 'box', pos: [0, 1.55, -0.25], size: [1.12, 1.15, 1.15], variant: 'dark' },
      { shape: 'box', pos: [-0.36, 1.25, 0.8], size: [0.12, 2.1, 0.14], variant: 'dark' },
      { shape: 'box', pos: [0.36, 1.25, 0.8], size: [0.12, 2.1, 0.14], variant: 'dark' },
      { shape: 'box', pos: [-0.34, 0.2, 1.38], size: [0.14, 0.07, 1.15], variant: 'concrete' },
      { shape: 'box', pos: [0.34, 0.2, 1.38], size: [0.14, 0.07, 1.15], variant: 'concrete' },
      { shape: 'cylinder', pos: [-0.66, 0.32, 0.45], rot: [0, 0, Math.PI / 2], size: [0.32, 0.32, 0.22], variant: 'dark' },
      { shape: 'cylinder', pos: [0.66, 0.32, 0.45], rot: [0, 0, Math.PI / 2], size: [0.32, 0.32, 0.22], variant: 'dark' },
      { shape: 'cylinder', pos: [-0.62, 0.26, -0.95], rot: [0, 0, Math.PI / 2], size: [0.26, 0.26, 0.2], variant: 'dark' },
      { shape: 'cylinder', pos: [0.62, 0.26, -0.95], rot: [0, 0, Math.PI / 2], size: [0.26, 0.26, 0.2], variant: 'dark' },
    ],
  },
];

// ============================================================================
// 3. 单体建筑库存 (8 Pre-built Building Variants for PropType 'building')
// ============================================================================
const BUILDING_PROP_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'modern_tower',
    label: '现代方楼',
    heightM: 9.0,
    widthM: 4.2,
    depthM: 4.2,
    parts: [
      { shape: 'box', pos: [0, 4.3, 0], size: [4.0, 8.6, 4.0], variant: 'default' },
      { shape: 'box', pos: [0, 3.0, 0], size: [4.16, 0.2, 4.16], variant: 'accent' },
      { shape: 'box', pos: [0, 6.0, 0], size: [4.16, 0.2, 4.16], variant: 'accent' },
      { shape: 'box', pos: [0, 8.8, 0], size: [4.12, 0.4, 4.12], variant: 'dark' },
    ],
  },
  {
    id: 'stepped_highrise',
    label: '退台高层',
    heightM: 12.2,
    widthM: 4.6,
    depthM: 4.6,
    parts: [
      { shape: 'box', pos: [0, 2.2, 0], size: [4.6, 4.4, 4.6], variant: 'default' },
      { shape: 'box', pos: [0, 6.2, 0], size: [3.6, 3.8, 3.6], variant: 'default' },
      { shape: 'box', pos: [0, 9.6, 0], size: [2.5, 3.2, 2.5], variant: 'accent' },
      { shape: 'cylinder', pos: [0, 11.7, 0], size: [0.06, 0.08, 1.4], variant: 'dark' },
    ],
  },
  {
    id: 'industrial_loft',
    label: '工业厂房',
    heightM: 7.4,
    widthM: 5.2,
    depthM: 4.4,
    parts: [
      { shape: 'box', pos: [0, 2.6, 0], size: [5.0, 5.2, 4.2], variant: 'concrete' },
      { shape: 'box', pos: [0, 5.5, -0.7], rot: [0.35, 0, 0], size: [5.1, 0.25, 2.4], variant: 'dark' },
      { shape: 'box', pos: [0, 5.5, 0.7], rot: [0.35, 0, 0], size: [5.1, 0.25, 2.4], variant: 'dark' },
      { shape: 'cylinder', pos: [1.8, 5.8, -1.4], size: [0.28, 0.36, 3.2], variant: 'dark' },
    ],
  },
  {
    id: 'residential_block',
    label: '坡顶公寓',
    heightM: 8.6,
    widthM: 4.6,
    depthM: 3.8,
    parts: [
      { shape: 'box', pos: [0, 3.4, 0], size: [4.4, 6.8, 3.6], variant: 'default' },
      { shape: 'box', pos: [0, 2.4, 1.95], size: [2.8, 0.22, 0.5], variant: 'accent' },
      { shape: 'box', pos: [0, 4.8, 1.95], size: [2.8, 0.22, 0.5], variant: 'accent' },
      { shape: 'cone', pos: [0, 7.7, 0], rot: [0, Math.PI / 4, 0], size: [3.2, 1.8, 4], variant: 'accent' },
    ],
  },
  {
    id: 'commercial_podium',
    label: '商业裙楼',
    heightM: 8.2,
    widthM: 5.4,
    depthM: 4.8,
    parts: [
      { shape: 'box', pos: [0, 1.6, 0], size: [5.4, 3.2, 4.8], variant: 'accent' },
      { shape: 'box', pos: [0, 2.6, 2.6], size: [4.2, 0.2, 0.9], variant: 'dark' },
      { shape: 'box', pos: [-0.6, 5.6, -0.3], size: [3.6, 4.8, 3.4], variant: 'default' },
    ],
  },
  {
    id: 'warehouse_arch',
    label: '拱顶机库',
    heightM: 5.6,
    widthM: 5.2,
    depthM: 6.0,
    parts: [
      { shape: 'box', pos: [0, 1.4, 0], size: [5.2, 2.8, 5.8], variant: 'concrete' },
      { shape: 'cylinder', pos: [0, 2.8, 0], rot: [Math.PI / 2, 0, 0], size: [2.6, 2.6, 5.8], variant: 'accent' },
      { shape: 'box', pos: [0, 1.3, 2.95], size: [2.6, 2.6, 0.18], variant: 'dark' },
    ],
  },
  {
    id: 'courtyard_hall',
    label: '回字院落',
    heightM: 5.2,
    widthM: 5.6,
    depthM: 5.6,
    parts: [
      { shape: 'box', pos: [0, 2.2, -2.1], size: [5.6, 4.4, 1.4], variant: 'default' },
      { shape: 'box', pos: [-2.1, 1.8, 0.6], size: [1.4, 3.6, 4.2], variant: 'default' },
      { shape: 'box', pos: [2.1, 1.8, 0.6], size: [1.4, 3.6, 4.2], variant: 'default' },
      { shape: 'box', pos: [0, 1.2, 2.3], size: [2.8, 2.4, 0.8], variant: 'accent' },
    ],
  },
  {
    id: 'ruin_skeleton',
    label: '框架残楼',
    heightM: 7.5,
    widthM: 4.4,
    depthM: 4.0,
    parts: [
      { shape: 'box', pos: [0, 0.25, 0], size: [4.4, 0.5, 4.0], variant: 'concrete' },
      { shape: 'box', pos: [0, 3.2, 0], size: [4.2, 0.25, 3.8], variant: 'concrete' },
      { shape: 'box', pos: [-1.0, 6.0, -0.4], size: [2.2, 0.25, 2.8], variant: 'concrete' },
      { shape: 'box', pos: [-1.9, 3.6, -1.7], size: [0.35, 7.2, 0.35], variant: 'concrete' },
      { shape: 'box', pos: [1.9, 2.4, -1.7], size: [0.35, 4.8, 0.35], variant: 'concrete' },
      { shape: 'box', pos: [-1.9, 3.6, 1.7], size: [0.35, 7.2, 0.35], variant: 'concrete' },
      { shape: 'box', pos: [1.9, 1.8, 1.7], size: [0.35, 3.6, 0.35], variant: 'concrete' },
    ],
  },
];

// ============================================================================
// 4. 灯具库存 (8 Pre-built Lamp Variants)
// ============================================================================
const LAMP_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'single_arm',
    label: '单臂路灯',
    heightM: 4.2,
    widthM: 0.5,
    depthM: 1.2,
    parts: [
      { shape: 'cylinder', pos: [0, 0.15, 0], size: [0.18, 0.22, 0.3], variant: 'dark' },
      { shape: 'cylinder', pos: [0, 2.0, 0], size: [0.06, 0.08, 4.0], variant: 'dark' },
      { shape: 'box', pos: [0, 4.0, 0.42], size: [0.08, 0.08, 0.9], variant: 'dark' },
      { shape: 'box', pos: [0, 3.92, 0.78], size: [0.28, 0.1, 0.42], variant: 'emissiveLamp' },
    ],
  },
  {
    id: 'double_arm',
    label: '双臂高杆',
    heightM: 4.8,
    widthM: 0.5,
    depthM: 2.1,
    parts: [
      { shape: 'cylinder', pos: [0, 0.2, 0], size: [0.2, 0.26, 0.4], variant: 'dark' },
      { shape: 'cylinder', pos: [0, 2.4, 0], size: [0.07, 0.1, 4.6], variant: 'dark' },
      { shape: 'box', pos: [0, 4.6, 0], size: [0.09, 0.09, 2.0], variant: 'dark' },
      { shape: 'box', pos: [0, 4.5, 0.86], size: [0.28, 0.1, 0.4], variant: 'emissiveLamp' },
      { shape: 'box', pos: [0, 4.5, -0.86], size: [0.28, 0.1, 0.4], variant: 'emissiveLamp' },
    ],
  },
  {
    id: 'vintage_post',
    label: '复古庭院灯',
    heightM: 3.4,
    widthM: 0.55,
    depthM: 0.55,
    parts: [
      { shape: 'cylinder', pos: [0, 0.25, 0], size: [0.18, 0.25, 0.5], variant: 'dark' },
      { shape: 'cylinder', pos: [0, 1.55, 0], size: [0.06, 0.09, 2.4], variant: 'dark' },
      { shape: 'sphere', pos: [0, 2.95, 0], size: [0.26, 0.3, 0.26], variant: 'emissiveLamp' },
      { shape: 'cone', pos: [0, 3.3, 0], size: [0.34, 0.26, 8], variant: 'dark' },
    ],
  },
  {
    id: 'flood_tower',
    label: '工地投光塔',
    heightM: 4.5,
    widthM: 1.2,
    depthM: 1.2,
    parts: [
      { shape: 'box', pos: [0, 0.35, 0], size: [0.9, 0.7, 0.9], variant: 'car' },
      { shape: 'cylinder', pos: [0, 2.35, 0], size: [0.07, 0.1, 3.8], variant: 'dark' },
      { shape: 'box', pos: [0, 4.25, 0], size: [1.1, 0.12, 0.14], variant: 'dark' },
      { shape: 'box', pos: [-0.36, 4.35, 0.12], rot: [0.35, 0, 0], size: [0.32, 0.26, 0.14], variant: 'emissiveLamp' },
      { shape: 'box', pos: [0.36, 4.35, 0.12], rot: [0.35, 0, 0], size: [0.32, 0.26, 0.14], variant: 'emissiveLamp' },
    ],
  },
  {
    id: 'bollard_light',
    label: '矮桩地灯',
    heightM: 1.1,
    widthM: 0.32,
    depthM: 0.32,
    parts: [
      { shape: 'cylinder', pos: [0, 0.4, 0], size: [0.13, 0.15, 0.8], variant: 'dark' },
      { shape: 'cylinder', pos: [0, 0.9, 0], size: [0.12, 0.12, 0.22], variant: 'emissiveLamp' },
      { shape: 'cylinder', pos: [0, 1.05, 0], size: [0.14, 0.14, 0.08], variant: 'dark' },
    ],
  },
  {
    id: 'industrial_boom',
    label: '悬臂工矿灯',
    heightM: 4.1,
    widthM: 0.5,
    depthM: 1.4,
    parts: [
      { shape: 'box', pos: [0, 2.0, 0], size: [0.18, 4.0, 0.18], variant: 'dark' },
      { shape: 'box', pos: [0, 3.85, 0.55], rot: [-0.25, 0, 0], size: [0.1, 0.1, 1.25], variant: 'dark' },
      { shape: 'cone', pos: [0, 3.92, 1.1], size: [0.28, 0.28, 10], variant: 'dark' },
      { shape: 'sphere', pos: [0, 3.82, 1.1], size: [0.15, 0.15, 0.15], variant: 'emissiveLamp' },
    ],
  },
  {
    id: 'traffic_pole',
    label: '交通信号杆',
    heightM: 5.0,
    widthM: 0.4,
    depthM: 2.6,
    parts: [
      { shape: 'cylinder', pos: [0, 2.4, -0.8], size: [0.1, 0.13, 4.8], variant: 'dark' },
      { shape: 'box', pos: [0, 4.65, 0.25], size: [0.1, 0.1, 2.3], variant: 'dark' },
      { shape: 'box', pos: [0.12, 4.55, 0.95], size: [0.18, 0.62, 0.26], variant: 'dark' },
      { shape: 'sphere', pos: [0.22, 4.72, 0.95], size: [0.06, 0.06, 0.06], variant: 'emissiveLamp' },
    ],
  },
  {
    id: 'neon_totem',
    label: '灯箱立柱',
    heightM: 3.6,
    widthM: 0.8,
    depthM: 0.45,
    parts: [
      { shape: 'box', pos: [0, 0.2, 0], size: [0.82, 0.4, 0.46], variant: 'dark' },
      { shape: 'box', pos: [0, 1.95, 0], size: [0.7, 3.1, 0.24], variant: 'emissiveLamp' },
      { shape: 'box', pos: [-0.36, 1.95, 0], size: [0.08, 3.2, 0.34], variant: 'dark' },
      { shape: 'box', pos: [0.36, 1.95, 0], size: [0.08, 3.2, 0.34], variant: 'dark' },
    ],
  },
];

// ============================================================================
// 5. 岩石库存 (8 Pre-built Rock Variants)
// ============================================================================
const ROCK_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'boulder_cluster',
    label: '乱石堆',
    heightM: 1.5,
    widthM: 2.4,
    depthM: 2.1,
    parts: [
      { shape: 'dodecahedron', pos: [0, 0.58, 0], rot: [0.15, 0.35, 0.1], size: [1.18, 0.8, 0.98], variant: 'rock' },
      { shape: 'dodecahedron', pos: [0.85, 0.32, 0.42], rot: [-0.2, 0.9, 0.2], size: [0.55, 0.42, 0.5], variant: 'rock' },
    ],
  },
  {
    id: 'cliff_slab',
    label: '悬崖板岩',
    heightM: 2.4,
    widthM: 2.6,
    depthM: 1.7,
    parts: [
      { shape: 'dodecahedron', pos: [0, 1.1, 0], rot: [0.08, 0.2, -0.15], size: [1.25, 1.35, 0.72], variant: 'rock' },
      { shape: 'dodecahedron', pos: [-0.75, 0.55, 0.35], rot: [0.2, 0.5, 0.1], size: [0.65, 0.65, 0.45], variant: 'rock' },
    ],
  },
  {
    id: 'spire_peak',
    label: '尖峰石笋',
    heightM: 2.8,
    widthM: 1.8,
    depthM: 1.8,
    parts: [
      { shape: 'cone', pos: [0, 1.4, 0], rot: [0.05, 0.4, -0.05], size: [0.78, 2.8, 6], variant: 'rock' },
      { shape: 'cone', pos: [0.58, 0.85, 0.32], rot: [0.1, 1.1, 0.12], size: [0.46, 1.7, 6], variant: 'rock' },
    ],
  },
  {
    id: 'stepping_flat',
    label: '扁平踏石',
    heightM: 0.45,
    widthM: 2.5,
    depthM: 2.2,
    parts: [
      { shape: 'cylinder', pos: [-0.4, 0.16, -0.2], size: [0.85, 0.92, 0.32], variant: 'rock' },
      { shape: 'cylinder', pos: [0.72, 0.14, 0.45], size: [0.6, 0.66, 0.28], variant: 'rock' },
    ],
  },
  {
    id: 'rubble_pile',
    label: '碎石瓦砾',
    heightM: 1.1,
    widthM: 2.6,
    depthM: 2.4,
    parts: [
      { shape: 'dodecahedron', pos: [0, 0.42, 0], size: [0.75, 0.46, 0.7], variant: 'rock' },
      { shape: 'box', pos: [-0.45, 0.3, 0.38], rot: [0.3, 0.6, -0.25], size: [0.9, 0.24, 0.55], variant: 'concrete' },
      { shape: 'dodecahedron', pos: [0.68, 0.26, -0.3], size: [0.45, 0.32, 0.4], variant: 'rock' },
    ],
  },
  {
    id: 'arch_rock',
    label: '天然石拱',
    heightM: 2.2,
    widthM: 2.8,
    depthM: 1.4,
    parts: [
      { shape: 'dodecahedron', pos: [-0.95, 0.78, 0], size: [0.55, 0.95, 0.65], variant: 'rock' },
      { shape: 'dodecahedron', pos: [0.95, 0.78, 0], size: [0.55, 0.95, 0.65], variant: 'rock' },
      { shape: 'dodecahedron', pos: [0, 1.72, 0], size: [1.38, 0.45, 0.62], variant: 'rock' },
    ],
  },
  {
    id: 'cracked_monolith',
    label: '巨石方碑',
    heightM: 2.7,
    widthM: 1.4,
    depthM: 1.2,
    parts: [
      { shape: 'box', pos: [0, 1.25, 0], rot: [0.04, 0.12, -0.06], size: [1.15, 2.5, 0.9], variant: 'rock' },
      { shape: 'dodecahedron', pos: [0, 2.35, 0], size: [0.58, 0.38, 0.48], variant: 'rock' },
    ],
  },
  {
    id: 'crystal_cluster',
    label: '矿石棱柱',
    heightM: 2.0,
    widthM: 1.8,
    depthM: 1.8,
    parts: [
      { shape: 'cylinder', pos: [0, 0.95, 0], rot: [0.1, 0, -0.08], size: [0.35, 0.48, 1.9], variant: 'accent' },
      { shape: 'cylinder', pos: [0.52, 0.68, 0.22], rot: [-0.15, 0.3, -0.32], size: [0.24, 0.34, 1.4], variant: 'accent' },
      { shape: 'cylinder', pos: [-0.46, 0.58, -0.2], rot: [0.22, 0, 0.34], size: [0.22, 0.32, 1.2], variant: 'rock' },
    ],
  },
];

// ============================================================================
// 6. 掩体护栏库存 (8 Pre-built Barrier Variants)
// ============================================================================
const BARRIER_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'jersey',
    label: '防撞墩',
    heightM: 1.0,
    widthM: 2.5,
    depthM: 0.5,
    parts: [
      { shape: 'box', pos: [0, 0.175, 0], size: [2.5, 0.35, 0.5], variant: 'concrete' },
      { shape: 'box', pos: [0, 0.675, 0], size: [2.5, 0.65, 0.28], variant: 'concrete' },
    ],
  },
  {
    id: 'steel_rail',
    label: '金属护栏',
    heightM: 1.05,
    widthM: 3.0,
    depthM: 0.24,
    parts: [
      { shape: 'box', pos: [-1.35, 0.5, 0], size: [0.12, 1.0, 0.14], variant: 'dark' },
      { shape: 'box', pos: [0, 0.5, 0], size: [0.12, 1.0, 0.14], variant: 'dark' },
      { shape: 'box', pos: [1.35, 0.5, 0], size: [0.12, 1.0, 0.14], variant: 'dark' },
      { shape: 'box', pos: [0, 0.72, 0.08], size: [3.0, 0.26, 0.08], variant: 'accent' },
    ],
  },
  {
    id: 'roadblock_cone',
    label: '警示路障',
    heightM: 1.0,
    widthM: 2.4,
    depthM: 0.6,
    parts: [
      { shape: 'box', pos: [-0.85, 0.45, 0], size: [0.12, 0.9, 0.48], variant: 'dark' },
      { shape: 'box', pos: [0.85, 0.45, 0], size: [0.12, 0.9, 0.48], variant: 'dark' },
      { shape: 'box', pos: [0, 0.72, 0], size: [2.1, 0.28, 0.08], variant: 'car' },
      { shape: 'cone', pos: [1.35, 0.35, 0], size: [0.22, 0.7, 10], variant: 'wood' },
    ],
  },
  {
    id: 'sandbag_wall',
    label: '沙袋掩体',
    heightM: 1.05,
    widthM: 2.6,
    depthM: 0.75,
    parts: [
      { shape: 'box', pos: [-0.62, 0.2, 0], size: [1.22, 0.4, 0.68], variant: 'wood' },
      { shape: 'box', pos: [0.62, 0.2, 0], size: [1.22, 0.4, 0.68], variant: 'wood' },
      { shape: 'box', pos: [0, 0.56, 0], size: [2.2, 0.34, 0.56], variant: 'default' },
      { shape: 'box', pos: [0, 0.88, 0], size: [1.6, 0.3, 0.48], variant: 'wood' },
    ],
  },
  {
    id: 'chain_fence',
    label: '铁丝围网',
    heightM: 2.2,
    widthM: 3.0,
    depthM: 0.2,
    parts: [
      { shape: 'cylinder', pos: [-1.45, 1.1, 0], size: [0.06, 0.07, 2.2], variant: 'dark' },
      { shape: 'cylinder', pos: [1.45, 1.1, 0], size: [0.06, 0.07, 2.2], variant: 'dark' },
      { shape: 'box', pos: [0, 2.15, 0], size: [2.95, 0.08, 0.08], variant: 'dark' },
      { shape: 'box', pos: [0, 0.35, 0], size: [2.95, 0.6, 0.14], variant: 'concrete' },
      { shape: 'box', pos: [0, 1.35, 0], size: [2.85, 1.4, 0.03], variant: 'accent' },
    ],
  },
  {
    id: 'bollard_row',
    label: '阻车桩组',
    heightM: 0.9,
    widthM: 2.6,
    depthM: 0.35,
    parts: [
      { shape: 'cylinder', pos: [-1.05, 0.45, 0], size: [0.11, 0.12, 0.9], variant: 'dark' },
      { shape: 'cylinder', pos: [0, 0.45, 0], size: [0.11, 0.12, 0.9], variant: 'dark' },
      { shape: 'cylinder', pos: [1.05, 0.45, 0], size: [0.11, 0.12, 0.9], variant: 'dark' },
      { shape: 'cylinder', pos: [-1.05, 0.82, 0], size: [0.115, 0.115, 0.12], variant: 'emissiveLamp' },
      { shape: 'cylinder', pos: [0, 0.82, 0], size: [0.115, 0.115, 0.12], variant: 'emissiveLamp' },
      { shape: 'cylinder', pos: [1.05, 0.82, 0], size: [0.115, 0.115, 0.12], variant: 'emissiveLamp' },
    ],
  },
  {
    id: 'police_barricade',
    label: '铁马拒马',
    heightM: 1.1,
    widthM: 2.4,
    depthM: 0.65,
    parts: [
      { shape: 'box', pos: [-0.95, 0.52, 0], rot: [0.22, 0, 0], size: [0.08, 1.1, 0.08], variant: 'dark' },
      { shape: 'box', pos: [0.95, 0.52, 0], rot: [-0.22, 0, 0], size: [0.08, 1.1, 0.08], variant: 'dark' },
      { shape: 'box', pos: [0, 0.95, 0], size: [2.35, 0.12, 0.12], variant: 'car' },
      { shape: 'box', pos: [0, 0.55, 0], size: [2.25, 0.1, 0.1], variant: 'accent' },
    ],
  },
  {
    id: 'concrete_parapet',
    label: '重型挡墙',
    heightM: 1.5,
    widthM: 2.8,
    depthM: 0.55,
    parts: [
      { shape: 'box', pos: [0, 0.72, 0], size: [2.8, 1.44, 0.42], variant: 'concrete' },
      { shape: 'box', pos: [0, 1.48, 0], size: [2.88, 0.14, 0.52], variant: 'accent' },
    ],
  },
];

// ============================================================================
// 7. 货箱容器库存 (8 Pre-built Crate Variants)
// ============================================================================
const CRATE_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'wood_crate',
    label: '木质货箱',
    heightM: 1.1,
    widthM: 1.1,
    depthM: 1.1,
    parts: [
      { shape: 'box', pos: [0, 0.55, 0], size: [1.1, 1.1, 1.1], variant: 'wood' },
      { shape: 'box', pos: [0, 1.12, 0], size: [1.14, 0.06, 1.14], variant: 'dark' },
    ],
  },
  {
    id: 'pallet_stack',
    label: '托盘堆箱',
    heightM: 1.5,
    widthM: 1.4,
    depthM: 1.4,
    parts: [
      { shape: 'box', pos: [0, 0.07, 0], size: [1.4, 0.14, 1.4], variant: 'wood' },
      { shape: 'box', pos: [-0.28, 0.56, 0.1], size: [0.72, 0.84, 0.72], variant: 'wood' },
      { shape: 'box', pos: [0.36, 0.46, -0.15], size: [0.56, 0.64, 0.8], variant: 'accent' },
      { shape: 'box', pos: [-0.05, 1.24, 0.05], rot: [0, 0.28, 0], size: [0.6, 0.52, 0.6], variant: 'wood' },
    ],
  },
  {
    id: 'oil_drums',
    label: '油桶组合',
    heightM: 1.1,
    widthM: 1.5,
    depthM: 1.2,
    parts: [
      { shape: 'cylinder', pos: [-0.36, 0.52, 0], size: [0.31, 0.31, 1.04], variant: 'car' },
      { shape: 'cylinder', pos: [0.36, 0.52, 0.18], size: [0.31, 0.31, 1.04], variant: 'dark' },
      { shape: 'cylinder', pos: [0.05, 0.31, -0.52], rot: [0, 0, Math.PI / 2], size: [0.3, 0.3, 0.95], variant: 'wood' },
    ],
  },
  {
    id: 'ammo_case',
    label: '战术金属箱',
    heightM: 0.7,
    widthM: 1.5,
    depthM: 0.9,
    parts: [
      { shape: 'box', pos: [0, 0.3, 0], size: [1.45, 0.56, 0.86], variant: 'dark' },
      { shape: 'box', pos: [0, 0.62, 0], size: [1.5, 0.1, 0.9], variant: 'concrete' },
      { shape: 'box', pos: [-0.45, 0.6, 0.44], size: [0.14, 0.16, 0.06], variant: 'accent' },
      { shape: 'box', pos: [0.45, 0.6, 0.44], size: [0.14, 0.16, 0.06], variant: 'accent' },
    ],
  },
  {
    id: 'mini_container',
    label: '迷你集装箱',
    heightM: 2.4,
    widthM: 2.3,
    depthM: 4.5,
    parts: [
      { shape: 'box', pos: [0, 1.2, 0], size: [2.25, 2.35, 4.45], variant: 'car' },
      { shape: 'box', pos: [0, 2.38, 0], size: [2.3, 0.1, 4.5], variant: 'dark' },
      { shape: 'box', pos: [0, 0.08, 0], size: [2.3, 0.16, 4.5], variant: 'dark' },
    ],
  },
  {
    id: 'dumpster',
    label: '工业垃圾箱',
    heightM: 1.35,
    widthM: 1.9,
    depthM: 1.3,
    parts: [
      { shape: 'box', pos: [0, 0.65, 0], size: [1.85, 1.15, 1.2], variant: 'foliage' },
      { shape: 'box', pos: [0, 1.26, -0.05], rot: [0.06, 0, 0], size: [1.92, 0.12, 1.28], variant: 'dark' },
    ],
  },
  {
    id: 'cable_reel',
    label: '线缆卷轴',
    heightM: 1.25,
    widthM: 1.25,
    depthM: 0.9,
    parts: [
      { shape: 'cylinder', pos: [0, 0.62, -0.34], rot: [Math.PI / 2, 0, 0], size: [0.62, 0.62, 0.1], variant: 'wood' },
      { shape: 'cylinder', pos: [0, 0.62, 0.34], rot: [Math.PI / 2, 0, 0], size: [0.62, 0.62, 0.1], variant: 'wood' },
      { shape: 'cylinder', pos: [0, 0.62, 0], rot: [Math.PI / 2, 0, 0], size: [0.42, 0.42, 0.6], variant: 'dark' },
    ],
  },
  {
    id: 'toolbox_rack',
    label: '仓储货架',
    heightM: 2.1,
    widthM: 1.8,
    depthM: 0.75,
    parts: [
      { shape: 'box', pos: [-0.85, 1.05, -0.32], size: [0.08, 2.1, 0.08], variant: 'dark' },
      { shape: 'box', pos: [0.85, 1.05, -0.32], size: [0.08, 2.1, 0.08], variant: 'dark' },
      { shape: 'box', pos: [-0.85, 1.05, 0.32], size: [0.08, 2.1, 0.08], variant: 'dark' },
      { shape: 'box', pos: [0.85, 1.05, 0.32], size: [0.08, 2.1, 0.08], variant: 'dark' },
      { shape: 'box', pos: [0, 0.3, 0], size: [1.75, 0.08, 0.7], variant: 'accent' },
      { shape: 'box', pos: [0, 1.05, 0], size: [1.75, 0.08, 0.7], variant: 'accent' },
      { shape: 'box', pos: [0, 1.8, 0], size: [1.75, 0.08, 0.7], variant: 'accent' },
      { shape: 'box', pos: [-0.3, 1.32, 0], size: [0.55, 0.45, 0.5], variant: 'wood' },
    ],
  },
];

// ============================================================================
// 8. 桌台家具库存 (8 Pre-built Table & Furniture Variants)
// ============================================================================
const TABLE_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'workbench',
    label: '工作长桌',
    heightM: 0.78,
    widthM: 1.8,
    depthM: 0.9,
    parts: [
      { shape: 'box', pos: [0, 0.74, 0], size: [1.8, 0.08, 0.9], variant: 'wood' },
      { shape: 'box', pos: [-0.82, 0.35, -0.37], size: [0.08, 0.7, 0.08], variant: 'dark' },
      { shape: 'box', pos: [0.82, 0.35, -0.37], size: [0.08, 0.7, 0.08], variant: 'dark' },
      { shape: 'box', pos: [-0.82, 0.35, 0.37], size: [0.08, 0.7, 0.08], variant: 'dark' },
      { shape: 'box', pos: [0.82, 0.35, 0.37], size: [0.08, 0.7, 0.08], variant: 'dark' },
    ],
  },
  {
    id: 'round_cafe',
    label: '圆桌对椅',
    heightM: 0.78,
    widthM: 1.8,
    depthM: 1.1,
    parts: [
      { shape: 'cylinder', pos: [0, 0.74, 0], size: [0.48, 0.48, 0.06], variant: 'default' },
      { shape: 'cylinder', pos: [0, 0.36, 0], size: [0.05, 0.05, 0.72], variant: 'dark' },
      { shape: 'cylinder', pos: [0, 0.03, 0], size: [0.3, 0.32, 0.06], variant: 'dark' },
      { shape: 'box', pos: [-0.72, 0.44, 0], size: [0.4, 0.06, 0.4], variant: 'wood' },
      { shape: 'box', pos: [0.72, 0.44, 0], size: [0.4, 0.06, 0.4], variant: 'wood' },
    ],
  },
  {
    id: 'picnic_set',
    label: '户外野餐桌',
    heightM: 0.76,
    widthM: 1.9,
    depthM: 1.5,
    parts: [
      { shape: 'box', pos: [0, 0.74, 0], size: [1.9, 0.07, 0.78], variant: 'wood' },
      { shape: 'box', pos: [0, 0.44, 0.62], size: [1.9, 0.07, 0.3], variant: 'wood' },
      { shape: 'box', pos: [0, 0.44, -0.62], size: [1.9, 0.07, 0.3], variant: 'wood' },
      { shape: 'box', pos: [-0.75, 0.36, 0], size: [0.1, 0.72, 1.32], variant: 'dark' },
      { shape: 'box', pos: [0.75, 0.36, 0], size: [0.1, 0.72, 1.32], variant: 'dark' },
    ],
  },
  {
    id: 'park_bench',
    label: '公园长椅',
    heightM: 0.85,
    widthM: 1.85,
    depthM: 0.62,
    parts: [
      { shape: 'box', pos: [0, 0.44, 0.05], size: [1.85, 0.08, 0.48], variant: 'wood' },
      { shape: 'box', pos: [0, 0.72, -0.2], rot: [-0.18, 0, 0], size: [1.85, 0.36, 0.07], variant: 'wood' },
      { shape: 'box', pos: [-0.82, 0.22, 0], size: [0.1, 0.44, 0.5], variant: 'dark' },
      { shape: 'box', pos: [0.82, 0.22, 0], size: [0.1, 0.44, 0.5], variant: 'dark' },
    ],
  },
  {
    id: 'bar_counter',
    label: '吧台柜台',
    heightM: 1.05,
    widthM: 2.4,
    depthM: 0.8,
    parts: [
      { shape: 'box', pos: [0, 0.5, 0], size: [2.3, 1.0, 0.65], variant: 'concrete' },
      { shape: 'box', pos: [0, 1.04, 0], size: [2.44, 0.08, 0.82], variant: 'wood' },
    ],
  },
  {
    id: 'conference_table',
    label: '会议长台',
    heightM: 0.78,
    widthM: 3.0,
    depthM: 1.3,
    parts: [
      { shape: 'box', pos: [0, 0.74, 0], size: [3.0, 0.08, 1.25], variant: 'default' },
      { shape: 'box', pos: [-0.95, 0.36, 0], size: [0.22, 0.72, 0.85], variant: 'dark' },
      { shape: 'box', pos: [0.95, 0.36, 0], size: [0.22, 0.72, 0.85], variant: 'dark' },
    ],
  },
  {
    id: 'market_stall',
    label: '市集摊架',
    heightM: 2.3,
    widthM: 2.2,
    depthM: 1.2,
    parts: [
      { shape: 'box', pos: [0, 0.45, 0], size: [2.1, 0.86, 1.0], variant: 'wood' },
      { shape: 'box', pos: [-1.0, 1.55, 0], size: [0.08, 1.4, 0.08], variant: 'dark' },
      { shape: 'box', pos: [1.0, 1.55, 0], size: [0.08, 1.4, 0.08], variant: 'dark' },
      { shape: 'box', pos: [0, 2.22, 0.05], rot: [0.22, 0, 0], size: [2.3, 0.08, 1.35], variant: 'accent' },
    ],
  },
  {
    id: 'bed_cot',
    label: '沙发休息榻',
    heightM: 0.8,
    widthM: 2.1,
    depthM: 0.95,
    parts: [
      { shape: 'box', pos: [0, 0.24, 0], size: [2.05, 0.34, 0.9], variant: 'accent' },
      { shape: 'box', pos: [0, 0.58, -0.36], size: [2.05, 0.56, 0.18], variant: 'accent' },
      { shape: 'box', pos: [-0.94, 0.46, 0], size: [0.16, 0.42, 0.9], variant: 'dark' },
      { shape: 'box', pos: [0.94, 0.46, 0], size: [0.16, 0.42, 0.9], variant: 'dark' },
    ],
  },
];

// ============================================================================
// 9. 墙体库存 (8 Pre-built Wall Variants)
// ============================================================================
const WALL_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'solid_wall',
    label: '标准实墙',
    heightM: 3.0,
    widthM: 4.0,
    depthM: 0.3,
    parts: [{ shape: 'box', pos: [0, 1.5, 0], size: [4.0, 3.0, 0.3], variant: 'default' }],
  },
  {
    id: 'window_wall',
    label: '开窗墙体',
    heightM: 3.0,
    widthM: 4.0,
    depthM: 0.32,
    parts: [
      { shape: 'box', pos: [0, 0.48, 0], size: [4.0, 0.96, 0.32], variant: 'default' },
      { shape: 'box', pos: [0, 2.55, 0], size: [4.0, 0.9, 0.32], variant: 'default' },
      { shape: 'box', pos: [-1.45, 1.53, 0], size: [1.1, 1.14, 0.32], variant: 'default' },
      { shape: 'box', pos: [1.45, 1.53, 0], size: [1.1, 1.14, 0.32], variant: 'default' },
      { shape: 'box', pos: [0, 0.98, 0], size: [1.88, 0.08, 0.38], variant: 'accent' },
    ],
  },
  {
    id: 'half_wall',
    label: '半高矮墙',
    heightM: 1.25,
    widthM: 4.0,
    depthM: 0.32,
    parts: [
      { shape: 'box', pos: [0, 0.58, 0], size: [4.0, 1.16, 0.3], variant: 'concrete' },
      { shape: 'box', pos: [0, 1.2, 0], size: [4.08, 0.1, 0.38], variant: 'accent' },
    ],
  },
  {
    id: 'brick_pilaster',
    label: '壁柱院墙',
    heightM: 2.6,
    widthM: 4.2,
    depthM: 0.45,
    parts: [
      { shape: 'box', pos: [0, 1.2, 0], size: [4.0, 2.4, 0.28], variant: 'default' },
      { shape: 'box', pos: [-1.9, 1.3, 0], size: [0.42, 2.6, 0.44], variant: 'accent' },
      { shape: 'box', pos: [1.9, 1.3, 0], size: [0.42, 2.6, 0.44], variant: 'accent' },
      { shape: 'box', pos: [0, 2.46, 0], size: [4.1, 0.14, 0.36], variant: 'dark' },
    ],
  },
  {
    id: 'arched_arcade',
    label: '走廊券墙',
    heightM: 3.2,
    widthM: 4.2,
    depthM: 0.36,
    parts: [
      { shape: 'box', pos: [-1.65, 1.6, 0], size: [0.85, 3.2, 0.36], variant: 'default' },
      { shape: 'box', pos: [0, 1.6, 0], size: [0.7, 3.2, 0.36], variant: 'default' },
      { shape: 'box', pos: [1.65, 1.6, 0], size: [0.85, 3.2, 0.36], variant: 'default' },
      { shape: 'box', pos: [0, 2.75, 0], size: [4.2, 0.9, 0.36], variant: 'accent' },
    ],
  },
  {
    id: 'curtain_glass',
    label: '幕墙框架',
    heightM: 3.2,
    widthM: 4.0,
    depthM: 0.25,
    parts: [
      { shape: 'box', pos: [0, 1.6, 0], size: [3.9, 3.1, 0.08], variant: 'water' },
      { shape: 'box', pos: [-1.95, 1.6, 0], size: [0.12, 3.2, 0.22], variant: 'dark' },
      { shape: 'box', pos: [0, 1.6, 0], size: [0.1, 3.2, 0.22], variant: 'dark' },
      { shape: 'box', pos: [1.95, 1.6, 0], size: [0.12, 3.2, 0.22], variant: 'dark' },
      { shape: 'box', pos: [0, 3.14, 0], size: [4.0, 0.14, 0.24], variant: 'dark' },
    ],
  },
  {
    id: 'louver_screen',
    label: '百叶格栅',
    heightM: 3.0,
    widthM: 4.0,
    depthM: 0.28,
    parts: [
      { shape: 'box', pos: [0, 2.92, 0], size: [4.0, 0.16, 0.28], variant: 'dark' },
      { shape: 'box', pos: [0, 0.08, 0], size: [4.0, 0.16, 0.28], variant: 'dark' },
      { shape: 'box', pos: [-1.6, 1.5, 0], size: [0.14, 2.8, 0.24], variant: 'wood' },
      { shape: 'box', pos: [-0.8, 1.5, 0], size: [0.14, 2.8, 0.24], variant: 'wood' },
      { shape: 'box', pos: [0, 1.5, 0], size: [0.14, 2.8, 0.24], variant: 'wood' },
      { shape: 'box', pos: [0.8, 1.5, 0], size: [0.14, 2.8, 0.24], variant: 'wood' },
      { shape: 'box', pos: [1.6, 1.5, 0], size: [0.14, 2.8, 0.24], variant: 'wood' },
    ],
  },
  {
    id: 'ruined_wall',
    label: '破损断墙',
    heightM: 2.6,
    widthM: 4.0,
    depthM: 0.34,
    parts: [
      { shape: 'box', pos: [-1.1, 1.25, 0], size: [1.75, 2.5, 0.34], variant: 'concrete' },
      { shape: 'box', pos: [0.35, 0.78, 0], size: [1.2, 1.56, 0.34], variant: 'concrete' },
      { shape: 'box', pos: [1.45, 0.42, 0], size: [1.05, 0.84, 0.34], variant: 'concrete' },
    ],
  },
];

// ============================================================================
// 10. 门洞库存 (6 Variants)
// ============================================================================
const DOORWAY_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'standard_door',
    label: '标准门框',
    heightM: 3.0,
    widthM: 4.0,
    depthM: 0.35,
    parts: [
      { shape: 'box', pos: [-1.35, 1.5, 0], size: [1.3, 3.0, 0.35], variant: 'default' },
      { shape: 'box', pos: [1.35, 1.5, 0], size: [1.3, 3.0, 0.35], variant: 'default' },
      { shape: 'box', pos: [0, 2.65, 0], size: [1.4, 0.7, 0.35], variant: 'accent' },
    ],
  },
  {
    id: 'double_gate',
    label: '双开大厅门',
    heightM: 3.4,
    widthM: 4.4,
    depthM: 0.38,
    parts: [
      { shape: 'box', pos: [-1.7, 1.7, 0], size: [1.0, 3.4, 0.38], variant: 'default' },
      { shape: 'box', pos: [1.7, 1.7, 0], size: [1.0, 3.4, 0.38], variant: 'default' },
      { shape: 'box', pos: [0, 3.05, 0], size: [2.4, 0.7, 0.38], variant: 'accent' },
      { shape: 'box', pos: [0, 2.7, 0.35], size: [2.7, 0.14, 0.55], variant: 'dark' },
    ],
  },
  {
    id: 'arch_portal',
    label: '拱形门洞',
    heightM: 3.3,
    widthM: 3.6,
    depthM: 0.42,
    parts: [
      { shape: 'box', pos: [-1.25, 1.15, 0], size: [1.1, 2.3, 0.42], variant: 'concrete' },
      { shape: 'box', pos: [1.25, 1.15, 0], size: [1.1, 2.3, 0.42], variant: 'concrete' },
      { shape: 'box', pos: [0, 2.85, 0], size: [3.6, 0.9, 0.42], variant: 'accent' },
      { shape: 'box', pos: [-0.6, 2.25, 0], rot: [0, 0, -0.4], size: [0.65, 0.3, 0.4], variant: 'concrete' },
      { shape: 'box', pos: [0.6, 2.25, 0], rot: [0, 0, 0.4], size: [0.65, 0.3, 0.4], variant: 'concrete' },
    ],
  },
  {
    id: 'garage_shutter',
    label: '车库卷帘门',
    heightM: 3.4,
    widthM: 4.4,
    depthM: 0.36,
    parts: [
      { shape: 'box', pos: [-1.85, 1.7, 0], size: [0.7, 3.4, 0.36], variant: 'concrete' },
      { shape: 'box', pos: [1.85, 1.7, 0], size: [0.7, 3.4, 0.36], variant: 'concrete' },
      { shape: 'box', pos: [0, 3.05, 0], size: [3.0, 0.7, 0.36], variant: 'concrete' },
      { shape: 'box', pos: [0, 2.38, 0.08], size: [2.95, 0.65, 0.14], variant: 'dark' },
    ],
  },
  {
    id: 'sliding_frame',
    label: '工业滑门架',
    heightM: 3.2,
    widthM: 4.6,
    depthM: 0.34,
    parts: [
      { shape: 'box', pos: [-1.85, 1.6, 0], size: [0.8, 3.2, 0.32], variant: 'concrete' },
      { shape: 'box', pos: [1.85, 1.6, 0], size: [0.8, 3.2, 0.32], variant: 'concrete' },
      { shape: 'box', pos: [0, 3.05, 0.14], size: [4.6, 0.2, 0.2], variant: 'dark' },
      { shape: 'box', pos: [-0.95, 1.45, 0.22], size: [1.45, 2.85, 0.1], variant: 'car' },
    ],
  },
  {
    id: 'torii_gate',
    label: '牌坊重门',
    heightM: 3.8,
    widthM: 4.4,
    depthM: 0.45,
    parts: [
      { shape: 'cylinder', pos: [-1.45, 1.75, 0], size: [0.16, 0.2, 3.5], variant: 'wood' },
      { shape: 'cylinder', pos: [1.45, 1.75, 0], size: [0.16, 0.2, 3.5], variant: 'wood' },
      { shape: 'box', pos: [0, 2.85, 0], size: [3.6, 0.22, 0.24], variant: 'wood' },
      { shape: 'box', pos: [0, 3.55, 0], size: [4.4, 0.32, 0.42], variant: 'dark' },
    ],
  },
];

// ============================================================================
// 11. 楼梯库存 (6 Variants)
// ============================================================================
const STAIRS_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'straight_stairs',
    label: '直跑楼梯',
    heightM: 2.0,
    widthM: 2.0,
    depthM: 3.0,
    parts: Array.from({ length: 8 }, (_, i) => {
      const h = (2 / 8) * (i + 1);
      const z = 1.5 - (3 / 8) * (i + 0.5);
      return { shape: 'box' as const, pos: [0, h / 2, z] as Vec3, size: [2, h, 3 / 8] as Vec3, variant: 'concrete' as ClayVariant };
    }),
  },
  {
    id: 'wide_plaza',
    label: '广场大台阶',
    heightM: 1.6,
    widthM: 4.4,
    depthM: 3.2,
    parts: Array.from({ length: 6 }, (_, i) => {
      const h = (1.6 / 6) * (i + 1);
      const z = 1.6 - (3.2 / 6) * (i + 0.5);
      return { shape: 'box' as const, pos: [0, h / 2, z] as Vec3, size: [4.4, h, 3.2 / 6] as Vec3, variant: 'accent' as ClayVariant };
    }),
  },
  {
    id: 'l_shaped',
    label: 'L形平台梯',
    heightM: 2.2,
    widthM: 3.2,
    depthM: 3.2,
    parts: [
      { shape: 'box', pos: [-0.8, 0.27, 1.2], size: [1.5, 0.54, 0.65], variant: 'concrete' },
      { shape: 'box', pos: [-0.8, 0.55, 0.55], size: [1.5, 1.1, 0.65], variant: 'concrete' },
      { shape: 'box', pos: [-0.8, 0.82, -0.7], size: [1.5, 1.64, 1.5], variant: 'accent' },
      { shape: 'box', pos: [0.45, 0.96, -0.7], size: [0.95, 1.92, 1.5], variant: 'concrete' },
      { shape: 'box', pos: [1.3, 1.1, -0.7], size: [0.75, 2.2, 1.5], variant: 'concrete' },
    ],
  },
  {
    id: 'steel_open',
    label: '工业钢梯',
    heightM: 2.4,
    widthM: 1.6,
    depthM: 3.2,
    parts: [
      { shape: 'box', pos: [-0.75, 1.2, 0], rot: [0.64, 0, 0], size: [0.1, 0.22, 4.0], variant: 'dark' },
      { shape: 'box', pos: [0.75, 1.2, 0], rot: [0.64, 0, 0], size: [0.1, 0.22, 4.0], variant: 'dark' },
      ...Array.from({ length: 7 }, (_, i) => ({
        shape: 'box' as const,
        pos: [0, 0.3 + i * 0.3, 1.2 - i * 0.4] as Vec3,
        size: [1.45, 0.06, 0.32] as Vec3,
        variant: 'concrete' as ClayVariant,
      })),
    ],
  },
  {
    id: 'railed_stairs',
    label: '带扶手阶梯',
    heightM: 2.0,
    widthM: 2.2,
    depthM: 3.0,
    parts: [
      ...Array.from({ length: 8 }, (_, i) => {
        const h = (2 / 8) * (i + 1);
        const z = 1.5 - (3 / 8) * (i + 0.5);
        return { shape: 'box' as const, pos: [0, h / 2, z] as Vec3, size: [2, h, 3 / 8] as Vec3, variant: 'concrete' as ClayVariant };
      }),
      { shape: 'box', pos: [-1.05, 1.45, 0], rot: [0.58, 0, 0], size: [0.08, 0.08, 3.6], variant: 'dark' },
      { shape: 'box', pos: [1.05, 1.45, 0], rot: [0.58, 0, 0], size: [0.08, 0.08, 3.6], variant: 'dark' },
    ],
  },
  {
    id: 'stage_steps',
    label: '环形踏步台',
    heightM: 1.2,
    widthM: 4.0,
    depthM: 4.0,
    parts: [
      { shape: 'cylinder', pos: [0, 0.15, 0], size: [2.0, 2.0, 0.3], variant: 'concrete' },
      { shape: 'cylinder', pos: [0, 0.45, 0], size: [1.55, 1.55, 0.3], variant: 'accent' },
      { shape: 'cylinder', pos: [0, 0.75, 0], size: [1.1, 1.1, 0.3], variant: 'concrete' },
      { shape: 'cylinder', pos: [0, 1.05, 0], size: [0.7, 0.7, 0.3], variant: 'default' },
    ],
  },
];

// ============================================================================
// 12. 斜坡库存 (6 Variants)
// ============================================================================
const RAMP_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'standard_ramp',
    label: '标准斜坡',
    heightM: 1.5,
    widthM: 2.0,
    depthM: 3.0,
    parts: [{ shape: 'ramp', pos: [0, 0, 0], size: [2.0, 1.5, 3.0], variant: 'concrete' }],
  },
  {
    id: 'wide_ramp',
    label: '宽广场坡道',
    heightM: 1.2,
    widthM: 4.2,
    depthM: 3.6,
    parts: [{ shape: 'ramp', pos: [0, 0, 0], size: [4.2, 1.2, 3.6], variant: 'accent' }],
  },
  {
    id: 'curbed_ramp',
    label: '带护边坡道',
    heightM: 1.5,
    widthM: 2.3,
    depthM: 3.2,
    parts: [
      { shape: 'ramp', pos: [0, 0, 0], size: [2.0, 1.5, 3.0], variant: 'concrete' },
      { shape: 'box', pos: [-1.08, 0.9, 0], rot: [-0.46, 0, 0], size: [0.14, 0.36, 3.3], variant: 'dark' },
      { shape: 'box', pos: [1.08, 0.9, 0], rot: [-0.46, 0, 0], size: [0.14, 0.36, 3.3], variant: 'dark' },
    ],
  },
  {
    id: 'loading_dock',
    label: '货运装卸台',
    heightM: 1.3,
    widthM: 2.8,
    depthM: 4.5,
    parts: [
      { shape: 'box', pos: [0, 0.65, 1.25], size: [2.8, 1.3, 2.0], variant: 'concrete' },
      { shape: 'ramp', pos: [0, 0, -1.0], size: [2.4, 1.3, 2.5], variant: 'accent' },
    ],
  },
  {
    id: 'stunt_jump',
    label: '飞车跳台',
    heightM: 2.1,
    widthM: 2.8,
    depthM: 3.4,
    parts: [
      { shape: 'ramp', pos: [0, 0, 0], size: [2.6, 2.1, 3.4], variant: 'wood' },
      { shape: 'box', pos: [-1.2, 1.0, 1.55], size: [0.16, 2.0, 0.16], variant: 'car' },
      { shape: 'box', pos: [1.2, 1.0, 1.55], size: [0.16, 2.0, 0.16], variant: 'car' },
    ],
  },
  {
    id: 'stepped_bridge',
    label: '双坡过桥台',
    heightM: 1.2,
    widthM: 2.4,
    depthM: 5.4,
    parts: [
      { shape: 'ramp', pos: [0, 0, -1.5], size: [2.2, 1.2, 2.0], variant: 'concrete' },
      { shape: 'box', pos: [0, 0.6, 0], size: [2.2, 1.2, 1.2], variant: 'accent' },
      { shape: 'ramp', pos: [0, 0, 1.5], rot: [0, Math.PI, 0], size: [2.2, 1.2, 2.0], variant: 'concrete' },
    ],
  },
];

// ============================================================================
// 13. 立柱库存 (6 Variants)
// ============================================================================
const PILLAR_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'square_pillar',
    label: '标准方柱',
    heightM: 3.5,
    widthM: 0.6,
    depthM: 0.6,
    parts: [{ shape: 'box', pos: [0, 1.75, 0], size: [0.6, 3.5, 0.6], variant: 'concrete' }],
  },
  {
    id: 'round_column',
    label: '古典圆柱',
    heightM: 3.8,
    widthM: 0.9,
    depthM: 0.9,
    parts: [
      { shape: 'box', pos: [0, 0.15, 0], size: [0.88, 0.3, 0.88], variant: 'accent' },
      { shape: 'cylinder', pos: [0, 1.9, 0], size: [0.28, 0.32, 3.2], variant: 'default' },
      { shape: 'box', pos: [0, 3.65, 0], size: [0.9, 0.28, 0.9], variant: 'accent' },
    ],
  },
  {
    id: 'fluted_classic',
    label: '带础柱头',
    heightM: 4.0,
    widthM: 1.0,
    depthM: 1.0,
    parts: [
      { shape: 'box', pos: [0, 0.25, 0], size: [0.95, 0.5, 0.95], variant: 'concrete' },
      { shape: 'box', pos: [0, 2.0, 0], size: [0.62, 3.0, 0.62], variant: 'default' },
      { shape: 'box', pos: [0, 3.75, 0], size: [0.98, 0.45, 0.98], variant: 'accent' },
    ],
  },
  {
    id: 'steel_h_beam',
    label: '钢构立柱',
    heightM: 4.2,
    widthM: 0.65,
    depthM: 0.65,
    parts: [
      { shape: 'box', pos: [0, 0.12, 0], size: [0.72, 0.24, 0.72], variant: 'dark' },
      { shape: 'box', pos: [-0.2, 2.1, 0], size: [0.1, 4.0, 0.56], variant: 'dark' },
      { shape: 'box', pos: [0.2, 2.1, 0], size: [0.1, 4.0, 0.56], variant: 'dark' },
      { shape: 'box', pos: [0, 2.1, 0], size: [0.3, 4.0, 0.1], variant: 'dark' },
    ],
  },
  {
    id: 'obelisk',
    label: '纪念方尖柱',
    heightM: 4.8,
    widthM: 1.0,
    depthM: 1.0,
    parts: [
      { shape: 'box', pos: [0, 0.3, 0], size: [1.0, 0.6, 1.0], variant: 'concrete' },
      { shape: 'cylinder', pos: [0, 2.35, 0], size: [0.24, 0.42, 3.5], variant: 'default' },
      { shape: 'cone', pos: [0, 4.45, 0], rot: [0, Math.PI / 4, 0], size: [0.34, 0.7, 4], variant: 'accent' },
    ],
  },
  {
    id: 'broken_pillar',
    label: '断折残柱',
    heightM: 2.3,
    widthM: 0.8,
    depthM: 0.8,
    parts: [
      { shape: 'box', pos: [0, 0.15, 0], size: [0.85, 0.3, 0.85], variant: 'concrete' },
      { shape: 'cylinder', pos: [0, 1.15, 0], size: [0.28, 0.3, 1.7], variant: 'concrete' },
      { shape: 'cylinder', pos: [0.85, 0.26, 0.35], rot: [0.2, 0.7, Math.PI / 2], size: [0.26, 0.26, 1.1], variant: 'concrete' },
    ],
  },
];

// ============================================================================
// 14. 地板地台库存 (6 Variants)
// ============================================================================
const FLOOR_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'flat_slab',
    label: '标准楼板',
    heightM: 0.2,
    widthM: 6.0,
    depthM: 6.0,
    parts: [{ shape: 'box', pos: [0, 0.1, 0], size: [6.0, 0.2, 6.0], variant: 'concrete' }],
  },
  {
    id: 'plaza_paver',
    label: '广场拼砖台',
    heightM: 0.32,
    widthM: 6.0,
    depthM: 6.0,
    parts: [
      { shape: 'box', pos: [0, 0.12, 0], size: [6.0, 0.24, 6.0], variant: 'concrete' },
      { shape: 'box', pos: [-1.45, 0.28, -1.45], size: [2.8, 0.08, 2.8], variant: 'default' },
      { shape: 'box', pos: [1.45, 0.28, -1.45], size: [2.8, 0.08, 2.8], variant: 'accent' },
      { shape: 'box', pos: [-1.45, 0.28, 1.45], size: [2.8, 0.08, 2.8], variant: 'accent' },
      { shape: 'box', pos: [1.45, 0.28, 1.45], size: [2.8, 0.08, 2.8], variant: 'default' },
    ],
  },
  {
    id: 'raised_podium',
    label: '双层高台',
    heightM: 0.85,
    widthM: 6.4,
    depthM: 6.4,
    parts: [
      { shape: 'box', pos: [0, 0.22, 0], size: [6.4, 0.44, 6.4], variant: 'concrete' },
      { shape: 'box', pos: [0, 0.64, 0], size: [5.0, 0.4, 5.0], variant: 'default' },
    ],
  },
  {
    id: 'wood_deck',
    label: '滨水木栈道',
    heightM: 0.35,
    widthM: 6.0,
    depthM: 4.5,
    parts: [
      { shape: 'box', pos: [0, 0.12, -1.8], size: [5.8, 0.18, 0.24], variant: 'dark' },
      { shape: 'box', pos: [0, 0.12, 1.8], size: [5.8, 0.18, 0.24], variant: 'dark' },
      { shape: 'box', pos: [0, 0.26, 0], size: [6.0, 0.14, 4.4], variant: 'wood' },
    ],
  },
  {
    id: 'helipad_pad',
    label: '圆形停机坪',
    heightM: 0.3,
    widthM: 6.4,
    depthM: 6.4,
    parts: [
      { shape: 'cylinder', pos: [0, 0.15, 0], size: [3.2, 3.3, 0.3], variant: 'concrete' },
      { shape: 'box', pos: [-0.75, 0.32, 0], size: [0.35, 0.04, 2.4], variant: 'emissiveLamp' },
      { shape: 'box', pos: [0.75, 0.32, 0], size: [0.35, 0.04, 2.4], variant: 'emissiveLamp' },
      { shape: 'box', pos: [0, 0.32, 0], size: [1.5, 0.04, 0.35], variant: 'emissiveLamp' },
    ],
  },
  {
    id: 'island_curb',
    label: '街心安全岛',
    heightM: 0.3,
    widthM: 5.5,
    depthM: 3.0,
    parts: [
      { shape: 'box', pos: [0, 0.12, 0], size: [5.5, 0.24, 3.0], variant: 'concrete' },
      { shape: 'box', pos: [0, 0.26, 0], size: [4.8, 0.08, 2.3], variant: 'foliage' },
    ],
  },
];

// ============================================================================
// 15. 顶棚屋顶库存 (6 Variants)
// ============================================================================
const ROOF_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'flat_canopy',
    label: '平顶雨棚',
    heightM: 0.25,
    widthM: 6.0,
    depthM: 6.0,
    parts: [{ shape: 'box', pos: [0, 0.125, 0], size: [6.0, 0.25, 6.0], variant: 'accent' }],
  },
  {
    id: 'gable_roof',
    label: '双坡人字顶',
    heightM: 1.8,
    widthM: 6.2,
    depthM: 6.2,
    parts: [
      { shape: 'box', pos: [0, 0.9, -1.45], rot: [0.46, 0, 0], size: [6.2, 0.2, 3.3], variant: 'accent' },
      { shape: 'box', pos: [0, 0.9, 1.45], rot: [-0.46, 0, 0], size: [6.2, 0.2, 3.3], variant: 'accent' },
    ],
  },
  {
    id: 'single_slope',
    label: '单坡挑檐',
    heightM: 1.4,
    widthM: 6.0,
    depthM: 6.0,
    parts: [{ shape: 'box', pos: [0, 0.72, 0], rot: [0.22, 0, 0], size: [6.0, 0.22, 6.1], variant: 'dark' }],
  },
  {
    id: 'sawtooth_bay',
    label: '锯齿厂房顶',
    heightM: 1.6,
    widthM: 6.0,
    depthM: 6.0,
    parts: [
      { shape: 'box', pos: [0, 0.75, -1.5], rot: [0.4, 0, 0], size: [6.0, 0.18, 3.1], variant: 'concrete' },
      { shape: 'box', pos: [0, 0.75, 1.5], rot: [0.4, 0, 0], size: [6.0, 0.18, 3.1], variant: 'concrete' },
      { shape: 'box', pos: [0, 0.75, 0], size: [6.0, 1.15, 0.14], variant: 'water' },
    ],
  },
  {
    id: 'pergola',
    label: '遮阳廊架',
    heightM: 0.45,
    widthM: 6.0,
    depthM: 5.0,
    parts: [
      { shape: 'box', pos: [-2.8, 0.18, 0], size: [0.22, 0.28, 5.0], variant: 'wood' },
      { shape: 'box', pos: [2.8, 0.18, 0], size: [0.22, 0.28, 5.0], variant: 'wood' },
      { shape: 'box', pos: [0, 0.34, -1.6], size: [6.0, 0.16, 0.22], variant: 'wood' },
      { shape: 'box', pos: [0, 0.34, -0.55], size: [6.0, 0.16, 0.22], variant: 'wood' },
      { shape: 'box', pos: [0, 0.34, 0.55], size: [6.0, 0.16, 0.22], variant: 'wood' },
      { shape: 'box', pos: [0, 0.34, 1.6], size: [6.0, 0.16, 0.22], variant: 'wood' },
    ],
  },
  {
    id: 'pagoda_tier',
    label: '四坡攒尖顶',
    heightM: 2.2,
    widthM: 6.2,
    depthM: 6.2,
    parts: [
      { shape: 'cone', pos: [0, 1.1, 0], rot: [0, Math.PI / 4, 0], size: [4.2, 2.2, 4], variant: 'dark' },
    ],
  },
];

// ============================================================================
// 16. 几何体块库存 (6 Variants)
// ============================================================================
const BOX_VARIANTS: AssetVariantSpec[] = [
  {
    id: 'unit_cube',
    label: '标准立方体',
    heightM: 1.0,
    widthM: 1.0,
    depthM: 1.0,
    parts: [{ shape: 'box', pos: [0, 0.5, 0], size: [1.0, 1.0, 1.0], variant: 'default' }],
  },
  {
    id: 'stepped_mass',
    label: '退台体量',
    heightM: 2.2,
    widthM: 2.2,
    depthM: 2.2,
    parts: [
      { shape: 'box', pos: [0, 0.5, 0], size: [2.2, 1.0, 2.2], variant: 'default' },
      { shape: 'box', pos: [-0.2, 1.6, -0.2], size: [1.4, 1.2, 1.4], variant: 'accent' },
    ],
  },
  {
    id: 'l_block',
    label: 'L形转角块',
    heightM: 1.5,
    widthM: 2.2,
    depthM: 2.2,
    parts: [
      { shape: 'box', pos: [-0.55, 0.75, 0], size: [1.1, 1.5, 2.2], variant: 'default' },
      { shape: 'box', pos: [0.55, 0.75, -0.55], size: [1.1, 1.5, 1.1], variant: 'default' },
    ],
  },
  {
    id: 'cylinder_drum',
    label: '圆柱体块',
    heightM: 1.8,
    widthM: 1.4,
    depthM: 1.4,
    parts: [{ shape: 'cylinder', pos: [0, 0.9, 0], size: [0.7, 0.7, 1.8], variant: 'default' }],
  },
  {
    id: 'arch_block',
    label: '穿孔拱块',
    heightM: 2.0,
    widthM: 2.4,
    depthM: 1.2,
    parts: [
      { shape: 'box', pos: [-0.85, 1.0, 0], size: [0.7, 2.0, 1.2], variant: 'default' },
      { shape: 'box', pos: [0.85, 1.0, 0], size: [0.7, 2.0, 1.2], variant: 'default' },
      { shape: 'box', pos: [0, 1.72, 0], size: [2.4, 0.56, 1.2], variant: 'accent' },
    ],
  },
  {
    id: 'bridge_block',
    label: '连廊体块',
    heightM: 1.8,
    widthM: 3.4,
    depthM: 1.3,
    parts: [
      { shape: 'box', pos: [-1.2, 0.9, 0], size: [0.9, 1.8, 1.2], variant: 'concrete' },
      { shape: 'box', pos: [1.2, 0.9, 0], size: [0.9, 1.8, 1.2], variant: 'concrete' },
      { shape: 'box', pos: [0, 1.45, 0], size: [3.4, 0.7, 1.26], variant: 'default' },
    ],
  },
];

// ============================================================================
// Legacy Variant Detail Enrichment (ensures 0 simple stacked-box models)
// ============================================================================
function enrichLegacyVariantSpec(type: PropType, spec: AssetVariantSpec): AssetVariantSpec {
  if (type === 'creature' || spec.parts.length >= 10) return spec;
  const w = Math.max(0.4, spec.widthM);
  const h = Math.max(0.2, spec.heightM);
  const d = Math.max(0.4, spec.depthM ?? w * 0.8);
  const extra: InventoryPart[] = [];

  switch (type) {
    case 'road':
      extra.push(
        { shape: 'box', pos: [-w * 0.45, h + 0.05, 0], size: [0.18, 0.12, d * 0.98], variant: 'concrete' },
        { shape: 'box', pos: [w * 0.45, h + 0.05, 0], size: [0.18, 0.12, d * 0.98], variant: 'concrete' },
        { shape: 'box', pos: [0, h + 0.02, -d * 0.3], size: [0.12, 0.03, d * 0.2], variant: 'default' },
        { shape: 'box', pos: [0, h + 0.02, 0], size: [0.12, 0.03, d * 0.2], variant: 'default' },
        { shape: 'box', pos: [0, h + 0.02, d * 0.3], size: [0.12, 0.03, d * 0.2], variant: 'default' },
        { shape: 'cylinder', pos: [-w * 0.45, h + 0.36, -d * 0.35], size: [0.05, 0.06, 0.55], variant: 'dark' },
        { shape: 'cylinder', pos: [w * 0.45, h + 0.36, d * 0.35], size: [0.05, 0.06, 0.55], variant: 'dark' }
      );
      break;
    case 'vehicle': {
      const wr = Math.max(0.24, Math.min(0.44, h * 0.22));
      const wx = w * 0.44;
      const wz = d * 0.32;
      [
        [-wx, wr, -wz],
        [wx, wr, -wz],
        [-wx, wr, wz],
        [wx, wr, wz],
      ].forEach(([px, py, pz]) => {
        extra.push(
          { shape: 'cylinder', pos: [px, py, pz], rot: [0, 0, Math.PI / 2], size: [wr, wr, 0.22], variant: 'dark' },
          { shape: 'cylinder', pos: [px > 0 ? px + 0.02 : px - 0.02, py, pz], rot: [0, 0, Math.PI / 2], size: [wr * 0.56, wr * 0.56, 0.24], variant: 'accent' }
        );
      });
      extra.push(
        { shape: 'box', pos: [-w * 0.32, h * 0.42, -d * 0.49], size: [w * 0.2, 0.12, 0.06], variant: 'emissiveLamp' },
        { shape: 'box', pos: [w * 0.32, h * 0.42, -d * 0.49], size: [w * 0.2, 0.12, 0.06], variant: 'emissiveLamp' },
        { shape: 'box', pos: [0, h * 0.36, -d * 0.49], size: [w * 0.34, 0.16, 0.06], variant: 'dark' },
        { shape: 'box', pos: [-w * 0.48, h * 0.62, -d * 0.15], size: [0.12, 0.1, 0.16], variant: 'dark' },
        { shape: 'box', pos: [w * 0.48, h * 0.62, -d * 0.15], size: [0.12, 0.1, 0.16], variant: 'dark' }
      );
      break;
    }
    case 'building':
      extra.push(
        { shape: 'box', pos: [0, 0.2, 0], size: [w * 1.04, 0.4, d * 1.04], variant: 'concrete' },
        { shape: 'box', pos: [0, 1.2, d * 0.51], size: [w * 0.26, 2.2, 0.1], variant: 'water' },
        { shape: 'box', pos: [0, 2.35, d * 0.56], size: [w * 0.34, 0.18, 0.9], variant: 'dark' },
        { shape: 'box', pos: [0, h * 0.45, d * 0.505], size: [w * 0.84, h * 0.12, 0.06], variant: 'water' },
        { shape: 'box', pos: [0, h * 0.72, d * 0.505], size: [w * 0.84, h * 0.12, 0.06], variant: 'water' },
        { shape: 'box', pos: [-w * 0.46, h * 0.5, d * 0.51], size: [0.22, h * 0.92, 0.12], variant: 'accent' },
        { shape: 'box', pos: [w * 0.46, h * 0.5, d * 0.51], size: [0.22, h * 0.92, 0.12], variant: 'accent' },
        { shape: 'box', pos: [0, h + 0.15, 0], size: [w * 1.03, 0.3, d * 1.03], variant: 'accent' },
        { shape: 'cylinder', pos: [w * 0.24, h + 0.55, -d * 0.18], size: [0.32, 0.32, 0.6], variant: 'dark' }
      );
      break;
    case 'tree':
      extra.push(
        { shape: 'cone', pos: [0, 0.26, 0], size: [w * 0.16, 0.52, 7], variant: 'trunk' },
        { shape: 'cylinder', pos: [-w * 0.14, h * 0.46, 0.08], rot: [0.16, 0, 0.45], size: [0.05, 0.08, h * 0.26], variant: 'trunk' },
        { shape: 'cylinder', pos: [w * 0.14, h * 0.48, -0.08], rot: [-0.16, 0, -0.45], size: [0.05, 0.08, h * 0.26], variant: 'trunk' },
        { shape: 'sphere', pos: [-w * 0.24, h * 0.68, 0.12], size: [w * 0.22, h * 0.16, w * 0.22], variant: 'foliage' },
        { shape: 'sphere', pos: [w * 0.24, h * 0.7, -0.12], size: [w * 0.22, h * 0.16, w * 0.22], variant: 'foliage' },
        { shape: 'sphere', pos: [0, h * 0.88, 0], size: [w * 0.24, h * 0.16, w * 0.24], variant: 'foliage' },
        { shape: 'dodecahedron', pos: [w * 0.18, 0.14, w * 0.16], size: [0.18, 0.14, 0.18], variant: 'rock' }
      );
      break;
    case 'rock':
      extra.push(
        { shape: 'dodecahedron', pos: [-w * 0.28, h * 0.24, d * 0.18], rot: [0.3, 0.5, 0.2], size: [w * 0.24, h * 0.22, d * 0.24], variant: 'rock' },
        { shape: 'dodecahedron', pos: [w * 0.28, h * 0.22, -d * 0.18], rot: [0.5, 0.2, 0.4], size: [w * 0.22, h * 0.2, d * 0.22], variant: 'concrete' },
        { shape: 'dodecahedron', pos: [0, h * 0.78, 0], rot: [0.2, 0.8, 0.3], size: [w * 0.2, h * 0.22, d * 0.2], variant: 'rock' },
        { shape: 'sphere', pos: [-w * 0.18, h * 0.52, -d * 0.2], size: [w * 0.18, h * 0.12, d * 0.18], variant: 'foliage' },
        { shape: 'dodecahedron', pos: [w * 0.34, 0.12, d * 0.24], size: [0.16, 0.12, 0.16], variant: 'rock' },
        { shape: 'dodecahedron', pos: [-w * 0.34, 0.1, -d * 0.24], size: [0.14, 0.1, 0.14], variant: 'rock' }
      );
      break;
    case 'lamp':
      extra.push(
        { shape: 'cylinder', pos: [0, 0.12, 0], size: [0.26, 0.32, 0.24], variant: 'rock' },
        { shape: 'cylinder', pos: [0, 0.32, 0], size: [0.16, 0.22, 0.2], variant: 'accent' },
        { shape: 'torus', pos: [0, h * 0.55, 0], rot: [Math.PI / 2, 0, 0], size: [0.12, 0.03, 12], variant: 'accent' },
        { shape: 'torus', pos: [0, h * 0.78, 0], rot: [Math.PI / 2, 0, 0], size: [0.11, 0.03, 12], variant: 'accent' },
        { shape: 'box', pos: [0.22, h * 0.68, 0], size: [0.36, 0.22, 0.04], variant: 'accent' },
        { shape: 'box', pos: [-0.22, h * 0.68, 0], size: [0.36, 0.22, 0.04], variant: 'accent' }
      );
      break;
    case 'barrier':
    case 'wall':
      extra.push(
        { shape: 'box', pos: [0, 0.12, 0], size: [w * 1.02, 0.24, Math.max(0.28, d * 1.12)], variant: 'rock' },
        { shape: 'box', pos: [-w * 0.46, h * 0.52, 0], size: [0.24, h * 1.04, Math.max(0.28, d * 1.18)], variant: 'accent' },
        { shape: 'box', pos: [w * 0.46, h * 0.52, 0], size: [0.24, h * 1.04, Math.max(0.28, d * 1.18)], variant: 'accent' },
        { shape: 'box', pos: [0, h + 0.06, 0], size: [w * 1.04, 0.12, Math.max(0.3, d * 1.2)], variant: 'dark' },
        { shape: 'sphere', pos: [-w * 0.46, h + 0.18, 0], size: [0.12, 0.14, 0.12], variant: 'default' },
        { shape: 'sphere', pos: [w * 0.46, h + 0.18, 0], size: [0.12, 0.14, 0.12], variant: 'default' },
        { shape: 'cylinder', pos: [-w * 0.18, h * 0.5, 0], size: [0.05, 0.05, h * 0.76], variant: 'dark' },
        { shape: 'cylinder', pos: [w * 0.18, h * 0.5, 0], size: [0.05, 0.05, h * 0.76], variant: 'dark' }
      );
      break;
    case 'stairs':
    case 'ramp':
      extra.push(
        { shape: 'box', pos: [-w * 0.46, h * 0.52, 0], rot: [-0.46, 0, 0], size: [0.12, 0.22, d * 1.06], variant: 'dark' },
        { shape: 'box', pos: [w * 0.46, h * 0.52, 0], rot: [-0.46, 0, 0], size: [0.12, 0.22, d * 1.06], variant: 'dark' },
        { shape: 'cylinder', pos: [-w * 0.46, 0.48, d * 0.44], size: [0.04, 0.05, 0.92], variant: 'accent' },
        { shape: 'cylinder', pos: [w * 0.46, 0.48, d * 0.44], size: [0.04, 0.05, 0.92], variant: 'accent' },
        { shape: 'cylinder', pos: [-w * 0.46, h + 0.42, -d * 0.44], size: [0.04, 0.05, 0.92], variant: 'accent' },
        { shape: 'cylinder', pos: [w * 0.46, h + 0.42, -d * 0.44], size: [0.04, 0.05, 0.92], variant: 'accent' },
        { shape: 'box', pos: [-w * 0.46, h * 0.5 + 0.78, 0], rot: [-0.46, 0, 0], size: [0.06, 0.06, d * 1.06], variant: 'wood' },
        { shape: 'box', pos: [w * 0.46, h * 0.5 + 0.78, 0], rot: [-0.46, 0, 0], size: [0.06, 0.06, d * 1.06], variant: 'wood' }
      );
      break;
    default:
      extra.push(
        { shape: 'box', pos: [0, 0.08, 0], size: [w * 1.04, 0.14, d * 1.04], variant: 'rock' },
        { shape: 'box', pos: [-w * 0.46, h * 0.5, d * 0.46], size: [0.1, h * 0.92, 0.1], variant: 'accent' },
        { shape: 'box', pos: [w * 0.46, h * 0.5, d * 0.46], size: [0.1, h * 0.92, 0.1], variant: 'accent' },
        { shape: 'box', pos: [-w * 0.46, h * 0.5, -d * 0.46], size: [0.1, h * 0.92, 0.1], variant: 'accent' },
        { shape: 'box', pos: [w * 0.46, h * 0.5, -d * 0.46], size: [0.1, h * 0.92, 0.1], variant: 'accent' },
        { shape: 'box', pos: [0, h - 0.06, 0], size: [w * 1.04, 0.12, d * 1.04], variant: 'dark' },
        { shape: 'cylinder', pos: [-w * 0.28, h + 0.06, 0], size: [0.08, 0.1, 0.12], variant: 'accent' },
        { shape: 'cylinder', pos: [w * 0.28, h + 0.06, 0], size: [0.08, 0.1, 0.12], variant: 'accent' }
      );
      break;
  }

  return {
    ...spec,
    parts: [...spec.parts, ...extra],
  };
}

function mergeCategoryVariants(type: PropType, legacy: AssetVariantSpec[], mega: AssetVariantSpec[]): AssetVariantSpec[] {
  const richEra = RICH_ERAS_INVENTORY_BY_TYPE[type] ?? [];
  return [
    ...[...legacy, ...mega].map((item) => enrichLegacyVariantSpec(type, item)),
    ...richEra,
  ];
}

// ============================================================================
// Map all PropTypes -> Inventory
// ============================================================================
export const ASSET_INVENTORY_BY_TYPE: Record<PropType, AssetVariantSpec[]> = {
  road: mergeCategoryVariants('road', [...EXTRA_ROAD_VARIANTS], MEGA_INVENTORY_BY_TYPE.road),
  tree: mergeCategoryVariants('tree', [...TREE_VARIANTS, ...EXTRA_TREE_VARIANTS], MEGA_INVENTORY_BY_TYPE.tree),
  vehicle: mergeCategoryVariants('vehicle', [...VEHICLE_VARIANTS, ...EXTRA_VEHICLE_VARIANTS], MEGA_INVENTORY_BY_TYPE.vehicle),
  building: mergeCategoryVariants('building', [...BUILDING_PROP_VARIANTS, ...EXTRA_BUILDING_PROP_VARIANTS], MEGA_INVENTORY_BY_TYPE.building),
  lamp: mergeCategoryVariants('lamp', [...LAMP_VARIANTS, ...EXTRA_LAMP_VARIANTS], MEGA_INVENTORY_BY_TYPE.lamp),
  rock: mergeCategoryVariants('rock', [...ROCK_VARIANTS, ...EXTRA_ROCK_VARIANTS], MEGA_INVENTORY_BY_TYPE.rock),
  creature: mergeCategoryVariants('creature', CREATURE_VARIANTS, MEGA_INVENTORY_BY_TYPE.creature),
  barrier: mergeCategoryVariants('barrier', [...BARRIER_VARIANTS, ...EXTRA_BARRIER_VARIANTS], MEGA_INVENTORY_BY_TYPE.barrier),
  crate: mergeCategoryVariants('crate', [...CRATE_VARIANTS, ...EXTRA_CRATE_VARIANTS], MEGA_INVENTORY_BY_TYPE.crate),
  table: mergeCategoryVariants('table', [...TABLE_VARIANTS, ...EXTRA_TABLE_VARIANTS], MEGA_INVENTORY_BY_TYPE.table),
  furniture: mergeCategoryVariants('furniture', [...EXTRA_FURNITURE_VARIANTS], MEGA_INVENTORY_BY_TYPE.furniture),
  facility: mergeCategoryVariants('facility', [...EXTRA_FACILITY_VARIANTS], MEGA_INVENTORY_BY_TYPE.facility),
  scene_prop: mergeCategoryVariants('scene_prop', [...EXTRA_SCENE_PROP_VARIANTS], MEGA_INVENTORY_BY_TYPE.scene_prop),
  wall: mergeCategoryVariants('wall', [...WALL_VARIANTS, ...EXTRA_WALL_VARIANTS], MEGA_INVENTORY_BY_TYPE.wall),
  doorway: mergeCategoryVariants('doorway', [...DOORWAY_VARIANTS, ...EXTRA_DOORWAY_VARIANTS], MEGA_INVENTORY_BY_TYPE.doorway),
  stairs: mergeCategoryVariants('stairs', [...STAIRS_VARIANTS, ...EXTRA_STAIRS_VARIANTS], MEGA_INVENTORY_BY_TYPE.stairs),
  ramp: mergeCategoryVariants('ramp', [...RAMP_VARIANTS, ...EXTRA_RAMP_VARIANTS], MEGA_INVENTORY_BY_TYPE.ramp),
  pillar: mergeCategoryVariants('pillar', [...PILLAR_VARIANTS, ...EXTRA_PILLAR_VARIANTS], MEGA_INVENTORY_BY_TYPE.pillar),
  floor: mergeCategoryVariants('floor', [...FLOOR_VARIANTS, ...EXTRA_FLOOR_VARIANTS], MEGA_INVENTORY_BY_TYPE.floor),
  roof: mergeCategoryVariants('roof', [...ROOF_VARIANTS, ...EXTRA_ROOF_VARIANTS], MEGA_INVENTORY_BY_TYPE.roof),
  box: mergeCategoryVariants('box', [...BOX_VARIANTS, ...EXTRA_BOX_VARIANTS], MEGA_INVENTORY_BY_TYPE.box),
};

const TOTAL_ASSET_VARIANT_COUNT_CACHE = Object.values(ASSET_INVENTORY_BY_TYPE).reduce(
  (sum, list) => sum + list.length,
  0
);

const VARIANT_LOOKUP_BY_TYPE: Record<PropType, Map<string, AssetVariantSpec>> = (
  Object.keys(ASSET_INVENTORY_BY_TYPE) as PropType[]
).reduce((acc, pt) => {
  const m = new Map<string, AssetVariantSpec>();
  for (const item of ASSET_INVENTORY_BY_TYPE[pt]) {
    m.set(item.id, item);
  }
  acc[pt] = m;
  return acc;
}, {} as Record<PropType, Map<string, AssetVariantSpec>>);

export interface AssetItemVariantEntry extends AssetVariantSpec {
  spec: AssetVariantSpec;
  shortTag: string;
}

export interface AssetItemGroup {
  groupId: string;
  name: string;
  propType: PropType;
  defaultVariantId: string;
  variants: AssetItemVariantEntry[];
}

function buildItemGroupsForCategory(
  type: PropType,
  list: AssetVariantSpec[]
): AssetItemGroup[] {
  const groupMap = new Map<string, AssetItemGroup>();
  const legacyItems: AssetVariantSpec[] = [];

  for (const spec of list) {
    const sepIdx = spec.label.indexOf(' · ');
    if (sepIdx > 0) {
      const baseName = spec.label.slice(0, sepIdx).trim();
      const shortTag = spec.label.slice(sepIdx + 3).trim() || '标准款';
      let grp = groupMap.get(baseName);
      if (!grp) {
        grp = {
          groupId: `${type}_grp_${groupMap.size + 1}`,
          name: baseName,
          propType: type,
          defaultVariantId: spec.id,
          variants: [],
        };
        groupMap.set(baseName, grp);
      }
      grp.variants.push({ ...spec, spec, shortTag });
    } else {
      legacyItems.push(spec);
    }
  }

  const groups = Array.from(groupMap.values());
  if (groups.length === 0) {
    return [
      {
        groupId: `${type}_grp_1`,
        name: PROP_TYPE_CATEGORY_TITLES[type]?.title ?? type,
        propType: type,
        defaultVariantId: list[0]?.id ?? '',
        variants: list.map((spec) => ({ ...spec, spec, shortTag: spec.label })),
      },
    ];
  }

  // Attach standalone legacy variants into their closest matching Base Item Group
  legacyItems.forEach((leg, idx) => {
    let bestGroup = groups[idx % groups.length];
    let bestScore = 0;
    for (const grp of groups) {
      let score = 0;
      for (const ch of leg.label) {
        if (ch.trim() && grp.name.includes(ch)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestGroup = grp;
      }
    }
    bestGroup.variants.push({
      ...leg,
      spec: leg,
      shortTag: `经典 · ${leg.label}`,
    });
  });

  // Put the standard ("标准...") variant first in each group so the default cover is clean
  for (const grp of groups) {
    const stdIdx = grp.variants.findIndex((v) => v.shortTag.startsWith('标准'));
    if (stdIdx > 0) {
      const [stdItem] = grp.variants.splice(stdIdx, 1);
      grp.variants.unshift(stdItem);
    }
    grp.defaultVariantId = grp.variants[0]?.id ?? grp.defaultVariantId;
  }

  return groups;
}

export const ASSET_ITEM_GROUPS_BY_TYPE: Record<PropType, AssetItemGroup[]> = (
  Object.keys(ASSET_INVENTORY_BY_TYPE) as PropType[]
).reduce((acc, pt) => {
  acc[pt] = buildItemGroupsForCategory(pt, ASSET_INVENTORY_BY_TYPE[pt]);
  return acc;
}, {} as Record<PropType, AssetItemGroup[]>);

const VARIANT_TO_GROUP_BY_TYPE: Record<PropType, Map<string, AssetItemGroup>> = (
  Object.keys(ASSET_ITEM_GROUPS_BY_TYPE) as PropType[]
).reduce((acc, pt) => {
  const m = new Map<string, AssetItemGroup>();
  for (const grp of ASSET_ITEM_GROUPS_BY_TYPE[pt]) {
    for (const v of grp.variants) {
      m.set(v.spec.id, grp);
    }
  }
  acc[pt] = m;
  return acc;
}, {} as Record<PropType, Map<string, AssetItemGroup>>);

const TOTAL_BASE_ITEM_COUNT_CACHE = Object.values(ASSET_ITEM_GROUPS_BY_TYPE).reduce(
  (sum, groups) => sum + groups.length,
  0
);

export function getTotalAssetVariantCount(): number {
  return TOTAL_ASSET_VARIANT_COUNT_CACHE;
}

export function getTotalBaseItemCount(): number {
  return TOTAL_BASE_ITEM_COUNT_CACHE;
}

export function getItemGroupsForPropType(type: PropType): AssetItemGroup[] {
  return ASSET_ITEM_GROUPS_BY_TYPE[type] ?? ASSET_ITEM_GROUPS_BY_TYPE.box;
}

export function getItemGroupForVariant(
  type: PropType,
  variantId?: string
): AssetItemGroup {
  const groups = getItemGroupsForPropType(type);
  if (variantId) {
    const found = VARIANT_TO_GROUP_BY_TYPE[type]?.get(variantId);
    if (found) return found;
  }
  return groups[0];
}

// ============================================================================
// City District BuildingSpec Inventory (6 Style Variants · Enriched Multi-Part)
// ============================================================================
export const BUILDING_INVENTORY: BuildingInventorySpec[] = [
  {
    id: 'modern',
    label: '现代方楼',
    heightHint: '标准女儿墙 + 窗框立柱 + 门厅雨棚 + 顶层机房',
    parts: [
      { shape: 'box', pos: [0, 0.2, 0], size: [2.6, 0.4, 2.2], variant: 'concrete' },
      { shape: 'box', pos: [0, 1.85, 0], size: [2.4, 3.5, 2.0], variant: 'default' },
      { shape: 'box', pos: [0, 0.65, 1.02], size: [0.76, 1.1, 0.08], variant: 'water' },
      { shape: 'box', pos: [0, 1.25, 1.18], size: [1.1, 0.14, 0.42], variant: 'dark' },
      { shape: 'box', pos: [0, 1.75, 1.01], size: [2.1, 0.36, 0.06], variant: 'water' },
      { shape: 'box', pos: [0, 2.45, 1.01], size: [2.1, 0.36, 0.06], variant: 'water' },
      { shape: 'box', pos: [0, 3.15, 1.01], size: [2.1, 0.36, 0.06], variant: 'water' },
      { shape: 'box', pos: [-1.05, 1.85, 1.02], size: [0.18, 3.5, 0.1], variant: 'accent' },
      { shape: 'box', pos: [1.05, 1.85, 1.02], size: [0.18, 3.5, 0.1], variant: 'accent' },
      { shape: 'box', pos: [0, 3.7, 0], size: [2.54, 0.24, 2.14], variant: 'accent' },
      { shape: 'box', pos: [-0.45, 4.02, -0.3], size: [0.75, 0.48, 0.65], variant: 'dark' },
      { shape: 'cylinder', pos: [0.55, 3.98, 0.25], size: [0.22, 0.22, 0.38], variant: 'concrete' },
    ],
  },
  {
    id: 'industrial',
    label: '工业厂房',
    heightHint: '重柱锯齿天窗 + 高耸烟囱 + 货运卷帘门',
    parts: [
      { shape: 'box', pos: [0, 0.18, 0], size: [2.95, 0.36, 2.35], variant: 'rock' },
      { shape: 'box', pos: [0, 1.45, 0], size: [2.8, 2.7, 2.2], variant: 'concrete' },
      { shape: 'box', pos: [0, 0.85, 1.12], size: [0.95, 1.5, 0.08], variant: 'dark' },
      { shape: 'box', pos: [-1.32, 1.45, 0.8], size: [0.22, 2.7, 0.24], variant: 'dark' },
      { shape: 'box', pos: [-1.32, 1.45, -0.8], size: [0.22, 2.7, 0.24], variant: 'dark' },
      { shape: 'box', pos: [1.32, 1.45, 0.8], size: [0.22, 2.7, 0.24], variant: 'dark' },
      { shape: 'box', pos: [0, 2.95, -0.55], rot: [0.35, 0, 0], size: [2.82, 0.18, 1.05], variant: 'dark' },
      { shape: 'box', pos: [0, 2.95, 0.45], rot: [0.35, 0, 0], size: [2.82, 0.18, 1.05], variant: 'dark' },
      { shape: 'cylinder', pos: [0.95, 3.45, -0.6], size: [0.16, 0.24, 1.65], variant: 'trunk' },
      { shape: 'torus', pos: [0.95, 4.22, -0.6], rot: [Math.PI / 2, 0, 0], size: [0.18, 0.04, 12], variant: 'dark' },
    ],
  },
  {
    id: 'residential',
    label: '住宅公寓',
    heightHint: '坡屋顶山墙 + 双排外挑玻璃阳台 + 单元门廊',
    parts: [
      { shape: 'box', pos: [0, 0.18, 0], size: [2.62, 0.36, 2.04], variant: 'concrete' },
      { shape: 'box', pos: [0, 1.6, 0], size: [2.5, 3.0, 1.9], variant: 'default' },
      { shape: 'box', pos: [0, 0.65, 1.02], size: [0.68, 1.1, 0.18], variant: 'trunk' },
      { shape: 'box', pos: [-0.62, 1.25, 1.08], size: [0.78, 0.14, 0.34], variant: 'accent' },
      { shape: 'box', pos: [0.62, 1.25, 1.08], size: [0.78, 0.14, 0.34], variant: 'accent' },
      { shape: 'box', pos: [-0.62, 1.48, 1.22], size: [0.78, 0.34, 0.05], variant: 'water' },
      { shape: 'box', pos: [0.62, 1.48, 1.22], size: [0.78, 0.34, 0.05], variant: 'water' },
      { shape: 'box', pos: [-0.62, 2.3, 1.08], size: [0.78, 0.14, 0.34], variant: 'accent' },
      { shape: 'box', pos: [0.62, 2.3, 1.08], size: [0.78, 0.14, 0.34], variant: 'accent' },
      { shape: 'cone', pos: [0, 3.65, 0], rot: [0, Math.PI / 4, 0], size: [2.05, 1.12, 4], variant: 'accent' },
      { shape: 'box', pos: [0.55, 3.85, -0.35], size: [0.28, 0.65, 0.28], variant: 'trunk' },
    ],
  },
  {
    id: 'tower_setback',
    label: '退台塔楼',
    heightHint: '三阶退台冠冕 + 竖向幕墙肋 + 避雷天线桅杆',
    parts: [
      { shape: 'box', pos: [0, 0.22, 0], size: [2.6, 0.44, 2.4], variant: 'concrete' },
      { shape: 'box', pos: [0, 1.4, 0], size: [2.4, 2.4, 2.2], variant: 'default' },
      { shape: 'box', pos: [0, 1.4, 1.11], size: [1.95, 1.9, 0.06], variant: 'water' },
      { shape: 'box', pos: [-0.72, 1.4, 1.13], size: [0.16, 2.4, 0.1], variant: 'accent' },
      { shape: 'box', pos: [0.72, 1.4, 1.13], size: [0.16, 2.4, 0.1], variant: 'accent' },
      { shape: 'box', pos: [0, 3.15, 0], size: [1.72, 1.2, 1.62], variant: 'accent' },
      { shape: 'box', pos: [0, 3.15, 0.82], size: [1.35, 0.85, 0.05], variant: 'water' },
      { shape: 'box', pos: [0, 3.95, 0], size: [1.1, 0.45, 1.05], variant: 'dark' },
      { shape: 'cylinder', pos: [0, 4.65, 0], size: [0.04, 0.08, 1.05], variant: 'dark' },
      { shape: 'sphere', pos: [0, 5.2, 0], size: [0.09, 0.09, 0.09], variant: 'emissiveLamp' },
    ],
  },
  {
    id: 'commercial',
    label: '商业裙房',
    heightHint: '首层柱廊橱窗 + 宽挑檐雨棚 + 发光店招 + 塔楼',
    parts: [
      { shape: 'box', pos: [0, 0.78, 0], size: [2.9, 1.55, 2.5], variant: 'accent' },
      { shape: 'box', pos: [-0.85, 0.65, 1.26], size: [0.75, 1.1, 0.06], variant: 'water' },
      { shape: 'box', pos: [0, 0.65, 1.26], size: [0.75, 1.1, 0.06], variant: 'water' },
      { shape: 'box', pos: [0.85, 0.65, 1.26], size: [0.75, 1.1, 0.06], variant: 'water' },
      { shape: 'box', pos: [0, 1.48, 1.48], size: [2.65, 0.16, 0.58], variant: 'dark' },
      { shape: 'box', pos: [0, 1.66, 1.28], size: [1.8, 0.24, 0.08], variant: 'emissiveLamp' },
      { shape: 'box', pos: [0, 2.68, -0.15], size: [2.1, 2.25, 1.7], variant: 'default' },
      { shape: 'box', pos: [0, 2.4, 0.71], size: [1.75, 0.34, 0.05], variant: 'water' },
      { shape: 'box', pos: [0, 3.1, 0.71], size: [1.75, 0.34, 0.05], variant: 'water' },
      { shape: 'box', pos: [0, 3.88, -0.15], size: [2.2, 0.2, 1.8], variant: 'dark' },
    ],
  },
  {
    id: 'ruin_shell',
    label: '残垣废楼',
    heightHint: '缺角坍塌楼板 + 外露钢筋立柱 + 散落碎石瓦砾',
    parts: [
      { shape: 'box', pos: [-0.25, 1.5, 0], size: [1.9, 3.0, 1.9], variant: 'concrete' },
      { shape: 'box', pos: [0.75, 0.9, 0], size: [0.85, 1.8, 1.8], variant: 'concrete' },
      { shape: 'box', pos: [-0.6, 3.2, -0.4], size: [0.8, 0.5, 0.9], variant: 'dark' },
      { shape: 'box', pos: [-0.25, 1.2, 0.96], size: [0.55, 0.65, 0.08], variant: 'dark' },
      { shape: 'box', pos: [-0.55, 2.2, 0.96], size: [0.55, 0.65, 0.08], variant: 'dark' },
      { shape: 'cylinder', pos: [0.88, 2.25, 0.65], size: [0.06, 0.07, 0.95], variant: 'dark' },
      { shape: 'cylinder', pos: [0.88, 2.15, -0.65], size: [0.06, 0.07, 0.78], variant: 'dark' },
      { shape: 'box', pos: [0.65, 1.75, 0.15], rot: [0.18, 0, -0.32], size: [0.95, 0.14, 1.35], variant: 'concrete' },
      { shape: 'dodecahedron', pos: [1.05, 0.22, 0.65], size: [0.34, 0.24, 0.32], variant: 'rock' },
      { shape: 'dodecahedron', pos: [0.85, 0.18, -0.75], size: [0.28, 0.2, 0.28], variant: 'rock' },
    ],
  },
];

// ============================================================================
// Character Body Archetype Inventory (24 Variants · Enriched Multi-Part Anatomy)
// ============================================================================
function buildDetailedCharacterParts(
  h: number,
  wScale: number,
  bodyMat: ClayVariant,
  legMat: ClayVariant,
  headMat: ClayVariant,
  coatApron?: boolean,
  extras: InventoryPart[] = []
): InventoryPart[] {
  const s = h / 1.75;
  const sw = 0.23 * wScale * s;
  const parts: InventoryPart[] = [
    // Stand base disc
    { shape: 'cylinder', pos: [0, 0.02, 0], size: [0.26 * wScale, 0.28 * wScale, 0.04], variant: 'concrete' },
    // Left & right boots
    { shape: 'box', pos: [-0.1 * wScale, 0.07 * s, 0.03], size: [0.11 * wScale, 0.12 * s, 0.24 * s], variant: 'dark' },
    { shape: 'box', pos: [0.1 * wScale, 0.07 * s, 0.03], size: [0.11 * wScale, 0.12 * s, 0.24 * s], variant: 'dark' },
    // Left & right legs
    { shape: 'cylinder', pos: [-0.1 * wScale, 0.46 * s, 0], size: [0.075 * wScale, 0.062 * wScale, 0.72 * s], variant: legMat },
    { shape: 'cylinder', pos: [0.1 * wScale, 0.46 * s, 0], size: [0.075 * wScale, 0.062 * wScale, 0.72 * s], variant: legMat },
    // Pelvis & belt
    { shape: 'box', pos: [0, 0.84 * s, 0], size: [0.33 * wScale, 0.14 * s, 0.22 * wScale], variant: legMat },
    { shape: 'box', pos: [0, 0.91 * s, 0], size: [0.35 * wScale, 0.06 * s, 0.24 * wScale], variant: 'dark' },
    // Upper chest torso & collar
    { shape: 'box', pos: [0, 1.18 * s, 0], size: [0.42 * wScale, 0.48 * s, 0.25 * wScale], variant: bodyMat },
    // Left & right shoulder joints + articulated arms + hands
    { shape: 'sphere', pos: [-sw, 1.36 * s, 0], size: [0.075 * wScale, 0.075 * wScale, 0.075 * wScale], variant: bodyMat },
    { shape: 'sphere', pos: [sw, 1.36 * s, 0], size: [0.075 * wScale, 0.075 * wScale, 0.075 * wScale], variant: bodyMat },
    { shape: 'cylinder', pos: [-sw * 1.05, 1.1 * s, 0], rot: [0, 0, 0.08], size: [0.058 * wScale, 0.048 * wScale, 0.52 * s], variant: bodyMat },
    { shape: 'cylinder', pos: [sw * 1.05, 1.1 * s, 0], rot: [0, 0, -0.08], size: [0.058 * wScale, 0.048 * wScale, 0.52 * s], variant: bodyMat },
    { shape: 'sphere', pos: [-sw * 1.08, 0.82 * s, 0], size: [0.05 * wScale, 0.055 * wScale, 0.05 * wScale], variant: 'mannequinBody' },
    { shape: 'sphere', pos: [sw * 1.08, 0.82 * s, 0], size: [0.05 * wScale, 0.055 * wScale, 0.05 * wScale], variant: 'mannequinBody' },
    // Neck + sculpted head + nose/visor direction cue
    { shape: 'cylinder', pos: [0, 1.46 * s, 0], size: [0.055 * wScale, 0.062 * wScale, 0.1 * s], variant: 'mannequinBody' },
    { shape: 'sphere', pos: [0, 1.61 * s, 0], size: [0.125 * s, 0.145 * s, 0.13 * s], variant: headMat },
    { shape: 'box', pos: [0, 1.61 * s, 0.12 * s], size: [0.08 * s, 0.04 * s, 0.05 * s], variant: 'accent' },
  ];
  if (coatApron) {
    parts.push({
      shape: 'cylinder',
      pos: [0, 0.55 * s, 0],
      size: [0.2 * wScale, 0.31 * wScale, 0.72 * s],
      variant: bodyMat,
    });
  }
  parts.push(...extras);
  return parts;
}

export const CHARACTER_VARIANTS: CharacterInventorySpec[] = [
  {
    id: 'standard',
    label: '标准演员',
    scaleVec: [1, 1, 1],
    heightM: 1.75,
    shoulderScale: 1,
    parts: buildDetailedCharacterParts(1.75, 1.0, 'mannequinBody', 'mannequinAccent', 'mannequinBody'),
  },
  {
    id: 'tall_guard',
    label: '高大护卫',
    scaleVec: [1.06, 1.12, 1.06],
    heightM: 1.96,
    shoulderScale: 1.15,
    parts: buildDetailedCharacterParts(1.96, 1.12, 'mannequinBody', 'mannequinAccent', 'mannequinBody', false, [
      { shape: 'box', pos: [-0.28, 1.56, 0], size: [0.16, 0.1, 0.28], variant: 'dark' },
      { shape: 'box', pos: [0.28, 1.56, 0], size: [0.16, 0.1, 0.28], variant: 'dark' },
    ]),
  },
  {
    id: 'heavy',
    label: '重装壮硕',
    scaleVec: [1.2, 1.04, 1.18],
    heightM: 1.82,
    shoulderScale: 1.25,
    parts: buildDetailedCharacterParts(1.82, 1.24, 'mannequinBody', 'mannequinAccent', 'dark', false, [
      { shape: 'box', pos: [0, 1.26, 0.14], size: [0.46, 0.38, 0.12], variant: 'dark' },
    ]),
  },
  {
    id: 'agile_scout',
    label: '敏捷斥候',
    scaleVec: [0.92, 0.98, 0.92],
    heightM: 1.72,
    shoulderScale: 0.92,
    parts: buildDetailedCharacterParts(1.72, 0.9, 'mannequinBody', 'mannequinAccent', 'mannequinBody', false, [
      { shape: 'box', pos: [0, 1.22, -0.16], rot: [0, 0, 0.45], size: [0.08, 0.68, 0.06], variant: 'dark' },
    ]),
  },
  {
    id: 'young',
    label: '少年体型',
    scaleVec: [0.84, 0.82, 0.84],
    heightM: 1.44,
    shoulderScale: 0.88,
    parts: buildDetailedCharacterParts(1.44, 0.86, 'mannequinBody', 'mannequinAccent', 'mannequinBody'),
  },
  {
    id: 'coated',
    label: '风衣剪影',
    scaleVec: [1.05, 1.03, 1.05],
    heightM: 1.8,
    shoulderScale: 1.12,
    coatApron: true,
    parts: buildDetailedCharacterParts(1.8, 1.08, 'dark', 'mannequinAccent', 'mannequinBody', true, [
      { shape: 'cylinder', pos: [0, 1.76, 0], size: [0.22, 0.22, 0.04], variant: 'dark' },
      { shape: 'cylinder', pos: [0, 1.82, 0], size: [0.13, 0.14, 0.12], variant: 'dark' },
    ]),
  },
  {
    id: 'director_set',
    label: '片场导演',
    scaleVec: [1.0, 1.0, 1.0],
    heightM: 1.76,
    shoulderScale: 1.02,
    parts: buildDetailedCharacterParts(1.76, 1.0, 'mannequinBody', 'mannequinAccent', 'mannequinBody', false, [
      { shape: 'box', pos: [0, 1.73, 0.05], size: [0.26, 0.05, 0.3], variant: 'dark' },
      { shape: 'cone', pos: [0.26, 0.92, 0.18], rot: [Math.PI / 2, 0, 0], size: [0.12, 0.28, 12], variant: 'accent' },
    ]),
  },
  {
    id: 'cameraman_op',
    label: '肩扛摄影师',
    scaleVec: [1.04, 1.01, 1.04],
    heightM: 1.78,
    shoulderScale: 1.08,
    parts: buildDetailedCharacterParts(1.78, 1.05, 'mannequinBody', 'mannequinAccent', 'mannequinBody', false, [
      { shape: 'box', pos: [0.22, 1.54, 0.1], size: [0.2, 0.22, 0.38], variant: 'dark' },
      { shape: 'cylinder', pos: [0.22, 1.54, 0.34], rot: [Math.PI / 2, 0, 0], size: [0.08, 0.09, 0.18], variant: 'car' },
    ]),
  },
  {
    id: 'ancient_xiake',
    label: '古装侠客',
    scaleVec: [1.02, 1.04, 1.02],
    heightM: 1.82,
    shoulderScale: 1.06,
    coatApron: true,
    parts: buildDetailedCharacterParts(1.82, 1.04, 'mannequinBody', 'mannequinAccent', 'mannequinBody', true, [
      { shape: 'cone', pos: [0, 1.82, 0], size: [0.36, 0.15, 12], variant: 'wood' },
      { shape: 'cylinder', pos: [-0.24, 0.95, 0.08], rot: [0.45, 0, 0], size: [0.03, 0.03, 0.88], variant: 'dark' },
    ]),
  },
  {
    id: 'ancient_scholar',
    label: '古装文人长衫',
    scaleVec: [0.98, 1.02, 0.98],
    heightM: 1.78,
    shoulderScale: 0.98,
    coatApron: true,
    parts: buildDetailedCharacterParts(1.78, 0.98, 'default', 'mannequinAccent', 'mannequinBody', true, [
      { shape: 'box', pos: [0, 1.78, 0], size: [0.16, 0.14, 0.16], variant: 'dark' },
    ]),
  },
  {
    id: 'tactical_unit',
    label: '战术特警',
    scaleVec: [1.08, 1.05, 1.08],
    heightM: 1.85,
    shoulderScale: 1.16,
    parts: buildDetailedCharacterParts(1.85, 1.12, 'dark', 'dark', 'dark', false, [
      { shape: 'box', pos: [0, 1.24, 0.15], size: [0.38, 0.36, 0.1], variant: 'car' },
      { shape: 'sphere', pos: [0, 1.72, 0], size: [0.16, 0.16, 0.17], variant: 'dark' },
    ]),
  },
  {
    id: 'medic_coat',
    label: '医护白大褂',
    scaleVec: [0.99, 1.0, 0.99],
    heightM: 1.74,
    shoulderScale: 1.0,
    coatApron: true,
    parts: buildDetailedCharacterParts(1.74, 1.0, 'default', 'mannequinAccent', 'mannequinBody', true),
  },
  {
    id: 'student_uni',
    label: '青年学生',
    scaleVec: [0.94, 0.95, 0.94],
    heightM: 1.66,
    shoulderScale: 0.94,
    parts: buildDetailedCharacterParts(1.66, 0.94, 'mannequinBody', 'mannequinAccent', 'mannequinBody', false, [
      { shape: 'box', pos: [0, 1.12, -0.18], size: [0.28, 0.34, 0.14], variant: 'dark' },
    ]),
  },
  {
    id: 'elder_staff',
    label: '长者体态',
    scaleVec: [0.95, 0.93, 0.96],
    heightM: 1.64,
    shoulderScale: 0.95,
    parts: buildDetailedCharacterParts(1.64, 0.96, 'mannequinBody', 'mannequinAccent', 'mannequinBody', false, [
      { shape: 'cylinder', pos: [0.28, 0.56, 0.14], size: [0.025, 0.02, 1.1], variant: 'wood' },
    ]),
  },
  {
    id: 'child_kid',
    label: '儿童体型',
    scaleVec: [0.72, 0.68, 0.72],
    heightM: 1.22,
    shoulderScale: 0.82,
    parts: buildDetailedCharacterParts(1.22, 0.82, 'mannequinBody', 'mannequinAccent', 'mannequinBody'),
  },
  {
    id: 'astronaut_eva',
    label: '宇航服太空人',
    scaleVec: [1.14, 1.06, 1.16],
    heightM: 1.88,
    shoulderScale: 1.2,
    parts: buildDetailedCharacterParts(1.88, 1.18, 'default', 'default', 'water', false, [
      { shape: 'box', pos: [0, 1.26, -0.22], size: [0.44, 0.52, 0.22], variant: 'default' },
      { shape: 'sphere', pos: [0, 1.72, 0], size: [0.2, 0.2, 0.2], variant: 'water' },
    ]),
  },
  {
    id: 'mecha_heavy',
    label: '重装机甲战士',
    scaleVec: [1.28, 1.18, 1.26],
    heightM: 2.1,
    shoulderScale: 1.32,
    parts: buildDetailedCharacterParts(2.1, 1.28, 'car', 'dark', 'accent', false, [
      { shape: 'box', pos: [-0.38, 1.66, 0], size: [0.24, 0.22, 0.36], variant: 'car' },
      { shape: 'box', pos: [0.38, 1.66, 0], size: [0.24, 0.22, 0.36], variant: 'car' },
      { shape: 'box', pos: [0, 1.45, -0.22], size: [0.48, 0.44, 0.22], variant: 'dark' },
    ]),
  },
  {
    id: 'business_exec',
    label: '都市西装白领',
    scaleVec: [1.0, 1.02, 0.98],
    heightM: 1.78,
    shoulderScale: 1.04,
    parts: buildDetailedCharacterParts(1.78, 1.02, 'dark', 'dark', 'mannequinBody', false, [
      { shape: 'box', pos: [0.28, 0.68, 0.04], size: [0.08, 0.28, 0.38], variant: 'trunk' },
    ]),
  },
  {
    id: 'worker_safety',
    label: '工地安全帽工人',
    scaleVec: [1.02, 1.0, 1.02],
    heightM: 1.76,
    shoulderScale: 1.06,
    parts: buildDetailedCharacterParts(1.76, 1.04, 'mannequinBody', 'mannequinAccent', 'mannequinBody', false, [
      { shape: 'sphere', pos: [0, 1.7, 0.02], size: [0.15, 0.11, 0.17], variant: 'emissiveLamp' },
    ]),
  },
  {
    id: 'knight_plate',
    label: '中世纪板甲骑士',
    scaleVec: [1.1, 1.06, 1.1],
    heightM: 1.88,
    shoulderScale: 1.18,
    parts: buildDetailedCharacterParts(1.88, 1.14, 'car', 'car', 'car', false, [
      { shape: 'box', pos: [-0.28, 1.1, 0.16], size: [0.08, 0.58, 0.42], variant: 'accent' },
      { shape: 'cylinder', pos: [0.28, 1.15, 0.12], size: [0.025, 0.025, 0.95], variant: 'default' },
    ]),
  },
  {
    id: 'dancer_slim',
    label: '舞台舞者体态',
    scaleVec: [0.9, 1.01, 0.9],
    heightM: 1.74,
    shoulderScale: 0.92,
    parts: buildDetailedCharacterParts(1.74, 0.9, 'mannequinBody', 'mannequinAccent', 'mannequinBody'),
  },
  {
    id: 'biker_helmet',
    label: '机车头盔骑手',
    scaleVec: [1.03, 1.01, 1.03],
    heightM: 1.79,
    shoulderScale: 1.08,
    parts: buildDetailedCharacterParts(1.79, 1.06, 'dark', 'dark', 'car', false, [
      { shape: 'sphere', pos: [0, 1.66, 0], size: [0.16, 0.17, 0.17], variant: 'car' },
      { shape: 'box', pos: [0, 1.66, 0.14], size: [0.18, 0.08, 0.06], variant: 'water' },
    ]),
  },
  {
    id: 'general_armor',
    label: '古装披甲将军',
    scaleVec: [1.12, 1.08, 1.12],
    heightM: 1.92,
    shoulderScale: 1.22,
    coatApron: true,
    parts: buildDetailedCharacterParts(1.92, 1.16, 'accent', 'dark', 'mannequinBody', true, [
      { shape: 'cone', pos: [0, 1.88, 0], size: [0.16, 0.24, 8], variant: 'emissiveLamp' },
      { shape: 'box', pos: [-0.32, 1.54, 0], size: [0.18, 0.12, 0.3], variant: 'accent' },
      { shape: 'box', pos: [0.32, 1.54, 0], size: [0.18, 0.12, 0.3], variant: 'accent' },
    ]),
  },
  {
    id: 'crowd_extra',
    label: '远景群演剪影',
    scaleVec: [0.98, 0.99, 0.98],
    heightM: 1.73,
    shoulderScale: 0.98,
    parts: buildDetailedCharacterParts(1.73, 0.98, 'mannequinBody', 'mannequinAccent', 'mannequinBody'),
  },
];

const CHARACTER_VARIANT_MAP = new Map<string, CharacterInventorySpec>(
  CHARACTER_VARIANTS.map((c) => [c.id, c])
);

export interface CharacterItemGroup {
  groupId: string;
  name: string;
  defaultVariantId: string;
  variants: CharacterInventorySpec[];
}

export const CHARACTER_ITEM_GROUPS: CharacterItemGroup[] = [
  {
    groupId: 'char_grp_urban',
    name: '都市与日常演员',
    defaultVariantId: 'standard',
    variants: CHARACTER_VARIANTS.filter((c) =>
      [
        'standard',
        'student_uni',
        'business_exec',
        'young',
        'child_kid',
        'elder_staff',
        'crowd_extra',
      ].includes(c.id)
    ),
  },
  {
    groupId: 'char_grp_crew',
    name: '片场与职业人员',
    defaultVariantId: 'director_set',
    variants: CHARACTER_VARIANTS.filter((c) =>
      [
        'director_set',
        'cameraman_op',
        'medic_coat',
        'worker_safety',
        'dancer_slim',
      ].includes(c.id)
    ),
  },
  {
    groupId: 'char_grp_ancient',
    name: '古装与奇幻角色',
    defaultVariantId: 'ancient_xiake',
    variants: CHARACTER_VARIANTS.filter((c) =>
      [
        'ancient_xiake',
        'ancient_scholar',
        'general_armor',
        'knight_plate',
      ].includes(c.id)
    ),
  },
  {
    groupId: 'char_grp_action',
    name: '战术动作与科幻角色',
    defaultVariantId: 'tall_guard',
    variants: CHARACTER_VARIANTS.filter((c) =>
      [
        'tall_guard',
        'heavy',
        'agile_scout',
        'coated',
        'tactical_unit',
        'biker_helmet',
        'astronaut_eva',
        'mecha_heavy',
      ].includes(c.id)
    ),
  },
];

export function getCharacterItemGroup(variantId?: string): CharacterItemGroup {
  if (variantId) {
    const found = CHARACTER_ITEM_GROUPS.find((g) =>
      g.variants.some((v) => v.id === variantId)
    );
    if (found) return found;
  }
  return CHARACTER_ITEM_GROUPS[0];
}

// ============================================================================
// Query Helpers (O(1) Map-Backed Lookups)
// ============================================================================
export function getInventoryForPropType(type: PropType): AssetVariantSpec[] {
  return ASSET_INVENTORY_BY_TYPE[type] ?? BOX_VARIANTS;
}

export function getVariantSpec(
  type: PropType,
  variantId?: string
): AssetVariantSpec {
  if (variantId) {
    const fast = VARIANT_LOOKUP_BY_TYPE[type]?.get(variantId);
    if (fast) return fast;
  }
  const groups = getItemGroupsForPropType(type);
  return groups[0]?.variants[0]?.spec ?? getInventoryForPropType(type)[0];
}

export function getNextVariantId(
  type: PropType,
  currentVariantId?: string,
  step: 1 | -1 = 1
): string {
  const grp = getItemGroupForVariant(type, currentVariantId);
  if (!grp || grp.variants.length === 0) {
    const list = getInventoryForPropType(type);
    return list[0]?.id ?? '';
  }
  if (grp.variants.length === 1) return grp.variants[0].spec.id;
  const idx = grp.variants.findIndex((v) => v.spec.id === currentVariantId);
  const len = grp.variants.length;
  const nextIdx = idx < 0 ? 1 % len : (idx + step + len) % len;
  return grp.variants[nextIdx].spec.id;
}

export function getNextCharacterVariantId(
  currentVariantId?: string,
  step: 1 | -1 = 1
): string {
  const grp = getCharacterItemGroup(currentVariantId);
  if (!grp || grp.variants.length <= 1) {
    const idx = CHARACTER_VARIANTS.findIndex((v) => v.id === currentVariantId);
    const nextIdx =
      idx < 0 ? 1 % CHARACTER_VARIANTS.length : (idx + 1) % CHARACTER_VARIANTS.length;
    return CHARACTER_VARIANTS[nextIdx].id;
  }
  const idx = grp.variants.findIndex((v) => v.id === currentVariantId);
  const len = grp.variants.length;
  const nextIdx = idx < 0 ? 1 % len : (idx + step + len) % len;
  return grp.variants[nextIdx].id;
}

export function getNextBuildingStyle(currentStyle: BuildingStyle): BuildingStyle {
  const idx = BUILDING_INVENTORY.findIndex((b) => b.id === currentStyle);
  const nextIdx =
    idx < 0 ? 1 % BUILDING_INVENTORY.length : (idx + 1) % BUILDING_INVENTORY.length;
  return BUILDING_INVENTORY[nextIdx].id;
}

export function getCharacterVariantSpec(
  variantId?: string
): CharacterInventorySpec {
  if (variantId) {
    const fast = CHARACTER_VARIANT_MAP.get(variantId);
    if (fast) return fast;
  }
  return CHARACTER_VARIANTS[0];
}
