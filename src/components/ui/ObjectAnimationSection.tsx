import React from 'react';
import { Play, RotateCcw, Sparkles } from 'lucide-react';
import {
  OBJECT_ANIMATION_PRESETS,
  getAvailableAnimationsForObject,
} from '../../engine/objectAnimations';
import { useStudioStore } from '../../store/useStudioStore';
import type {
  ObjectAnimationPreset,
  ObjectAnimationSpec,
  PropType,
} from '../../types/scene';

interface ObjectAnimationSectionProps {
  objectId: string;
  objectKind: 'asset' | 'building' | 'hero_compound' | 'custom_model' | 'gltf_model';
  propType?: PropType;
  animation?: ObjectAnimationSpec;
}

export const ObjectAnimationSection: React.FC<ObjectAnimationSectionProps> = ({
  objectId,
  objectKind,
  propType,
  animation,
}) => {
  const language = useStudioStore((s) => s.language);
  const en = language === 'en';
  const tx = (zhText: string, enText: string) => (en ? enText : zhText);
  const setObjectAnimation = useStudioStore((s) => s.setObjectAnimation);
  const currentTime = useStudioStore((s) => s.currentTime);
  const setCurrentTime = useStudioStore((s) => s.setCurrentTime);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const activeProject = useStudioStore((s) => s.getActiveProject());
  const shot =
    activeProject.shots.find((sh) => sh.id === activeProject.activeShotId) ??
    activeProject.shots[0];
  const shotDuration = Math.max(2, shot?.duration ?? 5);

  const presets = getAvailableAnimationsForObject(objectKind, propType);
  const activePreset: ObjectAnimationPreset = animation?.preset ?? 'none';
  const activeMeta = OBJECT_ANIMATION_PRESETS[activePreset];

  const selectPreset = (preset: ObjectAnimationPreset) => {
    if (preset === 'none') {
      setObjectAnimation(objectId, undefined);
      return;
    }
    const meta = OBJECT_ANIMATION_PRESETS[preset];
    setObjectAnimation(objectId, {
      preset,
      triggerTime:
        animation && animation.preset !== 'none'
          ? animation.triggerTime
          : Number(Math.max(0, Math.min(shotDuration - 0.5, currentTime)).toFixed(2)),
      duration: meta.defaultDuration,
      intensity: animation?.intensity ?? 1.0,
      directionDeg: animation?.directionDeg ?? 0,
      loop: meta.defaultLoop ?? false,
    });
  };

  const updateSpec = (patch: Partial<ObjectAnimationSpec>) => {
    if (!animation || animation.preset === 'none') return;
    setObjectAnimation(objectId, { ...animation, ...patch });
  };

  const handlePreview = () => {
    if (!animation || animation.preset === 'none') return;
    const startAt = Math.max(0, animation.triggerTime - 0.15);
    setIsPlaying(false);
    setCurrentTime(startAt);
    window.setTimeout(() => {
      useStudioStore.getState().setIsPlaying(true);
    }, 30);
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-600" />
          {tx('物体基础动画', 'Object Animation')}
        </h4>
        {activePreset !== 'none' && (
          <button
            type="button"
            onClick={() => setObjectAnimation(objectId, undefined)}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-rose-600 transition"
            title={tx('重置为静止状态', 'Reset to static')}
          >
            <RotateCcw className="w-3 h-3" />
            {tx('清除', 'Clear')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {presets.map((p) => {
          const isSelected = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              title={en ? p.shortDescEn : p.shortDesc}
              onClick={() => selectPreset(p.id)}
              className={`px-2 py-1.5 rounded-xl border text-left transition ${
                isSelected
                  ? 'bg-violet-600 border-violet-600 text-white shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50/40'
              }`}
            >
              <div className="text-[11px] font-semibold truncate">{en ? p.labelEn : p.label}</div>
              <div
                className={`text-[9px] truncate ${
                  isSelected ? 'text-violet-100' : 'text-slate-400'
                }`}
              >
                {en ? p.shortDescEn : p.shortDesc}
              </div>
            </button>
          );
        })}
      </div>

      {animation && activePreset !== 'none' && (
        <div className="rounded-xl bg-violet-50/75 border border-violet-200/80 p-2.5 space-y-2.5">
          {/* Trigger time */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">{tx('触发时间 (s)', 'Trigger Time (s)')}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    updateSpec({
                      triggerTime: Number(Math.max(0, currentTime).toFixed(2)),
                    })
                  }
                  className="px-1.5 py-0.5 rounded bg-white border border-violet-200 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 transition"
                  title={tx('设为当前时间轴游标时刻', 'Set to current playhead time')}
                >
                  {tx('设为当前', 'Use Now')} ({currentTime.toFixed(1)}s)
                </button>
                <span className="font-mono font-semibold text-violet-900 w-9 text-right">
                  {animation.triggerTime.toFixed(1)}s
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={shotDuration}
              step={0.1}
              value={Math.min(shotDuration, Math.max(0, animation.triggerTime))}
              onChange={(e) =>
                updateSpec({ triggerTime: Number(e.target.value) })
              }
              className="w-full accent-violet-600"
            />
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">{tx('动画时长 (s)', 'Duration (s)')}</span>
              <span className="font-mono font-semibold text-violet-900">
                {animation.duration.toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={5.0}
              step={0.1}
              value={animation.duration}
              onChange={(e) => updateSpec({ duration: Number(e.target.value) })}
              className="w-full accent-violet-600"
            />
          </div>

          {/* Intensity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">{tx('动作幅度/强度', 'Intensity')}</span>
              <span className="font-mono font-semibold text-violet-900">
                {(animation.intensity ?? 1).toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={2.0}
              step={0.1}
              value={animation.intensity ?? 1}
              onChange={(e) => updateSpec({ intensity: Number(e.target.value) })}
              className="w-full accent-violet-600"
            />
          </div>

          {/* Direction angle for directional falls/rolls/drives */}
          {activeMeta?.supportsDirection && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">{tx('倒下/运动方向 (°)', 'Direction (°)')}</span>
                <span className="font-mono font-semibold text-violet-900">
                  {Math.round(animation.directionDeg ?? 0)}°
                </span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={15}
                value={animation.directionDeg ?? 0}
                onChange={(e) =>
                  updateSpec({ directionDeg: Number(e.target.value) })
                }
                className="w-full accent-violet-600"
              />
            </div>
          )}

          {/* Loop toggle + Preview button */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            {activeMeta?.supportsLoop ? (
              <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(animation.loop)}
                  onChange={(e) => updateSpec({ loop: e.target.checked })}
                  className="accent-violet-600 rounded"
                />
                <span>{tx('循环播放', 'Loop')}</span>
              </label>
            ) : (
              <span className="text-[10px] text-violet-700/80">
                {tx('随时间轴触发播放', 'Triggers on timeline')}
              </span>
            )}

            <button
              type="button"
              onClick={handlePreview}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold transition"
            >
              <Play className="w-3 h-3 fill-current" />
              {tx('试播动画', 'Preview')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
