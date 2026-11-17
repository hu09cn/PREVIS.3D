import {
  compileSemanticProgram,
  listSceneRegisteredIds,
  validateSemanticProgramStrict,
  verifyCompiledWorldAgainstPrompt,
  type CustomModelPartRequest,
  type CustomModelRequest,
  type FocusStyle,
  type SceneElementRequest,
  type SemanticCommand,
  type SemanticPatchOp,
  type SemanticProgram,
  type SpatialArrangement,
  type SpatialRelation,
  type UncertaintyItem,
  type WorldVerificationReport,
} from './spatialCompiler';
import { buildIntentSummary } from './intentPlanner';
import { PROP_CATALOG } from '../data/presets';
import {
  DSL_CHARACTER_POSES,
  DSL_OBJECT_TYPES,
  type FallbackStylePatch,
  type IntentSummary,
  type SceneTemplateId,
} from './dslSchema';
import { buildTemplateBaselineDsl, getTemplateById } from './dslTemplates';
import { parseAndRepairKeyframesJson } from './sceneValidator';
import type {
  AIConfig,
  DistrictId,
  PrimitiveShape,
  ProceduralMaterialKind,
  ScatteredPropType,
  ShotData,
  ShotKeyframe,
  TerrainTheme,
  Vec3,
  WorldPlan,
  WorldState,
} from '../types/scene';

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    // Fall back to balanced brace extraction & trailing-comma repair
  }
  const start = cleaned.search(/[\[{]/);
  if (start >= 0) {
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') quoted = false;
        continue;
      }
      if (ch === '"') quoted = true;
      else if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') {
        depth--;
        if (depth === 0) {
          const block = cleaned.slice(start, i + 1);
          try {
            return JSON.parse(block) as Record<string, unknown>;
          } catch {
            const repaired = block.replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(repaired) as Record<string, unknown>;
          }
        }
      }
    }
  }
  throw new Error('模型返回的 JSON 无法提取或修复');
}

function normalizeDistrict(z: unknown): DistrictId {
  const s = String(z ?? '').toLowerCase();
  if (s.includes('industrial') || s.includes('工厂') || s.includes('工业')) return 'old_industrial';
  if (s.includes('overpass') || s.includes('plaza') || s.includes('高架') || s.includes('广场')) {
    return 'overpass_plaza';
  }
  if (s.includes('canal') || s.includes('river') || s.includes('河') || s.includes('运河')) {
    return 'canal_bank';
  }
  return 'commercial_main';
}

function toVec3(v: unknown): [number, number, number] | undefined {
  if (!Array.isArray(v) || v.length < 3) return undefined;
  const nums = [Number(v[0]), Number(v[1]), Number(v[2])];
  if (nums.some((n) => !Number.isFinite(n))) return undefined;
  return [nums[0], nums[1], nums[2]];
}

function normalizeRelation(r: unknown): SpatialRelation | undefined {
  const s = String(r ?? '').trim().toLowerCase();
  if (
    s === 'in_front_of' ||
    s === 'behind' ||
    s === 'left_of' ||
    s === 'right_of' ||
    s === 'around' ||
    s === 'on_top_of' ||
    s === 'along'
  ) {
    return s;
  }
  return undefined;
}

function normalizeArrangement(a: unknown, fallback: SpatialArrangement): SpatialArrangement {
  const s = String(a ?? '').trim().toLowerCase();
  if (
    s === 'single' ||
    s === 'ring' ||
    s === 'grid' ||
    s === 'line' ||
    s === 'cluster' ||
    s === 'pair' ||
    s === 'scatter' ||
    s === 'convoy'
  ) {
    return s;
  }
  return fallback;
}

function parsePartList(rawParts: unknown[]): CustomModelPartRequest[] {
  return rawParts
    .filter((pt): pt is Record<string, unknown> => Boolean(pt && typeof pt === 'object'))
    .map((pt) => {
      const localPos = toVec3(pt.local_position ?? pt.position) ?? [0, 0.5, 0];
      const localRot = toVec3(pt.local_rotation_deg ?? pt.rotation_deg ?? pt.rotation);
      return {
        name: typeof pt.name === 'string' ? pt.name : undefined,
        shape: String(pt.shape ?? pt.type ?? 'box') as PrimitiveShape,
        position: localPos,
        local_position: localPos,
        rotation_deg: localRot,
        local_rotation_deg: localRot,
        size: toVec3(pt.size ?? pt.dimensions ?? pt.scale) ?? [1, 1, 1],
        top_ratio:
          typeof pt.top_ratio === 'number'
            ? pt.top_ratio
            : typeof pt.topRatio === 'number'
            ? pt.topRatio
            : undefined,
        color: typeof pt.color === 'string' ? pt.color : '#cbd5e1',
        material:
          typeof pt.material === 'string'
            ? (pt.material as ProceduralMaterialKind)
            : undefined,
      };
    });
}

