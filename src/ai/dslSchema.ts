import type { AspectRatio, PosePreset, PropType, Vec3 } from '../types/scene';

export type SceneTemplateId =
  | 'alley'
  | 'street'
  | 'plaza'
  | 'interior'
  | 'rooftop';

export const SCENE_TEMPLATE_IDS: readonly SceneTemplateId[] = [
  'alley',
  'street',
  'plaza',
  'interior',
  'rooftop',
] as const;

export const DSL_OBJECT_TYPES = [
  'wall',
  'floor',
  'stairs',
  'ramp',
  'pillar',
  'crate',
  'doorway',
  'table',
  'roof',
  'barrier',
  'vehicle',
  'lamp',
  'tree',
  'bush',
  'cargo_stack',
  'hero_compound',
  'building',
] as const;

export type DSLObjectType = (typeof DSL_OBJECT_TYPES)[number];

export const DSL_CHARACTER_POSES: readonly PosePreset[] = [
  'idle',
  'walk',
  'run',
  'crouch_cover',
  'aim',
  'sit',
  'lean_wall',
  'look_over_edge',
] as const;

export interface IntentSummary {
  style: string;
  layout: string;
  must_have: string[];
  camera_intent: string;
  forbidden: string[];
  ambiguous: boolean;
  clarification_questions?: string[];
  recommended_template?: SceneTemplateId;
}

export interface DSLObjectNode {
  id: string;
  name: string;
  type: DSLObjectType;
  slot_id: string | null;
  position: Vec3;
  rotation_y_deg: number | null;
  scale: Vec3 | null;
  floors: number | null;
}

export interface DSLCharacterNode {
  id: string;
  role: string;
  pose: PosePreset;
  slot_id: string | null;
  position: Vec3;
  rotation_y_deg: number | null;
}

export interface DSLCameraKeyframe {
  time: number;
  position: Vec3;
  target: Vec3;
  focal_length: number;
}

export interface DSLLightingConfig {
  style_label: string;
  sun_azimuth: number;
  sun_elevation: number;
  fog_density: number;
  material_tone: string | null;
}

export interface SceneDSL {
  template_id: SceneTemplateId;
  lighting: DSLLightingConfig;
  objects: DSLObjectNode[];
  characters: DSLCharacterNode[];
  camera: {
    intent_label: string;
    aspect_ratio: AspectRatio;
    keyframes: DSLCameraKeyframe[];
  };
}

export interface TemplateSlot {
  slot_id: string;
  label: string;
  category: 'structure' | 'cover' | 'vehicle' | 'nature' | 'character' | 'interior';
  position: Vec3;
  rotation_y_deg: number;
  scale: Vec3;
}

export interface CameraSlot {
  id: string;
  label: string;
  position: Vec3;
  target: Vec3;
  focal_length: number;
}

export interface ValidationReport {
  passed: boolean;
  rawJson: string;
  parsedDsl: SceneDSL | null;
  syntaxIssues: string[];
  semanticIssues: string[];
  geometryIssues: string[];
}

export type FallbackStylePatch = {
  style_label: string;
  sun_azimuth: number;
  sun_elevation: number;
  fog_density: number;
  material_tone: string | null;
  element_names: Record<string, string>;
};

export function mapDslTypeToPropType(type: DSLObjectType): PropType | null {
  switch (type) {
    case 'bush':
      return 'tree';
    case 'cargo_stack':
      return 'crate';
    case 'hero_compound':
      return null;
    default:
      return type;
  }
}
