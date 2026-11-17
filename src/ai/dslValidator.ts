import {
  DSL_CHARACTER_POSES,
  DSL_OBJECT_TYPES,
  SCENE_TEMPLATE_IDS,
  type DSLCameraKeyframe,
  type DSLObjectNode,
  type DSLObjectType,
  type IntentSummary,
  type SceneDSL,
  type ValidationReport,
} from './dslSchema';
import {
  inferDslTypeFromToken,
  parseRequestedCount,
  type SceneTemplateDefinition,
} from './dslTemplates';

interface Box3D {
  id: string;
  name: string;
  type: DSLObjectType;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

const SOLID_BLOCKING_TYPES = new Set<DSLObjectType>([
  'building',
  'hero_compound',
  'wall',
  'pillar',
  'crate',
  'cargo_stack',
  'barrier',
  'vehicle',
  'table',
  'tree',
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isVec3(v: unknown): v is [number, number, number] {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    v.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

function extractRawJsonCandidate(rawText: string): string {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function getDefaultScaleForType(type: DSLObjectType, floors: number | null): [number, number, number] {
  switch (type) {
    case 'building':
      return [14, (floors ?? 3) * 3.6, 12];
    case 'hero_compound':
      return [16, 7.6, 12];
    case 'pillar':
      return [1.2, 5.5, 1.2];
    case 'wall':
      return [6.0, 4.0, 0.7];
    case 'vehicle':
      return [4.2, 1.6, 1.9];
    case 'barrier':
      return [3.0, 1.0, 0.9];
    case 'lamp':
      return [0.5, 5.2, 0.5];
    case 'table':
      return [3.2, 0.9, 1.6];
    case 'tree':
    case 'bush':
      return [1.4, 3.8, 1.4];
    default:
      return [1.6, 1.4, 1.6];
  }
}

function computeObjectBox(obj: DSLObjectNode): Box3D {
  const rawScale = obj.scale ?? getDefaultScaleForType(obj.type, obj.floors);
  const sx = Math.max(0.3, Math.abs(rawScale[0]));
  const sy =
    obj.type === 'building' && obj.floors
      ? Math.max(3.2, obj.floors * 3.6)
      : Math.max(0.2, Math.abs(rawScale[1]));
  const sz = Math.max(0.3, Math.abs(rawScale[2]));

  // Swap X/Z footprint roughly when rotated near 90 / 270 deg
  const rotRad = ((obj.rotation_y_deg ?? 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(rotRad));
  const s = Math.abs(Math.sin(rotRad));
  const halfX = (sx * c + sz * s) * 0.5;
  const halfZ = (sx * s + sz * c) * 0.5;

  const baseCenteredY = obj.type === 'floor' || obj.type === 'ramp';
  const minY = baseCenteredY ? obj.position[1] - sy * 0.5 : obj.position[1];
  const maxY = baseCenteredY ? obj.position[1] + sy * 0.5 : obj.position[1] + sy;

  return {
    id: obj.id,
    name: obj.name,
    type: obj.type,
    minX: obj.position[0] - halfX,
    maxX: obj.position[0] + halfX,
    minY,
    maxY,
    minZ: obj.position[2] - halfZ,
    maxZ: obj.position[2] + halfZ,
  };
}

function boxesOverlap(a: Box3D, b: Box3D, margin = -0.1): boolean {
  return (
    a.minX - margin < b.maxX &&
    a.maxX + margin > b.minX &&
    a.minY - margin < b.maxY &&
    a.maxY + margin > b.minY &&
    a.minZ - margin < b.maxZ &&
    a.maxZ + margin > b.minZ
  );
}

function pointInsideBox(p: [number, number, number], box: Box3D, expand = 0): boolean {
  return (
    p[0] >= box.minX - expand &&
    p[0] <= box.maxX + expand &&
    p[1] >= box.minY - expand &&
    p[1] <= box.maxY + expand &&
    p[2] >= box.minZ - expand &&
    p[2] <= box.maxZ + expand
  );
}

/**
 * Liang-Barsky / slab intersection returning first hit t in [0, 1] or null.
 */
function segmentIntersectsBox(
  p0: [number, number, number],
  p1: [number, number, number],
  box: Box3D
): number | null {
  let tMin = 0;
  let tMax = 1;
  const mins = [box.minX, box.minY, box.minZ];
  const maxs = [box.maxX, box.maxY, box.maxZ];

  for (let axis = 0; axis < 3; axis++) {
    const d = p1[axis] - p0[axis];
    if (Math.abs(d) < 1e-6) {
      if (p0[axis] < mins[axis] || p0[axis] > maxs[axis]) {
        return null;
      }
    } else {
      let t1 = (mins[axis] - p0[axis]) / d;
      let t2 = (maxs[axis] - p0[axis]) / d;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
  }
  return tMin;
}

function checkForbiddenMatch(label: string, forbidden: string): boolean {
  const f = forbidden.trim().toLowerCase();
  const l = label.toLowerCase();
  if (!f) return false;
  if (l.includes(f)) return true;
  if ((f.includes('车') || f.includes('car')) && l === 'vehicle') return true;
  if ((f.includes('树') || f.includes('tree')) && (l === 'tree' || l === 'bush')) return true;
  if ((f.includes('灯') || f.includes('lamp')) && l === 'lamp') return true;
  if ((f.includes('墙') || f.includes('wall')) && l === 'wall') return true;
  if ((f.includes('柱') || f.includes('pillar')) && l === 'pillar') return true;
  if ((f.includes('箱') || f.includes('crate')) && (l === 'crate' || l === 'cargo_stack')) return true;
  if ((f.includes('路障') || f.includes('墩') || f.includes('barrier')) && l === 'barrier') return true;
  if ((f.includes('楼') || f.includes('建筑') || f.includes('building')) && (l === 'building' || l === 'hero_compound')) return true;
  return false;
}

/**
 * Step 3: Strict Tri-Layer DSL Validator (Syntax -> Semantic -> Geometry).
 * ZERO silent repair: if any layer fails, returns `passed: false` with exact issues.
 */
export function validateSceneDSL(
  rawText: string,
  intent: IntentSummary,
  template: SceneTemplateDefinition
): ValidationReport {
  const syntaxIssues: string[] = [];
  const semanticIssues: string[] = [];
  const geometryIssues: string[] = [];
  const rawJson = extractRawJsonCandidate(rawText);

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(rawJson);
  } catch (err) {
    syntaxIssues.push(
      `[语法层] JSON 无法解析：${err instanceof Error ? err.message : String(err)}`
    );
    return {
      passed: false,
      rawJson,
      parsedDsl: null,
      syntaxIssues,
      semanticIssues,
      geometryIssues,
    };
  }

  if (!isPlainObject(parsedRaw)) {
    syntaxIssues.push('[语法层] 根节点必须是 JSON 对象');
    return {
      passed: false,
      rawJson,
      parsedDsl: null,
      syntaxIssues,
      semanticIssues,
      geometryIssues,
    };
  }

  // ---------------- Layer 1: Syntax ----------------
  const requiredTopKeys = ['template_id', 'lighting', 'objects', 'characters', 'camera'];
  for (const key of requiredTopKeys) {
    if (!(key in parsedRaw)) {
      syntaxIssues.push(`[语法层] 缺少顶层必需字段 "${key}"（即使为空也须显式声明，不得省略）`);
    }
  }

  if (
    typeof parsedRaw.template_id !== 'string' ||
    !(SCENE_TEMPLATE_IDS as readonly string[]).includes(parsedRaw.template_id)
  ) {
    syntaxIssues.push(
      `[语法层] template_id 必须属于枚举 ${SCENE_TEMPLATE_IDS.join(' | ')}，当前为 ${String(parsedRaw.template_id)}`
    );
  }

  if (!isPlainObject(parsedRaw.lighting)) {
    syntaxIssues.push('[语法层] lighting 必须是对象');
  } else {
    const l = parsedRaw.lighting;
    for (const k of ['style_label', 'sun_azimuth', 'sun_elevation', 'fog_density', 'material_tone']) {
      if (!(k in l)) {
        syntaxIssues.push(`[语法层] lighting 缺少字段 "${k}"（无值请填 null）`);
      }
    }
    if (typeof l.style_label !== 'string') syntaxIssues.push('[语法层] lighting.style_label 必须是字符串');
    if (typeof l.sun_azimuth !== 'number' || !Number.isFinite(l.sun_azimuth))
      syntaxIssues.push('[语法层] lighting.sun_azimuth 必须是有限数字');
    if (typeof l.sun_elevation !== 'number' || !Number.isFinite(l.sun_elevation))
      syntaxIssues.push('[语法层] lighting.sun_elevation 必须是有限数字');
    if (typeof l.fog_density !== 'number' || !Number.isFinite(l.fog_density))
      syntaxIssues.push('[语法层] lighting.fog_density 必须是有限数字');
    if (l.material_tone !== null && typeof l.material_tone !== 'string')
      syntaxIssues.push('[语法层] lighting.material_tone 必须是 string 或 null');
  }

  if (!Array.isArray(parsedRaw.objects)) {
    syntaxIssues.push('[语法层] objects 必须是数组');
  } else {
    parsedRaw.objects.forEach((item, idx) => {
      if (!isPlainObject(item)) {
        syntaxIssues.push(`[语法层] objects[${idx}] 必须是对象`);
        return;
      }
      for (const k of ['id', 'name', 'type', 'slot_id', 'position', 'rotation_y_deg', 'scale', 'floors']) {
        if (!(k in item)) {
          syntaxIssues.push(`[语法层] objects[${idx}] 缺少字段 "${k}"（无值请填 null，禁止省略）`);
        }
      }
      if (typeof item.id !== 'string' || !item.id) syntaxIssues.push(`[语法层] objects[${idx}].id 须为非空字符串`);
      if (typeof item.name !== 'string') syntaxIssues.push(`[语法层] objects[${idx}].name 须为字符串`);
      if (typeof item.type !== 'string' || !(DSL_OBJECT_TYPES as readonly string[]).includes(item.type)) {
        syntaxIssues.push(`[语法层] objects[${idx}].type="${String(item.type)}" 不在允许枚举内`);
      }
      if (item.slot_id !== null && typeof item.slot_id !== 'string') {
        syntaxIssues.push(`[语法层] objects[${idx}].slot_id 须为 string 或 null`);
      }
      if (!isVec3(item.position)) {
        syntaxIssues.push(`[语法层] objects[${idx}].position 必须是长度为 3 的有限数字数组`);
      }
      if (item.rotation_y_deg !== null && (typeof item.rotation_y_deg !== 'number' || !Number.isFinite(item.rotation_y_deg))) {
        syntaxIssues.push(`[语法层] objects[${idx}].rotation_y_deg 须为 number 或 null`);
      }
      if (item.scale !== null && !isVec3(item.scale)) {
        syntaxIssues.push(`[语法层] objects[${idx}].scale 须为长度为 3 的数字数组或 null`);
      }
      if (item.floors !== null && (typeof item.floors !== 'number' || !Number.isFinite(item.floors) || item.floors < 1)) {
        syntaxIssues.push(`[语法层] objects[${idx}].floors 须为 >= 1 的数字或 null`);
      }
    });
  }

  if (!Array.isArray(parsedRaw.characters)) {
    syntaxIssues.push('[语法层] characters 必须是数组');
  } else {
    parsedRaw.characters.forEach((ch, idx) => {
      if (!isPlainObject(ch)) {
        syntaxIssues.push(`[语法层] characters[${idx}] 必须是对象`);
        return;
      }
      for (const k of ['id', 'role', 'pose', 'slot_id', 'position', 'rotation_y_deg']) {
        if (!(k in ch)) {
          syntaxIssues.push(`[语法层] characters[${idx}] 缺少字段 "${k}"（无值请填 null）`);
        }
      }
      if (typeof ch.id !== 'string' || !ch.id) syntaxIssues.push(`[语法层] characters[${idx}].id 须为非空字符串`);
      if (typeof ch.role !== 'string') syntaxIssues.push(`[语法层] characters[${idx}].role 须为字符串`);
      if (typeof ch.pose !== 'string' || !(DSL_CHARACTER_POSES as readonly string[]).includes(ch.pose)) {
        syntaxIssues.push(`[语法层] characters[${idx}].pose="${String(ch.pose)}" 不在允许姿态枚举内`);
      }
      if (ch.slot_id !== null && typeof ch.slot_id !== 'string') {
        syntaxIssues.push(`[语法层] characters[${idx}].slot_id 须为 string 或 null`);
      }
      if (!isVec3(ch.position)) {
        syntaxIssues.push(`[语法层] characters[${idx}].position 必须是长度为 3 的有限数字数组`);
      }
      if (ch.rotation_y_deg !== null && (typeof ch.rotation_y_deg !== 'number' || !Number.isFinite(ch.rotation_y_deg))) {
        syntaxIssues.push(`[语法层] characters[${idx}].rotation_y_deg 须为 number 或 null`);
      }
    });
  }

  if (!isPlainObject(parsedRaw.camera)) {
    syntaxIssues.push('[语法层] camera 必须是对象');
  } else {
    const cam = parsedRaw.camera;
    for (const k of ['intent_label', 'aspect_ratio', 'keyframes']) {
      if (!(k in cam)) {
        syntaxIssues.push(`[语法层] camera 缺少字段 "${k}"`);
      }
    }
    if (typeof cam.intent_label !== 'string') syntaxIssues.push('[语法层] camera.intent_label 须为字符串');
    if (cam.aspect_ratio !== '16:9' && cam.aspect_ratio !== '2.39:1' && cam.aspect_ratio !== '9:16') {
      syntaxIssues.push('[语法层] camera.aspect_ratio 须为 16:9 | 2.39:1 | 9:16');
    }
    if (!Array.isArray(cam.keyframes) || cam.keyframes.length < 2) {
      syntaxIssues.push('[语法层] camera.keyframes 至少需要 2 个关键帧');
    } else {
      let prevTime = -Infinity;
      cam.keyframes.forEach((kf, idx) => {
        if (!isPlainObject(kf)) {
          syntaxIssues.push(`[语法层] camera.keyframes[${idx}] 须为对象`);
          return;
        }
        if (typeof kf.time !== 'number' || !Number.isFinite(kf.time) || kf.time < 0) {
          syntaxIssues.push(`[语法层] camera.keyframes[${idx}].time 须为非负数字`);
        } else {
          if (kf.time < prevTime) {
            syntaxIssues.push(`[语法层] camera.keyframes[${idx}].time 未按时间升序排列`);
          }
          prevTime = kf.time;
        }
        if (!isVec3(kf.position)) syntaxIssues.push(`[语法层] camera.keyframes[${idx}].position 须为长度为 3 的数字数组`);
        if (!isVec3(kf.target)) syntaxIssues.push(`[语法层] camera.keyframes[${idx}].target 须为长度为 3 的数字数组`);
        if (typeof kf.focal_length !== 'number' || kf.focal_length < 14 || kf.focal_length > 135) {
          syntaxIssues.push(`[语法层] camera.keyframes[${idx}].focal_length 须在 14..135mm 之间`);
        }
      });
    }
  }

  if (syntaxIssues.length > 0) {
    return {
      passed: false,
      rawJson,
      parsedDsl: null,
      syntaxIssues,
      semanticIssues,
      geometryIssues,
    };
  }

  const dsl = parsedRaw as unknown as SceneDSL;

  // ---------------- Layer 2: Semantic ----------------
  if (dsl.template_id !== template.id) {
    semanticIssues.push(
      `[语义层] 模板不匹配：当前选择模板为 "${template.id}"，但 DSL 返回 "${dsl.template_id}"`
    );
  }

  // Must-have verification
  for (const token of intent.must_have) {
    const inferred = inferDslTypeFromToken(token);
    const reqCount = parseRequestedCount(token);

    if (inferred === 'lighting') {
      const lbl = dsl.lighting.style_label.toLowerCase();
      if (/雾|fog|mist/.test(token) && dsl.lighting.fog_density < 0.01 && !/雾|fog|mist/.test(lbl)) {
        semanticIssues.push(`[语义层] 缺少风格氛围要求 "${token}"：fog_density=${dsl.lighting.fog_density} 过低且 style_label 未体现`);
      }
      if (/黄昏|夕阳|日落/.test(token) && dsl.lighting.sun_elevation > 30 && !/黄昏|夕阳|sunset|dusk/.test(lbl)) {
        semanticIssues.push(`[语义层] 缺少时段要求 "${token}"：sun_elevation=${dsl.lighting.sun_elevation} 过高`);
      }
      if (/夜/.test(token) && dsl.lighting.sun_elevation > 26 && !/夜|night/.test(lbl)) {
        semanticIssues.push(`[语义层] 缺少时段要求 "${token}"：未体现夜景低仰角光照`);
      }
      continue;
    }

    if (inferred === 'character') {
      if (dsl.characters.length < reqCount) {
        semanticIssues.push(
          `[语义层] 人物数量不足：用户要求 "${token}"（至少 ${reqCount} 名），实际生成 ${dsl.characters.length} 名`
        );
      }
      if (/蹲伏|掩体/.test(token) && !dsl.characters.some((c) => c.pose === 'crouch_cover')) {
        semanticIssues.push(`[语义层] 缺少姿态要求 "${token}"：未找到 pose="crouch_cover" 的角色`);
      }
      if (/持枪|瞄准/.test(token) && !dsl.characters.some((c) => c.pose === 'aim')) {
        semanticIssues.push(`[语义层] 缺少姿态要求 "${token}"：未找到 pose="aim" 的角色`);
      }
      if (/奔跑|冲刺/.test(token) && !dsl.characters.some((c) => c.pose === 'run')) {
        semanticIssues.push(`[语义层] 缺少姿态要求 "${token}"：未找到 pose="run" 的角色`);
      }
      continue;
    }

    const matches = dsl.objects.filter(
      (o) =>
        o.type === inferred ||
        o.name.toLowerCase().includes(token.toLowerCase()) ||
        (inferred === 'crate' && o.type === 'cargo_stack') ||
        (inferred === 'tree' && o.type === 'bush')
    );
    if (matches.length < reqCount) {
      semanticIssues.push(
        `[语义层] 必选元素不足：要求 "${token}"（至少 ${reqCount} 个 ${inferred}），DSL 中仅找到 ${matches.length} 个`
      );
    }
  }

  // Forbidden verification
  for (const forb of intent.forbidden) {
    for (const obj of dsl.objects) {
      if (checkForbiddenMatch(obj.name, forb) || checkForbiddenMatch(obj.type, forb)) {
        semanticIssues.push(
          `[语义层] 违反禁用项 "${forb}"：objects 中出现了 "${obj.name}" (type=${obj.type})`
        );
      }
    }
    for (const ch of dsl.characters) {
      if (checkForbiddenMatch(ch.role, forb)) {
        semanticIssues.push(`[语义层] 违反禁用项 "${forb}"：characters 中出现了 "${ch.role}"`);
      }
    }
    if ((forb.includes('雾') || forb.toLowerCase().includes('fog')) && dsl.lighting.fog_density >= 0.012) {
      semanticIssues.push(`[语义层] 违反禁用项 "${forb}"：fog_density=${dsl.lighting.fog_density} 过高`);
    }
  }

  // Style consistency
  if (intent.style) {
    const s = intent.style.toLowerCase();
    const lbl = dsl.lighting.style_label.toLowerCase();
    if (/大雾|迷雾|雾/.test(s) && dsl.lighting.fog_density < 0.01) {
      semanticIssues.push(`[语义层] 风格未匹配 "${intent.style}"：fog_density=${dsl.lighting.fog_density} 小于 0.01`);
    }
    if (/黄昏|夕阳|日落/.test(s) && dsl.lighting.sun_elevation > 30 && !/黄昏|夕阳|dusk/.test(lbl)) {
      semanticIssues.push(`[语义层] 风格未匹配 "${intent.style}"：sun_elevation 应 <= 30°`);
    }
    if (/晴朗|正午|烈日/.test(s) && dsl.lighting.fog_density > 0.01) {
      semanticIssues.push(`[语义层] 风格未匹配 "${intent.style}"：晴朗场景雾浓度不应大于 0.01`);
    }
  }

  // Camera intent check
  if (intent.camera_intent && dsl.camera.keyframes.length >= 2) {
    const ci = intent.camera_intent.toLowerCase();
    const k0: DSLCameraKeyframe = dsl.camera.keyframes[0];
    const kLast: DSLCameraKeyframe = dsl.camera.keyframes[dsl.camera.keyframes.length - 1];
    const dist0 = Math.hypot(
      k0.position[0] - k0.target[0],
      k0.position[1] - k0.target[1],
      k0.position[2] - k0.target[2]
    );
    const distLast = Math.hypot(
      kLast.position[0] - kLast.target[0],
      kLast.position[1] - kLast.target[1],
      kLast.position[2] - kLast.target[2]
    );

    if (/推镜头|推近|推进|dolly[\s_-]?in/.test(ci)) {
      const movedForward = distLast < dist0 - 0.5 || kLast.focal_length > k0.focal_length + 5;
      if (!movedForward) {
        semanticIssues.push(
          `[语义层] 相机运动未匹配 "${intent.camera_intent}"：首末帧距离未缩短 (${dist0.toFixed(1)}m -> ${distLast.toFixed(1)}m)`
        );
      }
    }
    if (/拉镜头|拉远|后撤|dolly[\s_-]?out/.test(ci)) {
      if (distLast <= dist0 + 0.5) {
        semanticIssues.push(
          `[语义层] 相机运动未匹配 "${intent.camera_intent}"：首末帧距离未拉远 (${dist0.toFixed(1)}m -> ${distLast.toFixed(1)}m)`
        );
      }
    }
    if (/低角度|仰拍|low/.test(ci)) {
      const avgCamY =
        dsl.camera.keyframes.reduce((acc, k) => acc + k.position[1], 0) /
        dsl.camera.keyframes.length;
      const avgTargetY =
        dsl.camera.keyframes.reduce((acc, k) => acc + k.target[1], 0) /
        dsl.camera.keyframes.length;
      if (avgCamY > avgTargetY + 1.0) {
        semanticIssues.push(
          `[语义层] 机位高度未匹配 "${intent.camera_intent}"：相机平均高度 (${avgCamY.toFixed(1)}m) 高于注视高度 (${avgTargetY.toFixed(1)}m)`
        );
      }
    }
    if (/高角度|俯拍|俯视/.test(ci)) {
      if (k0.position[1] < k0.target[1] + 2.0) {
        semanticIssues.push(
          `[语义层] 机位高度未匹配 "${intent.camera_intent}"：首帧俯拍高度差不足 2m`
        );
      }
    }
    if (/环绕|orbit/.test(ci)) {
      const a0 = Math.atan2(k0.position[2] - k0.target[2], k0.position[0] - k0.target[0]);
      const aMid = Math.atan2(
        dsl.camera.keyframes[Math.min(1, dsl.camera.keyframes.length - 1)].position[2] - k0.target[2],
        dsl.camera.keyframes[Math.min(1, dsl.camera.keyframes.length - 1)].position[0] - k0.target[0]
      );
      const da = Math.abs(Math.atan2(Math.sin(aMid - a0), Math.cos(aMid - a0)));
      if (da < 0.25) {
        semanticIssues.push(
          `[语义层] 环绕角度不足：请求 "${intent.camera_intent}"，但关键帧水平方位变化过小`
        );
      }
    }
  }

  // ---------------- Layer 3: Geometry ----------------
  const solidBoxes: Box3D[] = dsl.objects
    .filter((o) => SOLID_BLOCKING_TYPES.has(o.type))
    .map(computeObjectBox);

  // 1. Building & solid overlap check (allow props resting cleanly atop floor/roof surfaces)
  for (let i = 0; i < solidBoxes.length; i++) {
    for (let j = i + 1; j < solidBoxes.length; j++) {
      const a = solidBoxes[i];
      const b = solidBoxes[j];
      const stackedCleanly =
        a.minY >= b.maxY - 0.15 || b.minY >= a.maxY - 0.15;
      if (!stackedCleanly && boxesOverlap(a, b, -0.12)) {
        geometryIssues.push(
          `[几何层] 物体碰撞重叠："${a.name}"(${a.id}) 与 "${b.name}"(${b.id}) 的 3D 包围盒发生穿插`
        );
      }
    }
  }

  // 2. Camera position & sightline occlusion check
  dsl.camera.keyframes.forEach((kf, idx) => {
    for (const box of solidBoxes) {
      if (pointInsideBox(kf.position, box, 0.25)) {
        geometryIssues.push(
          `[几何层] 相机穿模：第 ${idx + 1} 帧机位 [${kf.position.join(', ')}] 位于实体 "${box.name}" 内部`
        );
      } else {
        const hitT = segmentIntersectsBox(kf.position, kf.target, box);
        if (hitT !== null && hitT > 0.01 && hitT < 0.85) {
          geometryIssues.push(
            `[几何层] 视线被遮挡：第 ${idx + 1} 帧相机视线上存在实体 "${box.name}"(${box.id}) 挡住目标点`
          );
        }
      }
    }
  });

  // 3. Character bounds & collision check
  const walkable = template.walkableBounds;
  dsl.characters.forEach((ch) => {
    const [cx, cy, cz] = ch.position;
    if (
      cx < walkable.minX ||
      cx > walkable.maxX ||
      cz < walkable.minZ ||
      cz > walkable.maxZ
    ) {
      geometryIssues.push(
        `[几何层] 人物越界：角色 "${ch.role}"(${ch.id}) 坐标 (${cx}, ${cz}) 超出模板可行走区 X[${walkable.minX}..${walkable.maxX}], Z[${walkable.minZ}..${walkable.maxZ}]`
      );
    }
    if (cy < -3.5 || cy > 35) {
      geometryIssues.push(
        `[几何层] 人物高度异常：角色 "${ch.role}"(${ch.id}) Y=${cy} 超出合理地表/平台范围`
      );
    }
    for (const box of solidBoxes) {
      // Character core collision check (center hip point)
      if (pointInsideBox([cx, cy + 0.9, cz], box, -0.08)) {
        geometryIssues.push(
          `[几何层] 人物穿模：角色 "${ch.role}"(${ch.id}) 站位于实体 "${box.name}"(${box.id}) 内部`
        );
      }
    }
  });

  const passed =
    syntaxIssues.length === 0 &&
    semanticIssues.length === 0 &&
    geometryIssues.length === 0;

  return {
    passed,
    rawJson,
    parsedDsl: dsl,
    syntaxIssues,
    semanticIssues,
    geometryIssues,
  };
}
