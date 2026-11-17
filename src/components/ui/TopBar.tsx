import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Clapperboard,
  CloudOff,
  Download,
  Eraser,
  Film,
  FolderPlus,
  Grid,
  Loader2,
  MapPin,
  MessageCircle,
  Move,
  Redo2,
  RotateCw,
  Scaling,
  Settings,
  ShieldCheck,
  ShieldOff,
  Square,
  Sun,
  Undo2,
  Upload,
  Users,
} from 'lucide-react';
import { formatKeyLabel } from '../../engine/keybindings';
import { getTerrainSize, MAX_MAP_SIZE, MIN_MAP_SIZE } from '../../engine/terrain';
import { tr, translateDefaultEntityName } from '../../i18n/translations';
import {
  computeTimeOfDayState,
  formatTimeHHMM,
  getTimePeriodInfo,
  inferTimeMinutesFromEnv,
} from '../../engine/timeOfDay';
import { useCollabStore } from '../../store/useCollabStore';
import { useStudioStore } from '../../store/useStudioStore';
import { CollabPanel } from './CollabPanel';
import { ProjectListPanel } from './ProjectListPanel';
import { ShotListPanel } from './ShotListPanel';
import type {
  DistrictId,
  RenderChannel,
  TransformMode,
} from '../../types/scene';

interface TopBarProps {
  onExportVideo: (channelOverride?: RenderChannel) => Promise<void>;
  onToggleShotsDrawer: () => void;
  shotsDrawerOpen?: boolean;
}

const CHANNELS: { id: RenderChannel; label: string }[] = [
  { id: 'color', label: 'Color' },
  { id: 'clay', label: 'Clay' },
  { id: 'depth', label: 'Depth' },
  { id: 'normal', label: 'Normal' },
  { id: 'wireframe', label: 'Wire' },
];

const SKY_TRACK_GRADIENT =
  'linear-gradient(90deg, #1e293b 0%, #312e81 18%, #f472b6 26%, #e7e5e4 38%, #f8fafc 52%, #e7e5e4 65%, #fb923c 76%, #6366f1 84%, #1e293b 100%)';

const TIME_HOUR_MARKS = [0, 4, 8, 12, 16, 20, 24];

