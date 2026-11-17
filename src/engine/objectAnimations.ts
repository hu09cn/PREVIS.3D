import * as THREE from 'three';
import type {
  ObjectAnimationPreset,
  ObjectAnimationSpec,
  PropType,
} from '../types/scene';

export interface ObjectAnimationPresetMeta {
  id: ObjectAnimationPreset;
  label: string;
  labelEn: string;
  shortDesc: string;
  shortDescEn: string;
  category: 'universal' | 'tree' | 'rock' | 'vehicle' | 'facility';
  defaultDuration: number;
  supportsDirection?: boolean;
  supportsLoop?: boolean;
  defaultLoop?: boolean;
  usesShards?: boolean;
}

export const OBJECT_ANIMATION_PRESETS: Record<
  ObjectAnimationPreset,
  ObjectAnimationPresetMeta
> = {
  none: {
    id: 'none',
    label: '无动画',
    labelEn: 'None',
    shortDesc: '保持静止',
    shortDescEn: 'Keep static',
    category: 'universal',
    defaultDuration: 1.0,
  },
  tree_fall: {
    id: 'tree_fall',
    label: '树木倒下',
    labelEn: 'Tree Fall',
    shortDesc: '根部断裂并重重倒地回弹',
    shortDescEn: 'Snap at base and crash to the ground',
    category: 'tree',
    defaultDuration: 1.4,
    supportsDirection: true,
  },
  tree_sway: {
    id: 'tree_sway',
    label: '风吹摇曳',
    labelEn: 'Wind Sway',
    shortDesc: '随风自然摆动',
    shortDescEn: 'Gentle continuous wind sway',
    category: 'tree',
    defaultDuration: 2.2,
    supportsDirection: true,
    supportsLoop: true,
    defaultLoop: true,
  },
  tree_uproot: {
    id: 'tree_uproot',
    label: '连根拔起',
    labelEn: 'Uproot Topple',
    shortDesc: '震动拔起并斜向掀翻',
    shortDescEn: 'Shake, uproot, and topple over',
    category: 'tree',
    defaultDuration: 1.3,
    supportsDirection: true,
    usesShards: true,
  },
  rock_shatter: {
    id: 'rock_shatter',
    label: '突然炸开',
    labelEn: 'Rock Shatter',
    shortDesc: '碎石四溅爆裂散落地面',
    shortDescEn: 'Explode into flying debris shards',
    category: 'rock',
    defaultDuration: 1.5,
    usesShards: true,
  },
  rock_roll: {
    id: 'rock_roll',
    label: '滚落翻滚',
    labelEn: 'Boulder Roll',
    shortDesc: '沿方向向前翻滚移动',
    shortDescEn: 'Roll forward along facing direction',
    category: 'rock',
    defaultDuration: 1.8,
    supportsDirection: true,
  },
  rock_rise: {
    id: 'rock_rise',
    label: '破土升起',
    labelEn: 'Erupt Upward',
    shortDesc: '伴随震动从地面隆起',
    shortDescEn: 'Quake and burst up from the earth',
    category: 'rock',
    defaultDuration: 1.3,
    usesShards: true,
  },
  vehicle_drive: {
    id: 'vehicle_drive',
    label: '向前行驶',
    labelEn: 'Drive Forward',
    shortDesc: '加速前冲并带车身微振',
    shortDescEn: 'Accelerate forward with chassis rumble',
    category: 'vehicle',
    defaultDuration: 2.0,
    supportsDirection: true,
    supportsLoop: true,
  },
  vehicle_brake_stop: {
    id: 'vehicle_brake_stop',
    label: '急刹停靠',
    labelEn: 'Hard Brake Stop',
    shortDesc: '冲入后点头急停回稳',
    shortDescEn: 'Dash in and slam brakes with pitch dip',
    category: 'vehicle',
    defaultDuration: 1.5,
    supportsDirection: true,
  },
  vehicle_flip: {
    id: 'vehicle_flip',
    label: '爆炸掀翻',
    labelEn: 'Blast Flip',
    shortDesc: '腾空侧翻落地并溅起碎屑',
    shortDescEn: 'Launch airborne, barrel-roll, and scatter debris',
    category: 'vehicle',
    defaultDuration: 1.6,
    supportsDirection: true,
    usesShards: true,
  },
  lamp_flicker: {
    id: 'lamp_flicker',
    label: '故障闪烁',
    labelEn: 'Fault Flicker',
    shortDesc: '电流不稳明暗闪动/轻晃',
    shortDescEn: 'Unstable power surge flicker and tremor',
    category: 'facility',
    defaultDuration: 1.8,
    supportsLoop: true,
    defaultLoop: true,
  },
  crate_scatter: {
    id: 'crate_scatter',
    label: '爆裂四散',
    labelEn: 'Burst Scatter',
    shortDesc: '部件受击炸开弹飞散落',
    shortDescEn: 'Shatter outward on impact',
    category: 'facility',
    defaultDuration: 1.4,
    usesShards: true,
  },
  door_slide_open: {
    id: 'door_slide_open',
    label: '滑开/破门',
    labelEn: 'Slide / Breach',
    shortDesc: '向侧方平稳滑开或开启',
    shortDescEn: 'Slide open smoothly to the side',
    category: 'facility',
    defaultDuration: 1.1,
    supportsDirection: true,
  },
  pop_in: {
    id: 'pop_in',
    label: '弹跳出现',
    labelEn: 'Pop In',
    shortDesc: '在触发时刻弹性放大出现',
    shortDescEn: 'Elastic scale-in pop at trigger time',
    category: 'universal',
    defaultDuration: 0.7,
  },
  collapse_sink: {
    id: 'collapse_sink',
    label: '坍塌下沉',
    labelEn: 'Collapse Sink',
    shortDesc: '剧烈晃动后沉入地面消失',
    shortDescEn: 'Shake violently and sink into ground',
    category: 'universal',
    defaultDuration: 1.4,
    usesShards: true,
  },
  shake_impact: {
    id: 'shake_impact',
    label: '受击震动',
    labelEn: 'Impact Shake',
    shortDesc: '冲击震颤后恢复稳定',
    shortDescEn: 'Jolt on impact then settle steady',
    category: 'universal',
    defaultDuration: 0.85,
  },
  float_hover: {
    id: 'float_hover',
    label: '悬浮呼吸',
    labelEn: 'Float Hover',
    shortDesc: '轻盈上下起伏漂浮',
    shortDescEn: 'Gentle vertical levitation bob',
    category: 'universal',
    defaultDuration: 2.2,
    supportsLoop: true,
    defaultLoop: true,
  },
  spin_turntable: {
    id: 'spin_turntable',
    label: '匀速旋转',
    labelEn: 'Turntable Spin',
    shortDesc: '绕垂直轴展示旋转',
    shortDescEn: 'Steady 360° vertical-axis spin',
    category: 'universal',
    defaultDuration: 3.0,
    supportsLoop: true,
    defaultLoop: true,
  },
};