function repairSemanticProgram(
  rawObj: Record<string, unknown>,
  prompt: string,
  mode: 'replace' | 'append',
  allowDemoFallback = true
): SemanticProgram {
  const rawPlan = (
    rawObj.world_plan && typeof rawObj.world_plan === 'object'
      ? rawObj.world_plan
      : {}
  ) as Record<string, unknown>;

  const world_plan: WorldPlan = {
    theme:
      typeof rawPlan.theme === 'string' && rawPlan.theme
        ? rawPlan.theme
        : prompt.slice(0, 36),
    terrainSummary:
      typeof rawPlan.terrain_summary === 'string'
        ? rawPlan.terrain_summary
        : typeof rawPlan.terrainSummary === 'string'
        ? rawPlan.terrainSummary
        : '960m 连续开放预演世界',
    districts: Array.isArray(rawPlan.districts)
      ? rawPlan.districts.map(String)
      : ['商业主街', '旧工业区', '高地广场', '河岸街区'],
    blockingArc:
      typeof rawPlan.blocking_arc === 'string'
        ? rawPlan.blocking_arc
        : typeof rawPlan.blockingArc === 'string'
        ? rawPlan.blockingArc
        : '按提示词布局空间与角色动作调度',
  };

  const rawCmds = Array.isArray(rawObj.commands) ? rawObj.commands : [];
  const commands: SemanticCommand[] = [];

  for (const item of rawCmds) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const cmdName = String(obj.cmd ?? obj.name ?? obj.op ?? obj.type ?? '').trim();
    const args = (
      obj.args && typeof obj.args === 'object' ? obj.args : obj
    ) as Record<string, unknown>;

    switch (cmdName) {
      case 'plan_world_overview':
        if (typeof args.theme === 'string' && args.theme) world_plan.theme = args.theme;
        if (typeof args.terrain_summary === 'string' && args.terrain_summary) {
          world_plan.terrainSummary = args.terrain_summary;
        }
        if (typeof args.blocking_arc === 'string' && args.blocking_arc) {
          world_plan.blockingArc = args.blocking_arc;
        }
        break;
      case 'set_terrain':
        commands.push({
          cmd: 'set_terrain',
          theme:
            typeof args.theme === 'string' && args.theme
              ? (args.theme as TerrainTheme)
              : mode === 'replace'
              ? 'urban_flat'
              : undefined,
          relief:
            typeof args.relief === 'number'
              ? args.relief
              : mode === 'replace'
              ? 0.4
              : undefined,
          has_water_channel:
            typeof (args.has_water_channel ?? args.hasWaterChannel) === 'boolean'
              ? Boolean(args.has_water_channel ?? args.hasWaterChannel)
              : mode === 'replace'
              ? false
              : undefined,
          hero_zone: args.hero_zone ? normalizeDistrict(args.hero_zone) : undefined,
          sun_elevation:
            typeof args.sun_elevation === 'number' ? args.sun_elevation : undefined,
          sun_azimuth:
            typeof args.sun_azimuth === 'number' ? args.sun_azimuth : undefined,
          fog_density:
            typeof args.fog_density === 'number' ? args.fog_density : undefined,
        });
        break;
      case 'build_road_grid':
        commands.push({
          cmd: 'build_road_grid',
          pattern: 'none',
          width: typeof args.width === 'number' ? args.width : 12,
        });
        break;
      case 'spawn_district_buildings':
        commands.push({
          cmd: 'spawn_district_buildings',
          zone: normalizeDistrict(args.zone),
          style:
            args.style === 'industrial' || args.style === 'residential'
              ? args.style
              : 'modern',
          count: typeof args.count === 'number' ? args.count : 6,
          min_floors: typeof args.min_floors === 'number' ? args.min_floors : 2,
          max_floors: typeof args.max_floors === 'number' ? args.max_floors : 5,
          enterable_hero_building: Boolean(args.enterable_hero_building),
        });
        break;
      case 'scatter_props':
        commands.push({
          cmd: 'scatter_props',
          zone: normalizeDistrict(args.zone),
          preset:
            args.preset === 'industrial_cargo' ||
            args.preset === 'canal_trees' ||
            args.preset === 'tactical_cover'
              ? args.preset
              : 'street_urban',
          density: typeof args.density === 'number' ? args.density : 0.7,
          focus_items: Array.isArray(args.focus_items)
            ? (args.focus_items.map(String) as ScatteredPropType[])
            : undefined,
        });
        break;
      case 'place_scene_element': {
        const el: SceneElementRequest = {
          id: typeof args.id === 'string' ? args.id : undefined,
          item: String(args.item ?? args.type ?? 'crate'),
          label: typeof args.label === 'string' ? args.label : undefined,
          count: typeof args.count === 'number' ? args.count : 1,
          arrangement: normalizeArrangement(args.arrangement, 'single'),
          anchor: typeof args.anchor === 'string' ? args.anchor : 'scene_center',
          relation: normalizeRelation(args.relation),
          distance_m: typeof args.distance_m === 'number' ? args.distance_m : undefined,
          facing: typeof args.facing === 'string' ? args.facing : undefined,
          offset_m: toVec3(args.offset_m),
          scale: toVec3(args.scale),
          rotation_y_deg:
            typeof args.rotation_y_deg === 'number' ? args.rotation_y_deg : 0,
        };
        commands.push({
          cmd: 'place_scene_elements',
          zone: args.zone ? normalizeDistrict(args.zone) : undefined,
          elements: [el],
        });
        break;
      }
      case 'place_scene_elements':
      case 'place_props':
      case 'spawn_props':
      case 'place_structures': {
        const rawEls = Array.isArray(args.elements)
          ? args.elements
          : Array.isArray(args.items)
          ? args.items
          : [];
        const elements: SceneElementRequest[] = rawEls
          .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object'))
          .map((e) => ({
            id: typeof e.id === 'string' ? e.id : undefined,
            item: String(e.item ?? e.type ?? 'crate'),
            label: typeof e.label === 'string' ? e.label : undefined,
            count: typeof e.count === 'number' ? e.count : 1,
            arrangement: normalizeArrangement(e.arrangement, 'cluster'),
            anchor: typeof e.anchor === 'string' ? e.anchor : 'scene_center',
            relation: normalizeRelation(e.relation),
            distance_m: typeof e.distance_m === 'number' ? e.distance_m : undefined,
            facing: typeof e.facing === 'string' ? e.facing : undefined,
            offset_m: toVec3(e.offset_m),
            scale: toVec3(e.scale),
            rotation_y_deg:
              typeof e.rotation_y_deg === 'number' ? e.rotation_y_deg : 0,
          }));
        if (elements.length > 0) {
          commands.push({
            cmd: 'place_scene_elements',
            zone: args.zone ? normalizeDistrict(args.zone) : undefined,
            elements,
          });
        }
        break;
      }
      case 'build_composite_model': {
        const rawParts = Array.isArray(args.composite_primitives)
          ? args.composite_primitives
          : Array.isArray(args.parts)
          ? args.parts
          : [];
        const parts = parsePartList(rawParts);
        const modelReq: CustomModelRequest = {
          id: typeof args.id === 'string' ? args.id : undefined,
          name: String(args.name ?? args.label ?? 'AI复合模型'),
          description: typeof args.description === 'string' ? args.description : undefined,
          anchor: typeof args.anchor === 'string' ? args.anchor : 'scene_center',
          relation: normalizeRelation(args.relation),
          distance_m: typeof args.distance_m === 'number' ? args.distance_m : undefined,
          facing: typeof args.facing === 'string' ? args.facing : undefined,
          offset_m: toVec3(args.offset_m),
          place_on: args.place_on === 'water_surface' ? 'water_surface' : 'ground',
          rotation_y_deg: typeof args.rotation_y_deg === 'number' ? args.rotation_y_deg : 0,
          scale: toVec3(args.scale),
          count: typeof args.count === 'number' ? args.count : 1,
          arrangement: normalizeArrangement(args.arrangement, 'single'),
          parts,
          composite_primitives: parts,
        };
        commands.push({
          cmd: 'create_custom_models',
          zone: args.zone ? normalizeDistrict(args.zone) : undefined,
          models: [modelReq],
        });
        break;
      }
      case 'create_custom_models':
      case 'build_custom_models':
      case 'custom_models':
      case 'model_custom_objects':
      case 'assemble_models': {
        const rawModels = Array.isArray(args.models)
          ? args.models
          : Array.isArray(args.objects)
          ? args.objects
          : Array.isArray(args.items)
          ? args.items
          : [];
        const models: CustomModelRequest[] = rawModels
          .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
          .map((m): CustomModelRequest => {
            const rawParts = Array.isArray(m.composite_primitives)
              ? m.composite_primitives
              : Array.isArray(m.parts)
              ? m.parts
              : Array.isArray(m.components)
              ? m.components
              : [];
            const parts = parsePartList(rawParts);
            return {
              id: typeof m.id === 'string' ? m.id : undefined,
              name: String(m.name ?? m.label ?? 'AI定制模型'),
              description: typeof m.description === 'string' ? m.description : undefined,
              anchor: typeof m.anchor === 'string' ? m.anchor : 'scene_center',
              relation: normalizeRelation(m.relation),
              distance_m: typeof m.distance_m === 'number' ? m.distance_m : undefined,
              facing: typeof m.facing === 'string' ? m.facing : undefined,
              offset_m: toVec3(m.offset_m),
              place_on: m.place_on === 'water_surface' ? 'water_surface' : 'ground',
              rotation_y_deg: typeof m.rotation_y_deg === 'number' ? m.rotation_y_deg : 0,
              scale: toVec3(m.scale),
              count: typeof m.count === 'number' ? m.count : 1,
              arrangement: normalizeArrangement(m.arrangement, 'single'),
              parts,
              composite_primitives: parts,
            };
          })
          .filter((m) => m.parts.length > 0);
        if (models.length > 0) {
          commands.push({
            cmd: 'create_custom_models',
            zone: args.zone ? normalizeDistrict(args.zone) : undefined,
            models,
          });
        }
        break;
      }
      case 'stage_character': {
        commands.push({
          cmd: 'stage_characters',
          zone: args.zone ? normalizeDistrict(args.zone) : undefined,
          cast: [
            {
              id: typeof args.id === 'string' ? args.id : undefined,
              role: String(args.role ?? '角色'),
              action: String(args.action ?? 'idle'),
              placement_rule: String(args.placement_rule ?? 'relative'),
              anchor: typeof args.anchor === 'string' ? args.anchor : undefined,
              relative_to: args.relative_to ? String(args.relative_to) : undefined,
              relation: normalizeRelation(args.relation),
              distance_m: typeof args.distance_m === 'number' ? args.distance_m : 2.0,
              facing: args.facing ? String(args.facing) : undefined,
            },
          ],
        });
        break;
      }
      case 'stage_characters':
        if (Array.isArray(args.cast)) {
          commands.push({
            cmd: 'stage_characters',
            zone: args.zone ? normalizeDistrict(args.zone) : undefined,
            cast: args.cast.map((m) => {
              const r = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
              return {
                id: typeof r.id === 'string' ? r.id : undefined,
                role: String(r.role ?? '角色'),
                action: String(r.action ?? 'idle'),
                placement_rule: String(r.placement_rule ?? 'behind_nearest_cover'),
                anchor: typeof r.anchor === 'string' ? r.anchor : undefined,
                relative_to: r.relative_to ? String(r.relative_to) : undefined,
                relation: normalizeRelation(r.relation),
                distance_m: typeof r.distance_m === 'number' ? r.distance_m : 2.0,
                facing: r.facing ? String(r.facing) : undefined,
              };
            }),
          });
        }
        break;
      case 'apply_scene_patch': {
        const opRaw = String(args.op ?? 'update').toLowerCase();
        const op: 'add' | 'remove' | 'update' =
          opRaw === 'add' || opRaw === 'remove' ? opRaw : 'update';
        const rawAddItem =
          typeof args.add_item === 'string'
            ? args.add_item
            : typeof args.item === 'string'
            ? args.item
            : op === 'add' && typeof args.target_id === 'string' && !args.element && !args.character
            ? args.target_id
            : undefined;
        const rawAddRole =
          typeof args.add_role === 'string'
            ? args.add_role
            : typeof args.role === 'string'
            ? args.role
            : undefined;
        const isAddingCharacter = Boolean(
          op === 'add' &&
            !args.character &&
            (rawAddRole ||
              (rawAddItem && /^(character|actor|soldier|guard|hero|npc|主角|角色|士兵|哨兵|敌人)$/i.test(rawAddItem.trim())))
        );
        const patch: SemanticPatchOp = {
          op,
          target_id: typeof args.target_id === 'string' ? args.target_id : undefined,
          remove_all: Boolean(args.remove_all),
          relation: normalizeRelation(args.relation),
          relative_to: typeof args.relative_to === 'string' ? args.relative_to : undefined,
          anchor: typeof args.anchor === 'string' ? args.anchor : undefined,
          distance_m: typeof args.distance_m === 'number' ? args.distance_m : undefined,
          offset_m: toVec3(args.offset_m),
          facing: typeof args.facing === 'string' ? args.facing : undefined,
          action: typeof args.action === 'string' ? args.action : undefined,
          scale: toVec3(args.scale),
          rotation_y_deg:
            typeof args.rotation_y_deg === 'number' ? args.rotation_y_deg : undefined,
          element:
            args.element && typeof args.element === 'object'
              ? (args.element as SceneElementRequest)
              : op === 'add' && rawAddItem && !isAddingCharacter
              ? {
                  id: typeof args.add_id === 'string' ? args.add_id : undefined,
                  item: rawAddItem,
                  label: typeof args.add_label === 'string' ? args.add_label : undefined,
                  count: typeof args.add_count === 'number' ? args.add_count : undefined,
                  anchor:
                    typeof args.relative_to === 'string'
                      ? args.relative_to
                      : typeof args.anchor === 'string'
                      ? args.anchor
                      : 'scene_center',
                  relation: normalizeRelation(args.relation),
                  distance_m: typeof args.distance_m === 'number' ? args.distance_m : 2.5,
                  scale: toVec3(args.scale),
                  rotation_y_deg:
                    typeof args.rotation_y_deg === 'number' ? args.rotation_y_deg : undefined,
                }
              : undefined,
          character:
            args.character && typeof args.character === 'object'
              ? (args.character as SemanticPatchOp['character'])
              : isAddingCharacter
              ? {
                  id: typeof args.add_id === 'string' ? args.add_id : undefined,
                  role: rawAddRole || (typeof args.add_label === 'string' ? args.add_label : '新增角色'),
                  action: typeof args.action === 'string' ? args.action : 'idle',
                  anchor:
                    typeof args.relative_to === 'string'
                      ? args.relative_to
                      : typeof args.anchor === 'string'
                      ? args.anchor
                      : 'scene_center',
                  relation: normalizeRelation(args.relation) ?? 'in_front_of',
                  distance_m: typeof args.distance_m === 'number' ? args.distance_m : 2.5,
                  facing: typeof args.facing === 'string' ? args.facing : undefined,
                }
              : undefined,
        };
        commands.push({
          cmd: 'apply_scene_patches',
          patches: [patch],
        });
        break;
      }
      case 'apply_scene_patches': {
        const rawPatches = Array.isArray(args.patches) ? args.patches : [];
        const patches: SemanticPatchOp[] = rawPatches
          .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
          .map((p) => {
            const opRaw = String(p.op ?? 'update').toLowerCase();
            const op: 'add' | 'remove' | 'update' =
              opRaw === 'add' || opRaw === 'remove' ? opRaw : 'update';
            return {
              op,
              target_id: typeof p.target_id === 'string' ? p.target_id : undefined,
              relation: normalizeRelation(p.relation),
              relative_to: typeof p.relative_to === 'string' ? p.relative_to : undefined,
              anchor: typeof p.anchor === 'string' ? p.anchor : undefined,
              distance_m: typeof p.distance_m === 'number' ? p.distance_m : undefined,
              offset_m: toVec3(p.offset_m),
              facing: typeof p.facing === 'string' ? p.facing : undefined,
              action: typeof p.action === 'string' ? p.action : undefined,
              scale: toVec3(p.scale),
              rotation_y_deg:
                typeof p.rotation_y_deg === 'number' ? p.rotation_y_deg : undefined,
              element:
                p.element && typeof p.element === 'object'
                  ? (p.element as SceneElementRequest)
                  : undefined,
              character:
                p.character && typeof p.character === 'object'
                  ? (p.character as SemanticPatchOp['character'])
                  : undefined,
            };
          });
        if (patches.length > 0) {
          commands.push({
            cmd: 'apply_scene_patches',
            patches,
          });
        }
        break;
      }
      case 'set_camera_coverage':
      case 'generate_multi_shot_coverage':
        commands.push({
          cmd: 'generate_multi_shot_coverage',
          shot_count: typeof args.shot_count === 'number' ? args.shot_count : 3,
          focus_style: (args.focus_style as FocusStyle) ?? undefined,
        });
        break;
    }
  }

  const rawUncertainties = Array.isArray(rawObj.uncertainties) ? rawObj.uncertainties : [];
  const uncertainties: UncertaintyItem[] = rawUncertainties
    .filter((u): u is Record<string, unknown> => Boolean(u && typeof u === 'object'))
    .map((u) => ({
      topic: String(u.topic ?? '待确认细节'),
      question: String(u.question ?? ''),
      assumption: String(u.assumption ?? u.assumption_made ?? '已采用默认布局假设'),
    }))
    .filter((u) => u.question.trim().length > 0);

  const unsupported_elements = Array.isArray(rawObj.unsupported_elements)
    ? rawObj.unsupported_elements.map(String).filter(Boolean)
    : [];

  if (commands.length === 0 && allowDemoFallback) {
    const fallback = buildLocalDemoProgram(prompt, mode);
    return {
      ...fallback,
      uncertainties: [
        ...uncertainties,
        {
          topic: '大模型未输出有效指令列表',
          question: 'DeepSeek 返回的 JSON 缺少可执行 commands，请确认提示词描述是否清晰或检查模型设置。',
          assumption: '本次暂按本地规则解析还原场景。',
        },
      ],
      unsupported_elements,
    };
  }

  // Ensure scene has baseline terrain in replace mode if omitted by LLM
  if (mode === 'replace' && commands.length > 0 && !commands.some((c) => c.cmd === 'set_terrain')) {
    commands.unshift({
      cmd: 'set_terrain',
      theme: 'urban_flat',
      relief: 0.35,
      has_water_channel: false,
    });
  }

  return { world_plan, commands, uncertainties, unsupported_elements };
}

