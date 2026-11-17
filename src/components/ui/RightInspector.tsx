import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  Circle,
  CloudOff,
  Copy,
  Crosshair,
  Film,
  Maximize2,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Sliders,
  Square,
  Sun,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import {
  BUILDING_INVENTORY,
  CHARACTER_ITEM_GROUPS,
  getCharacterItemGroup,
  getCharacterVariantSpec,
  getItemGroupForVariant,
  getItemGroupsForPropType,
  getVariantSpec,
  PROP_TYPE_CATEGORY_TITLES,
  QUICK_TINT_SWATCHES,
} from '../../data/assetInventory';
import {
  focalLengthToFov,
  formatPresetLabel,
  JOINT_LABELS,
  POSE_PRESETS,
} from '../../data/presets';
import { AssetVariantThumb } from './AssetVariantThumb';
import { ObjectAnimationSection } from './ObjectAnimationSection';
import { evaluateCharacterAtTime } from '../../engine/animation';
import {
  computeTimeOfDayState,
  formatTimeHHMM,
  getTimePeriodInfo,
  inferTimeMinutesFromEnv,
} from '../../engine/timeOfDay';
import {
  translateCatalogText,
  translateDefaultEntityName,
} from '../../i18n/translations';
import { evaluateShotCamera, useStudioStore } from '../../store/useStudioStore';
import {
  SHOT_CAMERA_ID,
  SHOT_TARGET_ID,
  type AppLanguage,
  type CameraPresetType,
  type JointName,
  type PosePreset,
  type Vec3,
} from '../../types/scene';

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

const PRIME_LENSES = [16, 24, 35, 50, 85];

const CAMERA_PRESETS: { id: CameraPresetType; label: string; labelEn: string }[] = [
  { id: 'dolly_in', label: '推镜头 Dolly In', labelEn: 'Dolly In' },
  { id: 'dolly_out', label: '拉镜头 Dolly Out', labelEn: 'Dolly Out' },
  { id: 'orbit', label: '环绕 Orbit', labelEn: 'Orbit' },
  { id: 'low_angle_push', label: '低角度仰拍推进', labelEn: 'Low-Angle Push' },
  { id: 'dolly_zoom', label: '希区柯克变焦', labelEn: 'Dolly Zoom' },
];

interface RightInspectorProps {
  onClose?: () => void;
  onMatchDirectorView?: () => void;
  onFocusShotCamera?: () => void;
}

const FLOATING_CARD_CLS =
  'pointer-events-auto fixed right-4 top-16 z-30 w-72 max-h-[calc(100vh-14rem)] rounded-2xl glass-drawer flex flex-col overflow-hidden text-slate-800';

interface ObjectNameInputProps {
  id: string;
  name: string;
  subtitle?: string;
  language?: AppLanguage;
  onRename: (id: string, name: string) => void;
}

const ObjectNameInput: React.FC<ObjectNameInputProps> = ({
  id,
  name,
  subtitle,
  language = 'zh',
  onRename,
}) => {
  const en = language === 'en';
  const displayName = translateDefaultEntityName(language, name);
  const [draft, setDraft] = useState(displayName);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(displayName);
  }, [id, displayName]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(displayName);
      return;
    }
    if (trimmed !== displayName) {
      onRename(id, trimmed);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 900);
    }
  };

  return (
    <div className="space-y-0.5 min-w-0 flex-1">
      <div className="flex items-center gap-1 rounded-lg bg-slate-100/80 hover:bg-slate-100 focus-within:bg-white border border-transparent focus-within:border-sky-400 px-1.5 py-0.5 transition">
        <Pencil className="w-3 h-3 text-slate-400 shrink-0" />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setDraft(displayName);
              e.currentTarget.blur();
            }
          }}
          placeholder={en ? 'Enter custom name...' : '输入自定义名称...'}
          title={
            en
              ? 'Click to rename and press Enter (used in Outliner search & Look-At target)'
              : '点击输入自定义名称，回车确认（方便大纲搜索与镜头锁定调用）'
          }
          className="w-full min-w-0 bg-transparent text-xs font-bold text-slate-900 focus:outline-none truncate"
        />
        {savedFlash && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
      </div>
      {subtitle && (
        <div className="text-[10px] text-slate-400 truncate px-1">{subtitle}</div>
      )}
    </div>
  );
};

