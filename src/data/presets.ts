import type {
  AspectRatio,
  JointName,
  JointRotations,
  PosePreset,
  PropType,
  Vec3,
} from '../types/scene';

export function focalLengthToFov(mm: number): number {
  const clamped = Math.max(14, Math.min(135, mm));
  return (2 * Math.atan(24 / (2 * clamped)) * 180) / Math.PI;
}

export function getExportResolution(aspectRatio: AspectRatio): {
  width: number;
  height: number;
} {
  switch (aspectRatio) {
    case '2.39:1':
      return { width: 1280, height: 536 };
    case '9:16':
      return { width: 720, height: 1280 };
    case '16:9':
    default:
      return { width: 1280, height: 720 };
  }
}

export function getAspectNumeric(aspectRatio: AspectRatio): number {
  switch (aspectRatio) {
    case '2.39:1':
      return 2.39;
    case '9:16':
      return 9 / 16;
    case '16:9':
    default:
      return 16 / 9;
  }
}

export interface PropCatalogItem {
  type: PropType;
  label: string;
  labelEn: string;
  baseSize: Vec3;
  description: string;
  descriptionEn: string;
}

export const PROP_CATALOG: PropCatalogItem[] = [
  { type: 'road', label: '道路 Road', labelEn: 'Road', baseSize: [10, 0.2, 12], description: '道路模块与交通设施', descriptionEn: 'Modular road & transit kits' },
  { type: 'wall', label: '墙体 Wall', labelEn: 'Wall', baseSize: [4, 3, 0.3], description: '4m × 3m 隔断墙体', descriptionEn: '4m x 3m partition & facade walls' },
  { type: 'floor', label: '地板 Floor', labelEn: 'Floor', baseSize: [6, 0.2, 6], description: '6m × 6m 楼板平台', descriptionEn: '6m x 6m deck & floor slabs' },
  { type: 'stairs', label: '楼梯 Stairs', labelEn: 'Stairs', baseSize: [2, 2, 3], description: '8 级台阶', descriptionEn: 'Flight of stairs & steps' },
  { type: 'ramp', label: '斜坡 Ramp', labelEn: 'Ramp', baseSize: [2, 1.5, 3], description: '斜坡通道', descriptionEn: 'Access & vehicle ramps' },
  { type: 'doorway', label: '门框 Doorway', labelEn: 'Doorway', baseSize: [4, 3, 0.35], description: '带门洞墙体', descriptionEn: 'Portal frames & gates' },
  { type: 'pillar', label: '立柱 Pillar', labelEn: 'Pillar', baseSize: [0.6, 3.5, 0.6], description: '倒角承重柱', descriptionEn: 'Structural columns & piers' },
  { type: 'crate', label: '货箱 Crate', labelEn: 'Crate', baseSize: [1.1, 1.1, 1.1], description: '托盘货箱掩体', descriptionEn: 'Pallets, crates & containers' },
  { type: 'building', label: '楼房 Building', labelEn: 'Building', baseSize: [4, 9, 4], description: '复合多层楼房', descriptionEn: 'Multi-story buildings & keeps' },
  { type: 'roof', label: '顶棚 Roof', labelEn: 'Roof', baseSize: [6, 0.25, 6], description: '屋顶/天花板', descriptionEn: 'Roofs, canopies & skylights' },
  { type: 'barrier', label: '防撞墩 Barrier', labelEn: 'Barrier', baseSize: [2.5, 1.0, 0.4], description: '护栏与阻隔设施', descriptionEn: 'Barricades, fences & cover' },
  { type: 'table', label: '桌台 Table', labelEn: 'Table', baseSize: [1.8, 0.78, 0.9], description: '桌台与工作台', descriptionEn: 'Tables, benches & desks' },
  { type: 'furniture', label: '家居 Furniture', labelEn: 'Furniture', baseSize: [2.0, 1.0, 1.8], description: '室内家具与生活陈设', descriptionEn: 'Interior seating & furnishings' },
  { type: 'vehicle', label: '汽车 Vehicle', labelEn: 'Vehicle', baseSize: [2.0, 1.5, 4.4], description: '陆海空载具库存', descriptionEn: 'Land, sea & air vehicles' },
  { type: 'lamp', label: '路灯 Lamp', labelEn: 'Lamp', baseSize: [0.4, 4.2, 1.0], description: '街灯信号灯与片场灯光', descriptionEn: 'Streetlamps & studio fixtures' },
  { type: 'tree', label: '乔木 Tree', labelEn: 'Tree', baseSize: [1.8, 3.8, 1.8], description: '树木植物与绿篱', descriptionEn: 'Trees, palms & hedges' },
  { type: 'rock', label: '岩石 Rock', labelEn: 'Rock', baseSize: [2.2, 1.5, 2.0], description: '自然风化岩石块', descriptionEn: 'Boulders, cliffs & formations' },
  { type: 'creature', label: '生物 Creature', labelEn: 'Creature', baseSize: [1.4, 1.3, 2.2], description: '家畜飞禽、海兽野生动物与奇幻科幻生物', descriptionEn: 'Animals, mounts & mythic creatures' },
  { type: 'facility', label: '设施 Facility', labelEn: 'Facility', baseSize: [3.2, 3.5, 3.2], description: '影视片场器材与工业设施', descriptionEn: 'Film rigs & industrial infrastructure' },
  { type: 'scene_prop', label: '道具 Prop', labelEn: 'Prop', baseSize: [1.5, 2.0, 1.5], description: '商街/公园/营地景物道具', descriptionEn: 'Street & set dressing props' },
  { type: 'box', label: '体块 Box', labelEn: 'Box', baseSize: [1, 1, 1], description: '通用几何体块', descriptionEn: 'Architectural massing blocks' },
];

