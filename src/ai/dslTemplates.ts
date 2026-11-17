import type {
  AspectRatio,
  PosePreset,
  RoadConfig,
  TerrainConfig,
} from '../types/scene';
import type {
  CameraSlot,
  DSLCharacterNode,
  DSLLightingConfig,
  DSLObjectNode,
  DSLObjectType,
  IntentSummary,
  SceneDSL,
  SceneTemplateId,
  TemplateSlot,
} from './dslSchema';

export interface SceneTemplateDefinition {
  id: SceneTemplateId;
  name: string;
  description: string;
  terrain: TerrainConfig;
  road: RoadConfig;
  walkableBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  slots: TemplateSlot[];
  cameraSlots: CameraSlot[];
  defaultLighting: DSLLightingConfig;
  fewShotDsl: SceneDSL;
}

export const SCENE_TEMPLATES: Record<SceneTemplateId, SceneTemplateDefinition> = {
  alley: {
    id: 'alley',
    name: '窄巷走廊 (Alley)',
    description: '两侧夹墙建筑围合的城市小巷，带路灯、货箱掩体、路障与远处停靠车辆。',
    terrain: { theme: 'urban_flat', relief: 0.1, hasWaterChannel: false },
    road: { pattern: 'none', width: 8 },
    walkableBounds: { minX: -9.5, maxX: 9.5, minZ: -34, maxZ: 34 },
    slots: [
      { slot_id: 'alley_bldg_l1', label: '左前建筑', category: 'structure', position: [-14, 0, -10], rotation_y_deg: 0, scale: [10, 12, 14] },
      { slot_id: 'alley_bldg_l2', label: '左后建筑', category: 'structure', position: [-14, 0, 12], rotation_y_deg: 0, scale: [10, 14, 14] },
      { slot_id: 'alley_bldg_r1', label: '右前建筑', category: 'structure', position: [14, 0, -10], rotation_y_deg: 180, scale: [10, 13, 14] },
      { slot_id: 'alley_bldg_r2', label: '右后建筑', category: 'structure', position: [14, 0, 12], rotation_y_deg: 180, scale: [10, 11, 14] },
      { slot_id: 'alley_lamp_1', label: '巷口左路灯', category: 'cover', position: [-5.5, 0, -14], rotation_y_deg: 90, scale: [0.5, 5.2, 0.5] },
      { slot_id: 'alley_lamp_2', label: '巷中右路灯', category: 'cover', position: [5.5, 0, 6], rotation_y_deg: -90, scale: [0.5, 5.2, 0.5] },
      { slot_id: 'alley_crate_1', label: '左侧货箱掩体', category: 'cover', position: [-5.5, 0, -3], rotation_y_deg: 15, scale: [1.6, 1.3, 1.6] },
      { slot_id: 'alley_crate_2', label: '右侧货箱掩体', category: 'cover', position: [5.2, 0, -6], rotation_y_deg: -10, scale: [1.5, 1.2, 1.5] },
      { slot_id: 'alley_barrier_1', label: '巷底防撞墩', category: 'cover', position: [0, 0, -18], rotation_y_deg: 0, scale: [3.0, 1.0, 0.9] },
      { slot_id: 'alley_car_1', label: '巷尾停靠车辆', category: 'vehicle', position: [2.4, 0, 20], rotation_y_deg: 180, scale: [4.2, 1.6, 1.9] },
      { slot_id: 'alley_door_1', label: '巷底门框入口', category: 'structure', position: [0, 0, -28], rotation_y_deg: 0, scale: [4.5, 3.8, 0.8] },
      { slot_id: 'alley_tree_1', label: '巷外树木', category: 'nature', position: [-7.5, 0, 24], rotation_y_deg: 0, scale: [1.4, 3.8, 1.4] },
      { slot_id: 'alley_char_1', label: '前排角色位', category: 'character', position: [-2.2, 0, 4], rotation_y_deg: 180, scale: [1, 1, 1] },
      { slot_id: 'alley_char_2', label: '深处对峙角色位', category: 'character', position: [2.2, 0, -12], rotation_y_deg: 0, scale: [1, 1, 1] },
      { slot_id: 'alley_char_3', label: '掩体侧翼角色位', category: 'character', position: [-3.8, 0, -3], rotation_y_deg: 135, scale: [1, 1, 1] },
    ],
    cameraSlots: [
      { id: 'cam_alley_start', label: '巷口建立镜头', position: [0, 1.8, 14], target: [0, 1.5, -8], focal_length: 35 },
      { id: 'cam_alley_mid', label: '巷中推近镜头', position: [-0.8, 1.6, 7], target: [0, 1.5, -10], focal_length: 50 },
      { id: 'cam_alley_end', label: '巷深对峙特写', position: [0.6, 2.0, -1], target: [1.8, 1.5, -12], focal_length: 65 },
    ],
    defaultLighting: {
      style_label: '夜雨巷道逆光',
      sun_azimuth: 215,
      sun_elevation: 22,
      fog_density: 0.012,
      material_tone: 'dark_slate',
    },
    fewShotDsl: {
      template_id: 'alley',
      lighting: {
        style_label: '深夜迷雾巷战',
        sun_azimuth: 220,
        sun_elevation: 18,
        fog_density: 0.014,
        material_tone: 'wet_asphalt',
      },
      objects: [
        { id: 'obj_b1', name: '左翼窄巷楼体', type: 'building', slot_id: 'alley_bldg_l1', position: [-14, 0, -10], rotation_y_deg: 0, scale: [10, 12, 14], floors: 3 },
        { id: 'obj_b2', name: '右翼窄巷楼体', type: 'building', slot_id: 'alley_bldg_r1', position: [14, 0, -10], rotation_y_deg: 180, scale: [10, 13, 14], floors: 4 },
        { id: 'obj_lamp', name: '巷口路灯', type: 'lamp', slot_id: 'alley_lamp_1', position: [-5.5, 0, -14], rotation_y_deg: 90, scale: null, floors: null },
        { id: 'obj_crate', name: '货箱掩体', type: 'crate', slot_id: 'alley_crate_1', position: [-5.5, 0, -3], rotation_y_deg: 15, scale: [1.6, 1.3, 1.6], floors: null },
        { id: 'obj_barrier', name: '水泥防撞墩', type: 'barrier', slot_id: 'alley_barrier_1', position: [0, 0, -18], rotation_y_deg: 0, scale: [3.0, 1.0, 0.9], floors: null },
      ],
      characters: [
        { id: 'char_1', role: '潜行特工', pose: 'crouch_cover', slot_id: 'alley_char_3', position: [-3.8, 0, -3], rotation_y_deg: 135 },
        { id: 'char_2', role: '巷底哨兵', pose: 'aim', slot_id: 'alley_char_2', position: [2.2, 0, -12], rotation_y_deg: 0 },
      ],
      camera: {
        intent_label: '低角度推镜头穿过窄巷',
        aspect_ratio: '2.39:1',
        keyframes: [
          { time: 0, position: [0, 1.8, 14], target: [0, 1.5, -8], focal_length: 35 },
          { time: 2.5, position: [-0.8, 1.6, 7], target: [0, 1.5, -10], focal_length: 50 },
          { time: 5, position: [0.6, 2.0, -1], target: [1.8, 1.5, -12], focal_length: 65 },
        ],
      },
    },
  },

  street: {
    id: 'street',
    name: '城市主街 (Street)',
    description: '十字路口双向车道与人行道，配备路口建筑、路障车队、路灯与树木。',
    terrain: { theme: 'urban_flat', relief: 0.15, hasWaterChannel: false },
    road: { pattern: 'none', width: 12 },
    walkableBounds: { minX: -48, maxX: 48, minZ: -48, maxZ: 48 },
    slots: [
      { slot_id: 'street_bldg_nw', label: '西北商业建筑', category: 'structure', position: [-20, 0, -22], rotation_y_deg: 0, scale: [16, 18, 14] },
      { slot_id: 'street_bldg_ne', label: '东北高层建筑', category: 'structure', position: [20, 0, -22], rotation_y_deg: 0, scale: [16, 22, 14] },
      { slot_id: 'street_bldg_sw', label: '西南街角建筑', category: 'structure', position: [-20, 0, 22], rotation_y_deg: 180, scale: [16, 14, 14] },
      { slot_id: 'street_hero_se', label: '东南两层可进入建筑', category: 'structure', position: [22, 0, 22], rotation_y_deg: 180, scale: [16, 8, 12] },
      { slot_id: 'street_car_1', label: '北向车辆槽位', category: 'vehicle', position: [-3.2, 0, -6], rotation_y_deg: 0, scale: [4.2, 1.6, 1.9] },
      { slot_id: 'street_car_2', label: '南向车辆槽位', category: 'vehicle', position: [3.5, 0, 10], rotation_y_deg: 180, scale: [4.2, 1.6, 1.9] },
      { slot_id: 'street_car_3', label: '西向车辆槽位', category: 'vehicle', position: [-14, 0, 3.2], rotation_y_deg: 90, scale: [4.2, 1.6, 1.9] },
      { slot_id: 'street_barrier_1', label: '左道防撞墩', category: 'cover', position: [-2.8, 0, -14], rotation_y_deg: 0, scale: [3.2, 1.0, 0.9] },
      { slot_id: 'street_barrier_2', label: '右道防撞墩', category: 'cover', position: [2.8, 0, -14], rotation_y_deg: 0, scale: [3.2, 1.0, 0.9] },
      { slot_id: 'street_lamp_1', label: '街角路灯A', category: 'cover', position: [-7.5, 0, -8], rotation_y_deg: 90, scale: [0.5, 5.5, 0.5] },
      { slot_id: 'street_lamp_2', label: '街角路灯B', category: 'cover', position: [7.5, 0, 8], rotation_y_deg: -90, scale: [0.5, 5.5, 0.5] },
      { slot_id: 'street_tree_1', label: '人行道行道树A', category: 'nature', position: [-9.5, 0, 12], rotation_y_deg: 0, scale: [1.4, 3.8, 1.4] },
      { slot_id: 'street_tree_2', label: '人行道行道树B', category: 'nature', position: [9.5, 0, -10], rotation_y_deg: 0, scale: [1.4, 3.8, 1.4] },
      { slot_id: 'street_crate_1', label: '街角货箱堆', category: 'cover', position: [-8.5, 0, -16], rotation_y_deg: 10, scale: [1.6, 1.4, 1.6] },
      { slot_id: 'street_char_1', label: '路障后掩体角色位', category: 'character', position: [-2.8, 0, -11.5], rotation_y_deg: 180, scale: [1, 1, 1] },
      { slot_id: 'street_char_2', label: '街心推进角色位', category: 'character', position: [2.8, 0, 4.0], rotation_y_deg: 180, scale: [1, 1, 1] },
      { slot_id: 'street_char_3', label: '人行道侧翼角色位', category: 'character', position: [8.2, 0, -6.0], rotation_y_deg: -90, scale: [1, 1, 1] },
    ],
    cameraSlots: [
      { id: 'cam_street_wide', label: '街道全景建立机位', position: [0, 7.5, 28], target: [0, 2.0, -4], focal_length: 28 },
      { id: 'cam_street_low', label: '街道低角度推进机位', position: [0, 1.5, 18], target: [0, 1.8, -10], focal_length: 35 },
      { id: 'cam_street_close', label: '路口交锋中近景', position: [1.2, 1.7, 2], target: [-2.5, 1.5, -11], focal_length: 50 },
    ],
    defaultLighting: {
      style_label: '黄昏城市街道剪影',
      sun_azimuth: 48,
      sun_elevation: 18,
      fog_density: 0.008,
      material_tone: 'warm_concrete',
    },
    fewShotDsl: {
      template_id: 'street',
      lighting: {
        style_label: '黄昏逆光封锁街道',
        sun_azimuth: 50,
        sun_elevation: 16,
        fog_density: 0.008,
        material_tone: 'concrete_gray',
      },
      objects: [
        { id: 'obj_nw', name: '西北商业楼', type: 'building', slot_id: 'street_bldg_nw', position: [-20, 0, -22], rotation_y_deg: 0, scale: [16, 18, 14], floors: 5 },
        { id: 'obj_ne', name: '东北办公楼', type: 'building', slot_id: 'street_bldg_ne', position: [20, 0, -22], rotation_y_deg: 0, scale: [16, 22, 14], floors: 6 },
        { id: 'obj_hero', name: '安全屋复合体', type: 'hero_compound', slot_id: 'street_hero_se', position: [22, 0, 22], rotation_y_deg: 180, scale: [16, 8, 12], floors: 2 },
        { id: 'obj_car1', name: '巡逻车', type: 'vehicle', slot_id: 'street_car_1', position: [-3.2, 0, -6], rotation_y_deg: 0, scale: null, floors: null },
        { id: 'obj_bar1', name: '防撞路障A', type: 'barrier', slot_id: 'street_barrier_1', position: [-2.8, 0, -14], rotation_y_deg: 0, scale: [3.2, 1.0, 0.9], floors: null },
        { id: 'obj_lamp1', name: '主街路灯', type: 'lamp', slot_id: 'street_lamp_1', position: [-7.5, 0, -8], rotation_y_deg: 90, scale: null, floors: null },
      ],
      characters: [
        { id: 'char_1', role: '警戒队员', pose: 'crouch_cover', slot_id: 'street_char_1', position: [-2.8, 0, -11.5], rotation_y_deg: 180 },
        { id: 'char_2', role: '前锋特工', pose: 'aim', slot_id: 'street_char_2', position: [2.8, 0, 4.0], rotation_y_deg: 180 },
      ],
      camera: {
        intent_label: '沿主街中线低角度推进至路口',
        aspect_ratio: '2.39:1',
        keyframes: [
          { time: 0, position: [0, 7.5, 28], target: [0, 2.0, -4], focal_length: 28 },
          { time: 2.5, position: [0, 1.5, 18], target: [0, 1.8, -10], focal_length: 35 },
          { time: 5, position: [1.2, 1.7, 2], target: [-2.5, 1.5, -11], focal_length: 50 },
        ],
      },
    },
  },

  plaza: {
    id: 'plaza',
    name: '高台广场 (Plaza)',
    description: '中心高台（含四根对称围合立柱与南向坡道），外围留有环绕机位通道。',
    terrain: { theme: 'urban_flat', relief: 0.1, hasWaterChannel: false },
    road: { pattern: 'none', width: 12 },
    walkableBounds: { minX: -34, maxX: 34, minZ: -34, maxZ: 34 },
    slots: [
      { slot_id: 'plaza_platform_center', label: '中央高台', category: 'structure', position: [0, 0.6, 0], rotation_y_deg: 0, scale: [16, 1.2, 16] },
      { slot_id: 'plaza_ramp_south', label: '南向坡道', category: 'structure', position: [0, 0.6, 11], rotation_y_deg: 0, scale: [5, 1.2, 6] },
      { slot_id: 'plaza_stairs_east', label: '东侧台阶', category: 'structure', position: [10.5, 0, 0], rotation_y_deg: -90, scale: [3.2, 1.2, 4.5] },
      { slot_id: 'plaza_pillar_nw', label: '西北立柱', category: 'structure', position: [-6, 1.2, -6], rotation_y_deg: 0, scale: [1.4, 6.2, 1.4] },
      { slot_id: 'plaza_pillar_ne', label: '东北立柱', category: 'structure', position: [6, 1.2, -6], rotation_y_deg: 0, scale: [1.4, 6.2, 1.4] },
      { slot_id: 'plaza_pillar_sw', label: '西南立柱', category: 'structure', position: [-6, 1.2, 6], rotation_y_deg: 0, scale: [1.4, 6.2, 1.4] },
      { slot_id: 'plaza_pillar_se', label: '东南立柱', category: 'structure', position: [6, 1.2, 6], rotation_y_deg: 0, scale: [1.4, 6.2, 1.4] },
      { slot_id: 'plaza_wall_north', label: '北侧背景墙', category: 'structure', position: [0, 0, -18], rotation_y_deg: 0, scale: [18, 4.2, 1.2] },
      { slot_id: 'plaza_bldg_l', label: '左侧广场建筑', category: 'structure', position: [-26, 0, -14], rotation_y_deg: 0, scale: [14, 16, 16] },
      { slot_id: 'plaza_bldg_r', label: '右侧广场建筑', category: 'structure', position: [26, 0, -14], rotation_y_deg: 0, scale: [14, 16, 16] },
      { slot_id: 'plaza_crate_1', label: '高台货箱掩体', category: 'cover', position: [-3.2, 1.2, -2.5], rotation_y_deg: 15, scale: [1.4, 1.2, 1.4] },
      { slot_id: 'plaza_tree_1', label: '广场左树', category: 'nature', position: [-14, 0, 12], rotation_y_deg: 0, scale: [1.5, 4.2, 1.5] },
      { slot_id: 'plaza_tree_2', label: '广场右树', category: 'nature', position: [14, 0, 12], rotation_y_deg: 0, scale: [1.5, 4.2, 1.5] },
      { slot_id: 'plaza_lamp_1', label: '广场路灯', category: 'cover', position: [-11, 0, 8], rotation_y_deg: 90, scale: [0.5, 5.5, 0.5] },
      { slot_id: 'plaza_char_1', label: '高台中心人物位', category: 'character', position: [0, 1.2, 0], rotation_y_deg: 0, scale: [1, 1, 1] },
      { slot_id: 'plaza_char_2', label: '西南台面人物位', category: 'character', position: [-3.2, 1.2, 3.2], rotation_y_deg: 145, scale: [1, 1, 1] },
      { slot_id: 'plaza_char_3', label: '东北台面人物位', category: 'character', position: [3.2, 1.2, -3.2], rotation_y_deg: -35, scale: [1, 1, 1] },
    ],
    cameraSlots: [
      { id: 'cam_plaza_orbit_1', label: '广场全景机位', position: [0, 4.8, 22], target: [0, 2.2, 0], focal_length: 35 },
      { id: 'cam_plaza_orbit_2', label: '侧向环绕机位', position: [18, 5.2, 14], target: [0, 2.2, 0], focal_length: 35 },
      { id: 'cam_plaza_low', label: '高台近景机位', position: [0, 2.4, 15], target: [0, 2.4, 0], focal_length: 50 },
    ],
    defaultLighting: {
      style_label: '大雾广场高对比立柱剪影',
      sun_azimuth: 45,
      sun_elevation: 20,
      fog_density: 0.015,
      material_tone: 'stone_gray',
    },
    fewShotDsl: {
      template_id: 'plaza',
      lighting: {
        style_label: '大雾冷峻遗址广场',
        sun_azimuth: 45,
        sun_elevation: 20,
        fog_density: 0.016,
        material_tone: 'pale_concrete',
      },
      objects: [
        { id: 'obj_plat', name: '中央高台', type: 'floor', slot_id: 'plaza_platform_center', position: [0, 0.6, 0], rotation_y_deg: 0, scale: [16, 1.2, 16], floors: null },
        { id: 'obj_ramp', name: '入口坡道', type: 'ramp', slot_id: 'plaza_ramp_south', position: [0, 0.6, 11], rotation_y_deg: 0, scale: [5, 1.2, 6], floors: null },
        { id: 'obj_p1', name: '西北立柱', type: 'pillar', slot_id: 'plaza_pillar_nw', position: [-6, 1.2, -6], rotation_y_deg: 0, scale: [1.4, 6.2, 1.4], floors: null },
        { id: 'obj_p2', name: '东北立柱', type: 'pillar', slot_id: 'plaza_pillar_ne', position: [6, 1.2, -6], rotation_y_deg: 0, scale: [1.4, 6.2, 1.4], floors: null },
        { id: 'obj_p3', name: '西南立柱', type: 'pillar', slot_id: 'plaza_pillar_sw', position: [-6, 1.2, 6], rotation_y_deg: 0, scale: [1.4, 6.2, 1.4], floors: null },
        { id: 'obj_p4', name: '东南立柱', type: 'pillar', slot_id: 'plaza_pillar_se', position: [6, 1.2, 6], rotation_y_deg: 0, scale: [1.4, 6.2, 1.4], floors: null },
      ],
      characters: [
        { id: 'char_1', role: '核心人物', pose: 'idle', slot_id: 'plaza_char_1', position: [0, 1.2, 0], rotation_y_deg: 0 },
      ],
      camera: {
        intent_label: '环绕高台立柱推进拍摄中心人物',
        aspect_ratio: '2.39:1',
        keyframes: [
          { time: 0, position: [0, 4.8, 22], target: [0, 2.2, 0], focal_length: 35 },
          { time: 2.5, position: [18, 5.2, 14], target: [0, 2.2, 0], focal_length: 35 },
          { time: 5, position: [0, 2.4, 15], target: [0, 2.4, 0], focal_length: 50 },
        ],
      },
    },
  },

  interior: {
    id: 'interior',
    name: '室内外穿行大厅 (Interior)',
    description: '带正门洞与门外停车的室内战术大厅，支持室外穿门推入一镜到底。',
    terrain: { theme: 'urban_flat', relief: 0, hasWaterChannel: false },
    road: { pattern: 'none', width: 10 },
    walkableBounds: { minX: -12, maxX: 12, minZ: -10, maxZ: 24 },
    slots: [
      { slot_id: 'int_floor_main', label: '大厅地面', category: 'interior', position: [0, 0.05, 0], rotation_y_deg: 0, scale: [20, 0.1, 18] },
      { slot_id: 'int_door_entry', label: '大厅正门框', category: 'interior', position: [0, 0, 9], rotation_y_deg: 0, scale: [4.6, 3.8, 0.8] },
      { slot_id: 'int_wall_front_l', label: '前左外墙', category: 'interior', position: [-6.2, 0, 9], rotation_y_deg: 0, scale: [7.6, 4.0, 0.7] },
      { slot_id: 'int_wall_front_r', label: '前右外墙', category: 'interior', position: [6.2, 0, 9], rotation_y_deg: 0, scale: [7.6, 4.0, 0.7] },
      { slot_id: 'int_wall_left', label: '左侧山墙', category: 'interior', position: [-10, 0, 0], rotation_y_deg: 0, scale: [0.7, 4.0, 18] },
      { slot_id: 'int_wall_right', label: '右侧山墙', category: 'interior', position: [10, 0, 0], rotation_y_deg: 0, scale: [0.7, 4.0, 18] },
      { slot_id: 'int_wall_back', label: '后侧实墙', category: 'interior', position: [0, 0, -9], rotation_y_deg: 0, scale: [20, 4.0, 0.7] },
      { slot_id: 'int_pillar_1', label: '室内左立柱', category: 'interior', position: [-5.5, 0, -3.5], rotation_y_deg: 0, scale: [0.9, 4.0, 0.9] },
      { slot_id: 'int_pillar_2', label: '室内右立柱', category: 'interior', position: [5.5, 0, -3.5], rotation_y_deg: 0, scale: [0.9, 4.0, 0.9] },
      { slot_id: 'int_table_center', label: '中央战术长桌', category: 'interior', position: [0, 0, -1.5], rotation_y_deg: 0, scale: [3.8, 0.9, 1.8] },
      { slot_id: 'int_stairs_1', label: '室内转角楼梯', category: 'interior', position: [7.5, 0, -5.5], rotation_y_deg: 180, scale: [2.8, 3.2, 4.5] },
      { slot_id: 'int_crate_1', label: '室内装备箱', category: 'cover', position: [-7.5, 0, 4.5], rotation_y_deg: 0, scale: [1.5, 1.2, 1.5] },
      { slot_id: 'int_car_outside', label: '门外接应车辆', category: 'vehicle', position: [-5.2, 0, 17], rotation_y_deg: 75, scale: [4.2, 1.6, 1.9] },
      { slot_id: 'int_char_1', label: '桌前对话角色位', category: 'character', position: [-1.5, 0, 1.5], rotation_y_deg: 180, scale: [1, 1, 1] },
      { slot_id: 'int_char_2', label: '桌后主控角色位', category: 'character', position: [1.8, 0, -4.2], rotation_y_deg: 0, scale: [1, 1, 1] },
    ],
    cameraSlots: [
      { id: 'cam_int_outside', label: '门外起幅机位', position: [0, 1.7, 17], target: [0, 1.5, 0], focal_length: 28 },
      { id: 'cam_int_doorway', label: '穿门过渡机位', position: [0, 1.65, 8.8], target: [0, 1.4, -2], focal_length: 35 },
      { id: 'cam_int_lobby', label: '室内定格机位', position: [0.6, 1.65, 3.2], target: [0, 1.3, -3.5], focal_length: 40 },
    ],
    defaultLighting: {
      style_label: '冷峻室内侧光穿门对比',
      sun_azimuth: 135,
      sun_elevation: 28,
      fog_density: 0.006,
      material_tone: 'steel_concrete',
    },
    fewShotDsl: {
      template_id: 'interior',
      lighting: {
        style_label: '阴冷战术安全屋',
        sun_azimuth: 140,
        sun_elevation: 26,
        fog_density: 0.006,
        material_tone: 'industrial_gray',
      },
      objects: [
        { id: 'obj_fl', name: '安全屋地面', type: 'floor', slot_id: 'int_floor_main', position: [0, 0.05, 0], rotation_y_deg: 0, scale: [20, 0.1, 18], floors: null },
        { id: 'obj_door', name: '入口门框', type: 'doorway', slot_id: 'int_door_entry', position: [0, 0, 9], rotation_y_deg: 0, scale: [4.6, 3.8, 0.8], floors: null },
        { id: 'obj_wl', name: '前左墙', type: 'wall', slot_id: 'int_wall_front_l', position: [-6.2, 0, 9], rotation_y_deg: 0, scale: [7.6, 4.0, 0.7], floors: null },
        { id: 'obj_wr', name: '前右墙', type: 'wall', slot_id: 'int_wall_front_r', position: [6.2, 0, 9], rotation_y_deg: 0, scale: [7.6, 4.0, 0.7], floors: null },
        { id: 'obj_wb', name: '大厅后墙', type: 'wall', slot_id: 'int_wall_back', position: [0, 0, -9], rotation_y_deg: 0, scale: [20, 4.0, 0.7], floors: null },
        { id: 'obj_tbl', name: '中央长桌', type: 'table', slot_id: 'int_table_center', position: [0, 0, -1.5], rotation_y_deg: 0, scale: [3.8, 0.9, 1.8], floors: null },
      ],
      characters: [
        { id: 'char_1', role: '潜入特工', pose: 'walk', slot_id: 'int_char_1', position: [-1.5, 0, 1.5], rotation_y_deg: 180 },
        { id: 'char_2', role: '情报官', pose: 'idle', slot_id: 'int_char_2', position: [1.8, 0, -4.2], rotation_y_deg: 0 },
      ],
      camera: {
        intent_label: '一镜到底从门外穿过门框推入室内',
        aspect_ratio: '2.39:1',
        keyframes: [
          { time: 0, position: [0, 1.7, 17], target: [0, 1.5, 0], focal_length: 28 },
          { time: 2.5, position: [0, 1.65, 8.8], target: [0, 1.4, -2], focal_length: 35 },
          { time: 5, position: [0.6, 1.65, 3.2], target: [0, 1.3, -3.5], focal_length: 40 },
        ],
      },
    },
  },

  rooftop: {
    id: 'rooftop',
    name: '高空天台 (Rooftop)',
    description: '带女儿墙与机房掩体的高层建筑天台，周边环绕高层建筑天际线。',
    terrain: { theme: 'urban_flat', relief: 0.2, hasWaterChannel: false },
    road: { pattern: 'none', width: 12 },
    walkableBounds: { minX: -11.5, maxX: 11.5, minZ: -11.5, maxZ: 11.5 },
    slots: [
      { slot_id: 'roof_deck', label: '主楼天台板', category: 'structure', position: [0, 11.4, 0], rotation_y_deg: 0, scale: [26, 1.2, 26] },
      { slot_id: 'roof_stair_house', label: '电梯井机房', category: 'structure', position: [8.5, 12.0, -8.5], rotation_y_deg: 0, scale: [4.5, 3.2, 4.5] },
      { slot_id: 'roof_parapet_n', label: '北侧女儿墙', category: 'structure', position: [0, 12.0, -12.6], rotation_y_deg: 0, scale: [25, 1.2, 0.6] },
      { slot_id: 'roof_parapet_w', label: '西侧女儿墙', category: 'structure', position: [-12.6, 12.0, 0], rotation_y_deg: 0, scale: [0.6, 1.2, 25] },
      { slot_id: 'roof_parapet_e', label: '东侧女儿墙', category: 'structure', position: [12.6, 12.0, 0], rotation_y_deg: 0, scale: [0.6, 1.2, 25] },
      { slot_id: 'roof_barrier_1', label: '天台矮墙掩体', category: 'cover', position: [-3.2, 12.0, 2.5], rotation_y_deg: 0, scale: [3.2, 1.1, 0.9] },
      { slot_id: 'roof_crate_1', label: '空调外机箱', category: 'cover', position: [3.2, 12.0, 4.0], rotation_y_deg: 0, scale: [1.8, 1.3, 1.8] },
      { slot_id: 'roof_bldg_neighbor_1', label: '远景左高楼', category: 'structure', position: [-30, 0, -24], rotation_y_deg: 0, scale: [16, 22, 16] },
      { slot_id: 'roof_bldg_neighbor_2', label: '远景右高楼', category: 'structure', position: [30, 0, -24], rotation_y_deg: 0, scale: [16, 26, 16] },
      { slot_id: 'roof_char_1', label: '天台掩体狙击位', category: 'character', position: [-3.2, 12.0, 4.5], rotation_y_deg: 180, scale: [1, 1, 1] },
      { slot_id: 'roof_char_2', label: '机房侧翼观察位', category: 'character', position: [1.5, 12.0, -7.5], rotation_y_deg: 0, scale: [1, 1, 1] },
    ],
    cameraSlots: [
      { id: 'cam_roof_wide', label: '天台俯视建立镜头', position: [-9, 14.8, 10], target: [0, 13.0, -2], focal_length: 28 },
      { id: 'cam_roof_edge', label: '低角度天台推进镜头', position: [0, 13.9, 9.5], target: [0, 13.1, -6], focal_length: 50 },
      { id: 'cam_roof_close', label: '天台角色过肩特写', position: [2.2, 13.7, 1.0], target: [-3.2, 13.3, 4.5], focal_length: 65 },
    ],
    defaultLighting: {
      style_label: '黄昏高空逆光剪影',
      sun_azimuth: 25,
      sun_elevation: 14,
      fog_density: 0.008,
      material_tone: 'skyline_slate',
    },
    fewShotDsl: {
      template_id: 'rooftop',
      lighting: {
        style_label: '夕阳高空天台对峙',
        sun_azimuth: 25,
        sun_elevation: 14,
        fog_density: 0.008,
        material_tone: 'warm_asphalt',
      },
      objects: [
        { id: 'obj_deck', name: '天台顶板', type: 'floor', slot_id: 'roof_deck', position: [0, 11.4, 0], rotation_y_deg: 0, scale: [26, 1.2, 26], floors: null },
        { id: 'obj_sh', name: '机房建筑', type: 'crate', slot_id: 'roof_stair_house', position: [8.5, 12.0, -8.5], rotation_y_deg: 0, scale: [4.5, 3.2, 4.5], floors: null },
        { id: 'obj_pn', name: '北女儿墙', type: 'wall', slot_id: 'roof_parapet_n', position: [0, 12.0, -12.6], rotation_y_deg: 0, scale: [25, 1.2, 0.6], floors: null },
        { id: 'obj_bar', name: '防撞矮墙', type: 'barrier', slot_id: 'roof_barrier_1', position: [-3.2, 12.0, 2.5], rotation_y_deg: 0, scale: [3.2, 1.1, 0.9], floors: null },
      ],
      characters: [
        { id: 'char_1', role: '天台狙击手', pose: 'look_over_edge', slot_id: 'roof_char_1', position: [-3.2, 12.0, 4.5], rotation_y_deg: 180 },
      ],
      camera: {
        intent_label: '低角度推近天台掩体后的角色',
        aspect_ratio: '2.39:1',
        keyframes: [
          { time: 0, position: [-9, 14.8, 10], target: [0, 13.0, -2], focal_length: 28 },
          { time: 2.5, position: [0, 13.9, 9.5], target: [0, 13.1, -6], focal_length: 50 },
          { time: 5, position: [2.2, 13.7, 1.0], target: [-3.2, 13.3, 4.5], focal_length: 65 },
        ],
      },
    },
  },
};

