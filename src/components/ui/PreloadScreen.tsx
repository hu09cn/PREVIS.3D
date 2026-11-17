import React from 'react';
import {
  CheckCircle2,
  Clapperboard,
  Database,
  Layers,
  Loader2,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import type { PreloadProgressState } from '../../engine/preloadManager';
import { useStudioStore } from '../../store/useStudioStore';

interface PreloadScreenProps {
  state: PreloadProgressState;
  initialized: boolean;
  fadingOut: boolean;
  onEnterNow?: () => void;
}

export const PreloadScreen: React.FC<PreloadScreenProps> = ({
  state,
  initialized,
  fadingOut,
  onEnterNow,
}) => {
  const language = useStudioStore((s) => s.language);
  const tx = (zhText: string, enText: string) => (language === 'en' ? enText : zhText);
  const pct = Math.max(0, Math.min(100, Math.round(state.progress)));

  const milestones = [
    {
      label: tx('片场本地存档', 'Local Studio Save'),
      done: initialized,
      detail: initialized ? tx('已读取', 'Loaded') : tx('加载中', 'Loading'),
      icon: Database,
    },
    {
      label: tx('白模资产与缩略图缓存', 'Assets & Thumbnails'),
      done: state.totalVariants > 0 && state.warmedVariants >= state.totalVariants,
      detail:
        state.totalVariants > 0
          ? `${state.warmedVariants}/${state.totalVariants}`
          : tx('索引中', 'Indexing'),
      icon: PackageCheck,
    },
    {
      label: tx('地形网格与多通道材质', 'Terrain & Multi-Pass Mats'),
      done: state.materialsReady,
      detail: state.materialsReady ? tx('已就绪', 'Ready') : tx('待预热', 'Pending'),
      icon: Layers,
    },
    {
      label: tx('WebGL 着色器管线', 'WebGL Shaders'),
      done: state.viewportReady,
      detail: state.viewportReady ? tx('已编译', 'Compiled') : tx('预编译中', 'Warming'),
      icon: Sparkles,
    },
  ];

  return (
    <div
      data-testid="preload-screen"
      className={`fixed inset-0 z-[120] flex items-center justify-center p-6 transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 22% 20%, rgba(186,230,253,0.92), rgba(212,226,234,0.96) 52%, rgba(226,232,240,0.98) 100%)',
      }}
    >
      {/* Ambient architectural soft glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-indigo-200/35 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg glass-drawer rounded-3xl p-7 text-slate-800 shadow-2xl space-y-5">
        {/* Header Brand */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
              <Clapperboard className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900">
                  PREVIS<span className="text-sky-600">.3D</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-700 border border-sky-400/30">
                  {tx('资源预热启动', 'Asset Pre-Warmup')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {tx(
                  'AI 3D 白模影视预演工作台 · 提前预加载资产与着色器避免后续卡顿',
                  'AI 3D Previs Studio · Pre-caching assets & shaders for smooth playback'
                )}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              data-testid="preload-percent"
              className="text-2xl font-bold font-mono text-slate-900 tabular-nums"
            >
              {pct}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded-full bg-white/75 border border-white/80 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 transition-[width] duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              data-testid="preload-stage-title"
              className="font-semibold text-slate-700 flex items-center gap-1.5 truncate"
            >
              {pct < 100 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
              {state.stageTitle}
            </span>
            <span className="text-[11px] text-slate-500 truncate max-w-[230px]">
              {state.stageDetail}
            </span>
          </div>
        </div>

        {/* Preload Checklist */}
        <div className="grid grid-cols-2 gap-2.5">
          {milestones.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className={`rounded-2xl px-3 py-2.5 border transition flex items-center justify-between gap-2 ${
                  m.done
                    ? 'bg-white/75 border-emerald-200/90 text-slate-800'
                    : 'bg-white/45 border-white/70 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      m.done ? 'text-emerald-600' : 'text-sky-600'
                    }`}
                  />
                  <span className="text-[11px] font-medium truncate">{m.label}</span>
                </div>
                <span
                  className={`text-[10px] font-mono font-semibold shrink-0 ${
                    m.done ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {m.detail}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer tip + manual quick enter fallback once materials & assets are ready */}
        <div className="flex items-center justify-between pt-1 border-t border-white/60 text-[11px] text-slate-500">
          <span>
            {tx(
              '所有 16 类白模几何、缩略图与多通道材质均在本地完成预编译',
              'All white-box geometry, thumbnails & multi-pass shaders precompiled locally'
            )}
          </span>
          {state.materialsReady && onEnterNow && (
            <button
              type="button"
              data-testid="preload-enter-btn"
              onClick={onEnterNow}
              className="glass-btn-accent px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 transition"
            >
              {tx('立即进入 →', 'Enter Now →')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
