import { POSE_PRESETS, cloneJoints } from '../data/presets';
import { getDefaultDistricts, inferDistrict } from '../engine/roadNetwork';
import { getFootGroundingOffsets, getGroundY } from '../engine/terrain';
import type {
  BuildingSpec,
  CharacterActor,
  HeroCompoundSpec,
  PropType,
  ScatteredPropSpec,
  SceneAsset,
  ShotData,
  Vec3,
  WorldState,
} from '../types/scene';
import {
  mapDslTypeToPropType,
  type DSLObjectNode,
  type FallbackStylePatch,
  type IntentSummary,
  type SceneDSL,
  type SceneTemplateId,
} from './dslSchema';
import {
  buildTemplateBaselineDsl,
  getTemplateById,
  type SceneTemplateDefinition,
} from './dslTemplates';

const PROP_BASE_DIMENSIONS: Record<PropType, Vec3> = {
  road: [10, 0.2, 12],
  wall: [4, 3, 0.3],
  floor: [6, 0.2, 6],
  roof: [6, 0.25, 6],
  pillar: [0.6, 3.5, 0.6],
  crate: [1.1, 1.1, 1.1],
  box: [1, 1, 1],
  barrier: [2.5, 1.0, 0.5],
  table: [1.8, 0.78, 0.9],
  furniture: [2.0, 1.0, 1.8],
  building: [4, 8.6, 4],
  vehicle: [1.95, 1.44, 4.4],
  lamp: [0.45, 4.0, 1.0],
  tree: [1.9, 3.5, 1.9],
  rock: [2.2, 1.5, 2.0],
  creature: [1.4, 1.3, 2.2],
  facility: [3.2, 3.5, 3.2],
  scene_prop: [1.5, 2.0, 1.5],
  doorway: [4.0, 3.0, 0.35],
  stairs: [2.0, 2.0, 3.0],
  ramp: [2.0, 1.5, 3.0],
};

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function getBgColorFromLighting(dsl: SceneDSL): string {
  const lbl = dsl.lighting.style_label.toLowerCase();
  if (/夜|黑夜|深夜|night/.test(lbl)) return '#182233';
  if (/黄昏|夕阳|日落|sunset|dusk/.test(lbl)) return '#d9c5b4';
  if (/大雾|迷雾|fog|mist/.test(lbl)) return '#e2e5e8';
  return '#eae8e3';
}

function toPropScaleMultiplier(propType: PropType, targetWorldDims: Vec3 | null): Vec3 {
  if (!targetWorldDims) return [1, 1, 1];
  const base = PROP_BASE_DIMENSIONS[propType] || [1, 1, 1];
  return [
    Number((Math.max(0.2, targetWorldDims[0]) / base[0]).toFixed(3)),
    Number((Math.max(0.2, targetWorldDims[1]) / base[1]).toFixed(3)),
    Number((Math.max(0.2, targetWorldDims[2]) / base[2]).toFixed(3)),
  ];
}

function resolveObjectY(obj: DSLObjectNode, template: SceneTemplateDefinition): number {
  const groundY = getGroundY(obj.position[0], obj.position[2], template.terrain, template.road);
  // PropMesh renders floors/ramps from local y=0 upward, whereas DSL floor/ramp uses center Y
  if (obj.type === 'floor' || obj.type === 'ramp') {
    const h = obj.scale ? obj.scale[1] : 1.0;
    const baseY = obj.position[1] - h * 0.5;
    return Number((baseY + (Math.abs(obj.position[1]) < 2.5 ? groundY : 0)).toFixed(3));
  }
  return Number(((Math.abs(obj.position[1]) <= 2.5 ? obj.position[1] + groundY : obj.position[1])).toFixed(3));
}

export interface CompiledSceneOutput {
  world: WorldState;
  shots: ShotData[];
  focusCenter: Vec3;
  logs: string[];
}

/**
 * Compiles a Step-3-validated SceneDSL deterministically into full 240m WorldState + ShotData[].
 */