export function getTemplateById(id: SceneTemplateId): SceneTemplateDefinition {
  return SCENE_TEMPLATES[id] || SCENE_TEMPLATES.street;
}

const CHINESE_NUM_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
};

export function parseRequestedCount(token: string): number {
  const digit = token.match(/\d+/);
  if (digit) {
    return Math.max(1, Math.min(8, Number(digit[0])));
  }
  for (const [k, v] of Object.entries(CHINESE_NUM_MAP)) {
    if (token.includes(k)) return v;
  }
  return 1;
}

export function inferDslTypeFromToken(token: string): DSLObjectType | 'character' | 'lighting' {
  const t = token.toLowerCase();
  if (/角色|人物|特工|主角|守卫|哨兵|狙击手|杀手|敌人|对手|巡逻者|人|持枪|蹲伏|奔跑/.test(t)) {
    return 'character';
  }
  if (/大雾|迷雾|雾|黄昏|夕阳|夜|暴雨/.test(t)) {
    return 'lighting';
  }
  if (/安全屋|两层建筑|可进入建筑|hero/.test(t)) return 'hero_compound';
  if (/大厦|大楼|建筑|楼房|厂房|仓库|民居|商场|building|warehouse|tower/.test(t)) return 'building';
  if (/立柱|柱子|石柱|pillar|column/.test(t)) return 'pillar';
  if (/高台|平台|看台|废墟大厅|platform/.test(t)) return 'floor';
  if (/斜坡|坡道|ramp/.test(t)) return 'ramp';
  if (/台阶|楼梯|stairs/.test(t)) return 'stairs';
  if (/汽车|警车|卡车|越野车|轿车|车辆|车队|车|vehicle|car|truck/.test(t)) return 'vehicle';
  if (/防撞墩|路障|水泥墩|护栏|barrier/.test(t)) return 'barrier';
  if (/货箱|集装箱|木箱|补给箱|箱子|crate|cargo|container/.test(t)) return 'crate';
  if (/门框|门洞|入口|大门|doorway|gate/.test(t)) return 'doorway';
  if (/墙|wall/.test(t)) return 'wall';
  if (/树|乔木|灌木|森林|行道树|tree|bush/.test(t)) return 'tree';
  if (/路灯|街灯|lamp|streetlight/.test(t)) return 'lamp';
  if (/桌|table/.test(t)) return 'table';
  if (/角色|人物|特工|主角|守卫|哨兵|狙击手|杀手|敌人|对手|巡逻者|行人|士兵|队员|人|持枪|蹲伏|奔跑|对峙/.test(t)) {
    return 'character';
  }
  return 'crate';
}

