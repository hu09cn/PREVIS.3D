export type Vec3 = [number, number, number];

export type PropType =
  | 'road'
  | 'wall'
  | 'floor'
  | 'stairs'
  | 'ramp'
  | 'pillar'
  | 'crate'
  | 'doorway'
  | 'building'
  | 'roof'
  | 'barrier'
  | 'table'
  | 'vehicle'
  | 'lamp'
  | 'tree'
  | 'rock'
  | 'furniture'
  | 'facility'
  | 'scene_prop'
  | 'creature'
  | 'box';

export type ObjectAnimationPreset =
  | 'none'
  | 'pop_in'
  | 'collapse_sink'
  | 'float_hover'
  | 'spin_turntable'
  | 'shake_impact'
  | 'tree_fall'
  | 'tree_sway'
  | 'tree_uproot'
  | 'rock_shatter'
  | 'rock_roll'
  | 'rock_rise'
  | 'vehicle_drive'
  | 'vehicle_brake_stop'
  | 'vehicle_flip'
  | 'lamp_flicker'
  | 'crate_scatter'
  | 'door_slide_open';

export interface ObjectAnimationSpec {
  preset: ObjectAnimationPreset;
  triggerTime: number;
  duration: number;
  intensity?: number;
  directionDeg?: number;
  loop?: boolean;
}

export type PosePreset =
  | 'idle'
  | 'walk'
  | 'run'
  | 'crouch_cover'
  | 'aim'
  | 'sit'
  | 'lean_wall'
  | 'look_over_edge';

export type JointName =
  | 'pelvis'
  | 'lowerSpine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'leftUpperArm'
  | 'leftForearm'
  | 'leftHand'
  | 'rightUpperArm'
  | 'rightForearm'
  | 'rightHand'
  | 'leftThigh'
  | 'leftShin'
  | 'leftBoot'
  | 'rightThigh'
  | 'rightShin'
  | 'rightBoot';

export type JointRotations = Record<JointName, Vec3>;

export type TerrainTheme =
  | 'flat_plain'
  | 'meadow'
  | 'hills'
  | 'mountains'
  | 'alpine_peaks'
  | 'plateau'
  | 'ocean'
  | 'lone_island'
  | 'archipelago'
  | 'canyon_valley'
  | 'coastal_bay'
  | 'wildcard'
  // Legacy preset keys retained for backward compatibility with saved projects / AI DSL
  | 'urban_flat'
  | 'coastal_canal'
  | 'hillside_district'
  | 'industrial_valley';

export interface TerrainConfig {
  theme: TerrainTheme;
  relief: number; // 0..1
  hasWaterChannel: boolean;
  mapSize?: number; // Custom square side length in meters (default 960, range 60..2400)
  seed?: number; // Random variation seed for procedural terrain templates
  sculptGridRes?: number; // Default 128 when sculpted
  sculptDeltas?: number[]; // Length (res+1)^2, height offsets in meters
  paintMaterials?: number[]; // Length (res+1)^2, surface material codes (0=auto)
}

export type TerrainBrushMaterial =
  | 'auto'
  | 'water'
  | 'grass'
  | 'rock'
  | 'sand'
  | 'soil'
  | 'snow';

export type TerrainBrushTool =
  | 'paint'
  | 'clay'
  | 'standard'
  | 'carve'
  | 'flatten'
  | 'plateau'
  | 'smooth'
  | 'pinch'
  | 'erase';

export interface TerrainBrushConfig {
  active: boolean;
  tool: TerrainBrushTool;
  material: TerrainBrushMaterial;
  radius: number; // meters (2..45)
  strength: number; // 0.05..1.0
  falloff: number; // 0.1..0.95 (focal shift / soft edge)
}

export type RoadPattern =
  | 'none'
  | 'single_main'
  | 'crossroad'
  | 'avenue'
  | 'winding_alley'
  | 'boulevard_ring';

export interface RoadConfig {
  pattern: RoadPattern;
  width: number; // meters, e.g. 10..14
}

export type DistrictId =
  | 'commercial_main'
  | 'old_industrial'
  | 'overpass_plaza'
  | 'canal_bank';

export interface DistrictInfo {
  id: DistrictId;
  name: string;
  center: Vec3;
  cameraPos: Vec3;
  cameraTarget: Vec3;
}

export type BuildingStyle =
  | 'modern'
  | 'industrial'
  | 'residential'
  | 'tower_setback'
  | 'commercial'
  | 'ruin_shell';

export interface BuildingSpec {
  id: string;
  kind: 'building';
  name: string;
  district: DistrictId;
  style: BuildingStyle;
  variantId?: string;
  tintColor?: string;
  position: Vec3;
  rotationY: number;
  width: number;
  depth: number;
  floors: number;
  hasFireEscape: boolean;
  visible: boolean;
  locked: boolean;
  animation?: ObjectAnimationSpec;
}

export interface HeroCompoundSpec {
  id: string;
  kind: 'hero_compound';
  name: string;
  position: Vec3;
  rotationY: number;
  visible: boolean;
  locked: boolean;
  animation?: ObjectAnimationSpec;
}

export type ScatteredPropType =
  | 'lamp'
  | 'barrier'
  | 'cargo_stack'
  | 'car'
  | 'tree'
  | 'bush'
  | 'rock';

export interface ScatteredPropSpec {
  id: string;
  type: ScatteredPropType;
  variantId?: string;
  position: Vec3;
  rotationY: number;
  scale: number;
}

export interface SceneAsset {
  id: string;
  kind: 'asset';
  type: PropType;
  variantId?: string;
  tintColor?: string;
  name: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  visible: boolean;
  locked: boolean;
  animation?: ObjectAnimationSpec;
}

