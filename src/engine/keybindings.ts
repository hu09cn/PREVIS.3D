import type { AppLanguage } from '../types/scene';

export type KeyActionId =
  | 'translate'
  | 'rotate'
  | 'scale'
  | 'deleteSelected'
  | 'undo'
  | 'redo'
  | 'toggleBrush'
  | 'brushSmaller'
  | 'brushLarger'
  | 'playPause'
  | 'cancelOrDeselect'
  | 'toggleKeyHints';

export type KeybindingMap = Record<KeyActionId, string>;

export type KeybindingCategory = '变换与编辑' | '地形雕刻' | '播放与视图';

export const KEYBINDING_CATEGORY_EN: Record<KeybindingCategory, string> = {
  '变换与编辑': 'Transform & Edit',
  '地形雕刻': 'Terrain Sculpt',
  '播放与视图': 'Playback & View',
};

export interface KeybindingDef {
  id: KeyActionId;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  category: KeybindingCategory;
  defaultCombo: string;
}

export const KEYBINDING_DEFS: KeybindingDef[] = [
  {
    id: 'translate',
    label: '移动工具',
    labelEn: 'Move Tool',
    description: '激活选中物体的三轴位移手柄',
    descriptionEn: 'Activate 3-axis translate gizmo on selection',
    category: '变换与编辑',
    defaultCombo: 'W',
  },
  {
    id: 'rotate',
    label: '旋转工具',
    labelEn: 'Rotate Tool',
    description: '激活选中物体的旋转角度环',
    descriptionEn: 'Activate rotation gizmo rings on selection',
    category: '变换与编辑',
    defaultCombo: 'E',
  },
  {
    id: 'scale',
    label: '缩放工具',
    labelEn: 'Scale Tool',
    description: '激活选中物体的比例缩放手柄',
    descriptionEn: 'Activate uniform/axis scale gizmo on selection',
    category: '变换与编辑',
    defaultCombo: 'R',
  },
  {
    id: 'deleteSelected',
    label: '删除选中物体',
    labelEn: 'Delete Selected',
    description: '从片场中移除当前选中的模型或角色',
    descriptionEn: 'Remove the selected object or character from the stage',
    category: '变换与编辑',
    defaultCombo: 'Delete',
  },
  {
    id: 'undo',
    label: '撤销上一步',
    labelEn: 'Undo',
    description: '回退上一次场景修改或笔刷雕刻',
    descriptionEn: 'Revert the previous scene edit or terrain stroke',
    category: '变换与编辑',
    defaultCombo: 'Ctrl+Z',
  },
  {
    id: 'redo',
    label: '重做操作',
    labelEn: 'Redo',
    description: '恢复已撤销的场景操作',
    descriptionEn: 'Restore the previously undone scene edit',
    category: '变换与编辑',
    defaultCombo: 'Ctrl+Y',
  },
  {
    id: 'toggleBrush',
    label: '地形笔刷开关',
    labelEn: 'Toggle Terrain Brush',
    description: '快速开启或关闭地形雕刻与材质涂刷',
    descriptionEn: 'Quickly toggle terrain sculpting and material painting',
    category: '地形雕刻',
    defaultCombo: 'B',
  },
  {
    id: 'brushSmaller',
    label: '缩小笔刷半径',
    labelEn: 'Decrease Brush Radius',
    description: '笔刷激活时将半径减小 2 米',
    descriptionEn: 'Shrink active brush radius by 2m',
    category: '地形雕刻',
    defaultCombo: '[',
  },
  {
    id: 'brushLarger',
    label: '增大笔刷半径',
    labelEn: 'Increase Brush Radius',
    description: '笔刷激活时将半径增大 2 米',
    descriptionEn: 'Expand active brush radius by 2m',
    category: '地形雕刻',
    defaultCombo: ']',
  },
  {
    id: 'playPause',
    label: '播放 / 暂停',
    labelEn: 'Play / Pause',
    description: '播放或暂停时间轴预演；笔刷模式下按住可旋转视角',
    descriptionEn: 'Play/pause timeline playback; hold in brush mode to orbit camera',
    category: '播放与视图',
    defaultCombo: 'Space',
  },
  {
    id: 'cancelOrDeselect',
    label: '取消摆放 / 取消选中',
    labelEn: 'Cancel Placement / Deselect',
    description: '退出当前待摆放模式，或取消当前物体选中',
    descriptionEn: 'Exit placement mode or clear the current selection',
    category: '播放与视图',
    defaultCombo: 'Escape',
  },
  {
    id: 'toggleKeyHints',
    label: '显示 / 隐藏按键提示',
    labelEn: 'Show / Hide Shortcut Hints',
    description: '切换左下角半透明操作提示浮层的显示状态',
    descriptionEn: 'Toggle the bottom-left floating keyboard & mouse hints overlay',
    category: '播放与视图',
    defaultCombo: 'H',
  },
];

export const DEFAULT_KEYBINDINGS: KeybindingMap = KEYBINDING_DEFS.reduce(
  (acc, def) => {
    acc[def.id] = def.defaultCombo;
    return acc;
  },
  {} as KeybindingMap
);

const STORAGE_KEY = 'previs3d_keybindings_v1';

const MODIFIER_ONLY_KEYS = new Set([
  'Control',
  'Shift',
  'Alt',
  'Meta',
  'CapsLock',
  'NumLock',
  'ScrollLock',
]);

function normalizeMainKey(e: KeyboardEvent): string | null {
  if (MODIFIER_ONLY_KEYS.has(e.key)) return null;
  if (e.code === 'Space' || e.key === ' ') return 'Space';
  if (e.key === 'Esc' || e.key === 'Escape') return 'Escape';
  if (e.key === 'Del' || e.key === 'Delete') return 'Delete';
  if (e.key.length === 1) {
    return /^[a-z]$/i.test(e.key) ? e.key.toUpperCase() : e.key;
  }
  return e.key;
}

/**
 * Convert a KeyboardEvent into a canonical shortcut string such as
 * "W", "Space", "Delete", "Ctrl+Z", or "Shift+G". Returns null for bare modifier keys.
 */
export function eventToKeyCombo(e: KeyboardEvent): string | null {
  const main = normalizeMainKey(e);
  if (!main) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(main);
  return parts.join('+');
}

/**
 * Check whether a KeyboardEvent matches a stored canonical shortcut string.
 */
export function matchesKeyCombo(e: KeyboardEvent, combo: string): boolean {
  if (!combo) return false;
  const actual = eventToKeyCombo(e);
  if (!actual) return false;
  return actual.toLowerCase() === combo.toLowerCase();
}

/**
 * Format a canonical shortcut string for compact UI display.
 */
export function formatKeyLabel(combo: string, lang: AppLanguage = 'zh'): string {
  if (!combo) return lang === 'en' ? 'Unbound' : '未绑定';
  return combo
    .replace(/\bEscape\b/g, 'Esc')
    .replace(/\bDelete\b/g, 'Del')
    .replace(/\bBackspace\b/g, 'Bksp');
}

export function loadKeybindings(): KeybindingMap {
  if (typeof window === 'undefined') return { ...DEFAULT_KEYBINDINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYBINDINGS };
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const next: KeybindingMap = { ...DEFAULT_KEYBINDINGS };
    for (const def of KEYBINDING_DEFS) {
      const v = parsed[def.id];
      if (typeof v === 'string' && v.trim().length > 0) {
        next[def.id] = v;
      }
    }
    return next;
  } catch {
    return { ...DEFAULT_KEYBINDINGS };
  }
}

export function saveKeybindings(map: KeybindingMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors cleanly
  }
}
