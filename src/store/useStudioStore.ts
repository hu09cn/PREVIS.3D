import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import * as THREE from 'three';
import {
  getInventoryForPropType,
  getItemGroupForVariant,
  getNextBuildingStyle,
  getNextCharacterVariantId,
  getNextVariantId,
} from '../data/assetInventory';
import {
  cloneJoints,
  focalLengthToFov,
  POSE_PRESETS,
  PROP_CATALOG,
} from '../data/presets';
import { createEmptyOpenWorldProject } from '../data/defaultWorld';
import {
  clampMapSize,
  describeWildcardSeed,
  getGroundY,
  getTerrainHalf,
  SCULPT_GRID_DEFAULT,
} from '../engine/terrain';
import {
  buildTerrainTemplateProps,
  TEMPLATE_PROP_ID_PREFIX,
} from '../engine/terrainTemplateProps';
import {
  getRoadBrushPreset,
  groundPolylinePoints,
  simplifyAndSmoothStroke,
} from '../engine/paintedPaths';
import {
  buildCharacterActionTemplate,
  evaluateCharacterAtTime,
} from '../engine/animation';
import {
  DEFAULT_KEYBINDINGS,
  type KeyActionId,
  type KeybindingMap,
  loadKeybindings,
  saveKeybindings,
} from '../engine/keybindings';
import type {
  AIConfig,
  AppLanguage,
  AspectRatio,
  BuildingSpec,
  BuildingStyle,
  CameraPresetType,
  CharacterActionTemplateType,
  CharacterActor,
  DistrictId,
  GltfModelAsset,
  GraphicsQuality,
  JointName,
  KeyframeInterpolation,
  ObjectAnimationSpec,
  ObjectEraseFilter,
  PaintedFencePath,
  PaintedRoadPath,
  PaintedRoadStyle,
  PendingPlacement,
  PosePreset,
  ProjectData,
  PropType,
  RenderChannel,
  RoadConfig,
  ScatteredPropType,
  SceneAsset,
  ShotData,
  ShotKeyframe,
  TerrainBrushConfig,
  TerrainConfig,
  TerrainTheme,
  TransformMode,
  Vec3,
  WorldEnvironment,
  WorldState,
} from '../types/scene';
import { SHOT_CAMERA_ID, SHOT_TARGET_ID } from '../types/scene';

const IDB_STORAGE_KEY = 'ai_previs_cinemap_openworld_v5';
const AI_CONFIG_KEY = 'ai_previs_studio_ai_config_v1';
const MAX_HISTORY = 50;

const TERRAIN_TEMPLATE_DEFAULTS: Record<
  TerrainTheme,
  { relief: number; hasWaterChannel: boolean }
> = {
  flat_plain: { relief: 0, hasWaterChannel: false },
  urban_flat: { relief: 0, hasWaterChannel: false },
  meadow: { relief: 0.55, hasWaterChannel: false },
  hills: { relief: 0.7, hasWaterChannel: false },
  mountains: { relief: 0.85, hasWaterChannel: false },
  alpine_peaks: { relief: 0.92, hasWaterChannel: false },
  plateau: { relief: 0.85, hasWaterChannel: false },
  ocean: { relief: 0.5, hasWaterChannel: false },
  lone_island: { relief: 0.78, hasWaterChannel: false },
  archipelago: { relief: 0.78, hasWaterChannel: false },
  canyon_valley: { relief: 0.85, hasWaterChannel: false },
  coastal_bay: { relief: 0.72, hasWaterChannel: false },
  wildcard: { relief: 0.85, hasWaterChannel: false },
  coastal_canal: { relief: 0.65, hasWaterChannel: true },
  hillside_district: { relief: 0.7, hasWaterChannel: false },
  industrial_valley: { relief: 0.7, hasWaterChannel: false },
};

function regroundWorldState(world: WorldState): {
  nextWorld: WorldState;
  updatedCount: number;
} {
  let updatedCount = 0;
  const { terrain, road } = world;
  const buildings = world.buildings.map((b) => {
    updatedCount++;
    const gy = getGroundY(b.position[0], b.position[2], terrain, road);
    return { ...b, position: [b.position[0], gy, b.position[2]] as Vec3 };
  });
  const heroCompound = world.heroCompound
    ? (() => {
        updatedCount++;
        const hc = world.heroCompound;
        const gy = getGroundY(hc.position[0], hc.position[2], terrain, road);
        return { ...hc, position: [hc.position[0], gy, hc.position[2]] as Vec3 };
      })()
    : null;
  const scatteredProps = world.scatteredProps.map((sp) => {
    updatedCount++;
    const gy = getGroundY(sp.position[0], sp.position[2], terrain, road);
    return { ...sp, position: [sp.position[0], gy, sp.position[2]] as Vec3 };
  });
  const assets = world.assets.map((a) => {
    if (a.type === 'roof') return a;
    updatedCount++;
    const gy = getGroundY(a.position[0], a.position[2], terrain, road);
    return {
      ...a,
      position: [a.position[0], gy, a.position[2]] as Vec3,
    };
  });
  const customModels = (world.customModels ?? []).map((cm) => {
    if (cm.position[1] < -0.9 && cm.position[1] > -1.3) return cm;
    updatedCount++;
    const gy = getGroundY(cm.position[0], cm.position[2], terrain, road);
    return {
      ...cm,
      position: [cm.position[0], gy, cm.position[2]] as Vec3,
    };
  });
  const gltfModels = (world.gltfModels ?? []).map((gm) => {
    updatedCount++;
    const gy = getGroundY(gm.position[0], gm.position[2], terrain, road);
    return {
      ...gm,
      position: [gm.position[0], gy, gm.position[2]] as Vec3,
    };
  });
  const characters = world.characters.map((ch) => {
    updatedCount++;
    const gy = getGroundY(ch.position[0], ch.position[2], terrain, road);
    return { ...ch, position: [ch.position[0], gy, ch.position[2]] as Vec3 };
  });
  const paintedRoads = (world.paintedRoads ?? []).map((pr) => {
    updatedCount++;
    const lift = pr.style === 'viaduct' ? 4.8 : 0;
    return {
      ...pr,
      points: groundPolylinePoints(pr.points, terrain, road, lift),
    };
  });
  const paintedFences = (world.paintedFences ?? []).map((pf) => {
    updatedCount++;
    return {
      ...pf,
      points: groundPolylinePoints(pf.points, terrain, road, 0),
    };
  });
  return {
    updatedCount,
    nextWorld: {
      ...world,
      buildings,
      heroCompound,
      scatteredProps,
      assets,
      customModels,
      gltfModels,
      paintedRoads,
      paintedFences,
      characters,
    },
  };
}

interface HistorySnapshot {
  world: WorldState;
  shots: ShotData[];
  activeShotId: string;
}

export interface PendingCameraMove {
  position: Vec3;
  target: Vec3;
  nonce: number;
}

export interface StudioState {
  initialized: boolean;
  saveStatus: 'saved' | 'saving';
  projects: ProjectData[];
  activeProjectId: string;

  // Selection & viewport controls
  selectedId: string | null;
  transformMode: TransformMode;
  gridSnap: boolean;
  snapStep: number;
  channel: RenderChannel;
  defogEnabled: boolean;
  cameraCollision: boolean;
  showKeyHints: boolean;
  keybindings: KeybindingMap;
  keybindingsOpen: boolean;
  graphicsQuality: GraphicsQuality;
  language: AppLanguage;
  settingsModalOpen: boolean;
  depthNear: number;
  depthFar: number;
  pipSwapped: boolean;
  isTransforming: boolean;
  pendingDirectorCamera: PendingCameraMove | null;

  // Playback, recording & export
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  playbackRate: number;
  isRecordingCamera: boolean;
  autoKeyCharacter: boolean;
  isExporting: boolean;
  exportProgress: number;

  // Undo / Redo
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // AI config
  aiConfig: AIConfig;

  // Selectors
  initFromStorage: () => Promise<void>;
  getActiveProject: () => ProjectData;
  getActiveShot: () => ShotData;

  // Project CRUD
  createProject: (name?: string) => void;
  renameProject: (id: string, name: string) => void;
  switchProject: (id: string) => void;
  deleteProject: (id: string) => void;
  importProjectJson: (jsonText: string) => { ok: boolean; error?: string };
  exportProjectJson: () => string;

  // Multi-Shot management
  createShot: () => void;
  duplicateShot: (shotId: string) => void;
  switchShot: (shotId: string) => void;
  renameShot: (shotId: string, name: string) => void;
  moveShot: (shotId: string, direction: 'up' | 'down') => void;
  deleteShot: (shotId: string) => void;
  updateActiveShot: (patch: Partial<ShotData>) => void;
  setShotFocalLength: (mm: number) => void;
  setShotAspectRatio: (ar: AspectRatio) => void;
  setShotLookAtTarget: (targetId: string | null) => void;

  // Selection & Viewport
  selectObject: (id: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setGridSnap: (enabled: boolean) => void;
  setChannel: (channel: RenderChannel) => void;
  setDefogEnabled: (enabled: boolean) => void;
  toggleDefog: () => void;
  setCameraCollision: (enabled: boolean) => void;
  toggleCameraCollision: () => void;
  setShowKeyHints: (show: boolean) => void;
  toggleKeyHints: () => void;
  setKeybindingsOpen: (open: boolean) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  setLanguage: (language: AppLanguage) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setKeybinding: (action: KeyActionId, combo: string) => KeyActionId | null;
  resetKeybinding: (action: KeyActionId) => void;
  resetAllKeybindings: () => void;
  clearFog: () => void;
  setDepthRange: (near: number, far: number) => void;
  togglePipSwap: () => void;
  setIsTransforming: (v: boolean) => void;
  teleportToDistrict: (districtId: DistrictId) => void;
  teleportToHeroCompound: () => void;
  clearPendingDirectorCamera: () => void;
  pendingPlacement: PendingPlacement | null;
  setPendingPlacement: (placement: PendingPlacement | null) => void;
  togglePendingPlacementContinuous: () => void;

  // World editing
  terrainBrush: TerrainBrushConfig;
  terrainBrushOrbitHold: boolean;
  terrainPointerOver: boolean;
  terrainTemplateGenerateProps: boolean;
  toggleTerrainTemplateGenerateProps: () => void;
  setTerrainBrush: (patch: Partial<TerrainBrushConfig>) => void;
  setTerrainBrushOrbitHold: (active: boolean) => void;
  setTerrainPointerOver: (over: boolean) => void;
  updateTerrainConfig: (patch: Partial<TerrainConfig>) => void;
  setTerrainMapSize: (mapSize: number) => number;
  applyTerrainTemplate: (theme: TerrainTheme, seed?: number) => number;
  randomizeCurrentTerrain: () => { seed: number; spawnedCount: number };
  generateWildcardTerrain: () => {
    seed: number;
    spawnedCount: number;
    summaryZh: string;
    summaryEn: string;
  };
  clearScene: () => void;
  updateRoadConfig: (patch: Partial<RoadConfig>) => void;
  commitTerrainSculpt: (
    sculptDeltas: number[],
    sculptGridRes?: number,
    paintMaterials?: number[]
  ) => void;
  resetTerrainSculpt: () => void;
  regroundWorldToTerrain: () => number;
  updateEnvironment: (patch: Partial<WorldEnvironment>) => void;
  addAsset: (type: PropType, position?: Vec3, variantId?: string) => string;
  addPaintedRoad: (
    style: PaintedRoadStyle,
    width: number,
    points: Vec3[],
    label?: string
  ) => string;
  addPaintedFence: (
    propType: 'barrier' | 'wall',
    variantId: string,
    points: Vec3[],
    label?: string
  ) => string;
  deletePaintedStroke: (id: string) => void;
  scatterTreesInRadius: (
    center: Vec3,
    radius: number,
    density: number,
    variantId?: string,
    mixGroupVariants?: boolean,
    recordHistory?: boolean
  ) => number;
  scatterRocksInRadius: (
    center: Vec3,
    radius: number,
    density: number,
    variantId?: string,
    mixGroupVariants?: boolean,
    recordHistory?: boolean
  ) => number;
  eraseObjectsInRadius: (
    center: Vec3,
    radius: number,
    filter?: ObjectEraseFilter,
    recordHistory?: boolean
  ) => number;
  updateObjectVariant: (
    id: string,
    patch: {
      variantId?: string;
      tintColor?: string;
      resetTint?: boolean;
      style?: BuildingStyle;
      floors?: number;
    }
  ) => void;
  cycleObjectVariant: (id: string) => void;
  duplicateSelected: () => string | null;
  duplicateInPlaceAt: (
    id: string,
    snapshot?: { position?: Vec3; rotation?: Vec3; scale?: Vec3 },
    recordHistory?: boolean
  ) => string | null;
  focusSelected: () => void;
  promoteScatteredProp: (scatteredId: string) => string | null;
  addGltfModel: (
    glbDataUrl: string,
    name: string,
    sourceLabel?: string,
    position?: Vec3
  ) => string;
  addCharacter: (pose?: PosePreset, position?: Vec3, variantId?: string) => string;
  updateObjectTransform: (
    id: string,
    patch: Partial<{ position: Vec3; rotation: Vec3; scale: Vec3; name: string }>,
    recordHistory?: boolean
  ) => void;
  renameObject: (id: string, name: string) => void;
  setObjectAnimation: (id: string, animation: ObjectAnimationSpec | undefined) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  updateCharacterPose: (id: string, pose: PosePreset) => void;
  updateCharacterJoint: (id: string, joint: JointName, value: Vec3) => void;
  deleteSelected: () => void;
  applyAIScene: (world: WorldState, shots: ShotData[], focusCenter?: Vec3, preserveCamera?: boolean) => void;

  // Timeline & Shot Keyframes
  setCurrentTime: (t: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLooping: (looping: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  startCameraRecording: () => void;
  stopCameraRecording: () => void;
  recordCameraSample: (
    time: number,
    position: Vec3,
    target: Vec3,
    focalLength?: number
  ) => void;
  setAutoKeyCharacter: (enabled: boolean) => void;
  setShotDuration: (duration: number) => void;
  addOrUpdateKeyframe: (
    kf: Omit<ShotKeyframe, 'id'> & { id?: string; includeCharacterPoses?: boolean }
  ) => void;
  updateKeyframeById: (id: string, patch: Partial<ShotKeyframe>) => void;
  removeKeyframe: (id: string) => void;
  setShotKeyframes: (keyframes: ShotKeyframe[]) => void;
  applyCameraPreset: (preset: CameraPresetType) => void;
  updateShotCameraPosition: (pos: Vec3) => void;
  updateShotCameraTarget: (target: Vec3) => void;
  applyDirectorViewAsKeyframe: (
    position: Vec3,
    target: Vec3,
    focalLength?: number
  ) => void;

  // Character Animation Keyframes
  addOrUpdateCharacterKeyframe: (
    characterId: string,
    time?: number,
    interpolation?: KeyframeInterpolation
  ) => void;
  removeCharacterKeyframe: (characterId: string, keyframeId: string) => void;
  setCharacterKeyframeInterpolation: (
    characterId: string,
    keyframeId: string,
    interpolation: KeyframeInterpolation
  ) => void;
  clearCharacterTrack: (characterId: string) => void;
  applyCharacterActionTemplate: (
    characterId: string,
    template: CharacterActionTemplateType
  ) => void;

  // Export state
  setExportState: (isExporting: boolean, progress?: number) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // AI Config
  setAIConfig: (config: AIConfig) => void;

  // Real-time Co-Creation (updates active project world without touching shots or local history)
  applyRemoteWorld: (updater: (prevWorld: WorldState) => WorldState) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(
  projects: ProjectData[],
  setSaveStatus: (s: 'saved' | 'saving') => void
) {
  setSaveStatus('saving');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    idbSet(IDB_STORAGE_KEY, projects)
      .then(() => setSaveStatus('saved'))
      .catch((err) => {
        console.warn('IndexedDB save failed:', err);
        setSaveStatus('saved');
      });
  }, 250);
}

function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey : '';
      const rawBase =
        typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim()
          ? parsed.baseUrl.trim()
          : 'https://api.deepseek.com';
      const rawModel =
        typeof parsed.model === 'string' && parsed.model.trim()
          ? parsed.model.trim()
          : 'deepseek-chat';
      // Auto-migrate previous local Ollama or non-V3 model names strictly to deepseek-chat (V3)
      const normalizedBase =
        rawBase === 'https://api.openai.com/v1' ||
        rawBase === '/api/ollama' ||
        rawBase.includes('11434')
          ? 'https://api.deepseek.com'
          : rawBase;
      const normalizedModel =
        normalizedBase.includes('deepseek') || /reasoner|r1|flash|qwen/i.test(rawModel)
          ? 'deepseek-chat'
          : rawModel;
      return {
        baseUrl: normalizedBase,
        apiKey,
        model: normalizedModel,
      };
    }
  } catch {
    // ignore
  }
  return {
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-chat',
  };
}