export const JOINT_LABELS: Record<JointName, string> = {
  pelvis: '骨盆 Pelvis',
  lowerSpine: '下脊柱 L-Spine',
  chest: '胸腔 Chest',
  neck: '颈部 Neck',
  head: '头部 Head',
  leftUpperArm: '左大臂 L-UpperArm',
  leftForearm: '左小臂 L-Forearm',
  leftHand: '左手掌 L-Hand',
  rightUpperArm: '右大臂 R-UpperArm',
  rightForearm: '右小臂 R-Forearm',
  rightHand: '右手掌 R-Hand',
  leftThigh: '左大腿 L-Thigh',
  leftShin: '左小腿 L-Shin',
  leftBoot: '左鞋靴 L-Boot',
  rightThigh: '右大腿 R-Thigh',
  rightShin: '右小腿 R-Shin',
  rightBoot: '右鞋靴 R-Boot',
};

const ZERO_JOINTS: JointRotations = {
  pelvis: [0, 0, 0],
  lowerSpine: [0, 0, 0],
  chest: [0, 0, 0],
  neck: [0, 0, 0],
  head: [0, 0, 0],
  leftUpperArm: [0.05, 0, 0.14],
  leftForearm: [-0.18, 0, 0],
  leftHand: [0, 0, 0],
  rightUpperArm: [-0.04, 0, -0.14],
  rightForearm: [-0.18, 0, 0],
  rightHand: [0, 0, 0],
  leftThigh: [0, 0, 0],
  leftShin: [0, 0, 0],
  leftBoot: [0, 0, 0],
  rightThigh: [0, 0, 0],
  rightShin: [0, 0, 0],
  rightBoot: [0, 0, 0],
};

export interface PosePresetConfig {
  label: string;
  pelvisOffsetY: number;
  joints: JointRotations;
}

