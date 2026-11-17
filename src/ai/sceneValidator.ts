import { cloneJoints, POSE_PRESETS } from '../data/presets';
import type {
  CharacterActor,
  PosePreset,
  PropType,
  SceneAsset,
  ShotKeyframe,
  Vec3,
} from '../types/scene';

const VALID_PROP_TYPES: PropType[] = [
  'road',
  'wall',
  'floor',
  'stairs',
  'ramp',
  'pillar',
  'crate',
  'doorway',
  'building',
  'roof',
  'barrier',
  'table',
  'furniture',
  'vehicle',
  'lamp',
  'tree',
  'rock',
  'creature',
  'facility',
  'scene_prop',
  'box',
];

function mapPropTypeAlias(raw: string): PropType | null {
  const s = raw.trim().toLowerCase();
  if ((VALID_PROP_TYPES as string[]).includes(s)) return s as PropType;
  if (s.includes('desk') || s.includes('table') || s.includes('counter') || s.includes('bar')) return 'table';
  if (s.includes('car') || s.includes('truck') || s.includes('van') || s.includes('bus') || s.includes('vehicle')) return 'vehicle';
  if (s.includes('build') || s.includes('house') || s.includes('tower') || s.includes('block') || s.includes('apt')) return 'building';
  if (s.includes('rail') || s.includes('fence') || s.includes('barrier') || s.includes('guard')) return 'barrier';
  if (s.includes('roof') || s.includes('ceiling') || s.includes('canopy')) return 'roof';
  if (s.includes('lamp') || s.includes('light') || s.includes('pole')) return 'lamp';
  if (s.includes('tree') || s.includes('bush') || s.includes('plant')) return 'tree';
  if (s.includes('creature') || s.includes('animal') || s.includes('horse') || s.includes('dog') || s.includes('wolf') || s.includes('dragon') || s.includes('bird') || s.includes('deer')) return 'creature';
  if (s.includes('cube') || s.includes('platform') || s.includes('stage') || s.includes('bed') || s.includes('sofa')) return 'box';
  if (s.includes('door') || s.includes('gate') || s.includes('arch')) return 'doorway';
  if (s.includes('stair') || s.includes('step')) return 'stairs';
  if (s.includes('column') || s.includes('pillar')) return 'pillar';
  if (s.includes('ground') || s.includes('floor') || s.includes('road') || s.includes('street')) return 'floor';
  return null;
}

const VALID_POSES: PosePreset[] = [
  'idle',
  'run',
  'crouch_cover',
  'aim',
  'sit',
];