export function getAvailableAnimationsForObject(
  kind: 'asset' | 'building' | 'hero_compound' | 'custom_model' | 'gltf_model',
  propType?: PropType
): ObjectAnimationPresetMeta[] {
  const pushUnique = (ids: ObjectAnimationPreset[]) =>
    ids.map((id) => OBJECT_ANIMATION_PRESETS[id]);

  if (kind === 'asset') {
    switch (propType) {
      case 'tree':
        return pushUnique([
          'none',
          'tree_fall',
          'tree_sway',
          'tree_uproot',
          'pop_in',
          'shake_impact',
          'collapse_sink',
        ]);
      case 'rock':
        return pushUnique([
          'none',
          'rock_shatter',
          'rock_roll',
          'rock_rise',
          'pop_in',
          'shake_impact',
          'float_hover',
        ]);
      case 'creature':
        return pushUnique([
          'none',
          'pop_in',
          'float_hover',
          'shake_impact',
          'spin_turntable',
          'tree_fall',
          'collapse_sink',
        ]);
      case 'vehicle':
        return pushUnique([
          'none',
          'vehicle_drive',
          'vehicle_brake_stop',
          'vehicle_flip',
          'shake_impact',
          'pop_in',
          'spin_turntable',
        ]);
      case 'lamp':
        return pushUnique([
          'none',
          'lamp_flicker',
          'tree_fall',
          'crate_scatter',
          'pop_in',
          'shake_impact',
          'collapse_sink',
        ]);
      case 'doorway':
      case 'wall':
      case 'barrier':
        return pushUnique([
          'none',
          'door_slide_open',
          'crate_scatter',
          'collapse_sink',
          'rock_rise',
          'shake_impact',
          'pop_in',
        ]);
      case 'crate':
      case 'box':
      case 'table':
      case 'furniture':
      case 'facility':
      case 'scene_prop':
        return pushUnique([
          'none',
          'crate_scatter',
          'pop_in',
          'shake_impact',
          'float_hover',
          'spin_turntable',
          'collapse_sink',
        ]);
      default:
        return pushUnique([
          'none',
          'pop_in',
          'crate_scatter',
          'shake_impact',
          'collapse_sink',
          'float_hover',
          'spin_turntable',
        ]);
    }
  }

  if (kind === 'building' || kind === 'hero_compound') {
    return pushUnique([
      'none',
      'rock_rise',
      'collapse_sink',
      'shake_impact',
      'pop_in',
      'crate_scatter',
      'spin_turntable',
    ]);
  }

  // custom_model / gltf_model: give rich selection
  return pushUnique([
    'none',
    'pop_in',
    'crate_scatter',
    'rock_shatter',
    'tree_fall',
    'vehicle_drive',
    'float_hover',
    'spin_turntable',
    'shake_impact',
    'collapse_sink',
  ]);
}

