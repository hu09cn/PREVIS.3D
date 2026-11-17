import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  Boxes,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Crosshair,
  Eraser,
  Eye,
  EyeOff,
  Film,
  HelpCircle,
  Layers,
  Loader2,
  Lock,
  Mountain,
  MousePointerClick,
  Paintbrush,
  Pencil,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import {
  buildStep4TemplateWithStyle,
  compileValidatedDSLToWorld,
} from '../../ai/dslCompiler';
import {
  SCENE_TEMPLATE_IDS,
  type IntentSummary,
  type SceneTemplateId,
  type ValidationReport,
} from '../../ai/dslSchema';
import { SCENE_TEMPLATES, getTemplateById } from '../../ai/dslTemplates';
import { validateSceneDSL } from '../../ai/dslValidator';
import { buildIntentSummary, recommendTemplate } from '../../ai/intentPlanner';
import {
  generateCameraFromScene,
  generateDslFromIntent,
  generateFallbackStyleFromDeepSeek,
  generateWorldFromPrompt,
  isAIConfigured,
} from '../../ai/llmClient';
import type {
  UncertaintyItem,
  WorldVerificationReport,
} from '../../ai/spatialCompiler';
import {
  ASSET_ITEM_GROUPS_BY_TYPE,
  CHARACTER_ITEM_GROUPS,
  CHARACTER_VARIANTS,
  getInventoryForPropType,
  getItemGroupsForPropType,
  getTotalAssetVariantCount,
  getTotalBaseItemCount,
  getVariantSpec,
  type AssetItemGroup,
} from '../../data/assetInventory';
import { formatPresetLabel, POSE_PRESETS, PROP_CATALOG } from '../../data/presets';
import { ROAD_BRUSH_PRESETS } from '../../engine/paintedPaths';
import { describeWildcardSeed, getTerrainSize, MAX_MAP_SIZE, MIN_MAP_SIZE } from '../../engine/terrain';
import {
  tr,
  translateCatalogText,
  translateDefaultEntityName,
} from '../../i18n/translations';
import { AssetVariantThumb } from './AssetVariantThumb';
import { ShotListPanel } from './ShotListPanel';
import { useStudioStore } from '../../store/useStudioStore';
import {
  SHOT_CAMERA_ID,
  type ObjectEraseFilter,
  type PosePreset,
  type PropType,
  type TerrainBrushMaterial,
  type TerrainBrushTool,
  type TerrainTheme,
} from '../../types/scene';

export type FloatingDrawerTab = 'director' | 'assets' | 'terrain' | 'shots' | null;

const BRUSH_MATERIALS: {
  id: TerrainBrushMaterial;
  label: string;
  labelEn: string;
  color: string;
  hint: string;
  hintEn: string;
}[] = [
  { id: 'auto', label: '自动', labelEn: 'Auto', color: '#94a3b8', hint: '按海拔与坡度自动生成生态色彩', hintEn: 'Auto-blend biome color by elevation and slope' },
  { id: 'water', label: '水域', labelEn: 'Water', color: '#0ea5e9', hint: '一键下挖河湖并铺设岸边沙滩', hintEn: 'Carve rivers/lakes and paint sandy shores' },
  { id: 'grass', label: '草地', labelEn: 'Grass', color: '#5b8f48', hint: '刷出草地绿植地表', hintEn: 'Paint lush grass meadow surface' },
  { id: 'rock', label: '岩石', labelEn: 'Rock', color: '#696d74', hint: '刷出山石岩壁质感', hintEn: 'Paint rocky cliff and stone ground' },
  { id: 'sand', label: '沙滩', labelEn: 'Sand', color: '#d4bc88', hint: '刷出细腻浅沙地表', hintEn: 'Paint soft pale sand surface' },
  { id: 'soil', label: '泥土', labelEn: 'Soil', color: '#8a7256', hint: '刷出泥土小径与土地', hintEn: 'Paint dirt trails and earth' },
  { id: 'snow', label: '雪峰', labelEn: 'Snow', color: '#e2e8f0', hint: '刷出高山白雪地表', hintEn: 'Paint alpine snow cap' },
];

const BRUSH_TOOLS: {
  id: TerrainBrushTool;
  name: string;
  nameEn: string;
  sub: string;
  subEn: string;
}[] = [
  { id: 'paint', name: '涂画', nameEn: 'Paint', sub: 'Paint · 只刷材质不变形', subEn: 'Paint material only without sculpting height' },
  { id: 'clay', name: '堆积', nameEn: 'Clay', sub: 'Clay · 平顶堆积（随所选材质）', subEn: 'Flat-top clay buildup with active material' },
  { id: 'standard', name: '隆起', nameEn: 'Raise', sub: 'Standard · 缓坡丘陵', subEn: 'Standard gentle hill raise' },
  { id: 'carve', name: '挖沟', nameEn: 'Carve', sub: 'Carve · 下挖河道战壕', subEn: 'Carve trenches, ditches & channels' },
  { id: 'flatten', name: '拍平', nameEn: 'Flatten', sub: 'Flatten · 整平地基', subEn: 'Flatten ground to uniform pad height' },
  { id: 'plateau', name: '阶梯', nameEn: 'Plateau', sub: 'Plateau · 台地崖壁', subEn: 'Terraced plateau & cliff steps' },
  { id: 'smooth', name: '平滑', nameEn: 'Smooth', sub: 'Smooth · Shift 柔化高度', subEn: 'Smooth & relax sharp terrain peaks' },
  { id: 'pinch', name: '捏脊', nameEn: 'Pinch', sub: 'Pinch · 山脊锐化', subEn: 'Sharpen ridges and crests' },
  { id: 'erase', name: '擦除', nameEn: 'Erase', sub: 'Erase · 还原高度与材质', subEn: 'Erase sculpt height & restore default' },
];

/**
 * ZBrush-style terrain cross-section profile glyphs so every brush is identifiable at a glance.
 */
const BrushGlyph: React.FC<{ tool: TerrainBrushTool; className?: string }> = ({
  tool,
  className = 'w-5 h-5',
}) => {
  switch (tool) {
    case 'paint':
      return <Paintbrush className={className} />;
    case 'clay':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 18h18" strokeOpacity="0.35" strokeDasharray="2 2" />
          <path d="M4 18c1.5 0 2-6 4.5-6h7c2.5 0 3 6 4.5 6" fill="currentColor" fillOpacity="0.16" />
          <path d="M12 4v5m0 0-2.5-2.5M12 9l2.5-2.5" />
        </svg>
      );
    case 'standard':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 18h18" strokeOpacity="0.35" strokeDasharray="2 2" />
          <path d="M3 18c4 0 5.5-9 9-9s5 9 9 9" fill="currentColor" fillOpacity="0.16" />
          <path d="M12 3v4m0-4-2 2m2-2 2 2" />
        </svg>
      );
    case 'carve':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 10h18" strokeOpacity="0.35" strokeDasharray="2 2" />
          <path d="M3 10c3.8 0 5.2 9 9 9s5.2-9 9-9" fill="currentColor" fillOpacity="0.16" />
          <path d="M12 4v6m0 0-2-2m2 2 2-2" />
        </svg>
      );
    case 'flatten':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M6 13c2.5-4.5 9.5-4.5 12 0" strokeOpacity="0.35" strokeDasharray="2 2" />
          <path d="M4 13h16" />
          <path d="M4 18h16" strokeOpacity="0.4" />
          <path d="M12 4v6m0 0-2-2m2 2 2-2" />
        </svg>
      );
    case 'plateau':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 18h5l2-6h4l2-5h5" fill="currentColor" fillOpacity="0.14" />
          <path d="M3 18h5l2-6h4l2-5h5" />
        </svg>
      );
    case 'smooth':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 15c2.5-5 5-5 7.5 0s5 5 7.5 0c1-2 2-2.5 3-2.5" />
          <path d="M4 8c4-2.5 12-2.5 16 0" strokeOpacity="0.45" />
        </svg>
      );
    case 'pinch':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M5 19c4 0 5.5-12 7-12s3 12 7 12" fill="currentColor" fillOpacity="0.14" />
          <path d="M3 11h4m0 0-1.8-1.8M7 11l-1.8 1.8M21 11h-4m0 0 1.8-1.8M17 11l1.8 1.8" />
        </svg>
      );
    case 'erase':
      return <Eraser className={className} />;
  }
};

const TERRAIN_TEMPLATES: {
  id: TerrainTheme;
  label: string;
  enLabel: string;
  badge: string;
  desc: string;
}[] = [
  { id: 'flat_plain', label: '平地', enLabel: 'Flat', badge: '⬜', desc: '纯净平坦白模地面' },
  { id: 'meadow', label: '草原', enLabel: 'Meadow', badge: '🌿', desc: '连绵舒缓绿野草原' },
  { id: 'hills', label: '丘陵', enLabel: 'Hills', badge: '⛰️', desc: '起伏温柔缓坡丘陵' },
  { id: 'mountains', label: '山地', enLabel: 'Mountains', badge: '🏔️', desc: '多道山脊交错峰峦' },
  { id: 'alpine_peaks', label: '高山', enLabel: 'Alpine', badge: '❄️', desc: '巍峨雪顶高海拔群峰' },
  { id: 'plateau', label: '高原', enLabel: 'Plateau', badge: '🪨', desc: '开阔抬升台地与悬崖' },
  { id: 'ocean', label: '大海', enLabel: 'Ocean', badge: '🌊', desc: '一望无际蔚蓝深海' },
  { id: 'lone_island', label: '孤岛', enLabel: 'Island', badge: '🏝️', desc: '海面中央沙岸孤峰岛' },
  { id: 'archipelago', label: '群岛', enLabel: 'Archipelago', badge: '🗺️', desc: '星罗棋布多座岛屿链' },
  { id: 'canyon_valley', label: '峡谷河谷', enLabel: 'Canyon', badge: '🏞️', desc: '绝壁夹峙蜿蜒河谷' },
  { id: 'coastal_bay', label: '海滨半岛', enLabel: 'Bay', badge: '🏖️', desc: '月牙沙滩与海崖海岸' },
  { id: 'wildcard', label: '万象随机', enLabel: 'Wildcard', badge: '✨', desc: '真随机噪声·任意地貌融合生成' },
];

const ASSET_ERA_CHIPS: {
  id: string;
  label: string;
  labelEn: string;
  keywords: string[];
}[] = [
  { id: 'all', label: '全部分类', labelEn: 'All Eras', keywords: [] },
  {
    id: 'rural_outdoor',
    label: '户外·乡村',
    labelEn: 'Outdoor & Rural',
    keywords: ['露营', '帐篷', '帆布', '蒙古包', '尖顶帐', '星空', '农村', '砖瓦', '农家', '砖砌', '谷仓', '吊脚楼', '木屋', '茅草', '窑洞', '花房', '温室', '藏式', '瞭望', '风车', '水井', '石磨', '吊桥', '凉亭', '骏马', '大黄犬', '橘猫', '水牛', '奶牛', '绵羊', '山羊', '公鸡', '白鹅', '白兔', '赤狐', '梅花鹿', '巨龟'],
  },
  {
    id: 'ancient_cn',
    label: '古风·仙侠',
    labelEn: 'Ancient & Wuxia',
    keywords: ['古建', '古刹', '古风', '古镇', '古村', '古装', '古城', '古碑', '古亭', '仙侠', '武侠', '江湖', '客栈', '明清', '汉白玉', '徽派', '江南', '四合院', '八卦', '浑天仪', '青铜', '香炉', '牌坊', '华表', '和风', '樱花', '天守阁', '东方神龙', '金龙', '青龙', '仙鹤', '锦鲤', '大熊猫'],
  },
  {
    id: 'medieval',
    label: '中世纪·奇幻',
    labelEn: 'Medieval & Fantasy',
    keywords: ['中世纪', '古堡', '城堡', '魔法', '符文', '炼金', '欧式', '哥特', '罗马', '图腾', '遗迹', '巨石阵', '水晶', '宝箱', '壁炉', '石狮', '风车', '战马', '翼龙', '狮鹫', '独角兽', '天马', '巨蛛'],
  },
  {
    id: 'scifi',
    label: '科幻·赛博',
    labelEn: 'Sci-Fi & Cyber',
    keywords: ['科幻', '赛博', '霓虹', '全息', '激光', '磁悬浮', '反重力', '休眠舱', '雷达', '异星', '智慧', '机库', '机械猎犬', '发光水母'],
  },
  {
    id: 'steampunk',
    label: '蒸汽·复古',
    labelEn: 'Steam & Vintage',
    keywords: ['蒸汽', '民国', '维多利亚', '煤气', '英伦', '黄包车', '磨盘', '水井', '木船', '帆船', '马车'],
  },
  {
    id: 'wasteland',
    label: '战地·探险',
    labelEn: 'Tactical & Ruins',
    keywords: ['战地', '军事', '沙袋', '拒马', '防爆', '装甲', '残垣', '吊桥', '仙人掌', '荒漠', '火山'],
  },
];

const ASSET_CATEGORY_GROUPS: {
  groupLabel: string;
  groupLabelEn: string;
  types: PropType[];
}[] = [
  { groupLabel: '道路与载具', groupLabelEn: 'Roads & Vehicles', types: ['road', 'vehicle', 'lamp', 'barrier'] },
  { groupLabel: '自然景观与生物', groupLabelEn: 'Nature & Creatures', types: ['tree', 'rock', 'creature'] },
  { groupLabel: '街景、家居与道具', groupLabelEn: 'Street, Furniture & Props', types: ['furniture', 'table', 'crate', 'scene_prop'] },
  {
    groupLabel: '建筑、片场与结构',
    groupLabelEn: 'Buildings & Structures',
    types: ['building', 'facility', 'wall', 'doorway', 'stairs', 'ramp', 'pillar', 'floor', 'roof', 'box'],
  },
];

const SCENE_REPLACE_CHIPS_ZH = [
  '四根立柱围合的高台废墟广场，中间有斜坡和台阶，两名角色对峙，黄昏大雾，低角度推镜头',
  '窄巷夜晚暴雨，两旁路灯与货箱掩体，两名特工蹲伏对峙，推进镜头',
  '室外穿过门框一镜到底进入室内大厅，门外停有一辆车，大厅有长桌与楼梯，不要路灯',
];

const SCENE_REPLACE_CHIPS_EN = [
  'Ruined elevated plaza framed by four pillars, center ramp and stairs, two characters facing off, foggy dusk, low-angle dolly in',
  'Narrow rainy night alley lined with street lamps and crate cover, two crouched agents in standoff, push-in shot',
  'One-take camera passing through doorway from exterior car into hall with long table and stairs, no street lamps',
];

const PATCH_CHIPS_ZH = [
  '把主角移到汽车后面2米',
  '让主角改成瞄准姿态',
  '在主角前面3米加一辆汽车',
  '删除所有路灯',
  '去掉雾，改为黄昏',
];

const PATCH_CHIPS_EN = [
  'Move lead 2m behind the car',
  'Change lead pose to aiming',
  'Add a car 3m in front of lead',
  'Delete all street lamps',
  'Clear fog and switch to dusk',
];

const CAM_CHIPS_ZH = ['室内外一镜推进大厅', '环绕主角特写', '长焦推近对峙'];
const CAM_CHIPS_EN = ['One-take exterior-to-hall dolly in', 'Orbit close-up around lead', 'Telephoto push-in on standoff'];

type AIMode = 'replace' | 'append' | 'camera';
type ScenePipeline = 'open_world' | 'dsl_4step';

