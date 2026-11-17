import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  FolderKanban,
  FolderPlus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { translateDefaultEntityName } from '../../i18n/translations';
import { useStudioStore } from '../../store/useStudioStore';

interface ProjectListPanelProps {
  focusNewInputSignal?: number;
  onClosePopover?: () => void;
}

/**
 * Floating Stage / Venue Manager popover panel for creating empty stages
 * with custom names, renaming existing stages inline, switching, and deleting.
 */
export const ProjectListPanel: React.FC<ProjectListPanelProps> = ({
  focusNewInputSignal = 0,
  onClosePopover,
}) => {
  const language = useStudioStore((s) => s.language);
  const en = language === 'en';
  const tx = (zhText: string, enText: string) => (en ? enText : zhText);
  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const createProject = useStudioStore((s) => s.createProject);
  const renameProject = useStudioStore((s) => s.renameProject);
  const switchProject = useStudioStore((s) => s.switchProject);
  const deleteProject = useStudioStore((s) => s.deleteProject);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const [newNameDraft, setNewNameDraft] = useState('');
  const [activeRenameDraft, setActiveRenameDraft] = useState(activeProject.name);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowRenameDraft, setRowRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const newInputRef = useRef<HTMLInputElement>(null);
  const rowInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveRenameDraft(activeProject.name);
  }, [activeProject.id, activeProject.name]);

  useEffect(() => {
    if (focusNewInputSignal > 0) {
      window.setTimeout(() => {
        newInputRef.current?.focus();
        newInputRef.current?.select();
      }, 30);
    }
  }, [focusNewInputSignal]);

  useEffect(() => {
    if (editingId) {
      rowInputRef.current?.focus();
      rowInputRef.current?.select();
    }
  }, [editingId]);

  const showToast = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => {
      setFeedback((prev) => (prev === msg ? null : prev));
    }, 1600);
  };

  const handleCreate = () => {
    const customName = newNameDraft.trim();
    const targetName =
      customName ||
      (en ? `Empty Backlot ${projects.length + 1}` : `空地片场 ${projects.length + 1}`);
    createProject(customName || undefined);
    setNewNameDraft('');
    setConfirmDeleteId(null);
    showToast(
      en ? `✓ Created empty stage "${targetName}"` : `✓ 已新建空白场地「${targetName}」`
    );
  };

  const commitActiveRename = () => {
    const trimmed = activeRenameDraft.trim();
    if (!trimmed) {
      setActiveRenameDraft(activeProject.name);
      return;
    }
    if (trimmed !== activeProject.name) {
      renameProject(activeProject.id, trimmed);
      showToast(en ? `✓ Renamed to "${trimmed}"` : `✓ 已改名为「${trimmed}」`);
    }
  };

  const startRowEdit = (id: string, name: string) => {
    setEditingId(id);
    setRowRenameDraft(name);
    setConfirmDeleteId(null);
  };

  const commitRowEdit = (id: string, fallbackName: string) => {
    const trimmed = rowRenameDraft.trim();
    if (trimmed && trimmed !== fallbackName) {
      renameProject(id, trimmed);
      showToast(en ? `✓ Renamed to "${trimmed}"` : `✓ 已改名为「${trimmed}」`);
    }
    setEditingId(null);
  };

  return (
    <div data-testid="project-list-panel" className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <FolderKanban className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-[11px] font-bold text-slate-700">
            {tx('片场 / 空白场地管理', 'Stages & Empty Backlots')} ({projects.length})
          </span>
        </div>
        {feedback && (
          <span
            data-testid="project-panel-feedback"
            className="text-[10px] font-semibold text-emerald-600 truncate max-w-[165px]"
          >
            {feedback}
          </span>
        )}
      </div>

      {/* Create Empty Stage with Custom Name */}
      <div className="glass-card rounded-xl p-2 space-y-1.5">
        <div className="text-[10px] font-semibold text-slate-500">
          {tx('新建空白场地（可自定义名称）', 'New Empty Stage (Optional Custom Name)')}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            ref={newInputRef}
            data-testid="new-project-name-input"
            type="text"
            value={newNameDraft}
            onChange={(e) => setNewNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder={
              en
                ? `Stage name (default: Empty Backlot ${projects.length + 1})`
                : `输入场地名称（默认：空地片场 ${projects.length + 1}）`
            }
            className="flex-1 min-w-0 rounded-lg bg-white/80 border border-white/90 focus:border-sky-400 focus:bg-white px-2.5 py-1 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none transition"
          />
          <button
            type="button"
            data-testid="create-project-submit-btn"
            onClick={handleCreate}
            className="glass-btn-accent flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition"
          >
            <FolderPlus className="w-3 h-3" />
            {tx('新建', 'Create')}
          </button>
        </div>
      </div>

      {/* Quick Rename Active Stage */}
      <div className="glass-card rounded-xl p-2 space-y-1">
        <div className="text-[10px] font-semibold text-slate-500">
          {tx('当前场地名称（回车或失焦保存）', 'Active Stage Name (Enter / Blur to Save)')}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-white/75 border border-white/85 focus-within:border-sky-400 focus-within:bg-white px-2 py-1 transition">
          <Pencil className="w-3 h-3 text-slate-400 shrink-0" />
          <input
            data-testid="active-project-rename-input"
            type="text"
            value={activeRenameDraft}
            onChange={(e) => setActiveRenameDraft(e.target.value)}
            onBlur={commitActiveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitActiveRename();
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                setActiveRenameDraft(activeProject.name);
                e.currentTarget.blur();
              }
            }}
            className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Existing Stage List */}
      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
        {projects.map((p) => {
          const isActive = p.id === activeProject.id;
          const isEditing = editingId === p.id;
          const isConfirmingDel = confirmDeleteId === p.id;
          const objectCount =
            p.world.assets.length +
            p.world.buildings.length +
            p.world.characters.length +
            (p.world.customModels?.length ?? 0) +
            (p.world.gltfModels?.length ?? 0);

          return (
            <div
              key={p.id}
              data-testid={`project-row-${p.id}`}
              className={`rounded-xl px-2.5 py-2 border transition flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-sky-50/90 border-sky-300/90 shadow-xs'
                  : 'bg-white/55 hover:bg-white/80 border-white/75'
              }`}
            >
              {isEditing ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    ref={rowInputRef}
                    data-testid={`project-row-rename-input-${p.id}`}
                    type="text"
                    value={rowRenameDraft}
                    onChange={(e) => setRowRenameDraft(e.target.value)}
                    onBlur={() => commitRowEdit(p.id, p.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitRowEdit(p.id, p.name);
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    className="flex-1 min-w-0 rounded-md bg-white border border-sky-400 px-2 py-0.5 text-xs font-medium text-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitRowEdit(p.id, p.name)}
                    className="p-1 rounded-md bg-sky-600 text-white hover:bg-sky-700"
                    title={tx('保存名称', 'Save Name')}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      switchProject(p.id);
                      setConfirmDeleteId(null);
                      onClosePopover?.();
                    }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-xs font-semibold truncate ${
                          isActive ? 'text-sky-800' : 'text-slate-800'
                        }`}
                      >
                        {translateDefaultEntityName(language, p.name)}
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-sky-600 text-white shrink-0">
                          {tx('当前', 'Active')}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {objectCount} {tx('物体', 'Objects')} · {p.shots.length} {tx('分镜', 'Shots')}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      data-testid={`rename-project-btn-${p.id}`}
                      onClick={() => startRowEdit(p.id, p.name)}
                      title={tx('自定义场地名称', 'Rename Stage')}
                      className="p-1 rounded-lg bg-white/70 hover:bg-sky-100 text-slate-600 hover:text-sky-700 border border-white/80 transition"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    {isConfirmingDel ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          data-testid={`confirm-delete-project-btn-${p.id}`}
                          onClick={() => {
                            const deletedName = translateDefaultEntityName(language, p.name);
                            deleteProject(p.id);
                            setConfirmDeleteId(null);
                            showToast(
                              en ? `✓ Deleted stage "${deletedName}"` : `✓ 已删除场地「${deletedName}」`
                            );
                          }}
                          className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold transition"
                        >
                          {tx('确认删除', 'Confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1 rounded-lg bg-white/80 hover:bg-slate-200 text-slate-500"
                          title={tx('取消', 'Cancel')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid={`delete-project-btn-${p.id}`}
                        disabled={projects.length <= 1}
                        onClick={() => setConfirmDeleteId(p.id)}
                        title={
                          projects.length <= 1
                            ? tx(
                                '至少保留 1 个场地（可先新建空白场地后再删除）',
                                'Keep at least 1 stage (create another before deleting)'
                              )
                            : tx('删除此场地', 'Delete Stage')
                        }
                        className="p-1 rounded-lg bg-white/70 hover:bg-rose-100 text-slate-500 hover:text-rose-600 border border-white/80 disabled:opacity-35 disabled:hover:bg-white/70 disabled:hover:text-slate-500 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