export const RightInspector: React.FC<RightInspectorProps> = ({
  onClose,
  onMatchDirectorView,
  onFocusShotCamera,
}) => {
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const language = useStudioStore((s) => s.language);
  const en = language === 'en';
  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const shot =
    project.shots.find((s) => s.id === project.activeShotId) ?? project.shots[0];

  const selectedId = useStudioStore((s) => s.selectedId);
  const selectObject = useStudioStore((s) => s.selectObject);
  const currentTime = useStudioStore((s) => s.currentTime);
  const setCurrentTime = useStudioStore((s) => s.setCurrentTime);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const isRecordingCamera = useStudioStore((s) => s.isRecordingCamera);
  const startCameraRecording = useStudioStore((s) => s.startCameraRecording);
  const stopCameraRecording = useStudioStore((s) => s.stopCameraRecording);
  const autoKeyCharacter = useStudioStore((s) => s.autoKeyCharacter);
  const setAutoKeyCharacter = useStudioStore((s) => s.setAutoKeyCharacter);

  const updateObjectTransform = useStudioStore((s) => s.updateObjectTransform);
  const renameObject = useStudioStore((s) => s.renameObject);
  const renameShot = useStudioStore((s) => s.renameShot);
  const updateObjectVariant = useStudioStore((s) => s.updateObjectVariant);
  const cycleObjectVariant = useStudioStore((s) => s.cycleObjectVariant);
  const duplicateSelected = useStudioStore((s) => s.duplicateSelected);
  const focusSelected = useStudioStore((s) => s.focusSelected);
  const updateCharacterPose = useStudioStore((s) => s.updateCharacterPose);
  const updateCharacterJoint = useStudioStore((s) => s.updateCharacterJoint);
  const deleteSelected = useStudioStore((s) => s.deleteSelected);

  const setShotFocalLength = useStudioStore((s) => s.setShotFocalLength);
  const setShotLookAtTarget = useStudioStore((s) => s.setShotLookAtTarget);
  const applyCameraPreset = useStudioStore((s) => s.applyCameraPreset);
  const updateShotCameraPosition = useStudioStore(
    (s) => s.updateShotCameraPosition
  );
  const updateShotCameraTarget = useStudioStore((s) => s.updateShotCameraTarget);
  const removeKeyframe = useStudioStore((s) => s.removeKeyframe);

  const addOrUpdateCharacterKeyframe = useStudioStore(
    (s) => s.addOrUpdateCharacterKeyframe
  );
  const removeCharacterKeyframe = useStudioStore(
    (s) => s.removeCharacterKeyframe
  );
  const clearCharacterTrack = useStudioStore((s) => s.clearCharacterTrack);

  const updateEnvironment = useStudioStore((s) => s.updateEnvironment);
  const defogEnabled = useStudioStore((s) => s.defogEnabled);
  const setDefogEnabled = useStudioStore((s) => s.setDefogEnabled);
  const toggleDefog = useStudioStore((s) => s.toggleDefog);
  const clearFog = useStudioStore((s) => s.clearFog);
  const depthNear = useStudioStore((s) => s.depthNear);
  const depthFar = useStudioStore((s) => s.depthFar);
  const setDepthRange = useStudioStore((s) => s.setDepthRange);

  const selectedAsset = project.world.assets.find((a) => a.id === selectedId);
  const selectedCustomModel = (project.world.customModels ?? []).find(
    (m) => m.id === selectedId
  );
  const selectedGltfModel = (project.world.gltfModels ?? []).find(
    (m) => m.id === selectedId
  );
  const rawSelectedChar = project.world.characters.find((c) => c.id === selectedId);
  const selectedChar = useMemo(
    () =>
      rawSelectedChar
        ? evaluateCharacterAtTime(rawSelectedChar, shot, currentTime, false)
        : undefined,
    [rawSelectedChar, shot, currentTime]
  );
  const selectedBuilding = project.world.buildings.find((b) => b.id === selectedId);
  const selectedHero =
    project.world.heroCompound?.id === selectedId
      ? project.world.heroCompound
      : undefined;
  const selectedPaintedRoad = (project.world.paintedRoads ?? []).find(
    (r) => r.id === selectedId
  );
  const selectedPaintedFence = (project.world.paintedFences ?? []).find(
    (f) => f.id === selectedId
  );
  const selected =
    selectedAsset ?? selectedCustomModel ?? selectedGltfModel ?? selectedChar;
  const [inspectorVariantFilter, setInspectorVariantFilter] = React.useState('');
  const uniformBaseScaleRef = React.useRef<{
    id: string;
    base: Vec3;
    avg: number;
  } | null>(null);

  // 1. Camera or Camera Target Selected Inspector
  if (selectedId === SHOT_CAMERA_ID || selectedId === SHOT_TARGET_ID) {
    const fov = focalLengthToFov(shot.focalLength);
    const camEval = evaluateShotCamera(shot, project.world, currentTime);
    const updateCamVec = (kind: 'position' | 'target', axisIdx: 0 | 1 | 2, val: number) => {
      const next: Vec3 =
        kind === 'position' ? [...camEval.position] : [...camEval.target];
      next[axisIdx] = Number.isFinite(val) ? val : 0;
      if (kind === 'position') {
        updateShotCameraPosition(next);
      } else {
        updateShotCameraTarget(next);
      }
    };

    return (
      <aside className={FLOATING_CARD_CLS}>
        <div className="px-3 py-2 border-b border-white/60 flex items-start justify-between gap-1.5 shrink-0">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Camera className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-1" />
            <ObjectNameInput
              id={shot.id}
              name={shot.name}
              language={language}
              subtitle={
                selectedId === SHOT_TARGET_ID
                  ? en
                    ? 'Camera Target · Custom Shot Name'
                    : '镜头注视点 · 自定义分镜名'
                  : en
                    ? 'Shot Camera · Custom Shot Name'
                    : '摄影机 · 自定义分镜名'
              }
              onRename={renameShot}
            />
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="glass-btn p-1 rounded-full text-slate-500 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <section className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {en ? 'Camera Recording Workflow' : '运镜录制工作流'}
              </span>
              <span className="text-[10px] font-mono text-sky-700">
                t = {currentTime.toFixed(1)}s
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {onMatchDirectorView && (
                <button
                  onClick={onMatchDirectorView}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold transition"
                >
                  <Camera className="w-3 h-3" />
                  {en ? 'Key This View' : '当前视角K帧'}
                </button>
              )}
              <button
                onClick={() =>
                  isRecordingCamera ? stopCameraRecording() : startCameraRecording()
                }
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold transition ${
                  isRecordingCamera
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                }`}
              >
                {isRecordingCamera ? (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    {en ? 'Stop Rec' : '停止录运镜'}
                  </>
                ) : (
                  <>
                    <Circle className="w-3 h-3 fill-current" />
                    {en ? 'Rec Live' : '实时录运镜'}
                  </>
                )}
              </button>
            </div>
            {onFocusShotCamera && (
              <button
                onClick={onFocusShotCamera}
                className="w-full flex items-center justify-center gap-1 py-1 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition"
              >
                <Crosshair className="w-3 h-3" />
                {en ? 'Match Director View to Camera' : '导演视口对齐此机位'}
              </button>
            )}
          </section>

          <div className="border-t border-slate-200" />

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {en ? 'Camera & Target Coordinates' : '当前机位与注视点'}
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  onClick={() => selectObject(SHOT_CAMERA_ID)}
                  className={`px-1.5 py-0.5 rounded ${
                    selectedId === SHOT_CAMERA_ID
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {en ? 'Camera' : '机身'}
                </button>
                <button
                  onClick={() => selectObject(SHOT_TARGET_ID)}
                  className={`px-1.5 py-0.5 rounded ${
                    selectedId === SHOT_TARGET_ID
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {en ? 'Target' : '注视球'}
                </button>
              </div>
            </div>

            {(['position', 'target'] as const).map((kind) => {
              const vec = kind === 'position' ? camEval.position : camEval.target;
              return (
                <div key={kind} className="space-y-1">
                  <div className="text-[11px] text-slate-500">
                    {kind === 'position'
                      ? en
                        ? 'Camera Position (m)'
                        : '机位坐标 (m)'
                      : en
                        ? 'Look-At Target (m)'
                        : '注视点 Target (m)'}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['X', 'Y', 'Z'] as const).map((axis, idx) => {
                      const i = idx as 0 | 1 | 2;
                      return (
                        <label
                          key={axis}
                          className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[11px]"
                        >
                          <span className="text-slate-400 font-mono">{axis}</span>
                          <input
                            type="number"
                            step={0.5}
                            value={Number(vec[i].toFixed(2))}
                            onChange={(e) =>
                              updateCamVec(kind, i, Number(e.target.value))
                            }
                            className="w-full bg-transparent text-slate-800 focus:outline-none font-mono"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          <div className="border-t border-slate-200" />

          <section className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">
                {en ? 'Cinema Lens · Stepless Zoom' : '电影焦段 · 无极变焦'}
              </span>
              <span className="font-mono font-semibold text-sky-700">
                {camEval.focalLength % 1 === 0
                  ? camEval.focalLength.toFixed(0)
                  : camEval.focalLength.toFixed(1)}
                mm · {fov.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              data-testid="focal-length-slider"
              min={8}
              max={300}
              step={0.1}
              value={Number(camEval.focalLength.toFixed(1))}
              onChange={(e) => setShotFocalLength(Number(e.target.value))}
              className="w-full"
            />
            <div className="grid grid-cols-5 gap-1">
              {PRIME_LENSES.map((mm) => (
                <button
                  key={mm}
                  onClick={() => setShotFocalLength(mm)}
                  className={`py-1 rounded-lg text-[10px] font-mono border transition ${
                    Math.abs(camEval.focalLength - mm) <= 2
                      ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {mm}mm
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-slate-200" />

          <section className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {en ? 'Look-At Lock Target' : 'Look-At 锁定目标'}
            </label>
            <select
              value={shot.lookAtTargetId ?? ''}
              onChange={(e) => setShotLookAtTarget(e.target.value || null)}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
            >
              <option value="">
                {en ? 'Free Target (Follow Yellow Dot)' : '自由目标 (跟随黄色 Target 点)'}
              </option>
              {project.world.heroCompound && (
                <option value={project.world.heroCompound.id}>
                  🏢 {translateDefaultEntityName(language, project.world.heroCompound.name)}
                </option>
              )}
              {project.world.characters.map((c) => (
                <option key={c.id} value={c.id}>
                  🧍 {translateDefaultEntityName(language, c.name)}
                </option>
              ))}
              {project.world.assets.map((a) => (
                <option key={a.id} value={a.id}>
                  🧱 {translateDefaultEntityName(language, a.name)}
                </option>
              ))}
              {project.world.buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  🏙️ {translateDefaultEntityName(language, b.name)}
                </option>
              ))}
              {(project.world.customModels ?? []).map((cm) => (
                <option key={cm.id} value={cm.id}>
                  🛠️ {translateDefaultEntityName(language, cm.name)}
                </option>
              ))}
              {(project.world.gltfModels ?? []).map((gm) => (
                <option key={gm.id} value={gm.id}>
                  🗿 {translateDefaultEntityName(language, gm.name)}
                </option>
              ))}
            </select>
          </section>

          <div className="border-t border-slate-200" />

          <section className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>
                {en ? `Camera Keyframes (${shot.keyframes.length})` : `镜头关键帧 (${shot.keyframes.length})`}
              </span>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {shot.keyframes.map((kf, idx) => (
                <div
                  key={kf.id}
                  className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                >
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentTime(kf.time);
                    }}
                    className="font-mono text-sky-700 hover:underline font-semibold"
                  >
                    #{idx + 1} · {kf.time.toFixed(2)}s · {Math.round(kf.focalLength)}mm
                  </button>
                  <button
                    onClick={() => removeKeyframe(kf.id)}
                    className="text-slate-400 hover:text-rose-600"
                    title={en ? 'Delete keyframe' : '删除关键帧'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="border-t border-slate-200" />

          <section className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-sky-600" />
              {en ? 'One-Click Camera Moves' : '一键运镜生成器'}
            </h4>
            <div className="space-y-1.5">
              {CAMERA_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyCameraPreset(p.id)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-sky-400 text-left text-xs text-slate-800 font-medium transition"
                >
                  {en ? p.labelEn : p.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>
    );
  }

  // 1B. Painted Road / Fence Stroke Selected Inspector
  if (selectedPaintedRoad || selectedPaintedFence) {
    const pts = selectedPaintedRoad?.points ?? selectedPaintedFence?.points ?? [];
    let totalLen = 0;
    for (let i = 1; i < pts.length; i++) {
      totalLen += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
    }
    const strokeDisplayName = translateDefaultEntityName(
      language,
      (selectedPaintedRoad ?? selectedPaintedFence)!.name
    );
    const title = selectedPaintedRoad
      ? `${en ? 'Road Stroke' : '道路画笔'} · ${strokeDisplayName}`
      : `${en ? 'Fence Path' : '围栏连续墙'} · ${strokeDisplayName}`;

    return (
      <aside className={FLOATING_CARD_CLS}>
        <div className="h-10 px-3.5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="text-xs font-bold text-slate-900 truncate">{title}</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-900/5 text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="p-3.5 space-y-3 text-xs text-slate-700">
          <ObjectNameInput
            id={(selectedPaintedRoad ?? selectedPaintedFence)!.id}
            name={(selectedPaintedRoad ?? selectedPaintedFence)!.name}
            language={language}
            subtitle={
              selectedPaintedRoad
                ? en
                  ? 'Road Stroke Name'
                  : '绘制道路名称'
                : en
                  ? 'Fence Path Name'
                  : '连续围栏名称'
            }
            onRename={renameObject}
          />
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">{en ? 'Path Length' : '路径总长'}</span>
              <span className="font-mono font-semibold text-slate-800">
                {totalLen.toFixed(1)} m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{en ? 'Sample Points' : '采样点数量'}</span>
              <span className="font-mono text-slate-700">
                {pts.length} {en ? 'pts' : '点'}
              </span>
            </div>
            {selectedPaintedRoad && (
              <div className="flex justify-between">
                <span className="text-slate-500">{en ? 'Road Width' : '路面宽度'}</span>
                <span className="font-mono text-slate-700">
                  {selectedPaintedRoad.width} m
                </span>
              </div>
            )}
          </div>
          <button
            onClick={deleteSelected}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {en ? 'Delete Path (Delete)' : '删除此路径 (Delete)'}
          </button>
        </div>
      </aside>
    );
  }

  // 2. Global Environment & Render Settings (Nothing Selected)
  if (!selected && !selectedBuilding && !selectedHero) {
    const env = project.world.environment;
    return (
      <aside className={FLOATING_CARD_CLS}>
        <div className="h-10 px-3.5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-slate-900">
              {en ? 'Lighting & Passes' : '光照与通道设置'}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-900/5 text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <section className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {en ? 'Time & Sun' : '片场时间与日照 (Time & Sun)'}
            </h4>

            {(() => {
              const curMin = inferTimeMinutesFromEnv(env);
              const period = getTimePeriodInfo(curMin, language);
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-700">
                    <span>{en ? 'Time Dial (00:00 - 24:00)' : '时间拨条 (00:00 - 24:00)'}</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatTimeHHMM(curMin)} · {period.tag}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1435}
                    step={5}
                    value={curMin}
                    onChange={(e) => {
                      const next = computeTimeOfDayState(
                        Number(e.target.value),
                        env.fogDensity
                      );
                      updateEnvironment(next.environment);
                    }}
                    style={{
                      background:
                        'linear-gradient(90deg, #1e293b 0%, #312e81 18%, #f472b6 26%, #e7e5e4 38%, #f8fafc 52%, #e7e5e4 65%, #fb923c 76%, #6366f1 84%, #1e293b 100%)',
                    }}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-slate-900"
                  />
                </div>
              );
            })()}

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-700">
                <span>{en ? 'Sun Azimuth' : '方位角 (Azimuth)'}</span>
                <span className="font-mono font-semibold text-amber-600">
                  {env.sunAzimuth}°
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={env.sunAzimuth}
                onChange={(e) =>
                  updateEnvironment({ sunAzimuth: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-700">
                <span>{en ? 'Sun Elevation' : '高度角 (Elevation)'}</span>
                <span className="font-mono font-semibold text-amber-600">
                  {env.sunElevation}°
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={85}
                step={1}
                value={env.sunElevation}
                onChange={(e) =>
                  updateEnvironment({ sunElevation: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-700">
                <span>{en ? 'Fog Density' : '雾效浓度 (Fog)'}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleDefog}
                    title={
                      en
                        ? 'Temporarily suppress all scene fog without modifying stored value'
                        : '临时屏蔽全部场景雾效（不影响原雾浓度数值）'
                    }
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
                      defogEnabled
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <CloudOff className="w-2.5 h-2.5" />
                    {defogEnabled ? (en ? 'Defogged' : '已去雾') : en ? 'Defog' : '一键去雾'}
                  </button>
                  {env.fogDensity > 0 && (
                    <button
                      type="button"
                      onClick={clearFog}
                      title={en ? 'Permanently reset project fog to zero' : '将工程环境雾效永久清零'}
                      className="px-1.5 py-0.5 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-[10px] font-medium text-slate-500 transition"
                    >
                      {en ? 'Zero' : '清零'}
                    </button>
                  )}
                  <span
                    className={`font-mono text-[11px] ${
                      defogEnabled ? 'line-through text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {(env.fogDensity * 1000).toFixed(0)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={0.04}
                step={0.002}
                value={defogEnabled ? 0 : env.fogDensity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (defogEnabled && val > 0) setDefogEnabled(false);
                  updateEnvironment({ fogDensity: val });
                }}
                className="w-full"
              />
              {defogEnabled && env.fogDensity > 0 && (
                <p className="text-[10px] text-sky-700 leading-tight">
                  {en
                    ? 'Global Defog is ON: both viewport & exported video render fog-free. Click "Defogged" to restore.'
                    : '已启用全局去雾：视口预览与视频导出均为无雾清晰画面，点击「已去雾」可随时恢复。'}
                </p>
              )}
            </div>
          </section>

          <div className="border-t border-slate-200" />

          <section className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-600" />
              {en ? 'Depth Linear Clipping' : 'Depth 线性深度裁切'}
            </h4>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-700">
                <span>{en ? 'Near Plane' : 'Near 近裁面'}</span>
                <span className="font-mono font-semibold text-sky-700">
                  {depthNear.toFixed(1)}m
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={15}
                step={0.5}
                value={depthNear}
                onChange={(e) => setDepthRange(Number(e.target.value), depthFar)}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-700">
                <span>{en ? 'Far Plane' : 'Far 远裁面'}</span>
                <span className="font-mono font-semibold text-sky-700">
                  {depthFar.toFixed(1)}m
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                step={1}
                value={depthFar}
                onChange={(e) => setDepthRange(depthNear, Number(e.target.value))}
                className="w-full"
              />
            </div>
          </section>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-500 leading-relaxed">
            {en
              ? 'Click any building, character, or camera in the 3D viewport to inspect it. Shortcuts: W Move · E Rotate · R Scale.'
              : '点击 3D 视口内建筑、角色或摄影机可编辑参数。快捷键：W 移动 · E 旋转 · R 缩放。'}
          </div>
        </div>
      </aside>
    );
  }

  // 2.5 District Building or Enterable Hero Compound Selected
  const selectedStructure = selectedBuilding ?? selectedHero;
  if (selectedStructure) {
    const updateStructPos = (axisIdx: 0 | 1 | 2, val: number) => {
      const next: Vec3 = [...selectedStructure.position];
      next[axisIdx] = Number.isFinite(val) ? val : 0;
      updateObjectTransform(selectedStructure.id, { position: next });
    };
    const activeBuildingVar = selectedBuilding
      ? BUILDING_INVENTORY.find((b) => b.id === selectedBuilding.style) ?? BUILDING_INVENTORY[0]
      : null;
    const buildingHeightM = selectedBuilding
      ? (selectedBuilding.floors * 3.2).toFixed(1)
      : '6.4';

    return (
      <aside className={FLOATING_CARD_CLS}>
        <div className="h-10 px-3 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              selectObject(null);
              onClose?.();
            }}
            title={en ? 'Deselect & close inspector (Esc)' : '取消选中并关闭面板 (Esc)'}
            className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-sky-700 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{selectedBuilding ? (en ? 'Building' : '建筑') : en ? 'Hero Compound' : '安全屋'}</span>
          </button>
          <div className="flex items-center gap-0.5">
            <button
              onClick={focusSelected}
              title={en ? 'Focus selected structure' : '聚焦选中建筑'}
              className="p-1.5 rounded-lg hover:bg-slate-900/5 text-slate-500 hover:text-slate-900"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            {selectedBuilding && (
              <button
                onClick={() => duplicateSelected()}
                title={en ? 'Duplicate building' : '复制同类建筑'}
                className="p-1.5 rounded-lg hover:bg-slate-900/5 text-slate-500 hover:text-slate-900"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={deleteSelected}
              title={en ? 'Delete selected (Del)' : '删除选中建筑 (Del)'}
              className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-900/5 text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
          {selectedBuilding && activeBuildingVar ? (
            <>
              {/* Hero Card */}
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 rounded-xl bg-[#f1f0ec] border border-slate-200/80 flex items-center justify-center shrink-0">
                  <AssetVariantThumb
                    parts={activeBuildingVar.parts}
                    tintColor={selectedBuilding.tintColor}
                    size={42}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <ObjectNameInput
                    id={selectedBuilding.id}
                    name={selectedBuilding.name}
                    language={language}
                    onRename={renameObject}
                  />
                  <div className="text-[11px] text-slate-500 px-1">
                    {en
                      ? `H ${buildingHeightM} m · ${selectedBuilding.width.toFixed(1)}×${selectedBuilding.depth.toFixed(1)} m · ${selectedBuilding.floors}F`
                      : `高 ${buildingHeightM} m · ${selectedBuilding.width.toFixed(1)}×${selectedBuilding.depth.toFixed(1)} m · ${selectedBuilding.floors} 层`}
                  </div>
                </div>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center justify-between gap-1">
                {QUICK_TINT_SWATCHES.map((sw) => {
                  const isActive =
                    sw.color === undefined
                      ? !selectedBuilding.tintColor
                      : selectedBuilding.tintColor === sw.color;
                  return (
                    <button
                      key={sw.id}
                      title={translateCatalogText(language, sw.label)}
                      onClick={() =>
                        updateObjectVariant(
                          selectedBuilding.id,
                          sw.color === undefined
                            ? { resetTint: true }
                            : { tintColor: sw.color }
                        )
                      }
                      className={`w-5 h-5 rounded-full border transition flex items-center justify-center ${
                        isActive
                          ? 'ring-2 ring-slate-900 ring-offset-1 border-slate-700'
                          : 'border-slate-300 hover:scale-110'
                      }`}
                      style={
                        sw.color
                          ? { backgroundColor: sw.color }
                          : { backgroundColor: '#ffffff' }
                      }
                    >
                      {!sw.color && (
                        <span className="block w-3.5 h-[1.5px] bg-slate-400 -rotate-45" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Building Style Inventory Grid */}
              <section className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">
                    {en ? 'Style' : '形态'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {en
                      ? `Building Inventory (${BUILDING_INVENTORY.length})`
                      : `建筑款式库存 (${BUILDING_INVENTORY.length})`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {BUILDING_INVENTORY.map((bVar) => {
                    const active = selectedBuilding.style === bVar.id;
                    const bLabel = translateCatalogText(language, bVar.label);
                    return (
                      <button
                        key={bVar.id}
                        title={`${bLabel} · ${bVar.heightHint}`}
                        onClick={() =>
                          updateObjectVariant(selectedBuilding.id, {
                            style: bVar.id,
                            variantId: bVar.id,
                          })
                        }
                        className={`flex flex-col items-center p-1 rounded-xl border transition ${
                          active
                            ? 'bg-[#efede8] border-slate-900 ring-1 ring-slate-900/20'
                            : 'bg-[#f6f5f2] border-transparent hover:border-slate-300'
                        }`}
                      >
                        <AssetVariantThumb
                          parts={bVar.parts}
                          tintColor={selectedBuilding.tintColor}
                          size={38}
                        />
                        <span
                          className={`mt-0.5 text-[10px] leading-tight truncate w-full text-center ${
                            active ? 'font-bold text-slate-900' : 'text-slate-600'
                          }`}
                        >
                          {bLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Floor Count Stepper */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                <span className="text-[11px] font-medium text-slate-600">
                  {en ? 'Floors' : '楼层数'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateObjectVariant(selectedBuilding.id, {
                        floors: Math.max(1, selectedBuilding.floors - 1),
                      })
                    }
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-900 w-6 text-center">
                    {selectedBuilding.floors}
                  </span>
                  <button
                    onClick={() =>
                      updateObjectVariant(selectedBuilding.id, {
                        floors: Math.min(18, selectedBuilding.floors + 1),
                      })
                    }
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
              <ObjectNameInput
                id={selectedStructure.id}
                name={selectedStructure.name}
                language={language}
                subtitle={en ? 'Hero Compound Name' : '安全屋建筑名称'}
                onRename={renameObject}
              />
              <div className="text-amber-700 font-semibold">
                {en ? 'Enterable 2-Story Hero Compound' : '室内外连通双层安全屋'}
              </div>
              <div>
                {en
                  ? 'Includes open porch steps, open 1F hall, interior stairs, 2F balcony, and rooftop.'
                  : '含开放门廊台阶、1F 通透大厅、室内楼梯、2F 外挑阳台与天台。'}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200" />

          <section className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {en ? 'Transform' : '空间变换 (Transform)'}
            </h4>
            <div className="grid grid-cols-3 gap-1.5">
              {(['X', 'Y', 'Z'] as const).map((axis, idx) => {
                const i = idx as 0 | 1 | 2;
                return (
                  <label
                    key={axis}
                    className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[11px]"
                  >
                    <span className="text-slate-400 font-mono">{axis}</span>
                    <input
                      type="number"
                      step={0.5}
                      value={Number(selectedStructure.position[i].toFixed(2))}
                      onChange={(e) => updateStructPos(i, Number(e.target.value))}
                      className="w-full bg-transparent text-slate-800 focus:outline-none font-mono"
                    />
                  </label>
                );
              })}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{en ? 'Yaw Rotation Y (°)' : '水平旋转 Y (°)'}</span>
                <span className="font-mono font-semibold text-sky-700">
                  {Math.round(selectedStructure.rotationY * RAD_TO_DEG)}°
                </span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={5}
                value={Math.round(selectedStructure.rotationY * RAD_TO_DEG)}
                onChange={(e) =>
                  updateObjectTransform(selectedStructure.id, {
                    rotation: [0, Number(e.target.value) * DEG_TO_RAD, 0],
                  })
                }
                className="w-full"
              />
            </div>
          </section>

          <div className="border-t border-slate-200" />

          <ObjectAnimationSection
            objectId={selectedStructure.id}
            objectKind={selectedStructure.kind}
            animation={selectedStructure.animation}
          />
        </div>

        {selectedBuilding && (
          <div className="border-t border-slate-200/80 px-3 py-2 bg-white/80 shrink-0 flex items-center justify-between">
            <button
              onClick={() => cycleObjectVariant(selectedBuilding.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-slate-900/5 text-xs font-semibold text-slate-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              {en ? 'Cycle Variant' : '换一个'}
            </button>
            <span className="text-[10px] font-mono text-slate-400">
              {BUILDING_INVENTORY.findIndex((b) => b.id === selectedBuilding.style) + 1} /{' '}
              {BUILDING_INVENTORY.length}
            </span>
          </div>
        )}
      </aside>
    );
  }

  if (!selected) return null;

  // 3. Asset, Custom Model, GLB Model or Character Selected Inspector
  const updateVecField = (
    field: 'position' | 'rotation' | 'scale',
    axisIdx: 0 | 1 | 2,
    rawValue: number,
    isDeg = false
  ) => {
    const raw = isDeg ? rawValue * DEG_TO_RAD : rawValue;
    const val = field === 'scale' ? Math.max(0.01, Number.isFinite(raw) ? raw : 1) : Number.isFinite(raw) ? raw : 0;
    const next: Vec3 = [...selected[field]];
    next[axisIdx] = val;
    updateObjectTransform(selected.id, { [field]: next });
  };

  const allItemGroups = selectedAsset
    ? getItemGroupsForPropType(selectedAsset.type)
    : [];
  const currentItemGroup = selectedAsset
    ? getItemGroupForVariant(selectedAsset.type, selectedAsset.variantId)
    : null;
  const activeAssetVar = selectedAsset
    ? getVariantSpec(selectedAsset.type, selectedAsset.variantId)
    : null;
  const assetCatMeta = selectedAsset
    ? PROP_TYPE_CATEGORY_TITLES[selectedAsset.type]
    : null;
  const activeCharVar = selectedChar
    ? getCharacterVariantSpec(selectedChar.variantId)
    : null;
  const currentCharGroup = selectedChar
    ? getCharacterItemGroup(selectedChar.variantId)
    : null;

  const headerCategoryTitle = selectedChar
    ? en
      ? 'Character'
      : '角色'
    : selectedAsset && assetCatMeta
      ? translateCatalogText(language, assetCatMeta.title)
      : selectedCustomModel
        ? en
          ? 'Custom Model'
          : '自建模型'
        : en
          ? '3D Model'
          : '3D 模型';

  const heroTintColor = selectedAsset
    ? selectedAsset.tintColor
    : selectedChar
    ? selectedChar.tintColor
    : undefined;

  const currentVarIndex = selectedAsset && currentItemGroup
    ? Math.max(
        0,
        currentItemGroup.variants.findIndex((v) => v.id === activeAssetVar?.id)
      )
    : selectedChar && currentCharGroup
    ? Math.max(
        0,
        currentCharGroup.variants.findIndex((v) => v.id === activeCharVar?.id)
      )
    : 0;
  const totalVarCount = selectedAsset && currentItemGroup
    ? currentItemGroup.variants.length
    : selectedChar && currentCharGroup
    ? currentCharGroup.variants.length
    : 0;

  return (
    <aside className={FLOATING_CARD_CLS}>
      <div className="h-10 px-3 border-b border-slate-200/80 flex items-center justify-between shrink-0">
        <button
          onClick={() => {
            selectObject(null);
            onClose?.();
          }}
          title={en ? 'Deselect & close inspector (Esc)' : '取消选中并关闭面板 (Esc)'}
          className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-sky-700 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>{headerCategoryTitle}</span>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={focusSelected}
            title={en ? 'Focus selected object' : '聚焦选中物体'}
            className="p-1.5 rounded-lg hover:bg-slate-900/5 text-slate-500 hover:text-slate-900"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {(selectedAsset || selectedChar) && (
            <button
              onClick={() => duplicateSelected()}
              title={en ? 'Duplicate object' : '复制同类型物体'}
              className="p-1.5 rounded-lg hover:bg-slate-900/5 text-slate-500 hover:text-slate-900"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={deleteSelected}
            title={en ? 'Delete selected (Del)' : '删除选中物体 (Del)'}
            className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-900/5 text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {!(selectedAsset || selectedChar) && (
          <ObjectNameInput
            id={selected.id}
            name={selected.name}
            language={language}
            subtitle={headerCategoryTitle}
            onRename={renameObject}
          />
        )}

        {/* Hero Thumbnail + Summary */}
        {(selectedAsset || selectedChar) && (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-xl bg-[#f1f0ec] border border-slate-200/80 flex items-center justify-center shrink-0">
                {activeAssetVar && (
                  <AssetVariantThumb
                    parts={activeAssetVar.parts}
                    tintColor={selectedAsset?.tintColor}
                    size={42}
                  />
                )}
                {activeCharVar && (
                  <AssetVariantThumb
                    parts={activeCharVar.parts}
                    tintColor={selectedChar?.tintColor}
                    size={42}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <ObjectNameInput
                  id={selected.id}
                  name={selected.name}
                  language={language}
                  onRename={renameObject}
                />
                {activeAssetVar && selectedAsset && (
                  <div className="text-[11px] text-slate-500 px-1">
                    {currentItemGroup
                      ? `${translateCatalogText(language, currentItemGroup.name)} · `
                      : ''}
                    {en ? 'H' : '高'} {(activeAssetVar.heightM * selectedAsset.scale[1]).toFixed(1)} m ·{' '}
                    {selectedAsset.type === 'tree'
                      ? en
                        ? 'Crown'
                        : '冠幅'
                      : en
                        ? 'W'
                        : '宽'}{' '}
                    {(activeAssetVar.widthM * selectedAsset.scale[0]).toFixed(1)} m
                  </div>
                )}
                {activeCharVar && selectedChar && (
                  <div className="text-[11px] text-slate-500 px-1">
                    {en ? 'Height' : '身高'} {(activeCharVar.heightM * selectedChar.scale[1]).toFixed(2)} m ·{' '}
                    <span className="text-sky-700 font-semibold">
                      {translateCatalogText(language, activeCharVar.label)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Color Swatches Bar */}
            <div className="flex items-center justify-between gap-1">
              {QUICK_TINT_SWATCHES.map((sw) => {
                const isActive =
                  sw.color === undefined
                    ? !heroTintColor
                    : heroTintColor === sw.color;
                return (
                  <button
                    key={sw.id}
                    title={translateCatalogText(language, sw.label)}
                    onClick={() =>
                      updateObjectVariant(
                        selected.id,
                        sw.color === undefined
                          ? { resetTint: true }
                          : { tintColor: sw.color }
                      )
                    }
                    className={`w-5 h-5 rounded-full border transition flex items-center justify-center ${
                      isActive
                        ? 'ring-2 ring-slate-900 ring-offset-1 border-slate-700'
                        : 'border-slate-300 hover:scale-110'
                    }`}
                    style={
                      sw.color
                        ? { backgroundColor: sw.color }
                        : { backgroundColor: '#ffffff' }
                    }
                  >
                    {!sw.color && (
                      <span className="block w-3.5 h-[1.5px] bg-slate-400 -rotate-45" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Section A & B for SceneAsset: Per-Item Variant Switcher + Other Base Items in Category */}
        {selectedAsset && currentItemGroup && assetCatMeta && (() => {
          const q = inspectorVariantFilter.trim().toLowerCase();
          const filteredGroups = q
            ? allItemGroups.filter(
                (g) =>
                  g.name.toLowerCase().includes(q) ||
                  translateCatalogText('en', g.name).toLowerCase().includes(q) ||
                  g.variants.some(
                    (v) =>
                      v.label.toLowerCase().includes(q) ||
                      v.shortTag.toLowerCase().includes(q) ||
                      translateCatalogText('en', v.label).toLowerCase().includes(q) ||
                      translateCatalogText('en', v.shortTag).toLowerCase().includes(q)
                  )
              )
            : allItemGroups;
          const curGrpLabel = translateCatalogText(language, currentItemGroup.name);
          const catTitleLabel = translateCatalogText(language, assetCatMeta.title);

          return (
            <div className="space-y-3">
              {/* 1. Variants of the Currently Selected Item (Mutually Switchable) */}
              <section className="rounded-xl border border-sky-200 bg-sky-50/55 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-sky-950 truncate">
                      {en ? `Variants · "${curGrpLabel}"` : `本物品变体切换 · 「${curGrpLabel}」`}
                    </div>
                    <div className="text-[9px] text-sky-700">
                      {en
                        ? `${currentItemGroup.variants.length} variants · click to morph`
                        : `共 ${currentItemGroup.variants.length} 款变体 · 点击平滑过渡切换形态`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => cycleObjectVariant(selectedAsset.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-sky-200 hover:border-sky-400 text-[10px] font-bold text-sky-800 shrink-0 transition shadow-2xs"
                  >
                    <RefreshCw className="w-3 h-3 text-sky-600" />
                    {en ? 'Next' : '下一个变体'} ({currentVarIndex + 1}/{currentItemGroup.variants.length})
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {currentItemGroup.variants.map((v, vIdx) => {
                    const isActive = activeAssetVar?.id === v.id;
                    const vTag = translateCatalogText(language, v.shortTag);
                    return (
                      <button
                        key={v.id}
                        title={
                          en
                            ? `${curGrpLabel} · ${vTag} (H ${v.heightM}m)`
                            : `${curGrpLabel} · ${vTag}（高 ${v.heightM}m）`
                        }
                        onClick={() =>
                          updateObjectVariant(selectedAsset.id, { variantId: v.id })
                        }
                        className={`flex flex-col items-center p-1.5 rounded-xl border transition ${
                          isActive
                            ? 'bg-white border-sky-500 ring-2 ring-sky-400/40 shadow-2xs'
                            : 'bg-white/80 border-slate-200/80 hover:border-sky-300'
                        }`}
                      >
                        <AssetVariantThumb
                          parts={v.parts}
                          tintColor={selectedAsset.tintColor}
                          size={34}
                        />
                        <span
                          className={`mt-0.5 text-[10px] leading-tight truncate w-full text-center ${
                            isActive ? 'font-bold text-sky-900' : 'text-slate-700'
                          }`}
                        >
                          {vTag}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400">
                          #{vIdx + 1} · {v.heightM}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 2. Switch to Another Distinct Item in the Same Category */}
              <section className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">
                    {en ? 'Other Items in Category' : '切换同分类其他物品'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {en
                      ? `${catTitleLabel} (${filteredGroups.length})`
                      : `${catTitleLabel} (${filteredGroups.length} 种物品)`}
                  </span>
                </div>
                <input
                  type="text"
                  value={inspectorVariantFilter}
                  onChange={(e) => {
                    setInspectorVariantFilter(e.target.value);
                  }}
                  placeholder={
                    en
                      ? `Filter items in "${catTitleLabel}"...`
                      : `筛选「${catTitleLabel}」下的其他物品…`
                  }
                  className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-sky-400 text-slate-700"
                />
                <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {filteredGroups.map((grp) => {
                    const isCurrentGroup = grp.groupId === currentItemGroup.groupId;
                    const repVar = grp.variants[0];
                    const grpLabel = translateCatalogText(language, grp.name);
                    return (
                      <button
                        key={grp.groupId}
                        title={
                          en
                            ? `Switch to "${grpLabel}" (${grp.variants.length} variants)`
                            : `切换为「${grpLabel}」（内含 ${grp.variants.length} 款变体）`
                        }
                        onClick={() =>
                          updateObjectVariant(selectedAsset.id, {
                            variantId: grp.defaultVariantId,
                          })
                        }
                        className={`flex flex-col items-center p-1.5 rounded-xl border transition ${
                          isCurrentGroup
                            ? 'bg-[#efede8] border-slate-900 ring-1 ring-slate-900/20'
                            : 'bg-[#f6f5f2] border-transparent hover:border-slate-300'
                        }`}
                      >
                        <AssetVariantThumb
                          parts={repVar.parts}
                          tintColor={selectedAsset.tintColor}
                          size={32}
                        />
                        <span
                          className={`mt-0.5 text-[10px] leading-tight truncate w-full text-center ${
                            isCurrentGroup ? 'font-bold text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {grpLabel}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400">
                          {en ? `${grp.variants.length} vars` : `${grp.variants.length}款变体`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          );
        })()}

        {/* Pre-Built Character Role Group + Variant Switcher Grid */}
        {selectedChar && currentCharGroup && (
          <div className="space-y-2.5">
            <section className="rounded-xl border border-sky-200 bg-sky-50/55 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-950">
                  {en
                    ? `"${translateCatalogText(language, currentCharGroup.name)}" Variants`
                    : `「${translateCatalogText(language, currentCharGroup.name)}」的变体切换`}
                </span>
                <span className="text-[10px] text-sky-700 font-mono">
                  {currentVarIndex + 1}/{currentCharGroup.variants.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {currentCharGroup.variants.map((cv) => {
                  const isActive = activeCharVar?.id === cv.id;
                  const cvLabel = translateCatalogText(language, cv.label);
                  return (
                    <button
                      key={cv.id}
                      title={en ? `${cvLabel} · H ${cv.heightM}m` : `${cvLabel} · 身高 ${cv.heightM}m`}
                      onClick={() =>
                        updateObjectVariant(selectedChar.id, { variantId: cv.id })
                      }
                      className={`flex flex-col items-center p-1.5 rounded-xl border transition ${
                        isActive
                          ? 'bg-white border-sky-500 ring-2 ring-sky-400/40 shadow-2xs'
                          : 'bg-white/80 border-slate-200/80 hover:border-sky-300'
                      }`}
                    >
                      <AssetVariantThumb
                        parts={cv.parts}
                        tintColor={selectedChar.tintColor}
                        size={34}
                      />
                      <span
                        className={`mt-0.5 text-[10px] leading-tight truncate w-full text-center ${
                          isActive ? 'font-bold text-sky-900' : 'text-slate-700'
                        }`}
                      >
                        {cvLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  {en ? 'Switch Character Type' : '切换角色类别'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {en
                    ? `${CHARACTER_ITEM_GROUPS.length} types`
                    : `共 ${CHARACTER_ITEM_GROUPS.length} 类`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {CHARACTER_ITEM_GROUPS.map((cg) => {
                  const isCur = cg.groupId === currentCharGroup.groupId;
                  return (
                    <button
                      key={cg.groupId}
                      onClick={() =>
                        updateObjectVariant(selectedChar.id, {
                          variantId: cg.defaultVariantId,
                        })
                      }
                      className={`px-2 py-1.5 rounded-xl border text-left transition ${
                        isCur
                          ? 'bg-[#efede8] border-slate-900 font-bold text-slate-900'
                          : 'bg-[#f6f5f2] border-transparent hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-[10px] truncate">
                        {translateCatalogText(language, cg.name)}
                      </div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        {en
                          ? `${cg.variants.length} variants`
                          : `${cg.variants.length} 款角色变体`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {(selectedAsset || selectedCustomModel || selectedGltfModel) && (() => {
          const targetObj = selectedAsset ?? selectedCustomModel ?? selectedGltfModel;
          if (!targetObj) return null;
          return (
            <>
              <div className="border-t border-slate-200" />
              <ObjectAnimationSection
                objectId={targetObj.id}
                objectKind={targetObj.kind}
                propType={selectedAsset?.type}
                animation={targetObj.animation}
              />
            </>
          );
        })()}

        <div className="border-t border-slate-200" />

        <section className="space-y-2.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {en ? 'Transform' : '空间变换 (Transform)'}
          </h4>
          {(['position', 'rotation', 'scale'] as const).map((field) => {
            const isRot = field === 'rotation';
            const isScale = field === 'scale';
            const label = en
              ? field === 'position'
                ? 'Position (m)'
                : field === 'rotation'
                  ? 'Rotation (°)'
                  : 'Scale (Stepless)'
              : field === 'position'
                ? '位置 (m)'
                : field === 'rotation'
                  ? '旋转 (°)'
                  : '缩放 (无极)';
            const avgScale = isScale
              ? Math.max(
                  0.01,
                  (selected.scale[0] + selected.scale[1] + selected.scale[2]) / 3
                )
              : 1;
            const logMin = Math.log10(0.02);
            const logMax = Math.log10(30);
            const logScaleVal = isScale
              ? Math.max(logMin, Math.min(logMax, Math.log10(avgScale)))
              : 0;
            return (
              <div key={field} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{label}</span>
                  {isScale && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold text-sky-700">
                        {avgScale.toFixed(2)}x
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateObjectTransform(selected.id, { scale: [1, 1, 1] }, true)
                        }
                        title={en ? 'Reset uniform scale to 1.0x' : '重置等比缩放为 1.0x'}
                        className="glass-btn px-1.5 py-0.5 rounded-full text-[10px] text-slate-600"
                      >
                        1x
                      </button>
                    </div>
                  )}
                </div>
                {isScale && (
                  <input
                    type="range"
                    data-testid="stepless-uniform-scale-slider"
                    min={logMin}
                    max={logMax}
                    step={0.002}
                    value={logScaleVal}
                    onPointerDown={() => {
                      const base: Vec3 = [...selected.scale];
                      const avg = Math.max(0.01, (base[0] + base[1] + base[2]) / 3);
                      uniformBaseScaleRef.current = { id: selected.id, base, avg };
                    }}
                    onChange={(e) => {
                      const targetAvg = Math.pow(10, Number(e.target.value));
                      const snap =
                        uniformBaseScaleRef.current?.id === selected.id
                          ? uniformBaseScaleRef.current
                          : {
                              id: selected.id,
                              base: [...selected.scale] as Vec3,
                              avg: Math.max(
                                0.01,
                                (selected.scale[0] + selected.scale[1] + selected.scale[2]) / 3
                              ),
                            };
                      const ratio = targetAvg / snap.avg;
                      updateObjectTransform(selected.id, {
                        scale: [
                          Number(Math.max(0.01, snap.base[0] * ratio).toFixed(3)),
                          Number(Math.max(0.01, snap.base[1] * ratio).toFixed(3)),
                          Number(Math.max(0.01, snap.base[2] * ratio).toFixed(3)),
                        ],
                      });
                    }}
                    onPointerUp={() => {
                      uniformBaseScaleRef.current = null;
                    }}
                    title={
                      en
                        ? 'Continuous logarithmic uniform scaling (0.02x - 30x)'
                        : '按对数曲线连续等比无极缩放（0.02x - 30x）'
                    }
                    className="w-full"
                  />
                )}
                <div className="grid grid-cols-3 gap-1.5">
                  {(['X', 'Y', 'Z'] as const).map((axis, idx) => {
                    const i = idx as 0 | 1 | 2;
                    const displayVal = isRot
                      ? Math.round(selected[field][i] * RAD_TO_DEG)
                      : Number(selected[field][i].toFixed(isScale ? 3 : 2));
                    return (
                      <label
                        key={axis}
                        className="flex items-center gap-1 bg-white/80 border border-white/80 rounded-lg px-1.5 py-1 text-[11px]"
                      >
                        <span className="text-slate-400 font-mono">{axis}</span>
                        <input
                          type="number"
                          min={isScale ? 0.01 : undefined}
                          step={isRot ? 5 : isScale ? 0.01 : 0.25}
                          value={displayVal}
                          onChange={(e) =>
                            updateVecField(field, i, Number(e.target.value), isRot)
                          }
                          className="w-full bg-transparent text-slate-800 focus:outline-none font-mono"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {selectedChar && (() => {
          const charTrack = [...(shot.characterTracks?.[selectedChar.id] ?? [])].sort(
            (a, b) => a.time - b.time
          );
          return (
          <>
            <div className="border-t border-slate-200" />
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-amber-600" />
                  {en
                    ? `Action Keyframes (${charTrack.length})`
                    : `动作关键帧 (${charTrack.length})`}
                </h4>
                <button
                  onClick={() => setAutoKeyCharacter(!autoKeyCharacter)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                    autoKeyCharacter
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  {en
                    ? `Auto-Key:${autoKeyCharacter ? 'ON' : 'OFF'}`
                    : `自动K帧:${autoKeyCharacter ? '开' : '关'}`}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => addOrUpdateCharacterKeyframe(selectedChar.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold transition"
                >
                  <Plus className="w-3 h-3" />
                  {en
                    ? `Key Action at ${currentTime.toFixed(1)}s`
                    : `在 ${currentTime.toFixed(1)}s 打动作帧`}
                </button>
                {charTrack.length > 0 && (
                  <button
                    onClick={() => clearCharacterTrack(selectedChar.id)}
                    title={
                      en
                        ? 'Clear action keyframes for this character'
                        : '清空该角色的动作关键帧轨'
                    }
                    className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-[11px] font-medium transition"
                  >
                    {en ? 'Clear' : '清空'}
                  </button>
                )}
              </div>

              {charTrack.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {charTrack.map((ckf) => (
                    <div
                      key={ckf.id}
                      className="flex items-center justify-between px-2 py-1 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px]"
                    >
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentTime(ckf.time);
                        }}
                        className="font-mono text-amber-900 hover:underline font-semibold"
                      >
                        ◆ {ckf.time.toFixed(1)}s ·{' '}
                        {POSE_PRESETS[ckf.pose]
                          ? formatPresetLabel(POSE_PRESETS[ckf.pose].label, language)
                          : ckf.pose}
                      </button>
                      <button
                        onClick={() =>
                          removeCharacterKeyframe(selectedChar.id, ckf.id)
                        }
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="border-t border-slate-200" />
            <section className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" />
                {en ? 'Pose Presets' : '动作预设 (Pose)'}
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(POSE_PRESETS) as PosePreset[]).map((pose) => (
                  <button
                    key={pose}
                    onClick={() => updateCharacterPose(selectedChar.id, pose)}
                    className={`px-2 py-1.5 rounded-xl text-[11px] border text-left transition ${
                      selectedChar.pose === pose
                        ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {formatPresetLabel(POSE_PRESETS[pose].label, language)}
                  </button>
                ))}
              </div>
            </section>

            <div className="border-t border-slate-200" />

            <section className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {en ? '16-Joint Tuning (Deg °)' : '16 关节微调 (Joints °)'}
              </h4>
              <div className="space-y-2">
                {(Object.keys(JOINT_LABELS) as JointName[]).map((joint) => {
                  const rot = selectedChar.joints[joint];
                  return (
                    <div
                      key={joint}
                      className="rounded-xl bg-slate-50 border border-slate-200 p-2 space-y-1"
                    >
                      <div className="text-[11px] font-semibold text-slate-700">
                        {formatPresetLabel(JOINT_LABELS[joint], language)}
                      </div>
                      {(['X', 'Y', 'Z'] as const).map((axis, idx) => {
                        const i = idx as 0 | 1 | 2;
                        const deg = Math.round(rot[i] * RAD_TO_DEG);
                        return (
                          <div key={axis} className="flex items-center gap-2 text-[10px]">
                            <span className="w-3 font-mono text-slate-400">{axis}</span>
                            <input
                              type="range"
                              min={-160}
                              max={160}
                              step={1}
                              value={deg}
                              onChange={(e) => {
                                const next: Vec3 = [...rot];
                                next[i] = Number(e.target.value) * DEG_TO_RAD;
                                updateCharacterJoint(selectedChar.id, joint, next);
                              }}
                              className="flex-1"
                            />
                            <span className="w-8 text-right font-mono text-slate-500">
                              {deg}°
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
          );
        })()}
      </div>

      {/* Bottom Sticky Quick Switch Bar ("换一个") */}
      {totalVarCount > 1 && (
        <div className="border-t border-slate-200/80 px-3 py-2 bg-white/85 shrink-0 flex items-center justify-between">
          <button
            onClick={() => cycleObjectVariant(selected.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-slate-900/5 text-xs font-semibold text-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            {en ? 'Cycle Variant' : '换一个'}
          </button>
          <span className="text-[10px] font-mono text-slate-400">
            {currentVarIndex + 1} / {totalVarCount}
          </span>
        </div>
      )}
    </aside>
  );
};