export function hashStringSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function seededRand(seed: number, salt: number): number {
  const x = Math.sin(seed * 9301.37 + salt * 49297.13 + 233.17) * 43758.5453;
  return x - Math.floor(x);
}

export interface EvaluatedObjectAnimation {
  active: boolean;
  posOffset: [number, number, number];
  rotEuler: [number, number, number];
  scaleMul: [number, number, number];
  /** 0..1 normalized burst progress for part scatter & shards */
  scatterProgress: number;
  /** Visibility factor (0..1) used by lamp_flicker */
  flickerVisible: boolean;
  /** Emissive intensity boost during bursts or flickers */
  flashBoost: number;
  /** Elapsed time after trigger in seconds */
  elapsedAfterTrigger: number;
}

const _tmpAxis = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpEuler = new THREE.Euler();

function axisAngleToEuler(
  ax: number,
  ay: number,
  az: number,
  angle: number
): [number, number, number] {
  if (Math.abs(angle) < 1e-6) return [0, 0, 0];
  _tmpAxis.set(ax, ay, az).normalize();
  _tmpQuat.setFromAxisAngle(_tmpAxis, angle);
  _tmpEuler.setFromQuaternion(_tmpQuat, 'XYZ');
  return [_tmpEuler.x, _tmpEuler.y, _tmpEuler.z];
}

