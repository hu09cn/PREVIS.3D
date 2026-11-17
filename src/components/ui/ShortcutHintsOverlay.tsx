import React from 'react';
import { Keyboard, SlidersHorizontal, X } from 'lucide-react';
import { formatKeyLabel } from '../../engine/keybindings';
import { useStudioStore } from '../../store/useStudioStore';

interface HintItem {
  keys: string;
  label: string;
}

/**
 * Low-opacity translucent keyboard/mouse shortcut overlay placed in the
 * bottom-left corner of the viewport. Dynamically reflects custom keybindings
 * and provides direct controls to customize shortcuts or hide hints.
 */
export const ShortcutHintsOverlay: React.FC = () => {
  const language = useStudioStore((s) => s.language);
  const showKeyHints = useStudioStore((s) => s.showKeyHints);
  const setShowKeyHints = useStudioStore((s) => s.setShowKeyHints);
  const setKeybindingsOpen = useStudioStore((s) => s.setKeybindingsOpen);
  const keybindings = useStudioStore((s) => s.keybindings);
  const terrainBrushActive = useStudioStore((s) => s.terrainBrush.active);
  const pendingPlacement = useStudioStore((s) => s.pendingPlacement);

  if (!showKeyHints) return null;

  const en = language === 'en';
  const tx = (zhText: string, enText: string) => (en ? enText : zhText);
  const fk = (combo: string) => formatKeyLabel(combo, language);

  const isBrushPlacement =
    pendingPlacement?.kind === 'tree_brush' ||
    pendingPlacement?.kind === 'rock_brush' ||
    pendingPlacement?.kind === 'road_brush' ||
    pendingPlacement?.kind === 'fence_brush' ||
    pendingPlacement?.kind === 'object_eraser';

  const activeHints: HintItem[] = pendingPlacement
    ? isBrushPlacement
      ? [
          {
            keys: tx('左键拖拽', 'LMB Drag'),
            label:
              pendingPlacement.kind === 'object_eraser'
                ? tx('擦除物体', 'Erase Objects')
                : tx('绘制 / 刷放置', 'Paint / Brush Place'),
          },
          { keys: `${fk(keybindings.playPause)} / Alt / ${tx('右键', 'RMB')}`, label: tx('转视角', 'Orbit') },
          { keys: tx('中键 / 滚轮', 'MMB / Wheel'), label: tx('平移 / 缩放', 'Pan / Zoom') },
          { keys: fk(keybindings.cancelOrDeselect), label: tx('退出工具', 'Exit Tool') },
        ]
      : [
          { keys: tx('左键点场景', 'LMB Click'), label: tx('放置资产', 'Place Asset') },
          { keys: tx('Shift + 点击', 'Shift + Click'), label: tx('连续摆放', 'Multi-Place') },
          { keys: tx('左键/右键/空格+左键', 'LMB/RMB/Space+LMB'), label: tx('转视角', 'Orbit View') },
          { keys: fk(keybindings.cancelOrDeselect), label: tx('退出摆放', 'Cancel Place') },
        ]
    : terrainBrushActive
    ? [
        { keys: tx('左键涂抹', 'LMB Stroke'), label: tx('雕刻 / 刷材质', 'Sculpt / Paint') },
        { keys: `${fk(keybindings.playPause)} / Ctrl / ${tx('右键', 'RMB')}`, label: tx('转视角', 'Orbit') },
        {
          keys: `${fk(keybindings.brushSmaller)} / ${fk(keybindings.brushLarger)}`,
          label: tx('调半径', 'Brush Radius'),
        },
        { keys: 'Alt / Shift', label: tx('反转 / 平滑', 'Invert / Smooth') },
        { keys: fk(keybindings.toggleBrush), label: tx('退出笔刷', 'Exit Brush') },
      ]
    : [
        { keys: tx('左键拖拽', 'LMB Drag'), label: tx('旋转视角', 'Orbit') },
        { keys: tx('滚轮 / 捏合', 'Wheel / Pinch'), label: tx('无极缩放视角', 'Zoom') },
        { keys: tx('中键拖拽', 'MMB Drag'), label: tx('平移视角', 'Pan') },
        {
          keys: `${tx('点空地', 'Empty Click')} / ${fk(keybindings.cancelOrDeselect)}`,
          label: tx('取消选中', 'Deselect'),
        },
        {
          keys: `${fk(keybindings.translate)} · ${fk(keybindings.rotate)} · ${fk(keybindings.scale)}`,
          label: tx('移 · 旋 · 缩', 'Move · Rot · Scale'),
        },
        {
          keys: tx('Shift + 拖坐标轴', 'Shift + Drag Gizmo'),
          label: tx('原地复制物体', 'Duplicate'),
        },
        {
          keys: `${fk(keybindings.deleteSelected)} / ${fk(keybindings.undo)}`,
          label: tx('删除 / 撤销', 'Delete / Undo'),
        },
        {
          keys: `${fk(keybindings.playPause)} / ${fk(keybindings.toggleBrush)}`,
          label: tx('播放 / 笔刷', 'Play / Brush'),
        },
      ];

  return (
    <div
      data-testid="shortcut-hints-overlay"
      className="pointer-events-none fixed bottom-4 left-3 z-20 w-52 rounded-xl glass-dark-pill px-2.5 py-1.5 text-white/85 opacity-85 hover:opacity-100 transition-all duration-200 select-none"
    >
      <div className="pointer-events-auto flex items-center justify-between mb-1 pb-1 border-b border-white/15">
        <span className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-white/80">
          <Keyboard className="w-3 h-3 text-sky-300" />
          <span>{tx('操作提示', 'Controls')}</span>
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setKeybindingsOpen(true)}
            title={tx('自定义快捷键', 'Customize Shortcuts')}
            aria-label={tx('自定义快捷键', 'Customize Shortcuts')}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/10 hover:bg-white/22 border border-white/15 text-[9.5px] text-white/80 hover:text-white transition"
          >
            <SlidersHorizontal className="w-2.5 h-2.5" />
            <span>{tx('自定义', 'Edit')}</span>
          </button>
          <button
            onClick={() => setShowKeyHints(false)}
            title={`${tx('取消按键提示', 'Hide Controls')} (${fk(keybindings.toggleKeyHints)})`}
            aria-label={tx('取消按键提示', 'Hide Controls')}
            className="p-0.5 rounded-full hover:bg-white/20 text-white/65 hover:text-white transition"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-0.5 text-[10px] leading-tight">
        {activeHints.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2">
            <kbd className="px-1 py-[1px] rounded bg-white/12 border border-white/15 font-mono text-[9.5px] text-white/90 whitespace-nowrap">
              {item.keys}
            </kbd>
            <span className="text-white/70 truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