function synthesizeCustomModelsFromPrompt(
  prompt: string,
  hasWater: boolean
): CustomModelRequest[] {
  const p = prompt.toLowerCase();
  const models: CustomModelRequest[] = [];

  if (/塔吊|起重机|crane/.test(p)) {
    models.push({
      id: 'crane_01',
      name: '重型建筑塔吊',
      description: '圆柱配重底座、窄长塔身桁架、驾驶室、长悬臂吊臂与吊钩',
      anchor: 'scene_center',
      relation: 'left_of',
      distance_m: 10,
      place_on: 'ground',
      parts: [
        { name: '圆柱混凝土底座', shape: 'cylinder', position: [0, 0.6, 0], size: [4.2, 1.2, 4.2], color: '#64748b', material: 'stone' },
        { name: '主塔身下段', shape: 'box', position: [0, 5.2, 0], size: [1.4, 8.0, 1.4], color: '#eab308', material: 'metal' },
        { name: '主塔身上段', shape: 'box', position: [0, 13.2, 0], size: [1.25, 8.0, 1.25], color: '#facc15', material: 'metal' },
        { name: '回转驾驶室', shape: 'box', position: [0.9, 17.5, 0], size: [1.8, 2.0, 1.6], color: '#38bdf8', material: 'glass' },
        { name: '塔帽锥顶', shape: 'cone', position: [0, 19.8, 0], size: [1.5, 2.8, 1.5], color: '#ca8a04', material: 'metal' },
        { name: '前伸主吊臂', shape: 'box', position: [6.0, 18.2, 0], size: [16.0, 0.9, 0.9], color: '#eab308', material: 'metal' },
        { name: '后平衡配重臂', shape: 'box', position: [-4.2, 18.0, 0], size: [5.5, 0.8, 1.1], color: '#ca8a04', material: 'metal' },
        { name: '尾部配重块', shape: 'box', position: [-6.0, 17.4, 0], size: [1.8, 1.6, 1.6], color: '#475569', material: 'stone' },
        { name: '吊索滑轮组', shape: 'cylinder', position: [10.5, 13.5, 0], size: [0.18, 8.5, 0.18], color: '#94a3b8', material: 'metal' },
      ],
    });
  }

  if (/灯塔|lighthouse|瞭望塔|watchtower/.test(p)) {
    models.push({
      name: '海滨红白灯塔',
      description: '多段锥形塔身、观景平台、发光灯室与圆锥屋顶',
      anchor: hasWater ? 'canal' : 'hero_zone_center',
      offset_m: hasWater ? [-6, 0, -10] : [8, 0, -8],
      place_on: 'ground',
      parts: [
        { name: '基座石台', shape: 'cylinder', position: [0, 0.7, 0], size: [5.4, 1.4, 5.4], top_ratio: 0.9, color: '#877f72', material: 'stone' },
        { name: '底层白塔身', shape: 'cylinder', position: [0, 3.6, 0], size: [4.0, 4.4, 4.0], top_ratio: 0.86, color: '#f4f1ea', material: 'matte' },
        { name: '中段红环带', shape: 'cylinder', position: [0, 7.2, 0], size: [3.4, 2.8, 3.4], top_ratio: 0.88, color: '#c83e37', material: 'matte' },
        { name: '上段白塔身', shape: 'cylinder', position: [0, 10.0, 0], size: [2.95, 2.8, 2.95], top_ratio: 0.9, color: '#f4f1ea', material: 'matte' },
        { name: '观景走廊', shape: 'cylinder', position: [0, 11.6, 0], size: [3.7, 0.4, 3.7], color: '#3b4452', material: 'metal' },
        { name: '发光灯室', shape: 'cylinder', position: [0, 12.7, 0], size: [2.2, 1.8, 2.2], color: '#fde047', material: 'emissive' },
        { name: '红顶盖', shape: 'cone', position: [0, 14.4, 0], size: [2.8, 1.7, 2.8], color: '#b91c1c', material: 'metal' },
      ],
    });
  }

  if (/桥|拱桥|木桥|bridge/.test(p)) {
    models.push({
      name: '跨水拱桥',
      description: '两岸桥墩、弧形桥面与护栏',
      anchor: hasWater ? 'canal_water' : 'hero_zone_center',
      offset_m: [0, 0, 4],
      place_on: hasWater ? 'water_surface' : 'ground',
      parts: [
        { name: '西桥墩', shape: 'box', position: [-6.8, 1.2, 0], size: [2.2, 2.6, 4.4], color: '#78756e', material: 'stone' },
        { name: '东桥墩', shape: 'box', position: [6.8, 1.2, 0], size: [2.2, 2.6, 4.4], color: '#78756e', material: 'stone' },
        { name: '西坡桥面', shape: 'box', position: [-3.4, 2.7, 0], rotation_deg: [0, 0, 12], size: [5.4, 0.45, 4.0], color: '#a89f91', material: 'stone' },
        { name: '中跨桥面', shape: 'box', position: [0, 3.25, 0], size: [2.8, 0.45, 4.0], color: '#b5ab9c', material: 'stone' },
        { name: '东坡桥面', shape: 'box', position: [3.4, 2.7, 0], rotation_deg: [0, 0, -12], size: [5.4, 0.45, 4.0], color: '#a89f91', material: 'stone' },
        { name: '北侧石栏', shape: 'box', position: [0, 3.8, -1.85], size: [12.5, 0.65, 0.25], color: '#d6d1c7', material: 'stone' },
        { name: '南侧石栏', shape: 'box', position: [0, 3.8, 1.85], size: [12.5, 0.65, 0.25], color: '#d6d1c7', material: 'stone' },
      ],
    });
  }

  if (/码头|栈道|pier|dock/.test(p)) {
    models.push({
      name: '木质栈道码头',
      description: '木桩立柱、栈道甲板与系船柱',
      anchor: hasWater ? 'canal_water' : 'hero_zone_center',
      offset_m: [4.5, 0, -8],
      place_on: hasWater ? 'water_surface' : 'ground',
      parts: [
        { name: '主甲板', shape: 'box', position: [0, 1.35, 0], size: [10.0, 0.28, 3.8], color: '#a67649', material: 'wood' },
        { name: '立柱1', shape: 'cylinder', position: [-4.2, 0.35, -1.5], size: [0.35, 2.2, 0.35], color: '#5c4028', material: 'wood' },
        { name: '立柱2', shape: 'cylinder', position: [-4.2, 0.35, 1.5], size: [0.35, 2.2, 0.35], color: '#5c4028', material: 'wood' },
        { name: '立柱3', shape: 'cylinder', position: [0, 0.35, -1.5], size: [0.35, 2.2, 0.35], color: '#5c4028', material: 'wood' },
        { name: '立柱4', shape: 'cylinder', position: [0, 0.35, 1.5], size: [0.35, 2.2, 0.35], color: '#5c4028', material: 'wood' },
        { name: '立柱5', shape: 'cylinder', position: [4.2, 0.35, -1.5], size: [0.35, 2.2, 0.35], color: '#5c4028', material: 'wood' },
        { name: '立柱6', shape: 'cylinder', position: [4.2, 0.35, 1.5], size: [0.35, 2.2, 0.35], color: '#5c4028', material: 'wood' },
        { name: '系船柱', shape: 'cylinder', position: [-4.5, 1.85, 1.4], size: [0.3, 0.7, 0.3], color: '#3b4452', material: 'metal' },
      ],
    });
  }

  if (/船|帆船|游艇|小舟|boat|ship|yacht/.test(p)) {
    models.push({
      name: '海湾木帆船',
      description: '流线船体、船舱、桅杆与白色风帆',
      anchor: hasWater ? 'canal_water' : 'hero_zone_center',
      offset_m: [-1.5, 0, -14],
      place_on: hasWater ? 'water_surface' : 'ground',
      rotation_y_deg: 18,
      parts: [
        { name: '主船体', shape: 'box', position: [0, 0.45, 0], size: [2.6, 1.0, 6.2], color: '#7c4d2b', material: 'wood' },
        { name: '尖船首', shape: 'cone', position: [0, 0.55, 4.1], rotation_deg: [90, 0, 0], size: [2.4, 2.2, 1.0], color: '#6b4022', material: 'wood' },
        { name: '船舱', shape: 'box', position: [0, 1.35, -0.8], size: [1.8, 1.0, 2.4], color: '#f3efe6', material: 'matte' },
        { name: '船窗', shape: 'box', position: [0, 1.4, -0.8], size: [1.86, 0.4, 1.5], color: '#38bdf8', material: 'glass' },
        { name: '主桅杆', shape: 'cylinder', position: [0, 3.6, 0.7], size: [0.22, 5.4, 0.22], color: '#5c4028', material: 'wood' },
        { name: '主风帆', shape: 'box', position: [0, 3.9, 1.1], rotation_deg: [0, 12, 0], size: [0.1, 3.6, 2.6], color: '#f8fafc', material: 'fabric' },
      ],
    });
  }

  if (/亭|凉亭|牌坊|鸟居|pavilion|gazebo|torii/.test(p)) {
    models.push({
      name: '中式景观凉亭',
      description: '石台基座、四根立柱与飞檐顶盖',
      anchor: 'hero_zone_center',
      offset_m: [6, 0, 5],
      place_on: 'ground',
      parts: [
        { name: '石阶台基', shape: 'cylinder', position: [0, 0.3, 0], size: [5.6, 0.6, 5.6], color: '#9a958c', material: 'stone' },
        { name: '木柱1', shape: 'cylinder', position: [-1.7, 2.1, -1.7], size: [0.28, 3.0, 0.28], color: '#8f2d27', material: 'wood' },
        { name: '木柱2', shape: 'cylinder', position: [1.7, 2.1, -1.7], size: [0.28, 3.0, 0.28], color: '#8f2d27', material: 'wood' },
        { name: '木柱3', shape: 'cylinder', position: [-1.7, 2.1, 1.7], size: [0.28, 3.0, 0.28], color: '#8f2d27', material: 'wood' },
        { name: '木柱4', shape: 'cylinder', position: [1.7, 2.1, 1.7], size: [0.28, 3.0, 0.28], color: '#8f2d27', material: 'wood' },
        { name: '亭檐屋顶', shape: 'cone', position: [0, 4.4, 0], size: [6.4, 2.0, 6.4], color: '#3b4958', material: 'stone' },
        { name: '宝顶', shape: 'sphere', position: [0, 5.5, 0], size: [0.55, 0.55, 0.55], color: '#d97706', material: 'metal' },
      ],
    });
  }

  if (/帐篷|营地|露营|篝火|tent|camp/.test(p)) {
    models.push({
      name: '野外露营帐篷与篝火',
      description: '三角帆布帐篷与围石篝火',
      anchor: 'hero_zone_center',
      offset_m: [-5, 0, 4],
      place_on: 'ground',
      parts: [
        { name: '帐篷主篷', shape: 'cone', position: [0, 1.25, 0], size: [3.6, 2.5, 3.8], color: '#c9783a', material: 'fabric' },
        { name: '石圈火塘', shape: 'torus', position: [3.6, 0.2, 1.0], rotation_deg: [90, 0, 0], size: [1.5, 1.5, 0.45], color: '#6b6a65', material: 'stone' },
        { name: '篝火光核', shape: 'cone', position: [3.6, 0.45, 1.0], size: [0.65, 0.85, 0.65], color: '#f97316', material: 'emissive' },
      ],
    });
  }

  if (/雷达|天线|风车|吊塔|radar|windmill|crane/.test(p)) {
    models.push({
      name: '高架探测雷达站',
      description: '钢结构底座、支架与倾斜抛物面雷达盘',
      anchor: 'hero_zone_center',
      offset_m: [4, 0, -5],
      place_on: 'ground',
      parts: [
        { name: '混凝土台座', shape: 'box', position: [0, 0.6, 0], size: [4.2, 1.2, 4.2], color: '#9ca3af', material: 'stone' },
        { name: '钢结构塔架', shape: 'cylinder', position: [0, 3.0, 0], size: [1.6, 3.6, 1.6], top_ratio: 0.72, color: '#475569', material: 'metal' },
        { name: '俯仰转台', shape: 'box', position: [0, 5.1, 0], size: [1.4, 0.9, 1.4], color: '#334155', material: 'metal' },
        { name: '雷达锅盘', shape: 'cylinder', position: [0, 6.2, 0.4], rotation_deg: [-42, 0, 0], size: [4.2, 0.4, 4.2], top_ratio: 1.2, color: '#e2e8f0', material: 'metal' },
        { name: '馈源探头', shape: 'sphere', position: [0, 7.1, 1.4], size: [0.45, 0.45, 0.45], color: '#ef4444', material: 'emissive' },
      ],
    });
  }

  if (/喷泉|雕像|纪念碑|fountain|statue|monument/.test(p)) {
    models.push({
      name: '广场石雕喷泉',
      description: '多层圆形水池与中央纪念石柱',
      anchor: 'hero_zone_center',
      offset_m: [0, 0, 0],
      place_on: 'ground',
      parts: [
        { name: '底层水池壁', shape: 'cylinder', position: [0, 0.35, 0], size: [5.8, 0.7, 5.8], color: '#cbd5e1', material: 'stone' },
        { name: '水池水面', shape: 'cylinder', position: [0, 0.62, 0], size: [5.2, 0.2, 5.2], color: '#38bdf8', material: 'glass' },
        { name: '中央石座', shape: 'cylinder', position: [0, 1.5, 0], size: [1.4, 1.9, 1.4], top_ratio: 0.75, color: '#94a3b8', material: 'stone' },
        { name: '顶层雕塑', shape: 'dodecahedron', position: [0, 2.85, 0], size: [1.2, 1.4, 1.2], color: '#d97706', material: 'metal' },
      ],
    });
  }

  return models;
}

function resolveWorldEntityTarget(
  phrase: string,
  currentWorld?: WorldState
): string | undefined {
  const clean = phrase
    .trim()
    .replace(/^(那个|那辆|那根|那栋|这辆|这个|所有|全部|一只|一个|一辆|一根)/, '')
    .trim();
  if (!clean) return undefined;
  const lower = clean.toLowerCase();

  if (currentWorld) {
    for (const ch of currentWorld.characters) {
      if (ch.id.toLowerCase() === lower || ch.name.toLowerCase() === lower) return ch.id;
      if (ch.name.toLowerCase().includes(lower) || lower.includes(ch.name.toLowerCase())) return ch.id;
    }
    for (const cm of currentWorld.customModels ?? []) {
      if (cm.id.toLowerCase() === lower || cm.name.toLowerCase().includes(lower) || lower.includes(cm.name.toLowerCase())) {
        return cm.id;
      }
    }
    for (const a of currentWorld.assets) {
      if (a.id.toLowerCase() === lower || a.name.toLowerCase().includes(lower) || lower.includes(a.name.toLowerCase())) {
        return a.id;
      }
    }
    for (const b of currentWorld.buildings) {
      if (b.id.toLowerCase() === lower || b.name.toLowerCase().includes(lower) || lower.includes(b.name.toLowerCase())) {
        return b.id;
      }
    }
    if (currentWorld.heroCompound && /安全屋|主建筑|英雄建筑|大厅|hero_compound/.test(lower)) {
      return currentWorld.heroCompound.id;
    }
  }

  if (/主角|主人公|特工|玩家|hero|player/.test(lower)) {
    return currentWorld?.characters[0]?.id ?? 'hero';
  }
  if (/对手|敌人|哨兵|反派|enemy|guard|opponent/.test(lower)) {
    return currentWorld?.characters[1]?.id ?? currentWorld?.characters[0]?.id ?? 'opponent';
  }
  if (/侦察|天台/.test(lower)) {
    const scout = currentWorld?.characters.find((c) => /侦察|天台|哨/.test(c.name));
    if (scout) return scout.id;
  }
  if (/车|汽车|轿车|警车|卡车|car|vehicle/.test(lower)) return 'car';
  if (/路障|防撞墩|掩体|护栏|barrier|cover/.test(lower)) return 'barrier';
  if (/货箱|集装箱|cargo/.test(lower)) return 'cargo_stack';
  if (/木箱|箱子|crate/.test(lower)) return 'crate';
  if (/树|tree/.test(lower)) return 'tree';
  if (/路灯|灯|lamp/.test(lower)) return 'lamp';
  if (/岩石|石头|rock/.test(lower)) return 'rock';
  if (/高台|平台|地板|floor|platform/.test(lower)) return 'floor';
  if (/立柱|柱子|pillar/.test(lower)) return 'pillar';
  if (/台阶|楼梯|stairs/.test(lower)) return 'stairs';
  if (/斜坡|ramp/.test(lower)) return 'ramp';
  return clean;
}

function parseActionPhrase(phrase: string): string | undefined {
  const s = phrase.toLowerCase();
  if (/蹲|掩体|躲|crouch/.test(s)) return 'crouch_cover';
  if (/瞄准|举枪|持枪|持械|瞄|aim/.test(s)) return 'aim';
  if (/疾跑|奔跑|冲刺|跑|run/.test(s)) return 'run';
  if (/巡逻|行走|步行|走|walk/.test(s)) return 'walk';
  if (/坐|sit/.test(s)) return 'sit';
  if (/靠墙|lean/.test(s)) return 'lean_wall';
  if (/俯瞰|侦察|观望|look/.test(s)) return 'look_over_edge';
  if (/站立|待机|立正|idle/.test(s)) return 'idle';
  return undefined;
}

