import React from 'react';
import {
  Check,
  Globe,
  Keyboard,
  KeyRound,
  Monitor,
  Settings,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { tr } from '../../i18n/translations';
import { useStudioStore } from '../../store/useStudioStore';
import type { AppLanguage, GraphicsQuality } from '../../types/scene';

interface SettingsModalProps {
  onOpenApiModal: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onOpenApiModal,
}) => {
  const open = useStudioStore((s) => s.settingsModalOpen);
  const setOpen = useStudioStore((s) => s.setSettingsModalOpen);
  const graphicsQuality = useStudioStore((s) => s.graphicsQuality);
  const setGraphicsQuality = useStudioStore((s) => s.setGraphicsQuality);
  const language = useStudioStore((s) => s.language);
  const setLanguage = useStudioStore((s) => s.setLanguage);
  const showKeyHints = useStudioStore((s) => s.showKeyHints);
  const toggleKeyHints = useStudioStore((s) => s.toggleKeyHints);
  const cameraCollision = useStudioStore((s) => s.cameraCollision);
  const toggleCameraCollision = useStudioStore((s) => s.toggleCameraCollision);
  const setKeybindingsOpen = useStudioStore((s) => s.setKeybindingsOpen);

  if (!open) return null;

  const qualityOptions: {
    id: GraphicsQuality;
    label: string;
    desc: string;
    badge: string;
  }[] = [
    {
      id: 'low',
      label: tr(language, 'qualityLow'),
      desc: tr(language, 'qualityLowDesc'),
      badge: '60+ FPS',
    },
    {
      id: 'medium',
      label: tr(language, 'qualityMedium'),
      desc: tr(language, 'qualityMediumDesc'),
      badge: '1024p',
    },
    {
      id: 'high',
      label: tr(language, 'qualityHigh'),
      desc: tr(language, 'qualityHighDesc'),
      badge: '2048p',
    },
  ];

  const langOptions: { id: AppLanguage; label: string; sub: string }[] = [
    { id: 'zh', label: '简体中文', sub: 'Chinese (Simplified)' },
    { id: 'en', label: 'English', sub: language === 'en' ? 'English UI' : '英语界面' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white/95 backdrop-blur-xl border border-white shadow-2xl shadow-slate-900/20 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {tr(language, 'settingsTitle')}
              </h2>
              <p className="text-[11px] text-slate-500">
                {tr(language, 'settingsSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition"
            aria-label={language === 'en' ? 'Close Settings' : '关闭设置'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* 1. Graphics Quality: Low / Medium / High */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-sky-600" />
                {tr(language, 'qualitySectionTitle')}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                {graphicsQuality.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {qualityOptions.map((opt) => {
                const active = graphicsQuality === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGraphicsQuality(opt.id)}
                    className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition ${
                      active
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-white border-slate-200 hover:border-sky-400 text-slate-700'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{opt.label}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          active
                            ? 'bg-sky-500/25 text-sky-300'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] leading-snug ${
                        active ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {opt.desc}
                    </span>
                    {active && (
                      <Check className="w-3.5 h-3.5 text-sky-400 absolute bottom-2 right-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Interface Language */}
          <div className="space-y-2 border-t border-slate-200/80 pt-4">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              {tr(language, 'languageSectionTitle')}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {langOptions.map((opt) => {
                const active = language === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLanguage(opt.id)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition ${
                      active
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400/30 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] text-slate-500">{opt.sub}</div>
                    </div>
                    {active && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Master Settings Quick Links (Key Hints, Shortcuts, API Config) */}
          <div className="space-y-2 border-t border-slate-200/80 pt-4">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {tr(language, 'quickToolsSection')}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="settings-camera-collision-btn"
                onClick={toggleCameraCollision}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[11px] font-semibold transition ${
                  cameraCollision
                    ? 'bg-sky-50 border-sky-300 text-sky-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  {cameraCollision ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  ) : (
                    <ShieldOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <span className="truncate">{tr(language, 'camCollisionSection')}</span>
                </span>
                <span className="text-[10px] font-mono shrink-0 ml-1.5 px-1.5 py-0.5 rounded bg-white/80">
                  {cameraCollision
                    ? tr(language, 'camCollisionOn')
                    : tr(language, 'camCollisionOff')}
                </span>
              </button>

              <button
                type="button"
                onClick={toggleKeyHints}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[11px] font-semibold transition ${
                  showKeyHints
                    ? 'bg-sky-50 border-sky-300 text-sky-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Keyboard className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tr(language, 'keyHintsToggle')}</span>
                </span>
                <span className="text-[10px] font-mono shrink-0 ml-1">
                  {showKeyHints
                    ? tr(language, 'keyHintsOn')
                    : tr(language, 'keyHintsOff')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setKeybindingsOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-sky-400 text-[11px] font-semibold text-slate-700 transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="truncate">{tr(language, 'openKeybindings')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenApiModal();
                }}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-sky-400 text-[11px] font-semibold text-slate-700 transition"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{tr(language, 'openApiConfig')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 bg-slate-50/80 border-t border-slate-200/80">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs"
          >
            {tr(language, 'closeBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