export function compileValidatedDSLToWorld(
  dsl: SceneDSL,
  templateInput?: SceneTemplateDefinition,
  existingWorld?: WorldState
): CompiledSceneOutput {
  const template = templateInput || getTemplateById(dsl.template_id);
  const terrain = { ...template.terrain };
  const road = { ...template.road };
  const districts = getDefaultDistricts(terrain, road);

  const buildings: BuildingSpec[] = [];
  let heroCompound: HeroCompoundSpec | null = null;
  const scatteredProps: ScatteredPropSpec[] = [];
  const assets: SceneAsset[] = [];
  const characters: CharacterActor[] = [];

  for (const obj of dsl.objects) {
    const [ox, , oz] = obj.position;
    const rotDeg = obj.rotation_y_deg ?? 0;
    const rotRad = degToRad(rotDeg);
    const groundY = getGroundY(ox, oz, terrain, road);

    if (obj.type === 'building') {
      const dims = obj.scale ?? [14, (obj.floors ?? 3) * 3.6, 12];
      const floors = obj.floors ?? Math.max(2, Math.min(12, Math.round(dims[1] / 3.6)));
      buildings.push({
        id: obj.id,
        kind: 'building',
        name: obj.name,
        district: inferDistrict(ox, oz),
        style:
          /工业|铁|厂/.test(obj.name + dsl.lighting.style_label)
            ? 'industrial'
            : /住宅|公寓/.test(obj.name)
            ? 'residential'
            : 'modern',
        position: [ox, obj.position[1] === 0 ? groundY : obj.position[1], oz],
        rotationY: rotRad,
        width: Math.max(8, dims[0]),
        depth: Math.max(8, dims[2]),
        floors,
        hasFireEscape: floors >= 3,
        visible: true,
        locked: false,
      });
      continue;
    }

    if (obj.type === 'hero_compound') {
      heroCompound = {
        id: obj.id,
        kind: 'hero_compound',
        name: obj.name || '可进入复合建筑',
        position: [ox, obj.position[1] === 0 ? groundY : obj.position[1], oz],
        rotationY: rotRad,
        visible: true,
        locked: false,
      };
      continue;
    }

    if (
      obj.type === 'lamp' ||
      obj.type === 'barrier' ||
      obj.type === 'vehicle' ||
      obj.type === 'tree' ||
      obj.type === 'bush' ||
      obj.type === 'cargo_stack'
    ) {
      const spType = obj.type === 'vehicle' ? 'car' : obj.type;
      const scaleFactor =
        obj.scale && obj.type !== 'lamp' && obj.type !== 'vehicle'
          ? Math.max(0.7, Math.min(1.8, obj.scale[0] / (spType === 'barrier' ? 3.0 : 1.5)))
          : 1;
      scatteredProps.push({
        id: obj.id,
        type: spType,
        position: [ox, obj.position[1] === 0 ? groundY : obj.position[1], oz],
        rotationY: rotRad,
        scale: scaleFactor,
      });
      continue;
    }

    const propType = mapDslTypeToPropType(obj.type);
    if (propType) {
      assets.push({
        id: obj.id,
        kind: 'asset',
        type: propType,
        name: obj.name,
        position: [ox, resolveObjectY(obj, template), oz],
        rotation: [0, rotRad, 0],
        scale: toPropScaleMultiplier(propType, obj.scale),
        visible: true,
        locked: false,
      });
    }
  }

  for (const ch of dsl.characters) {
    const rotRad = degToRad(ch.rotation_y_deg ?? 0);
    const groundY = getGroundY(ch.position[0], ch.position[2], terrain, road);
    const charY = ch.position[1] > 0.05 ? ch.position[1] : groundY;
    const preset = POSE_PRESETS[ch.pose] ?? POSE_PRESETS.idle;
    const joints = cloneJoints(preset.joints);
    getFootGroundingOffsets(
      ch.position[0],
      ch.position[2],
      rotRad,
      terrain,
      road
    );

    characters.push({
      id: ch.id,
      kind: 'character',
      name: ch.role,
      position: [ch.position[0], charY, ch.position[2]],
      rotation: [0, rotRad, 0],
      scale: [1, 1, 1],
      pose: ch.pose,
      pelvisOffsetY: preset.pelvisOffsetY,
      joints,
      visible: true,
      locked: false,
    });
  }

  const lastKf = dsl.camera.keyframes[dsl.camera.keyframes.length - 1];
  const shots: ShotData[] = [
    {
      id: `shot_dsl_${Date.now()}`,
      name: dsl.camera.intent_label || '主镜头 (AI DSL)',
      focalLength: dsl.camera.keyframes[0]?.focal_length ?? 35,
      aspectRatio: dsl.camera.aspect_ratio,
      duration: Math.max(3, lastKf?.time ?? 5),
      fps: 24,
      lookAtTargetId: null,
      keyframes: dsl.camera.keyframes.map((kf, idx) => ({
        id: `kf_dsl_${idx + 1}`,
        time: kf.time,
        position: [...kf.position],
        target: [...kf.target],
        focalLength: kf.focal_length,
      })),
    },
  ];

  // Provide an alternate wide establishing shot for immediate switching
  if (dsl.camera.keyframes.length >= 2) {
    const first = dsl.camera.keyframes[0];
    shots.push({
      id: `shot_dsl_wide_${Date.now() + 1}`,
      name: '建立广角镜头',
      focalLength: 24,
      aspectRatio: dsl.camera.aspect_ratio,
      duration: 4,
      fps: 24,
      lookAtTargetId: null,
      keyframes: [
        {
          id: 'kf_w_1',
          time: 0,
          position: [first.position[0] * 1.15, Math.max(4.5, first.position[1] + 2.5), first.position[2] * 1.15],
          target: [...first.target],
          focalLength: 24,
        },
        {
          id: 'kf_w_2',
          time: 4,
          position: [first.position[0], Math.max(3.5, first.position[1] + 1.5), first.position[2]],
          target: [...lastKf.target],
          focalLength: 28,
        },
      ],
    });
  }

  const focusCenter: Vec3 = dsl.camera.keyframes[0]?.target ?? [0, 1.5, 0];

  const world: WorldState = {
    ...(existingWorld || {}),
    environment: {
      sunAzimuth: Math.max(0, Math.min(360, dsl.lighting.sun_azimuth)),
      sunElevation: Math.max(4, Math.min(82, dsl.lighting.sun_elevation)),
      fogDensity: Math.max(0, Math.min(0.05, dsl.lighting.fog_density)),
      bgColor: getBgColorFromLighting(dsl),
    },
    terrain,
    road,
    districts,
    buildings,
    heroCompound,
    scatteredProps,
    assets,
    customModels: [],
    gltfModels: [],
    characters,
    lastWorldPlan: {
      theme: `${template.name} · ${dsl.lighting.style_label}`,
      terrainSummary: `${terrain.theme} (${template.id})`,
      districts: districts.map((d) => d.name),
      blockingArc: dsl.camera.intent_label,
    },
  };

  const logs = [
    `✓ Step 3 校验通过，进入确定性编译 (模板: ${dsl.template_id})`,
    `✓ 建筑 ${buildings.length} 栋${heroCompound ? ' + 可进入复合建筑 1 座' : ''}`,
    `✓ 道具/构件 ${assets.length + scatteredProps.length} 个 · 16关节角色 ${characters.length} 名`,
    `✓ 分镜 ${shots.length} 组 · 主镜头 ${dsl.camera.keyframes.length} 个关键帧`,
  ];

  return { world, shots, focusCenter, logs };
}