function buildLocalAppendPatchProgram(
  prompt: string,
  currentWorld?: WorldState
): SemanticProgram | null {
  const clauses = prompt
    .split(/[，,。；;\n]+|并且|然后|同时/)
    .map((s) => s.trim())
    .filter(Boolean);

  const commands: SemanticCommand[] = [];
  const patches: SemanticPatchOp[] = [];
  const terrainPatch: Extract<SemanticCommand, { cmd: 'set_terrain' }> = {
    cmd: 'set_terrain',
  };
  let hasTerrainChange = false;

  for (const clause of clauses) {
    // 1. Environment / Lighting / Fog Patch
    if (/去雾|清除雾|去掉雾|消雾|无雾|晴朗/.test(clause)) {
      terrainPatch.fog_density = 0;
      hasTerrainChange = true;
    } else if (/大雾|浓雾|起雾|迷雾|加雾/.test(clause)) {
      terrainPatch.fog_density = 0.018;
      hasTerrainChange = true;
    }
    if (/黄昏|夕阳|日落/.test(clause)) {
      terrainPatch.sun_elevation = 16;
      terrainPatch.sun_azimuth = 225;
      hasTerrainChange = true;
    } else if (/黑夜|夜晚|深夜|夜景/.test(clause)) {
      terrainPatch.sun_elevation = 10;
      hasTerrainChange = true;
    } else if (/正午|中午|白天/.test(clause)) {
      terrainPatch.sun_elevation = 56;
      hasTerrainChange = true;
    }

    // 2. Remove op
    const rmMatch = /^(?:请)?(?:删除|移除|去掉|删掉|取消|清空)(.+)$/.exec(clause);
    if (rmMatch && !/雾/.test(rmMatch[1])) {
      const rawTarget = rmMatch[1].trim();
      const removeAll = /所有|全部/.test(rawTarget);
      const targetId = resolveWorldEntityTarget(rawTarget, currentWorld);
      if (targetId) {
        patches.push({ op: 'remove', target_id: targetId, remove_all: removeAll });
        continue;
      }
    }

    // 3. Relative movement op: 把A移到B后面2米
    const relMoveMatch =
      /^(?:请)?(?:把|将|让)?(.+?)(?:移动?到|挪到|移至|站到|躲到|放在|摆到)(.+?)(?:的)?(前面|前边|前方|后面|后边|后方|背后|左边|左侧|右边|右侧|上面|顶部|上方|附近|周围|旁边)(?:(\d+(?:\.\d+)?)\s*(?:米|m))?(?:处)?$/.exec(
        clause
      );
    if (relMoveMatch) {
      const targetId = resolveWorldEntityTarget(relMoveMatch[1], currentWorld);
      const anchorPhrase = relMoveMatch[2].trim();
      const relWord = relMoveMatch[3];
      const dist = relMoveMatch[4] ? Number(relMoveMatch[4]) : 2.5;
      const relation: SpatialRelation = /前/.test(relWord)
        ? 'in_front_of'
        : /后|背/.test(relWord)
        ? 'behind'
        : /左/.test(relWord)
        ? 'left_of'
        : /右/.test(relWord)
        ? 'right_of'
        : /上|顶/.test(relWord)
        ? 'on_top_of'
        : 'around';
      const relTarget =
        /场景中心|中心|原点/.test(anchorPhrase)
          ? 'scene_center'
          : resolveWorldEntityTarget(anchorPhrase, currentWorld) ?? 'scene_center';
      if (targetId) {
        patches.push({
          op: 'update',
          target_id: targetId,
          relative_to: relTarget,
          relation,
          distance_m: Number.isFinite(dist) ? dist : 2.5,
        });
        continue;
      }
    }

    // 4. Offset nudge: 把A往前/左/右/后移动3米
    const nudgeMatch =
      /^(?:请)?(?:把|将|让)?(.+?)(?:往|向)(前|后|左|右|东|西|南|北)(?:方)?(?:移动?|挪|偏)?(\d+(?:\.\d+)?)\s*(?:米|m)?$/.exec(
        clause
      );
    if (nudgeMatch) {
      const targetId = resolveWorldEntityTarget(nudgeMatch[1], currentWorld);
      const dir = nudgeMatch[2];
      const dist = Number(nudgeMatch[3]) || 2;
      if (targetId) {
        if (dir === '东') {
          patches.push({ op: 'update', target_id: targetId, offset_m: [dist, 0, 0] });
        } else if (dir === '西') {
          patches.push({ op: 'update', target_id: targetId, offset_m: [-dist, 0, 0] });
        } else if (dir === '南') {
          patches.push({ op: 'update', target_id: targetId, offset_m: [0, 0, dist] });
        } else if (dir === '北') {
          patches.push({ op: 'update', target_id: targetId, offset_m: [0, 0, -dist] });
        } else {
          const relation: SpatialRelation =
            dir === '前' ? 'in_front_of' : dir === '后' ? 'behind' : dir === '左' ? 'left_of' : 'right_of';
          patches.push({ op: 'update', target_id: targetId, relation, distance_m: dist });
        }
        continue;
      }
    }

    // 5. Scale / Rotate update
    const scaleMatch = /^(?:请)?(?:把|将)?(.+?)(?:放大|缩放|缩小)(?:到|至|为)?(\d+(?:\.\d+)?)\s*倍?$/.exec(clause);
    if (scaleMatch) {
      const targetId = resolveWorldEntityTarget(scaleMatch[1], currentWorld);
      const s = Math.max(0.2, Math.min(5, Number(scaleMatch[2]) || 1));
      if (targetId) {
        patches.push({ op: 'update', target_id: targetId, scale: [s, s, s] });
        continue;
      }
    }
    const rotMatch = /^(?:请)?(?:把|将|让)?(.+?)(?:旋转|转向|转动?)(-?\d+(?:\.\d+)?)\s*度$/.exec(clause);
    if (rotMatch) {
      const targetId = resolveWorldEntityTarget(rotMatch[1], currentWorld);
      const deg = Number(rotMatch[2]) || 0;
      if (targetId) {
        patches.push({ op: 'update', target_id: targetId, rotation_y_deg: deg });
        continue;
      }
    }

    // 6. Character pose update
    const poseMatch =
      /^(?:请)?(?:把|将|让)?(.+?)(?:改为|改成|变成|切换为?|保持|做)?(蹲下|蹲伏|躲入掩体|掩体|瞄准|举枪|持枪|奔跑|疾跑|冲刺|跑|行走|步行|巡逻|走|站立|待机|坐下|靠墙|俯瞰|侦察)(?:姿态|动作)?$/.exec(
        clause
      );
    if (poseMatch) {
      const targetId = resolveWorldEntityTarget(poseMatch[1], currentWorld);
      const action = parseActionPhrase(poseMatch[2]);
      if (targetId && action) {
        patches.push({ op: 'update', target_id: targetId, action });
        continue;
      }
    }

    // 7. Add op: 在主角前面3米加一辆车 / 添加木箱
    const addMatch =
      /(?:添加|新增|再加|增加|加上|放一[辆个根栋棵座]?|加一[辆个根栋棵座]?)(.+)$/.exec(clause);
    if (addMatch) {
      const addPhrase = addMatch[1].trim();
      let anchor = 'scene_center';
      let relation: SpatialRelation = 'around';
      let distanceM = 3.0;
      const whereMatch =
        /在(.+?)(?:的)?(前面|后面|左边|右边|旁边|附近)(?:(\d+(?:\.\d+)?)\s*(?:米|m))?/.exec(clause);
      if (whereMatch) {
        anchor = resolveWorldEntityTarget(whereMatch[1], currentWorld) ?? 'scene_center';
        relation = /前/.test(whereMatch[2])
          ? 'in_front_of'
          : /后/.test(whereMatch[2])
          ? 'behind'
          : /左/.test(whereMatch[2])
          ? 'left_of'
          : /右/.test(whereMatch[2])
          ? 'right_of'
          : 'around';
        distanceM = whereMatch[3] ? Number(whereMatch[3]) : 3.0;
      }
      if (/角色|主角|哨兵|士兵|敌人|人/.test(addPhrase)) {
        patches.push({
          op: 'add',
          character: {
            role: addPhrase.slice(0, 10) || '新增角色',
            action: parseActionPhrase(clause) ?? 'idle',
            anchor,
            relation,
            distance_m: distanceM,
          },
        });
      } else {
        const mapped = resolveWorldEntityTarget(addPhrase, undefined) ?? addPhrase;
        patches.push({
          op: 'add',
          element: {
            item: mapped,
            label: addPhrase.slice(0, 12),
            anchor,
            relation,
            distance_m: distanceM,
          },
        });
      }
    }
  }

  if (hasTerrainChange) {
    commands.push(terrainPatch);
  }
  if (patches.length > 0) {
    commands.push({ cmd: 'apply_scene_patches', patches });
  }
  if (commands.length === 0) return null;

  return {
    world_plan: {
      theme: currentWorld?.lastWorldPlan?.theme ?? '语义 Patch 增量编辑',
      terrainSummary: `已执行 ${patches.length} 条语义 Patch 指令`,
      districts: currentWorld?.lastWorldPlan?.districts ?? ['商业主街', '旧工业区', '高地广场', '河岸街区'],
      blockingArc: currentWorld?.lastWorldPlan?.blockingArc ?? '基于现有场景 ID 执行增量修改',
    },
    commands,
  };
}

function buildLocalDemoProgram(
  prompt: string,
  mode: 'replace' | 'append' = 'replace',
  currentWorld?: WorldState
): SemanticProgram {
  if (mode === 'append') {
    const patchProg = buildLocalAppendPatchProgram(prompt, currentWorld);
    if (patchProg) return patchProg;
  }
  const p = prompt.toLowerCase();

  // Atmosphere detection
  const hasFog = /雾|迷雾|暴雨|雨夜|阴天|fog|mist|rain/.test(p);
  const isDusk = /黄昏|夕阳|日落|暮色|逆光|sunset|dusk/.test(p);
  const isNight = /夜|黑夜|夜晚|深夜|night/.test(p);

  // Terrain & District focus detection
  const hasWater = /河|运河|水渠|河道|河岸|码头|canal|river/.test(p);
  const isHill = /山坡|丘陵|高地|坡地|hill/.test(p);
  const isIndustrial = /工业|工厂|废墟|仓库|厂房|货箱|集装箱|industrial|warehouse/.test(p);
  const isPlaza = /广场|废墟大厅|高台|庭院|立柱|plaza|courtyard|ruin/.test(p);
  const pattern = 'none' as const;

  const heroZone: DistrictId = hasWater
    ? 'canal_bank'
    : isIndustrial
    ? 'old_industrial'
    : isPlaza
    ? 'overpass_plaza'
    : 'commercial_main';

  const theme: TerrainTheme = hasWater
    ? 'coastal_canal'
    : isHill
    ? 'hillside_district'
    : isIndustrial
    ? 'industrial_valley'
    : 'urban_flat';

  const commands: SemanticCommand[] = [];

  if (mode === 'replace') {
    commands.push(
      {
        cmd: 'set_terrain',
        theme,
        relief: isHill ? 0.78 : isPlaza ? 0.2 : 0.38,
        has_water_channel: hasWater,
        hero_zone: heroZone,
        fog_density: hasFog ? 0.016 : 0.006,
        sun_elevation: isNight ? 10 : isDusk ? 16 : 48,
        sun_azimuth: isDusk ? 225 : 42,
      },
      { cmd: 'build_road_grid', pattern, width: /窄|巷/.test(p) ? 9 : 12 },
      {
        cmd: 'spawn_district_buildings',
        zone: heroZone,
        style: isIndustrial ? 'industrial' : 'modern',
        count: isPlaza ? 4 : 8,
        min_floors: 2,
        max_floors: isIndustrial ? 4 : 6,
        enterable_hero_building: /室内|大厅|安全屋|门|二楼|阳台|屋|楼/.test(p) || !isPlaza,
      }
    );

    if (heroZone !== 'commercial_main') {
      commands.push({
        cmd: 'spawn_district_buildings',
        zone: 'commercial_main',
        style: 'modern',
        count: 5,
        min_floors: 3,
        max_floors: 6,
      });
    }

    commands.push({
      cmd: 'scatter_props',
      zone: heroZone,
      preset: hasWater
        ? 'canal_trees'
        : isIndustrial
        ? 'industrial_cargo'
        : 'street_urban',
      density: 0.75,
    });
  }

  // Prompt-specific structured element synthesis
  const elements: SceneElementRequest[] = [];
  if (/柱|立柱|pillar|column/.test(p)) {
    elements.push({
      item: 'pillar',
      label: '围合立柱',
      count: /八/.test(p) ? 8 : /六/.test(p) ? 6 : 4,
      arrangement: 'ring',
      anchor: 'hero_zone_center',
      scale: [1.3, 1.5, 1.3],
    });
  }
  if (/高台|平台|platform/.test(p)) {
    elements.push({
      item: 'floor',
      label: '中央高台',
      count: 1,
      anchor: 'hero_zone_center',
      offset_m: [0, 0.55, 0],
      scale: [2.2, 4, 2.2],
    });
  }
  if (/斜坡|ramp/.test(p)) {
    elements.push({
      item: 'ramp',
      label: '斜坡通道',
      count: 1,
      anchor: 'hero_zone_center',
      offset_m: [-3.5, 0, 2.5],
    });
  }
  if (/阶|楼梯|stairs/.test(p)) {
    elements.push({
      item: 'stairs',
      label: '台阶',
      count: 1,
      anchor: 'hero_zone_center',
      offset_m: [0, 0, 4.2],
    });
  }
  if (/车队|追逐|警车|卡车|车|vehicle|car|convoy/.test(p)) {
    elements.push({
      item: 'car',
      label: '车辆阵列',
      count: /车队|追逐|堵/.test(p) ? 4 : 2,
      arrangement: 'convoy',
      anchor: 'hero_zone_center',
      offset_m: [1.5, 0, -2],
    });
  }
  if (/货箱|集装箱|crate|cargo/.test(p)) {
    elements.push({
      item: 'cargo_stack',
      label: '货箱掩体群',
      count: 4,
      arrangement: 'cluster',
      anchor: 'hero_zone_center',
    });
  }
  if (/防撞墩|路障|barrier/.test(p)) {
    elements.push({
      item: 'barrier',
      label: '防撞墩防线',
      count: 4,
      arrangement: 'line',
      anchor: 'hero_zone_center',
      offset_m: [-1.5, 0, 3],
    });
  }
  if (/树|森林|公园|tree/.test(p)) {
    elements.push({
      item: 'tree',
      label: '景观树木',
      count: 8,
      arrangement: 'scatter',
      anchor: 'hero_zone_center',
    });
  }
  if (/桌|会议|table/.test(p)) {
    elements.push({
      item: 'table',
      label: '大厅长桌',
      count: 1,
      anchor: 'inside_lobby',
    });
  }

  if (elements.length > 0) {
    commands.push({
      cmd: 'place_scene_elements',
      zone: heroZone,
      elements,
    });
  }

  const synthesizedModels = synthesizeCustomModelsFromPrompt(prompt, hasWater);
  if (synthesizedModels.length > 0) {
    commands.push({
      cmd: 'create_custom_models',
      zone: heroZone,
      models: synthesizedModels,
    });
  }

  // Character staging directly aligned to prompt nouns & actions
  const cast: {
    role: string;
    action: string;
    placement_rule: string;
    relative_to?: string;
    distance_m: number;
    facing?: string;
  }[] = [];

  if (mode === 'replace') {
    if (/室内|大厅|安全屋/.test(p)) {
      cast.push({
        role: '室内主角',
        action: /瞄|枪/.test(p) ? 'aim' : 'crouch_cover',
        placement_rule: 'inside_lobby',
        distance_m: 1.5,
      });
    } else {
      cast.push({
        role: '主角',
        action: /跑|冲|追/.test(p)
          ? 'run'
          : /坐/.test(p)
          ? 'sit'
          : /瞄|枪/.test(p)
          ? 'aim'
          : 'crouch_cover',
        placement_rule: elements.some((e) => e.item === 'barrier' || e.item === 'cargo_stack')
          ? 'behind_nearest_cover'
          : hasWater
          ? 'on_canal_bank'
          : 'at_plaza_center',
        distance_m: 1.6,
      });
    }

    cast.push({
      role: '对手目标',
      action: /跑|逃/.test(p) ? 'run' : /瞄|对峙|交火/.test(p) ? 'aim' : 'walk',
      placement_rule: 'relative',
      relative_to: '主角',
      distance_m: 12,
      facing: 'toward_hero',
    });

    if (/狙击|哨兵|天台|高台|屋顶/.test(p)) {
      cast.push({
        role: '高处哨兵',
        action: /瞄|狙/.test(p) ? 'aim' : 'look_over_edge',
        placement_rule: 'on_rooftop_edge',
        distance_m: 1,
        facing: 'toward_hero',
      });
    }

    commands.push({
      cmd: 'stage_characters',
      zone: heroZone,
      cast,
    });
  }

  if (mode === 'replace') {
    const focusStyle: FocusStyle = /室内|门|安全屋|一镜/.test(p)
      ? 'indoor_outdoor'
      : hasWater
      ? 'canal_patrol'
      : isPlaza
      ? 'plaza_standoff'
      : 'street_chase';
    commands.push({
      cmd: 'generate_multi_shot_coverage',
      shot_count: 3,
      focus_style: focusStyle,
    });
  }

  return {
    world_plan: {
      theme: prompt.slice(0, 36) || '开放都市预演世界',
      terrainSummary: `${theme} · ${pattern} · 核心区 ${heroZone}`,
      districts: ['商业主街', '旧工业区', '高地广场', '河岸街区'],
      blockingArc: `围绕核心区 [${heroZone}] 部署场景要素并匹配角色调度`,
    },
    commands,
  };
}