export const POSE_PRESETS: Record<PosePreset, PosePresetConfig> = {
  idle: {
    label: '站立 Idle',
    pelvisOffsetY: 0,
    joints: { ...ZERO_JOINTS },
  },
  walk: {
    label: '行走 Walk',
    pelvisOffsetY: -0.02,
    joints: {
      ...ZERO_JOINTS,
      pelvis: [0.04, 0.06, 0],
      lowerSpine: [0.05, -0.05, 0],
      chest: [0.04, -0.06, 0],
      leftUpperArm: [-0.38, 0, 0.12],
      leftForearm: [-0.35, 0, 0],
      rightUpperArm: [0.35, 0, -0.12],
      rightForearm: [-0.28, 0, 0],
      leftThigh: [0.35, 0, 0],
      leftShin: [0.22, 0, 0],
      leftBoot: [-0.15, 0, 0],
      rightThigh: [-0.32, 0, 0],
      rightShin: [0.18, 0, 0],
      rightBoot: [0.15, 0, 0],
    },
  },
  run: {
    label: '奔跑 Run',
    pelvisOffsetY: -0.07,
    joints: {
      ...ZERO_JOINTS,
      pelvis: [0.16, 0, 0],
      lowerSpine: [0.12, 0.08, 0],
      chest: [0.14, 0.1, 0],
      neck: [-0.1, -0.05, 0],
      head: [-0.12, -0.05, 0],
      leftUpperArm: [-0.85, 0, 0.18],
      leftForearm: [-1.25, 0, 0],
      rightUpperArm: [0.75, 0, -0.18],
      rightForearm: [-1.15, 0, 0],
      leftThigh: [0.78, 0, 0],
      leftShin: [0.88, 0, 0],
      leftBoot: [-0.25, 0, 0],
      rightThigh: [-0.65, 0, 0],
      rightShin: [0.55, 0, 0],
      rightBoot: [0.2, 0, 0],
    },
  },
  crouch_cover: {
    label: '蹲伏掩体 Crouch',
    pelvisOffsetY: -0.25,
    joints: {
      ...ZERO_JOINTS,
      pelvis: [0.2, 0.15, 0],
      lowerSpine: [0.18, -0.05, 0],
      chest: [0.2, -0.08, 0],
      neck: [-0.18, 0.1, 0],
      head: [-0.18, 0.1, 0],
      leftUpperArm: [-0.55, 0.25, 0.3],
      leftForearm: [-1.1, 0, 0],
      rightUpperArm: [-0.65, -0.2, -0.25],
      rightForearm: [-1.2, 0, 0],
      leftThigh: [-1.05, 0.15, 0],
      leftShin: [1.55, 0, 0],
      leftBoot: [-0.45, 0, 0],
      rightThigh: [-0.85, -0.15, 0],
      rightShin: [1.45, 0, 0],
      rightBoot: [-0.35, 0, 0],
    },
  },
  aim: {
    label: '持械瞄准 Aim',
    pelvisOffsetY: -0.04,
    joints: {
      ...ZERO_JOINTS,
      pelvis: [0.06, -0.28, 0],
      lowerSpine: [0.06, 0.14, 0],
      chest: [0.06, 0.16, 0],
      neck: [-0.04, 0.06, 0],
      head: [-0.04, 0.06, 0],
      leftUpperArm: [-1.35, 0.42, 0.12],
      leftForearm: [-0.55, 0.25, 0],
      rightUpperArm: [-1.38, -0.12, -0.1],
      rightForearm: [-0.45, -0.2, 0],
      leftThigh: [-0.18, 0.1, 0.05],
      leftShin: [0.22, 0, 0],
      rightThigh: [0.2, -0.12, -0.05],
      rightShin: [0.14, 0, 0],
    },
  },
  sit: {
    label: '坐姿 Sit',
    pelvisOffsetY: -0.35,
    joints: {
      ...ZERO_JOINTS,
      pelvis: [-0.08, 0, 0],
      lowerSpine: [0.05, 0, 0],
      chest: [0.05, 0, 0],
      leftUpperArm: [-0.3, 0, 0.15],
      leftForearm: [-0.75, 0, 0],
      rightUpperArm: [-0.3, 0, -0.15],
      rightForearm: [-0.75, 0, 0],
      leftThigh: [-1.45, 0.08, 0],
      leftShin: [1.45, 0, 0],
      rightThigh: [-1.45, -0.08, 0],
      rightShin: [1.45, 0, 0],
    },
  },
  lean_wall: {
    label: '靠墙警戒 Lean',
    pelvisOffsetY: -0.03,
    joints: {
      ...ZERO_JOINTS,
      pelvis: [-0.1, 0.25, -0.08],
      lowerSpine: [-0.08, -0.12, 0.06],
      chest: [-0.05, -0.14, 0.08],
      neck: [0.06, 0.35, 0],
      head: [0.04, 0.35, 0],
      leftUpperArm: [-0.45, 0.2, 0.2],
      leftForearm: [-1.25, 0, 0],
      rightUpperArm: [0.1, -0.1, -0.22],
      rightForearm: [-0.85, 0, 0],
      leftThigh: [-0.18, 0.1, 0.06],
      leftShin: [0.24, 0, 0],
      rightThigh: [0.18, -0.1, -0.05],
      rightShin: [0.12, 0, 0],
    },
  },
  look_over_edge: {
    label: '俯瞰侦察 Lookout',
    pelvisOffsetY: -0.08,
    joints: {
      ...ZERO_JOINTS,
      pelvis: [0.22, 0, 0],
      lowerSpine: [0.22, 0, 0],
      chest: [0.22, 0, 0],
      neck: [0.15, 0, 0],
      head: [0.15, 0, 0],
      leftUpperArm: [-0.65, 0, 0.22],
      leftForearm: [-0.55, 0, 0],
      rightUpperArm: [-0.65, 0, -0.22],
      rightForearm: [-0.55, 0, 0],
      leftThigh: [-0.25, 0.08, 0.04],
      leftShin: [0.35, 0, 0],
      rightThigh: [0.15, -0.08, -0.04],
      rightShin: [0.2, 0, 0],
    },
  },
};

export function cloneJoints(joints: JointRotations): JointRotations {
  const out = {} as JointRotations;
  (Object.keys(ZERO_JOINTS) as JointName[]).forEach((k) => {
    out[k] = [...(joints[k] ?? ZERO_JOINTS[k])];
  });
  return out;
}

/**
 * Given a mixed "中文 English" label (e.g. "骨盆 Pelvis", "站立 Idle"),
 * return only the English token when language === 'en'.
 */
export function formatPresetLabel(mixedLabel: string, lang: 'zh' | 'en'): string {
  if (lang !== 'en') return mixedLabel;
  const idx = mixedLabel.indexOf(' ');
  return idx >= 0 ? mixedLabel.slice(idx + 1).trim() : mixedLabel;
}