function inferPoseFromIntent(intent: IntentSummary): PosePreset {
  const text = `${intent.must_have.join(' ')} ${intent.layout}`.toLowerCase();
  if (/蹲伏|掩体/.test(text)) return 'crouch_cover';
  if (/持枪|瞄准|对峙/.test(text)) return 'aim';
  if (/奔跑|冲刺/.test(text)) return 'run';
  if (/走|潜入|进入/.test(text)) return 'walk';
  if (/坐/.test(text)) return 'sit';
  if (/靠墙/.test(text)) return 'lean_wall';
  if (/俯瞰|天台|探头/.test(text)) return 'look_over_edge';
  return 'idle';
}

function isTokenForbidden(label: string, forbidden: string[]): boolean {
  const lower = label.toLowerCase();
  return forbidden.some((f) => f && lower.includes(f.toLowerCase()));
}

/**
 * Deterministic baseline builder used for Step 4 fallback (and template slot grounding).
 * Strictly obeys template geometry, satisfies `must_have` counts, and omits `forbidden` items.
 */
export function buildTemplateBaselineDsl(
  intent: IntentSummary,
  templateId: SceneTemplateId
): SceneDSL {
  const tpl = getTemplateById(templateId);
  const objects: DSLObjectNode[] = [];
  const characters: DSLCharacterNode[] = [];
  const usedSlotIds = new Set<string>();

  const pickSlotForType = (type: DSLObjectType): TemplateSlot | null => {
    const keywordMatch = (s: TemplateSlot): boolean => {
      if (usedSlotIds.has(s.slot_id)) return false;
      if (type === 'pillar') return s.slot_id.includes('pillar');
      if (type === 'floor') return s.slot_id.includes('platform') || s.slot_id.includes('floor') || s.slot_id.includes('deck');
      if (type === 'ramp') return s.slot_id.includes('ramp');
      if (type === 'stairs') return s.slot_id.includes('stair');
      if (type === 'doorway') return s.slot_id.includes('door');
      if (type === 'table') return s.slot_id.includes('table');
      if (type === 'wall') return s.slot_id.includes('wall') || s.slot_id.includes('parapet');
      if (type === 'vehicle') return s.category === 'vehicle';
      if (type === 'barrier') return s.slot_id.includes('barrier');
      if (type === 'lamp') return s.slot_id.includes('lamp');
      if (type === 'tree' || type === 'bush') return s.category === 'nature';
      if (type === 'hero_compound') return s.slot_id.includes('hero');
      if (type === 'building') return s.slot_id.includes('bldg');
      return s.slot_id.includes('crate') || s.category === 'cover';
    };
    const exact = tpl.slots.find(keywordMatch);
    if (exact) return exact;
    return tpl.slots.find((s) => !usedSlotIds.has(s.slot_id) && s.category !== 'character') || null;
  };

  // Seed core template floor/structure slots unless forbidden
  for (const s of tpl.slots) {
    if (s.category === 'character') continue;
    if (isTokenForbidden(s.label, intent.forbidden)) continue;
    if (s.slot_id.includes('platform') || s.slot_id.includes('floor') || s.slot_id.includes('deck') || s.slot_id.includes('bldg')) {
      usedSlotIds.add(s.slot_id);
      const inferredType: DSLObjectType =
        s.slot_id.includes('bldg') ? 'building' :
        s.slot_id.includes('hero') ? 'hero_compound' : 'floor';
      objects.push({
        id: `tpl_${s.slot_id}`,
        name: s.label,
        type: inferredType,
        slot_id: s.slot_id,
        position: [...s.position],
        rotation_y_deg: s.rotation_y_deg,
        scale: [...s.scale],
        floors: inferredType === 'building' ? Math.max(2, Math.round(s.scale[1] / 3.6)) : inferredType === 'hero_compound' ? 2 : null,
      });
    }
  }

  // Ensure every must_have token is satisfied explicitly
  let extraCharCount = 0;
  for (const token of intent.must_have) {
    const kind = inferDslTypeFromToken(token);
    if (kind === 'lighting') continue;
    const count = parseRequestedCount(token);

    if (kind === 'character') {
      extraCharCount = Math.max(extraCharCount, count);
      continue;
    }

    const existingOfType = objects.filter((o) => o.type === kind).length;
    const need = Math.max(0, count - existingOfType);
    for (let i = 0; i < need; i++) {
      const slot = pickSlotForType(kind);
      if (slot) {
        usedSlotIds.add(slot.slot_id);
        objects.push({
          id: `must_${kind}_${objects.length + 1}`,
          name: i === 0 ? token : `${token}_${i + 1}`,
          type: kind,
          slot_id: slot.slot_id,
          position: [...slot.position],
          rotation_y_deg: slot.rotation_y_deg,
          scale: kind === 'lamp' || kind === 'vehicle' ? null : [...slot.scale],
          floors: kind === 'building' ? 4 : kind === 'hero_compound' ? 2 : null,
        });
      } else {
        // Fallback deterministic non-overlapping side offset inside walkableBounds
        const idx = objects.length;
        const baseY = tpl.id === 'rooftop' ? 12.0 : 0;
        const px = Number(((idx % 2 === 0 ? -1 : 1) * (4.5 + (idx % 4) * 2.4)).toFixed(2));
        const pz = Number((-14 + idx * 3.8).toFixed(2));
        objects.push({
          id: `must_${kind}_${objects.length + 1}`,
          name: i === 0 ? token : `${token}_${i + 1}`,
          type: kind,
          slot_id: null,
          position: [px, baseY, pz],
          rotation_y_deg: 0,
          scale: kind === 'pillar' ? [1.2, 5.5, 1.2] : kind === 'table' ? [3.2, 0.9, 1.6] : [1.8, 1.4, 1.8],
          floors: kind === 'building' ? 3 : null,
        });
      }
    }
  }

  // Characters
  const charSlots = tpl.slots.filter((s) => s.category === 'character');
  const totalChars = Math.max(extraCharCount, charSlots.length > 0 ? 1 : 0);
  const defaultPose = inferPoseFromIntent(intent);
  for (let i = 0; i < totalChars; i++) {
    const slot = charSlots[i % Math.max(1, charSlots.length)];
    const px = slot ? slot.position[0] + (i >= charSlots.length ? (i % 2 === 0 ? -1.8 : 1.8) : 0) : (i % 2 === 0 ? -2 : 2);
    const py = slot ? slot.position[1] : tpl.id === 'rooftop' ? 12 : 0;
    const pz = slot ? slot.position[2] : i * 2;
    characters.push({
      id: `char_${i + 1}`,
      role: i === 0 ? '主视角角色' : `角色_${i + 1}`,
      pose: i === 0 ? defaultPose : defaultPose === 'crouch_cover' ? 'aim' : 'idle',
      slot_id: slot ? slot.slot_id : null,
      position: [px, py, pz],
      rotation_y_deg: slot ? slot.rotation_y_deg : 0,
    });
  }

  // Lighting mapped from style
  const lighting: DSLLightingConfig = { ...tpl.defaultLighting };
  const styleText = `${intent.style} ${intent.must_have.join(' ')}`.toLowerCase();
  if (styleText) {
    lighting.style_label = intent.style || tpl.defaultLighting.style_label;
  }
  if (/大雾|迷雾|雾|fog|mist/.test(styleText)) {
    lighting.fog_density = 0.018;
  } else if (/晴朗|正午|烈日|noon/.test(styleText)) {
    lighting.fog_density = 0.003;
    lighting.sun_elevation = 58;
  }
  if (/黄昏|夕阳|日落|sunset|dusk/.test(styleText)) {
    lighting.sun_azimuth = 45;
    lighting.sun_elevation = 14;
  } else if (/夜|黑夜|深夜|night/.test(styleText)) {
    lighting.sun_azimuth = 225;
    lighting.sun_elevation = 12;
  }

  // Camera keyframes derived from template's collision-free cameraSlots
  const camSlots = tpl.cameraSlots;
  const keyframes = camSlots.map((c, idx) => ({
    time: Number((idx * 2.5).toFixed(2)),
    position: [...c.position] as [number, number, number],
    target: [...c.target] as [number, number, number],
    focal_length: c.focal_length,
  }));

  const aspect: AspectRatio = '2.39:1';
  return {
    template_id: tpl.id,
    lighting,
    objects,
    characters,
    camera: {
      intent_label: intent.camera_intent || `${tpl.name}标准推进镜头`,
      aspect_ratio: aspect,
      keyframes,
    },
  };
}