function easeOutBack(x: number): number {
  const c1 = 1.7;
  const c3 = c1 + 1;
  const p = x - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

export function evaluateObjectAnimationTransform(
  anim: ObjectAnimationSpec | undefined,
  time: number,
  seed: number,
  baseHeightM = 2.0
): EvaluatedObjectAnimation {
  const identity: EvaluatedObjectAnimation = {
    active: false,
    posOffset: [0, 0, 0],
    rotEuler: [0, 0, 0],
    scaleMul: [1, 1, 1],
    scatterProgress: 0,
    flickerVisible: true,
    flashBoost: 0,
    elapsedAfterTrigger: 0,
  };

  if (!anim || anim.preset === 'none') return identity;

  const trigger = Math.max(0, anim.triggerTime ?? 0);
  const duration = Math.max(0.25, anim.duration ?? 1.2);
  const intensity = THREE.MathUtils.clamp(anim.intensity ?? 1.0, 0.2, 2.5);
  const dirRad = ((anim.directionDeg ?? 0) * Math.PI) / 180;
  const dirX = Math.sin(dirRad);
  const dirZ = Math.cos(dirRad);
  // Tilt axis perpendicular to (dirX, 0, dirZ) so positive angle tips object toward (dirX, 0, dirZ)
  const tiltAxisX = dirZ;
  const tiltAxisZ = -dirX;

  const rawElapsed = time - trigger;
  if (rawElapsed < 0) {
    // pop_in & rock_rise wait hidden/submerged before triggerTime
    if (anim.preset === 'pop_in') {
      return {
        ...identity,
        active: true,
        scaleMul: [0.001, 0.001, 0.001],
      };
    }
    if (anim.preset === 'rock_rise') {
      return {
        ...identity,
        active: true,
        posOffset: [0, -Math.max(1.2, baseHeightM * 0.9), 0],
        scaleMul: [0.85, 0.85, 0.85],
      };
    }
    return identity;
  }

  const loop = Boolean(anim.loop);
  const elapsed =
    loop && rawElapsed > 0
      ? rawElapsed % (duration + 0.35)
      : rawElapsed;
  const u = THREE.MathUtils.clamp(elapsed / duration, 0, 1);

  switch (anim.preset) {
    case 'tree_fall': {
      // Phase 1 (0..0.14): crack shudder, Phase 2 (0.14..0.85): accelerating fall to 88 deg, Phase 3 (0.85..1.0): impact bounce
      let angle = 0;
      let yDrop = 0;
      if (u < 0.14) {
        const k = u / 0.14;
        angle = Math.sin(k * Math.PI * 5) * 0.045 * intensity + k * 0.06;
      } else if (u < 0.85) {
        const k = (u - 0.14) / 0.71;
        angle = 0.06 + (k * k * k) * (1.53 - 0.06);
      } else {
        const k = (u - 0.85) / 0.15;
        const bounce = Math.abs(Math.sin(k * Math.PI)) * 0.11 * (1 - k * 0.65);
        angle = 1.53 - bounce;
      }
      // Slight ground embed at horizontal rest so trunk doesn't hover
      yDrop = -Math.sin(Math.min(1.53, angle)) * 0.16;
      // Small rebound twist on ground hit
      const rot = axisAngleToEuler(tiltAxisX, 0, tiltAxisZ, angle);
      return {
        ...identity,
        active: true,
        posOffset: [dirX * 0.12 * (angle / 1.53), yDrop, dirZ * 0.12 * (angle / 1.53)],
        rotEuler: rot,
      };
    }

    case 'tree_sway': {
      const freq = 1.8 + seed * 0.7;
      const phase = rawElapsed * freq + seed * Math.PI * 2;
      const swayAngle =
        (Math.sin(phase) * 0.09 + Math.sin(phase * 2.1) * 0.03) * intensity;
      const rot = axisAngleToEuler(tiltAxisX, 0, tiltAxisZ, swayAngle);
      return {
        ...identity,
        active: true,
        rotEuler: rot,
      };
    }

    case 'tree_uproot': {
      const k = easeOutCubic(u);
      const lift = Math.sin(Math.min(1, u * 1.15) * Math.PI) * 1.1 * intensity;
      const angle = k * 1.48;
      const hopDist = k * 1.6 * intensity;
      const rot = axisAngleToEuler(tiltAxisX, 0, tiltAxisZ, angle);
      return {
        ...identity,
        active: true,
        posOffset: [dirX * hopDist, Math.max(-0.15, lift - k * 0.12), dirZ * hopDist],
        rotEuler: rot,
        scatterProgress: u * 0.45,
      };
    }

    case 'rock_shatter': {
      // Pre-explosion crack tremor (0..0.07), then radial fragment burst
      if (u < 0.07) {
        const j = (u / 0.07) * 0.12 * intensity;
        return {
          ...identity,
          active: true,
          posOffset: [
            Math.sin(u * 290) * j,
            Math.cos(u * 310) * j * 0.5,
            Math.cos(u * 270) * j,
          ],
          scaleMul: [1 + u * 1.4, 1 + u * 1.4, 1 + u * 1.4],
          flashBoost: 0.55,
          scatterProgress: 0,
          elapsedAfterTrigger: rawElapsed,
        };
      }
      const sp = THREE.MathUtils.clamp((u - 0.07) / 0.93, 0, 1);
      return {
        ...identity,
        active: true,
        scatterProgress: sp,
        flashBoost: Math.max(0, 1 - sp * 4.5) * 0.7,
        elapsedAfterTrigger: rawElapsed,
      };
    }

    case 'rock_roll': {
      const k = u < 0.85 ? easeOutCubic(u / 0.85) : 1;
      const dist = k * 6.5 * intensity;
      const rollAngle = k * Math.PI * 3.2 * intensity;
      const hop = Math.abs(Math.sin(k * Math.PI * 3)) * 0.25 * (1 - k * 0.8);
      const rot = axisAngleToEuler(tiltAxisX, 0, tiltAxisZ, rollAngle);
      return {
        ...identity,
        active: true,
        posOffset: [dirX * dist, hop, dirZ * dist],
        rotEuler: rot,
      };
    }

    case 'rock_rise': {
      const k = easeOutBack(Math.min(1, u / 0.88));
      const startY = -Math.max(1.2, baseHeightM * 0.9);
      const tremor =
        u < 0.85
          ? Math.sin(u * 85) * 0.08 * (1 - u) * intensity
          : 0;
      const scalePop = u < 0.2 ? THREE.MathUtils.lerp(0.85, 1.0, u / 0.2) : 1.0;
      return {
        ...identity,
        active: true,
        posOffset: [tremor, THREE.MathUtils.lerp(startY, 0, Math.min(1.06, k)), -tremor],
        scaleMul: [scalePop, scalePop, scalePop],
        scatterProgress: u < 0.7 ? u * 0.5 : 0,
        elapsedAfterTrigger: rawElapsed,
      };
    }

    case 'vehicle_drive': {
      const accelT = loop ? rawElapsed : u;
      const speedPhase = loop ? rawElapsed / duration : u * u * 0.6 + u * 0.4;
      const dist = speedPhase * 12 * intensity;
      const engineVib = Math.sin(accelT * 42) * 0.015 * intensity;
      const pitchBack = -Math.min(0.06, (1 - u) * 0.05) * intensity;
      const rot = axisAngleToEuler(tiltAxisX, 0, tiltAxisZ, pitchBack);
      return {
        ...identity,
        active: true,
        posOffset: [dirX * dist, engineVib, dirZ * dist],
        rotEuler: rot,
      };
    }

    case 'vehicle_brake_stop': {
      const slide = u < 0.72 ? easeOutCubic(u / 0.72) : 1;
      const startBack = -8.0 * intensity;
      const dist = THREE.MathUtils.lerp(startBack, 0, slide);
      // Nose dive pitch when braking near u=0.55..0.95
      const divePhase =
        u > 0.48 ? Math.sin(THREE.MathUtils.clamp((u - 0.48) / 0.45, 0, 1) * Math.PI) : 0;
      const pitchAngle = divePhase * 0.14 * intensity;
      const rot = axisAngleToEuler(tiltAxisX, 0, tiltAxisZ, pitchAngle);
      return {
        ...identity,
        active: true,
        posOffset: [dirX * dist, 0, dirZ * dist],
        rotEuler: rot,
      };
    }

    case 'vehicle_flip': {
      const k = easeOutCubic(u);
      const flight = Math.sin(Math.min(1, u * 1.08) * Math.PI) * 2.6 * intensity;
      const slideDist = k * 4.2 * intensity;
      const rollAngle = k * Math.PI * 1.15;
      const rot = axisAngleToEuler(dirZ, 0.25 * k, -dirX, rollAngle);
      return {
        ...identity,
        active: true,
        posOffset: [
          dirX * slideDist,
          Math.max(0, flight) + (u > 0.8 ? 0.35 : 0),
          dirZ * slideDist,
        ],
        rotEuler: rot,
        scatterProgress: u * 0.65,
        elapsedAfterTrigger: rawElapsed,
      };
    }

    case 'lamp_flicker': {
      const tLoop = loop ? rawElapsed : u * duration;
      const hash = Math.sin(tLoop * 27.3 + seed * 11) * Math.cos(tLoop * 13.7);
      const flickerOn = hash > -0.32;
      const sway = Math.sin(tLoop * 3.1 + seed) * 0.035 * intensity;
      return {
        ...identity,
        active: true,
        rotEuler: [sway, 0, sway * 0.6],
        flickerVisible: flickerOn,
        flashBoost: flickerOn ? 0.45 : -0.45,
      };
    }

    case 'crate_scatter': {
      return {
        ...identity,
        active: true,
        scatterProgress: u,
        flashBoost: Math.max(0, 1 - u * 5) * 0.5,
        elapsedAfterTrigger: rawElapsed,
      };
    }

    case 'door_slide_open': {
      const k = easeOutCubic(u);
      // Slides perpendicular or along directionDeg
      const perpX = Math.cos(dirRad);
      const perpZ = -Math.sin(dirRad);
      const slide = k * 2.6 * intensity;
      return {
        ...identity,
        active: true,
        posOffset: [perpX * slide, 0, perpZ * slide],
      };
    }

    case 'pop_in': {
      const k = easeOutBack(u);
      const s = Math.max(0.001, k);
      return {
        ...identity,
        active: true,
        scaleMul: [s, s, s],
      };
    }

    case 'collapse_sink': {
      const shake = u < 0.35 ? Math.sin(u * 110) * 0.12 * intensity : 0;
      const sinkK = u < 0.2 ? 0 : (u - 0.2) / 0.8;
      const sinkEased = sinkK * sinkK;
      const drop = -sinkEased * Math.max(2.0, baseHeightM * 1.15) * intensity;
      const tilt = sinkEased * 0.28;
      const shrink = sinkK > 0.92 ? THREE.MathUtils.lerp(1, 0.01, (sinkK - 0.92) / 0.08) : 1;
      return {
        ...identity,
        active: true,
        posOffset: [shake, drop, -shake * 0.7],
        rotEuler: [tilt, 0, tilt * 0.6],
        scaleMul: [shrink, shrink, shrink],
        scatterProgress: sinkK * 0.5,
        elapsedAfterTrigger: rawElapsed,
      };
    }

    case 'shake_impact': {
      const decay = 1 - u;
      const amp = 0.18 * intensity * decay * decay;
      const dx = Math.sin(u * 68) * amp;
      const dz = Math.cos(u * 59) * amp;
      const rotZ = Math.sin(u * 52) * 0.08 * intensity * decay;
      return {
        ...identity,
        active: true,
        posOffset: [dx, Math.abs(dx) * 0.35, dz],
        rotEuler: [rotZ * 0.6, 0, rotZ],
      };
    }

    case 'float_hover': {
      const tUse = loop ? rawElapsed : u * duration;
      const y = (Math.sin(tUse * 2.4 + seed * 6.28) * 0.28 + 0.18) * intensity;
      const rx = Math.sin(tUse * 1.5 + seed) * 0.04 * intensity;
      const rz = Math.cos(tUse * 1.7 + seed) * 0.04 * intensity;
      return {
        ...identity,
        active: true,
        posOffset: [0, y, 0],
        rotEuler: [rx, 0, rz],
      };
    }

    case 'spin_turntable': {
      const tUse = loop ? rawElapsed : u * duration;
      const spin = (tUse / duration) * Math.PI * 2 * intensity;
      return {
        ...identity,
        active: true,
        rotEuler: [0, spin, 0],
      };
    }

    default:
      return identity;
  }
}

export interface PartScatterOffset {
  posOffset: [number, number, number];
  rotOffset: [number, number, number];
  scale: number;
}

/**
 * Deterministic radial + gravity dispersal for individual sub-parts when
 * `rock_shatter` or `crate_scatter` plays.
 */
export function evaluatePartScatter(
  anim: ObjectAnimationSpec | undefined,
  partIdx: number,
  partPos: [number, number, number],
  scatterProgress: number,
  seed: number
): PartScatterOffset {
  if (!anim || scatterProgress <= 0) {
    return { posOffset: [0, 0, 0], rotOffset: [0, 0, 0], scale: 1 };
  }
  if (anim.preset !== 'rock_shatter' && anim.preset !== 'crate_scatter') {
    return { posOffset: [0, 0, 0], rotOffset: [0, 0, 0], scale: 1 };
  }

  const intensity = THREE.MathUtils.clamp(anim.intensity ?? 1.0, 0.2, 2.5);
  const s1 = seededRand(seed + 1.3, partIdx * 17 + 3);
  const s2 = seededRand(seed + 2.7, partIdx * 29 + 7);
  const s3 = seededRand(seed + 4.1, partIdx * 41 + 11);

  const angle = s1 * Math.PI * 2;
  const baseRad = Math.hypot(partPos[0], partPos[2]);
  const radialX = baseRad > 0.05 ? partPos[0] / baseRad : Math.cos(angle);
  const radialZ = baseRad > 0.05 ? partPos[2] / baseRad : Math.sin(angle);

  const speedHoriz = (2.6 + s2 * 4.4) * intensity;
  const speedUp = (3.4 + s3 * 3.8) * intensity;
  const t = scatterProgress * Math.max(0.7, anim.duration ?? 1.2);
  const g = 11.5;

  const dx = radialX * speedHoriz * t;
  const dz = radialZ * speedHoriz * t;
  const rawDy = speedUp * t - 0.5 * g * t * t;
  // Prevent sub-parts from sinking far below local ground
  const minFloorDy = -partPos[1] + 0.08;
  const dy = Math.max(minFloorDy, rawDy);

  // Dampen spin once grounded
  const spinT = rawDy < minFloorDy ? t * 0.55 : t;
  const rx = (s1 - 0.5) * 9.0 * spinT;
  const ry = (s2 - 0.5) * 9.0 * spinT;
  const rz = (s3 - 0.5) * 9.0 * spinT;

  const scale = THREE.MathUtils.lerp(1.0, 0.82, scatterProgress);
  return {
    posOffset: [dx, dy, dz],
    rotOffset: [rx, ry, rz],
    scale,
  };
}