function cloneSnapshot(p: ProjectData): HistorySnapshot {
  return {
    world: JSON.parse(JSON.stringify(p.world)),
    shots: JSON.parse(JSON.stringify(p.shots)),
    activeShotId: p.activeShotId,
  };
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function evaluateShotCamera(
  shot: ShotData,
  world: WorldState,
  time: number
): { position: Vec3; target: Vec3; focalLength: number; fov: number } {
  const kfs = shot.keyframes;

  // Resolve locked LookAt target if set
  let lockedTarget: Vec3 | null = null;
  if (shot.lookAtTargetId) {
    const rawChar = world.characters.find((c) => c.id === shot.lookAtTargetId);
    if (rawChar) {
      const char = evaluateCharacterAtTime(rawChar, shot, time, false);
      lockedTarget = [
        char.position[0],
        char.position[1] + 1.25,
        char.position[2],
      ];
    } else {
      const asset = world.assets.find((a) => a.id === shot.lookAtTargetId);
      const customModel = (world.customModels ?? []).find((m) => m.id === shot.lookAtTargetId);
      const gltfModel = (world.gltfModels ?? []).find((m) => m.id === shot.lookAtTargetId);
      if (asset) {
        lockedTarget = [
          asset.position[0],
          asset.position[1] + 0.8,
          asset.position[2],
        ];
      } else if (customModel) {
        lockedTarget = [
          customModel.position[0],
          customModel.position[1] + 1.5,
          customModel.position[2],
        ];
      } else if (gltfModel) {
        lockedTarget = [
          gltfModel.position[0],
          gltfModel.position[1] + 1.5,
          gltfModel.position[2],
        ];
      } else if (world.heroCompound && world.heroCompound.id === shot.lookAtTargetId) {
        const hc = world.heroCompound;
        lockedTarget = [hc.position[0], hc.position[1] + 2.5, hc.position[2]];
      } else {
        const b = world.buildings.find((item) => item.id === shot.lookAtTargetId);
        if (b) {
          lockedTarget = [
            b.position[0],
            b.position[1] + b.floors * 1.5,
            b.position[2],
          ];
        }
      }
    }
  }

  if (kfs.length === 0) {
    return {
      position: [0, 3.2, 16],
      target: lockedTarget ?? [0, 1.4, 0],
      focalLength: shot.focalLength,
      fov: focalLengthToFov(shot.focalLength),
    };
  }

  const sorted = [...kfs].sort((a, b) => a.time - b.time);
  if (sorted.length === 1 || time <= sorted[0].time) {
    const k = sorted[0];
    return {
      position: [...k.position],
      target: lockedTarget ?? [...k.target],
      focalLength: k.focalLength,
      fov: focalLengthToFov(k.focalLength),
    };
  }
  const last = sorted[sorted.length - 1];
  if (time >= last.time) {
    return {
      position: [...last.position],
      target: lockedTarget ?? [...last.target],
      focalLength: last.focalLength,
      fov: focalLengthToFov(last.focalLength),
    };
  }

  let segIdx = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      segIdx = i;
      break;
    }
  }
  const k0 = sorted[segIdx];
  const k1 = sorted[segIdx + 1];
  const span = Math.max(0.0001, k1.time - k0.time);
  const localT = (time - k0.time) / span;
  const smoothT = localT * localT * (3 - 2 * localT);
  const focalLength = k0.focalLength + (k1.focalLength - k0.focalLength) * smoothT;
  const fov = focalLengthToFov(focalLength);

  if (sorted.length === 2) {
    return {
      position: [
        k0.position[0] + (k1.position[0] - k0.position[0]) * smoothT,
        k0.position[1] + (k1.position[1] - k0.position[1]) * smoothT,
        k0.position[2] + (k1.position[2] - k0.position[2]) * smoothT,
      ],
      target: lockedTarget ?? [
        k0.target[0] + (k1.target[0] - k0.target[0]) * smoothT,
        k0.target[1] + (k1.target[1] - k0.target[1]) * smoothT,
        k0.target[2] + (k1.target[2] - k0.target[2]) * smoothT,
      ],
      focalLength,
      fov,
    };
  }

  const posCurve = new THREE.CatmullRomCurve3(
    sorted.map((k) => new THREE.Vector3(...k.position)),
    false,
    'catmullrom',
    0.5
  );
  const tgtCurve = new THREE.CatmullRomCurve3(
    sorted.map((k) => new THREE.Vector3(...k.target)),
    false,
    'catmullrom',
    0.5
  );
  const u = (segIdx + smoothT) / (sorted.length - 1);
  const pos = posCurve.getPoint(Math.min(1, Math.max(0, u)));
  const tgt = tgtCurve.getPoint(Math.min(1, Math.max(0, u)));
  return {
    position: [pos.x, pos.y, pos.z],
    target: lockedTarget ?? [tgt.x, tgt.y, tgt.z],
    focalLength,
    fov,
  };
}

function upsertAnimatedCharacterInShots(
  shots: ShotData[],
  activeShotId: string,
  targetChar: CharacterActor | undefined,
  currentTime: number,
  autoKeyCharacter: boolean,
  updater: (evaluated: CharacterActor) => Partial<CharacterActor>
): { nextShots: ShotData[]; handledByTrack: boolean } {
  const activeShot = shots.find((s) => s.id === activeShotId) ?? shots[0];
  if (!targetChar || !activeShot) {
    return { nextShots: shots, handledByTrack: false };
  }
  const existingTrack = activeShot.characterTracks?.[targetChar.id] ?? [];
  const hasTrack = existingTrack.length > 0;
  const shouldAutoCreateTrack = !hasTrack && autoKeyCharacter && currentTime >= 0.1;
  const shouldKey =
    (hasTrack &&
      (autoKeyCharacter ||
        existingTrack.some((k) => Math.abs(k.time - currentTime) < 0.08))) ||
    shouldAutoCreateTrack;

  if (!shouldKey) {
    return { nextShots: shots, handledByTrack: false };
  }

  const evaluated = evaluateCharacterAtTime(targetChar, activeShot, currentTime, false);
  const patched = updater(evaluated);
  const nextPos = patched.position ?? evaluated.position;
  const nextRot = patched.rotation ?? evaluated.rotation;
  const nextPose = patched.pose ?? evaluated.pose;
  const nextPelvis = patched.pelvisOffsetY ?? evaluated.pelvisOffsetY;
  const nextJoints = patched.joints ?? cloneJoints(evaluated.joints);

  const snapTime = Number(currentTime.toFixed(2));
  const workingTrack = [...existingTrack];
  if (shouldAutoCreateTrack) {
    workingTrack.push({
      id: makeId('ckf'),
      time: 0,
      position: [...targetChar.position],
      rotation: [...targetChar.rotation],
      pose: targetChar.pose,
      pelvisOffsetY: targetChar.pelvisOffsetY,
      joints: cloneJoints(targetChar.joints),
      interpolation: 'smooth',
    });
  }

  const existingIdx = workingTrack.findIndex((k) => Math.abs(k.time - snapTime) < 0.08);
  if (existingIdx >= 0) {
    workingTrack[existingIdx] = {
      ...workingTrack[existingIdx],
      position: [...nextPos],
      rotation: [...nextRot],
      pose: nextPose,
      pelvisOffsetY: nextPelvis,
      joints: cloneJoints(nextJoints),
    };
  } else {
    workingTrack.push({
      id: makeId('ckf'),
      time: snapTime,
      position: [...nextPos],
      rotation: [...nextRot],
      pose: nextPose,
      pelvisOffsetY: nextPelvis,
      joints: cloneJoints(nextJoints),
      interpolation: 'smooth',
    });
  }
  workingTrack.sort((a, b) => a.time - b.time);

  const nextShots = shots.map((s) =>
    s.id === activeShot.id
      ? {
          ...s,
          characterTracks: { ...(s.characterTracks ?? {}), [targetChar.id]: workingTrack },
        }
      : s
  );
  return { nextShots, handledByTrack: true };
}

const initialProject = createEmptyOpenWorldProject();

