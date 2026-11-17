import type { AppLanguage } from '../types/scene';

const DICT = {
  zh: {
    // TopBar
    importJson: '导入',
    saveJson: '保存',
    exportVideo: '导出',
    defog: '去雾',
    defogActive: '已去雾',
    camCollisionOn: '防穿墙',
    camCollisionOff: '可穿墙',
    camCollisionSection: '视角防穿墙（防穿模）',
    camCollisionOnDesc: '阻挡穿墙/穿地（已开启）',
    camCollisionOffDesc: '允许穿墙自由穿梭（已关闭）',
    eraser: '橡皮擦',
    settings: '设置',
    newProject: '新建空地片场工程',
    recordingCam: '录运镜中',
    safeHouse: '安全屋',
    // LeftPanel Rail
    railDirector: '导演',
    railAssets: '资产',
    railTerrain: '地形',
    railShots: '分镜',
    railInspector: '属性',
    railTimeline: '时间轴',
    // Settings Modal
    settingsTitle: '系统总设置',
    settingsSubtitle: '调整画质等级、界面语言与片场交互偏好',
    qualitySectionTitle: '渲染画质 (Graphics Quality)',
    qualityLow: '低画质',
    qualityLowDesc: '1x 分辨率 · 关闭实时阴影 · 极致流畅帧率',
    qualityMedium: '中画质',
    qualityMediumDesc: '1.5x 分辨率 · 1024px 阴影贴图 · 性能与画质均衡',
    qualityHigh: '高画质',
    qualityHighDesc: '2x 超清分辨率 · 2048px 精细软阴影 · 影视级呈现',
    languageSectionTitle: '界面语言 (Language)',
    langZh: '简体中文',
    langEn: 'English',
    quickToolsSection: '常用设置快捷入口',
    keyHintsToggle: '屏幕按键提示',
    keyHintsOn: '已显示',
    keyHintsOff: '已隐藏',
    openKeybindings: '自定义快捷键',
    openApiConfig: 'DeepSeek AI 接口配置',
    closeBtn: '完成',
    // Scatter brushes
    treeBrushLabel: '范围丛林刷（涂刷成片）',
    rockBrushLabel: '范围石群刷（涂刷成片）',
    singlePlaceLabel: '单个点放',
    brushRadius: '范围半径',
    brushDensity: '单次密度',
    mixVariants: '混种同组变体',
    singleVariant: '仅单一变体',
    // Inspector & Timeline
    inspectorTitle: '属性与检查器',
    lightingAndPasses: '光照与通道设置',
    timelineTitle: '分镜时间轴',
    // Terrain Templates & Clear Scene
    terrainTemplatesTitle: '地形模板',
    terrainTplPropsOn: '生成时附带物品: 开',
    terrainTplPropsOff: '生成时附带物品: 关',
    randomizeTerrainBtn: '随机生成当前类型地形',
    clearSceneBtn: '一键清空场景',
    clearSceneConfirmTitle: '确认清空当前场景？',
    clearSceneConfirmDesc:
      '该操作将移除画布中的所有建筑、植被、岩石、道具、车辆、角色及手绘道路/围栏，并将地形重置为初始平地（可通过 Ctrl+Z 撤销）。',
    clearSceneConfirmAction: '确认清空',
    clearSceneCancel: '取消',
    clearSceneDoneFeedback: '✓ 已清空当前场景并重置为初始平地',
  },
  en: {
    // TopBar
    importJson: 'Import',
    saveJson: 'Save',
    exportVideo: 'Export',
    defog: 'Defog',
    defogActive: 'Defogged',
    camCollisionOn: 'No Clip',
    camCollisionOff: 'Noclip On',
    camCollisionSection: 'Camera Wall Collision',
    camCollisionOnDesc: 'Blocks walls & ground (Active)',
    camCollisionOffDesc: 'Fly freely through walls (Off)',
    eraser: 'Eraser',
    settings: 'Settings',
    newProject: 'New Open-World Project',
    recordingCam: 'REC CAM',
    safeHouse: 'Compound',
    // LeftPanel Rail
    railDirector: 'Director',
    railAssets: 'Assets',
    railTerrain: 'Terrain',
    railShots: 'Shots',
    railInspector: 'Props',
    railTimeline: 'Timeline',
    // Settings Modal
    settingsTitle: 'Studio Settings',
    settingsSubtitle: 'Configure rendering quality, UI language and studio preferences',
    qualitySectionTitle: 'Graphics Quality',
    qualityLow: 'Low',
    qualityLowDesc: '1x DPR · Shadows Off · Max Performance',
    qualityMedium: 'Medium',
    qualityMediumDesc: '1.5x DPR · 1024px Shadow Map · Balanced',
    qualityHigh: 'High',
    qualityHighDesc: '2x Retina DPR · 2048px Soft Shadows · Cinema Grade',
    languageSectionTitle: 'Interface Language',
    langZh: '简体中文',
    langEn: 'English',
    quickToolsSection: 'More Studio Preferences',
    keyHintsToggle: 'On-Screen Key Hints',
    keyHintsOn: 'Shown',
    keyHintsOff: 'Hidden',
    openKeybindings: 'Keyboard Shortcuts',
    openApiConfig: 'DeepSeek AI API Key',
    closeBtn: 'Done',
    // Scatter brushes
    treeBrushLabel: 'Tree Area Brush',
    rockBrushLabel: 'Rock Area Brush',
    singlePlaceLabel: 'Single Place',
    brushRadius: 'Brush Radius',
    brushDensity: 'Density / Dab',
    mixVariants: 'Mix Variants',
    singleVariant: 'Single Variant',
    // Inspector & Timeline
    inspectorTitle: 'Object Inspector',
    lightingAndPasses: 'Lighting & Render Passes',
    timelineTitle: 'Shot Timeline',
    // Terrain Templates & Clear Scene
    terrainTemplatesTitle: 'Terrain Templates',
    terrainTplPropsOn: 'With Props: On',
    terrainTplPropsOff: 'With Props: Off',
    randomizeTerrainBtn: 'Randomize Current Terrain',
    clearSceneBtn: 'Clear Scene',
    clearSceneConfirmTitle: 'Clear Entire Scene?',
    clearSceneConfirmDesc:
      'This removes all buildings, trees, rocks, props, vehicles, characters, painted roads & fences, and resets terrain to flat ground (undoable via Ctrl+Z).',
    clearSceneConfirmAction: 'Confirm Clear',
    clearSceneCancel: 'Cancel',
    clearSceneDoneFeedback: '✓ Scene cleared and terrain reset to flat ground',
  },
} as const;

export type I18nKey = keyof typeof DICT.zh;

export function tr(lang: AppLanguage, key: I18nKey): string {
  return DICT[lang]?.[key] ?? DICT.zh[key];
}

export function pickLang(lang: AppLanguage, zh: string, en: string): string {
  return lang === 'en' ? en : zh;
}

export {
  CATALOG_ZH_TO_EN,
  translateCatalogText,
  translateDistrictName,
  translateDefaultEntityName,
} from './catalogEn';