function extractJsonBlock(raw: string): string {
  // Remove <think>...</think> blocks from reasoning models (DeepSeek-R1, Qwen, etc.)
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function toVec3(val: unknown, fallback: Vec3, minVal = -100, maxVal = 100): Vec3 {
  if (!Array.isArray(val) || val.length < 3) return [...fallback];
  return [0, 1, 2].map((i) => {
    const n = Number(val[i]);
    if (!Number.isFinite(n)) return fallback[i];
    return Math.max(minVal, Math.min(maxVal, n));
  }) as Vec3;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export interface ValidatedAIScene {
  assets: SceneAsset[];
  characters: CharacterActor[];
  keyframes: ShotKeyframe[];
  repairedCount: number;
}

export function parseAndRepairSceneJson(rawText: string, duration = 6): ValidatedAIScene {
  const jsonStr = extractJsonBlock(rawText);
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

  // Support nested { world: { assets, characters } } or { scene: { ... } }
  const container =
    parsed.world && typeof parsed.world === 'object'
      ? (parsed.world as Record<string, unknown>)
      : parsed.scene && typeof parsed.scene === 'object'
      ? (parsed.scene as Record<string, unknown>)
      : parsed;

  let repairedCount = 0;
  const rawProps = Array.isArray(container.assets)
    ? container.assets
    : Array.isArray(container.props)
    ? container.props
    : Array.isArray(container.objects)
    ? container.objects
    : [];
  const rawChars = Array.isArray(container.characters)
    ? container.characters
    : Array.isArray(container.mannequins)
    ? container.mannequins
    : Array.isArray(container.actors)
    ? container.actors
    : [];
  const rawKfs = Array.isArray(parsed.keyframes)
    ? parsed.keyframes
    : Array.isArray(container.keyframes)
    ? container.keyframes
    : [];

  const assets: SceneAsset[] = rawProps.map((item: unknown, idx: number) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const mapped = mapPropTypeAlias(String(obj.type ?? 'box'));
    let type: PropType;
    if (mapped) {
      type = mapped;
    } else {
      type = 'box';
      repairedCount++;
    }
    const pos = toVec3(obj.position, [0, type === 'floor' ? -0.2 : 0, 0]);
    if (type !== 'floor' && pos[1] < 0) {
      pos[1] = 0;
      repairedCount++;
    }
    let rot: Vec3;
    if (Array.isArray(obj.rotationDeg)) {
      const deg = toVec3(obj.rotationDeg, [0, 0, 0], -360, 360);
      rot = [
        (deg[0] * Math.PI) / 180,
        (deg[1] * Math.PI) / 180,
        (deg[2] * Math.PI) / 180,
      ];
    } else {
      const rawRot = toVec3(obj.rotation, [0, 0, 0], -360, 360);
      if (rawRot.some((v) => Math.abs(v) > 6.3)) {
        rot = [
          (rawRot[0] * Math.PI) / 180,
          (rawRot[1] * Math.PI) / 180,
          (rawRot[2] * Math.PI) / 180,
        ];
        repairedCount++;
      } else {
        rot = rawRot;
      }
    }
    const scale = toVec3(obj.scale, [1, 1, 1], 0.1, 20);
    return {
      id: typeof obj.id === 'string' && obj.id ? obj.id : makeId(`ai_asset_${idx}`),
      kind: 'asset',
      type,
      name: typeof obj.name === 'string' && obj.name ? obj.name : `AI ${type} ${idx + 1}`,
      position: pos,
      rotation: rot,
      scale,
      visible: true,
      locked: false,
    };
  });

  const characters: CharacterActor[] = rawChars.map((item: unknown, idx: number) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    let pose = String(obj.pose ?? 'idle').toLowerCase() as PosePreset;
    if (!VALID_POSES.includes(pose)) {
      pose = 'idle';
      repairedCount++;
    }
    const preset = POSE_PRESETS[pose];
    const pos = toVec3(obj.position, [idx * 1.5, 0, 0]);
    if (pos[1] < 0) {
      pos[1] = 0;
      repairedCount++;
    }
    let rot: Vec3;
    if (Array.isArray(obj.rotationDeg)) {
      const deg = toVec3(obj.rotationDeg, [0, 0, 0], -360, 360);
      rot = [
        (deg[0] * Math.PI) / 180,
        (deg[1] * Math.PI) / 180,
        (deg[2] * Math.PI) / 180,
      ];
    } else {
      const rawRot = toVec3(obj.rotation, [0, 0, 0], -360, 360);
      if (rawRot.some((v) => Math.abs(v) > 6.3)) {
        rot = [
          (rawRot[0] * Math.PI) / 180,
          (rawRot[1] * Math.PI) / 180,
          (rawRot[2] * Math.PI) / 180,
        ];
        repairedCount++;
      } else {
        rot = rawRot;
      }
    }
    const scale = toVec3(obj.scale, [1, 1, 1], 0.5, 2);
    return {
      id: typeof obj.id === 'string' && obj.id ? obj.id : makeId(`ai_char_${idx}`),
      kind: 'character',
      name: typeof obj.name === 'string' && obj.name ? obj.name : `AI 角色 ${idx + 1}`,
      position: pos,
      rotation: rot,
      scale,
      pose,
      pelvisOffsetY: preset.pelvisOffsetY,
      joints: cloneJoints(preset.joints),
      visible: true,
      locked: false,
    };
  });

  const keyframes = repairKeyframes(rawKfs, duration);

  return { assets, characters, keyframes, repairedCount };
}

export function parseAndRepairKeyframesJson(
  rawText: string,
  duration = 6
): ShotKeyframe[] {
  const jsonStr = extractJsonBlock(rawText);
  const parsed = JSON.parse(jsonStr) as unknown;
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).keyframes)
    ? ((parsed as Record<string, unknown>).keyframes as unknown[])
    : [];
  return repairKeyframes(arr, duration);
}

function repairKeyframes(rawKfs: unknown[], duration: number): ShotKeyframe[] {
  if (rawKfs.length === 0) return [];
  const list: ShotKeyframe[] = rawKfs.map((item, idx) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const rawTime = Number(obj.time);
    const time = Number.isFinite(rawTime)
      ? Math.max(0, Math.min(duration, rawTime))
      : (idx / Math.max(1, rawKfs.length - 1)) * duration;
    const position = toVec3(obj.position, [0, 2, 6]);
    position[1] = Math.max(0.25, position[1]);
    const target = toVec3(obj.target, [0, 1, 0]);
    const rawFl = Number(obj.focalLength ?? 35);
    const focalLength = Number.isFinite(rawFl) ? Math.max(14, Math.min(135, rawFl)) : 35;
    return {
      id: makeId(`ai_kf_${idx}`),
      time: Number(time.toFixed(2)),
      position,
      target,
      focalLength,
    };
  });
  return list.sort((a, b) => a.time - b.time);
}