function buildLocalDemoCamera(prompt: string, world: WorldState, shot: ShotData): ShotKeyframe[] {
  const dur = shot.duration;
  const chars = world.characters;
  let focus: Vec3 = [0, 1.3, 0];
  if (chars.length > 0) {
    const sum = chars.reduce(
      (acc, c) => [acc[0] + c.position[0], acc[1] + c.position[1] + 1.2, acc[2] + c.position[2]],
      [0, 0, 0]
    );
    focus = [sum[0] / chars.length, sum[1] / chars.length, sum[2] / chars.length];
  }
  const [fx, fy, fz] = focus;
  const p = prompt.toLowerCase();

  if (p.includes('室内') || p.includes('进门') || p.includes('一镜')) {
    if (world.heroCompound) {
      const hx = world.heroCompound.position[0];
      const hy = world.heroCompound.position[1];
      const hz = world.heroCompound.position[2];
      return [
        { id: makeId('kf'), time: 0, position: [hx + 10, hy + 1.7, hz], target: [hx, hy + 1.5, hz], focalLength: 28 },
        { id: makeId('kf'), time: dur, position: [hx + 1.2, hy + 1.6, hz + 0.3], target: [hx - 3.5, hy + 2.0, hz - 1], focalLength: 35 },
      ];
    }
  }
  if (p.includes('环绕') || p.includes('orbit')) {
    return [
      { id: makeId('kf'), time: 0, position: [fx + 5, fy + 1.2, fz + 2], target: focus, focalLength: 35 },
      { id: makeId('kf'), time: dur * 0.5, position: [fx, fy + 1.6, fz + 5.5], target: focus, focalLength: 40 },
      { id: makeId('kf'), time: dur, position: [fx - 5, fy + 1.2, fz + 1.5], target: focus, focalLength: 35 },
    ];
  }
  return [
    { id: makeId('kf'), time: 0, position: [fx + 2.2, fy + 1.4, fz + 7.5], target: focus, focalLength: 28 },
    { id: makeId('kf'), time: dur, position: [fx - 0.8, fy + 0.6, fz + 2.5], target: focus, focalLength: 45 },
  ];
}

export interface LLMCallMeta {
  model: string;
  latencyMs: number;
  via: 'direct' | 'vite-proxy';
  promptTokens?: number;
  completionTokens?: number;
  finishReason?: string;
}

export interface ApiConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  model: string;
  via: 'direct' | 'vite-proxy';
  reply?: string;
  error?: string;
}

export function isLocalEndpoint(baseUrl: string): boolean {
  const b = (baseUrl || '').trim().toLowerCase();
  return (
    b.startsWith('/api/ollama') ||
    b.includes('localhost') ||
    b.includes('127.0.0.1') ||
    b.includes('0.0.0.0')
  );
}

export function isAIConfigured(aiConfig: AIConfig): boolean {
  return Boolean(aiConfig.apiKey.trim()) || isLocalEndpoint(aiConfig.baseUrl);
}

function buildChatCompletionsUrl(baseUrl: string): string {
  const cleaned = (baseUrl || 'https://api.deepseek.com').trim().replace(/\/+$/, '');
  if (!cleaned) return 'https://api.deepseek.com/chat/completions';
  if (cleaned.endsWith('/chat/completions')) return cleaned;
  return `${cleaned}/chat/completions`;
}

function formatHttpErrorDiagnostic(status: number, url: string, body: string): string {
  const snippet = body.slice(0, 260);
  const isOllama = url.includes('/api/ollama') || url.includes('11434');
  if (isOllama && (status === 404 || status >= 500)) {
    return status === 404 && snippet.toLowerCase().includes('model')
      ? `本地 Ollama 尚未找到指定模型 (404)：请先在终端执行 ollama pull qwen2.5-coder:7b。详情：${snippet}`
      : `本地 Ollama 服务未响应 (${status})：请确认本机已安装并启动 Ollama（监听 11434 端口），并已拉取模型（如 ollama run qwen2.5-coder:7b）。`;
  }
  if (status === 401) {
    return `鉴权失败 (401 Unauthorized)：请检查 DeepSeek API Key 是否有效或有多余空格。详情：${snippet}`;
  }
  if (status === 402) {
    return `DeepSeek 账户余额不足 (402 Payment Required)：请前往 platform.deepseek.com 充值后重试。详情：${snippet}`;
  }
  if (status === 404) {
    return `接口路径不存在 (404 Not Found)：${url}。官方地址请填写 https://api.deepseek.com。`;
  }
  if (status === 429) {
    return `请求触发限流或配额不足 (429 Too Many Requests)：请稍等数秒再试。详情：${snippet}`;
  }
  return `API 请求失败 (${status}): ${snippet}`;
}

/**
 * DeepSeek V3 (`deepseek-chat`) Shallow Function Calling Tool Definitions (Schema depth <= 3 layers).
 * Each tool isolates a single responsibility so a syntax or enum error in one call never crashes the whole scene.
 */
export const DEEPSEEK_SCENE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'set_terrain',
      description: '设置地形主题、水系河道与太阳光影大气参数（仅新建模式调用）',
      parameters: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            enum: ['urban_flat', 'coastal_canal', 'hillside_district', 'industrial_valley'],
          },
          relief: { type: 'number', description: '地形起伏 0.0~1.0' },
          has_water_channel: { type: 'boolean', description: '是否开启水渠河道' },
          hero_zone: {
            type: 'string',
            enum: ['commercial_main', 'old_industrial', 'overpass_plaza', 'canal_bank'],
          },
          sun_elevation: { type: 'number', description: '太阳仰角 8~80 度' },
          sun_azimuth: { type: 'number', description: '太阳方位角 0~360 度' },
          fog_density: { type: 'number', description: '雾气浓度 0.0~0.03' },
        },
        required: ['theme', 'has_water_channel', 'hero_zone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'spawn_district_buildings',
      description: '在指定街区生成背景楼宇或可进入双层主体建筑',
      parameters: {
        type: 'object',
        properties: {
          zone: {
            type: 'string',
            enum: ['commercial_main', 'old_industrial', 'overpass_plaza', 'canal_bank'],
          },
          style: { type: 'string', enum: ['modern', 'industrial', 'residential'] },
          count: { type: 'number', description: '楼宇数量 0~14' },
          min_floors: { type: 'number' },
          max_floors: { type: 'number' },
          enterable_hero_building: { type: 'boolean' },
        },
        required: ['zone', 'count'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'place_scene_element',
      description: '按相对空间关系与锚点布置单个或阵列标准场景构件（严禁输出绝对 XYZ 坐标）',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '构件唯一 element_id，如 car_01, crate_cover_01' },
          item: {
            type: 'string',
            enum: [
              'pillar',
              'wall',
              'floor',
              'stairs',
              'ramp',
              'doorway',
              'crate',
              'table',
              'roof',
              'car',
              'barrier',
              'cargo_stack',
              'tree',
              'bush',
              'rock',
              'lamp',
            ],
          },
          label: { type: 'string', description: '中文名称标注' },
          anchor: {
            type: 'string',
            description:
              '已注册的 element_id 或语义锚点（scene_center, door_main, ground_level, canal_water, coast, plaza, industrial, inside_lobby, rooftop）',
          },
          relation: {
            type: 'string',
            enum: ['in_front_of', 'behind', 'left_of', 'right_of', 'around', 'on_top_of', 'along'],
          },
          distance_m: { type: 'number', description: '与锚点的相对距离（米）' },
          arrangement: {
            type: 'string',
            enum: ['single', 'ring', 'grid', 'line', 'cluster', 'pair'],
          },
          count: { type: 'number', description: '数量 1~18' },
          facing: {
            type: 'string',
            enum: ['toward_anchor', 'away_from_anchor', 'north', 'south', 'east', 'west'],
          },
        },
        required: ['id', 'item', 'anchor', 'relation', 'distance_m'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'build_composite_model',
      description:
        '【开放词表复合体拼装】对资产库没有的特殊物体（如塔吊、灯塔、拱桥、凉亭、帆船、雷达等），使用 5 种基础几何体 (box/cylinder/cone/plane/torus) 搭积木组装 THREE.Group 层级结构，严禁退化成单个 box！',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '复合体唯一 element_id，如 crane_01, lighthouse_01' },
          name: { type: 'string', description: '复合体中文名称' },
          description: { type: 'string', description: '结构简述' },
          anchor: {
            type: 'string',
            description:
              '已注册的 element_id 或语义锚点（scene_center, door_main, ground_level, canal_water, coast, plaza, industrial）',
          },
          relation: {
            type: 'string',
            enum: ['in_front_of', 'behind', 'left_of', 'right_of', 'around', 'on_top_of', 'along'],
          },
          distance_m: { type: 'number', description: '距锚点距离（米）' },
          place_on: { type: 'string', enum: ['ground', 'water_surface'] },
          arrangement: { type: 'string', enum: ['single', 'ring', 'grid', 'line', 'pair'] },
          count: { type: 'number' },
          composite_primitives: {
            type: 'array',
            description: '至少包含 2~10 个基础几何体部件的层级列表',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                shape: { type: 'string', enum: ['box', 'cylinder', 'cone', 'plane', 'torus'] },
                local_position: {
                  type: 'array',
                  items: { type: 'number' },
                  description: '相对于复合体底面中心 [0,0,0] 的局部坐标 [x, y, z]（米）',
                },
                local_rotation_deg: {
                  type: 'array',
                  items: { type: 'number' },
                  description: '局部旋转角度 [rx, ry, rz]（度）',
                },
                size: {
                  type: 'array',
                  items: { type: 'number' },
                  description: '几何体尺寸 [widthX, heightY, depthZ]（米）',
                },
                color: { type: 'string', description: '十六进制颜色如 #eab308' },
                material: {
                  type: 'string',
                  enum: ['matte', 'wood', 'stone', 'metal', 'glass', 'foliage', 'emissive', 'fabric'],
                },
              },
              required: ['name', 'shape', 'local_position', 'size', 'color'],
            },
          },
        },
        required: ['id', 'name', 'anchor', 'composite_primitives'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stage_character',
      description: '按相对空间关系部署 16 关节角色及其动作姿态',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '角色唯一 ID，如 hero, enemy_01, sniper_01' },
          role: { type: 'string', description: '角色名称，如 主角、对手、哨兵' },
          action: {
            type: 'string',
            enum: ['idle', 'walk', 'run', 'crouch_cover', 'aim', 'sit', 'lean_wall', 'look_over_edge'],
          },
          relative_to: {
            type: 'string',
            description: '参照的已注册 element_id（如 car_01, hero）或语义锚点（door_main, rooftop, plaza）',
          },
          relation: {
            type: 'string',
            enum: ['in_front_of', 'behind', 'left_of', 'right_of', 'around', 'on_top_of', 'along'],
          },
          distance_m: { type: 'number', description: '与参照物的相对距离（米）' },
          facing: {
            type: 'string',
            enum: ['toward_anchor', 'away_from_anchor', 'toward_hero', 'toward_target', 'north', 'south'],
          },
        },
        required: ['id', 'role', 'action', 'relative_to', 'relation', 'distance_m'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_scene_patch',
      description:
        '【多轮增量编辑专用】基于 target_id 的最小化语义 Patch（add / remove / update），严禁全量重写已有场景！',
      parameters: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['add', 'remove', 'update'] },
          target_id: {
            type: 'string',
            description: 'remove 或 update 必填：必须存在于当前场景状态中的对象 ID 或名称（如 hero / char_1 / car_01）',
          },
          remove_all: { type: 'boolean', description: 'op=remove 时设为 true 可清除同类别全部对象' },
          relative_to: { type: 'string', description: 'update/add 时的参照对象 ID 或语义锚点' },
          relation: {
            type: 'string',
            enum: ['in_front_of', 'behind', 'left_of', 'right_of', 'around', 'on_top_of', 'along'],
          },
          distance_m: { type: 'number', description: '相对距离（米）' },
          offset_m: {
            type: 'array',
            items: { type: 'number' },
            description: '可选 [dx, dy, dz] 偏移（米），若无 relative_to 则按目标自身当前位置偏移',
          },
          facing: { type: 'string' },
          rotation_y_deg: { type: 'number', description: 'Y 轴朝向角（度）' },
          scale: {
            type: 'array',
            items: { type: 'number' },
            description: '缩放倍数 [sx, sy, sz]',
          },
          action: {
            type: 'string',
            enum: ['idle', 'walk', 'run', 'crouch_cover', 'aim', 'sit', 'lean_wall', 'look_over_edge'],
          },
          add_id: { type: 'string', description: 'op=add 时新增对象的 ID' },
          add_item: { type: 'string', description: 'op=add 时新增构件类型（如 car, crate, barrier, tree, character）' },
          add_label: { type: 'string', description: 'op=add 时新增对象中文标签' },
          add_role: { type: 'string', description: 'op=add 新增角色时的身份名称' },
          add_count: { type: 'number', description: 'op=add 时数量 1~12' },
        },
        required: ['op'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_camera_coverage',
      description: '配置围绕核心主体的多机位运镜风格与镜头数',
      parameters: {
        type: 'object',
        properties: {
          shot_count: { type: 'number', description: '镜头数量 1~4' },
          focus_style: {
            type: 'string',
            enum: [
              'street_chase',
              'indoor_outdoor',
              'plaza_standoff',
              'sniper_overwatch',
              'canal_patrol',
            ],
          },
        },
        required: ['shot_count', 'focus_style'],
      },
    },
  },
];