/**
 * Step 4 Fallback: Layout & coordinates stay 100% locked to the deterministic template baseline;
 * DeepSeek only patches style (lighting / atmosphere / material_tone / element display names).
 */
export function buildStep4TemplateWithStyle(
  intent: IntentSummary,
  templateId: SceneTemplateId,
  stylePatch: FallbackStylePatch | null
): SceneDSL {
  const base = buildTemplateBaselineDsl(intent, templateId);
  if (!stylePatch) return base;

  const nextLighting = {
    style_label: stylePatch.style_label || base.lighting.style_label,
    sun_azimuth: Number.isFinite(stylePatch.sun_azimuth)
      ? Math.max(0, Math.min(360, stylePatch.sun_azimuth))
      : base.lighting.sun_azimuth,
    sun_elevation: Number.isFinite(stylePatch.sun_elevation)
      ? Math.max(5, Math.min(80, stylePatch.sun_elevation))
      : base.lighting.sun_elevation,
    fog_density: Number.isFinite(stylePatch.fog_density)
      ? Math.max(0, Math.min(0.04, stylePatch.fog_density))
      : base.lighting.fog_density,
    material_tone: stylePatch.material_tone ?? base.lighting.material_tone,
  };

  const nextObjects = base.objects.map((o) => ({
    ...o,
    name: stylePatch.element_names?.[o.id] || o.name,
  }));

  const nextChars = base.characters.map((c) => ({
    ...c,
    role: stylePatch.element_names?.[c.id] || c.role,
  }));

  return {
    ...base,
    lighting: nextLighting,
    objects: nextObjects,
    characters: nextChars,
  };
}