export const TopBar: React.FC<TopBarProps> = ({
  onExportVideo,
  onToggleShotsDrawer,
  shotsDrawerOpen = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const mapSizeMenuRef = useRef<HTMLDivElement>(null);
  const shotMenuRef = useRef<HTMLDivElement>(null);
  const collabMenuRef = useRef<HTMLDivElement>(null);
  const [timeDialOpen, setTimeDialOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [mapSizePopoverOpen, setMapSizePopoverOpen] = useState(false);
  const [focusNewProjectTick, setFocusNewProjectTick] = useState(0);
  const [shotPopoverOpen, setShotPopoverOpen] = useState(false);

  const collabPanelOpen = useCollabStore((s) => s.panelOpen);
  const setCollabPanelOpen = useCollabStore((s) => s.setPanelOpen);
  const collabStatus = useCollabStore((s) => s.status);
  const collabPeers = useCollabStore((s) => s.peers);
  const chatOpen = useCollabStore((s) => s.chatOpen);
  const setChatOpen = useCollabStore((s) => s.setChatOpen);
  const unreadChatCount = useCollabStore((s) => s.unreadChatCount);

  useEffect(() => {
    if (!collabPanelOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (collabMenuRef.current && !collabMenuRef.current.contains(e.target as Node)) {
        setCollabPanelOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [collabPanelOpen, setCollabPanelOpen]);

  useEffect(() => {
    if (!projectPopoverOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(target) &&
        !target?.closest('[data-testid="topbar-new-project-btn"]')
      ) {
        setProjectPopoverOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [projectPopoverOpen]);

  useEffect(() => {
    if (!shotPopoverOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (shotMenuRef.current && !shotMenuRef.current.contains(e.target as Node)) {
        setShotPopoverOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [shotPopoverOpen]);

  useEffect(() => {
    if (!mapSizePopoverOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (mapSizeMenuRef.current && !mapSizeMenuRef.current.contains(e.target as Node)) {
        setMapSizePopoverOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [mapSizePopoverOpen]);

  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const saveStatus = useStudioStore((s) => s.saveStatus);
  const importProjectJson = useStudioStore((s) => s.importProjectJson);
  const exportProjectJson = useStudioStore((s) => s.exportProjectJson);

  const transformMode = useStudioStore((s) => s.transformMode);
  const setTransformMode = useStudioStore((s) => s.setTransformMode);
  const gridSnap = useStudioStore((s) => s.gridSnap);
  const setGridSnap = useStudioStore((s) => s.setGridSnap);
  const channel = useStudioStore((s) => s.channel);
  const setChannel = useStudioStore((s) => s.setChannel);
  const defogEnabled = useStudioStore((s) => s.defogEnabled);
  const toggleDefog = useStudioStore((s) => s.toggleDefog);
  const cameraCollision = useStudioStore((s) => s.cameraCollision);
  const toggleCameraCollision = useStudioStore((s) => s.toggleCameraCollision);
  const keybindings = useStudioStore((s) => s.keybindings);
  const language = useStudioStore((s) => s.language);
  const graphicsQuality = useStudioStore((s) => s.graphicsQuality);
  const settingsModalOpen = useStudioStore((s) => s.settingsModalOpen);
  const setSettingsModalOpen = useStudioStore((s) => s.setSettingsModalOpen);
  const updateEnvironment = useStudioStore((s) => s.updateEnvironment);
  const pendingPlacement = useStudioStore((s) => s.pendingPlacement);
  const setPendingPlacement = useStudioStore((s) => s.setPendingPlacement);
  const isEraserActive = pendingPlacement?.kind === 'object_eraser';

  const past = useStudioStore((s) => s.past);
  const future = useStudioStore((s) => s.future);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const isExporting = useStudioStore((s) => s.isExporting);
  const isRecordingCamera = useStudioStore((s) => s.isRecordingCamera);
  const stopCameraRecording = useStudioStore((s) => s.stopCameraRecording);
  const teleportToDistrict = useStudioStore((s) => s.teleportToDistrict);
  const teleportToHeroCompound = useStudioStore((s) => s.teleportToHeroCompound);
  const setTerrainMapSize = useStudioStore((s) => s.setTerrainMapSize);

  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const currentMapSize = getTerrainSize(project.world.terrain);
  const [mapSizeDraft, setMapSizeDraft] = useState(() => String(currentMapSize));
  useEffect(() => {
    setMapSizeDraft(String(currentMapSize));
  }, [currentMapSize]);
  const activeShot =
    project.shots.find((s) => s.id === project.activeShotId) ?? project.shots[0];

  const activeShotIdx = Math.max(
    0,
    project.shots.findIndex((s) => s.id === activeShot.id)
  );

  const currentMinutes = inferTimeMinutesFromEnv(project.world.environment);
  const currentTimeStr = formatTimeHHMM(currentMinutes);
  const currentPeriod = getTimePeriodInfo(currentMinutes, language);

  const handleScrubTime = (minutes: number) => {
    const computed = computeTimeOfDayState(
      minutes,
      project.world.environment.fogDensity
    );
    updateEnvironment(computed.environment);
  };

  const handleExportJson = () => {
    const json = exportProjectJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^\w\u4e00-\u9fa5-]+/g, '_')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = importProjectJson(text);
    if (!res.ok) {
      alert(language === 'en' ? `Import failed: ${res.error}` : `导入失败：${res.error}`);
    }
    e.target.value = '';
  };

  const modes: { id: TransformMode; icon: React.ReactNode; title: string }[] = [
    {
      id: 'translate',
      icon: <Move className="w-3.5 h-3.5" />,
      title: `${language === 'en' ? 'Move' : '移动'} (${formatKeyLabel(keybindings.translate, language)})`,
    },
    {
      id: 'rotate',
      icon: <RotateCw className="w-3.5 h-3.5" />,
      title: `${language === 'en' ? 'Rotate' : '旋转'} (${formatKeyLabel(keybindings.rotate, language)})`,
    },
    {
      id: 'scale',
      icon: <Scaling className="w-3.5 h-3.5" />,
      title: `${language === 'en' ? 'Scale' : '缩放'} (${formatKeyLabel(keybindings.scale, language)})`,
    },
  ];

  return (
    <header className="pointer-events-none fixed top-3 inset-x-3 z-30 flex flex-wrap lg:flex-nowrap items-center justify-between gap-1.5">
      {/* Left Floating Pill: Brand + Project + Quick Districts */}
      <div className="pointer-events-auto flex items-center gap-1 whitespace-nowrap shrink-0 rounded-full glass-panel px-2 py-1 text-slate-800">
        <div className="flex items-center gap-1.5 pr-1 border-r border-white/60 shrink-0">
          <div className="w-6 h-6 rounded-full bg-slate-900/90 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clapperboard className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <span className="text-xs font-bold tracking-tight text-slate-900 hidden 2xl:inline">
            PREVIS<span className="text-sky-600">.3D</span>
          </span>
        </div>

        <div className="relative" ref={projectMenuRef}>
          <button
            type="button"
            data-testid="topbar-project-btn"
            onClick={() => setProjectPopoverOpen((v) => !v)}
            title={
              language === 'en'
                ? 'Manage Venues: rename, create empty venue, or delete'
                : '管理场地：自定义名称、新建空白场地或删除场地'
            }
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition ${
              projectPopoverOpen
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-800 hover:bg-white/60'
            }`}
          >
            <span className="max-w-[84px] 2xl:max-w-[144px] truncate">
              {translateDefaultEntityName(language, project.name)}
            </span>
            {projects.length > 1 && (
              <span
                className={`text-[10px] font-mono ${
                  projectPopoverOpen ? 'text-sky-100' : 'text-slate-500'
                }`}
              >
                ({projects.length})
              </span>
            )}
            <ChevronDown
              className={`w-3 h-3 shrink-0 transition-transform ${
                projectPopoverOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {projectPopoverOpen && (
            <div
              data-testid="topbar-project-popover"
              className="absolute left-0 top-9 w-80 sm:w-96 rounded-2xl glass-drawer p-3 z-50 text-slate-800 whitespace-normal"
            >
              <ProjectListPanel
                focusNewInputSignal={focusNewProjectTick}
                onClosePopover={() => setProjectPopoverOpen(false)}
              />
            </div>
          )}
        </div>

        <span
          title={language === 'en' ? 'IndexedDB local auto-save' : 'IndexedDB 本地自动保存'}
          className="px-0.5"
        >
          {saveStatus === 'saving' ? (
            <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          )}
        </span>

        {/* Quick Map Side Length Button & Popover */}
        <div className="relative pl-1 border-l border-white/60" ref={mapSizeMenuRef}>
          <button
            type="button"
            data-testid="topbar-map-size-btn"
            onClick={() => setMapSizePopoverOpen((v) => !v)}
            title={
              language === 'en'
                ? `Map side length: ${currentMapSize}m × ${currentMapSize}m (click to customize)`
                : `当前地图边长：${currentMapSize}m × ${currentMapSize}m（点击自定义修改）`
            }
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold transition ${
              mapSizePopoverOpen
                ? 'bg-sky-600 text-white shadow-xs'
                : 'glass-btn text-slate-700 hover:text-slate-950'
            }`}
          >
            <span>{currentMapSize}m</span>
          </button>

          {mapSizePopoverOpen && (
            <div
              data-testid="topbar-map-size-popover"
              className="absolute left-0 top-9 w-64 rounded-2xl glass-drawer p-3 z-50 text-slate-800 whitespace-normal space-y-2 shadow-xl"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700">
                  {language === 'en' ? 'Map Side Length' : '自定义地图边长'}
                </span>
                <span className="font-mono font-semibold text-sky-700">
                  {currentMapSize} × {currentMapSize} m
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  data-testid="topbar-map-size-input"
                  min={MIN_MAP_SIZE}
                  max={MAX_MAP_SIZE}
                  step={10}
                  value={mapSizeDraft}
                  onChange={(e) => setMapSizeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = Number(mapSizeDraft);
                      if (Number.isFinite(val) && val > 0) {
                        const applied = setTerrainMapSize(val);
                        setMapSizeDraft(String(applied));
                        setMapSizePopoverOpen(false);
                      }
                    }
                  }}
                  className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] font-mono text-slate-400">m</span>
                <button
                  type="button"
                  data-testid="topbar-map-size-apply-btn"
                  onClick={() => {
                    const val = Number(mapSizeDraft);
                    if (!Number.isFinite(val) || val <= 0) return;
                    const applied = setTerrainMapSize(val);
                    setMapSizeDraft(String(applied));
                    setMapSizePopoverOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-sky-600 text-white text-[11px] font-semibold transition shrink-0"
                >
                  {language === 'en' ? 'Apply' : '应用'}
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[120, 240, 480, 960, 1600].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      const applied = setTerrainMapSize(sz);
                      setMapSizeDraft(String(applied));
                      setMapSizePopoverOpen(false);
                    }}
                    className={`py-1 rounded-md text-[10px] font-mono font-semibold border transition ${
                      currentMapSize === sz
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-sky-400'
                    }`}
                  >
                    {sz}m
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {(project.world.buildings.length > 0 || Boolean(project.world.heroCompound)) && (
          <div className="hidden 2xl:flex items-center gap-0.5 pl-1.5 border-l border-white/60">
            <MapPin className="w-3 h-3 text-sky-600 mr-0.5" />
            {(
              [
                { id: 'commercial_main', short: language === 'en' ? 'Main' : '主街' },
                { id: 'old_industrial', short: language === 'en' ? 'Ind.' : '工业' },
                { id: 'overpass_plaza', short: language === 'en' ? 'Plaza' : '高架' },
                { id: 'canal_bank', short: language === 'en' ? 'Canal' : '河岸' },
              ] as { id: DistrictId; short: string }[]
            ).map((d) => (
              <button
                key={d.id}
                onClick={() => teleportToDistrict(d.id)}
                title={language === 'en' ? `Fly to ${d.short}` : `飞往 ${d.short}`}
                className="glass-btn px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-700 hover:text-slate-950"
              >
                {d.short}
              </button>
            ))}
            {project.world.heroCompound && (
              <button
                onClick={teleportToHeroCompound}
                title={
                  language === 'en'
                    ? 'Fly to enterable 2-story hero compound'
                    : '飞往可进入两层复合建筑'
                }
                className="glass-btn flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-sky-700"
              >
                <Building2 className="w-3 h-3" />
                {tr(language, 'safeHouse')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center Floating Pill: Continuous 24h Time Scrubber + 4 Control Channels */}
      <div className="pointer-events-auto relative flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-full glass-panel p-1 text-slate-800">
        <button
          onClick={() => setTimeDialOpen((v) => !v)}
          title={
            language === 'en'
              ? 'Toggle 24h precision time scrubber'
              : '展开/收起 24 小时精细时间刻度拨条'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition shrink-0 ${
            timeDialOpen
              ? 'glass-btn-active'
              : 'glass-btn text-slate-800'
          }`}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: currentPeriod.dotColor }}
          />
          <span className="font-mono font-semibold tabular-nums">{currentTimeStr}</span>
          <span
            className={`text-[10px] hidden 2xl:inline ${
              timeDialOpen ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            {currentPeriod.tag}
          </span>
        </button>

        {/* Inline Continuous 24h Time Scrubber */}
        <div
          className="hidden 2xl:flex items-center px-1.5"
          title={
            language === 'en'
              ? 'Drag time scrubber (00:00 - 24:00) to adjust sunlight and sky in real time'
              : '拖动时间拨条（00:00 - 24:00）实时调整日照与天光'
          }
        >
          <input
            type="range"
            aria-label={language === 'en' ? 'Time Scrubber' : '时间拨条'}
            min={0}
            max={1435}
            step={5}
            value={currentMinutes}
            onChange={(e) => handleScrubTime(Number(e.target.value))}
            style={{ background: SKY_TRACK_GRADIENT }}
            className="w-20 h-1.5 rounded-full appearance-none cursor-pointer accent-slate-900"
          />
        </div>

        <div className="h-4 w-px bg-white/60" />

        <div className="flex items-center gap-0.5">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              className={`px-2 py-1 rounded-full text-[11px] font-semibold transition ${
                channel === ch.id
                  ? 'glass-btn-active'
                  : 'glass-btn text-slate-700 hover:text-slate-950'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/60" />

        <button
          onClick={toggleDefog}
          title={
            defogEnabled
              ? language === 'en'
                ? 'Global Defog Active: suppresses all scene fog in real time (project fog settings unchanged; click to restore)'
                : '全局去雾已开启：实时屏蔽所有场景雾效（不影响原工程雾效设定，再次点击恢复）'
              : language === 'en'
                ? `One-click Defog (current fog density ${(project.world.environment.fogDensity * 1000).toFixed(0)})`
                : `一键去雾（当前场景雾浓度 ${(project.world.environment.fogDensity * 1000).toFixed(0)}）`
          }
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition ${
            defogEnabled
              ? 'glass-btn-accent'
              : 'glass-btn text-slate-700 hover:text-slate-950'
          }`}
        >
          <CloudOff className="w-3 h-3 shrink-0" />
          <span className="hidden xl:inline">{defogEnabled ? tr(language, 'defogActive') : tr(language, 'defog')}</span>
          {!defogEnabled && project.world.environment.fogDensity > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500/80" />
          )}
        </button>

        <button
          type="button"
          data-testid="topbar-camera-collision-btn"
          onClick={toggleCameraCollision}
          title={
            cameraCollision
              ? tr(language, 'camCollisionOnDesc')
              : tr(language, 'camCollisionOffDesc')
          }
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition ${
            cameraCollision
              ? 'glass-btn-accent'
              : 'bg-amber-500/15 text-amber-800 border border-amber-400/50 hover:bg-amber-500/25'
          }`}
        >
          {cameraCollision ? (
            <ShieldCheck className="w-3 h-3 shrink-0" />
          ) : (
            <ShieldOff className="w-3 h-3 shrink-0" />
          )}
          <span className="hidden xl:inline">
            {cameraCollision
              ? tr(language, 'camCollisionOn')
              : tr(language, 'camCollisionOff')}
          </span>
        </button>

        {/* Expanded Precision 24h Time Ruler Popover */}
        {timeDialOpen && (
          <div className="absolute top-11 left-0 w-80 rounded-2xl glass-drawer p-3 space-y-2.5 text-slate-800 z-40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'en' ? 'Set Time of Day' : '片场时间拨条'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentPeriod.dotColor }}
                />
                <span className="font-bold tabular-nums">{currentTimeStr}</span>
                <span className="text-[11px] font-sans text-slate-500">
                  {currentPeriod.tag}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <input
                type="range"
                aria-label={language === 'en' ? 'Precision Time Scrubber' : '精细时间拨条'}
                min={0}
                max={1439}
                step={1}
                value={currentMinutes}
                onChange={(e) => handleScrubTime(Number(e.target.value))}
                style={{ background: SKY_TRACK_GRADIENT }}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer accent-slate-900"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5">
                {TIME_HOUR_MARKS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleScrubTime(h === 24 ? 1435 : h * 60)}
                    className="hover:text-slate-900 transition"
                  >
                    {String(h).padStart(2, '0')}:00
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-white/60">
              <span>
                {language === 'en' ? 'Sun Azimuth' : '太阳方位'} {project.world.environment.sunAzimuth}°
              </span>
              <span>
                {language === 'en' ? 'Elevation' : '高度角'} {project.world.environment.sunElevation}°
              </span>
              <button
                type="button"
                onClick={toggleDefog}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold transition ${
                  defogEnabled
                    ? 'glass-btn-accent'
                    : 'glass-btn text-slate-700'
                }`}
              >
                <CloudOff className="w-2.5 h-2.5" />
                {defogEnabled ? tr(language, 'defogActive') : tr(language, 'defog')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Floating Pill: Shot List Popover, Tools, Undo/Redo, API, Export */}
      <div className="pointer-events-auto flex items-center gap-1 whitespace-nowrap shrink-0 rounded-full glass-panel px-2 py-1 text-slate-700">
        <div ref={shotMenuRef} className="relative">
          <button
            data-testid="topbar-shot-list-btn"
            onClick={() => setShotPopoverOpen((v) => !v)}
            title={
              language === 'en'
                ? 'Open Shots List (Switch / Create / Rename Shots)'
                : '打开分镜列表（切换 / 新建 / 自定义分镜名称）'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
              shotPopoverOpen || shotsDrawerOpen
                ? 'glass-btn-accent'
                : 'glass-btn text-slate-800'
            }`}
          >
            <Film
              className={`w-3 h-3 shrink-0 ${
                shotPopoverOpen || shotsDrawerOpen ? 'text-white' : 'text-sky-600'
              }`}
            />
            <span className="max-w-[76px] 2xl:max-w-[96px] truncate">
              {translateDefaultEntityName(language, activeShot.name)}
            </span>
            <span
              className={`text-[10px] font-mono ${
                shotPopoverOpen || shotsDrawerOpen ? 'text-sky-100' : 'text-slate-500'
              }`}
            >
              {activeShotIdx + 1}/{project.shots.length}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${
                shotPopoverOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {shotPopoverOpen && (
            <div
              data-testid="topbar-shot-list-popover"
              className="absolute right-0 top-10 w-80 rounded-2xl glass-drawer p-3 z-50 text-slate-800 whitespace-normal"
            >
              <ShotListPanel
                compact
                onOpenFullDrawer={() => {
                  setShotPopoverOpen(false);
                  onToggleShotsDrawer();
                }}
              />
            </div>
          )}
        </div>

        <div className="hidden 2xl:flex items-center gap-0.5 pl-1 border-l border-white/60">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setTransformMode(m.id)}
              title={m.title}
              className={`p-1.5 rounded-full transition ${
                transformMode === m.id
                  ? 'glass-btn-accent'
                  : 'glass-btn text-slate-600 hover:text-slate-950'
              }`}
            >
              {m.icon}
            </button>
          ))}
          <button
            onClick={() => setGridSnap(!gridSnap)}
            title={language === 'en' ? 'Grid Snap (0.5m)' : '网格吸附 (0.5m)'}
            className={`p-1.5 rounded-full transition ${
              gridSnap
                ? 'glass-btn-accent'
                : 'glass-btn text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => {
            if (isEraserActive) {
              setPendingPlacement(null);
            } else {
              setPendingPlacement({
                kind: 'object_eraser',
                brushRadius: 10,
                eraseFilter: 'all',
                label:
                  language === 'en'
                    ? 'Region Object Eraser (10m)'
                    : '区域物体橡皮擦 (10m)',
              });
            }
          }}
          title={
            language === 'en'
              ? 'Region Object Eraser: hold Left Mouse & drag in 3D scene to erase objects in radius ([ / ] to resize, Esc to exit)'
              : '区域物体橡皮擦：在 3D 场景按住左键拖拽即可快速擦除区域内物体（按 [ / ] 调半径，Esc 退出）'
          }
          className={`inline-flex items-center gap-1 px-2 2xl:px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
            isEraserActive
              ? 'bg-rose-600/90 backdrop-blur-md text-white shadow-sm ring-2 ring-rose-400/40 border border-rose-300/60'
              : 'glass-btn text-rose-700 hover:text-rose-800'
          }`}
        >
          <Eraser className="w-3.5 h-3.5 shrink-0" />
          <span className={isEraserActive ? 'inline' : 'hidden 2xl:inline'}>
            {isEraserActive
              ? `${pendingPlacement?.brushRadius ?? 10}m`
              : tr(language, 'eraser')}
          </span>
        </button>

        <div className="flex items-center gap-0.5 px-1 border-l border-white/60">
          <button
            onClick={undo}
            disabled={past.length === 0}
            title={`${language === 'en' ? 'Undo' : '撤销'} (${formatKeyLabel(keybindings.undo, language)})`}
            className="glass-btn p-1.5 rounded-full disabled:opacity-35"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            title={`${language === 'en' ? 'Redo' : '重做'} (${formatKeyLabel(keybindings.redo, language)})`}
            className="glass-btn p-1.5 rounded-full disabled:opacity-35"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            data-testid="topbar-new-project-btn"
            onClick={() => {
              setProjectPopoverOpen(true);
              setFocusNewProjectTick((n) => n + 1);
            }}
            title={
              language === 'en'
                ? 'New Empty Venue (rename & manage)'
                : '新建空白场地（可自定义名称与管理删除）'
            }
            className={`glass-btn p-1.5 rounded-full hidden sm:inline-flex ${
              projectPopoverOpen ? 'ring-1 ring-sky-400/70 text-sky-700' : ''
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title={language === 'en' ? 'Import project from local (.json)' : '从本地导入工程文件 (.json)'}
            className="glass-btn inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-slate-700"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">{tr(language, 'importJson')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={handleExportJson}
            title={language === 'en' ? 'Save current project locally (.json)' : '保存当前工程到本地 (.json)'}
            className="glass-btn inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">{tr(language, 'saveJson')}</span>
          </button>
        </div>

        {/* Co-Creation Multi-User Collaboration Pill */}
        <div className="relative" ref={collabMenuRef}>
          <button
            type="button"
            data-testid="topbar-collab-btn"
            onClick={() => setCollabPanelOpen(!collabPanelOpen)}
            title={
              language === 'en'
                ? 'Multi-user Co-Creation (LAN or Cloud real-time collaborative canvas)'
                : '多人共创模式（本地或云服务器实时同画布协同）'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
              collabStatus === 'connected'
                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                : collabStatus === 'connecting' || collabStatus === 'reconnecting'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : collabPanelOpen
                    ? 'glass-btn-active'
                    : 'glass-btn text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>
              {collabStatus === 'connected'
                ? language === 'en'
                  ? `Co-Create · ${Math.max(1, collabPeers.length)}`
                  : `共创 · ${Math.max(1, collabPeers.length)}人`
                : collabStatus === 'connecting' || collabStatus === 'reconnecting'
                  ? language === 'en'
                    ? 'Connecting...'
                    : '连接中...'
                  : language === 'en'
                    ? 'Co-Create'
                    : '共创'}
            </span>
            {collabStatus === 'connected' && collabPeers.length > 0 && (
              <span className="hidden 2xl:inline-flex items-center -space-x-1 ml-0.5">
                {collabPeers.slice(0, 4).map((peer) => (
                  <span
                    key={peer.clientId}
                    className="w-2.5 h-2.5 rounded-full ring-1 ring-white"
                    style={{ backgroundColor: peer.color }}
                  />
                ))}
              </span>
            )}
          </button>

          {collabPanelOpen && (
            <div
              data-testid="topbar-collab-popover"
              className="absolute right-0 top-10 w-80 sm:w-[340px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-2xl glass-drawer p-3.5 z-50 text-slate-800 whitespace-normal shadow-xl"
            >
              <CollabPanel onClose={() => setCollabPanelOpen(false)} />
            </div>
          )}
        </div>

        {/* Co-Creation Room Chat Toggle Pill */}
        {collabStatus === 'connected' && (
          <button
            type="button"
            data-testid="topbar-collab-chat-btn"
            onClick={() => setChatOpen(!chatOpen)}
            title={
              language === 'en'
                ? 'Toggle Room Chat Window (LAN & Cloud)'
                : '打开/收起房间实时聊天窗口（局域网 & 云联机通用）'
            }
            className={`relative inline-flex items-center gap-1 px-2 2xl:px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
              chatOpen
                ? 'bg-sky-600 text-white shadow-xs'
                : 'glass-btn text-slate-800'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline">{language === 'en' ? 'Chat' : '聊天'}</span>
            {unreadChatCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </button>
        )}

        {/* Master Settings Button: Graphics Quality (Low / Medium / High) + Language + Studio Preferences */}
        <button
          onClick={() => setSettingsModalOpen(true)}
          title={
            language === 'en'
              ? `Studio Settings (Quality: ${graphicsQuality.toUpperCase()} · Language: English)`
              : `设置总开关（画质：${graphicsQuality.toUpperCase()} · 语言：简体中文）`
          }
          aria-label={language === 'en' ? 'Studio Settings' : '系统总设置'}
          className={`inline-flex items-center gap-1 px-2 2xl:px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
            settingsModalOpen
              ? 'glass-btn-active'
              : 'glass-btn text-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="hidden 2xl:inline">{tr(language, 'settings')}</span>
        </button>

        {isRecordingCamera && (
          <button
            onClick={stopCameraRecording}
            title={language === 'en' ? 'Click to stop camera recording' : '点击停止实时录制运镜'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600/90 backdrop-blur-md hover:bg-rose-700 text-white text-[11px] font-semibold animate-pulse transition"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>{tr(language, 'recordingCam')}</span>
          </button>
        )}

        <div className="relative flex items-center">
          <button
            onClick={() => onExportVideo()}
            disabled={isExporting}
            title={
              language === 'en'
                ? `Export WebM video using current ${channel.toUpperCase()} channel`
                : `按当前 ${channel.toUpperCase()} 通道导出 WebM 视频`
            }
            className="glass-btn-active flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-l-full disabled:opacity-50 text-xs font-semibold transition whitespace-nowrap shrink-0"
          >
            <Film className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{tr(language, 'exportVideo')}</span>
          </button>
          <button
            onClick={() => setExportMenuOpen((v) => !v)}
            disabled={isExporting}
            title={
              language === 'en'
                ? 'Choose channel (Color / Depth / Normal / Clay) to export'
                : '选择指定通道（Color / Depth / Normal / Clay）导出视频'
            }
            className="glass-btn-active px-1.5 py-1.5 rounded-r-full border-l border-white/15 disabled:opacity-50 text-slate-200 transition"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 top-10 w-44 rounded-2xl glass-drawer p-1.5 z-50 space-y-0.5 text-xs">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {language === 'en' ? 'Select Export Channel (WebM)' : '选择导出通道视频 (WebM)'}
              </div>
              {CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExportVideo(ch.id);
                  }}
                  className="glass-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-slate-800 font-medium"
                >
                  <span>
                    {language === 'en' ? `${ch.label} Video` : `${ch.label} 通道视频`}
                  </span>
                  {channel === ch.id && (
                    <span className="text-[10px] text-sky-600 font-semibold">
                      {language === 'en' ? 'Active' : '当前'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
