import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Keyboard,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  eventToKeyCombo,
  formatKeyLabel,
  KEYBINDING_CATEGORY_EN,
  KEYBINDING_DEFS,
  type KeyActionId,
  type KeybindingCategory,
} from '../../engine/keybindings';
import { useStudioStore } from '../../store/useStudioStore';

const CATEGORIES: KeybindingCategory[] = ['变换与编辑', '地形雕刻', '播放与视图'];

/**
 * Full-featured custom keyboard shortcuts settings modal/page.
 * Allows live key capture, conflict resolution, search, reset, and toggling
 * the on-screen translucent shortcut hints overlay.
 */
export const KeybindingsModal: React.FC = () => {
  const language = useStudioStore((s) => s.language);
  const en = language === 'en';
  const tx = (zhText: string, enText: string) => (en ? enText : zhText);
  const open = useStudioStore((s) => s.keybindingsOpen);
  const setOpen = useStudioStore((s) => s.setKeybindingsOpen);
  const keybindings = useStudioStore((s) => s.keybindings);
  const setKeybinding = useStudioStore((s) => s.setKeybinding);
  const resetKeybinding = useStudioStore((s) => s.resetKeybinding);
  const resetAllKeybindings = useStudioStore((s) => s.resetAllKeybindings);
  const showKeyHints = useStudioStore((s) => s.showKeyHints);
  const setShowKeyHints = useStudioStore((s) => s.setShowKeyHints);

  const [query, setQuery] = useState('');
  const [capturingId, setCapturingId] = useState<KeyActionId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCapturingId(null);
      setNotice(null);
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (capturingId) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') {
          setCapturingId(null);
          return;
        }
        const combo = eventToKeyCombo(e);
        if (!combo) return;
        const replaced = setKeybinding(capturingId, combo);
        if (replaced) {
          const oldDef = KEYBINDING_DEFS.find((d) => d.id === replaced);
          const oldLabel = (en ? oldDef?.labelEn : oldDef?.label) ?? replaced;
          setNotice(
            en
              ? `Bound ${formatKeyLabel(combo, language)} (cleared previous "${oldLabel}" binding)`
              : `已绑定 ${formatKeyLabel(combo, language)}（原「${oldLabel}」的按键已自动清除）`
          );
        } else {
          setNotice(null);
        }
        setCapturingId(null);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, capturingId, setKeybinding, setOpen, en, language]);

  const filteredDefs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return KEYBINDING_DEFS;
    return KEYBINDING_DEFS.filter(
      (def) =>
        def.label.toLowerCase().includes(q) ||
        def.labelEn.toLowerCase().includes(q) ||
        def.description.toLowerCase().includes(q) ||
        def.descriptionEn.toLowerCase().includes(q) ||
        formatKeyLabel(keybindings[def.id], language).toLowerCase().includes(q)
    );
  }, [query, keybindings, language]);

  if (!open) return null;

  const hasCustomOverrides = KEYBINDING_DEFS.some(
    (def) => keybindings[def.id] !== def.defaultCombo
  );

  return (
    <div
      data-testid="keybindings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !capturingId) {
          setOpen(false);
        }
      }}
    >
      <div className="w-full max-w-2xl max-h-[86vh] rounded-2xl bg-white/96 backdrop-blur-xl border border-white shadow-2xl flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/70 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {tx('自定义快捷键设置', 'Keyboard Shortcuts')}
              </h2>
              <p className="text-[11px] text-slate-500">
                {tx(
                  '点击任意右侧按键框后直接按下新键位或组合键（Esc 取消录入）',
                  'Click any key badge on the right and press a new key or combo (Esc to cancel)'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetAllKeybindings();
                setCapturingId(null);
                setNotice(tx('已恢复全部默认快捷键', 'Restored all default shortcuts'));
              }}
              disabled={!hasCustomOverrides}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-medium text-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{tx('恢复全部默认', 'Reset All')}</span>
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={tx('关闭自定义快捷键页面', 'Close Keyboard Shortcuts')}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Toolbar: Search + On-Screen Hint Switch */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tx('搜索操作名称或按键...', 'Search action or key...')}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowKeyHints(!showKeyHints)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              showKeyHints
                ? 'bg-sky-50 border-sky-200 text-sky-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {showKeyHints ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span>
              {tx('屏幕按键提示：', 'On-screen Hints: ')}
              {showKeyHints ? tx('显示中', 'Shown') : tx('已取消', 'Hidden')}
            </span>
          </button>
        </div>

        {/* Conflict / Reset Notice */}
        {notice && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center justify-between gap-2 shrink-0">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{notice}</span>
            </span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-amber-600 hover:text-amber-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Categorized Keybinding List */}
        <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-4">
          {CATEGORIES.map((category) => {
            const items = filteredDefs.filter((d) => d.category === category);
            if (items.length === 0) return null;

            return (
              <section key={category} className="space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  {en ? KEYBINDING_CATEGORY_EN[category] : category}
                </h3>
                <div className="rounded-2xl border border-slate-200/80 divide-y divide-slate-100 bg-white overflow-hidden">
                  {items.map((def) => {
                    const currentCombo = keybindings[def.id];
                    const isListening = capturingId === def.id;
                    const isModified = currentCombo !== def.defaultCombo;
                    const isUnbound = !currentCombo;
                    const defLabel = en ? def.labelEn : def.label;
                    const defDesc = en ? def.descriptionEn : def.description;

                    return (
                      <div
                        key={def.id}
                        data-testid={`keybinding-row-${def.id}`}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800">
                              {defLabel}
                            </span>
                            {isModified && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium">
                                {tx('已自定义', 'Custom')}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {defDesc}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => {
                                resetKeybinding(def.id);
                                if (capturingId === def.id) setCapturingId(null);
                              }}
                              title={`${tx('恢复默认', 'Reset default')} (${formatKeyLabel(def.defaultCombo, language)})`}
                              aria-label={tx(`恢复 ${defLabel} 默认按键`, `Reset ${defLabel} shortcut`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setNotice(null);
                              setCapturingId(isListening ? null : def.id);
                            }}
                            aria-label={tx(`修改 ${defLabel} 快捷键`, `Edit ${defLabel} shortcut`)}
                            className={`min-w-[104px] px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition text-center ${
                              isListening
                                ? 'bg-sky-600 border-sky-600 text-white animate-pulse shadow-sm'
                                : isUnbound
                                ? 'bg-amber-50 border-amber-300 text-amber-700 hover:border-amber-400'
                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-sky-400 hover:bg-sky-50/50'
                            }`}
                          >
                            {isListening
                              ? tx('按下新按键...', 'Press a key...')
                              : formatKeyLabel(currentCombo, language)}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filteredDefs.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-400">
              {tx('未找到匹配的快捷键设置', 'No matching shortcuts found')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>
            {tx(
              '鼠标规则：左键拖拽旋转 · 中键平移 · 滚轮缩放 · 点击空地取消选中',
              'Mouse: LMB Orbit · MMB Pan · Wheel Zoom · Empty Click Deselect'
            )}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
          >
            {tx('完成', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};