interface LeftPanelProps {
  activeDrawer: FloatingDrawerTab;
  onChangeDrawer: (tab: FloatingDrawerTab) => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  timelineOpen: boolean;
  onToggleTimeline: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  activeDrawer,
  onChangeDrawer,
  inspectorOpen,
  onToggleInspector,
  timelineOpen,
  onToggleTimeline,
}) => {
  const [aiMode, setAiMode] = useState<AIMode>('replace');
  const [scenePipeline, setScenePipeline] = useState<ScenePipeline>('open_world');
  const [prompt, setPrompt] = useState(() =>
    useStudioStore.getState().language === 'en'
      ? SCENE_REPLACE_CHIPS_EN[0]
      : SCENE_REPLACE_CHIPS_ZH[0]
  );
  const [showPresets, setShowPresets] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [compileLogs, setCompileLogs] = useState<string[]>([]);
  const [worldTheme, setWorldTheme] = useState<string | null>(null);
  const [worldVerification, setWorldVerification] = useState<WorldVerificationReport | null>(null);
  const [worldUncertainties, setWorldUncertainties] = useState<UncertaintyItem[]>([]);
  const [clarificationInput, setClarificationInput] = useState<string>('');
  const [copiedQuestions, setCopiedQuestions] = useState<boolean>(false);

  // 4-Step Scene DSL Planner & Validator State
  const [intentSummary, setIntentSummary] = useState<IntentSummary | null>(null);
  const [intentJsonText, setIntentJsonText] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<SceneTemplateId>('plaza');
  const [step2RawJson, setStep2RawJson] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [failCount, setFailCount] = useState<number>(0);
  const [step4StyleJson, setStep4StyleJson] = useState<string | null>(null);
  const [showRawDsl, setShowRawDsl] = useState<boolean>(false);

  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const shot =
    project.shots.find((s) => s.id === project.activeShotId) ?? project.shots[0];

  const aiConfig = useStudioStore((s) => s.aiConfig);
  const applyAIScene = useStudioStore((s) => s.applyAIScene);
  const setShotKeyframes = useStudioStore((s) => s.setShotKeyframes);

  const addGltfModel = useStudioStore((s) => s.addGltfModel);
  const pendingPlacement = useStudioStore((s) => s.pendingPlacement);
  const setPendingPlacement = useStudioStore((s) => s.setPendingPlacement);
  const togglePendingPlacementContinuous = useStudioStore(
    (s) => s.togglePendingPlacementContinuous
  );
  const [selectedAssetCat, setSelectedAssetCat] = useState<PropType | 'character' | null>(
    null
  );
  const [selectedItemGroupId, setSelectedItemGroupId] = useState<string | null>(null);
  const [selectedVariantByGroup, setSelectedVariantByGroup] = useState<
    Record<string, string>
  >({});
  const [selectedCharGroupId, setSelectedCharGroupId] = useState<string>(
    CHARACTER_ITEM_GROUPS[0].groupId
  );
  const [assetSearch, setAssetSearch] = useState('');
  const [assetEraFilter, setAssetEraFilter] = useState<string>('all');
  const [assetVisibleCount, setAssetVisibleCount] = useState(54);
  const [roadBrushWidth, setRoadBrushWidth] = useState(8);
  const [fenceBrushEnabled, setFenceBrushEnabled] = useState(true);
  const [treeBrushEnabled, setTreeBrushEnabled] = useState(true);
  const [treeBrushRadius, setTreeBrushRadius] = useState(12);
  const [treeBrushDensity, setTreeBrushDensity] = useState(6);
  const [treeMixVariants, setTreeMixVariants] = useState(true);
  const [rockBrushEnabled, setRockBrushEnabled] = useState(true);
  const [rockBrushRadius, setRockBrushRadius] = useState(10);
  const [rockBrushDensity, setRockBrushDensity] = useState(7);
  const [rockMixVariants, setRockMixVariants] = useState(true);
  const [eraserRadius, setEraserRadius] = useState(10);
  const [eraserFilter, setEraserFilter] = useState<ObjectEraseFilter>('all');
  const [charPlacementPose, setCharPlacementPose] = useState<PosePreset>('idle');
  const language = useStudioStore((s) => s.language);
  const en = language === 'en';
  const selectedId = useStudioStore((s) => s.selectedId);
  const selectObject = useStudioStore((s) => s.selectObject);
  const renameObject = useStudioStore((s) => s.renameObject);
  const focusSelected = useStudioStore((s) => s.focusSelected);
  const deletePaintedStroke = useStudioStore((s) => s.deletePaintedStroke);
  const toggleVisibility = useStudioStore((s) => s.toggleVisibility);
  const toggleLock = useStudioStore((s) => s.toggleLock);
  const [outlinerSearch, setOutlinerSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    const cur = prompt.trim();
    const zhIdx = SCENE_REPLACE_CHIPS_ZH.indexOf(cur);
    const enIdx = SCENE_REPLACE_CHIPS_EN.indexOf(cur);
    if (en && zhIdx !== -1) {
      setPrompt(SCENE_REPLACE_CHIPS_EN[zhIdx]);
    } else if (!en && enIdx !== -1) {
      setPrompt(SCENE_REPLACE_CHIPS_ZH[enIdx]);
    } else {
      const pZhIdx = PATCH_CHIPS_ZH.indexOf(cur);
      const pEnIdx = PATCH_CHIPS_EN.indexOf(cur);
      if (en && pZhIdx !== -1) setPrompt(PATCH_CHIPS_EN[pZhIdx]);
      else if (!en && pEnIdx !== -1) setPrompt(PATCH_CHIPS_ZH[pEnIdx]);
    }
  }, [en, prompt]);

  const beginInlineRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameDraft(translateDefaultEntityName(language, currentName));
  };

  const commitInlineRename = (id: string) => {
    if (renameDraft.trim()) {
      renameObject(id, renameDraft.trim());
    }
    setRenamingId(null);
  };

  const handleImportGlbFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addGltfModel(
          reader.result,
          file.name.replace(/\.(glb|gltf)$/i, ''),
          en ? 'Local GLB Import' : '本地 GLB 导入'
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const terrainBrush = useStudioStore((s) => s.terrainBrush);
  const setTerrainBrush = useStudioStore((s) => s.setTerrainBrush);
  const terrainBrushOrbitHold = useStudioStore((s) => s.terrainBrushOrbitHold);
  const setTerrainBrushOrbitHold = useStudioStore(
    (s) => s.setTerrainBrushOrbitHold
  );
  const applyTerrainTemplate = useStudioStore((s) => s.applyTerrainTemplate);
  const randomizeCurrentTerrain = useStudioStore(
    (s) => s.randomizeCurrentTerrain
  );
  const generateWildcardTerrain = useStudioStore(
    (s) => s.generateWildcardTerrain
  );
  const terrainTemplateGenerateProps = useStudioStore(
    (s) => s.terrainTemplateGenerateProps
  );
  const toggleTerrainTemplateGenerateProps = useStudioStore(
    (s) => s.toggleTerrainTemplateGenerateProps
  );
  const clearScene = useStudioStore((s) => s.clearScene);
  const resetTerrainSculpt = useStudioStore((s) => s.resetTerrainSculpt);
  const regroundWorldToTerrain = useStudioStore((s) => s.regroundWorldToTerrain);
  const setTerrainMapSize = useStudioStore((s) => s.setTerrainMapSize);
  const currentMapSize = getTerrainSize(project.world.terrain);
  const [mapSizeDraft, setMapSizeDraft] = useState<string>(() => String(currentMapSize));
  useEffect(() => {
    setMapSizeDraft(String(currentMapSize));
  }, [currentMapSize]);
  const [sculptFeedback, setSculptFeedback] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const parseConfirmedIntent = (): IntentSummary | null => {
    try {
      return JSON.parse(intentJsonText) as IntentSummary;
    } catch {
      return intentSummary;
    }
  };

  // Step 1 / Open-World Semantic Compiler dispatcher
  const handleRunStep1 = async (promptOverride?: unknown) => {
    const activePrompt = (
      typeof promptOverride === 'string' ? promptOverride : prompt
    ).trim();
    if (!activePrompt || loading) return;
    setShowPresets(false);

    if (aiMode === 'camera') {
      setLoading(true);
      setAiStatus(null);
      setWorldVerification(null);
      setWorldUncertainties([]);
      onChangeDrawer('director');
      try {
        const { keyframes, source, meta } = await generateCameraFromScene(
          activePrompt,
          aiConfig,
          project.world,
          shot
        );
        if (keyframes.length > 0) {
          setShotKeyframes(keyframes);
          const metaStr = meta ? ` · ${meta.model} · ${meta.latencyMs}ms` : '';
          setAiStatus(
            en
              ? `${source === 'demo' ? 'Offline Demo (No API Key)' : `DeepSeek API${metaStr}`}: generated ${keyframes.length} camera keyframes for ${translateDefaultEntityName(language, shot.name)}`
              : `${source === 'demo' ? '离线演示模式（未配置 API Key）' : `DeepSeek API${metaStr}`}：已为 ${shot.name} 生成 ${keyframes.length} 个运镜关键帧`
          );
        } else {
          setAiStatus(en ? 'No valid keyframes parsed' : '未能解析出有效关键帧');
        }
      } catch (err) {
        setAiStatus(
          en
            ? `API failed: ${err instanceof Error ? err.message : String(err)}`
            : `API 执行失败：${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // 240m Open-World Semantic Compiler pipeline (or explicit semantic patch / append mode)
    if (scenePipeline === 'open_world' || aiMode === 'append') {
      setLoading(true);
      setAiStatus(null);
      setIntentSummary(null);
      setValidationReport(null);
      setStep4StyleJson(null);
      setCompileLogs([]);
      setWorldVerification(null);
      setWorldUncertainties([]);
      setCopiedQuestions(false);
      onChangeDrawer('director');
      try {
        const mode = aiMode === 'append' ? 'append' : 'replace';
        const res = await generateWorldFromPrompt(activePrompt, mode, aiConfig, project.world);
        applyAIScene(
          res.world,
          mode === 'append' || res.shots.length === 0 ? project.shots : res.shots,
          mode === 'append' ? undefined : res.focusCenter,
          mode === 'append'
        );
        setWorldTheme(res.worldPlan.theme);
        setStep2RawJson(res.rawJson ?? null);
        setWorldVerification(res.verification);
        setWorldUncertainties(res.uncertainties);
        const srcBadge =
          res.source === 'api' && res.meta
            ? en
              ? `✓ DeepSeek API (${res.meta.model} · ${res.meta.latencyMs}ms · ${res.meta.via === 'vite-proxy' ? 'Proxy' : 'Direct'} · ${res.roundCount} pass(es))`
              : `✓ DeepSeek API (${res.meta.model} · ${res.meta.latencyMs}ms · ${res.meta.via === 'vite-proxy' ? '本地代理' : '直连'} · ${res.roundCount} 轮校验)`
            : en
              ? '⚠ Running local demo rules (configure DeepSeek API Key in Settings for live LLM builds)'
              : '⚠ 当前为本地演示规则编译（如需真实 DeepSeek 生成，请在右上角钥匙图标配置 API Key）';
        setCompileLogs([srcBadge, ...res.logs]);
        const warnSuffix =
          res.verification.issues.length > 0
            ? en
              ? ` (⚠ ${res.verification.issues.length} issue(s) below)`
              : `（⚠ 仍有 ${res.verification.issues.length} 项偏差/待确认，见下方问题列表）`
            : res.uncertainties.length > 0
              ? en
                ? ` (ℹ DeepSeek raised ${res.uncertainties.length} question(s))`
                : `（ℹ DeepSeek 提出 ${res.uncertainties.length} 条不确定确认点）`
              : '';
        setAiStatus(
          en
            ? `${res.source === 'api' ? 'DeepSeek 960m Open World Ready' : 'Local Demo Open World Ready'} (${mode === 'append' ? 'Semantic Patch' : 'New Stage'}): ${res.world.buildings.length} buildings · ${res.world.customModels?.length ?? 0} custom models · ${res.world.assets.length + res.world.scatteredProps.length} props · ${res.world.characters.length} characters${warnSuffix}`
            : `${res.source === 'api' ? 'DeepSeek 960m 开放世界构建完成' : '本地演示大世界构建完成'}（${mode === 'append' ? '增量追加' : '新建片场'}）：${res.world.buildings.length} 建筑 · ${res.world.customModels?.length ?? 0} AI自建模型 · ${res.world.assets.length + res.world.scatteredProps.length} 道具 · ${res.world.characters.length} 角色${warnSuffix}`
        );
      } catch (err) {
        setAiStatus(
          en
            ? `DeepSeek open-world call failed: ${err instanceof Error ? err.message : String(err)}`
            : `DeepSeek 开放世界调用失败：${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    const summary = buildIntentSummary(activePrompt);
    const tpl = summary.recommended_template || recommendTemplate(prompt);
    setIntentSummary(summary);
    setSelectedTemplate(tpl);
    setIntentJsonText(
      JSON.stringify(
        {
          style: summary.style,
          layout: summary.layout,
          must_have: summary.must_have,
          camera_intent: summary.camera_intent,
          forbidden: summary.forbidden,
          ambiguous: summary.ambiguous,
        },
        null,
        2
      )
    );
    setStep2RawJson(null);
    setValidationReport(null);
    setStep4StyleJson(null);
    setFailCount(0);
    setCompileLogs([]);
    setWorldTheme(null);
    setAiStatus(
      summary.ambiguous
        ? en
          ? 'Step 1 blocked: ambiguous intent detected. Clarify prompt or edit summary JSON.'
          : 'Step 1 拦截：用户意图存在模糊，请补充具体元素后重新解析，或手动补全摘要 JSON。'
        : en
          ? 'Step 1 generated Intent JSON. Review template & fields, then click "Confirm & Build DSL".'
          : 'Step 1 已生成意图摘要 JSON，请核对模板与字段后点击“确认并生成 DSL”。'
    );
    onChangeDrawer('director');
  };

  // Step 4: Template-locked fallback (DeepSeek fills ONLY style/names)
  const executeStep4Fallback = async (
    confirmedIntent: IntentSummary,
    tplId: SceneTemplateId,
    priorReport?: ValidationReport
  ) => {
    setLoading(true);
    try {
      const { patch, rawText, source } = await generateFallbackStyleFromDeepSeek(
        confirmedIntent,
        tplId,
        aiConfig
      );
      setStep4StyleJson(rawText);
      const lockedDsl = buildStep4TemplateWithStyle(confirmedIntent, tplId, patch);
      const tplDef = getTemplateById(tplId);
      const report = validateSceneDSL(JSON.stringify(lockedDsl, null, 2), confirmedIntent, tplDef);
      setStep2RawJson(report.rawJson);
      setValidationReport(report);

      if (report.passed && report.parsedDsl) {
        const compiled = compileValidatedDSLToWorld(
          report.parsedDsl,
          tplDef,
          project.world
        );
        const finalWorld =
          aiMode === 'append'
            ? {
                ...project.world,
                buildings: [...project.world.buildings, ...compiled.world.buildings],
                heroCompound: compiled.world.heroCompound ?? project.world.heroCompound,
                scatteredProps: [...project.world.scatteredProps, ...compiled.world.scatteredProps],
                assets: [...project.world.assets, ...compiled.world.assets],
                characters: [...project.world.characters, ...compiled.world.characters],
                lastWorldPlan: compiled.world.lastWorldPlan,
              }
            : compiled.world;
        applyAIScene(
          finalWorld,
          aiMode === 'append' ? project.shots : compiled.shots,
          compiled.focusCenter
        );
        setWorldTheme(finalWorld.lastWorldPlan?.theme ?? tplDef.name);
        setCompileLogs([
          ...(priorReport
            ? [
                en
                  ? `⚠ Step 3 failed twice; auto-switched to Step 4 locked template (${tplId})`
                  : `⚠ Step 3 连续失败 2 次，已自动切换至 Step 4 固定模板兜底 (${tplId})`,
              ]
            : [
                en
                  ? `✓ Step 4 locked template triggered (${tplId})`
                  : `✓ 已触发 Step 4 固定模板兜底 (${tplId})`,
              ]),
          en
            ? `✓ DeepSeek (${source}) styled names/mood only; coordinates locked 100% by template`
            : `✓ DeepSeek (${source}) 仅填充风格与命名参数，布局坐标 100% 由模板锁定`,
          ...compiled.logs,
        ]);
        setAiStatus(
          en
            ? `Step 4 loaded (${tplDef.name}${aiMode === 'append' ? ' · Append' : ''}): ${finalWorld.buildings.length} buildings · ${finalWorld.assets.length + finalWorld.scatteredProps.length} props · ${finalWorld.characters.length} characters`
            : `Step 4 兜底已入视口 (${tplDef.name}${aiMode === 'append' ? ' · 增量' : ''})：${finalWorld.buildings.length} 建筑 · ${finalWorld.assets.length + finalWorld.scatteredProps.length} 道具 · ${finalWorld.characters.length} 角色`
        );
      } else {
        setAiStatus(
          en
            ? 'Step 4 validation failed; nothing applied. Check summary JSON fields.'
            : 'Step 4 校验异常，未写入视口，请检查手动摘要字段。'
        );
      }
    } catch (err) {
      setAiStatus(
        en
          ? `Step 4 failed: ${err instanceof Error ? err.message : String(err)}`
          : `Step 4 执行失败：${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2 (DeepSeek JSON) + Step 3 (Strict 3-Layer Validator, NO silent repair)
  const handleConfirmStep2And3 = async (
    overrideTemplate?: SceneTemplateId,
    feedbackIssues?: string[]
  ) => {
    const confirmed = parseConfirmedIntent();
    if (!confirmed || loading) return;
    if (confirmed.ambiguous) {
      setAiStatus(
        en
          ? 'Summary still has ambiguous: true. Clarify intent first.'
          : '摘要中仍包含 ambiguous: true，请先消除模糊项后再确认执行。'
      );
      return;
    }

    const activeTplId = overrideTemplate || selectedTemplate;
    const tplDef = getTemplateById(activeTplId);

    setLoading(true);
    setStep4StyleJson(null);
    setAiStatus(null);
    try {
      const { rawText, source, meta } = await generateDslFromIntent(
        confirmed,
        activeTplId,
        aiConfig,
        feedbackIssues
      );
      const report = validateSceneDSL(rawText, confirmed, tplDef);
      setStep2RawJson(report.rawJson);
      setValidationReport(report);

      if (report.passed && report.parsedDsl) {
        setFailCount(0);
        const compiled = compileValidatedDSLToWorld(
          report.parsedDsl,
          tplDef,
          project.world
        );
        const finalWorld =
          aiMode === 'append'
            ? {
                ...project.world,
                buildings: [...project.world.buildings, ...compiled.world.buildings],
                heroCompound: compiled.world.heroCompound ?? project.world.heroCompound,
                scatteredProps: [...project.world.scatteredProps, ...compiled.world.scatteredProps],
                assets: [...project.world.assets, ...compiled.world.assets],
                characters: [...project.world.characters, ...compiled.world.characters],
                lastWorldPlan: compiled.world.lastWorldPlan,
              }
            : compiled.world;
        applyAIScene(
          finalWorld,
          aiMode === 'append' ? project.shots : compiled.shots,
          compiled.focusCenter
        );
        setWorldTheme(finalWorld.lastWorldPlan?.theme ?? tplDef.name);
        const apiBadge =
          source === 'api' && meta
            ? en
              ? `✓ Step 2 DeepSeek (${meta.model} · ${meta.latencyMs}ms · ${meta.via === 'vite-proxy' ? 'Proxy' : 'Direct'}) returned structured DSL`
              : `✓ Step 2 DeepSeek (${meta.model} · ${meta.latencyMs}ms · ${meta.via === 'vite-proxy' ? '本地代理' : '直连'}) 已返回结构化 DSL`
            : en
              ? '⚠ Step 2 running local demo template (no API Key configured)'
              : '⚠ Step 2 当前为本地演示模板（未配置 API Key）';
        setCompileLogs([
          apiBadge,
          en
            ? '✓ Step 3 3-layer validation (Syntax / Semantic / Geometry) passed'
            : '✓ Step 3 三层校验（语法 / 语义 / 几何）全部通过',
          ...compiled.logs,
        ]);
        setAiStatus(
          en
            ? `Validated & applied (${aiMode === 'append' ? 'Append' : 'New'}): ${finalWorld.buildings.length} buildings · ${finalWorld.assets.length + finalWorld.scatteredProps.length} props · ${finalWorld.characters.length} characters`
            : `校验通过并入视口（${aiMode === 'append' ? '增量追加' : '新建'}）：${finalWorld.buildings.length} 建筑 · ${finalWorld.assets.length + finalWorld.scatteredProps.length} 道具 · ${finalWorld.characters.length} 角色`
        );
      } else {
        const nextFail = failCount + 1;
        setFailCount(nextFail);
        setShowRawDsl(true);
        setCompileLogs([]);

        if (nextFail >= 2) {
          setAiStatus(
            en
              ? `Step 3 failed #${nextFail} -> auto-triggering Step 4 (Locked Template "${activeTplId}" + DeepSeek Style)`
              : `Step 3 连续第 ${nextFail} 次校验失败 → 自动触发 Step 4（固定模板 "${activeTplId}" + DeepSeek 风格填充）`
          );
          await executeStep4Fallback(confirmed, activeTplId, report);
          return;
        }

        const totalErrs =
          report.syntaxIssues.length +
          report.semanticIssues.length +
          report.geometryIssues.length;
        setAiStatus(
          en
            ? `Step 3 validation failed (${totalErrs} issues; blocked from viewport, fail ${nextFail}/2)`
            : `Step 3 校验未通过（共 ${totalErrs} 项问题，已拒绝进入视口，第 ${nextFail}/2 次失败）`
        );
      }
    } catch (err) {
      const nextFail = failCount + 1;
      setFailCount(nextFail);
      setAiStatus(
        en
          ? `Step 2 request failed: ${err instanceof Error ? err.message : String(err)}`
          : `Step 2 请求异常：${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const parsedConfirmed = parseConfirmedIntent();
  const isAmbiguous = Boolean(parsedConfirmed?.ambiguous);

  const SCENE_REPLACE_CHIPS = en ? SCENE_REPLACE_CHIPS_EN : SCENE_REPLACE_CHIPS_ZH;
  const PATCH_CHIPS = en ? PATCH_CHIPS_EN : PATCH_CHIPS_ZH;
  const CAM_CHIPS = en ? CAM_CHIPS_EN : CAM_CHIPS_ZH;

  const presetChips =
    aiMode === 'camera'
      ? CAM_CHIPS
      : aiMode === 'append'
      ? PATCH_CHIPS
      : SCENE_REPLACE_CHIPS;

  const switchAiMode = (nextMode: AIMode) => {
    setAiMode(nextMode);
    const allReplace = [...SCENE_REPLACE_CHIPS_ZH, ...SCENE_REPLACE_CHIPS_EN];
    const allPatch = [...PATCH_CHIPS_ZH, ...PATCH_CHIPS_EN];
    if (nextMode === 'append' && (allReplace.includes(prompt.trim()) || !prompt.trim())) {
      setPrompt(PATCH_CHIPS[0]);
    } else if (nextMode === 'replace' && (allPatch.includes(prompt.trim()) || !prompt.trim())) {
      setPrompt(SCENE_REPLACE_CHIPS[0]);
    }
  };

  const toggleTab = (tab: Exclude<FloatingDrawerTab, null>) => {
    onChangeDrawer(activeDrawer === tab ? null : tab);
  };

  return (
    <>
      {/* 1. Left Compact Floating Vertical Tool Rail */}
      <nav className="pointer-events-auto fixed left-3.5 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 rounded-2xl glass-panel p-1.5 text-slate-600">
        <button
          onClick={() => toggleTab('director')}
          title={en ? 'AI Director & 4-Step DSL Console' : 'AI 导演与 4-Step DSL 校验台'}
          className={`w-12 py-2 rounded-xl flex flex-col items-center gap-1 transition ${
            activeDrawer === 'director'
              ? 'glass-btn-active'
              : 'glass-btn text-slate-700 hover:text-slate-950'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeDrawer === 'director' ? 'text-sky-400' : ''}`} />
          <span className="text-[10px] font-medium leading-none">
            {tr(language, 'railDirector')}
          </span>
        </button>

        <button
          onClick={() => toggleTab('assets')}
          title={en ? 'Asset Library & Scene Outliner' : '白模资产库与场景大纲'}
          className={`w-12 py-2 rounded-xl flex flex-col items-center gap-1 transition ${
            activeDrawer === 'assets'
              ? 'glass-btn-active'
              : 'glass-btn text-slate-700 hover:text-slate-950'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">
            {tr(language, 'railAssets')}
          </span>
        </button>

        <button
          onClick={() => toggleTab('terrain')}
          title={en ? 'ZBrush Terrain Sculpt Brush (B)' : 'ZBrush 地形建模笔刷 (B)'}
          className={`w-12 py-2 rounded-xl flex flex-col items-center gap-1 transition relative ${
            activeDrawer === 'terrain' || terrainBrush.active
              ? 'glass-btn-active'
              : 'glass-btn text-slate-700 hover:text-slate-950'
          }`}
        >
          <Mountain
            className={`w-4 h-4 ${terrainBrush.active ? 'text-rose-400' : ''}`}
          />
          <span className="text-[10px] font-medium leading-none">
            {tr(language, 'railTerrain')}
          </span>
          {terrainBrush.active && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => toggleTab('shots')}
          data-testid="rail-shots-btn"
          title={en ? 'Shots List & Aspect Ratios' : '分镜 Shot 列表与画幅管理'}
          className={`w-12 py-2 rounded-xl flex flex-col items-center gap-1 transition relative ${
            activeDrawer === 'shots'
              ? 'glass-btn-active'
              : 'glass-btn text-slate-700 hover:text-slate-950'
          }`}
        >
          <Film className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">
            {tr(language, 'railShots')}
          </span>
          {project.shots.length > 1 && (
            <span className="absolute top-1 right-1 px-1 rounded-full bg-sky-500 text-white text-[8px] font-mono leading-tight">
              {project.shots.length}
            </span>
          )}
        </button>

        <div className="w-7 h-px bg-white/70 my-0.5" />

        <button
          onClick={onToggleInspector}
          title={en ? 'Lighting & Object Inspector' : '环境光照与选中属性检查器'}
          className={`w-12 py-2 rounded-xl flex flex-col items-center gap-1 transition ${
            inspectorOpen
              ? 'glass-btn-accent'
              : 'glass-btn text-slate-700 hover:text-slate-950'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">
            {tr(language, 'railInspector')}
          </span>
        </button>

        <button
          onClick={onToggleTimeline}
          title={en ? 'Toggle Keyframe Timeline' : '展开/收起关键帧时间轴'}
          className={`w-12 py-2 rounded-xl flex flex-col items-center gap-1 transition ${
            timelineOpen
              ? 'glass-btn-accent'
              : 'glass-btn text-slate-700 hover:text-slate-950'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">
            {tr(language, 'railTimeline')}
          </span>
        </button>
      </nav>

      {/* 2. Expandable Left Floating Drawer */}
      {activeDrawer !== null && (
        <aside
          className={`pointer-events-auto fixed left-20 top-16 z-30 w-80 ${
            timelineOpen ? 'max-h-[calc(100vh-15.5rem)]' : 'max-h-[calc(100vh-10.5rem)]'
          } rounded-2xl glass-drawer flex flex-col overflow-hidden text-slate-800 transition-all`}
        >
          <div className="h-10 px-3.5 border-b border-white/60 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              {activeDrawer === 'director' && (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  {en ? 'AI Director & 4-Step Scene DSL' : '4-Step 场景 DSL 规划校验台'}
                </>
              )}
              {activeDrawer === 'assets' && (
                <>
                  <Boxes className="w-3.5 h-3.5 text-sky-600" />
                  {en ? 'Asset Library & Scene Outliner' : '白模资产库 & 场景大纲'}
                </>
              )}
              {activeDrawer === 'terrain' && (
                <>
                  <Mountain className="w-3.5 h-3.5 text-rose-500" />
                  {en ? 'ZBrush Terrain Sculpting' : 'ZBrush 地形雕刻笔刷'}
                </>
              )}
              {activeDrawer === 'shots' && (
                <>
                  <Film className="w-3.5 h-3.5 text-sky-600" />
                  {en ? 'Shots & Aspect Ratio' : '分镜队列 & 画幅设置'}
                </>
              )}
            </span>
            <button
              onClick={() => onChangeDrawer(null)}
              title={en ? 'Collapse drawer' : '收起抽屉'}
              className="p-1 rounded-full hover:bg-slate-900/5 text-slate-500 hover:text-slate-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Drawer Tab A: DeepSeek Director (960m Open World + 4-Step DSL) */}
            {activeDrawer === 'director' && (
              <>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">
                    {scenePipeline === 'open_world'
                      ? en
                        ? '960m Open-World Compiler'
                        : '960m 开放大世界语义编译'
                      : en
                        ? '4-Step Planner · DeepSeek T=0.15'
                        : '4-Step 规划校验 · DeepSeek T=0.15'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full border font-mono ${
                      isAIConfigured(aiConfig)
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                    }`}
                  >
                    {isAIConfigured(aiConfig)
                      ? 'DeepSeek · deepseek-chat (Tools + Patch)'
                      : en
                        ? 'No Key (Demo Mode)'
                        : '未配置 Key（演示模式）'}
                  </span>
                </div>

                {/* Engine Switch */}
                {aiMode !== 'camera' && (
                  <div className="grid grid-cols-2 gap-1 bg-sky-950/5 p-1 rounded-xl text-[10px] border border-sky-500/15">
                    <button
                      onClick={() => setScenePipeline('open_world')}
                      className={`py-1 px-2 rounded-lg font-medium transition ${
                        scenePipeline === 'open_world'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {en ? '960m Open World' : '960m 开放大世界'}
                    </button>
                    <button
                      onClick={() => setScenePipeline('dsl_4step')}
                      className={`py-1 px-2 rounded-lg font-medium transition ${
                        scenePipeline === 'dsl_4step'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {en ? '4-Step DSL Validator' : '精准 4-Step 校验台'}
                    </button>
                  </div>
                )}

                {/* Mode Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-slate-900/5 p-1 rounded-xl text-[11px]">
                  {(
                    [
                      { id: 'replace', label: en ? 'New Scene' : '新建场景' },
                      { id: 'append', label: en ? 'Semantic Patch' : '语义 Patch 编辑' },
                      { id: 'camera', label: en ? 'Camera Move' : '设计运镜' },
                    ] as { id: AIMode; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => switchAiMode(m.id)}
                      className={`py-1 rounded-lg font-medium transition ${
                        aiMode === m.id
                          ? 'bg-white text-slate-900 shadow-sm font-semibold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Prompt Input + Chips */}
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    aiMode === 'append'
                      ? en
                        ? 'Enter semantic patch, e.g. Move lead 2m behind car / Change agent pose to aiming / Delete barriers / Clear fog...'
                        : '输入增量 Patch 指令，如：把主角移到汽车后面2米 / 让潜伏特工改成瞄准 / 删除路障 / 去掉雾...'
                      : en
                        ? 'Describe scene style, spatial layout, must-have elements, exclusions & camera intent...'
                        : '描述场景风格、空间布局、必含元素、禁用元素与机位意图...'
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none resize-none"
                />

                {aiMode === 'append' && (
                  <div className="rounded-xl border border-sky-500/20 bg-sky-50/70 p-2 space-y-1">
                    <div className="text-[10px] font-semibold text-sky-900">
                      {en ? 'Referenceable Scene Objects (click to insert):' : '当前可引用对象（点击插入名称）：'}
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {[
                        ...project.world.characters.map((c) => translateDefaultEntityName(language, c.name)),
                        ...(project.world.customModels ?? []).map((m) => translateDefaultEntityName(language, m.name)),
                        ...project.world.assets.slice(0, 6).map((a) => translateDefaultEntityName(language, a.name)),
                        ...(project.world.heroCompound ? [en ? 'Hero Compound' : '安全屋'] : []),
                      ].map((label, idx) => (
                        <button
                          key={`${label}_${idx}`}
                          type="button"
                          onClick={() => setPrompt((prev) => (prev ? `${prev} ${label}` : label))}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-sky-200 text-sky-800 hover:bg-sky-100 transition"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {presetChips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setPrompt(chip)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-900/5 hover:bg-slate-900/10 text-slate-600 hover:text-slate-900 text-left transition"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleRunStep1}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  {aiMode === 'camera'
                    ? en
                      ? `Generate Camera Path (${translateDefaultEntityName(language, shot.name)})`
                      : `生成 ${shot.name} 运镜`
                    : aiMode === 'append'
                      ? en
                        ? 'Apply Semantic Patch'
                        : '执行语义 Patch 增量修改'
                      : scenePipeline === 'open_world'
                        ? en
                          ? 'DeepSeek Build 960m Open World'
                          : 'DeepSeek 构建 960m 开放大世界'
                        : en
                          ? 'Step 1: Parse Intent Summary (Local Planner)'
                          : 'Step 1：解析意图摘要 (本地规划器)'}
                </button>

                {/* Step 1 Intent Summary JSON */}
                {aiMode !== 'camera' && intentSummary && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">
                        {en ? 'Step 1 Intent Summary JSON' : 'Step 1 意图摘要 JSON'}
                      </span>
                      {isAmbiguous ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30 flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          ambiguous: true
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          {en ? 'Spec Ready' : '规格就绪'}
                        </span>
                      )}
                    </div>

                    {isAmbiguous && intentSummary.clarification_questions && (
                      <div className="rounded-lg border border-amber-400/50 bg-amber-50 p-2 text-[10px] text-amber-900 space-y-1">
                        <div className="font-semibold">
                          {en ? 'Clarification Needed (no silent guessing):' : '需要追问确认（禁止直接猜测）：'}
                        </div>
                        {intentSummary.clarification_questions.map((q, i) => (
                          <div key={i}>• {q}</div>
                        ))}
                      </div>
                    )}

                    <textarea
                      rows={6}
                      value={intentJsonText}
                      onChange={(e) => setIntentJsonText(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-[10px] font-mono text-slate-700 focus:border-sky-500 focus:outline-none"
                    />

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {en ? 'Template' : '预计算模板'}
                      </span>
                      <select
                        value={selectedTemplate}
                        onChange={(e) =>
                          setSelectedTemplate(e.target.value as SceneTemplateId)
                        }
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 focus:outline-none"
                      >
                        {SCENE_TEMPLATE_IDS.map((id) => (
                          <option key={id} value={id}>
                            {SCENE_TEMPLATES[id].name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => handleConfirmStep2And3()}
                      disabled={loading || isAmbiguous}
                      className="w-full py-1.5 px-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold disabled:opacity-40 transition shadow-sm"
                    >
                      {en ? 'Confirm -> Step 2 Generate & Step 3 Validate' : '确认摘要 → Step 2 生成 & Step 3 校验'}
                    </button>
                  </div>
                )}

                {/* Step 3 Validation Report & Step 2 Raw DSL */}
                {aiMode !== 'camera' && validationReport && (
                  <div
                    className={`rounded-xl border p-2.5 space-y-2 ${
                      validationReport.passed
                        ? 'border-emerald-300 bg-emerald-50/80'
                        : 'border-rose-300 bg-rose-50/85'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold flex items-center gap-1 text-slate-900">
                        {validationReport.passed ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        {en ? 'Step 3 Validation ' : 'Step 3 三层校验'}
                        {validationReport.passed
                          ? en
                            ? 'Passed'
                            : '通过'
                          : en
                            ? 'Blocked'
                            : '拦截（拒绝入视口）'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {en ? 'Fails' : '失败'}: {failCount}/2
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                      <div
                        className={`px-1.5 py-0.5 rounded-lg text-center border ${
                          validationReport.syntaxIssues.length === 0
                            ? 'border-emerald-300 bg-white/80 text-emerald-700'
                            : 'border-rose-300 bg-white/80 text-rose-700'
                        }`}
                      >
                        {en ? 'Syntax' : '语法'} {validationReport.syntaxIssues.length === 0 ? '✓' : `✗${validationReport.syntaxIssues.length}`}
                      </div>
                      <div
                        className={`px-1.5 py-0.5 rounded-lg text-center border ${
                          validationReport.semanticIssues.length === 0
                            ? 'border-emerald-300 bg-white/80 text-emerald-700'
                            : 'border-rose-300 bg-white/80 text-rose-700'
                        }`}
                      >
                        {en ? 'Semantic' : '语义'} {validationReport.semanticIssues.length === 0 ? '✓' : `✗${validationReport.semanticIssues.length}`}
                      </div>
                      <div
                        className={`px-1.5 py-0.5 rounded-lg text-center border ${
                          validationReport.geometryIssues.length === 0
                            ? 'border-emerald-300 bg-white/80 text-emerald-700'
                            : 'border-rose-300 bg-white/80 text-rose-700'
                        }`}
                      >
                        {en ? 'Geometry' : '几何'} {validationReport.geometryIssues.length === 0 ? '✓' : `✗${validationReport.geometryIssues.length}`}
                      </div>
                    </div>

                    {!validationReport.passed && (
                      <>
                        <div className="space-y-1 text-[10px] text-rose-800 max-h-28 overflow-y-auto">
                          {[
                            ...validationReport.syntaxIssues,
                            ...validationReport.semanticIssues,
                            ...validationReport.geometryIssues,
                          ].map((msg, i) => (
                            <div key={i} className="leading-snug">
                              • {msg}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            onClick={() =>
                              handleConfirmStep2And3(undefined, [
                                ...validationReport.syntaxIssues,
                                ...validationReport.semanticIssues,
                                ...validationReport.geometryIssues,
                              ])
                            }
                            disabled={loading}
                            className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] text-slate-800 font-medium"
                          >
                            <RotateCcw className="w-3 h-3" />
                            {en ? 'Retry with Errors' : '发报错给 DeepSeek 修正'}
                          </button>
                          <button
                            onClick={() => {
                              if (parsedConfirmed) {
                                executeStep4Fallback(
                                  parsedConfirmed,
                                  selectedTemplate,
                                  validationReport
                                );
                              }
                            }}
                            disabled={loading || !parsedConfirmed}
                            className="py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-[10px] text-amber-800 font-semibold"
                          >
                            {en ? 'Step 4 Fallback' : 'Step 4 模板兜底'}
                          </button>
                        </div>
                      </>
                    )}

                    {step2RawJson && (
                      <div className="pt-1 border-t border-slate-200/70">
                        <button
                          onClick={() => setShowRawDsl((v) => !v)}
                          className="text-[10px] text-slate-600 hover:text-slate-900 underline"
                        >
                          {showRawDsl
                            ? en
                              ? 'Hide Step 2 Raw DSL JSON'
                              : '收起 Step 2 原始 DSL JSON'
                            : en
                              ? 'Show Step 2 Raw DSL JSON'
                              : '查看 Step 2 原始 DSL JSON'}
                        </button>
                        {showRawDsl && (
                          <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-slate-900 p-2 text-[9px] font-mono text-slate-200 whitespace-pre-wrap break-all">
                            {step2RawJson}
                          </pre>
                        )}
                      </div>
                    )}

                    {step4StyleJson && (
                      <div className="pt-1 border-t border-slate-200/70">
                        <div className="text-[10px] text-amber-800 font-semibold">
                          {en
                            ? 'Step 4 DeepSeek Style Patch (layout locked):'
                            : 'Step 4 DeepSeek 风格补丁（布局已锁定模板）：'}
                        </div>
                        <pre className="mt-1 max-h-24 overflow-auto rounded-lg bg-slate-900 p-2 text-[9px] font-mono text-amber-200 whitespace-pre-wrap break-all">
                          {step4StyleJson}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {aiStatus && (
                  <div className="rounded-xl border border-slate-200 bg-white/90 p-2.5 text-[11px] text-slate-700 leading-relaxed space-y-1">
                    {worldTheme && (
                      <div className="text-[10px] font-bold text-sky-700">
                        {en ? 'Scene Theme: ' : '场景主题：'}{worldTheme}
                      </div>
                    )}
                    <div>{aiStatus}</div>
                    {compileLogs.length > 0 && (
                      <div className="max-h-24 overflow-y-auto pt-1 border-t border-slate-200/80 space-y-0.5 text-[10px] font-mono text-emerald-700">
                        {compileLogs.map((line, i) => (
                          <div key={i} className="leading-tight">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                    {!validationReport && step2RawJson && (
                      <div className="pt-1 border-t border-slate-200/80">
                        <button
                          onClick={() => setShowRawDsl((v) => !v)}
                          className="text-[10px] text-slate-600 hover:text-slate-900 underline"
                        >
                          {showRawDsl
                            ? en
                              ? 'Hide DeepSeek Raw JSON'
                              : '收起 DeepSeek 原始 JSON'
                            : en
                              ? 'Show DeepSeek Raw JSON'
                              : '查看 DeepSeek 原始 JSON'}
                        </button>
                        {showRawDsl && (
                          <pre className="mt-1 max-h-28 overflow-auto rounded-lg bg-slate-900 p-2 text-[9px] font-mono text-slate-200 whitespace-pre-wrap break-all">
                            {step2RawJson}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(worldUncertainties.length > 0 ||
                  (worldVerification && worldVerification.issues.length > 0)) && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 space-y-2 text-[11px] text-amber-950">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold flex items-center gap-1 text-amber-900">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        {en
                          ? 'DeepSeek Ambiguities / Deviations'
                          : '与 DeepSeek 的不确定事项 / 偏差核对'}
                      </span>
                      <button
                        onClick={() => {
                          const lines: string[] = [
                            `${en ? 'Original Prompt: ' : '原始提示词：'}${prompt}`,
                            ...(worldVerification?.issues.length
                              ? [
                                  '',
                                  en ? '[Unmatched / Out-of-Scope]' : '【未匹配/超纲项】',
                                  ...worldVerification.issues.map((i) => `- ${i}`),
                                ]
                              : []),
                            ...(worldUncertainties.length
                              ? [
                                  '',
                                  en ? '[DeepSeek Questions]' : '【DeepSeek 待确认问题】',
                                  ...worldUncertainties.map(
                                    (u, idx) =>
                                      en
                                        ? `${idx + 1}. [${u.topic}] ${u.question} (Assumed: ${u.assumption})`
                                        : `${idx + 1}. [${u.topic}] ${u.question}（当前暂定：${u.assumption}）`
                                  ),
                                ]
                              : []),
                          ];
                          navigator.clipboard?.writeText(lines.join('\n')).catch(() => {});
                          setCopiedQuestions(true);
                          setTimeout(() => setCopiedQuestions(false), 2000);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-[10px] font-medium text-amber-800 shrink-0 flex items-center gap-1"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        {copiedQuestions ? (en ? 'Copied' : '已复制') : en ? 'Copy Issues' : '复制问题'}
                      </button>
                    </div>

                    {worldVerification && worldVerification.issues.length > 0 && (
                      <div className="rounded-lg bg-white/80 border border-amber-200 p-2 space-y-1 text-[10px] text-rose-800">
                        <div className="font-semibold text-rose-900">
                          {en
                            ? 'Detected mismatches / unsupported elements:'
                            : '自动核对发现以下偏差/不支持元素：'}
                        </div>
                        {worldVerification.issues.map((iss, idx) => (
                          <div key={idx} className="leading-snug">
                            • {iss}
                          </div>
                        ))}
                      </div>
                    )}

                    {worldUncertainties.length > 0 && (
                      <div className="space-y-1.5 text-[10px]">
                        <div className="font-semibold text-amber-900">
                          {en ? 'Open Questions from DeepSeek:' : 'DeepSeek 主动提出的待澄清点：'}
                        </div>
                        {worldUncertainties.map((u, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg bg-white/85 border border-amber-200/80 p-1.5 space-y-0.5"
                          >
                            <div className="font-semibold text-slate-800">
                              {idx + 1}. {u.topic}: {u.question}
                            </div>
                            <div className="text-slate-500">
                              {en ? 'Current assumption: ' : '当前暂按：'}
                              {u.assumption}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1 border-t border-amber-200/80">
                      <textarea
                        rows={2}
                        value={clarificationInput}
                        onChange={(e) => setClarificationInput(e.target.value)}
                        placeholder={
                          en
                            ? 'Add specific clarifications (e.g. no street lamps, 2m tall platform, two facing characters, replace with crates...)'
                            : '补充明确细节给 DeepSeek（例如：不要路灯、高台高2米、2名角色面对面站立、用围墙+货箱代替...）'
                        }
                        className="w-full rounded-lg border border-amber-300 bg-white p-1.5 text-[10px] text-slate-800 focus:border-sky-500 focus:outline-none resize-none"
                      />
                      <button
                        disabled={loading || !clarificationInput.trim()}
                        onClick={() => {
                          const extra = clarificationInput.trim();
                          if (!extra) return;
                          const mergedPrompt = `${prompt.trim()}\n${en ? 'Clarification: ' : '补充确定要求：'}${extra}`;
                          setPrompt(mergedPrompt);
                          setClarificationInput('');
                          handleRunStep1(mergedPrompt);
                        }}
                        className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-45 text-white text-[10px] font-semibold transition"
                      >
                        <Send className="w-3 h-3" />
                        {en ? 'Send Clarifications & Regenerate' : '将补充澄清发给 DeepSeek 重新生成'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Drawer Tab B: Categorized Asset Inventory Library + Scene Outliner */}
            {activeDrawer === 'assets' && (
              <>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {selectedAssetCat === null
                        ? en
                          ? `Asset Library (${getTotalBaseItemCount() + CHARACTER_ITEM_GROUPS.length} items · ${getTotalAssetVariantCount() + CHARACTER_VARIANTS.length} vars)`
                          : `分类资产库 (${getTotalBaseItemCount() + CHARACTER_ITEM_GROUPS.length} 种物品 · ${getTotalAssetVariantCount() + CHARACTER_VARIANTS.length} 变体)`
                        : selectedAssetCat === 'character'
                          ? en
                            ? 'Characters · Role & Variants'
                            : '角色演员 · 选角色再切变体'
                          : en
                            ? `${PROP_CATALOG.find((c) => c.type === selectedAssetCat)?.labelEn ?? selectedAssetCat} · Items & Variants`
                            : `${
                                PROP_CATALOG.find((c) => c.type === selectedAssetCat)?.label.split(
                                  ' '
                                )[0] ?? selectedAssetCat
                              } · 物品与变体切换`}
                    </div>
                    <label
                      title={en ? 'Import local .glb / .gltf 3D mesh' : '导入本地 .glb / .gltf 3D 白模文件'}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:border-sky-400 cursor-pointer text-[10px] text-slate-700 font-medium transition"
                    >
                      <Upload className="w-3 h-3 text-sky-600" />
                      {en ? 'Import GLB' : '导入 GLB'}
                      <input
                        type="file"
                        accept=".glb,.gltf"
                        className="hidden"
                        onChange={(e) => {
                          handleImportGlbFile(e.target.files?.[0] ?? null);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {/* Area Object Eraser Bar (Always accessible in Asset Drawer) */}
                  {(() => {
                    const isEraser = pendingPlacement?.kind === 'object_eraser';
                    const curRadius =
                      isEraser && pendingPlacement?.brushRadius
                        ? pendingPlacement.brushRadius
                        : eraserRadius;
                    const curFilter =
                      isEraser && pendingPlacement?.eraseFilter
                        ? pendingPlacement.eraseFilter
                        : eraserFilter;
                    const filterOptions: { id: ObjectEraseFilter; label: string }[] = [
                      { id: 'all', label: en ? 'All' : '全部物体' },
                      { id: 'tree', label: en ? 'Trees' : '仅树木' },
                      { id: 'props', label: en ? 'Props' : '仅道具' },
                      { id: 'paths', label: en ? 'Paths' : '仅道路围栏' },
                    ];
                    return (
                      <div
                        className={`rounded-xl border p-2 transition space-y-1.5 ${
                          isEraser
                            ? 'bg-rose-50/90 border-rose-300 shadow-2xs'
                            : 'bg-slate-50/90 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Eraser
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isEraser ? 'text-rose-600' : 'text-slate-500'
                              }`}
                            />
                            <div className="min-w-0">
                              <div
                                className={`text-[10px] font-bold truncate ${
                                  isEraser ? 'text-rose-900' : 'text-slate-700'
                                }`}
                              >
                                {en ? 'Region Object Eraser' : '区域物体橡皮擦'}
                              </div>
                              <div className="text-[9px] text-slate-400 truncate">
                                {en ? 'Hold Left Mouse & drag to erase objects in radius' : '按住左键拖拽快速擦除区域内物体'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEraser) {
                                setPendingPlacement(null);
                              } else {
                                setPendingPlacement({
                                  kind: 'object_eraser',
                                  brushRadius: curRadius,
                                  eraseFilter: curFilter,
                                  label: en
                                    ? `Region Object Eraser (${curRadius}m)`
                                    : `区域物体橡皮擦 (${curRadius}m)`,
                                });
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition ${
                              isEraser
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                                : 'bg-white hover:border-rose-400 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isEraser
                              ? en
                                ? '⏹ Exit Eraser'
                                : '⏹ 退出橡皮擦'
                              : en
                                ? '🧹 Enable Eraser'
                                : '🧹 开启橡皮擦'}
                          </button>
                        </div>

                        {isEraser && (
                          <div className="space-y-1.5 pt-1 border-t border-rose-200/70">
                            <div className="grid grid-cols-4 gap-1">
                              {filterOptions.map((fo) => (
                                <button
                                  key={fo.id}
                                  type="button"
                                  onClick={() => {
                                    setEraserFilter(fo.id);
                                    setPendingPlacement({
                                      kind: 'object_eraser',
                                      brushRadius: curRadius,
                                      eraseFilter: fo.id,
                                      label: en
                                        ? `Region Object Eraser (${fo.label} · ${curRadius}m)`
                                        : `区域物体橡皮擦 (${fo.label} · ${curRadius}m)`,
                                    });
                                  }}
                                  className={`py-0.5 px-1 rounded text-[9px] font-semibold truncate transition ${
                                    curFilter === fo.id
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-white text-slate-600 border border-rose-200/70 hover:border-rose-400'
                                  }`}
                                >
                                  {fo.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[10px] text-rose-900">
                              <span>
                                {en ? 'Erase Radius ([ / ])' : '擦除半径（快捷键 [ / ]）'}
                              </span>
                              <span className="font-mono font-bold">{curRadius}m</span>
                            </div>
                            <input
                              type="range"
                              min={2}
                              max={40}
                              step={1}
                              value={curRadius}
                              onChange={(e) => {
                                const nextR = Number(e.target.value);
                                setEraserRadius(nextR);
                                setPendingPlacement({
                                  kind: 'object_eraser',
                                  brushRadius: nextR,
                                  eraseFilter: curFilter,
                                  label: en
                                    ? `Region Object Eraser (${nextR}m)`
                                    : `区域物体橡皮擦 (${nextR}m)`,
                                });
                              }}
                              className="w-full accent-rose-600 h-1.5 cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {selectedAssetCat === null ? (
                    /* Level 1: Global Search + Categorized Asset Directory */
                    <div className="space-y-2.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={assetSearch}
                          onChange={(e) => {
                            setAssetSearch(e.target.value);
                            setAssetVisibleCount(54);
                          }}
                          placeholder={
                            en
                              ? `Search ${getTotalBaseItemCount()} items / ${getTotalAssetVariantCount()} variants (e.g. chair, car, gate)`
                              : `全库搜索 ${getTotalBaseItemCount()} 种物品 / ${getTotalAssetVariantCount()} 款变体（如：太师椅、跑车、牌坊）`
                          }
                          className="w-full pl-7 pr-6 py-1.5 text-[11px] rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-sky-400 text-slate-700"
                        />
                        {assetSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setAssetSearch('');
                              setAssetVisibleCount(54);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            title={en ? 'Clear search' : '清空搜索'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                        {ASSET_ERA_CHIPS.map((chip) => {
                          const isActive = assetEraFilter === chip.id;
                          return (
                            <button
                              key={chip.id}
                              type="button"
                              onClick={() => {
                                setAssetEraFilter(chip.id);
                                setAssetVisibleCount(54);
                              }}
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
                                isActive
                                  ? 'bg-slate-900 border-slate-900 text-white'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {en ? chip.labelEn : chip.label}
                            </button>
                          );
                        })}
                      </div>

                      {assetSearch.trim() || assetEraFilter !== 'all' ? (
                        (() => {
                          const q = assetSearch.trim().toLowerCase();
                          const eraChip = ASSET_ERA_CHIPS.find((c) => c.id === assetEraFilter);
                          const eraKws = eraChip?.keywords ?? [];
                          const groupHits: {
                            propType: PropType;
                            catLabel: string;
                            group: AssetItemGroup;
                            matchedVariantId?: string;
                          }[] = [];
                          (Object.keys(ASSET_ITEM_GROUPS_BY_TYPE) as PropType[]).forEach((pt) => {
                            const rawCatLabel =
                              PROP_CATALOG.find((c) => c.type === pt)?.label.split(' ')[0] ?? pt;
                            const catLabel = translateCatalogText(language, rawCatLabel);
                            ASSET_ITEM_GROUPS_BY_TYPE[pt].forEach((grp) => {
                              const matchesEra =
                                eraKws.length === 0 ||
                                eraKws.some(
                                  (kw) =>
                                    grp.name.toLowerCase().includes(kw) ||
                                    grp.variants.some((v) => v.label.toLowerCase().includes(kw))
                                );
                              if (!matchesEra) return;
                              const matchedVar = q
                                ? grp.variants.find(
                                    (v) =>
                                      v.label.toLowerCase().includes(q) ||
                                      v.shortTag.toLowerCase().includes(q) ||
                                      v.id.toLowerCase().includes(q) ||
                                      translateCatalogText('en', v.label).toLowerCase().includes(q) ||
                                      translateCatalogText('en', v.shortTag).toLowerCase().includes(q)
                                  )
                                : undefined;
                              const matchesQuery =
                                !q ||
                                grp.name.toLowerCase().includes(q) ||
                                translateCatalogText('en', grp.name).toLowerCase().includes(q) ||
                                rawCatLabel.toLowerCase().includes(q) ||
                                catLabel.toLowerCase().includes(q) ||
                                Boolean(matchedVar);
                              if (matchesQuery) {
                                groupHits.push({
                                  propType: pt,
                                  catLabel,
                                  group: grp,
                                  matchedVariantId: matchedVar?.id,
                                });
                              }
                            });
                          });
                          const visibleHits = groupHits.slice(0, assetVisibleCount);
                          return (
                            <div className="space-y-1.5">
                              <div className="text-[10px] text-slate-500 flex justify-between px-0.5">
                                <span>
                                  {en
                                    ? 'Results (grouped by item · switchable variants)'
                                    : '搜索结果（按物品归类 · 可直接切变体）'}
                                </span>
                                <span className="font-mono">
                                  {en
                                    ? `${visibleHits.length} / ${groupHits.length} items`
                                    : `${visibleHits.length} / ${groupHits.length} 种物品`}
                                </span>
                              </div>
                              {groupHits.length === 0 ? (
                                <div className="py-6 text-center text-[11px] text-slate-400">
                                  {en
                                    ? `No matching items for "${assetSearch.trim()}"`
                                    : `未找到匹配“${assetSearch.trim()}”的物品`}
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-0.5">
                                  {visibleHits.map(({ propType, catLabel, group, matchedVariantId }) => {
                                    const activeVarId =
                                      selectedVariantByGroup[group.groupId] ??
                                      matchedVariantId ??
                                      group.defaultVariantId;
                                    const activeVar =
                                      group.variants.find((v) => v.id === activeVarId) ??
                                      group.variants[0];
                                    const varIdx = Math.max(
                                      0,
                                      group.variants.findIndex((v) => v.id === activeVar.id)
                                    );
                                    const grpLabel = translateCatalogText(language, group.name);
                                    const activeVarLabel = translateCatalogText(language, activeVar.label);
                                    const activeVarTag = translateCatalogText(language, activeVar.shortTag);
                                    const active =
                                      (pendingPlacement?.kind === 'asset' ||
                                        pendingPlacement?.kind === 'fence_brush' ||
                                        pendingPlacement?.kind === 'tree_brush' ||
                                        pendingPlacement?.kind === 'rock_brush') &&
                                      pendingPlacement.propType === propType &&
                                      group.variants.some((v) => v.id === pendingPlacement.variantId);
                                    const useFenceBrush =
                                      fenceBrushEnabled &&
                                      (propType === 'barrier' || propType === 'wall');
                                    const useTreeBrush =
                                      treeBrushEnabled && propType === 'tree';
                                    const useRockBrush =
                                      rockBrushEnabled && propType === 'rock';
                                    const targetSearchKind = useTreeBrush
                                      ? 'tree_brush'
                                      : useRockBrush
                                      ? 'rock_brush'
                                      : useFenceBrush
                                      ? 'fence_brush'
                                      : 'asset';
                                    const cycleSearchGroupVar = (
                                      e: React.MouseEvent,
                                      delta: number
                                    ) => {
                                      e.stopPropagation();
                                      const nextIdx =
                                        (varIdx + delta + group.variants.length) %
                                        group.variants.length;
                                      const nextVar = group.variants[nextIdx];
                                      const nextVarLabel = translateCatalogText(language, nextVar.label);
                                      setSelectedVariantByGroup((prev) => ({
                                        ...prev,
                                        [group.groupId]: nextVar.id,
                                      }));
                                      setPendingPlacement({
                                        kind: targetSearchKind,
                                        propType,
                                        variantId: nextVar.id,
                                        brushRadius: useTreeBrush
                                          ? treeBrushRadius
                                          : useRockBrush
                                          ? rockBrushRadius
                                          : undefined,
                                        brushDensity: useTreeBrush
                                          ? treeBrushDensity
                                          : useRockBrush
                                          ? rockBrushDensity
                                          : undefined,
                                        mixGroupVariants: useTreeBrush
                                          ? treeMixVariants
                                          : useRockBrush
                                          ? rockMixVariants
                                          : undefined,
                                        label: useTreeBrush
                                          ? `${en ? 'Tree Brush' : '范围种树'} · ${grpLabel} (${treeBrushRadius}m)`
                                          : useRockBrush
                                          ? `${en ? 'Rock Brush' : '范围铺石'} · ${grpLabel} (${rockBrushRadius}m)`
                                          : `${catLabel} · ${nextVarLabel}`,
                                        continuous: pendingPlacement?.continuous,
                                      });
                                    };
                                    return (
                                      <div
                                        key={group.groupId}
                                        onClick={() =>
                                          setPendingPlacement({
                                            kind: targetSearchKind,
                                            propType,
                                            variantId: activeVar.id,
                                            brushRadius: useTreeBrush
                                              ? treeBrushRadius
                                              : useRockBrush
                                              ? rockBrushRadius
                                              : undefined,
                                            brushDensity: useTreeBrush
                                              ? treeBrushDensity
                                              : useRockBrush
                                              ? rockBrushDensity
                                              : undefined,
                                            mixGroupVariants: useTreeBrush
                                              ? treeMixVariants
                                              : useRockBrush
                                              ? rockMixVariants
                                              : undefined,
                                            label: useTreeBrush
                                              ? `${en ? 'Tree Brush' : '范围种树'} · ${grpLabel} (${treeBrushRadius}m)`
                                              : useRockBrush
                                              ? `${en ? 'Rock Brush' : '范围铺石'} · ${grpLabel} (${rockBrushRadius}m)`
                                              : `${catLabel} · ${activeVarLabel}`,
                                            continuous: pendingPlacement?.continuous,
                                          })
                                        }
                                        className={`flex flex-col items-center p-1.5 rounded-xl border cursor-pointer transition ${
                                          active
                                            ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-400/40'
                                            : 'bg-[#f6f5f2] border-transparent hover:border-sky-300'
                                        }`}
                                      >
                                        <div className="w-full flex items-center justify-between text-[9px] text-slate-400 px-0.5">
                                          <span className="truncate">{catLabel}</span>
                                          <span className="font-mono text-sky-700 bg-sky-100/80 px-1 rounded">
                                            {varIdx + 1}/{group.variants.length}{en ? 'v' : '变体'}
                                          </span>
                                        </div>
                                        <AssetVariantThumb parts={activeVar.parts} size={38} />
                                        <span className="mt-0.5 text-[10px] font-bold leading-tight truncate w-full text-center text-slate-800">
                                          {grpLabel}
                                        </span>
                                        <div className="mt-1 w-full flex items-center justify-between gap-0.5 bg-white/90 rounded-lg border border-slate-200/80 px-1 py-0.5">
                                          <button
                                            type="button"
                                            title={en ? 'Previous variant' : '上一个变体'}
                                            onClick={(e) => cycleSearchGroupVar(e, -1)}
                                            className="px-1 text-[10px] text-slate-500 hover:text-sky-600 font-bold"
                                          >
                                            ◀
                                          </button>
                                          <span className="text-[9px] text-sky-700 font-medium truncate">
                                            {activeVarTag}
                                          </span>
                                          <button
                                            type="button"
                                            title={en ? 'Next variant' : '下一个变体'}
                                            onClick={(e) => cycleSearchGroupVar(e, 1)}
                                            className="px-1 text-[10px] text-slate-500 hover:text-sky-600 font-bold"
                                          >
                                            ▶
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <>
                          {ASSET_CATEGORY_GROUPS.map((group) => (
                            <div key={group.groupLabel} className="space-y-1">
                              <div className="text-[10px] font-semibold text-slate-400 px-0.5">
                                {en ? group.groupLabelEn : group.groupLabel}
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                {group.types.map((t) => {
                                  const item = PROP_CATALOG.find((c) => c.type === t);
                                  if (!item) return null;
                                  const inv = getInventoryForPropType(t);
                                  const itemGroups = getItemGroupsForPropType(t);
                                  const itemShortLabel = formatPresetLabel(item.label, language);
                                  const isCategoryPlacing =
                                    (pendingPlacement?.kind === 'asset' ||
                                      pendingPlacement?.kind === 'fence_brush' ||
                                      pendingPlacement?.kind === 'tree_brush' ||
                                      pendingPlacement?.kind === 'rock_brush') &&
                                    pendingPlacement.propType === t;
                                  return (
                                    <button
                                      key={t}
                                      onClick={() => {
                                        setAssetSearch('');
                                        setAssetVisibleCount(54);
                                        setSelectedAssetCat(t);
                                        setSelectedItemGroupId(itemGroups[0]?.groupId ?? null);
                                      }}
                                      title={
                                        en
                                          ? `Open "${itemShortLabel}": ${itemGroups.length} items (${inv.length} variants)`
                                          : `展开「${itemShortLabel}」：${itemGroups.length} 种独立物品（共 ${inv.length} 款可切换变体）`
                                      }
                                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-left text-[11px] transition shadow-2xs ${
                                        isCategoryPlacing
                                          ? 'border-sky-500 bg-sky-50 text-sky-900'
                                          : 'border-slate-200 bg-white hover:border-sky-400 text-slate-800'
                                      }`}
                                    >
                                      <div className="w-7 h-7 rounded-lg bg-[#f1f0ec] flex items-center justify-center shrink-0">
                                        <AssetVariantThumb parts={inv[0].parts} size={24} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-semibold truncate">
                                          {itemShortLabel}
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-mono truncate">
                                          {en
                                            ? `${itemGroups.length} items · ${inv.length} vars`
                                            : `${itemGroups.length}种物品 · ${inv.length}变体`}
                                        </div>
                                      </div>
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-slate-400 px-0.5">
                              {en ? 'Characters & Actors' : '角色演员'}
                            </div>
                            <button
                              onClick={() => {
                                setAssetSearch('');
                                setSelectedAssetCat('character');
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left text-[11px] transition shadow-2xs ${
                                pendingPlacement?.kind === 'character'
                                  ? 'border-sky-500 bg-sky-50 text-sky-900'
                                  : 'border-slate-200 bg-white hover:border-amber-400 text-slate-800'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-lg bg-[#f1f0ec] flex items-center justify-center shrink-0">
                                <AssetVariantThumb
                                  parts={CHARACTER_VARIANTS[0].parts}
                                  size={24}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold">
                                  {en ? '16-Joint Character Mannequin' : '16 关节角色木偶人'}
                                </div>
                                <div className="text-[9px] text-slate-400">
                                  {en
                                    ? `${CHARACTER_ITEM_GROUPS.length} classes · ${CHARACTER_VARIANTS.length} variants × ${Object.keys(POSE_PRESETS).length} poses`
                                    : `${CHARACTER_ITEM_GROUPS.length}大角色类 · ${CHARACTER_VARIANTS.length}款变体 × ${Object.keys(POSE_PRESETS).length}种姿态`}
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : selectedAssetCat === 'character' ? (
                    /* Level 2B: Character Role Group + Variant Switcher */
                    (() => {
                      const activeCharGroup =
                        CHARACTER_ITEM_GROUPS.find((g) => g.groupId === selectedCharGroupId) ??
                        CHARACTER_ITEM_GROUPS[0];
                      return (
                        <div className="space-y-2.5">
                          <button
                            onClick={() => setSelectedAssetCat(null)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            {en ? 'Back to All Categories' : '返回全部资产分类'}
                          </button>

                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-slate-500">
                              {en ? '1. Initial Pose Preset:' : '1. 选择初始动作姿态：'}
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {(Object.keys(POSE_PRESETS) as PosePreset[]).map((pose) => (
                                <button
                                  key={pose}
                                  onClick={() => {
                                    setCharPlacementPose(pose);
                                    if (pendingPlacement?.kind === 'character') {
                                      const charVarLabel = translateCatalogText(
                                        language,
                                        CHARACTER_VARIANTS.find(
                                          (c) => c.id === pendingPlacement.variantId
                                        )?.label ?? (en ? 'Character' : '角色')
                                      );
                                      setPendingPlacement({
                                        ...pendingPlacement,
                                        pose,
                                        label: `${charVarLabel} · ${formatPresetLabel(POSE_PRESETS[pose].label, language)}`,
                                      });
                                    }
                                  }}
                                  className={`px-1.5 py-1 rounded-lg border text-[10px] truncate font-medium transition ${
                                    charPlacementPose === pose
                                      ? 'bg-slate-900 border-slate-900 text-white'
                                      : 'bg-white border-slate-200 hover:border-amber-400 text-slate-700'
                                  }`}
                                >
                                  {formatPresetLabel(POSE_PRESETS[pose].label, language)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-slate-500">
                              {en
                                ? `2. Character Class (${CHARACTER_ITEM_GROUPS.length} classes):`
                                : `2. 选择角色类别（${CHARACTER_ITEM_GROUPS.length} 类）：`}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {CHARACTER_ITEM_GROUPS.map((cg) => {
                                const isSel = cg.groupId === activeCharGroup.groupId;
                                const activeVarId =
                                  selectedVariantByGroup[cg.groupId] ?? cg.defaultVariantId;
                                const activeVar =
                                  cg.variants.find((v) => v.id === activeVarId) ?? cg.variants[0];
                                const cgLabel = translateCatalogText(language, cg.name);
                                const activeVarLabel = translateCatalogText(language, activeVar.label);
                                return (
                                  <button
                                    key={cg.groupId}
                                    onClick={() => {
                                      setSelectedCharGroupId(cg.groupId);
                                      setPendingPlacement({
                                        kind: 'character',
                                        variantId: activeVar.id,
                                        pose: charPlacementPose,
                                        label: `${activeVarLabel} · ${formatPresetLabel(POSE_PRESETS[charPlacementPose].label, language)}`,
                                        continuous: pendingPlacement?.continuous,
                                      });
                                    }}
                                    className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-left transition ${
                                      isSel
                                        ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-400/30'
                                        : 'bg-white border-slate-200 hover:border-sky-300'
                                    }`}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-[#f6f5f2] flex items-center justify-center shrink-0">
                                      <AssetVariantThumb parts={activeVar.parts} size={28} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[10px] font-bold text-slate-800 truncate">
                                        {cgLabel}
                                      </div>
                                      <div className="text-[9px] text-sky-700 truncate">
                                        {activeVarLabel} ({cg.variants.length}{en ? 'v' : '变体'})
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-2 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-sky-900">
                                {en
                                  ? `3. "${translateCatalogText(language, activeCharGroup.name)}" Variants (${activeCharGroup.variants.length})`
                                  : `3. 「${translateCatalogText(language, activeCharGroup.name)}」的变体切换（${activeCharGroup.variants.length} 款）`}
                              </span>
                              <span className="text-[9px] text-sky-700">
                                {en ? 'Pick variant to place' : '点选切换变体并放置'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {activeCharGroup.variants.map((cv) => {
                                const active =
                                  pendingPlacement?.kind === 'character' &&
                                  pendingPlacement.variantId === cv.id;
                                const cvLabel = translateCatalogText(language, cv.label);
                                return (
                                  <button
                                    key={cv.id}
                                    onClick={() => {
                                      setSelectedVariantByGroup((prev) => ({
                                        ...prev,
                                        [activeCharGroup.groupId]: cv.id,
                                      }));
                                      setPendingPlacement({
                                        kind: 'character',
                                        variantId: cv.id,
                                        pose: charPlacementPose,
                                        label: `${cvLabel} · ${formatPresetLabel(POSE_PRESETS[charPlacementPose].label, language)}`,
                                        continuous: pendingPlacement?.continuous,
                                      });
                                    }}
                                    className={`flex flex-col items-center p-1.5 rounded-xl border transition ${
                                      active
                                        ? 'bg-white border-sky-500 ring-2 ring-sky-400/40 shadow-xs'
                                        : 'bg-white/80 border-slate-200/80 hover:border-sky-300'
                                    }`}
                                  >
                                    <AssetVariantThumb parts={cv.parts} size={36} />
                                    <span
                                      className={`mt-1 text-[10px] leading-tight truncate w-full text-center ${
                                        active ? 'font-bold text-sky-900' : 'text-slate-700'
                                      }`}
                                    >
                                      {cvLabel}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* Level 2A: Item Groups + Per-Item Variant Switcher for Chosen Category */
                    (() => {
                      const catMeta = PROP_CATALOG.find(
                        (c) => c.type === selectedAssetCat
                      );
                      const catShortLabel = catMeta
                        ? formatPresetLabel(catMeta.label, language)
                        : selectedAssetCat;
                      const itemGroups = getItemGroupsForPropType(selectedAssetCat);
                      const q = assetSearch.trim().toLowerCase();
                      const filteredGroups = q
                        ? itemGroups.filter(
                            (grp) =>
                              grp.name.toLowerCase().includes(q) ||
                              translateCatalogText('en', grp.name).toLowerCase().includes(q) ||
                              grp.variants.some(
                                (v) =>
                                  v.label.toLowerCase().includes(q) ||
                                  v.shortTag.toLowerCase().includes(q) ||
                                  v.id.toLowerCase().includes(q) ||
                                  translateCatalogText('en', v.label).toLowerCase().includes(q) ||
                                  translateCatalogText('en', v.shortTag).toLowerCase().includes(q)
                              )
                          )
                        : itemGroups;

                      const currentGroup =
                        filteredGroups.find((g) => g.groupId === selectedItemGroupId) ??
                        filteredGroups[0] ??
                        itemGroups[0];

                      const useFenceBrush =
                        fenceBrushEnabled &&
                        (selectedAssetCat === 'barrier' || selectedAssetCat === 'wall');
                      const useTreeBrush =
                        treeBrushEnabled && selectedAssetCat === 'tree';
                      const useRockBrush =
                        rockBrushEnabled && selectedAssetCat === 'rock';

                      const selectGroupAndVariant = (
                        grp: AssetItemGroup,
                        variantId?: string
                      ) => {
                        const targetVarId =
                          variantId ??
                          selectedVariantByGroup[grp.groupId] ??
                          grp.defaultVariantId;
                        const targetVar =
                          grp.variants.find((v) => v.id === targetVarId) ?? grp.variants[0];
                        const grpLabel = translateCatalogText(language, grp.name);
                        const targetVarLabel = translateCatalogText(language, targetVar.label);
                        setSelectedItemGroupId(grp.groupId);
                        setSelectedVariantByGroup((prev) => ({
                          ...prev,
                          [grp.groupId]: targetVar.id,
                        }));
                        setPendingPlacement({
                          kind: useTreeBrush
                            ? 'tree_brush'
                            : useRockBrush
                            ? 'rock_brush'
                            : useFenceBrush
                            ? 'fence_brush'
                            : 'asset',
                          propType: selectedAssetCat,
                          variantId: targetVar.id,
                          brushRadius: useTreeBrush
                            ? treeBrushRadius
                            : useRockBrush
                            ? rockBrushRadius
                            : undefined,
                          brushDensity: useTreeBrush
                            ? treeBrushDensity
                            : useRockBrush
                            ? rockBrushDensity
                            : undefined,
                          mixGroupVariants: useTreeBrush
                            ? treeMixVariants
                            : useRockBrush
                            ? rockMixVariants
                            : undefined,
                          label: useTreeBrush
                            ? `${en ? 'Tree Brush' : '范围种树'} · ${grpLabel} (${treeBrushRadius}m)`
                            : useRockBrush
                            ? `${en ? 'Rock Brush' : '范围铺石'} · ${grpLabel} (${rockBrushRadius}m)`
                            : `${catShortLabel} · ${targetVarLabel}`,
                          continuous: pendingPlacement?.continuous,
                        });
                      };

                      const cycleGroupVariant = (
                        e: React.MouseEvent,
                        grp: AssetItemGroup,
                        delta: number
                      ) => {
                        e.stopPropagation();
                        const curVarId =
                          selectedVariantByGroup[grp.groupId] ?? grp.defaultVariantId;
                        const curIdx = Math.max(
                          0,
                          grp.variants.findIndex((v) => v.id === curVarId)
                        );
                        const nextIdx =
                          (curIdx + delta + grp.variants.length) % grp.variants.length;
                        const nextVar = grp.variants[nextIdx];
                        selectGroupAndVariant(grp, nextVar.id);
                      };

                      const activeVariantIdForCurrentGroup = currentGroup
                        ? selectedVariantByGroup[currentGroup.groupId] ??
                          currentGroup.defaultVariantId
                        : '';
                      const activeVarIdxForCurrentGroup = currentGroup
                        ? Math.max(
                            0,
                            currentGroup.variants.findIndex(
                              (v) => v.id === activeVariantIdForCurrentGroup
                            )
                          )
                        : 0;

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => {
                                setAssetSearch('');
                                setAssetVisibleCount(54);
                                setSelectedAssetCat(null);
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              {en ? 'Back to Categories' : '返回大分类'}
                            </button>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {catShortLabel} · {filteredGroups.length} {en ? 'items' : '种物品'}
                            </span>
                          </div>

                          <div className="relative">
                            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={assetSearch}
                              onChange={(e) => {
                                setAssetSearch(e.target.value);
                              }}
                              placeholder={
                                en
                                  ? `Filter items or variants in "${catShortLabel}"...`
                                  : `筛选「${catShortLabel}」下的物品或变体…`
                              }
                              className="w-full pl-6 pr-6 py-1 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-sky-400 text-slate-700"
                            />
                            {assetSearch && (
                              <button
                                type="button"
                                onClick={() => setAssetSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {selectedAssetCat === 'road' && (
                            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-2 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-bold text-sky-900">
                                <span className="flex items-center gap-1">
                                  <Paintbrush className="w-3 h-3 text-sky-600" />
                                  {en
                                    ? 'Freehand Road Brush (Drag to paint, Shift for straight)'
                                    : '画笔自由绘制道路（拖拽画线，Shift拉直）'}
                                </span>
                                <span className="font-mono text-sky-700">{roadBrushWidth}m</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                {ROAD_BRUSH_PRESETS.map((rp) => {
                                  const brushActive =
                                    pendingPlacement?.kind === 'road_brush' &&
                                    pendingPlacement.roadStyle === rp.style;
                                  const rpLabel = en ? rp.labelEn : rp.label;
                                  const rpDesc = en ? rp.descEn : rp.desc;
                                  return (
                                    <button
                                      key={rp.style}
                                      onClick={() => {
                                        setRoadBrushWidth(rp.defaultWidth);
                                        setPendingPlacement({
                                          kind: 'road_brush',
                                          roadStyle: rp.style,
                                          roadWidth: rp.defaultWidth,
                                          label: rpLabel,
                                        });
                                      }}
                                      title={rpDesc}
                                      className={`px-2 py-1.5 rounded-lg border text-left transition ${
                                        brushActive
                                          ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                                          : 'bg-white text-slate-700 border-slate-200 hover:border-sky-400'
                                      }`}
                                    >
                                      <div className="text-[10px] font-semibold truncate">
                                        {rpLabel}
                                      </div>
                                      <div
                                        className={`text-[9px] truncate ${
                                          brushActive ? 'text-sky-100' : 'text-slate-400'
                                        }`}
                                      >
                                        {en ? `W ${rp.defaultWidth}m` : `宽${rp.defaultWidth}m`} · {rpDesc}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="pt-0.5">
                                <input
                                  type="range"
                                  min={3}
                                  max={20}
                                  step={0.5}
                                  value={roadBrushWidth}
                                  onChange={(e) => {
                                    const w = Number(e.target.value);
                                    setRoadBrushWidth(w);
                                    if (pendingPlacement?.kind === 'road_brush') {
                                      setPendingPlacement({
                                        ...pendingPlacement,
                                        roadWidth: w,
                                      });
                                    }
                                  }}
                                  className="w-full accent-sky-600 h-1.5 cursor-pointer"
                                />
                              </div>
                            </div>
                          )}

                          {(selectedAssetCat === 'barrier' || selectedAssetCat === 'wall') && (
                            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setFenceBrushEnabled(true);
                                  if (
                                    pendingPlacement?.kind === 'asset' &&
                                    (pendingPlacement.propType === 'barrier' ||
                                      pendingPlacement.propType === 'wall')
                                  ) {
                                    setPendingPlacement({
                                      ...pendingPlacement,
                                      kind: 'fence_brush',
                                    });
                                  }
                                }}
                                className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold transition ${
                                  fenceBrushEnabled
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {en ? '🖌️ Continuous Path Brush' : '🖌️ 画笔连续画一排'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFenceBrushEnabled(false);
                                  if (pendingPlacement?.kind === 'fence_brush') {
                                    setPendingPlacement({
                                      ...pendingPlacement,
                                      kind: 'asset',
                                    });
                                  }
                                }}
                                className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold transition ${
                                  !fenceBrushEnabled
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {en ? '📍 Single Click Place' : '📍 单个点放'}
                              </button>
                            </div>
                          )}

                          {(selectedAssetCat === 'tree' || selectedAssetCat === 'rock') && (() => {
                            const isRock = selectedAssetCat === 'rock';
                            const brushKind = isRock ? 'rock_brush' : 'tree_brush';
                            const brushEnabled = isRock ? rockBrushEnabled : treeBrushEnabled;
                            const setBrushEnabled = isRock ? setRockBrushEnabled : setTreeBrushEnabled;
                            const brushRadius = isRock ? rockBrushRadius : treeBrushRadius;
                            const setBrushRadius = isRock ? setRockBrushRadius : setTreeBrushRadius;
                            const brushDensity = isRock ? rockBrushDensity : treeBrushDensity;
                            const setBrushDensity = isRock ? setRockBrushDensity : setTreeBrushDensity;
                            const mixVars = isRock ? rockMixVariants : treeMixVariants;
                            const setMixVars = isRock ? setRockMixVariants : setTreeMixVariants;
                            const actionPrefix = isRock
                              ? en
                                ? 'Rock Brush'
                                : '范围铺石'
                              : en
                                ? 'Tree Brush'
                                : '范围种树';
                            const unitLabel = isRock
                              ? en
                                ? ' rocks/drop'
                                : '块/次'
                              : en
                                ? ' trees/drop'
                                : '棵/次';
                            return (
                              <div
                                className={`rounded-xl border p-2 space-y-1.5 ${
                                  isRock
                                    ? 'border-amber-300/80 bg-amber-50/75'
                                    : 'border-emerald-200 bg-emerald-50/70'
                                }`}
                              >
                                <div
                                  className={`grid grid-cols-2 gap-1 rounded-lg bg-white/90 p-0.5 border ${
                                    isRock ? 'border-amber-200/80' : 'border-emerald-200/80'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBrushEnabled(true);
                                      const activeVarId = currentGroup
                                        ? selectedVariantByGroup[currentGroup.groupId] ??
                                          currentGroup.defaultVariantId
                                        : undefined;
                                      const grpName = currentGroup
                                        ? translateCatalogText(language, currentGroup.name)
                                        : isRock
                                          ? en
                                            ? 'Rock'
                                            : '岩石'
                                          : en
                                            ? 'Tree'
                                            : '乔木';
                                      setPendingPlacement({
                                        kind: brushKind,
                                        propType: selectedAssetCat,
                                        variantId: activeVarId,
                                        brushRadius,
                                        brushDensity,
                                        mixGroupVariants: mixVars,
                                        label: `${actionPrefix} · ${grpName} (${brushRadius}m)`,
                                      });
                                    }}
                                    className={`py-1 px-1.5 rounded-md text-[10px] font-bold transition ${
                                      brushEnabled
                                        ? isRock
                                          ? 'bg-amber-600 text-white shadow-2xs'
                                          : 'bg-emerald-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {isRock
                                      ? en
                                        ? '🪨 Boulder Brush'
                                        : '🪨 范围石群刷（涂刷成片）'
                                      : en
                                        ? '🌲 Forest Brush'
                                        : '🌲 范围丛林刷（涂刷成片）'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBrushEnabled(false);
                                      if (pendingPlacement?.kind === brushKind) {
                                        setPendingPlacement({
                                          ...pendingPlacement,
                                          kind: 'asset',
                                          propType: selectedAssetCat,
                                        });
                                      }
                                    }}
                                    className={`py-1 px-1.5 rounded-md text-[10px] font-bold transition ${
                                      !brushEnabled
                                        ? 'bg-slate-900 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {isRock
                                      ? en
                                        ? '📍 Single Rock'
                                        : '📍 单块点放'
                                      : en
                                        ? '📍 Single Tree'
                                        : '📍 单棵点放'}
                                  </button>
                                </div>

                                {brushEnabled && (
                                  <div className="space-y-1.5 pt-0.5">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <div
                                          className={`flex justify-between text-[9px] font-semibold ${
                                            isRock ? 'text-amber-950' : 'text-emerald-900'
                                          }`}
                                        >
                                          <span>{en ? 'Brush Radius' : '范围半径'}</span>
                                          <span className="font-mono">{brushRadius}m</span>
                                        </div>
                                        <input
                                          type="range"
                                          min={4}
                                          max={36}
                                          step={1}
                                          value={brushRadius}
                                          onChange={(e) => {
                                            const nextR = Number(e.target.value);
                                            setBrushRadius(nextR);
                                            if (pendingPlacement?.kind === brushKind) {
                                              const grpName = currentGroup
                                                ? translateCatalogText(language, currentGroup.name)
                                                : isRock
                                                  ? en
                                                    ? 'Rock'
                                                    : '岩石'
                                                  : en
                                                    ? 'Tree'
                                                    : '乔木';
                                              setPendingPlacement({
                                                ...pendingPlacement,
                                                brushRadius: nextR,
                                                label: `${actionPrefix} · ${grpName} (${nextR}m)`,
                                              });
                                            }
                                          }}
                                          className={`w-full h-1.5 cursor-pointer ${
                                            isRock ? 'accent-amber-600' : 'accent-emerald-600'
                                          }`}
                                        />
                                      </div>
                                      <div>
                                        <div
                                          className={`flex justify-between text-[9px] font-semibold ${
                                            isRock ? 'text-amber-950' : 'text-emerald-900'
                                          }`}
                                        >
                                          <span>{en ? 'Density' : '单次密度'}</span>
                                          <span className="font-mono">
                                            {brushDensity}
                                            {unitLabel}
                                          </span>
                                        </div>
                                        <input
                                          type="range"
                                          min={2}
                                          max={isRock ? 20 : 16}
                                          step={1}
                                          value={brushDensity}
                                          onChange={(e) => {
                                            const nextD = Number(e.target.value);
                                            setBrushDensity(nextD);
                                            if (pendingPlacement?.kind === brushKind) {
                                              setPendingPlacement({
                                                ...pendingPlacement,
                                                brushDensity: nextD,
                                              });
                                            }
                                          }}
                                          className={`w-full h-1.5 cursor-pointer ${
                                            isRock ? 'accent-amber-600' : 'accent-emerald-600'
                                          }`}
                                        />
                                      </div>
                                    </div>
                                    <div
                                      className={`flex items-center justify-between gap-2 text-[9px] ${
                                        isRock ? 'text-amber-900' : 'text-emerald-800'
                                      }`}
                                    >
                                      <span>
                                        {isRock
                                          ? en
                                            ? 'Pick a rock below, click or drag on ground to scatter clusters'
                                            : '选下方石材后，在 3D 地面点击或按住拖拽即可成片铺石'
                                          : en
                                            ? 'Pick a tree below, click or drag on ground to plant groves'
                                            : '选下方树种后，在 3D 地面点击或按住拖拽即可成片种树'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextMix = !mixVars;
                                          setMixVars(nextMix);
                                          if (pendingPlacement?.kind === brushKind) {
                                            setPendingPlacement({
                                              ...pendingPlacement,
                                              mixGroupVariants: nextMix,
                                            });
                                          }
                                        }}
                                        className={`px-1.5 py-0.5 rounded border font-semibold shrink-0 transition ${
                                          mixVars
                                            ? isRock
                                              ? 'bg-amber-600 text-white border-amber-700'
                                              : 'bg-emerald-600 text-white border-emerald-700'
                                            : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                      >
                                        {mixVars
                                          ? en
                                            ? '✓ Mix Variants'
                                            : isRock
                                              ? '✓ 混搭同石变体'
                                              : '✓ 混种同树变体'
                                          : en
                                            ? 'Single Variant'
                                            : '仅单一变体'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Step 1: Distinct Base Items in this Category (Never mixed flatly with variants!) */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] px-0.5">
                              <span className="font-bold text-slate-700">
                                {en
                                  ? `1. Pick Item (${filteredGroups.length} items)`
                                  : `1. 选择物品（共 ${filteredGroups.length} 种物品）`}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {en ? '◀ ▶ Cycle Variant' : '◀ ▶ 快速切换该物品变体'}
                              </span>
                            </div>

                            {filteredGroups.length === 0 ? (
                              <div className="py-5 text-center text-[11px] text-slate-400">
                                {en ? 'No matching items found' : '未找到匹配的物品'}
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                                {filteredGroups.map((grp) => {
                                  const activeVarId =
                                    selectedVariantByGroup[grp.groupId] ??
                                    grp.defaultVariantId;
                                  const activeVar =
                                    grp.variants.find((v) => v.id === activeVarId) ??
                                    grp.variants[0];
                                  const varIdx = Math.max(
                                    0,
                                    grp.variants.findIndex((v) => v.id === activeVar.id)
                                  );
                                  const grpLabel = translateCatalogText(language, grp.name);
                                  const activeVarTag = translateCatalogText(language, activeVar.shortTag);
                                  const isGroupSelected =
                                    currentGroup?.groupId === grp.groupId;
                                  const isPlacingThisGroup =
                                    (pendingPlacement?.kind === 'asset' ||
                                      pendingPlacement?.kind === 'fence_brush' ||
                                      pendingPlacement?.kind === 'tree_brush' ||
                                      pendingPlacement?.kind === 'rock_brush') &&
                                    pendingPlacement.propType === selectedAssetCat &&
                                    grp.variants.some(
                                      (v) => v.id === pendingPlacement.variantId
                                    );

                                  return (
                                    <div
                                      key={grp.groupId}
                                      onClick={() => selectGroupAndVariant(grp, activeVar.id)}
                                      title={
                                        en
                                          ? `${grpLabel} · Variant: ${activeVarTag} (${grp.variants.length} total)`
                                          : `${grpLabel} · 当前变体：${activeVarTag}（共 ${grp.variants.length} 款变体可切换）`
                                      }
                                      className={`flex flex-col p-1.5 rounded-xl border cursor-pointer transition ${
                                        isGroupSelected || isPlacingThisGroup
                                          ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-400/35 shadow-2xs'
                                          : 'bg-[#f6f5f2] border-slate-200/80 hover:border-sky-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-10 h-10 rounded-lg bg-white/90 border border-slate-200/60 flex items-center justify-center shrink-0">
                                          <AssetVariantThumb parts={activeVar.parts} size={34} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div
                                            className={`text-[10px] leading-tight truncate ${
                                              isGroupSelected
                                                ? 'font-bold text-sky-950'
                                                : 'font-semibold text-slate-800'
                                            }`}
                                          >
                                            {grpLabel}
                                          </div>
                                          <div className="mt-0.5 text-[9px] text-slate-500 font-mono">
                                            {grp.variants.length}{en ? ' vars' : '款变体'}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Inline Variant Switcher Bar on the Item Card */}
                                      <div className="mt-1.5 flex items-center justify-between gap-0.5 rounded-lg bg-white/95 border border-slate-200/80 px-1 py-0.5">
                                        <button
                                          type="button"
                                          title={en ? 'Previous variant' : '切换上一个变体'}
                                          onClick={(e) => cycleGroupVariant(e, grp, -1)}
                                          className="px-1 text-[10px] text-slate-500 hover:text-sky-600 font-bold"
                                        >
                                          ◀
                                        </button>
                                        <span className="text-[9px] text-sky-700 font-medium truncate">
                                          {varIdx + 1}/{grp.variants.length} {activeVarTag}
                                        </span>
                                        <button
                                          type="button"
                                          title={en ? 'Next variant' : '切换下一个变体'}
                                          onClick={(e) => cycleGroupVariant(e, grp, 1)}
                                          className="px-1 text-[10px] text-slate-500 hover:text-sky-600 font-bold"
                                        >
                                          ▶
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Step 2: Dedicated Variant Switcher Panel for the Currently Selected Base Item */}
                          {currentGroup && (
                            <div className="rounded-xl border border-sky-200 bg-sky-50/55 p-2 space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold text-sky-950 truncate">
                                    {en
                                      ? `2. "${translateCatalogText(language, currentGroup.name)}" Variants`
                                      : `2. 「${translateCatalogText(language, currentGroup.name)}」的变体切换`}
                                  </div>
                                  <div className="text-[9px] text-sky-700">
                                    {en
                                      ? `${currentGroup.variants.length} variants · pick any to place`
                                      : `共 ${currentGroup.variants.length} 款变体 · 点击任意变体即可互相切换并放置`}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    title={en ? 'Previous variant' : '上一个变体'}
                                    onClick={(e) => cycleGroupVariant(e, currentGroup, -1)}
                                    className="px-1.5 py-0.5 rounded bg-white border border-sky-200 hover:border-sky-400 text-[10px] font-bold text-sky-800"
                                  >
                                    ◀
                                  </button>
                                  <span className="text-[10px] font-mono font-bold text-sky-900 px-1">
                                    {activeVarIdxForCurrentGroup + 1}/{currentGroup.variants.length}
                                  </span>
                                  <button
                                    type="button"
                                    title={en ? 'Next variant' : '下一个变体'}
                                    onClick={(e) => cycleGroupVariant(e, currentGroup, 1)}
                                    className="px-1.5 py-0.5 rounded bg-white border border-sky-200 hover:border-sky-400 text-[10px] font-bold text-sky-800"
                                  >
                                    ▶
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                                {currentGroup.variants.map((v, vIdx) => {
                                  const isVarActive =
                                    activeVariantIdForCurrentGroup === v.id ||
                                    ((pendingPlacement?.kind === 'asset' ||
                                      pendingPlacement?.kind === 'fence_brush' ||
                                      pendingPlacement?.kind === 'tree_brush' ||
                                      pendingPlacement?.kind === 'rock_brush') &&
                                      pendingPlacement.propType === selectedAssetCat &&
                                      pendingPlacement.variantId === v.id);
                                  const curGrpLabel = translateCatalogText(language, currentGroup.name);
                                  const vTag = translateCatalogText(language, v.shortTag);
                                  return (
                                    <button
                                      key={v.id}
                                      onClick={() => selectGroupAndVariant(currentGroup, v.id)}
                                      title={
                                        en
                                          ? `${curGrpLabel} · ${vTag} (H ${v.heightM}m)`
                                          : `${curGrpLabel} · ${vTag}（高 ${v.heightM}m）`
                                      }
                                      className={`flex flex-col items-center p-1.5 rounded-xl border transition ${
                                        isVarActive
                                          ? 'bg-white border-sky-500 ring-2 ring-sky-400/40 shadow-2xs'
                                          : 'bg-white/80 border-slate-200/80 hover:border-sky-300'
                                      }`}
                                    >
                                      <AssetVariantThumb parts={v.parts} size={34} />
                                      <span
                                        className={`mt-1 text-[9px] leading-tight truncate w-full text-center ${
                                          isVarActive
                                            ? 'font-bold text-sky-900'
                                            : 'text-slate-700'
                                        }`}
                                      >
                                        {vTag}
                                      </span>
                                      <span className="text-[8px] text-slate-400 font-mono">
                                        #{vIdx + 1} · {v.heightM}m
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>

                {(() => {
                  const q = outlinerSearch.trim().toLowerCase();
                  const matchesFilter = (text: string) =>
                    !q ||
                    text.toLowerCase().includes(q) ||
                    translateDefaultEntityName(language, text).toLowerCase().includes(q) ||
                    translateCatalogText('en', text).toLowerCase().includes(q);
                  const totalCount =
                    (project.world.heroCompound ? 1 : 0) +
                    project.world.buildings.length +
                    (project.world.customModels?.length ?? 0) +
                    (project.world.gltfModels?.length ?? 0) +
                    (project.world.paintedRoads?.length ?? 0) +
                    (project.world.paintedFences?.length ?? 0) +
                    project.world.assets.length +
                    project.world.characters.length +
                    1;

                  const renderRow = (item: {
                    id: string;
                    icon: string;
                    name: string;
                    subtitle?: string;
                    nameClass?: string;
                    visible?: boolean;
                    locked?: boolean;
                    canToggleVisLock?: boolean;
                    onDelete?: () => void;
                  }) => {
                    const isEditing = renamingId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (!isEditing && !item.locked) selectObject(item.id);
                        }}
                        className={`group flex items-center justify-between gap-1 px-2 py-1 rounded-lg text-xs cursor-pointer transition ${
                          selectedId === item.id
                            ? 'bg-sky-500/15 text-sky-800 border border-sky-400/50'
                            : `hover:bg-slate-900/5 ${item.nameClass ?? 'text-slate-700'}`
                        }`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={renameDraft}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => commitInlineRename(item.id)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') commitInlineRename(item.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="flex-1 min-w-0 bg-white border border-sky-400 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none"
                          />
                        ) : (
                          <span
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              beginInlineRename(item.id, item.name);
                            }}
                            title={en ? 'Double-click to rename object' : '双击可重命名此物体'}
                            className="truncate flex-1"
                          >
                            {item.icon} {translateDefaultEntityName(language, item.name)}
                            {item.subtitle && (
                              <span className="text-[10px] text-slate-400 ml-1">
                                · {translateCatalogText(language, item.subtitle)}
                              </span>
                            )}
                          </span>
                        )}

                        <div className="flex items-center gap-0.5 shrink-0">
                          {!isEditing && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectObject(item.id);
                                  focusSelected();
                                }}
                                title={en ? 'Focus object' : '聚焦定位此物体'}
                                className="p-0.5 text-slate-400 hover:text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Crosshair className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  beginInlineRename(item.id, item.name);
                                }}
                                title={en ? 'Rename' : '重命名'}
                                className="p-0.5 text-slate-400 hover:text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {item.canToggleVisLock && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleVisibility(item.id);
                                }}
                                title={item.visible ? (en ? 'Hide' : '隐藏') : en ? 'Show' : '显示'}
                                className="p-0.5 text-slate-400 hover:text-slate-800"
                              >
                                {item.visible ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <EyeOff className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLock(item.id);
                                }}
                                title={item.locked ? (en ? 'Unlock' : '解锁') : en ? 'Lock' : '锁定'}
                                className="p-0.5 text-slate-400 hover:text-slate-800"
                              >
                                {item.locked ? (
                                  <Lock className="w-3 h-3 text-amber-600" />
                                ) : (
                                  <Unlock className="w-3 h-3" />
                                )}
                              </button>
                            </>
                          )}
                          {item.onDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                item.onDelete?.();
                              }}
                              title={en ? 'Delete' : '删除'}
                              className="p-0.5 text-slate-400 hover:text-rose-600 shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          {en ? 'Scene Outliner' : '场景大纲'}
                        </span>
                        <span className="text-[10px] text-slate-400">{totalCount}</span>
                      </div>

                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={outlinerSearch}
                          onChange={(e) => setOutlinerSearch(e.target.value)}
                          placeholder={en ? 'Search objects to focus...' : '搜索物体名称快速定位...'}
                          className="w-full pl-6 pr-6 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 focus:bg-white"
                        />
                        {outlinerSearch && (
                          <button
                            onClick={() => setOutlinerSearch('')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
                        {matchesFilter(`${shot.name} 摄影机 Camera`) && (
                          <div
                            onClick={() => selectObject(SHOT_CAMERA_ID)}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                              selectedId === SHOT_CAMERA_ID
                                ? 'bg-sky-500/15 text-sky-800 border border-sky-400/50 font-semibold'
                                : 'hover:bg-slate-900/5 text-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <Camera className="w-3.5 h-3.5 text-sky-600" />
                              {translateDefaultEntityName(language, shot.name)} {en ? 'Camera' : '摄影机'} ({shot.focalLength}mm)
                            </span>
                          </div>
                        )}

                        {(project.world.paintedRoads ?? [])
                          .filter((pr) => matchesFilter(`${pr.name} 宽${pr.width}m W${pr.width}m`))
                          .map((pr) =>
                            renderRow({
                              id: pr.id,
                              icon: '🛣️',
                              name: pr.name,
                              subtitle: en ? `W ${pr.width}m` : `宽${pr.width}m`,
                              nameClass: 'text-slate-600',
                              onDelete: () => deletePaintedStroke(pr.id),
                            })
                          )}

                        {(project.world.paintedFences ?? [])
                          .filter((pf) => matchesFilter(`${pf.name} 连续路径 Continuous Path`))
                          .map((pf) =>
                            renderRow({
                              id: pf.id,
                              icon: '🚧',
                              name: pf.name,
                              subtitle: en ? 'Continuous Path' : '连续路径',
                              nameClass: 'text-slate-600',
                              onDelete: () => deletePaintedStroke(pf.id),
                            })
                          )}

                        {project.world.heroCompound &&
                          matchesFilter(project.world.heroCompound.name) &&
                          renderRow({
                            id: project.world.heroCompound.id,
                            icon: '🏢',
                            name: project.world.heroCompound.name,
                            nameClass: 'text-amber-700',
                            visible: project.world.heroCompound.visible,
                            locked: project.world.heroCompound.locked,
                            canToggleVisLock: true,
                          })}

                        {project.world.characters
                          .filter((c) => matchesFilter(c.name))
                          .map((c) =>
                            renderRow({
                              id: c.id,
                              icon: '🧍',
                              name: c.name,
                              nameClass: 'text-slate-700',
                              visible: c.visible,
                              locked: c.locked,
                              canToggleVisLock: true,
                            })
                          )}

                        {(project.world.customModels ?? [])
                          .filter((cm) => matchesFilter(cm.name))
                          .map((cm) =>
                            renderRow({
                              id: cm.id,
                              icon: '🛠️',
                              name: cm.name,
                              subtitle: en ? `${cm.parts.length} parts` : `${cm.parts.length}件`,
                              nameClass: 'text-indigo-700',
                              visible: cm.visible,
                              locked: cm.locked,
                              canToggleVisLock: true,
                            })
                          )}

                        {(project.world.gltfModels ?? [])
                          .filter((gm) => matchesFilter(gm.name))
                          .map((gm) =>
                            renderRow({
                              id: gm.id,
                              icon: '🗿',
                              name: gm.name,
                              nameClass: 'text-teal-700',
                              visible: gm.visible,
                              locked: gm.locked,
                              canToggleVisLock: true,
                            })
                          )}

                        {project.world.assets
                          .filter((a) =>
                            matchesFilter(
                              `${a.name} ${getVariantSpec(a.type, a.variantId).label}`
                            )
                          )
                          .map((a) =>
                            renderRow({
                              id: a.id,
                              icon: '🧱',
                              name: a.name,
                              subtitle: getVariantSpec(a.type, a.variantId).label,
                              nameClass: 'text-slate-600',
                              visible: a.visible,
                              locked: a.locked,
                              canToggleVisLock: true,
                            })
                          )}

                        {project.world.buildings
                          .filter((b) => matchesFilter(`${b.name} ${b.floors}F`))
                          .map((b) =>
                            renderRow({
                              id: b.id,
                              icon: '🏙️',
                              name: b.name,
                              subtitle: `${b.floors}F`,
                              nameClass: 'text-slate-600',
                              visible: b.visible,
                              locked: b.locked,
                              canToggleVisLock: true,
                            })
                          )}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Drawer Tab T: ZBrush Terrain Sculpting Brush */}
            {activeDrawer === 'terrain' && (
              <div className="space-y-3">
                {/* Brush Active Master Switch */}
                <div
                  className={`p-2.5 rounded-xl border transition ${
                    terrainBrush.active
                      ? 'bg-rose-50/90 border-rose-300 shadow-sm'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Paintbrush className="w-3.5 h-3.5 text-rose-500" />
                        <span>
                          {terrainBrush.active
                            ? en
                              ? 'Sculpt Brush Active'
                              : '雕刻笔刷已开启'
                            : en
                              ? 'Enable ZBrush Terrain Sculpt'
                              : '开启 ZBrush 地形雕刻'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {en
                          ? 'Left-drag Sculpt · Alt Invert · Shift Smooth · Right Orbit'
                          : '左键拖动雕刻 · Alt 反转 · Shift 平滑 · 右键旋转'}
                      </div>
                    </div>
                    <button
                      onClick={() => setTerrainBrush({ active: !terrainBrush.active })}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                        terrainBrush.active
                          ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {terrainBrush.active
                        ? en
                          ? 'Disable Brush'
                          : '关闭笔刷'
                        : en
                          ? 'Start Sculpting'
                          : '开始雕刻'}
                    </button>
                  </div>
                </div>

                {/* What to Brush (Surface Substance) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {en ? 'Surface Material' : '刷什么 · 地表材质'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(() => {
                        const mat = BRUSH_MATERIALS.find(
                          (m) => m.id === (terrainBrush.material ?? 'auto')
                        );
                        return mat ? (en ? mat.labelEn : mat.label) : '';
                      })()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BRUSH_MATERIALS.map((m) => {
                      const activeMat = (terrainBrush.material ?? 'auto') === m.id;
                      const selectMaterial = () => {
                        if (m.id === 'water') {
                          setTerrainBrush({
                            active: true,
                            material: 'water',
                            tool:
                              terrainBrush.tool === 'erase'
                                ? 'carve'
                                : terrainBrush.tool,
                          });
                        } else if (m.id === 'auto') {
                          setTerrainBrush({
                            active: true,
                            material: 'auto',
                            tool:
                              terrainBrush.tool === 'carve' && terrainBrush.material === 'water'
                                ? 'clay'
                                : terrainBrush.tool,
                          });
                        } else {
                          setTerrainBrush({
                            active: true,
                            material: m.id,
                            tool:
                              terrainBrush.tool === 'erase'
                                ? 'paint'
                                : terrainBrush.tool,
                          });
                        }
                      };
                      return (
                        <button
                          key={m.id}
                          title={en ? m.hintEn : m.hint}
                          onClick={selectMaterial}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                            activeMat
                              ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                            style={{ backgroundColor: m.color }}
                          />
                          <span>{en ? m.labelEn : m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 9 ZBrush Brush Presets (Icon + Concise Name Grid) */}
                <div className="space-y-1.5 border-t border-slate-200 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {en ? 'Brush Shape' : '笔刷形状'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {en ? 'B Toggle · [ ] Size' : 'B 开关 · [ ] 大小'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {BRUSH_TOOLS.map((b) => {
                      const isSelected = terrainBrush.tool === b.id;
                      return (
                        <button
                          key={b.id}
                          title={en ? b.subEn : b.sub}
                          onClick={() => setTerrainBrush({ tool: b.id, active: true })}
                          className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition ${
                            isSelected
                              ? 'bg-rose-50 border-rose-400 text-rose-600 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                          }`}
                        >
                          <BrushGlyph tool={b.id} className="w-4 h-4" />
                          <span className="text-[11px] font-semibold leading-none">
                            {en ? b.nameEn : b.name}
                          </span>
                          {isSelected && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-slate-500 px-0.5 truncate">
                    {en ? 'Active: ' : '当前：'}
                    {(() => {
                      const mat = BRUSH_MATERIALS.find(
                        (m) => m.id === (terrainBrush.material ?? 'auto')
                      );
                      const tool = BRUSH_TOOLS.find((b) => b.id === terrainBrush.tool);
                      return `${mat ? (en ? mat.labelEn : mat.label) : ''} · ${tool ? (en ? tool.subEn : tool.sub) : ''}`;
                    })()}
                  </div>
                </div>

                {/* Radius / Strength / Falloff Sliders */}
                <div className="border-t border-slate-200 pt-2.5 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-600">
                        {en ? 'Brush Radius (Draw Size)' : '笔刷半径 (Draw Size)'}
                      </span>
                      <span className="font-mono text-slate-800">{terrainBrush.radius.toFixed(0)} m</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={40}
                      step={1}
                      value={terrainBrush.radius}
                      onChange={(e) => setTerrainBrush({ radius: Number(e.target.value) })}
                      className="w-full accent-rose-500 h-1.5 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-600">
                        {en ? 'Sculpt Strength (Z Intensity)' : '雕刻强度 (Z Intensity)'}
                      </span>
                      <span className="font-mono text-slate-800">
                        {Math.round(terrainBrush.strength * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1.0}
                      step={0.05}
                      value={terrainBrush.strength}
                      onChange={(e) => setTerrainBrush({ strength: Number(e.target.value) })}
                      className="w-full accent-rose-500 h-1.5 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-600">
                        {en ? 'Edge Falloff (Focal Shift)' : '边缘衰减 (Focal Shift)'}
                      </span>
                      <span className="font-mono text-slate-800">
                        {Math.round(terrainBrush.falloff * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={0.95}
                      step={0.05}
                      value={terrainBrush.falloff}
                      onChange={(e) => setTerrainBrush({ falloff: Number(e.target.value) })}
                      className="w-full accent-rose-500 h-1.5 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Custom Map Side Length */}
                <div className="border-t border-slate-200 pt-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {en ? 'Map Size (Side Length)' : '地图大小 · 自定义边长'}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-sky-700">
                      {currentMapSize} × {currentMapSize} m
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      data-testid="custom-map-size-input"
                      min={MIN_MAP_SIZE}
                      max={MAX_MAP_SIZE}
                      step={10}
                      value={mapSizeDraft}
                      onChange={(e) => setMapSizeDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const parsed = Number(mapSizeDraft);
                          if (Number.isFinite(parsed) && parsed > 0) {
                            const applied = setTerrainMapSize(parsed);
                            setMapSizeDraft(String(applied));
                            setSculptFeedback(
                              en
                                ? `✓ Map size set to ${applied}m × ${applied}m`
                                : `✓ 已将地图边长设为 ${applied}m × ${applied}m`
                            );
                          }
                        }
                      }}
                      placeholder={en ? 'Side (m)' : '输入边长(米)'}
                      className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-[11px] font-mono text-slate-400">m</span>
                    <button
                      type="button"
                      data-testid="apply-map-size-btn"
                      onClick={() => {
                        const parsed = Number(mapSizeDraft);
                        if (!Number.isFinite(parsed) || parsed <= 0) return;
                        const applied = setTerrainMapSize(parsed);
                        setMapSizeDraft(String(applied));
                        setSculptFeedback(
                          en
                            ? `✓ Map size set to ${applied}m × ${applied}m`
                            : `✓ 已将地图边长设为 ${applied}m × ${applied}m`
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-sky-600 text-white text-[11px] font-semibold transition shrink-0"
                    >
                      {en ? 'Apply' : '应用'}
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[120, 240, 480, 960, 1600].map((presetSize) => {
                      const active = currentMapSize === presetSize;
                      return (
                        <button
                          key={presetSize}
                          type="button"
                          onClick={() => {
                            const applied = setTerrainMapSize(presetSize);
                            setMapSizeDraft(String(applied));
                            setSculptFeedback(
                              en
                                ? `✓ Map size set to ${applied}m × ${applied}m`
                                : `✓ 已将地图边长设为 ${applied}m × ${applied}m`
                            );
                          }}
                          className={`py-1 rounded-md text-[10px] font-mono font-semibold border transition ${
                            active
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-sky-400 hover:text-sky-700'
                          }`}
                        >
                          {presetSize}m
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Terrain Templates */}
                <div className="border-t border-slate-200 pt-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                      {tr(language, 'terrainTemplatesTitle')}
                    </span>
                    <button
                      type="button"
                      onClick={toggleTerrainTemplateGenerateProps}
                      title={
                        en
                          ? 'When ON, switching terrain templates also generates natural trees, rocks, etc.'
                          : '开启后，切换地形模板时将自动在地表搭配生成对应的树木、岩石等自然物品'
                      }
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition ${
                        terrainTemplateGenerateProps
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-700'
                      }`}
                    >
                      <span>{terrainTemplateGenerateProps ? '🌿' : '🏔️'}</span>
                      <span>
                        {terrainTemplateGenerateProps
                          ? tr(language, 'terrainTplPropsOn')
                          : tr(language, 'terrainTplPropsOff')}
                      </span>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TERRAIN_TEMPLATES.map((tpl) => {
                      const activeTheme =
                        project.world.terrain.theme === 'urban_flat'
                          ? 'flat_plain'
                          : project.world.terrain.theme === 'coastal_canal'
                          ? 'coastal_bay'
                          : project.world.terrain.theme;
                      const isActive = activeTheme === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          title={en ? tpl.enLabel : tpl.desc}
                          onClick={() => {
                            const spawned = applyTerrainTemplate(tpl.id);
                            const name = en ? tpl.enLabel : tpl.label;
                            setSculptFeedback(
                              spawned > 0
                                ? en
                                  ? `✓ Applied terrain template: ${name} (${spawned} props generated)`
                                  : `✓ 已应用地形模板：${name}（自动生成 ${spawned} 个地貌物品）`
                                : en
                                  ? `✓ Applied terrain template: ${name}`
                                  : `✓ 已应用地形模板：${name}`
                            );
                          }}
                          className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[10px] font-semibold border transition ${
                            isActive
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-sky-400 hover:bg-sky-50/40'
                          }`}
                        >
                          <span className="text-[11px] leading-none">{tpl.badge}</span>
                          <span className="truncate">
                            {en ? tpl.enLabel : tpl.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const { seed, spawnedCount } = randomizeCurrentTerrain();
                      const activeTpl = TERRAIN_TEMPLATES.find(
                        (t) =>
                          t.id ===
                          (project.world.terrain.theme === 'urban_flat'
                            ? 'flat_plain'
                            : project.world.terrain.theme === 'coastal_canal'
                            ? 'coastal_bay'
                            : project.world.terrain.theme)
                      );
                      const tplName = activeTpl
                        ? en
                          ? activeTpl.enLabel
                          : activeTpl.label
                        : project.world.terrain.theme;
                      setSculptFeedback(
                        spawnedCount > 0
                          ? en
                            ? `🎲 Generated new "${tplName}" batch (#${seed} · ${spawnedCount} biome props)`
                            : `🎲 已随机生成新一批「${tplName}」(#${seed} · ${spawnedCount} 个地貌物品)`
                          : en
                            ? `🎲 Generated new "${tplName}" batch (#${seed})`
                            : `🎲 已随机生成新一批「${tplName}」(#${seed})`
                      );
                    }}
                    title={
                      en
                        ? 'Keep current terrain type and generate a new random contour & prop distribution'
                        : '保持当前选中的地形类型，每次点击都重新随机地貌轮廓与位置分布'
                    }
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 text-[11px] font-semibold transition shadow-2xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🎲</span>
                      <span>{tr(language, 'randomizeTerrainBtn')}</span>
                    </span>
                    <span className="text-[10px] font-mono opacity-80">
                      {project.world.terrain.seed
                        ? `#${project.world.terrain.seed}`
                        : en
                          ? 'Reseed'
                          : '换一批'}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-testid="wildcard-random-terrain-btn"
                    onClick={() => {
                      const { seed, spawnedCount, summaryZh, summaryEn } =
                        generateWildcardTerrain();
                      const summary = en ? summaryEn : summaryZh;
                      setSculptFeedback(
                        spawnedCount > 0
                          ? en
                            ? `✨ Wildcard "${summary}" (#${seed} · ${spawnedCount} props)`
                            : `✨ 已生成万象地形「${summary}」(#${seed} · ${spawnedCount} 个地貌物品)`
                          : en
                            ? `✨ Wildcard "${summary}" (#${seed})`
                            : `✨ 已生成万象地形「${summary}」(#${seed})`
                      );
                    }}
                    title={
                      en
                        ? 'True procedural random world: randomly rolls landforms, biomes, lakes/rivers/seas, cliffs, craters & spires'
                        : '真随机开放世界：每次随机组合火山天池/峡湾/环礁/丹霞峡谷/喀斯特峰林/三角洲/冰川雪峰等任意可能'
                    }
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-600 hover:from-violet-700 hover:to-sky-700 text-white text-[11px] font-semibold transition shadow-sm"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span>✨</span>
                      <span className="truncate">
                        {en
                          ? 'Wildcard Random World (Anything)'
                          : '万象真随机地形（任何可能）'}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono opacity-90 shrink-0 ml-1">
                      {project.world.terrain.theme === 'wildcard'
                        ? describeWildcardSeed(project.world.terrain.seed, language)
                        : en
                          ? 'Roll Any'
                          : '随机宇宙'}
                    </span>
                  </button>
                </div>

                {/* Reground, Reset Sculpt & Clear Scene Actions */}
                <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const count = regroundWorldToTerrain();
                        setSculptFeedback(
                          en
                            ? `✓ Regrounded ${count} buildings/characters/props to terrain`
                            : `✓ 已重算 ${count} 个建筑/角色/道具贴合地形`
                        );
                      }}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold transition shadow-sm"
                    >
                      <Anchor className="w-3.5 h-3.5" />
                      {en ? 'Reground Objects' : '全场景贴地重算'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetTerrainSculpt();
                        setSculptFeedback(
                          en ? '✓ Cleared manual sculpt heights' : '✓ 已清空手工雕刻高度偏移'
                        );
                      }}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 text-[11px] font-semibold transition"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      {en ? 'Clear Sculpt' : '清空雕刻高度'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 text-[11px] font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{tr(language, 'clearSceneBtn')}</span>
                  </button>
                  {sculptFeedback && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                      {sculptFeedback}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Drawer Tab C: Multi-Shot & Aspect Ratio Manager */}
            {activeDrawer === 'shots' && <ShotListPanel />}
          </div>
        </aside>
      )}

      {/* 2B. Top-Center Floating Sculpt HUD Pill when ZBrush Brush is Active */}
      {terrainBrush.active && (
        <div
          className={`pointer-events-auto fixed top-16 ${
            activeDrawer !== null ? 'left-[calc(50%+6rem)]' : 'left-1/2'
          } -translate-x-1/2 z-30 flex items-center gap-2 whitespace-nowrap rounded-full bg-slate-900/92 text-white backdrop-blur-xl border border-rose-400/50 shadow-xl px-3.5 py-1.5 text-[11px] transition-all`}
        >
          <BrushGlyph tool={terrainBrush.tool} className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="font-semibold">
            {(() => {
              const t = BRUSH_TOOLS.find((b) => b.id === terrainBrush.tool);
              return t ? (en ? t.nameEn : t.name) : terrainBrush.tool;
            })()}
          </span>
          <span className="text-slate-300 font-mono">R={terrainBrush.radius}m</span>
          <button
            onClick={() => setTerrainBrushOrbitHold(!terrainBrushOrbitHold)}
            title={
              en
                ? 'Hold Space or click here to toggle left-drag viewport orbit'
                : '按住空格键或点击此处可切换左键旋转视角'
            }
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition border ${
              terrainBrushOrbitHold
                ? 'bg-sky-500 text-white border-sky-300'
                : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
            }`}
          >
            {terrainBrushOrbitHold
              ? en
                ? 'Orbiting (Click to Sculpt)'
                : '正在转视角 (点击恢复雕刻)'
              : en
                ? 'Orbit View (Hold Space)'
                : '旋转视角 (按住空格)'}
          </button>
          <span className="hidden lg:inline text-slate-400 text-[10px]">
            {en
              ? '· RMB / Space+LMB Orbit · MMB Pan · Alt Invert · Shift Smooth'
              : '· 右键/空格+左键/空白处 转视角 · 中键平移 · Alt反转 · Shift平滑'}
          </span>
          <button
            onClick={() => setTerrainBrush({ active: false })}
            className="ml-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-semibold transition"
          >
            {en ? 'Exit (B)' : '退出 (B)'}
          </button>
        </div>
      )}

      {/* 2C. Top-Center Floating Cursor Placement HUD Pill */}
      {pendingPlacement && !terrainBrush.active && (
        <div
          className={`pointer-events-auto fixed top-16 ${
            activeDrawer !== null ? 'left-[calc(50%+6rem)]' : 'left-1/2'
          } -translate-x-1/2 z-30 flex items-center gap-2 whitespace-nowrap rounded-full ${
            pendingPlacement.kind === 'object_eraser'
              ? 'bg-rose-950/92 border-rose-400/70'
              : pendingPlacement.kind === 'tree_brush'
              ? 'bg-emerald-950/92 border-emerald-400/70'
              : pendingPlacement.kind === 'rock_brush'
              ? 'bg-amber-950/92 border-amber-400/70'
              : 'bg-slate-900/92 border-sky-400/60'
          } text-white backdrop-blur-xl border shadow-xl px-3.5 py-1.5 text-[11px] transition-all`}
        >
          {pendingPlacement.kind === 'object_eraser' ? (
            <Eraser className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <MousePointerClick
              className={`w-3.5 h-3.5 shrink-0 ${
                pendingPlacement.kind === 'tree_brush'
                  ? 'text-emerald-400'
                  : pendingPlacement.kind === 'rock_brush'
                  ? 'text-amber-400'
                  : 'text-sky-400'
              }`}
            />
          )}
          <span className="font-semibold">
            {pendingPlacement.kind === 'object_eraser'
              ? en
                ? `Object Eraser: R=${pendingPlacement.brushRadius ?? 10}m`
                : `物体橡皮擦：半径 ${pendingPlacement.brushRadius ?? 10}m`
              : pendingPlacement.kind === 'tree_brush'
              ? `${pendingPlacement.label} · ${pendingPlacement.brushDensity ?? 6}${en ? '/drop' : ' 棵'}`
              : pendingPlacement.kind === 'rock_brush'
              ? `${pendingPlacement.label} · ${pendingPlacement.brushDensity ?? 6}${en ? '/drop' : ' 块'}`
              : pendingPlacement.kind === 'road_brush'
              ? en
                ? `Road Brush: ${pendingPlacement.label} (W ${pendingPlacement.roadWidth ?? 8}m)`
                : `道路画笔：${pendingPlacement.label} (宽${pendingPlacement.roadWidth ?? 8}m)`
              : pendingPlacement.kind === 'fence_brush'
              ? en
                ? `Fence Brush: ${pendingPlacement.label}`
                : `围栏画笔：${pendingPlacement.label}`
              : en
                ? `Place: ${pendingPlacement.label}`
                : `待摆放：${pendingPlacement.label}`}
          </span>
          {pendingPlacement.kind !== 'road_brush' &&
            pendingPlacement.kind !== 'fence_brush' &&
            pendingPlacement.kind !== 'tree_brush' &&
            pendingPlacement.kind !== 'rock_brush' &&
            pendingPlacement.kind !== 'object_eraser' && (
              <button
                onClick={togglePendingPlacementContinuous}
                title={
                  en
                    ? 'Enable continuous placement for rapid multi-drops, or hold Shift while clicking'
                    : '开启连续摆放可连续点击种植多个，也可按住 Shift 点击'
                }
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition border ${
                  pendingPlacement.continuous
                    ? 'bg-sky-500 text-white border-sky-300'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                }`}
              >
                {en
                  ? `Continuous: ${pendingPlacement.continuous ? 'ON' : 'OFF'}`
                  : `连续摆放: ${pendingPlacement.continuous ? '开' : '关'}`}
              </button>
            )}
          <button
            onClick={() => setTerrainBrushOrbitHold(!terrainBrushOrbitHold)}
            title={
              en
                ? 'Hold Space / Alt+LMB / click here to switch left-drag to viewport orbit'
                : '按住空格键 / Alt+左键 / 点击此处可切换左键旋转视角（兼容 Edge 等浏览器）'
            }
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition border ${
              terrainBrushOrbitHold
                ? 'bg-sky-500 text-white border-sky-300'
                : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
            }`}
          >
            {terrainBrushOrbitHold
              ? en
                ? 'Orbiting (Click to Resume)'
                : '正在转视角 (点击恢复操作)'
              : en
                ? 'Orbit View (Hold Space)'
                : '旋转视角 (按住空格)'}
          </button>
          <span className="hidden lg:inline text-slate-300 text-[10px]">
            {pendingPlacement.kind === 'object_eraser'
              ? en
                ? '· LMB Drag Erase · [ / ] Resize · RMB / Space+LMB Orbit'
                : '· 左键拖拽擦除 · [ / ] 调半径 · 右键或空格/Alt+左键转视角'
              : pendingPlacement.kind === 'tree_brush'
              ? en
                ? '· LMB Drag Plant · [ / ] Resize · RMB / Space+LMB Orbit'
                : '· 左键拖拽成片种树 · [ / ] 调半径 · 右键或空格/Alt+左键转视角'
              : pendingPlacement.kind === 'rock_brush'
              ? en
                ? '· LMB Drag Scatter · [ / ] Resize · RMB / Space+LMB Orbit'
                : '· 左键拖拽成片铺石 · [ / ] 调半径 · 右键或空格/Alt+左键转视角'
              : pendingPlacement.kind === 'road_brush' ||
                pendingPlacement.kind === 'fence_brush'
              ? en
                ? '· LMB Drag Stroke · Shift Straight · RMB / Space+LMB Orbit'
                : '· 左键拖拽画线 · Shift直线 · 右键或空格/Alt+左键转视角'
              : en
                ? '· LMB Place · RMB / Space+LMB Orbit · Shift Multi-Place'
                : '· 左键点击放置 · 左键/右键/空格+左键转视角 · Shift连放'}
          </span>
          <button
            onClick={() => setPendingPlacement(null)}
            className="ml-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-semibold transition"
          >
            {pendingPlacement.kind === 'object_eraser'
              ? en
                ? 'Exit Eraser (Esc)'
                : '退出橡皮擦 (Esc)'
              : pendingPlacement.kind === 'tree_brush' ||
                pendingPlacement.kind === 'rock_brush' ||
                pendingPlacement.kind === 'road_brush' ||
                pendingPlacement.kind === 'fence_brush'
              ? en
                ? 'Exit Brush (Esc)'
                : '退出画笔 (Esc)'
              : en
                ? 'Cancel (Esc)'
                : '取消 (Esc)'}
          </button>
        </div>
      )}

      {/* 3. Bottom-Center Floating AI Director Prompt Capsule */}
      <div className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(600px,calc(100vw-24rem))] flex flex-col items-center gap-2">
        {showPresets && (
          <div className="w-full rounded-2xl glass-drawer p-2 flex flex-col gap-1">
            <div className="text-[10px] font-semibold text-slate-500 px-1.5">
              {en ? 'Quick prompt examples (click to fill):' : '快速分镜提示词示例（点击填入）：'}
            </div>
            {presetChips.map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  setPrompt(chip);
                  setShowPresets(false);
                }}
                className="glass-btn text-left text-[11px] px-2.5 py-1.5 rounded-xl text-slate-700"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="w-full rounded-full glass-panel px-2 py-1.5 flex items-center gap-2">
          <button
            onClick={() =>
              switchAiMode(
                aiMode === 'replace' ? 'append' : aiMode === 'append' ? 'camera' : 'replace'
              )
            }
            title={
              en
                ? 'Cycle AI Director mode: Scene / Semantic Patch / Camera'
                : '点击切换导演模式：场景 / 语义Patch / 运镜'
            }
            className="glass-btn shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-700"
          >
            {aiMode === 'replace'
              ? en
                ? 'Scene'
                : '场景'
              : aiMode === 'append'
                ? 'Patch'
                : en
                  ? 'Camera'
                  : '运镜'}
          </button>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRunStep1();
              }
            }}
            placeholder={
              aiMode === 'append'
                ? en
                  ? 'Enter semantic patch: e.g. Move lead 2m behind car / Delete lamps / Clear fog...'
                  : '输入语义 Patch：如把主角移到汽车后面2米 / 删掉路灯 / 去掉雾...'
                : en
                  ? 'Describe blockout scene, layout & camera intent...'
                  : '描述白模场景、建筑布局与机位意图，如：四立柱高台黄昏大雾...'
            }
            className="flex-1 min-w-0 bg-transparent text-xs text-slate-800 placeholder:text-slate-500/80 focus:outline-none"
          />

          <button
            onClick={() => setShowPresets((v) => !v)}
            className="glass-btn shrink-0 px-2.5 py-1 rounded-full text-[11px] text-slate-600 font-medium"
          >
            {en ? 'Presets' : '示例'}
          </button>

          <button
            onClick={handleRunStep1}
            disabled={loading}
            className="glass-btn-active shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50 transition"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>
              {aiMode === 'camera'
                ? en
                  ? 'Camera Move'
                  : '生成运镜'
                : aiMode === 'append'
                  ? en
                    ? 'Apply Patch'
                    : '语义 Patch'
                  : scenePipeline === 'open_world'
                    ? en
                      ? 'AI Open World'
                      : 'AI 生成大世界'
                    : en
                      ? 'Step 1 Parse'
                      : 'Step 1 解析'}
            </span>
          </button>
        </div>
      </div>

      {/* Clear Scene Two-Step Confirmation Modal */}
      {confirmClearOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmClearOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-xl border border-white shadow-2xl overflow-hidden text-slate-800">
            <div className="flex items-start gap-3 p-5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">
                  {tr(language, 'clearSceneConfirmTitle')}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {tr(language, 'clearSceneConfirmDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50/90 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition"
              >
                {tr(language, 'clearSceneCancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearScene();
                  setConfirmClearOpen(false);
                  setSculptFeedback(tr(language, 'clearSceneDoneFeedback'));
                }}
                className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition"
              >
                {tr(language, 'clearSceneConfirmAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