export type PrimitiveShape =
  | 'box'
  | 'cylinder'
  | 'sphere'
  | 'cone'
  | 'plane'
  | 'torus'
  | 'dodecahedron'
  | 'capsule';

export type ProceduralMaterialKind =
  | 'matte'
  | 'wood'
  | 'stone'
  | 'metal'
  | 'glass'
  | 'foliage'
  | 'emissive'
  | 'fabric';

export interface CustomModelPart {
  id: string;
  name?: string;
  shape: PrimitiveShape;
  /** Local position relative to model base center [0, 0, 0] in meters */
  position: Vec3;
  /** Local Euler rotation in radians */
  rotation: Vec3;
  /** Full bounding dimensions [widthX, heightY, depthZ] in meters */
  size: Vec3;
  /** Optional cylinder top/bottom diameter ratio (default 1.0) */
  topRatio?: number;
  /** Hex color in Color channel */
  color: string;
  materialKind?: ProceduralMaterialKind;
}

export interface CustomModelAsset {
  id: string;
  kind: 'custom_model';
  name: string;
  description?: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  parts: CustomModelPart[];
  visible: boolean;
  locked: boolean;
  animation?: ObjectAnimationSpec;
}

export interface GltfModelAsset {
  id: string;
  kind: 'gltf_model';
  name: string;
  glbDataUrl: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  visible: boolean;
  locked: boolean;
  sourceLabel?: string;
  animation?: ObjectAnimationSpec;
}

export interface CharacterActor {
  id: string;
  kind: 'character';
  name: string;
  variantId?: string;
  tintColor?: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  pose: PosePreset;
  pelvisOffsetY: number;
  joints: JointRotations;
  visible: boolean;
  locked: boolean;
}

export interface WorldEnvironment {
  timeMinutes?: number; // 0..1439 (e.g. 555 = 09:15)
  sunAzimuth: number;
  sunElevation: number;
  fogDensity: number;
  bgColor: string;
}

export interface WorldPlan {
  theme: string;
  terrainSummary: string;
  districts: string[];
  blockingArc: string;
}

export interface WorldState {
  environment: WorldEnvironment;
  terrain: TerrainConfig;
  road: RoadConfig;
  districts: DistrictInfo[];
  buildings: BuildingSpec[];
  heroCompound: HeroCompoundSpec | null;
  scatteredProps: ScatteredPropSpec[];
  assets: SceneAsset[];
  customModels?: CustomModelAsset[];
  gltfModels?: GltfModelAsset[];
  paintedRoads?: PaintedRoadPath[];
  paintedFences?: PaintedFencePath[];
  characters: CharacterActor[];
  lastWorldPlan?: WorldPlan;
}

export type AspectRatio = '16:9' | '2.39:1' | '9:16';

export type KeyframeInterpolation = 'smooth' | 'linear' | 'step';

export interface CharacterKeyframe {
  id: string;
  time: number;
  position: Vec3;
  rotation: Vec3;
  pose: PosePreset;
  pelvisOffsetY: number;
  joints: JointRotations;
  interpolation?: KeyframeInterpolation;
}

export type CharacterActionTemplateType =
  | 'advance_aim'
  | 'take_cover'
  | 'turn_aim'
  | 'patrol_walk';

export interface ShotKeyframe {
  id: string;
  time: number;
  position: Vec3;
  target: Vec3;
  focalLength: number;
  characterPoses?: Record<string, PosePreset>;
}

export interface ShotData {
  id: string;
  name: string;
  focalLength: number;
  aspectRatio: AspectRatio;
  duration: number;
  fps: 24 | 30;
  lookAtTargetId: string | null;
  keyframes: ShotKeyframe[];
  /** Per-character animation keyframe tracks: characterId -> sorted CharacterKeyframe[] */
  characterTracks?: Record<string, CharacterKeyframe[]>;
}

export type RenderChannel = 'color' | 'clay' | 'depth' | 'normal' | 'wireframe';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export const SHOT_CAMERA_ID = '__shot_camera__';
export const SHOT_TARGET_ID = '__shot_target__';

export interface ProjectData {
  id: string;
  name: string;
  updatedAt: number;
  world: WorldState;
  shots: ShotData[];
  activeShotId: string;
}

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export type CameraPresetType =
  | 'dolly_in'
  | 'dolly_out'
  | 'orbit'
  | 'low_angle_push'
  | 'dolly_zoom';

export type PaintedRoadStyle =
  | 'asphalt_2lane'
  | 'asphalt_4lane'
  | 'highway'
  | 'cobble'
  | 'dirt'
  | 'sidewalk'
  | 'viaduct'
  | 'rail';

export interface PaintedRoadPath {
  id: string;
  name: string;
  style: PaintedRoadStyle;
  width: number;
  points: Vec3[];
}

export interface PaintedFencePath {
  id: string;
  name: string;
  propType: 'barrier' | 'wall';
  variantId: string;
  points: Vec3[];
}

export type ObjectEraseFilter = 'all' | 'tree' | 'props' | 'paths';

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type AppLanguage = 'zh' | 'en';

export interface PendingPlacement {
  kind:
    | 'asset'
    | 'character'
    | 'road_brush'
    | 'fence_brush'
    | 'tree_brush'
    | 'rock_brush'
    | 'object_eraser';
  propType?: PropType;
  variantId?: string;
  roadStyle?: PaintedRoadStyle;
  roadWidth?: number;
  brushRadius?: number;
  brushDensity?: number;
  mixGroupVariants?: boolean;
  eraseFilter?: ObjectEraseFilter;
  pose?: PosePreset;
  label: string;
  continuous?: boolean;
}
