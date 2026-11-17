import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Circle,
  Film,
  Gauge,
  HelpCircle,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Square,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import {
  formatPresetLabel,
  getExportResolution,
  POSE_PRESETS,
} from '../../data/presets';
import { translateDefaultEntityName } from '../../i18n/translations';
import { useStudioStore } from '../../store/useStudioStore';
import type { KeyframeInterpolation, Vec3 } from '../../types/scene';

interface TimelineBarProps {
  onClose?: () => void;
  onGetShotCamera: () => {
    position: Vec3;
    target: Vec3;
    focalLength: number;
  };
  onMatchDirectorView: () => void;
}

function formatTimecode(seconds: number, fps: number): string {
  const totalFrames = Math.floor(seconds * fps);
  const f = totalFrames % fps;
  const totalSec = Math.floor(seconds);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(
    f
  ).padStart(2, '0')}`;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  onClose,
  onGetShotCamera,
  onMatchDirectorView,
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
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const isLooping = useStudioStore((s) => s.isLooping);
  const setIsLooping = useStudioStore((s) => s.setIsLooping);
  const playbackRate = useStudioStore((s) => s.playbackRate);
  const setPlaybackRate = useStudioStore((s) => s.setPlaybackRate);
  const isRecordingCamera = useStudioStore((s) => s.isRecordingCamera);
  const startCameraRecording = useStudioStore((s) => s.startCameraRecording);
  const stopCameraRecording = useStudioStore((s) => s.stopCameraRecording);
  const autoKeyCharacter = useStudioStore((s) => s.autoKeyCharacter);
  const setAutoKeyCharacter = useStudioStore((s) => s.setAutoKeyCharacter);

  const setShotDuration = useStudioStore((s) => s.setShotDuration);
  const switchShot = useStudioStore((s) => s.switchShot);
  const addOrUpdateKeyframe = useStudioStore((s) => s.addOrUpdateKeyframe);
  const removeKeyframe = useStudioStore((s) => s.removeKeyframe);
  const setShotKeyframes = useStudioStore((s) => s.setShotKeyframes);
  const addOrUpdateCharacterKeyframe = useStudioStore(
    (s) => s.addOrUpdateCharacterKeyframe
  );
  const removeCharacterKeyframe = useStudioStore(
    (s) => s.removeCharacterKeyframe
  );
  const setCharacterKeyframeInterpolation = useStudioStore(
    (s) => s.setCharacterKeyframeInterpolation
  );
  const clearCharacterTrack = useStudioStore((s) => s.clearCharacterTrack);

  const characters = project.world.characters;
  const [trackedCharId, setTrackedCharId] = useState<string>(
    characters[0]?.id ?? ''
  );
  const [showGuide, setShowGuide] = useState(false);
  const [speedPopoverOpen, setSpeedPopoverOpen] = useState(false);
  const speedPopoverRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);

  useEffect(() => {
    if (!speedPopoverOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        speedPopoverRef.current &&
        !speedPopoverRef.current.contains(e.target as Node)
      ) {
        setSpeedPopoverOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [speedPopoverOpen]);

  useEffect(() => {
    if (selectedId && characters.some((c) => c.id === selectedId)) {
      setTrackedCharId(selectedId);
    } else if (!characters.some((c) => c.id === trackedCharId)) {
      setTrackedCharId(characters[0]?.id ?? '');
    }
  }, [selectedId, characters, trackedCharId]);

  const activeChar = characters.find((c) => c.id === trackedCharId) ?? characters[0];
  const charTrack = useMemo(
    () =>
      activeChar
        ? [...(shot.characterTracks?.[activeChar.id] ?? [])].sort(
            (a, b) => a.time - b.time
          )
        : [],
    [activeChar, shot.characterTracks]
  );

  const cameraKfs = useMemo(
    () => [...shot.keyframes].sort((a, b) => a.time - b.time),
    [shot.keyframes]
  );

  const allKeyTimes = useMemo(() => {
    const times = new Set<number>([0, shot.duration]);
    cameraKfs.forEach((kf) => times.add(Number(kf.time.toFixed(2))));
    charTrack.forEach((ckf) => times.add(Number(ckf.time.toFixed(2))));
    return [...times].sort((a, b) => a - b);
  }, [cameraKfs, charTrack, shot.duration]);

  const exportRes = getExportResolution(shot.aspectRatio);

  const handleAddPhysicalCamKeyframe = () => {
    const cam = onGetShotCamera();
    addOrUpdateKeyframe({
      time: Number(currentTime.toFixed(2)),
      position: cam.position,
      target: cam.target,
      focalLength: cam.focalLength,
    });
  };

  const handleCycleInterp = (
    charId: string,
    kfId: string,
    cur?: KeyframeInterpolation
  ) => {
    const next: KeyframeInterpolation =
      cur === 'step' ? 'smooth' : cur === 'linear' ? 'step' : 'linear';
    setCharacterKeyframeInterpolation(charId, kfId, next);
  };

  const scrubFromClientX = (clientX: number) => {
    const el = rulerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const step = 1 / Math.max(1, shot.fps);
    const snapped = Math.round((ratio * shot.duration) / step) * step;
    setCurrentTime(Number(Math.max(0, Math.min(shot.duration, snapped)).toFixed(2)));
  };

  const jumpPrevKey = () => {
    if (isRecordingCamera) stopCameraRecording();
    setIsPlaying(false);
    const prev = [...allKeyTimes].reverse().find((t) => t < currentTime - 0.05);
    setCurrentTime(prev ?? 0);
  };

  const jumpNextKey = () => {
    if (isRecordingCamera) stopCameraRecording();
    setIsPlaying(false);
    const next = allKeyTimes.find((t) => t > currentTime + 0.05);
    setCurrentTime(next ?? shot.duration);
  };

  const progressPct = Math.max(
    0,
    Math.min(100, (currentTime / Math.max(0.1, shot.duration)) * 100)
  );

  // Adaptive step-by-step guidance so beginners always know what to do next
  const nextStepHint = useMemo(() => {
    if (isRecordingCamera) {
      return en
        ? 'Recording camera motion: orbit or dolly in the 3D viewport, then click "Stop Rec" when done'
        : '正在录运镜：直接在 3D 视口中转动/推拉视角，完成后点「停止录制」';
    }
    const camCount = cameraKfs.length;
    const charCount = charTrack.length;
    if (camCount === 0 && charCount === 0) {
      return en
        ? '3 Quick Steps: 1) Scrub timeline to second N -> 2) Adjust camera view or character pose -> 3) Click "+ Key View / + Key Action" below'
        : '新手三步：① 点/拖时间尺选第 N 秒 → ② 调整视角或移动角色姿势 → ③ 点下方「+ 记当前视角 / + 记当前动作」';
    }
    if (camCount === 1 && charCount <= 1) {
      return en
        ? `Key 1 saved (${cameraKfs[0].time.toFixed(1)}s) · Drag ruler to another second, reframe view, and click "+ Key View" to animate camera`
        : `已记第 1 帧 (${cameraKfs[0].time.toFixed(1)}s) · 请拖动上方时间尺到另一秒，换个视角再点「+ 记当前视角」，就会自动运镜`;
    }
    if (charCount === 1 && camCount !== 1) {
      return en
        ? `Character has 1 key (${charTrack[0].time.toFixed(1)}s) · Move ruler to another second, reposition or repose, then key again to animate`
        : `角色已有 1 帧 (${charTrack[0].time.toFixed(1)}s) · 拖时间尺换个秒数，移动角色或改姿势后再记 1 帧，人物就会动起来`;
    }
    return en
      ? `${camCount} cam key(s) · ${charCount} char key(s) · Click ◆ on tracks to jump & edit, or click "Play" to preview`
      : `已设 ${camCount} 个镜头帧 · ${charCount} 个角色帧 · 点击轨道上的 ◆ 可快速跳转修改，点「播放」预览动画`;
  }, [isRecordingCamera, cameraKfs, charTrack, en]);

  // Ruler second ticks
  const rulerTicks = useMemo(() => {
    const stepSec = shot.duration >= 16 ? 4 : shot.duration >= 10 ? 2 : 1;
    const ticks: number[] = [];
    for (let t = 0; t <= shot.duration + 0.001; t += stepSec) {
      ticks.push(Math.min(shot.duration, t));
    }
    return ticks;
  }, [shot.duration]);

  return (
    <footer className="pointer-events-auto fixed bottom-[4.5rem] left-1/2 -translate-x-1/2 z-30 w-[min(700px,calc(100vw-20rem))] min-w-[420px] rounded-2xl glass-drawer px-3 py-2 text-slate-800 space-y-1.5">
      {/* Row 1: Transport & Quick Workflow Strip */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <div
            className="glass-btn flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-700"
            title={en ? 'Quick switch active shot' : '快速切换当前分镜'}
          >
            <Film className="w-3 h-3 text-sky-600 shrink-0" />
            <select
              value={shot.id}
              onChange={(e) => switchShot(e.target.value)}
              className="bg-transparent max-w-[90px] truncate focus:outline-none cursor-pointer"
            >
              {project.shots.map((s) => (
                <option key={s.id} value={s.id}>
                  {translateDefaultEntityName(language, s.name)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (isRecordingCamera) stopCameraRecording();
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            title={en ? 'Back to 0.0s' : '回到 0.0s 起点'}
            className="glass-btn p-1.5 rounded-full text-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={jumpPrevKey}
            title={en ? 'Jump to previous keyframe / start' : '跳转到上一个关键帧 / 起点'}
            className="glass-btn p-1.5 rounded-full text-slate-700"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (isRecordingCamera) {
                stopCameraRecording();
              } else {
                setIsPlaying(!isPlaying);
              }
            }}
            title={en ? 'Play / Pause Previs (Space)' : '播放 / 暂停预演 (Space)'}
            className="glass-btn-active flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isPlaying ? (en ? 'Pause' : '暂停') : en ? 'Play' : '播放'}
          </button>

          <button
            onClick={jumpNextKey}
            title={en ? 'Jump to next keyframe / end' : '跳转到下一个关键帧 / 终点'}
            className="glass-btn p-1.5 rounded-full text-slate-700"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            title={
              isLooping
                ? en
                  ? 'Loop Playback: ON'
                  : '循环播放：已开启'
                : en
                  ? 'Loop Playback: OFF'
                  : '循环播放：已关闭'
            }
            className={`p-1.5 rounded-full transition ${
              isLooping
                ? 'glass-btn-accent'
                : 'glass-btn text-slate-500 hover:text-slate-800'
            }`}
          >
            <Repeat className="w-3 h-3" />
          </button>

          {/* Timeline Playback Speed Control */}
          <div className="relative" ref={speedPopoverRef}>
            <button
              type="button"
              data-testid="timeline-speed-btn"
              onClick={() => setSpeedPopoverOpen((v) => !v)}
              title={
                en
                  ? `Timeline Playback Speed: ${playbackRate}× (click to adjust 0.1× ~ 4.0×)`
                  : `时间轴变速播放：当前 ${playbackRate}×（点击调节 0.1× ~ 4.0×）`
              }
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold transition ${
                speedPopoverOpen || playbackRate !== 1
                  ? 'glass-btn-accent'
                  : 'glass-btn text-slate-700 hover:text-slate-950'
              }`}
            >
              <Gauge className="w-3 h-3 shrink-0" />
              <span>{Number(playbackRate.toFixed(2))}×</span>
            </button>

            {speedPopoverOpen && (
              <div
                data-testid="timeline-speed-popover"
                className="absolute bottom-9 left-0 w-64 rounded-2xl glass-drawer p-2.5 z-50 text-slate-800 space-y-2 shadow-xl"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-700">
                    {en ? 'Timeline Speed (Preview)' : '时间轴变速（预览倍速）'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      data-testid="timeline-speed-value"
                      className="font-mono font-bold text-sky-700"
                    >
                      {Number(playbackRate.toFixed(2))}×
                    </span>
                    {playbackRate !== 1 && (
                      <button
                        type="button"
                        data-testid="timeline-speed-reset"
                        onClick={() => setPlaybackRate(1)}
                        className="px-1.5 py-0.5 rounded-full bg-white/80 hover:bg-sky-100 text-[9px] font-semibold text-slate-600"
                      >
                        {en ? '1× Normal' : '1× 原速'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {[0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      data-testid={`timeline-speed-preset-${preset}`}
                      onClick={() => setPlaybackRate(preset)}
                      className={`py-1 rounded-lg text-[10px] font-mono font-semibold transition ${
                        Math.abs(playbackRate - preset) < 0.01
                          ? 'glass-btn-accent'
                          : 'glass-card hover:bg-white/90 text-slate-700'
                      }`}
                    >
                      {preset}×
                    </button>
                  ))}
                </div>

                <div className="space-y-1 pt-0.5">
                  <input
                    data-testid="timeline-speed-slider"
                    type="range"
                    min={0.1}
                    max={4.0}
                    step={0.05}
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer h-1.5"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>{en ? '0.1× Slow' : '0.1× 慢放'}</span>
                    <span>1.0×</span>
                    <span>{en ? '4.0× Fast' : '4.0× 快进'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="font-mono text-[11px] bg-white/55 border border-white/75 rounded-full px-2.5 py-0.5 text-slate-700 flex items-center gap-1">
            <span className="text-sky-700 font-bold">
              {currentTime.toFixed(1)}s
            </span>
            <span className="text-slate-400">/ {shot.duration}s</span>
            <span className="hidden md:inline text-[10px] text-slate-400">
              ({formatTimecode(currentTime, shot.fps)})
            </span>
          </div>

          <select
            value={shot.duration}
            onChange={(e) => setShotDuration(Number(e.target.value))}
            className="glass-btn rounded-full px-2 py-0.5 text-[11px] font-medium text-slate-700 focus:outline-none cursor-pointer"
            title={en ? 'Set total shot duration' : '设置当前镜头总时长'}
          >
            <option value={4}>{en ? 'Dur 4s' : '总长 4s'}</option>
            <option value={5}>{en ? 'Dur 5s' : '总长 5s'}</option>
            <option value={6}>{en ? 'Dur 6s' : '总长 6s'}</option>
            <option value={8}>{en ? 'Dur 8s' : '总长 8s'}</option>
            <option value={12}>{en ? 'Dur 12s' : '总长 12s'}</option>
            <option value={20}>{en ? 'Dur 20s' : '总长 20s'}</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            {exportRes.width}×{exportRes.height} · {shot.aspectRatio}
          </span>
          <button
            onClick={() => setShowGuide((v) => !v)}
            title={en ? 'Show timeline instructions' : '查看时间轴操作说明'}
            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition ${
              showGuide
                ? 'glass-btn-accent'
                : 'glass-btn text-slate-600'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            {en ? 'Help' : '怎么用'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title={en ? 'Collapse timeline' : '收起时间轴'}
              className="glass-btn p-1 rounded-full text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contextual Workflow Bar (Always tells user clearly what to do) */}
      <div
        className={`rounded-lg px-2.5 py-1 text-[10px] flex items-center justify-between gap-2 ${
          isRecordingCamera
            ? 'bg-rose-50 border border-rose-200 text-rose-800 font-medium'
            : 'bg-slate-50 border border-slate-200/80 text-slate-600'
        }`}
      >
        <span className="truncate">{nextStepHint}</span>
      </div>

      {showGuide && (
        <div className="rounded-xl bg-sky-50/90 border border-sky-200 px-2.5 py-2 text-[10px] text-sky-950 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <div>
            <span className="font-bold text-sky-700">
              {en ? '1. Dolly / Orbit Camera: ' : '1. 做镜头推拉/环绕：'}
            </span>
            {en
              ? 'Click ruler at 0s -> orbit director view -> click "+ Key View"; click 4s -> reframe -> "+ Key View", then Play for smooth camera motion!'
              : '先点时间条到 0s → 旋转导演视角 → 点「+ 记当前视角」；再点时间条到 4s → 换一个视角 → 点「+ 记当前视角」，点播放即可自动平滑运镜！'}
          </div>
          <div>
            <span className="font-bold text-amber-700">
              {en ? '2. Animate Character / Pose: ' : '2. 做人物移动/换动作：'}
            </span>
            {en
              ? 'Drag ruler to target time -> move character or change pose on right -> click "+ Key Action" (or enable "Auto-Key" to record automatically).'
              : '拖时间条到目标秒数 → 拖动人物位置或在右侧改姿势 → 点「+ 记当前动作」（或打开「自动记帧」自动记录）。'}
          </div>
        </div>
      )}

      {/* Row 2: Interactive Scrubbable Ruler + Separate Camera & Character Diamond Tracks */}
      <div
        ref={rulerRef}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          isScrubbingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          if (isRecordingCamera) stopCameraRecording();
          setIsPlaying(false);
          scrubFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!isScrubbingRef.current) return;
          scrubFromClientX(e.clientX);
        }}
        onPointerUp={(e) => {
          if (isScrubbingRef.current) {
            isScrubbingRef.current = false;
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
              // ignore
            }
          }
        }}
        onPointerCancel={() => {
          isScrubbingRef.current = false;
        }}
        className="relative select-none cursor-ew-resize rounded-xl bg-slate-100/90 border border-slate-200/90 px-2.5 pt-4 pb-1.5 space-y-1"
        title={en ? 'Click or drag horizontally to scrub time' : '点击或左右拖拽任意位置来定位当前时间点'}
      >
        {/* Second Ticks along top edge */}
        <div className="pointer-events-none absolute top-0.5 left-2.5 right-2.5 h-3">
          {rulerTicks.map((t) => {
            const pct = (t / Math.max(0.1, shot.duration)) * 100;
            return (
              <div
                key={t}
                style={{ left: `${pct}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
              >
                <span className="text-[9px] font-mono leading-none text-slate-400">
                  {t}s
                </span>
                <span className="w-px h-1 bg-slate-300 mt-0.5" />
              </div>
            );
          })}
        </div>

        {/* Camera Track Bar */}
        <div className="relative h-3 rounded-full bg-sky-100/80 border border-sky-200/70">
          <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-sky-700/75">
            {en ? 'Cam' : '镜头'}
          </span>
          {cameraKfs.map((kf) => {
            const pct = Math.max(0, Math.min(100, (kf.time / shot.duration) * 100));
            const isNear = Math.abs(kf.time - currentTime) < 0.08;
            return (
              <button
                key={kf.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isRecordingCamera) stopCameraRecording();
                  setIsPlaying(false);
                  setCurrentTime(kf.time);
                }}
                style={{ left: `${pct}%` }}
                title={
                  en
                    ? `Camera Key ${kf.time.toFixed(1)}s · ${Math.round(kf.focalLength)}mm (click to jump)`
                    : `镜头关键帧 ${kf.time.toFixed(1)}s · ${Math.round(kf.focalLength)}mm（点击跳到此处）`
                }
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] leading-none transition-transform hover:scale-125 ${
                  isNear ? 'text-sky-600 scale-125 drop-shadow' : 'text-sky-500'
                }`}
              >
                ◆
              </button>
            );
          })}
        </div>

        {/* Character Track Bar */}
        <div className="relative h-3 rounded-full bg-amber-100/70 border border-amber-200/70">
          <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-amber-700/75">
            {en ? 'Char' : '角色'}
          </span>
          {charTrack.map((ckf) => {
            const pct = Math.max(0, Math.min(100, (ckf.time / shot.duration) * 100));
            const isNear = Math.abs(ckf.time - currentTime) < 0.08;
            const poseName = POSE_PRESETS[ckf.pose]
              ? formatPresetLabel(POSE_PRESETS[ckf.pose].label, language)
              : ckf.pose;
            return (
              <button
                key={ckf.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isRecordingCamera) stopCameraRecording();
                  setIsPlaying(false);
                  setCurrentTime(ckf.time);
                  if (activeChar) selectObject(activeChar.id);
                }}
                style={{ left: `${pct}%` }}
                title={
                  en
                    ? `Character Key ${ckf.time.toFixed(1)}s · ${poseName} (click to jump)`
                    : `角色关键帧 ${ckf.time.toFixed(1)}s · ${poseName}（点击跳到此处）`
                }
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] leading-none transition-transform hover:scale-125 ${
                  isNear ? 'text-amber-600 scale-125 drop-shadow' : 'text-amber-500'
                }`}
              >
                ◆
              </button>
            );
          })}
        </div>

        {/* Vertical Playhead Needle */}
        <div
          style={{ left: `calc(10px + (100% - 20px) * ${progressPct / 100})` }}
          className="pointer-events-none absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center z-20"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white shadow" />
          <div className="w-0.5 flex-1 bg-rose-500/85" />
        </div>
      </div>

      {/* Row 3: Track 1 - Camera Keyframes */}
      <div className="flex items-center gap-1.5 text-[10px]">
        <div className="flex items-center gap-1 shrink-0 font-semibold text-sky-800 bg-sky-50 border border-sky-200/80 rounded-full px-2 py-0.5">
          <Video className="w-3 h-3" />
          <span>{en ? 'Cam' : '镜头'}</span>
        </div>

        <button
          onClick={onMatchDirectorView}
          title={
            en
              ? 'Save the current viewport camera framing as a keyframe at the current time'
              : '把当前在画面里看到的视角，记录为当前时间点的镜头位置'
          }
          className="shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white font-semibold transition shadow-sm"
        >
          <Camera className="w-3 h-3" />
          {en ? '+ Key View' : '+ 记当前视角'}
        </button>

        <button
          onClick={() =>
            isRecordingCamera ? stopCameraRecording() : startCameraRecording()
          }
          title={
            en
              ? 'Playhead advances while you orbit/dolly in viewport to live-record a camera path'
              : '点击后直接转动视口视角，播放头会自动前进并实时录下整段运镜轨迹'
          }
          className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold transition ${
            isRecordingCamera
              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
              : 'bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-700'
          }`}
        >
          {isRecordingCamera ? (
            <>
              <Square className="w-2.5 h-2.5 fill-current" />
              {en ? 'Stop Rec' : '停止录制'}
            </>
          ) : (
            <>
              <Circle className="w-2.5 h-2.5 fill-current" />
              {en ? 'Rec Live' : '实况录运镜'}
            </>
          )}
        </button>

        <button
          onClick={handleAddPhysicalCamKeyframe}
          title={
            en
              ? 'If you moved the physical 3D camera rig in scene, key its position here'
              : '若你是用轴移动了场景里的「摄影机白模」，点此按机位框位置记帧'
          }
          className="shrink-0 px-1.5 py-0.5 rounded-full bg-slate-900/5 hover:bg-slate-900/10 text-slate-600 font-medium transition"
        >
          {en ? 'Sync Rig' : '同步机位框'}
        </button>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 min-w-0 flex-1">
          {cameraKfs.length === 0 ? (
            <span className="text-[10px] text-slate-400 truncate">
              {en
                ? 'No camera keys · Pick a time and click "+ Key View"'
                : '暂无镜头帧 · 选好秒数后点「+ 记当前视角」'}
            </span>
          ) : (
            <>
              {cameraKfs.map((kf, idx) => {
                const isNear = Math.abs(kf.time - currentTime) < 0.08;
                return (
                  <div
                    key={kf.id}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 shrink-0 border ${
                      isNear
                        ? 'bg-sky-100 border-sky-400 text-sky-900'
                        : 'bg-slate-900/5 border-slate-200 text-slate-700'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentTime(kf.time);
                      }}
                      className="flex items-center gap-0.5 hover:underline font-mono font-semibold"
                    >
                      <span className="text-sky-600">◆</span>
                      #{idx + 1} {kf.time.toFixed(1)}s
                    </button>
                    <button
                      onClick={() => removeKeyframe(kf.id)}
                      title={en ? 'Delete this camera keyframe' : '删除此镜头关键帧'}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
              {cameraKfs.length > 1 && (
                <button
                  onClick={() => setShotKeyframes([])}
                  title={en ? 'Clear all camera keyframes' : '清空所有镜头关键帧'}
                  className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  {en ? 'Clear' : '清空'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Row 4: Track 2 - Character Action Keyframes (always shown for discoverability) */}
      <div className="flex items-center gap-1.5 text-[10px] border-t border-slate-200/70 pt-1.5">
        {characters.length === 0 || !activeChar ? (
          <>
            <div className="flex items-center gap-1 shrink-0 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 text-slate-500 font-semibold">
              <User className="w-3 h-3" />
              <span>{en ? 'Char' : '角色'}</span>
            </div>
            <span className="text-[10px] text-slate-400 truncate">
              {en
                ? 'No character in scene · Add one from "Assets -> Characters" on the left to keyframe movement & poses'
                : '场景暂无人物 · 先从左侧「资产 → 角色」放入白模人物，即可给它添加位移与动作关键帧'}
            </span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 shrink-0 bg-amber-50 border border-amber-200/80 rounded-full px-1.5 py-0.5 text-amber-900 font-semibold">
              <User className="w-3 h-3 text-amber-600" />
              <select
                value={activeChar.id}
                onChange={(e) => {
                  setTrackedCharId(e.target.value);
                  selectObject(e.target.value);
                }}
                className="bg-transparent font-semibold text-amber-900 focus:outline-none cursor-pointer max-w-[78px]"
                title={en ? 'Select character to animate' : '选择要编辑动画的角色'}
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {translateDefaultEntityName(language, c.name)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => addOrUpdateCharacterKeyframe(activeChar.id)}
              title={
                en
                  ? 'Record character position, facing, and pose at current time'
                  : '记录该角色在当前秒数的位置、朝向和姿势'
              }
              className="shrink-0 flex items-center gap-0.5 px-2.5 py-0.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-semibold transition shadow-sm"
            >
              <Plus className="w-2.5 h-2.5" />
              {en ? 'Key Action' : '记当前动作'}
            </button>

            <button
              onClick={() => setAutoKeyCharacter(!autoKeyCharacter)}
              title={
                en
                  ? 'When ON: moving or re-posing character at a new time automatically records a keyframe'
                  : '开启后：换时间点并移动人物或改姿势时，会自动为你记一帧'
              }
              className={`shrink-0 px-2 py-0.5 rounded-full border font-medium transition ${
                autoKeyCharacter
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              {en
                ? `Auto-Key:${autoKeyCharacter ? 'ON' : 'OFF'}`
                : `自动记帧:${autoKeyCharacter ? '开' : '关'}`}
            </button>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 min-w-0 flex-1">
              {charTrack.length === 0 ? (
                <span className="text-[10px] text-slate-400 truncate">
                  {en
                    ? 'No action keys · Drag ruler -> move/repose character -> click "+ Key Action"'
                    : '暂无动作帧 · 拖时间条到目标秒数 → 移动人物/改姿势 → 点「+ 记当前动作」'}
                </span>
              ) : (
                <>
                  {charTrack.map((ckf) => {
                    const isNear = Math.abs(ckf.time - currentTime) < 0.08;
                    const poseLabel = POSE_PRESETS[ckf.pose]
                      ? formatPresetLabel(POSE_PRESETS[ckf.pose].label, language)
                      : ckf.pose;
                    const interpText = en
                      ? ckf.interpolation === 'step'
                        ? 'Step'
                        : ckf.interpolation === 'linear'
                          ? 'Linear'
                          : 'Smooth'
                      : ckf.interpolation === 'step'
                        ? '定格'
                        : ckf.interpolation === 'linear'
                          ? '线性'
                          : '平滑';
                    return (
                      <div
                        key={ckf.id}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 shrink-0 border ${
                          isNear
                            ? 'bg-amber-100 border-amber-400 text-amber-950'
                            : 'bg-slate-900/5 border-slate-200 text-slate-700'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setIsPlaying(false);
                            setCurrentTime(ckf.time);
                            selectObject(activeChar.id);
                          }}
                          className="flex items-center gap-0.5 hover:underline font-mono font-semibold"
                        >
                          <span className="text-amber-600">◆</span>
                          {ckf.time.toFixed(1)}s·{poseLabel}
                        </button>
                        <button
                          onClick={() =>
                            handleCycleInterp(activeChar.id, ckf.id, ckf.interpolation)
                          }
                          title={
                            en
                              ? 'Cycle interpolation: Smooth / Linear / Step'
                              : '点击切换过渡方式：平滑 / 线性 / 定格'
                          }
                          className="text-[9px] px-1 rounded bg-white/80 border border-slate-200 text-slate-500 hover:text-slate-800"
                        >
                          {interpText}
                        </button>
                        <button
                          onClick={() => removeCharacterKeyframe(activeChar.id, ckf.id)}
                          title={en ? 'Delete this action keyframe' : '删除此动作关键帧'}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                  {charTrack.length > 1 && (
                    <button
                      onClick={() => clearCharacterTrack(activeChar.id)}
                      title={
                        en
                          ? 'Clear action keyframes for this character'
                          : '清空该角色的动作关键帧'
                      }
                      className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      {en ? 'Clear' : '清空'}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </footer>
  );
};