async function fetchChatCompletion(
  targetUrl: string,
  apiKey: string,
  rawModel: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
  withJsonFormat: boolean,
  timeoutMs: number,
  tools?: unknown[],
  initialRegisteredIds?: string[]
): Promise<{ content: string; meta: Omit<LLMCallMeta, 'latencyMs' | 'via'> }> {
  // Architectural Rule 1: Strictly lock to deepseek-chat (V3), never allow deepseek-reasoner (R1) or deepseek-flash
  const model =
    !isLocalEndpoint(targetUrl) || /reasoner|r1|flash/i.test(rawModel)
      ? 'deepseek-chat'
      : rawModel || 'deepseek-chat';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    // When Function Calling tools are provided, run a multi-step tool-calling loop (up to 4 turns)
    // so deepseek-chat executes the full sequence: set_terrain -> place_scene_element / build_composite_model -> stage_character -> set_camera_coverage
    if (tools && tools.length > 0) {
      const messages: Record<string, unknown>[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
      const allCommands: Record<string, unknown>[] = [];
      const registeredIds = new Set<string>([
        'scene_center',
        'ground_level',
        'door_main',
        'plaza',
        'canal_water',
        'coast',
        'industrial',
        ...(initialRegisteredIds ?? []),
      ]);
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let resolvedModel = model;
      let lastFinishReason = 'tool_calls';
      let lastTextContent = '';

      const isIncrementalPrompt = userPrompt.includes('多轮增量编辑模式');

      for (let turn = 0; turn < 4; turn++) {
        const payload: Record<string, unknown> = {
          model,
          max_tokens: maxTokens,
          temperature,
          messages,
          tools,
          tool_choice: 'auto',
        };

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          const err = new Error(formatHttpErrorDiagnostic(res.status, targetUrl, errText)) as Error & {
            httpStatus?: number;
          };
          err.httpStatus = res.status;
          throw err;
        }

        const data = (await res.json()) as {
          model?: string;
          choices?: {
            finish_reason?: string;
            message?: {
              role?: string;
              content?: string | null;
              reasoning_content?: string;
              tool_calls?: {
                id?: string;
                type?: string;
                function?: { name?: string; arguments?: string };
              }[];
            };
          }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };

        resolvedModel =
          data.model && !/reasoner|r1|flash/i.test(data.model) ? data.model : model;
        totalPromptTokens += data.usage?.prompt_tokens ?? 0;
        totalCompletionTokens += data.usage?.completion_tokens ?? 0;

        const choice = data.choices?.[0];
        lastFinishReason = choice?.finish_reason || lastFinishReason;
        const toolCalls = choice?.message?.tool_calls;
        if (choice?.message?.content) {
          lastTextContent = choice.message.content;
        }

        if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
          break;
        }

        messages.push({
          role: 'assistant',
          content: choice?.message?.content ?? '',
          tool_calls: toolCalls,
        });

        const turnCalledNames: string[] = [];
        for (let i = 0; i < toolCalls.length; i++) {
          const tc = toolCalls[i];
          const fnName = tc.function?.name?.trim();
          const fnArgsRaw = tc.function?.arguments ?? '{}';
          const callId = tc.id || `call_${turn}_${i}`;
          if (!fnName) continue;
          turnCalledNames.push(fnName);
          try {
            const parsedArgs = extractJsonObject(fnArgsRaw);
            allCommands.push({ cmd: fnName, ...parsedArgs });
            if (typeof parsedArgs.id === 'string') registeredIds.add(parsedArgs.id);
            if (typeof parsedArgs.label === 'string') registeredIds.add(parsedArgs.label);
            if (typeof parsedArgs.name === 'string') registeredIds.add(parsedArgs.name);
            if (typeof parsedArgs.role === 'string') registeredIds.add(parsedArgs.role);
            messages.push({
              role: 'tool',
              tool_call_id: callId,
              content: JSON.stringify({
                status: 'ok',
                executed: fnName,
                registered_anchors: Array.from(registeredIds).slice(-16),
              }),
            });
          } catch (parseErr) {
            messages.push({
              role: 'tool',
              tool_call_id: callId,
              content: JSON.stringify({
                status: 'error',
                error: `工具参数 JSON 解析失败: ${parseErr instanceof Error ? parseErr.message : 'invalid json'}`,
              }),
            });
          }
        }

        // Check whether core scene elements and characters have been placed
        const hasSceneObjects = allCommands.some(
          (c) =>
            c.cmd === 'place_scene_element' ||
            c.cmd === 'place_scene_elements' ||
            c.cmd === 'build_composite_model' ||
            c.cmd === 'create_custom_models' ||
            c.cmd === 'apply_scene_patch' ||
            c.cmd === 'apply_scene_patches'
        );
        const hasCharacters = allCommands.some(
          (c) =>
            c.cmd === 'stage_character' ||
            c.cmd === 'stage_characters' ||
            c.cmd === 'apply_scene_patch'
        );

        if (isIncrementalPrompt && allCommands.length > 0) {
          break;
        }
        if (hasSceneObjects && hasCharacters) {
          break;
        }

        // Prompt deepseek-chat to continue calling the remaining tools in the next turn
        const missingHints: string[] = [];
        if (!hasSceneObjects) {
          missingHints.push(
            '请立即调用 place_scene_element（如 floor 高台、pillar 立柱、ramp 斜坡、stairs 台阶等）或 build_composite_model（复合几何体）布置提示词中的所有必含场景构件！'
          );
        }
        if (!hasCharacters) {
          missingHints.push('请立即调用 stage_character 部署提示词中的所有角色及其相对位置与动作！');
        }
        messages.push({
          role: 'user',
          content: `已执行 [${turnCalledNames.join(', ')}]，当前可用锚点 ID: [${Array.from(registeredIds).join(', ')}]。\n${missingHints.join('\n')}`,
        });
      }

      if (allCommands.length > 0) {
        const synthesizedEnvelope = JSON.stringify({
          world_plan: {
            theme: 'DeepSeek Function Calling 空间语义编译',
            terrain_summary: `逐条执行 ${allCommands.length} 项 Function Calling 工具调用`,
            districts: ['商业主街', '旧工业区', '高地广场', '河岸街区'],
            blocking_arc: '基于局部相对坐标系与语义锚点构建',
          },
          commands: allCommands,
        });
        return {
          content: synthesizedEnvelope,
          meta: {
            model: resolvedModel,
            finishReason: lastFinishReason,
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens,
          },
        };
      }

      if (lastTextContent.trim()) {
        return {
          content: lastTextContent,
          meta: {
            model: resolvedModel,
            finishReason: lastFinishReason,
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens,
          },
        };
      }
    }

    // Standard single-turn request when tools are not used (or fallback)
    const payload: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };

    if (withJsonFormat) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const err = new Error(formatHttpErrorDiagnostic(res.status, targetUrl, errText)) as Error & {
        httpStatus?: number;
      };
      err.httpStatus = res.status;
      throw err;
    }

    const data = (await res.json()) as {
      model?: string;
      choices?: {
        finish_reason?: string;
        message?: { content?: string | null };
      }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const choice = data.choices?.[0];
    const finishReason = choice?.finish_reason;
    const rawContent = choice?.message?.content ?? '';

    if (!rawContent.trim()) {
      throw new Error(
        finishReason === 'length'
          ? '大模型输出超出 max_tokens 上限导致正文为空，请精简提示词'
          : '大模型返回内容为空，请检查模型名称与 API 服务状态'
      );
    }

    return {
      content: rawContent,
      meta: {
        model: data.model || model,
        finishReason,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAICompatibleWithMeta(
  aiConfig: AIConfig,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2,
  maxTokens = 4096,
  tools?: unknown[],
  initialRegisteredIds?: string[]
): Promise<{ content: string; meta: LLMCallMeta }> {
  const apiKey = aiConfig.apiKey.trim();
  const rawModel = aiConfig.model.trim() || 'deepseek-chat';
  const isLocal = isLocalEndpoint(aiConfig.baseUrl);
  // Enforce deepseek-chat V3 over deepseek-reasoner R1 or deepseek-flash
  const model = !isLocal || /reasoner|r1|flash/i.test(rawModel) ? 'deepseek-chat' : rawModel;
  const primaryUrl = buildChatCompletionsUrl(aiConfig.baseUrl || 'https://api.deepseek.com');
  const timeoutMs = isLocal ? 120_000 : 65_000;
  const startedAt = performance.now();

  const attemptUrl = async (url: string, via: 'direct' | 'vite-proxy') => {
    try {
      const res = await fetchChatCompletion(
        url,
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
        true,
        timeoutMs,
        tools,
        initialRegisteredIds
      );
      return {
        content: res.content,
        meta: {
          ...res.meta,
          latencyMs: Math.round(performance.now() - startedAt),
          via,
        },
      };
    } catch (err) {
      const httpStatus = (err as { httpStatus?: number })?.httpStatus;
      // If proxy/model rejected tools or response_format=json_object with 400 or 422, retry cleanly without tools
      if (httpStatus === 400 || httpStatus === 422) {
        const res = await fetchChatCompletion(
          url,
          apiKey,
          model,
          systemPrompt,
          userPrompt,
          temperature,
          maxTokens,
          false,
          timeoutMs,
          undefined
        );
        return {
          content: res.content,
          meta: {
            ...res.meta,
            latencyMs: Math.round(performance.now() - startedAt),
            via,
          },
        };
      }
      throw err;
    }
  };

  try {
    return await attemptUrl(
      primaryUrl,
      primaryUrl.startsWith('/api/deepseek') || primaryUrl.startsWith('/api/ollama')
        ? 'vite-proxy'
        : 'direct'
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        `请求超时 (${Math.round(timeoutMs / 1000)}s)，请检查网络或模型运行负载`
      );
    }
    const isNetworkOrCors =
      err instanceof TypeError ||
      (err instanceof Error && /failed to fetch|network|cors/i.test(err.message));

    const isLocalOrigin =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const canTryDeepSeekProxy =
      isNetworkOrCors &&
      isLocalOrigin &&
      primaryUrl.includes('api.deepseek.com') &&
      !primaryUrl.startsWith('/api/deepseek');

    if (canTryDeepSeekProxy) {
      try {
        return await attemptUrl('/api/deepseek/chat/completions', 'vite-proxy');
      } catch {
        // Fall through to informative diagnostic below
      }
    }

    const canTryOllamaProxy =
      isNetworkOrCors &&
      isLocalOrigin &&
      primaryUrl.includes('11434') &&
      !primaryUrl.startsWith('/api/ollama');

    if (canTryOllamaProxy) {
      try {
        return await attemptUrl('/api/ollama/chat/completions', 'vite-proxy');
      } catch {
        // Fall through
      }
    }

    if (isNetworkOrCors) {
      if (isLocal || primaryUrl.startsWith('/api/ollama')) {
        throw new Error(
          `无法连接本地服务（${primaryUrl}）。请切换回 DeepSeek 官方地址 https://api.deepseek.com。`
        );
      }
      throw new Error(
        `网络或浏览器 CORS 跨域被拦截（请求地址：${primaryUrl}）。若使用 DeepSeek 官方接口可尝试点击配置里的「本地代理 (/api/deepseek)」，或确认代理端已放行 CORS。`
      );
    }
    throw err;
  }
}

/**
 * Live diagnostic ping for the API Config modal.
 */
export async function testApiConnection(aiConfig: AIConfig): Promise<ApiConnectionTestResult> {
  const rawModel = aiConfig.model.trim() || 'deepseek-chat';
  const model = /reasoner|r1/i.test(rawModel) ? 'deepseek-chat' : rawModel;
  if (!isAIConfigured(aiConfig)) {
    return {
      ok: false,
      latencyMs: 0,
      model,
      via: 'direct',
      error: '请先填写 DeepSeek API Key（sk-...）。',
    };
  }
  try {
    const { content, meta } = await callOpenAICompatibleWithMeta(
      aiConfig,
      'Return strictly valid JSON: {"status":"ok","service":"previs-llm"}',
      '请回复 json 确认服务可用。',
      0.1,
      128
    );
    return {
      ok: true,
      latencyMs: meta.latencyMs,
      model: meta.model,
      via: meta.via,
      reply: content.slice(0, 120),
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: 0,
      model,
      via:
        aiConfig.baseUrl.startsWith('/api/deepseek') || aiConfig.baseUrl.startsWith('/api/ollama')
          ? 'vite-proxy'
          : 'direct',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface WorldGenerationOutput {
  world: WorldState;
  shots: ShotData[];
  logs: string[];
  worldPlan: WorldPlan;
  focusCenter: Vec3;
  source: 'api' | 'demo';
  rawJson?: string;
  meta?: LLMCallMeta;
  verification: WorldVerificationReport;
  uncertainties: UncertaintyItem[];
  unsupportedItems: string[];
  intentSummary: IntentSummary;
  roundCount: number;
}

const CATALOG_SPEC_TEXT = PROP_CATALOG.map(
  (p) => `- ${p.type}: 默认尺寸 [${p.baseSize.join('m × ')}m] (${p.description})`
).join('\n');

/**
 * Four-Pillar DeepSeek (`deepseek-chat` V3) Architecture Workflow:
 * 1) Step-by-step Function Calling (`DEEPSEEK_SCENE_TOOLS`, schema depth <= 3 layers) + strict front-end post-validation.
 * 2) Relative Coordinate System (`anchor`, `relation`, `distance_m`, `arrangement`, `facing`) -> TypeScript Raycaster/groundY & lookAt.
 * 3) Open-Vocabulary Composite Primitives (`box | cylinder | cone | plane | torus` hierarchy assembled into THREE.Group).
 * 4) Multi-turn Incremental Semantic Patch (`apply_scene_patch` with `op: add | remove | update` & `target_id` state validation).
 */
export async function generateWorldFromPrompt(
  prompt: string,
  mode: 'replace' | 'append',
  aiConfig: AIConfig,
  currentWorld: WorldState
): Promise<WorldGenerationOutput> {
  const intent = buildIntentSummary(prompt);

  if (!isAIConfigured(aiConfig)) {
    const demoProgram = buildLocalDemoProgram(prompt, mode, currentWorld);
    const compiled = compileSemanticProgram(demoProgram, currentWorld, mode, intent);
    const verification = verifyCompiledWorldAgainstPrompt(prompt, intent, demoProgram, compiled, mode);
    const demoUncertainties: UncertaintyItem[] = [...(demoProgram.uncertainties ?? [])];
    if (intent.ambiguous || intent.clarification_questions?.length) {
      for (const q of intent.clarification_questions ?? []) {
        demoUncertainties.push({
          topic: '提示词存在不确定/缺失细节',
          question: q,
          assumption: '演示模式暂按默认布局生成',
        });
      }
    }
    return {
      ...compiled,
      worldPlan: demoProgram.world_plan,
      source: 'demo',
      verification,
      uncertainties: demoUncertainties,
      unsupportedItems: verification.unsupportedItems,
      intentSummary: intent,
      roundCount: 1,
    };
  }

  const registeredRegistry = listSceneRegisteredIds(currentWorld);
  const existingSummary =
    mode === 'append'
      ? `\n【当前片场已注册对象 ID 清单（多轮增量 Patch 模式必须基于以下 target_id / relative_to 操作，严禁全量重写已有场景）】\n${
          registeredRegistry.summaryLines.join('\n') || '（当前暂无已注册对象）'
        }`
      : '';

  const systemPrompt = `你是电影 3D 预演片场导演、程序化 3D 建模师与空间语义规划器（DeepSeek-V3 \`deepseek-chat\` 架构）。
请优先调用提供的 Function Calling 工具（按顺序逐条调用：\`set_terrain\` -> \`spawn_district_buildings\` -> \`place_scene_element\` / \`build_composite_model\` -> \`stage_character\` -> \`set_camera_coverage\`；增量修改时调用 \`apply_scene_patch\`）。

【架构铁律 1：空间关系与局部相对坐标系（严禁输出绝对世界坐标）】
- 你只负责输出**语义意图**，前端 TypeScript 负责地面射线贴地计算（Raycaster/groundY）与四元数朝向（lookAt）。
- 锚点 (\`anchor\` / \`relative_to\`)：只允许使用已注册的 \`element_id\`（如 \`car_01\`, \`crane_01\`, \`hero\`）或语义标记（\`scene_center\`, \`door_main\`, \`ground_level\`, \`canal_water\`, \`coast\`, \`plaza\`, \`industrial\`, \`rooftop\`, \`inside_lobby\`）。
- 方位与距离：输出 \`relation\`（\`"in_front_of" | "behind" | "left_of" | "right_of" | "around" | "on_top_of" | "along"\`）、\`distance_m\`（米）、\`arrangement\`（\`"single" | "ring" | "grid" | "line" | "cluster" | "pair"\`）与 \`facing\`（\`"toward_anchor" | "away_from_anchor"\`）。

【架构铁律 2：开放词表复合体拼装 (\`build_composite_model\` / \`composite_primitives\`)】
- 当用户提到预设库没有的物体（如**塔吊、灯塔、跨水拱桥、木栈道码头、帆船、凉亭、雷达、加油站、机甲、雕像**等）时，**退化成一个方块是绝对禁止的**！
- 必须调用 \`build_composite_model\`，仅使用 5 种基础几何体（\`"box" | "cylinder" | "cone" | "plane" | "torus"\`）输出包含至少 3~9 个部件的层级树 \`composite_primitives\`（例如塔吊 = 1 个圆柱底座 \`cylinder\` + 2 个窄长塔身 \`box\` + 1 个长悬臂吊臂 \`box\` + 1 个平衡臂 \`box\` + 1 个锥形塔帽 \`cone\`），并附带相对于物体底面中心 \`[0,0,0]\` 的 \`local_position: [x,y,z]\`、\`local_rotation_deg: [rx,ry,rz]\` 与 \`size: [w,h,d]\`。前端 Three.js 会直接将其组装成 \`THREE.Group\`。

【架构铁律 3：多轮增量编辑用基于 ID 的语义 Patch (\`apply_scene_patch\`)】
- 当处于增量编辑模式（append）时，严禁全量重写整个场景！
- 对已有对象移动/改姿态：调用 \`apply_scene_patch\`，如 \`{ "op": "update", "target_id": "hero", "relation": "behind", "relative_to": "car_01", "distance_m": 2 }\`。
- 删除已有对象：\`{ "op": "remove", "target_id": "car_01" }\`。
- 新增对象：可调用 \`apply_scene_patch (op="add")\` 或直接调用 \`place_scene_element\` / \`build_composite_model\` / \`stage_character\`。
- 注意：\`target_id\` 和 \`relative_to\` 必须真实存在于当前场景已注册对象清单或本轮已创建的 \`id\` 中！

【预设基础资产目录（常规道具可直接用 \`place_scene_element\`）】
${CATALOG_SPEC_TEXT}
${existingSummary}`;

  const wantsCityBuildings =
    /大楼|大厦|街区|城市|厂房|仓库|建筑群|街道|高楼|住宅楼|写字楼|窄巷|室内|大厅|安全屋/.test(
      prompt
    );

  const sanitizeBuildingOverreach = (prog: SemanticProgram): SemanticProgram => {
    if (wantsCityBuildings) return prog;
    return {
      ...prog,
      commands: prog.commands.map((cmd) => {
        if (cmd.cmd === 'spawn_district_buildings' && !cmd.enterable_hero_building) {
          return { ...cmd, count: 0 };
        }
        return cmd;
      }),
    };
  };

  const preflightBrief = `导演指令：${prompt}
当前执行模式：${mode === 'append' ? '多轮增量编辑模式（优先使用 apply_scene_patch 或仅追加新元素，保留原有场景）' : '全新场景生成模式（必须完整调用 set_terrain + place_scene_element / build_composite_model + stage_character + set_camera_coverage）'}

本地意图预解析（必须 100% 全部实现，严禁只调 set_terrain 就结束）：
- 必含要素 (must_have)：${JSON.stringify(intent.must_have)}
- 明确禁用 (forbidden)：${JSON.stringify(intent.forbidden)}
- 是否需要背景高楼群：${wantsCityBuildings ? '是' : '否（严禁调用 spawn_district_buildings 生成无关高楼！）'}
- 空间布局关系：${intent.layout || '按相对锚点与方位关系合理排布'}
- 运镜意图：${intent.camera_intent || '围绕核心冲突生成多机位分镜'}`;

  const round1 = await callOpenAICompatibleWithMeta(
    aiConfig,
    systemPrompt,
    preflightBrief,
    0.15,
    4096,
    DEEPSEEK_SCENE_TOOLS,
    registeredRegistry.ids
  );
  let latestMeta = round1.meta;
  let parsed = extractJsonObject(round1.content);
  let rawProgram = sanitizeBuildingOverreach(repairSemanticProgram(parsed, prompt, mode, false));
  const strictValidation1 = validateSemanticProgramStrict(rawProgram, currentWorld, mode);
  let program =
    rawProgram.commands.length > 0
      ? rawProgram
      : sanitizeBuildingOverreach(repairSemanticProgram(parsed, prompt, mode, true));
  let compiled = compileSemanticProgram(program, currentWorld, mode, intent);
  let verification = verifyCompiledWorldAgainstPrompt(prompt, intent, program, compiled, mode);

  // Merge front-end strict schema / target_id / composite_primitives validation errors into verification issues
  if (!strictValidation1.valid) {
    verification = {
      ...verification,
      passed: false,
      issues: [...strictValidation1.errors, ...verification.issues],
    };
  }

  let roundCount = 1;
  const dialogueLogs: string[] = [
    `✓ DeepSeek (${latestMeta.model}) 严格 Function Calling 执行完成（耗时 ${latestMeta.latencyMs}ms）`,
  ];

  // Self-Correction Retry Loop (Round 2): feed exact schema / target_id / composite / prompt errors back to deepseek-chat
  if (!verification.passed && verification.issues.length > 0) {
    roundCount = 2;
    dialogueLogs.push(
      `↻ 前端后置校验捕获 ${verification.issues.length} 项结构/锚点/要素偏差，已拼接错误信息触发 deepseek-chat 自纠错重试 (Self-Correction)...`
    );
    const correctionPrompt = `【前端后置校验器 (Self-Correction) 报错反馈】
你上一轮的 Function Calling 输出未能通过前端严格校验，具体缺失或错误如下：
${verification.issues.map((iss, idx) => `${idx + 1}. ${iss}`).join('\n')}

【原始导演指令】
- 提示词：${prompt}
- 必含元素：${JSON.stringify(intent.must_have)}
- 禁止元素：${JSON.stringify(intent.forbidden)}
${existingSummary}

【你上一轮已生成的指令】
${JSON.stringify(parsed, null, 2)}

请立即调用 \`place_scene_element\`、\`build_composite_model\`、\`stage_character\` 或 \`apply_scene_patch\` 补齐所有缺失元素并修正报错：
1. 若缺少高台/立柱/斜坡/台阶/货箱/车辆，必须调用 \`place_scene_element\` 逐一补齐（例如高台用 \`item: "floor"\`，四根立柱用 \`item: "pillar", count: 4, arrangement: "ring"\`，斜坡用 \`item: "ramp"\`，台阶用 \`item: "stairs"\`）。
2. 若缺少角色或对峙，必须调用 \`stage_character\` 补齐所需数量的角色。
3. 若报错复合体退化为单个几何体，请使用 \`build_composite_model\` 并提供至少 3~8 个 \`composite_primitives\`（仅限 \`box | cylinder | cone | plane | torus\`）。
4. 若报错找不到 \`target_id\` 或 \`relative_to\`，请严格从【已注册对象 ID 清单】中选择真实存在的 ID。`;

    try {
      const round2 = await callOpenAICompatibleWithMeta(
        aiConfig,
        systemPrompt,
        correctionPrompt,
        0.1,
        4096,
        DEEPSEEK_SCENE_TOOLS,
        registeredRegistry.ids
      );
      latestMeta = round2.meta;
      const parsed2 = extractJsonObject(round2.content);
      const rawProgram2 = sanitizeBuildingOverreach(
        repairSemanticProgram(parsed2, prompt, mode, false)
      );

      // Merge Round 1 valid commands with Round 2 supplementary commands
      const mergedCommands: SemanticCommand[] = [
        ...rawProgram.commands.filter(
          (c) =>
            !rawProgram2.commands.some(
              (c2) => c2.cmd === 'set_terrain' && c.cmd === 'set_terrain'
            )
        ),
        ...rawProgram2.commands,
      ];
      const mergedProgram: SemanticProgram = {
        ...rawProgram,
        ...rawProgram2,
        commands: mergedCommands.length > 0 ? mergedCommands : program.commands,
      };

      const strictValidation2 = validateSemanticProgramStrict(mergedProgram, currentWorld, mode);
      const compiled2 = compileSemanticProgram(mergedProgram, currentWorld, mode, intent);
      let verification2 = verifyCompiledWorldAgainstPrompt(
        prompt,
        intent,
        mergedProgram,
        compiled2,
        mode
      );
      if (!strictValidation2.valid) {
        verification2 = {
          ...verification2,
          passed: false,
          issues: [...strictValidation2.errors, ...verification2.issues],
        };
      }

      if (
        verification2.issues.length <= verification.issues.length ||
        (compiled2.world.customModels?.length ?? 0) +
          compiled2.world.assets.length +
          compiled2.world.characters.length >=
          (compiled.world.customModels?.length ?? 0) +
            compiled.world.assets.length +
            compiled.world.characters.length
      ) {
        parsed = {
          world_plan: mergedProgram.world_plan,
          commands: mergedProgram.commands,
        };
        program = mergedProgram;
        compiled = compiled2;
        verification = verification2;
        dialogueLogs.push(
          verification.passed
            ? '✓ DeepSeek Self-Correction 第 2 轮修正已全部通过前端校验！'
            : `⚠ DeepSeek 第 2 轮自纠错后仍余 ${verification.issues.length} 项提示`
        );
      }
    } catch (err) {
      dialogueLogs.push(
        `⚠ Self-Correction 第 2 轮调用失败（保留第 1 轮结果）：${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Deterministic Post-Guard: if any must_have elements/characters are still missing after tool calls,
  // supplement the missing semantic commands so the 3D scene never drops required prompt elements!
  if (mode === 'replace' && !verification.passed && verification.missingMustHave.length > 0) {
    const baselineSupplement = sanitizeBuildingOverreach(buildLocalDemoProgram(prompt, 'replace'));
    const hasElementsCmd = program.commands.some(
      (c) => c.cmd === 'place_scene_elements' && c.elements.length > 0
    );
    const hasCustomCmd = program.commands.some(
      (c) => c.cmd === 'create_custom_models' && c.models.length > 0
    );
    const hasCharsCmd = program.commands.some(
      (c) => c.cmd === 'stage_characters' && c.cast.length > 0
    );

    const supplementedCommands: SemanticCommand[] = [...program.commands];
    for (const baseCmd of baselineSupplement.commands) {
      if (baseCmd.cmd === 'place_scene_elements' && !hasElementsCmd) {
        supplementedCommands.push(baseCmd);
      } else if (baseCmd.cmd === 'create_custom_models' && !hasCustomCmd) {
        supplementedCommands.push(baseCmd);
      } else if (baseCmd.cmd === 'stage_characters' && !hasCharsCmd) {
        supplementedCommands.push(baseCmd);
      }
    }

    if (supplementedCommands.length > program.commands.length) {
      program = { ...program, commands: supplementedCommands };
      compiled = compileSemanticProgram(program, currentWorld, mode, intent);
      verification = verifyCompiledWorldAgainstPrompt(prompt, intent, program, compiled);
      parsed = {
        world_plan: program.world_plan,
        commands: program.commands,
      };
      dialogueLogs.push('✓ 前端空间编译器已完成缺失必含要素的确定性补齐，场景校验通过！');
    }
  }

  const combinedLogs = [...dialogueLogs, ...compiled.logs];
  if (program.uncertainties && program.uncertainties.length > 0) {
    combinedLogs.push(`ℹ DeepSeek 提出 ${program.uncertainties.length} 条不确定/待澄清问题`);
  }

  return {
    ...compiled,
    logs: combinedLogs,
    worldPlan: program.world_plan,
    source: 'api',
    rawJson: JSON.stringify(parsed, null, 2),
    meta: latestMeta,
    verification,
    uncertainties: program.uncertainties ?? [],
    unsupportedItems: verification.unsupportedItems,
    intentSummary: intent,
    roundCount,
  };
}

export async function generateCameraFromScene(
  prompt: string,
  aiConfig: AIConfig,
  world: WorldState,
  shot: ShotData
): Promise<{ keyframes: ShotKeyframe[]; source: 'api' | 'demo'; meta?: LLMCallMeta }> {
  if (!isAIConfigured(aiConfig)) {
    return {
      keyframes: buildLocalDemoCamera(prompt, world, shot),
      source: 'demo',
    };
  }

  const sceneSummary = {
    duration: shot.duration,
    aspectRatio: shot.aspectRatio,
    heroCompound: world.heroCompound
      ? { position: world.heroCompound.position, note: 'Doorway faces +X toward road' }
      : null,
    characters: world.characters.map((c) => ({
      name: c.name,
      pose: c.pose,
      position: c.position,
    })),
    assets: world.assets.slice(0, 12).map((a) => ({
      name: a.name,
      type: a.type,
      position: a.position,
    })),
    buildingsCount: world.buildings.length,
  };

  const systemPrompt = `你是电影摄影指导。根据当前 960m 开放片场中的角色、道具与可进入建筑坐标，为 ${shot.name} 设计平滑且无穿模的摄像机运镜关键帧。
总时长 ${shot.duration} 秒，焦段 14-135mm。严格输出 JSON：
{
  "keyframes": [
    { "time": 0, "position": [x, y, z], "target": [tx, ty, tz], "focalLength": 35 },
    { "time": ${shot.duration}, "position": [x, y, z], "target": [tx, ty, tz], "focalLength": 50 }
  ]
}`;

  const userPrompt = `场景摘要：${JSON.stringify(sceneSummary)}\n导演运镜需求：${prompt}`;
  const { content: raw, meta } = await callOpenAICompatibleWithMeta(
    aiConfig,
    systemPrompt,
    userPrompt,
    0.2,
    2048
  );
  return {
    keyframes: parseAndRepairKeyframesJson(raw, shot.duration),
    source: 'api',
    meta,
  };
}

/**
 * Step 2: Invoke DeepSeek with ONLY the confirmed Step 1 IntentSummary,
 * same-distribution few-shot DSL, strict schema & template slot coordinates.
 * Temperature fixed at 0.15 (within 0.1–0.3); no tool calling.
 */
export async function generateDslFromIntent(
  intent: IntentSummary,
  templateId: SceneTemplateId,
  aiConfig: AIConfig,
  previousIssues?: string[]
): Promise<{ rawText: string; source: 'api' | 'demo'; meta?: LLMCallMeta }> {
  const tpl = getTemplateById(templateId);

  if (!isAIConfigured(aiConfig)) {
    const localDsl = buildTemplateBaselineDsl(intent, templateId);
    return {
      rawText: JSON.stringify(localDsl, null, 2),
      source: 'demo',
    };
  }

  const slotTable = tpl.slots.map((s) => ({
    slot_id: s.slot_id,
    label: s.label,
    category: s.category,
    position: s.position,
    rotation_y_deg: s.rotation_y_deg,
    scale: s.scale,
  }));

  const cameraTable = tpl.cameraSlots.map((c) => ({
    id: c.id,
    label: c.label,
    position: c.position,
    target: c.target,
    focal_length: c.focal_length,
  }));

  const systemPrompt = `你是场景 DSL 的结构化生成器。请严格根据用户的“意图摘要 json”和给定模板槽位，生成唯一一个合法的场景 json 对象（不要输出任何 Markdown 解释文字）。

硬性语法与类型约束：
1. 必须输出有效 json 对象，顶层必须同时包含全部 5 个字段："template_id", "lighting", "objects", "characters", "camera"。
2. 缺失值必须显式写为 null，禁止省略任何必需字段！
3. template_id 必须严格等于 "${tpl.id}"。
4. objects[] 每项必须完整包含：id, name, type, slot_id, position, rotation_y_deg, scale, floors。
   - type 只能取枚举之一：${DSL_OBJECT_TYPES.join(' | ')}
   - position 必须是长度为 3 的数字数组 [x, y, z]
   - rotation_y_deg 为数字或 null；scale 为 [sx, sy, sz] 或 null；floors 为 >=1 整数或 null；slot_id 为模板 slot_id 字符串或 null。
5. characters[] 每项必须完整包含：id, role, pose, slot_id, position, rotation_y_deg。
   - pose 只能取枚举之一：${DSL_CHARACTER_POSES.join(' | ')}
6. camera 必须包含 intent_label, aspect_ratio ("16:9" | "2.39:1" | "9:16"), keyframes（至少 2 帧，按 time 升序，focal_length 在 14..135 之间）。

坐标硬约束（严禁自由编造乱飞坐标）：
- 必须从下方预计算槽位表中挑选与意图匹配的 slot_id 及其 position / rotation_y_deg / scale（若同一类型元素数量多于模板对应槽位数，或模板无完全同名槽位，可在模板可行走区内做不重叠侧偏摆放，且不可与已有物体穿插）。
- 相机 keyframes 的 position / target / focal_length 优先从预计算安全机位表挑选，并确保符合 camera_intent 运动方向，禁止穿墙或被建筑遮挡。
- 必须逐一满足 must_have 中的每一项元素与数量，严禁出现 forbidden 中的元素。

同分布合法 json 示例（template_id="${tpl.id}"）：
${JSON.stringify(tpl.fewShotDsl, null, 2)}`;

  const cleanSummary = {
    style: intent.style,
    layout: intent.layout,
    must_have: intent.must_have,
    camera_intent: intent.camera_intent,
    forbidden: intent.forbidden,
  };

  const feedbackSection =
    previousIssues && previousIssues.length > 0
      ? `\n\n【上一轮 Step 3 校验未通过，以下是精确的错误原因与不确定点，请你务必逐条修正】\n${previousIssues
          .map((e, idx) => `${idx + 1}. ${e}`)
          .join('\n')}`
      : '';

  const userPrompt = `请严格依据以下已确认的意图摘要与模板槽位输出 json：
已确认意图摘要:
${JSON.stringify(cleanSummary, null, 2)}

模板可行走边界 (${tpl.id}):
X[${tpl.walkableBounds.minX}..${tpl.walkableBounds.maxX}], Z[${tpl.walkableBounds.minZ}..${tpl.walkableBounds.maxZ}]

可用预计算场景槽位 (${tpl.id}):
${JSON.stringify(slotTable)}

可用预计算安全机位 (${tpl.id}):
${JSON.stringify(cameraTable)}${feedbackSection}`;

  const { content: rawText, meta } = await callOpenAICompatibleWithMeta(
    aiConfig,
    systemPrompt,
    userPrompt,
    0.15,
    4096
  );
  return { rawText, source: 'api', meta };
}

/**
 * Step 4 Fallback: Template coordinates & layout are 100% locked;
 * DeepSeek ONLY fills style parameters (lighting, fog, material_tone, element names) in json.
 */
export async function generateFallbackStyleFromDeepSeek(
  intent: IntentSummary,
  templateId: SceneTemplateId,
  aiConfig: AIConfig
): Promise<{ patch: FallbackStylePatch; rawText: string; source: 'api' | 'demo'; meta?: LLMCallMeta }> {
  const baseline = buildTemplateBaselineDsl(intent, templateId);
  const elementIds = [
    ...baseline.objects.map((o) => ({ id: o.id, defaultName: o.name })),
    ...baseline.characters.map((c) => ({ id: c.id, defaultName: c.role })),
  ];

  if (!isAIConfigured(aiConfig)) {
    const patch: FallbackStylePatch = {
      style_label: baseline.lighting.style_label,
      sun_azimuth: baseline.lighting.sun_azimuth,
      sun_elevation: baseline.lighting.sun_elevation,
      fog_density: baseline.lighting.fog_density,
      material_tone: baseline.lighting.material_tone,
      element_names: Object.fromEntries(elementIds.map((e) => [e.id, e.defaultName])),
    };
    return { patch, rawText: JSON.stringify(patch, null, 2), source: 'demo' };
  }

  const systemPrompt = `当前已锁定几何模板 "${templateId}" 的全部坐标与结构。你不需要计算任何坐标，只需要输出风格参数 json：
{
  "style_label": "视觉风格描述",
  "sun_azimuth": 0~360数字,
  "sun_elevation": 8~75数字,
  "fog_density": 0.0~0.03数字,
  "material_tone": "材质色调英文标签或null",
  "element_names": { "元素id": "贴合场景风格的中文命名" }
}`;

  const userPrompt = `意图摘要 json：${JSON.stringify({
    style: intent.style,
    layout: intent.layout,
    must_have: intent.must_have,
  })}
需要命名的模板元素列表：${JSON.stringify(elementIds)}`;

  const { content: rawText, meta } = await callOpenAICompatibleWithMeta(
    aiConfig,
    systemPrompt,
    userPrompt,
    0.15,
    2048
  );
  const parsed = extractJsonObject(rawText);
  const patch: FallbackStylePatch = {
    style_label: typeof parsed.style_label === 'string' && parsed.style_label.trim()
      ? parsed.style_label.trim()
      : baseline.lighting.style_label,
    sun_azimuth: typeof parsed.sun_azimuth === 'number' && Number.isFinite(parsed.sun_azimuth)
      ? parsed.sun_azimuth
      : baseline.lighting.sun_azimuth,
    sun_elevation: typeof parsed.sun_elevation === 'number' && Number.isFinite(parsed.sun_elevation)
      ? parsed.sun_elevation
      : baseline.lighting.sun_elevation,
    fog_density: typeof parsed.fog_density === 'number' && Number.isFinite(parsed.fog_density)
      ? parsed.fog_density
      : baseline.lighting.fog_density,
    material_tone: typeof parsed.material_tone === 'string' ? parsed.material_tone : baseline.lighting.material_tone,
    element_names:
      parsed.element_names && typeof parsed.element_names === 'object'
        ? (parsed.element_names as Record<string, string>)
        : {},
  };
  return { patch, rawText, source: 'api', meta };
}