export const useStudioStore = create<StudioState>((set, get) => {
  const persist = (nextProjects: ProjectData[]) =>
    schedulePersist(nextProjects, (saveStatus) => set({ saveStatus }));

  const mutateActiveProject = (
    updater: (p: ProjectData) => ProjectData
  ): ProjectData[] => {
    const next = get().projects.map((p) =>
      p.id === get().activeProjectId ? { ...updater(p), updatedAt: Date.now() } : p
    );
    set({ projects: next });
    persist(next);
    return next;
  };

  const scatterNaturePropInRadius = (opts: {
    propType: 'tree' | 'rock';
    defaultFallbackVarId: string;
    defaultGroupName: string;
    maxDensity: number;
    spacingFactor: number;
    spacingMin: number;
    spacingMax: number;
    scaleMin: number;
    scaleSpan: number;
    center: Vec3;
    radius: number;
    density: number;
    variantId?: string;
    mixGroupVariants?: boolean;
    recordHistory?: boolean;
  }): number => {
    const {
      propType,
      defaultFallbackVarId,
      defaultGroupName,
      maxDensity,
      spacingFactor,
      spacingMin,
      spacingMax,
      scaleMin,
      scaleSpan,
      center,
      radius,
      density,
      variantId,
      mixGroupVariants = true,
      recordHistory = true,
    } = opts;
    if (recordHistory) {
      get().pushHistory();
    }
    const proj = get().getActiveProject();
    const { terrain, road } = proj.world;
    const clampedRadius = Math.max(2, Math.min(45, radius));
    const targetCount = Math.max(1, Math.min(maxDensity, Math.round(density)));
    const itemGroup = getItemGroupForVariant(propType, variantId);
    const groupVariants =
      itemGroup && itemGroup.variants.length > 0
        ? itemGroup.variants.map((v) => v.id)
        : getInventoryForPropType(propType).map((v) => v.id);
    const fallbackVarId = variantId ?? groupVariants[0] ?? defaultFallbackVarId;

    const existingSameType = proj.world.assets.filter((a) => a.type === propType);
    const minSpacing = Math.max(
      spacingMin,
      Math.min(spacingMax, clampedRadius * spacingFactor)
    );
    const mapBound = Math.max(4, getTerrainHalf(terrain) - 2);
    const created: SceneAsset[] = [];
    let baseIndex = proj.world.assets.length + 1;

    for (let i = 0; i < targetCount; i++) {
      let placedPos: [number, number, number] | null = null;
      for (let attempt = 0; attempt < 14; attempt++) {
        const r = clampedRadius * Math.sqrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const x = Math.max(-mapBound, Math.min(mapBound, center[0] + r * Math.cos(theta)));
        const z = Math.max(-mapBound, Math.min(mapBound, center[2] + r * Math.sin(theta)));

        const tooCloseExisting = existingSameType.some(
          (item) => Math.hypot(item.position[0] - x, item.position[2] - z) < minSpacing
        );
        const tooCloseNew = created.some(
          (item) => Math.hypot(item.position[0] - x, item.position[2] - z) < minSpacing
        );
        if (tooCloseExisting || tooCloseNew) continue;

        const gy = getGroundY(x, z, terrain, road);
        // Prevent trees from spawning submerged in deep water when brushing along shorelines
        if (propType === 'tree' && gy < -1.05) continue;

        placedPos = [x, z, gy];
        break;
      }
      if (!placedPos) continue;

      const [px, pz, gy] = placedPos;
      const chosenVarId =
        mixGroupVariants && groupVariants.length > 1
          ? groupVariants[Math.floor(Math.random() * groupVariants.length)]
          : fallbackVarId;
      const uniformScale = Number((scaleMin + Math.random() * scaleSpan).toFixed(2));
      const rotY = Number((Math.random() * Math.PI * 2).toFixed(2));

      created.push({
        id: makeId('asset'),
        kind: 'asset',
        type: propType,
        variantId: chosenVarId,
        name: `${itemGroup?.name ?? defaultGroupName} ${baseIndex++}`,
        position: [Number(px.toFixed(2)), Number(gy.toFixed(2)), Number(pz.toFixed(2))],
        rotation: [0, rotY, 0],
        scale: [uniformScale, uniformScale, uniformScale],
        visible: true,
        locked: false,
      });
    }

    if (created.length === 0) return 0;

    mutateActiveProject((p) => ({
      ...p,
      world: {
        ...p.world,
        assets: [...p.world.assets, ...created],
      },
    }));
    return created.length;
  };

  return {
    initialized: false,
    saveStatus: 'saved',
    projects: [initialProject],
    activeProjectId: initialProject.id,

    selectedId: null,
    transformMode: 'translate',
    gridSnap: true,
    snapStep: 0.5,
    channel: 'color',
    defogEnabled: false,
    cameraCollision:
      typeof window === 'undefined'
        ? true
        : window.localStorage.getItem('previs3d_camera_collision') !== '0',
    showKeyHints:
      typeof window === 'undefined'
        ? true
        : window.localStorage.getItem('previs3d_show_key_hints') !== '0',
    keybindings: loadKeybindings(),
    keybindingsOpen: false,
    graphicsQuality: ((): GraphicsQuality => {
      if (typeof window === 'undefined') return 'high';
      const v = window.localStorage.getItem('previs3d_graphics_quality');
      return v === 'low' || v === 'medium' || v === 'high' ? v : 'high';
    })(),
    language: ((): AppLanguage => {
      if (typeof window === 'undefined') return 'zh';
      return window.localStorage.getItem('previs3d_language') === 'en' ? 'en' : 'zh';
    })(),
    settingsModalOpen: false,
    depthNear: 1.5,
    depthFar: 85,
    pipSwapped: false,
    isTransforming: false,
    pendingDirectorCamera: null,
    pendingPlacement: null,

    currentTime: 0,
    isPlaying: false,
    isLooping: true,
    playbackRate: (() => {
      if (typeof window === 'undefined') return 1;
      const saved = Number(window.localStorage.getItem('previs3d_playback_rate'));
      return Number.isFinite(saved) && saved >= 0.1 && saved <= 4 ? saved : 1;
    })(),
    isRecordingCamera: false,
    autoKeyCharacter: true,
    isExporting: false,
    exportProgress: 0,

    past: [],
    future: [],

    terrainBrush: {
      active: false,
      tool: 'clay',
      material: 'auto',
      radius: 12,
      strength: 0.48,
      falloff: 0.55,
    },
    terrainBrushOrbitHold: false,
    terrainPointerOver: false,
    terrainTemplateGenerateProps:
      typeof window === 'undefined'
        ? true
        : window.localStorage.getItem('previs3d_terrain_tpl_props') !== '0',

    aiConfig: loadAIConfig(),

    initFromStorage: async () => {
      try {
        const saved = await idbGet<ProjectData[]>(IDB_STORAGE_KEY);
        if (
          Array.isArray(saved) &&
          saved.length > 0 &&
          saved[0].world &&
          saved[0].world.terrain &&
          Array.isArray(saved[0].shots)
        ) {
          set({
            projects: saved.map((p) => ({
              ...p,
              world: {
                ...p.world,
                customModels: p.world.customModels ?? [],
                gltfModels: p.world.gltfModels ?? [],
                paintedRoads: p.world.paintedRoads ?? [],
                paintedFences: p.world.paintedFences ?? [],
                road: {
                  width: p.world.road?.width ?? 12,
                  pattern: p.world.road?.pattern ?? 'none',
                },
                environment: {
                  ...p.world.environment,
                  bgColor:
                    p.world.environment?.bgColor === '#d4e2ea'
                      ? '#eae8e3'
                      : p.world.environment?.bgColor ?? '#eae8e3',
                },
              },
            })),
            activeProjectId: saved[0].id,
            initialized: true,
          });
          return;
        }
      } catch (err) {
        console.warn('IndexedDB load failed, using default open world:', err);
      }
      const def = createEmptyOpenWorldProject();
      set({ projects: [def], activeProjectId: def.id, initialized: true });
      persist([def]);
    },

    getActiveProject: () => {
      const { projects, activeProjectId } = get();
      return projects.find((p) => p.id === activeProjectId) ?? projects[0];
    },

    getActiveShot: () => {
      const proj = get().getActiveProject();
      return (
        proj.shots.find((s) => s.id === proj.activeShotId) ?? proj.shots[0]
      );
    },

    createProject: (name) => {
      const trimmed = name?.trim();
      const isEn = get().language === 'en';
      const proj = createEmptyOpenWorldProject(
        trimmed || (isEn ? `Empty Backlot ${get().projects.length + 1}` : `空地片场 ${get().projects.length + 1}`)
      );
      const next = [proj, ...get().projects];
      set({
        projects: next,
        activeProjectId: proj.id,
        selectedId: null,
        currentTime: 0,
        isPlaying: false,
        past: [],
        future: [],
      });
      persist(next);
    },

    renameProject: (id, rawName) => {
      const trimmed = rawName.trim();
      if (!trimmed) return;
      const next = get().projects.map((p) =>
        p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p
      );
      set({ projects: next });
      persist(next);
    },

    switchProject: (id) => {
      set({
        activeProjectId: id,
        selectedId: null,
        currentTime: 0,
        isPlaying: false,
        past: [],
        future: [],
      });
    },

    deleteProject: (id) => {
      const { projects, activeProjectId } = get();
      if (projects.length <= 1) return;
      const next = projects.filter((p) => p.id !== id);
      const nextActive = activeProjectId === id ? next[0].id : activeProjectId;
      set({
        projects: next,
        activeProjectId: nextActive,
        selectedId: null,
        currentTime: 0,
        isPlaying: false,
        past: [],
        future: [],
      });
      persist(next);
    },

    importProjectJson: (jsonText) => {
      try {
        const isEn = get().language === 'en';
        const parsed = JSON.parse(jsonText) as Partial<ProjectData>;
        if (!parsed.world || !Array.isArray(parsed.shots) || parsed.shots.length === 0) {
          return {
            ok: false,
            error: isEn ? 'JSON is missing valid world or shots data' : 'JSON 缺少有效的 world 或 shots 数据',
          };
        }
        const hasValidActiveShot =
          typeof parsed.activeShotId === 'string' &&
          parsed.shots.some((s) => s.id === parsed.activeShotId);
        const imported: ProjectData = {
          id: makeId('proj'),
          name:
            typeof parsed.name === 'string' && parsed.name
              ? parsed.name
              : isEn
                ? 'Imported Studio Project'
                : '导入片场工程',
          updatedAt: Date.now(),
          world: {
            ...parsed.world,
            districts: parsed.world.districts ?? [],
            buildings: parsed.world.buildings ?? [],
            heroCompound: parsed.world.heroCompound ?? null,
            scatteredProps: parsed.world.scatteredProps ?? [],
            assets: parsed.world.assets ?? [],
            customModels: parsed.world.customModels ?? [],
            gltfModels: parsed.world.gltfModels ?? [],
            characters: parsed.world.characters ?? [],
          },
          shots: parsed.shots,
          activeShotId: hasValidActiveShot ? (parsed.activeShotId as string) : parsed.shots[0].id,
        };
        const next = [imported, ...get().projects];
        set({
          projects: next,
          activeProjectId: imported.id,
          selectedId: null,
          currentTime: 0,
          past: [],
          future: [],
        });
        persist(next);
        return { ok: true };
      } catch (e) {
        const isEn = get().language === 'en';
        return { ok: false, error: e instanceof Error ? e.message : isEn ? 'JSON parse failed' : 'JSON 解析失败' };
      }
    },

    exportProjectJson: () => {
      return JSON.stringify(get().getActiveProject(), null, 2);
    },

    // Multi-Shot
    createShot: () => {
      get().pushHistory();
      const proj = get().getActiveProject();
      const idx = proj.shots.length + 1;
      const newShot: ShotData = {
        id: makeId('shot'),
        name: `Shot ${String(idx).padStart(2, '0')}`,
        focalLength: 35,
        aspectRatio: '16:9',
        duration: 5,
        fps: 24,
        lookAtTargetId: null,
        keyframes: [
          {
            id: makeId('kf'),
            time: 0,
            position: [4, 2.2, 15],
            target: [0, 1.4, 2],
            focalLength: 35,
          },
          {
            id: makeId('kf'),
            time: 5,
            position: [-3, 1.8, 9],
            target: [0, 1.4, 0],
            focalLength: 42,
          },
        ],
      };
      mutateActiveProject((p) => ({
        ...p,
        shots: [...p.shots, newShot],
        activeShotId: newShot.id,
      }));
      set({ currentTime: 0, isPlaying: false });
    },

    duplicateShot: (shotId) => {
      get().pushHistory();
      const proj = get().getActiveProject();
      const src = proj.shots.find((s) => s.id === shotId);
      if (!src) return;
      const copy: ShotData = JSON.parse(JSON.stringify(src));
      copy.id = makeId('shot');
      copy.name = `${src.name} ${get().language === 'en' ? 'Copy' : '副本'}`;
      copy.keyframes = copy.keyframes.map((k) => ({ ...k, id: makeId('kf') }));
      mutateActiveProject((p) => ({
        ...p,
        shots: [...p.shots, copy],
        activeShotId: copy.id,
      }));
      set({ currentTime: 0, isPlaying: false });
    },

    switchShot: (shotId) => {
      mutateActiveProject((p) => ({ ...p, activeShotId: shotId }));
      set({ currentTime: 0, isPlaying: false });
    },

    renameShot: (shotId, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const proj = get().getActiveProject();
      const target = proj.shots.find((s) => s.id === shotId);
      if (!target || target.name === trimmed) return;
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        shots: p.shots.map((s) =>
          s.id === shotId ? { ...s, name: trimmed } : s
        ),
      }));
    },

    moveShot: (shotId, direction) => {
      const proj = get().getActiveProject();
      const idx = proj.shots.findIndex((s) => s.id === shotId);
      if (idx < 0) return;
      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= proj.shots.length) return;
      get().pushHistory();
      const nextShots = [...proj.shots];
      const [item] = nextShots.splice(idx, 1);
      nextShots.splice(nextIdx, 0, item);
      mutateActiveProject((p) => ({ ...p, shots: nextShots }));
    },

    deleteShot: (shotId) => {
      const proj = get().getActiveProject();
      if (proj.shots.length <= 1) return;
      get().pushHistory();
      const nextShots = proj.shots.filter((s) => s.id !== shotId);
      const nextActive =
        proj.activeShotId === shotId ? nextShots[0].id : proj.activeShotId;
      mutateActiveProject((p) => ({
        ...p,
        shots: nextShots,
        activeShotId: nextActive,
      }));
      set({ currentTime: 0, isPlaying: false });
    },

    updateActiveShot: (patch) => {
      mutateActiveProject((p) => ({
        ...p,
        shots: p.shots.map((s) =>
          s.id === p.activeShotId ? { ...s, ...patch } : s
        ),
      }));
    },

    setShotFocalLength: (mm) => {
      const clamped = Number(Math.max(8, Math.min(300, mm)).toFixed(1));
      const { currentTime } = get();
      mutateActiveProject((p) => ({
        ...p,
        shots: p.shots.map((s) => {
          if (s.id !== p.activeShotId) return s;
          const nextKfs = s.keyframes.map((k) =>
            Math.abs(k.time - currentTime) < 0.15 || s.keyframes.length <= 1
              ? { ...k, focalLength: clamped }
              : k
          );
          return { ...s, focalLength: clamped, keyframes: nextKfs };
        }),
      }));
    },

    setShotAspectRatio: (aspectRatio) => {
      get().updateActiveShot({ aspectRatio });
    },

    setShotLookAtTarget: (lookAtTargetId) => {
      get().updateActiveShot({ lookAtTargetId });
    },

    // Selection & Viewport
    selectObject: (selectedId) => set({ selectedId }),
    setTransformMode: (transformMode) => set({ transformMode }),
    setGridSnap: (gridSnap) => set({ gridSnap }),
    setChannel: (channel) => set({ channel }),
    setDefogEnabled: (defogEnabled) => set({ defogEnabled }),
    toggleDefog: () => set((s) => ({ defogEnabled: !s.defogEnabled })),
    setCameraCollision: (cameraCollision) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'previs3d_camera_collision',
          cameraCollision ? '1' : '0'
        );
      }
      set({ cameraCollision });
    },
    toggleCameraCollision: () => {
      const next = !get().cameraCollision;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'previs3d_camera_collision',
          next ? '1' : '0'
        );
      }
      set({ cameraCollision: next });
    },
    clearFog: () => {
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          environment: { ...p.world.environment, fogDensity: 0 },
        },
      }));
      set({ defogEnabled: false });
    },
    setDepthRange: (depthNear, depthFar) =>
      set({
        depthNear: Math.max(0.1, depthNear),
        depthFar: Math.max(depthNear + 0.5, depthFar),
      }),
    togglePipSwap: () => set((s) => ({ pipSwapped: !s.pipSwapped })),
    setShowKeyHints: (showKeyHints) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('previs3d_show_key_hints', showKeyHints ? '1' : '0');
      }
      set({ showKeyHints });
    },
    toggleKeyHints: () => {
      const next = !get().showKeyHints;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('previs3d_show_key_hints', next ? '1' : '0');
      }
      set({ showKeyHints: next });
    },
    setKeybindingsOpen: (keybindingsOpen) => set({ keybindingsOpen }),
    setGraphicsQuality: (graphicsQuality) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('previs3d_graphics_quality', graphicsQuality);
      }
      set({ graphicsQuality });
    },
    setLanguage: (language) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('previs3d_language', language);
        document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
      }
      set({ language });
    },
    setSettingsModalOpen: (settingsModalOpen) => set({ settingsModalOpen }),
    setKeybinding: (action, combo) => {
      const current = get().keybindings;
      const next: KeybindingMap = { ...current };
      let conflictAction: KeyActionId | null = null;
      const normalized = combo.trim().toLowerCase();
      if (normalized) {
        for (const k of Object.keys(next) as KeyActionId[]) {
          if (k !== action && next[k].toLowerCase() === normalized) {
            conflictAction = k;
            next[k] = '';
          }
        }
      }
      next[action] = combo;
      saveKeybindings(next);
      set({ keybindings: next });
      return conflictAction;
    },
    resetKeybinding: (action) => {
      const defCombo = DEFAULT_KEYBINDINGS[action];
      const next: KeybindingMap = { ...get().keybindings };
      const normalized = defCombo.toLowerCase();
      for (const k of Object.keys(next) as KeyActionId[]) {
        if (k !== action && next[k].toLowerCase() === normalized) {
          next[k] = '';
        }
      }
      next[action] = defCombo;
      saveKeybindings(next);
      set({ keybindings: next });
    },
    resetAllKeybindings: () => {
      const next = { ...DEFAULT_KEYBINDINGS };
      saveKeybindings(next);
      set({ keybindings: next });
    },
    setIsTransforming: (isTransforming) => set({ isTransforming }),

    teleportToDistrict: (districtId) => {
      const world = get().getActiveProject().world;
      const dist = world.districts.find((d) => d.id === districtId);
      if (!dist) return;
      set({
        pendingDirectorCamera: {
          position: [...dist.cameraPos],
          target: [...dist.cameraTarget],
          nonce: Date.now() + Math.random(),
        },
      });
    },

    teleportToHeroCompound: () => {
      const world = get().getActiveProject().world;
      const hc = world.heroCompound;
      if (!hc) return;
      const [hx, hy, hz] = hc.position;
      set({
        selectedId: hc.id,
        pendingDirectorCamera: {
          position: [hx + 11, hy + 8.5, hz + 20],
          target: [hx, hy + 2.4, hz],
          nonce: Date.now() + Math.random(),
        },
      });
    },

    clearPendingDirectorCamera: () => set({ pendingDirectorCamera: null }),

    // History
    pushHistory: () => {
      const proj = get().getActiveProject();
      const snap = cloneSnapshot(proj);
      set((s) => ({
        past: [...s.past.slice(-(MAX_HISTORY - 1)), snap],
        future: [],
      }));
    },

    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return;
      const prev = past[past.length - 1];
      const currentSnap = cloneSnapshot(get().getActiveProject());
      mutateActiveProject((p) => ({
        ...p,
        world: prev.world,
        shots: prev.shots,
        activeShotId: prev.activeShotId,
      }));
      set({
        past: past.slice(0, -1),
        future: [currentSnap, ...future],
        selectedId: null,
      });
    },

    redo: () => {
      const { past, future } = get();
      if (future.length === 0) return;
      const nextSnap = future[0];
      const currentSnap = cloneSnapshot(get().getActiveProject());
      mutateActiveProject((p) => ({
        ...p,
        world: nextSnap.world,
        shots: nextSnap.shots,
        activeShotId: nextSnap.activeShotId,
      }));
      set({
        past: [...past, currentSnap],
        future: future.slice(1),
        selectedId: null,
      });
    },

    // World editing
    setTerrainBrush: (patch) =>
      set((s) => ({
        terrainBrush: { ...s.terrainBrush, ...patch },
        // Deselect gizmos & release any lingering transform lock when toggling brush mode
        ...(patch.active ? { selectedId: null, pendingPlacement: null } : {}),
        ...(patch.active !== undefined
          ? {
              isTransforming: false,
              terrainBrushOrbitHold: false,
              ...(patch.active ? {} : { terrainPointerOver: false }),
            }
          : {}),
      })),

    setPendingPlacement: (pendingPlacement) =>
      set((s) => ({
        pendingPlacement,
        terrainBrushOrbitHold: false,
        terrainPointerOver: false,
        ...(pendingPlacement
          ? {
              terrainBrush: { ...s.terrainBrush, active: false },
              isTransforming: false,
            }
          : {}),
      })),

    togglePendingPlacementContinuous: () =>
      set((s) =>
        s.pendingPlacement
          ? {
              pendingPlacement: {
                ...s.pendingPlacement,
                continuous: !s.pendingPlacement.continuous,
              },
            }
          : s
      ),

    setTerrainBrushOrbitHold: (terrainBrushOrbitHold) =>
      set((s) =>
        s.terrainBrushOrbitHold === terrainBrushOrbitHold
          ? s
          : { terrainBrushOrbitHold }
      ),

    setTerrainPointerOver: (terrainPointerOver) =>
      set((s) =>
        s.terrainPointerOver === terrainPointerOver
          ? s
          : { terrainPointerOver }
      ),

    toggleTerrainTemplateGenerateProps: () => {
      const next = !get().terrainTemplateGenerateProps;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('previs3d_terrain_tpl_props', next ? '1' : '0');
      }
      set({ terrainTemplateGenerateProps: next });
    },

    updateTerrainConfig: (patch) => {
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          terrain: { ...p.world.terrain, ...patch },
        },
      }));
    },
    setTerrainMapSize: (mapSize) => {
      const nextSize = clampMapSize(mapSize);
      const half = nextSize * 0.5;
      const padBound = Math.max(4, half - 2);
      get().pushHistory();
      const includeProps = get().terrainTemplateGenerateProps;
      mutateActiveProject((p) => {
        const nextTerrain: TerrainConfig = {
          ...p.world.terrain,
          mapSize: nextSize,
        };
        // Keep manually placed objects grounded and remove old auto-generated template props outside new bounds
        const keptAssets = p.world.assets.filter((a) => {
          if (!a.id.startsWith(TEMPLATE_PROP_ID_PREFIX)) return true;
          return (
            Math.abs(a.position[0]) <= padBound &&
            Math.abs(a.position[2]) <= padBound
          );
        });
        const { nextWorld } = regroundWorldState({
          ...p.world,
          terrain: nextTerrain,
          assets: keptAssets,
        });
        const hasTemplateProps = keptAssets.some((a) =>
          a.id.startsWith(TEMPLATE_PROP_ID_PREFIX)
        );
        const finalAssets =
          includeProps &&
          nextTerrain.theme !== 'flat_plain' &&
          nextTerrain.theme !== 'urban_flat' &&
          !hasTemplateProps
            ? [
                ...nextWorld.assets,
                ...buildTerrainTemplateProps(
                  nextTerrain.theme,
                  nextTerrain,
                  nextWorld.road
                ),
              ]
            : nextWorld.assets;
        return {
          ...p,
          world: {
            ...nextWorld,
            assets: finalAssets,
          },
        };
      });
      return nextSize;
    },
    applyTerrainTemplate: (theme, seedOverride) => {
      get().pushHistory();
      const defaults = TERRAIN_TEMPLATE_DEFAULTS[theme] ?? {
        relief: 0.7,
        hasWaterChannel: false,
      };
      const includeProps = get().terrainTemplateGenerateProps;
      let generatedCount = 0;
      mutateActiveProject((p) => {
        const nextTerrain: TerrainConfig = {
          ...p.world.terrain,
          theme,
          relief: defaults.relief,
          hasWaterChannel: defaults.hasWaterChannel,
          seed: seedOverride,
          sculptDeltas: undefined,
          paintMaterials: undefined,
        };
        const manualAssets = p.world.assets.filter(
          (a) => !a.id.startsWith(TEMPLATE_PROP_ID_PREFIX)
        );
        const { nextWorld } = regroundWorldState({
          ...p.world,
          terrain: nextTerrain,
          assets: manualAssets,
        });
        const generated = includeProps
          ? buildTerrainTemplateProps(theme, nextTerrain, nextWorld.road)
          : [];
        generatedCount = generated.length;
        return {
          ...p,
          world: {
            ...nextWorld,
            assets: [...nextWorld.assets, ...generated],
          },
        };
      });
      return generatedCount;
    },
    randomizeCurrentTerrain: () => {
      const proj = get().getActiveProject();
      const currentTheme = proj.world.terrain.theme;
      const prevSeed = proj.world.terrain.seed ?? 0;
      let nextSeed =
        (((Date.now() ^ Math.floor(Math.random() * 0xffffff)) >>> 0) % 899999) +
        100000;
      if (nextSeed === prevSeed) {
        nextSeed = ((nextSeed + 137) % 899999) + 100000;
      }
      const spawnedCount = get().applyTerrainTemplate(currentTheme, nextSeed);
      return { seed: nextSeed, spawnedCount };
    },
    generateWildcardTerrain: () => {
      const proj = get().getActiveProject();
      const prevSeed = proj.world.terrain.seed ?? 0;
      let nextSeed =
        (((Date.now() ^ Math.floor(Math.random() * 0xffffff)) >>> 0) % 899999) +
        100000;
      if (nextSeed === prevSeed) {
        nextSeed = ((nextSeed + 271) % 899999) + 100000;
      }
      const spawnedCount = get().applyTerrainTemplate('wildcard', nextSeed);
      return {
        seed: nextSeed,
        spawnedCount,
        summaryZh: describeWildcardSeed(nextSeed, 'zh'),
        summaryEn: describeWildcardSeed(nextSeed, 'en'),
      };
    },
    clearScene: () => {
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          terrain: {
            theme: 'flat_plain',
            relief: 0,
            hasWaterChannel: false,
            mapSize: p.world.terrain.mapSize,
            sculptGridRes: p.world.terrain.sculptGridRes ?? SCULPT_GRID_DEFAULT,
          },
          road: {
            pattern: 'none',
            width: 12,
          },
          districts: [],
          buildings: [],
          heroCompound: null,
          scatteredProps: [],
          assets: [],
          customModels: [],
          gltfModels: [],
          paintedRoads: [],
          paintedFences: [],
          characters: [],
        },
      }));
      set((s) => ({
        selectedId: null,
        pendingPlacement: null,
        removingAssetIds: {},
        terrainBrush: { ...s.terrainBrush, active: false },
      }));
    },
    updateRoadConfig: (patch) => {
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          road: { ...p.world.road, ...patch },
        },
      }));
    },

    commitTerrainSculpt: (sculptDeltas, sculptGridRes = SCULPT_GRID_DEFAULT, paintMaterials) => {
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          terrain: {
            ...p.world.terrain,
            sculptGridRes,
            sculptDeltas: sculptDeltas.length > 0 ? sculptDeltas : undefined,
            paintMaterials:
              paintMaterials === undefined
                ? p.world.terrain.paintMaterials
                : paintMaterials.length > 0
                ? paintMaterials
                : undefined,
          },
        },
      }));
    },

    resetTerrainSculpt: () => {
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          terrain: {
            ...p.world.terrain,
            sculptDeltas: undefined,
            paintMaterials: undefined,
          },
        },
      }));
    },

    regroundWorldToTerrain: () => {
      get().pushHistory();
      let totalUpdated = 0;
      mutateActiveProject((p) => {
        const { nextWorld, updatedCount } = regroundWorldState(p.world);
        totalUpdated = updatedCount;
        return {
          ...p,
          world: nextWorld,
        };
      });
      return totalUpdated;
    },

    updateEnvironment: (patch) => {
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          environment: { ...p.world.environment, ...patch },
        },
      }));
    },

    addAsset: (type, position, variantId) => {
      get().pushHistory();
      const proj = get().getActiveProject();
      const meta = PROP_CATALOG.find((c) => c.type === type);
      const count = proj.world.assets.length + 1;
      const id = makeId('asset');
      const mapBound = Math.max(4, getTerrainHalf(proj.world.terrain) - 0.5);
      const rawPx = position ? position[0] : 0;
      const rawPz = position ? position[2] : 8;
      const px = Math.max(-mapBound, Math.min(mapBound, rawPx));
      const pz = Math.max(-mapBound, Math.min(mapBound, rawPz));
      const groundY = getGroundY(px, pz, proj.world.terrain, proj.world.road);
      const finalPos: Vec3 = position
        ? [Number(px.toFixed(2)), position[1], Number(pz.toFixed(2))]
        : [px, type === 'floor' ? groundY - 0.15 : groundY, pz];
      const inventory = getInventoryForPropType(type);
      const resolvedVariantId = variantId ?? inventory[0]?.id;
      const newAsset: SceneAsset = {
        id,
        kind: 'asset',
        type,
        variantId: resolvedVariantId,
        name: `${meta?.label.split(' ')[0] ?? type} ${count}`,
        position: finalPos,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        locked: false,
      };
      mutateActiveProject((p) => ({
        ...p,
        world: { ...p.world, assets: [...p.world.assets, newAsset] },
      }));
      set({ selectedId: id });
      return id;
    },

    addPaintedRoad: (style, width, rawPoints, label) => {
      if (rawPoints.length < 2) return '';
      get().pushHistory();
      const proj = get().getActiveProject();
      const mapBound = Math.max(4, getTerrainHalf(proj.world.terrain) - 0.5);
      const clampedPoints: Vec3[] = rawPoints.map((pt) => [
        Math.max(-mapBound, Math.min(mapBound, pt[0])),
        pt[1],
        Math.max(-mapBound, Math.min(mapBound, pt[2])),
      ]);
      const simplified = simplifyAndSmoothStroke(clampedPoints, 1.5);
      const lift = style === 'viaduct' ? 4.8 : 0;
      const grounded = groundPolylinePoints(
        simplified,
        proj.world.terrain,
        proj.world.road,
        lift
      );
      const existing = proj.world.paintedRoads ?? [];
      const id = makeId('roadstroke');
      const preset = getRoadBrushPreset(style);
      const nextItem: PaintedRoadPath = {
        id,
        name: `${label || preset.label} ${existing.length + 1}`,
        style,
        width: Math.max(2, Math.min(24, Number(width.toFixed(1)))),
        points: grounded,
      };
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          paintedRoads: [...(p.world.paintedRoads ?? []), nextItem],
        },
      }));
      set({ selectedId: id });
      return id;
    },

    addPaintedFence: (propType, variantId, rawPoints, label) => {
      if (rawPoints.length < 2) return '';
      get().pushHistory();
      const proj = get().getActiveProject();
      const mapBound = Math.max(4, getTerrainHalf(proj.world.terrain) - 0.5);
      const clampedPoints: Vec3[] = rawPoints.map((pt) => [
        Math.max(-mapBound, Math.min(mapBound, pt[0])),
        pt[1],
        Math.max(-mapBound, Math.min(mapBound, pt[2])),
      ]);
      const simplified = simplifyAndSmoothStroke(clampedPoints, 1.2);
      const grounded = groundPolylinePoints(
        simplified,
        proj.world.terrain,
        proj.world.road,
        0
      );
      const existing = proj.world.paintedFences ?? [];
      const id = makeId('fencestroke');
      const nextItem: PaintedFencePath = {
        id,
        name: `${label || variantId} ${existing.length + 1}`,
        propType,
        variantId,
        points: grounded,
      };
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          paintedFences: [...(p.world.paintedFences ?? []), nextItem],
        },
      }));
      set({ selectedId: id });
      return id;
    },

    deletePaintedStroke: (id) => {
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          paintedRoads: (p.world.paintedRoads ?? []).filter((r) => r.id !== id),
          paintedFences: (p.world.paintedFences ?? []).filter((f) => f.id !== id),
        },
      }));
      if (get().selectedId === id) {
        set({ selectedId: null });
      }
    },

    scatterTreesInRadius: (
      center,
      radius,
      density,
      variantId,
      mixGroupVariants = true,
      recordHistory = true
    ) => {
      return scatterNaturePropInRadius({
        propType: 'tree',
        defaultFallbackVarId: 'oak_round',
        defaultGroupName: '乔木',
        maxDensity: 24,
        spacingFactor: 0.22,
        spacingMin: 1.8,
        spacingMax: 3.4,
        scaleMin: 0.84,
        scaleSpan: 0.34,
        center,
        radius,
        density,
        variantId,
        mixGroupVariants,
        recordHistory,
      });
    },

    scatterRocksInRadius: (
      center,
      radius,
      density,
      variantId,
      mixGroupVariants = true,
      recordHistory = true
    ) => {
      return scatterNaturePropInRadius({
        propType: 'rock',
        defaultFallbackVarId: 'boulder_cluster',
        defaultGroupName: '岩石',
        maxDensity: 28,
        spacingFactor: 0.16,
        spacingMin: 1.2,
        spacingMax: 2.6,
        scaleMin: 0.68,
        scaleSpan: 0.65,
        center,
        radius,
        density,
        variantId,
        mixGroupVariants,
        recordHistory,
      });
    },

    eraseObjectsInRadius: (
      center,
      radius,
      filter = 'all',
      recordHistory = false
    ) => {
      const [cx, , cz] = center;
      const r = Math.max(1, radius);
      const proj = get().getActiveProject();
      const w = proj.world;

      const distToPolyline = (pts: Vec3[]): number => {
        let best = Infinity;
        for (let i = 0; i < pts.length; i++) {
          const dPt = Math.hypot(pts[i][0] - cx, pts[i][2] - cz);
          if (dPt < best) best = dPt;
          if (i > 0) {
            const ax = pts[i - 1][0];
            const az = pts[i - 1][2];
            const bx = pts[i][0];
            const bz = pts[i][2];
            const dx = bx - ax;
            const dz = bz - az;
            const lenSq = dx * dx + dz * dz;
            const t =
              lenSq > 1e-5
                ? Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / lenSq))
                : 0;
            const px = ax + t * dx;
            const pz = az + t * dz;
            const dSeg = Math.hypot(px - cx, pz - cz);
            if (dSeg < best) best = dSeg;
          }
        }
        return best;
      };

      const removedIds = new Set<string>();

      const nextAssets = w.assets.filter((a) => {
        if (a.locked) return true;
        if (filter === 'paths') return true;
        if (filter === 'tree' && a.type !== 'tree') return true;
        const inRange = Math.hypot(a.position[0] - cx, a.position[2] - cz) <= r;
        if (inRange) {
          removedIds.add(a.id);
          return false;
        }
        return true;
      });

      const nextScattered = w.scatteredProps.filter((sp) => {
        if (filter === 'paths') return true;
        if (filter === 'tree' && sp.type !== 'tree') return true;
        const inRange = Math.hypot(sp.position[0] - cx, sp.position[2] - cz) <= r;
        if (inRange) {
          removedIds.add(sp.id);
          return false;
        }
        return true;
      });

      const nextCharacters =
        filter === 'all'
          ? w.characters.filter((c) => {
              if (c.locked) return true;
              const inRange = Math.hypot(c.position[0] - cx, c.position[2] - cz) <= r;
              if (inRange) {
                removedIds.add(c.id);
                return false;
              }
              return true;
            })
          : w.characters;

      const nextCustomModels =
        filter === 'all' || filter === 'props'
          ? (w.customModels ?? []).filter((cm) => {
              if (cm.locked) return true;
              const inRange = Math.hypot(cm.position[0] - cx, cm.position[2] - cz) <= r;
              if (inRange) {
                removedIds.add(cm.id);
                return false;
              }
              return true;
            })
          : w.customModels ?? [];

      const nextGltfModels =
        filter === 'all' || filter === 'props'
          ? (w.gltfModels ?? []).filter((gm) => {
              if (gm.locked) return true;
              const inRange = Math.hypot(gm.position[0] - cx, gm.position[2] - cz) <= r;
              if (inRange) {
                removedIds.add(gm.id);
                return false;
              }
              return true;
            })
          : w.gltfModels ?? [];

      const nextBuildings =
        filter === 'all'
          ? w.buildings.filter((b) => {
              const hitR = r + Math.max(b.width, b.depth) * 0.35;
              const inRange = Math.hypot(b.position[0] - cx, b.position[2] - cz) <= hitR;
              if (inRange) {
                removedIds.add(b.id);
                return false;
              }
              return true;
            })
          : w.buildings;

      const nextPaintedRoads =
        filter === 'all' || filter === 'paths'
          ? (w.paintedRoads ?? []).filter((pr) => {
              const inRange = distToPolyline(pr.points) <= r + pr.width * 0.45;
              if (inRange) {
                removedIds.add(pr.id);
                return false;
              }
              return true;
            })
          : w.paintedRoads ?? [];

      const nextPaintedFences =
        filter === 'all' || filter === 'paths'
          ? (w.paintedFences ?? []).filter((pf) => {
              const inRange = distToPolyline(pf.points) <= r + 1.0;
              if (inRange) {
                removedIds.add(pf.id);
                return false;
              }
              return true;
            })
          : w.paintedFences ?? [];

      if (removedIds.size === 0) return 0;

      if (recordHistory) {
        get().pushHistory();
      }

      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          assets: nextAssets,
          scatteredProps: nextScattered,
          characters: nextCharacters,
          customModels: nextCustomModels,
          gltfModels: nextGltfModels,
          buildings: nextBuildings,
          paintedRoads: nextPaintedRoads,
          paintedFences: nextPaintedFences,
        },
      }));

      const curSel = get().selectedId;
      if (curSel && removedIds.has(curSel)) {
        set({ selectedId: null });
      }
      return removedIds.size;
    },

    updateObjectVariant: (id, patch) => {
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          assets: p.world.assets.map((a) => {
            if (a.id !== id) return a;
            return {
              ...a,
              variantId: patch.variantId ?? a.variantId,
              tintColor: patch.resetTint
                ? undefined
                : patch.tintColor !== undefined
                ? patch.tintColor
                : a.tintColor,
            };
          }),
          buildings: p.world.buildings.map((b) => {
            if (b.id !== id) return b;
            return {
              ...b,
              style: patch.style ?? b.style,
              variantId: patch.variantId ?? b.variantId,
              floors:
                patch.floors !== undefined
                  ? Math.max(1, Math.min(20, Math.round(patch.floors)))
                  : b.floors,
              tintColor: patch.resetTint
                ? undefined
                : patch.tintColor !== undefined
                ? patch.tintColor
                : b.tintColor,
            };
          }),
          characters: p.world.characters.map((c) => {
            if (c.id !== id) return c;
            return {
              ...c,
              variantId: patch.variantId ?? c.variantId,
              tintColor: patch.resetTint
                ? undefined
                : patch.tintColor !== undefined
                ? patch.tintColor
                : c.tintColor,
            };
          }),
        },
      }));
    },

    cycleObjectVariant: (id) => {
      const proj = get().getActiveProject();
      const asset = proj.world.assets.find((a) => a.id === id);
      if (asset) {
        const nextVar = getNextVariantId(asset.type, asset.variantId);
        get().updateObjectVariant(id, { variantId: nextVar });
        return;
      }
      const building = proj.world.buildings.find((b) => b.id === id);
      if (building) {
        const nextStyle = getNextBuildingStyle(building.style);
        get().updateObjectVariant(id, { style: nextStyle, variantId: nextStyle });
        return;
      }
      const char = proj.world.characters.find((c) => c.id === id);
      if (char) {
        const nextCharVar = getNextCharacterVariantId(char.variantId);
        get().updateObjectVariant(id, { variantId: nextCharVar });
      }
    },

    duplicateInPlaceAt: (id, snapshot, recordHistory = false) => {
      if (!id || id === SHOT_CAMERA_ID || id === SHOT_TARGET_ID) {
        return null;
      }
      const proj = get().getActiveProject();
      const formatCopyName = (rawName: string, existingNames: Set<string>) => {
        const isEn = get().language === 'en';
        const suffix = isEn ? 'Copy' : '副本';
        const base = rawName.replace(/\s*(?:副本|Copy)(\s*\d+)?$/, '').trim() || rawName;
        let candidate = `${base} ${suffix}`;
        let n = 2;
        while (existingNames.has(candidate)) {
          candidate = `${base} ${suffix} ${n}`;
          n += 1;
        }
        return candidate;
      };

      const asset = proj.world.assets.find((a) => a.id === id);
      if (asset) {
        if (recordHistory) get().pushHistory();
        const newId = makeId('asset');
        const names = new Set(proj.world.assets.map((a) => a.name));
        const clone: SceneAsset = {
          ...asset,
          id: newId,
          name: formatCopyName(asset.name, names),
          position: snapshot?.position ? [...snapshot.position] : [...asset.position],
          rotation: snapshot?.rotation ? [...snapshot.rotation] : [...asset.rotation],
          scale: snapshot?.scale ? [...snapshot.scale] : [...asset.scale],
          animation: asset.animation ? { ...asset.animation } : undefined,
        };
        mutateActiveProject((p) => ({
          ...p,
          world: { ...p.world, assets: [...p.world.assets, clone] },
        }));
        return newId;
      }

      const building = proj.world.buildings.find((b) => b.id === id);
      if (building) {
        if (recordHistory) get().pushHistory();
        const newId = makeId('bldg');
        const names = new Set(proj.world.buildings.map((b) => b.name));
        const clone: BuildingSpec = {
          ...building,
          id: newId,
          name: formatCopyName(building.name, names),
          position: snapshot?.position ? [...snapshot.position] : [...building.position],
          rotationY: snapshot?.rotation ? snapshot.rotation[1] : building.rotationY,
          animation: building.animation ? { ...building.animation } : undefined,
        };
        mutateActiveProject((p) => ({
          ...p,
          world: { ...p.world, buildings: [...p.world.buildings, clone] },
        }));
        return newId;
      }

      const char = proj.world.characters.find((c) => c.id === id);
      if (char) {
        if (recordHistory) get().pushHistory();
        const newId = makeId('char');
        const names = new Set(proj.world.characters.map((c) => c.name));
        const clone: CharacterActor = {
          ...char,
          id: newId,
          name: formatCopyName(char.name, names),
          position: snapshot?.position ? [...snapshot.position] : [...char.position],
          rotation: snapshot?.rotation ? [...snapshot.rotation] : [...char.rotation],
          scale: snapshot?.scale ? [...snapshot.scale] : [...char.scale],
          joints: cloneJoints(char.joints),
        };
        mutateActiveProject((p) => ({
          ...p,
          world: { ...p.world, characters: [...p.world.characters, clone] },
        }));
        return newId;
      }

      const customModel = (proj.world.customModels ?? []).find((cm) => cm.id === id);
      if (customModel) {
        if (recordHistory) get().pushHistory();
        const newId = makeId('cmodel');
        const names = new Set((proj.world.customModels ?? []).map((cm) => cm.name));
        const clone: typeof customModel = {
          ...customModel,
          id: newId,
          name: formatCopyName(customModel.name, names),
          position: (snapshot?.position ? [...snapshot.position] : [...customModel.position]) as Vec3,
          rotation: (snapshot?.rotation ? [...snapshot.rotation] : [...customModel.rotation]) as Vec3,
          scale: (snapshot?.scale ? [...snapshot.scale] : [...customModel.scale]) as Vec3,
          parts: customModel.parts.map((pt) => ({
            ...pt,
            position: [...pt.position] as Vec3,
            rotation: [...pt.rotation] as Vec3,
            size: [...pt.size] as Vec3,
          })),
          animation: customModel.animation ? { ...customModel.animation } : undefined,
        };
        mutateActiveProject((p) => ({
          ...p,
          world: {
            ...p.world,
            customModels: [...(p.world.customModels ?? []), clone],
          },
        }));
        return newId;
      }

      const gltfModel = (proj.world.gltfModels ?? []).find((gm) => gm.id === id);
      if (gltfModel) {
        if (recordHistory) get().pushHistory();
        const newId = makeId('gltf');
        const names = new Set((proj.world.gltfModels ?? []).map((gm) => gm.name));
        const clone: GltfModelAsset = {
          ...gltfModel,
          id: newId,
          name: formatCopyName(gltfModel.name, names),
          position: snapshot?.position ? [...snapshot.position] : [...gltfModel.position],
          rotation: snapshot?.rotation ? [...snapshot.rotation] : [...gltfModel.rotation],
          scale: snapshot?.scale ? [...snapshot.scale] : [...gltfModel.scale],
          animation: gltfModel.animation ? { ...gltfModel.animation } : undefined,
        };
        mutateActiveProject((p) => ({
          ...p,
          world: {
            ...p.world,
            gltfModels: [...(p.world.gltfModels ?? []), clone],
          },
        }));
        return newId;
      }

      return null;
    },

    duplicateSelected: () => {
      const { selectedId } = get();
      if (!selectedId || selectedId === SHOT_CAMERA_ID || selectedId === SHOT_TARGET_ID) {
        return null;
      }
      const proj = get().getActiveProject();
      const asset = proj.world.assets.find((a) => a.id === selectedId);
      if (asset) {
        const nx = asset.position[0] + 2.2;
        const nz = asset.position[2] + 1.4;
        const ny = getGroundY(nx, nz, proj.world.terrain, proj.world.road);
        const newId = get().duplicateInPlaceAt(
          selectedId,
          { position: [nx, asset.type === 'floor' ? ny - 0.15 : ny, nz] },
          true
        );
        if (newId) set({ selectedId: newId });
        return newId;
      }
      const building = proj.world.buildings.find((b) => b.id === selectedId);
      if (building) {
        const nx = building.position[0] + building.width + 2.5;
        const nz = building.position[2] + 1.5;
        const ny = getGroundY(nx, nz, proj.world.terrain, proj.world.road);
        const newId = get().duplicateInPlaceAt(
          selectedId,
          { position: [nx, ny, nz] },
          true
        );
        if (newId) set({ selectedId: newId });
        return newId;
      }
      const char = proj.world.characters.find((c) => c.id === selectedId);
      if (char) {
        const nx = char.position[0] + 1.6;
        const nz = char.position[2] + 1.2;
        const ny = getGroundY(nx, nz, proj.world.terrain, proj.world.road);
        const newId = get().duplicateInPlaceAt(
          selectedId,
          { position: [nx, ny, nz] },
          true
        );
        if (newId) set({ selectedId: newId });
        return newId;
      }
      const custom = (proj.world.customModels ?? []).find((cm) => cm.id === selectedId);
      if (custom) {
        const nx = custom.position[0] + 2.4;
        const nz = custom.position[2] + 1.4;
        const ny = getGroundY(nx, nz, proj.world.terrain, proj.world.road);
        const newId = get().duplicateInPlaceAt(selectedId, { position: [nx, ny, nz] }, true);
        if (newId) set({ selectedId: newId });
        return newId;
      }
      const gltf = (proj.world.gltfModels ?? []).find((gm) => gm.id === selectedId);
      if (gltf) {
        const nx = gltf.position[0] + 2.4;
        const nz = gltf.position[2] + 1.4;
        const ny = getGroundY(nx, nz, proj.world.terrain, proj.world.road);
        const newId = get().duplicateInPlaceAt(selectedId, { position: [nx, ny, nz] }, true);
        if (newId) set({ selectedId: newId });
        return newId;
      }
      return null;
    },

    focusSelected: () => {
      const { selectedId } = get();
      if (!selectedId) return;
      const proj = get().getActiveProject();
      const asset = proj.world.assets.find((a) => a.id === selectedId);
      const building = proj.world.buildings.find((b) => b.id === selectedId);
      const char = proj.world.characters.find((c) => c.id === selectedId);
      const custom = (proj.world.customModels ?? []).find((m) => m.id === selectedId);
      const gltf = (proj.world.gltfModels ?? []).find((m) => m.id === selectedId);
      const hero =
        proj.world.heroCompound?.id === selectedId ? proj.world.heroCompound : undefined;

      const targetObj = asset ?? building ?? char ?? custom ?? gltf ?? hero;
      if (!targetObj) return;
      const p = targetObj.position;
      const dist = building ? Math.max(12, building.floors * 3.5) : hero ? 18 : 7.5;
      const targetY = building ? building.floors * 1.4 : hero ? 2.5 : 1.5;
      set({
        pendingDirectorCamera: {
          position: [p[0] + dist * 0.72, p[1] + dist * 0.48, p[2] + dist * 0.85],
          target: [p[0], p[1] + targetY, p[2]],
          nonce: Date.now(),
        },
      });
    },

    promoteScatteredProp: (scatteredId) => {
      const proj = get().getActiveProject();
      const sc = proj.world.scatteredProps.find((sp) => sp.id === scatteredId);
      if (!sc) return null;
      const typeMap: Record<ScatteredPropType, { propType: PropType; defaultVar?: string }> = {
        tree: { propType: 'tree', defaultVar: 'round_crown' },
        bush: { propType: 'tree', defaultVar: 'shrub_cluster' },
        car: { propType: 'vehicle', defaultVar: 'sedan' },
        lamp: { propType: 'lamp', defaultVar: 'single_arm' },
        barrier: { propType: 'barrier', defaultVar: 'jersey' },
        cargo_stack: { propType: 'crate', defaultVar: 'pallet_stack' },
        rock: { propType: 'rock', defaultVar: 'boulder_cluster' },
      };
      const mapped = typeMap[sc.type];
      const meta = PROP_CATALOG.find((c) => c.type === mapped.propType);
      const count = proj.world.assets.length + 1;
      const id = makeId('asset');
      const promoted: SceneAsset = {
        id,
        kind: 'asset',
        type: mapped.propType,
        variantId: sc.variantId ?? mapped.defaultVar,
        name: `${meta?.label.split(' ')[0] ?? mapped.propType} ${count}`,
        position: [...sc.position],
        rotation: [0, sc.rotationY, 0],
        scale: [sc.scale, sc.scale, sc.scale],
        visible: true,
        locked: false,
      };
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          scatteredProps: p.world.scatteredProps.filter((sp) => sp.id !== scatteredId),
          assets: [...p.world.assets, promoted],
        },
      }));
      set({ selectedId: id });
      return id;
    },

    addGltfModel: (glbDataUrl, name, sourceLabel, position) => {
      get().pushHistory();
      const proj = get().getActiveProject();
      const id = makeId('gltf');
      const [px, pz] = position ? [position[0], position[2]] : [0, 8];
      const groundY = getGroundY(px, pz, proj.world.terrain, proj.world.road);
      const finalPos: Vec3 = position ?? [px, groundY, pz];
      const newModel: GltfModelAsset = {
        id,
        kind: 'gltf_model',
        name:
          name ||
          (get().language === 'en'
            ? `3D Previs Model ${(proj.world.gltfModels?.length ?? 0) + 1}`
            : `3D 白模 ${(proj.world.gltfModels?.length ?? 0) + 1}`),
        glbDataUrl,
        position: finalPos,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        locked: false,
        sourceLabel,
      };
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          gltfModels: [...(p.world.gltfModels ?? []), newModel],
        },
      }));
      set({
        selectedId: id,
        pendingDirectorCamera: {
          position: [finalPos[0] + 4.5, finalPos[1] + 2.8, finalPos[2] + 5.2],
          target: [finalPos[0], finalPos[1] + 1.0, finalPos[2]],
          nonce: Date.now(),
        },
      });
      return id;
    },

    addCharacter: (pose = 'idle', position, variantId) => {
      get().pushHistory();
      const proj = get().getActiveProject();
      const count = proj.world.characters.length + 1;
      const id = makeId('char');
      const preset = POSE_PRESETS[pose];
      const mapBound = Math.max(4, getTerrainHalf(proj.world.terrain) - 0.5);
      const rawPx = position ? position[0] : 0;
      const rawPz = position ? position[2] : 10;
      const px = Math.max(-mapBound, Math.min(mapBound, rawPx));
      const pz = Math.max(-mapBound, Math.min(mapBound, rawPz));
      const groundY = getGroundY(px, pz, proj.world.terrain, proj.world.road);
      const finalPos: Vec3 = position
        ? [Number(px.toFixed(2)), position[1], Number(pz.toFixed(2))]
        : [px, groundY, pz];
      const newChar: CharacterActor = {
        id,
        kind: 'character',
        name: get().language === 'en' ? `Mannequin ${count}` : `木偶人 ${count}`,
        variantId: variantId ?? 'standard',
        position: finalPos,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        pose,
        pelvisOffsetY: preset.pelvisOffsetY,
        joints: cloneJoints(preset.joints),
        visible: true,
        locked: false,
      };
      mutateActiveProject((p) => ({
        ...p,
        world: { ...p.world, characters: [...p.world.characters, newChar] },
      }));
      set({ selectedId: id });
      return id;
    },

    updateObjectTransform: (id, patch, recordHistory = false) => {
      if (recordHistory) get().pushHistory();
      const { currentTime, autoKeyCharacter } = get();
      mutateActiveProject((p) => {
        const mapBound = Math.max(4, getTerrainHalf(p.world.terrain) - 0.5);
        const clampedPatch = patch.position
          ? {
              ...patch,
              position: [
                Number(Math.max(-mapBound, Math.min(mapBound, patch.position[0])).toFixed(2)),
                patch.position[1],
                Number(Math.max(-mapBound, Math.min(mapBound, patch.position[2])).toFixed(2)),
              ] as Vec3,
            }
          : patch;
        const targetChar = p.world.characters.find((c) => c.id === id);
        const isSpatialPatch = Boolean(clampedPatch.position || clampedPatch.rotation);
        const { nextShots, handledByTrack } = isSpatialPatch
          ? upsertAnimatedCharacterInShots(
              p.shots,
              p.activeShotId,
              targetChar,
              currentTime,
              autoKeyCharacter,
              (ev) => ({
                position: clampedPatch.position ?? ev.position,
                rotation: clampedPatch.rotation ?? ev.rotation,
              })
            )
          : { nextShots: p.shots, handledByTrack: false };

        return {
          ...p,
          shots: nextShots,
          world: {
            ...p.world,
            assets: p.world.assets.map((a) => (a.id === id ? { ...a, ...clampedPatch } : a)),
            customModels: (p.world.customModels ?? []).map((cm) =>
              cm.id === id ? { ...cm, ...clampedPatch } : cm
            ),
            gltfModels: (p.world.gltfModels ?? []).map((gm) =>
              gm.id === id ? { ...gm, ...clampedPatch } : gm
            ),
            characters: p.world.characters.map((c) => {
              if (c.id !== id) return c;
              if (handledByTrack && currentTime >= 0.08) {
                return clampedPatch.name ? { ...c, name: clampedPatch.name } : c;
              }
              return { ...c, ...clampedPatch };
            }),
            buildings: p.world.buildings.map((b) =>
              b.id === id
                ? {
                    ...b,
                    position: clampedPatch.position ?? b.position,
                    rotationY: clampedPatch.rotation ? clampedPatch.rotation[1] : b.rotationY,
                    name: clampedPatch.name ?? b.name,
                  }
                : b
            ),
            heroCompound:
              p.world.heroCompound && p.world.heroCompound.id === id
                ? {
                    ...p.world.heroCompound,
                    position: clampedPatch.position ?? p.world.heroCompound.position,
                    rotationY: clampedPatch.rotation
                      ? clampedPatch.rotation[1]
                      : p.world.heroCompound.rotationY,
                    name: clampedPatch.name ?? p.world.heroCompound.name,
                  }
                : p.world.heroCompound,
            paintedRoads: clampedPatch.name
              ? (p.world.paintedRoads ?? []).map((pr) =>
                  pr.id === id ? { ...pr, name: clampedPatch.name! } : pr
                )
              : p.world.paintedRoads,
            paintedFences: clampedPatch.name
              ? (p.world.paintedFences ?? []).map((pf) =>
                  pf.id === id ? { ...pf, name: clampedPatch.name! } : pf
                )
              : p.world.paintedFences,
          },
        };
      });
    },

    renameObject: (id, rawName) => {
      const nextName = rawName.trim();
      if (!nextName) return;
      const proj = get().getActiveProject();
      const w = proj.world;
      const currentName =
        w.assets.find((a) => a.id === id)?.name ??
        (w.customModels ?? []).find((cm) => cm.id === id)?.name ??
        (w.gltfModels ?? []).find((gm) => gm.id === id)?.name ??
        w.characters.find((c) => c.id === id)?.name ??
        w.buildings.find((b) => b.id === id)?.name ??
        (w.heroCompound?.id === id ? w.heroCompound.name : undefined) ??
        (w.paintedRoads ?? []).find((pr) => pr.id === id)?.name ??
        (w.paintedFences ?? []).find((pf) => pf.id === id)?.name;
      if (currentName === undefined || currentName === nextName) return;
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          assets: p.world.assets.map((a) =>
            a.id === id ? { ...a, name: nextName } : a
          ),
          customModels: (p.world.customModels ?? []).map((cm) =>
            cm.id === id ? { ...cm, name: nextName } : cm
          ),
          gltfModels: (p.world.gltfModels ?? []).map((gm) =>
            gm.id === id ? { ...gm, name: nextName } : gm
          ),
          characters: p.world.characters.map((c) =>
            c.id === id ? { ...c, name: nextName } : c
          ),
          buildings: p.world.buildings.map((b) =>
            b.id === id ? { ...b, name: nextName } : b
          ),
          heroCompound:
            p.world.heroCompound && p.world.heroCompound.id === id
              ? { ...p.world.heroCompound, name: nextName }
              : p.world.heroCompound,
          paintedRoads: (p.world.paintedRoads ?? []).map((pr) =>
            pr.id === id ? { ...pr, name: nextName } : pr
          ),
          paintedFences: (p.world.paintedFences ?? []).map((pf) =>
            pf.id === id ? { ...pf, name: nextName } : pf
          ),
        },
      }));
    },

    setObjectAnimation: (id, animation) => {
      const normalized =
        animation && animation.preset !== 'none' ? animation : undefined;
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          assets: p.world.assets.map((a) =>
            a.id === id ? { ...a, animation: normalized } : a
          ),
          customModels: (p.world.customModels ?? []).map((cm) =>
            cm.id === id ? { ...cm, animation: normalized } : cm
          ),
          gltfModels: (p.world.gltfModels ?? []).map((gm) =>
            gm.id === id ? { ...gm, animation: normalized } : gm
          ),
          buildings: p.world.buildings.map((b) =>
            b.id === id ? { ...b, animation: normalized } : b
          ),
          heroCompound:
            p.world.heroCompound && p.world.heroCompound.id === id
              ? { ...p.world.heroCompound, animation: normalized }
              : p.world.heroCompound,
        },
      }));
    },

    toggleVisibility: (id) => {
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          assets: p.world.assets.map((a) =>
            a.id === id ? { ...a, visible: !a.visible } : a
          ),
          customModels: (p.world.customModels ?? []).map((cm) =>
            cm.id === id ? { ...cm, visible: !cm.visible } : cm
          ),
          gltfModels: (p.world.gltfModels ?? []).map((gm) =>
            gm.id === id ? { ...gm, visible: !gm.visible } : gm
          ),
          characters: p.world.characters.map((c) =>
            c.id === id ? { ...c, visible: !c.visible } : c
          ),
          buildings: p.world.buildings.map((b) =>
            b.id === id ? { ...b, visible: !b.visible } : b
          ),
          heroCompound:
            p.world.heroCompound && p.world.heroCompound.id === id
              ? { ...p.world.heroCompound, visible: !p.world.heroCompound.visible }
              : p.world.heroCompound,
        },
      }));
    },

    toggleLock: (id) => {
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          assets: p.world.assets.map((a) =>
            a.id === id ? { ...a, locked: !a.locked } : a
          ),
          customModels: (p.world.customModels ?? []).map((cm) =>
            cm.id === id ? { ...cm, locked: !cm.locked } : cm
          ),
          gltfModels: (p.world.gltfModels ?? []).map((gm) =>
            gm.id === id ? { ...gm, locked: !gm.locked } : gm
          ),
          characters: p.world.characters.map((c) =>
            c.id === id ? { ...c, locked: !c.locked } : c
          ),
          buildings: p.world.buildings.map((b) =>
            b.id === id ? { ...b, locked: !b.locked } : b
          ),
          heroCompound:
            p.world.heroCompound && p.world.heroCompound.id === id
              ? { ...p.world.heroCompound, locked: !p.world.heroCompound.locked }
              : p.world.heroCompound,
        },
      }));
      if (get().selectedId === id) {
        set({ selectedId: null });
      }
    },

    updateCharacterPose: (id, pose) => {
      get().pushHistory();
      const preset = POSE_PRESETS[pose];
      const { currentTime, autoKeyCharacter } = get();
      mutateActiveProject((p) => {
        const targetChar = p.world.characters.find((c) => c.id === id);
        const { nextShots, handledByTrack } = upsertAnimatedCharacterInShots(
          p.shots,
          p.activeShotId,
          targetChar,
          currentTime,
          autoKeyCharacter,
          () => ({
            pose,
            pelvisOffsetY: preset.pelvisOffsetY,
            joints: cloneJoints(preset.joints),
          })
        );

        return {
          ...p,
          shots: nextShots,
          world: {
            ...p.world,
            characters: p.world.characters.map((c) => {
              if (c.id !== id) return c;
              if (handledByTrack && currentTime >= 0.08) return c;
              return {
                ...c,
                pose,
                pelvisOffsetY: preset.pelvisOffsetY,
                joints: cloneJoints(preset.joints),
              };
            }),
          },
        };
      });
    },

    updateCharacterJoint: (id, joint, value) => {
      const { currentTime, autoKeyCharacter } = get();
      mutateActiveProject((p) => {
        const targetChar = p.world.characters.find((c) => c.id === id);
        const { nextShots, handledByTrack } = upsertAnimatedCharacterInShots(
          p.shots,
          p.activeShotId,
          targetChar,
          currentTime,
          autoKeyCharacter,
          (ev) => ({
            joints: { ...cloneJoints(ev.joints), [joint]: value },
          })
        );

        return {
          ...p,
          shots: nextShots,
          world: {
            ...p.world,
            characters: p.world.characters.map((c) => {
              if (c.id !== id) return c;
              if (handledByTrack && currentTime >= 0.08) return c;
              return { ...c, joints: { ...c.joints, [joint]: value } };
            }),
          },
        };
      });
    },

    deleteSelected: () => {
      const { selectedId } = get();
      if (!selectedId || selectedId === SHOT_CAMERA_ID || selectedId === SHOT_TARGET_ID) return;
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world: {
          ...p.world,
          assets: p.world.assets.filter((a) => a.id !== selectedId),
          customModels: (p.world.customModels ?? []).filter((cm) => cm.id !== selectedId),
          gltfModels: (p.world.gltfModels ?? []).filter((gm) => gm.id !== selectedId),
          paintedRoads: (p.world.paintedRoads ?? []).filter((r) => r.id !== selectedId),
          paintedFences: (p.world.paintedFences ?? []).filter((f) => f.id !== selectedId),
          characters: p.world.characters.filter((c) => c.id !== selectedId),
          buildings: p.world.buildings.filter((b) => b.id !== selectedId),
          heroCompound:
            p.world.heroCompound?.id === selectedId ? null : p.world.heroCompound,
        },
      }));
      set({ selectedId: null });
    },

    applyAIScene: (world, shots, focusCenter, preserveCamera = false) => {
      get().pushHistory();
      mutateActiveProject((p) => ({
        ...p,
        world,
        shots: shots.length > 0 ? shots : p.shots,
        activeShotId: shots.length > 0 ? shots[0].id : p.activeShotId,
      }));
      if (preserveCamera) {
        set({ selectedId: null });
        return;
      }
      const firstShot = shots[0];
      const firstKf = firstShot?.keyframes[0];
      const targetPos: Vec3 | null = focusCenter
        ? [focusCenter[0] + 13, focusCenter[1] + 10, focusCenter[2] + 20]
        : firstKf
        ? [
            firstKf.position[0] + 10,
            firstKf.position[1] + 9,
            firstKf.position[2] + 16,
          ]
        : null;
      const targetLook: Vec3 | null = focusCenter ?? (firstKf ? [...firstKf.target] : null);
      set({
        selectedId: null,
        currentTime: 0,
        isPlaying: false,
        pendingDirectorCamera:
          targetPos && targetLook
            ? { position: targetPos, target: targetLook, nonce: Date.now() }
            : null,
      });
    },

    // Timeline & Keyframes
    setCurrentTime: (t) => {
      const dur = get().getActiveShot().duration;
      const clamped = Math.max(0, Math.min(dur, t));
      set({ currentTime: clamped });
    },

    setIsPlaying: (isPlaying) =>
      set((s) => ({
        isPlaying,
        isRecordingCamera: isPlaying ? s.isRecordingCamera : false,
      })),

    setIsLooping: (isLooping) => set({ isLooping }),

    setPlaybackRate: (rate) => {
      const clamped = Math.max(0.1, Math.min(4, Number(rate.toFixed(2))));
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('previs3d_playback_rate', String(clamped));
        } catch {
          // ignore
        }
      }
      set({ playbackRate: clamped });
    },

    startCameraRecording: () => {
      get().pushHistory();
      const { currentTime, getActiveShot } = get();
      const shot = getActiveShot();
      const startTime = currentTime >= shot.duration - 0.15 ? 0 : currentTime;
      if (startTime <= 0.08) {
        get().updateActiveShot({ keyframes: [] });
      } else {
        get().updateActiveShot({
          keyframes: shot.keyframes.filter((k) => k.time < startTime - 0.05),
        });
      }
      set({
        currentTime: startTime,
        isRecordingCamera: true,
        isPlaying: true,
      });
    },

    stopCameraRecording: () => {
      set({ isRecordingCamera: false, isPlaying: false });
    },

    recordCameraSample: (time, position, target, focalLength) => {
      const shot = get().getActiveShot();
      const snapTime = Number(Math.max(0, Math.min(shot.duration, time)).toFixed(2));
      const fl = Math.max(14, Math.min(135, Math.round(focalLength ?? shot.focalLength)));
      const existingIdx = shot.keyframes.findIndex(
        (k) => Math.abs(k.time - snapTime) < 0.12
      );
      const nextKfs: ShotKeyframe[] =
        existingIdx >= 0
          ? shot.keyframes.map((k, idx) =>
              idx === existingIdx ? { ...k, position, target, focalLength: fl } : k
            )
          : [
              ...shot.keyframes,
              { id: makeId('kf'), time: snapTime, position, target, focalLength: fl },
            ];
      nextKfs.sort((a, b) => a.time - b.time);
      get().updateActiveShot({ keyframes: nextKfs });
    },

    setAutoKeyCharacter: (autoKeyCharacter) => set({ autoKeyCharacter }),

    setShotDuration: (duration) => {
      const clamped = Math.max(2, Math.min(30, duration));
      get().updateActiveShot({ duration: clamped });
    },

    addOrUpdateKeyframe: (kf) => {
      get().pushHistory();
      const proj = get().getActiveProject();
      const shot = get().getActiveShot();
      const charPoses: Record<string, PosePreset> | undefined = kf.includeCharacterPoses
        ? Object.fromEntries(proj.world.characters.map((c) => [c.id, c.pose]))
        : kf.characterPoses;

      const existingIdx = shot.keyframes.findIndex(
        (item) =>
          (kf.id && item.id === kf.id) || Math.abs(item.time - kf.time) < 0.08
      );
      let nextKfs: ShotKeyframe[];
      if (existingIdx >= 0) {
        nextKfs = shot.keyframes.map((item, idx) =>
          idx === existingIdx
            ? { ...item, ...kf, characterPoses: charPoses ?? item.characterPoses, id: item.id }
            : item
        );
      } else {
        nextKfs = [
          ...shot.keyframes,
          { ...kf, characterPoses: charPoses, id: kf.id ?? makeId('kf') },
        ];
      }
      nextKfs.sort((a, b) => a.time - b.time);
      get().updateActiveShot({ keyframes: nextKfs });
    },

    updateKeyframeById: (id, patch) => {
      get().pushHistory();
      const shot = get().getActiveShot();
      const nextKfs = shot.keyframes
        .map((k) => (k.id === id ? { ...k, ...patch } : k))
        .sort((a, b) => a.time - b.time);
      get().updateActiveShot({ keyframes: nextKfs });
    },

    removeKeyframe: (id) => {
      get().pushHistory();
      const shot = get().getActiveShot();
      get().updateActiveShot({
        keyframes: shot.keyframes.filter((k) => k.id !== id),
      });
    },

    setShotKeyframes: (keyframes) => {
      get().pushHistory();
      const sorted = [...keyframes].sort((a, b) => a.time - b.time);
      get().updateActiveShot({ keyframes: sorted });
      set({ currentTime: 0 });
    },

    updateShotCameraPosition: (pos) => {
      const { currentTime } = get();
      const shot = get().getActiveShot();
      const world = get().getActiveProject().world;
      const evalCam = evaluateShotCamera(shot, world, currentTime);
      get().addOrUpdateKeyframe({
        time: Number(currentTime.toFixed(2)),
        position: pos,
        target: evalCam.target,
        focalLength: evalCam.focalLength,
      });
    },

    updateShotCameraTarget: (target) => {
      const { currentTime } = get();
      const shot = get().getActiveShot();
      const world = get().getActiveProject().world;
      const evalCam = evaluateShotCamera(shot, world, currentTime);
      if (shot.lookAtTargetId) {
        get().updateActiveShot({ lookAtTargetId: null });
      }
      get().addOrUpdateKeyframe({
        time: Number(currentTime.toFixed(2)),
        position: evalCam.position,
        target,
        focalLength: evalCam.focalLength,
      });
    },

    applyDirectorViewAsKeyframe: (position, target, focalLength) => {
      const { currentTime } = get();
      const shot = get().getActiveShot();
      const world = get().getActiveProject().world;
      const evalCam = evaluateShotCamera(shot, world, currentTime);
      if (shot.lookAtTargetId) {
        get().updateActiveShot({ lookAtTargetId: null });
      }
      get().addOrUpdateKeyframe({
        time: Number(currentTime.toFixed(2)),
        position,
        target,
        focalLength: Math.round(focalLength ?? evalCam.focalLength),
      });
    },

    addOrUpdateCharacterKeyframe: (characterId, timeOverride, interpolation) => {
      get().pushHistory();
      const proj = get().getActiveProject();
      const shot = get().getActiveShot();
      const actor = proj.world.characters.find((c) => c.id === characterId);
      if (!actor) return;

      const t = Number(
        Math.max(0, Math.min(shot.duration, timeOverride ?? get().currentTime)).toFixed(2)
      );
      const track = [...(shot.characterTracks?.[characterId] ?? [])];
      const evaluated = evaluateCharacterAtTime(actor, shot, t, false);

      // If starting an animation track at t > 0, seed 0.0s with the base actor pose so interpolation has a start point
      if (track.length === 0 && t > 0.08) {
        track.push({
          id: makeId('ckf'),
          time: 0,
          position: [...actor.position],
          rotation: [...actor.rotation],
          pose: actor.pose,
          pelvisOffsetY: actor.pelvisOffsetY,
          joints: cloneJoints(actor.joints),
          interpolation: 'smooth',
        });
      }

      const existingIdx = track.findIndex((k) => Math.abs(k.time - t) < 0.08);
      if (existingIdx >= 0) {
        const prev = track[existingIdx];
        track[existingIdx] = {
          ...prev,
          time: t,
          position: [...evaluated.position],
          rotation: [...evaluated.rotation],
          pose: evaluated.pose,
          pelvisOffsetY: evaluated.pelvisOffsetY,
          joints: cloneJoints(evaluated.joints),
          interpolation: interpolation ?? prev.interpolation ?? 'smooth',
        };
      } else {
        track.push({
          id: makeId('ckf'),
          time: t,
          position: [...evaluated.position],
          rotation: [...evaluated.rotation],
          pose: evaluated.pose,
          pelvisOffsetY: evaluated.pelvisOffsetY,
          joints: cloneJoints(evaluated.joints),
          interpolation: interpolation ?? 'smooth',
        });
      }
      track.sort((a, b) => a.time - b.time);
      get().updateActiveShot({
        characterTracks: {
          ...(shot.characterTracks ?? {}),
          [characterId]: track,
        },
      });
    },

    removeCharacterKeyframe: (characterId, keyframeId) => {
      get().pushHistory();
      const shot = get().getActiveShot();
      const track = shot.characterTracks?.[characterId] ?? [];
      const nextTrack = track.filter((k) => k.id !== keyframeId);
      const nextTracks = { ...(shot.characterTracks ?? {}) };
      if (nextTrack.length === 0) {
        delete nextTracks[characterId];
      } else {
        nextTracks[characterId] = nextTrack;
      }
      get().updateActiveShot({ characterTracks: nextTracks });
    },

    setCharacterKeyframeInterpolation: (characterId, keyframeId, interpolation) => {
      get().pushHistory();
      const shot = get().getActiveShot();
      const track = shot.characterTracks?.[characterId] ?? [];
      const nextTrack = track.map((k) =>
        k.id === keyframeId ? { ...k, interpolation } : k
      );
      get().updateActiveShot({
        characterTracks: {
          ...(shot.characterTracks ?? {}),
          [characterId]: nextTrack,
        },
      });
    },

    clearCharacterTrack: (characterId) => {
      get().pushHistory();
      const shot = get().getActiveShot();
      const nextTracks = { ...(shot.characterTracks ?? {}) };
      delete nextTracks[characterId];
      get().updateActiveShot({ characterTracks: nextTracks });
    },

    applyCharacterActionTemplate: (characterId, template) => {
      get().pushHistory();
      const proj = get().getActiveProject();
      const shot = get().getActiveShot();
      const actor = proj.world.characters.find((c) => c.id === characterId);
      if (!actor) return;
      const kfs = buildCharacterActionTemplate(
        actor,
        template,
        shot.duration,
        proj.world.terrain,
        proj.world.road,
        makeId
      );
      get().updateActiveShot({
        characterTracks: {
          ...(shot.characterTracks ?? {}),
          [characterId]: kfs,
        },
      });
      set({ currentTime: 0, isPlaying: true });
    },

    applyCameraPreset: (preset) => {
      const proj = get().getActiveProject();
      const shot = get().getActiveShot();
      const dur = shot.duration;
      const chars = proj.world.characters;
      let center: Vec3 = proj.world.heroCompound
        ? [
            proj.world.heroCompound.position[0],
            proj.world.heroCompound.position[1] + 1.4,
            proj.world.heroCompound.position[2],
          ]
        : [0, 1.3, 0];

      if (chars.length > 0) {
        const avg = chars.reduce(
          (acc, c) => [acc[0] + c.position[0], acc[1] + c.position[1] + 1.1, acc[2] + c.position[2]],
          [0, 0, 0]
        );
        center = [avg[0] / chars.length, avg[1] / chars.length, avg[2] / chars.length];
      }
      const [cx, cy, cz] = center;
      const lowY0 = getGroundY(cx - 1.5, cz + 6.5, proj.world.terrain, proj.world.road) + 0.45;
      const lowY1 = getGroundY(cx + 0.4, cz + 2.2, proj.world.terrain, proj.world.road) + 0.8;

      let kfs: ShotKeyframe[] = [];
      switch (preset) {
        case 'dolly_in':
          kfs = [
            { id: makeId('kf'), time: 0, position: [cx, cy + 0.5, cz + 7], target: center, focalLength: 35 },
            { id: makeId('kf'), time: dur, position: [cx, cy + 0.3, cz + 2.4], target: center, focalLength: 42 },
          ];
          break;
        case 'dolly_out':
          kfs = [
            { id: makeId('kf'), time: 0, position: [cx, cy + 0.3, cz + 2.5], target: center, focalLength: 42 },
            { id: makeId('kf'), time: dur, position: [cx + 0.8, cy + 1.4, cz + 8.5], target: center, focalLength: 28 },
          ];
          break;
        case 'orbit':
          kfs = [
            { id: makeId('kf'), time: 0, position: [cx + 5.5, cy + 1.2, cz], target: center, focalLength: 35 },
            { id: makeId('kf'), time: dur * 0.33, position: [cx, cy + 1.5, cz + 5.5], target: center, focalLength: 35 },
            { id: makeId('kf'), time: dur * 0.66, position: [cx - 5.5, cy + 1.2, cz], target: center, focalLength: 35 },
            { id: makeId('kf'), time: dur, position: [cx, cy + 1.8, cz - 5.5], target: center, focalLength: 35 },
          ];
          break;
        case 'low_angle_push':
          kfs = [
            { id: makeId('kf'), time: 0, position: [cx - 1.5, lowY0, cz + 6.5], target: [cx, cy + 0.3, cz], focalLength: 28 },
            { id: makeId('kf'), time: dur, position: [cx + 0.4, lowY1, cz + 2.2], target: [cx, cy + 0.5, cz], focalLength: 40 },
          ];
          break;
        case 'dolly_zoom':
          kfs = [
            { id: makeId('kf'), time: 0, position: [cx, cy + 0.3, cz + 3.0], target: center, focalLength: 18 },
            { id: makeId('kf'), time: dur, position: [cx, cy + 0.3, cz + 8.5], target: center, focalLength: 65 },
          ];
          break;
      }
      get().setShotKeyframes(kfs);
    },

    setExportState: (isExporting, exportProgress = 0) =>
      set({ isExporting, exportProgress }),

    setAIConfig: (aiConfig) => {
      try {
        localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig));
      } catch {
        // ignore
      }
      set({ aiConfig });
    },

    applyRemoteWorld: (updater) => {
      const { activeProjectId, projects, selectedId } = get();
      let computedNextWorld: WorldState | null = null;
      const next = projects.map((p) => {
        if (p.id !== activeProjectId) return p;
        const nextWorld = updater(p.world);
        computedNextWorld = nextWorld;
        return {
          ...p,
          updatedAt: Date.now(),
          world: nextWorld,
        };
      });
      if (!computedNextWorld) return;
      const nw: WorldState = computedNextWorld;
      let nextSelectedId = selectedId;
      if (
        selectedId &&
        selectedId !== SHOT_CAMERA_ID &&
        selectedId !== SHOT_TARGET_ID
      ) {
        const exists =
          nw.assets.some((a) => a.id === selectedId) ||
          nw.characters.some((c) => c.id === selectedId) ||
          nw.buildings.some((b) => b.id === selectedId) ||
          nw.scatteredProps.some((sp) => sp.id === selectedId) ||
          (nw.customModels ?? []).some((m) => m.id === selectedId) ||
          (nw.gltfModels ?? []).some((m) => m.id === selectedId) ||
          (nw.paintedRoads ?? []).some((r) => r.id === selectedId) ||
          (nw.paintedFences ?? []).some((f) => f.id === selectedId) ||
          nw.heroCompound?.id === selectedId;
        if (!exists) {
          nextSelectedId = null;
        }
      }
      set({ projects: next, selectedId: nextSelectedId });
      persist(next);
    },
  };
});
