import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Film,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import type { AspectRatio } from '../../types/scene';

const ASPECT_RATIOS: AspectRatio[] = ['16:9', '2.39:1', '9:16'];
const DURATION_PRESETS = [4, 6, 8, 12, 20];

interface ShotListPanelProps {
  /** Compact mode is used inside the TopBar dropdown popover. */
  compact?: boolean;
  onAfterSelect?: () => void;
  onOpenFullDrawer?: () => void;
}

/**
 * Shared Shot List & Custom Shot Name manager used in both the Left Shots Drawer
 * and the TopBar quick Shot List popover.
 */
export const ShotListPanel: React.FC<ShotListPanelProps> = ({
  compact = false,
  onAfterSelect,
  onOpenFullDrawer,
}) => {
  const language = useStudioStore((s) => s.language);
  const en = language === 'en';
  const tx = (zhText: string, enText: string) => (en ? enText : zhText);
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const activeShot =
    project.shots.find((s) => s.id === project.activeShotId) ?? project.shots[0];

  const createShot = useStudioStore((s) => s.createShot);
  const duplicateShot = useStudioStore((s) => s.duplicateShot);
  const switchShot = useStudioStore((s) => s.switchShot);
  const renameShot = useStudioStore((s) => s.renameShot);
  const moveShot = useStudioStore((s) => s.moveShot);
  const deleteShot = useStudioStore((s) => s.deleteShot);
  const setShotAspectRatio = useStudioStore((s) => s.setShotAspectRatio);
  const setShotDuration = useStudioStore((s) => s.setShotDuration);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [activeNameDraft, setActiveNameDraft] = useState(activeShot.name);
  const [savedFlashId, setSavedFlashId] = useState<string | null>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveNameDraft(activeShot.name);
  }, [activeShot.id, activeShot.name]);

  useEffect(() => {
    if (editingId) {
      inlineInputRef.current?.focus();
      inlineInputRef.current?.select();
    }
  }, [editingId]);

  const totalDuration = project.shots.reduce((sum, s) => sum + (s.duration || 0), 0);

  const flashSaved = (shotId: string) => {
    setSavedFlashId(shotId);
    window.setTimeout(() => {
      setSavedFlashId((prev) => (prev === shotId ? null : prev));
    }, 900);
  };

  const startInlineEdit = (shotId: string, currentName: string) => {
    setEditingId(shotId);
    setDraftName(currentName);
  };

  const commitInlineEdit = (shotId: string, fallbackName: string) => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== fallbackName) {
      renameShot(shotId, trimmed);
      flashSaved(shotId);
    }
    setEditingId(null);
  };

  const commitActiveQuickRename = () => {
    const trimmed = activeNameDraft.trim();
    if (!trimmed) {
      setActiveNameDraft(activeShot.name);
      return;
    }
    if (trimmed !== activeShot.name) {
      renameShot(activeShot.id, trimmed);
      flashSaved(activeShot.id);
    }
  };

  return (
    <div data-testid="shot-list-panel" className="space-y-3">
      {/* Header + Create Shot */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            {tx('分镜列表', 'Shots')} ({project.shots.length})
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/55 border border-white/70 text-slate-500">
            {tx('总长', 'Total')} {totalDuration.toFixed(1)}s
          </span>
        </div>
        <button
          type="button"
          data-testid="create-shot-btn"
          onClick={() => createShot()}
          className="glass-btn-active flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition shrink-0"
        >
          <Plus className="w-3 h-3" />
          {tx('新建分镜', 'New Shot')}
        </button>
      </div>

      {/* Quick Rename Active Shot Field */}
      <div className="glass-card rounded-xl p-2 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="font-semibold flex items-center gap-1">
            <Film className="w-3 h-3 text-sky-600" />
            {tx('当前分镜名称（可直接修改）', 'Active Shot Name (Inline Editable)')}
          </span>
          {savedFlashId === activeShot.id && (
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5" />
              {tx('已保存', 'Saved')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-white/70 border border-white/80 focus-within:border-sky-400 focus-within:bg-white/95 px-2 py-1 transition">
          <Pencil className="w-3 h-3 text-slate-400 shrink-0" />
          <input
            type="text"
            data-testid="active-shot-name-input"
            value={activeNameDraft}
            onChange={(e) => setActiveNameDraft(e.target.value)}
            onBlur={commitActiveQuickRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                setActiveNameDraft(activeShot.name);
                e.currentTarget.blur();
              }
            }}
            placeholder={tx('例如：全景开场 / 主角特写...', 'e.g. Wide Establishing / Hero Close-up...')}
            className="w-full min-w-0 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Shot List Rows */}
      <div
        className={`space-y-1.5 ${
          compact ? 'max-h-64 overflow-y-auto pr-0.5' : ''
        }`}
      >
        {project.shots.map((s, idx) => {
          const isActive = s.id === activeShot.id;
          const isEditing = editingId === s.id;
          return (
            <div
              key={s.id}
              data-testid={`shot-item-${idx}`}
              onClick={() => {
                if (isEditing) return;
                switchShot(s.id);
                onAfterSelect?.();
              }}
              className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border transition ${
                isEditing ? '' : 'cursor-pointer'
              } ${
                isActive
                  ? 'bg-sky-500/18 backdrop-blur-md border-sky-400/75 text-sky-950 shadow-sm shadow-sky-900/10'
                  : 'glass-card text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white/75 text-slate-500 border border-white/80'
                  }`}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        ref={inlineInputRef}
                        type="text"
                        data-testid={`shot-inline-input-${idx}`}
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={() => commitInlineEdit(s.id, s.name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitInlineEdit(s.id, s.name);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingId(null);
                          }
                        }}
                        className="w-full min-w-0 rounded-md bg-white/95 border border-sky-400 px-1.5 py-0.5 text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          commitInlineEdit(s.id, s.name);
                        }}
                        title={tx('确认名称', 'Confirm Name')}
                        className="p-1 rounded-md bg-sky-600 text-white hover:bg-sky-700 shrink-0"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setEditingId(null);
                        }}
                        title={tx('取消', 'Cancel')}
                        className="p-1 rounded-md glass-btn text-slate-500 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startInlineEdit(s.id, s.name);
                        }}
                        title={tx('点击切换分镜 · 双击或点右侧铅笔自定义名称', 'Click to switch shot · Double-click or edit to rename')}
                        className={`text-xs truncate flex items-center gap-1 ${
                          isActive ? 'font-bold text-sky-950' : 'font-semibold text-slate-800'
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                        {savedFlashId === s.id && (
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {s.duration}s · {s.focalLength}mm · {s.aspectRatio} · {s.keyframes.length} KF
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!isEditing && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    data-testid={`rename-shot-btn-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startInlineEdit(s.id, s.name);
                    }}
                    title={tx('自定义分镜名称', 'Rename Shot')}
                    className="glass-btn p-1 rounded-full text-slate-600 hover:text-sky-700"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {project.shots.length > 1 && (
                    <>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveShot(s.id, 'up');
                        }}
                        title={tx('上移分镜', 'Move Up')}
                        className="glass-btn p-1 rounded-full text-slate-500 disabled:opacity-30"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === project.shots.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveShot(s.id, 'down');
                        }}
                        title={tx('下移分镜', 'Move Down')}
                        className="glass-btn p-1 rounded-full text-slate-500 disabled:opacity-30"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateShot(s.id);
                    }}
                    title={tx('复制分镜', 'Duplicate Shot')}
                    className="glass-btn p-1 rounded-full text-slate-500 hover:text-slate-900"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {project.shots.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteShot(s.id);
                      }}
                      title={tx('删除分镜', 'Delete Shot')}
                      className="glass-btn p-1 rounded-full text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Shot Aspect Ratio & Duration */}
      {!compact ? (
        <div className="border-t border-white/60 pt-2.5 space-y-2.5">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {tx('电影画幅比例', 'Cinema Aspect Ratio')}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setShotAspectRatio(ar)}
                  className={`py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
                    activeShot.aspectRatio === ar
                      ? 'glass-btn-active'
                      : 'glass-btn text-slate-700'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {tx('当前分镜时长', 'Shot Duration')} ({activeShot.duration}s)
            </span>
            <div className="grid grid-cols-5 gap-1">
              {DURATION_PRESETS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setShotDuration(sec)}
                  className={`py-1 rounded-xl text-[11px] font-mono font-semibold transition ${
                    activeShot.duration === sec
                      ? 'glass-btn-accent'
                      : 'glass-btn text-slate-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        onOpenFullDrawer && (
          <div className="border-t border-white/60 pt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setShotAspectRatio(ar)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold transition ${
                    activeShot.aspectRatio === ar
                      ? 'glass-btn-active'
                      : 'glass-btn text-slate-600'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenFullDrawer}
              className="glass-btn px-2.5 py-1 rounded-full text-[11px] font-semibold text-sky-700"
            >
              {tx('分镜详细设置', 'More Shot Settings')}
            </button>
          </div>
        )
      )}
    </div>
  );
};
