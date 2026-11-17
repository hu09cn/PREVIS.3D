import type { ClayVariant } from '../engine/channelMaterials';
import type { PropType, Vec3 } from '../types/scene';
import type { AssetVariantSpec, InventoryPart } from './assetInventory';

const r2 = (n: number) => Number(n.toFixed(2));

const box = (
  pos: Vec3,
  size: Vec3,
  variant: ClayVariant = 'default',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'box', pos, size, variant, rot }
    : { shape: 'box', pos, size, variant };

const cyl = (
  pos: Vec3,
  rTop: number,
  rBot: number,
  h: number,
  variant: ClayVariant = 'default',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'cylinder', pos, size: [r2(rTop), r2(rBot), r2(h)], variant, rot }
    : { shape: 'cylinder', pos, size: [r2(rTop), r2(rBot), r2(h)], variant };

const cone = (
  pos: Vec3,
  r: number,
  h: number,
  seg = 10,
  variant: ClayVariant = 'accent',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'cone', pos, size: [r2(r), r2(h), seg], variant, rot }
    : { shape: 'cone', pos, size: [r2(r), r2(h), seg], variant };

const sph = (
  pos: Vec3,
  sx: number,
  sy: number,
  sz: number,
  variant: ClayVariant = 'foliage',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'sphere', pos, size: [r2(sx), r2(sy), r2(sz)], variant, rot }
    : { shape: 'sphere', pos, size: [r2(sx), r2(sy), r2(sz)], variant };

const dodec = (
  pos: Vec3,
  sx: number,
  sy: number,
  sz: number,
  variant: ClayVariant = 'rock',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'dodecahedron', pos, size: [r2(sx), r2(sy), r2(sz)], variant, rot }
    : { shape: 'dodecahedron', pos, size: [r2(sx), r2(sy), r2(sz)], variant };

const torus = (
  pos: Vec3,
  radius: number,
  tube: number,
  seg = 16,
  variant: ClayVariant = 'dark',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'torus', pos, size: [r2(radius), r2(tube), seg], variant, rot }
    : { shape: 'torus', pos, size: [r2(radius), r2(tube), seg], variant };

const ramp = (
  pos: Vec3,
  size: Vec3,
  variant: ClayVariant = 'concrete',
  rot?: Vec3
): InventoryPart =>
  rot
    ? { shape: 'ramp', pos, size, variant, rot }
    : { shape: 'ramp', pos, size, variant };

type EraBuilder = (alt: boolean) => {
  heightM: number;
  widthM: number;
  depthM: number;
  parts: InventoryPart[];
};

function makePair(
  id: string,
  baseName: string,
  tags: [string, string],
  builder: EraBuilder
): AssetVariantSpec[] {
  return tags.map((tag, idx) => {
    const built = builder(idx === 1);
    return {
      id: `${id}_${idx === 0 ? 'std' : 'alt'}`,
      label: `${baseName} · ${tag}`,
      heightM: r2(built.heightM),
      widthM: r2(built.widthM),
      depthM: r2(built.depthM),
      parts: built.parts,
    };
  });
}

// ============================================================================
// Rich Multi-Era & Non-Modern Asset Expansion (Ancient, Medieval, Fantasy,
// Wuxia, Steampunk, Sci-Fi, Cyberpunk, Wasteland, Nature)
// ============================================================================

const RICH_SCENE_PROPS: AssetVariantSpec[] = [
  ...makePair('era_incense_censer', '古刹青铜香炉鼎', ['双耳盖顶标准款', '三足香烟袅袅款'], (alt) => ({
    heightM: 2.2,
    widthM: 1.4,
    depthM: 1.4,
    parts: [
      box([0, 0.14, 0], [1.45, 0.28, 1.45], 'rock'),
      cyl([-0.34, 0.48, 0.25], 0.08, 0.11, 0.45, 'dark'),
      cyl([0.34, 0.48, 0.25], 0.08, 0.11, 0.45, 'dark'),
      cyl([0, 0.48, -0.36], 0.08, 0.11, 0.45, 'dark'),
      cyl([0, 0.88, 0], 0.48, 0.36, 0.56, 'accent'),
      torus([0, 1.15, 0], 0.46, 0.05, 16, 'dark', [Math.PI / 2, 0, 0]),
      box([-0.52, 0.96, 0], [0.16, 0.34, 0.12], 'accent'),
      box([0.52, 0.96, 0], [0.16, 0.34, 0.12], 'accent'),
      cone([0, 1.38, 0], 0.44, 0.42, 8, 'dark'),
      sph([0, 1.66, 0], 0.1, 0.12, 0.1, alt ? 'emissiveLamp' : 'accent'),
    ],
  })),

  ...makePair('era_inn_banner', '江湖客栈木挑酒旗', ['迎风布幌标牌', '灯笼夜挑双旗款'], (alt) => ({
    heightM: 3.4,
    widthM: 1.4,
    depthM: 0.6,
    parts: [
      cyl([0, 0.18, 0], 0.28, 0.34, 0.36, 'rock'),
      cyl([0, 1.65, 0], 0.07, 0.09, 2.9, 'trunk'),
      box([0.58, 2.88, 0], [1.22, 0.07, 0.07], 'wood', [0, 0, 0.08]),
      box([0.75, 2.08, 0], [0.56, 1.28, 0.04], 'accent'),
      box([0.75, 2.08, 0.025], [0.36, 0.88, 0.02], 'default'),
      box([0.75, 1.38, 0], [0.62, 0.06, 0.06], 'dark'),
      ...(alt
        ? [
            cyl([0.22, 2.38, 0], 0.18, 0.16, 0.38, 'emissiveLamp'),
            cyl([0.22, 2.6, 0], 0.08, 0.08, 0.12, 'dark'),
          ]
        : []),
    ],
  })),

  ...makePair('era_temple_bell', '古寺悬梁大铜钟', ['双柱斗拱钟架', '撞木仪式款'], (alt) => ({
    heightM: 3.2,
    widthM: 2.2,
    depthM: 1.5,
    parts: [
      box([0, 0.15, 0], [2.2, 0.3, 1.5], 'rock'),
      cyl([-0.82, 1.45, 0], 0.1, 0.12, 2.3, 'trunk'),
      cyl([0.82, 1.45, 0], 0.1, 0.12, 2.3, 'trunk'),
      box([0, 2.65, 0], [2.25, 0.22, 0.32], 'wood'),
      ramp([-0.55, 2.76, -0.25], [1.1, 0.42, 0.5], 'dark', [0, Math.PI, 0]),
      ramp([0.55, 2.76, -0.25], [1.1, 0.42, 0.5], 'dark'),
      cyl([0, 1.58, 0], 0.38, 0.52, 1.15, 'accent'),
      cyl([0, 2.25, 0], 0.06, 0.06, 0.55, 'dark'),
      ...(alt
        ? [cyl([0, 1.32, 0.86], 0.11, 0.11, 1.45, 'wood', [Math.PI / 2, 0, 0])]
        : []),
    ],
  })),

  ...makePair('era_sword_altar', '仙侠剑冢悬石剑碑', ['青石插剑主碑', '七星剑阵环绕款'], (alt) => ({
    heightM: 2.8,
    widthM: 2.1,
    depthM: 2.1,
    parts: [
      cyl([0, 0.2, 0], 0.92, 1.12, 0.4, 'rock'),
      dodec([0, 0.85, 0], 0.65, 0.68, 0.58, 'rock'),
      box([0, 1.85, 0], [0.12, 1.45, 0.04], 'accent', [0.06, 0, -0.05]),
      box([0, 2.22, 0], [0.46, 0.08, 0.1], 'dark', [0.06, 0, -0.05]),
      cyl([0, 2.42, 0], 0.04, 0.04, 0.32, 'wood', [0.06, 0, -0.05]),
      box([-0.52, 1.05, 0.32], [0.08, 0.95, 0.03], 'default', [0.22, 0.4, 0.18]),
      box([0.54, 1.1, -0.26], [0.08, 1.02, 0.03], 'default', [-0.18, -0.3, -0.2]),
      ...(alt
        ? [
            torus([0, 0.42, 0], 0.88, 0.04, 20, 'emissiveLamp', [Math.PI / 2, 0, 0]),
            box([0.28, 1.38, 0.48], [0.08, 0.85, 0.03], 'emissiveLamp', [-0.12, 0, 0.25]),
          ]
        : []),
    ],
  })),

  ...makePair('era_catapult', '古代木构投石攻城车', ['蓄力压臂待发款', '重石装填款'], (alt) => ({
    heightM: 2.6,
    widthM: 2.1,
    depthM: 3.4,
    parts: [
      box([0, 0.38, 0], [1.65, 0.22, 3.0], 'trunk'),
      cyl([-0.92, 0.42, 1.0], 0.42, 0.42, 0.18, 'wood', [0, 0, Math.PI / 2]),
      cyl([0.92, 0.42, 1.0], 0.42, 0.42, 0.18, 'wood', [0, 0, Math.PI / 2]),
      cyl([-0.92, 0.42, -1.0], 0.42, 0.42, 0.18, 'wood', [0, 0, Math.PI / 2]),
      cyl([0.92, 0.42, -1.0], 0.42, 0.42, 0.18, 'wood', [0, 0, Math.PI / 2]),
      box([-0.68, 1.1, 0.15], [0.16, 1.4, 0.2], 'wood', [0.25, 0, 0]),
      box([0.68, 1.1, 0.15], [0.16, 1.4, 0.2], 'wood', [0.25, 0, 0]),
      box([0, 1.68, 0.35], [1.55, 0.18, 0.18], 'dark'),
      box([0, 1.48, -0.35], [0.16, 0.16, 2.45], 'wood', [alt ? -0.75 : -0.35, 0, 0]),
      dodec([0, alt ? 2.15 : 1.12, alt ? 0.55 : -1.42], 0.34, 0.32, 0.34, 'rock'),
    ],
  })),

  ...makePair('era_armillary', '青铜浑天仪天文仪', ['环扣星盘标准款', '观星高台基座款'], (alt) => ({
    heightM: 2.35,
    widthM: 1.5,
    depthM: 1.5,
    parts: [
      cyl([0, 0.18, 0], 0.65, 0.78, 0.36, 'rock'),
      cyl([0, 0.62, 0], 0.14, 0.24, 0.55, 'accent'),
      torus([0, 1.45, 0], 0.62, 0.05, 22, 'accent'),
      torus([0, 1.45, 0], 0.56, 0.04, 22, 'dark', [0, Math.PI / 2, 0]),
      torus([0, 1.45, 0], 0.48, 0.035, 20, 'accent', [Math.PI / 3, 0.4, 0]),
      sph([0, 1.45, 0], 0.14, 0.14, 0.14, alt ? 'emissiveLamp' : 'dark'),
      cyl([0, 1.45, 0], 0.025, 0.025, 1.38, 'dark', [0.6, 0, 0.4]),
    ],
  })),

  ...makePair('era_well_windlass', '古村石栏辘轳水井', ['雕石井圈木架款', '双坡青瓦井亭款'], (alt) => ({
    heightM: 2.4,
    widthM: 1.6,
    depthM: 1.6,
    parts: [
      cyl([0, 0.42, 0], 0.72, 0.76, 0.84, 'rock'),
      cyl([0, 0.82, 0], 0.56, 0.56, 0.06, 'water'),
      box([-0.68, 1.32, 0], [0.12, 1.28, 0.12], 'trunk'),
      box([0.68, 1.32, 0], [0.12, 1.28, 0.12], 'trunk'),
      cyl([0, 1.56, 0], 0.12, 0.12, 1.2, 'wood', [0, 0, Math.PI / 2]),
      cyl([0, 1.05, 0], 0.16, 0.13, 0.28, 'wood'),
      ...(alt
        ? [cone([0, 2.22, 0], 1.05, 0.68, 4, 'dark', [0, Math.PI / 4, 0])]
        : [box([0, 1.98, 0], [1.62, 0.12, 0.16], 'wood')]),
    ],
  })),

  ...makePair('era_millstone', '乡村青石谷物石磨盘', ['木柄手推磨盘', '驴拉大磨坊底座款'], (alt) => ({
    heightM: 1.35,
    widthM: 1.5,
    depthM: 1.5,
    parts: [
      cyl([0, 0.35, 0], 0.62, 0.7, 0.7, 'rock'),
      cyl([0, 0.82, 0], 0.5, 0.52, 0.26, 'concrete'),
      cyl([0, 1.06, 0], 0.46, 0.46, 0.24, 'rock'),
      box([0.62, 1.08, 0], [0.58, 0.07, 0.07], 'wood'),
      cyl([0.85, 1.18, 0], 0.04, 0.04, 0.24, 'trunk'),
      ...(alt ? [cyl([-0.55, 0.4, 0.52], 0.22, 0.26, 0.75, 'wood')] : []),
    ],
  })),

  ...makePair('era_holo_totem', '科幻全息立体投影台', ['蓝色星图全息环', '红警战术扫描态'], (alt) => ({
    heightM: 2.5,
    widthM: 1.6,
    depthM: 1.6,
    parts: [
      cyl([0, 0.2, 0], 0.72, 0.86, 0.4, 'dark'),
      cyl([0, 0.48, 0], 0.56, 0.62, 0.16, 'accent'),
      torus([0, 0.58, 0], 0.46, 0.04, 24, 'emissiveLamp', [Math.PI / 2, 0, 0]),
      sph([0, 1.48, 0], 0.34, 0.34, 0.34, alt ? 'accent' : 'water'),
      torus([0, 1.48, 0], 0.58, 0.025, 24, 'emissiveLamp', [0.45, 0.3, 0]),
      torus([0, 1.48, 0], 0.72, 0.025, 24, 'water', [-0.5, 0.8, 0.2]),
    ],
  })),

  ...makePair('era_stone_stele', '古代龟趺石碑御碑亭', ['雕龙碑首立碑', '香案供桌仪仗款'], (alt) => ({
    heightM: 3.3,
    widthM: 1.5,
    depthM: 1.2,
    parts: [
      box([0, 0.28, 0], [1.45, 0.56, 1.15], 'rock'),
      box([0, 1.68, 0], [0.95, 2.25, 0.28], 'concrete'),
      sph([0, 2.86, 0], 0.54, 0.32, 0.22, 'accent'),
      ...(alt ? [box([0, 0.45, 0.92], [1.1, 0.7, 0.55], 'wood')] : []),
    ],
  })),
];

const RICH_VEHICLES: AssetVariantSpec[] = [
  ...makePair('era_galleon_ship', '古风木构三桅风帆船', ['扬帆起航全帆态', '锚泊收帆靠岸态'], (alt) => ({
    heightM: 5.4,
    widthM: 2.6,
    depthM: 7.4,
    parts: [
      box([0, 0.68, 0], [2.2, 1.1, 5.4], 'trunk'),
      cone([0, 0.75, 3.35], 1.12, 1.5, 6, 'wood', [Math.PI / 2, 0, 0]),
      box([0, 1.42, -1.9], [2.32, 0.85, 1.8], 'wood'),
      cyl([0, 2.85, 0.3], 0.08, 0.12, 3.8, 'trunk'),
      cyl([0, 2.45, 2.0], 0.07, 0.1, 3.0, 'trunk'),
      ...(alt
        ? [box([0, 3.2, 0.3], [2.4, 0.12, 0.12], 'dark')]
        : [
            box([0, 3.25, 0.38], [2.35, 1.95, 0.08], 'default', [-0.08, 0, 0]),
            box([0, 2.75, 2.05], [1.85, 1.45, 0.08], 'default', [-0.08, 0, 0]),
          ]),
    ],
  })),

  ...makePair('era_rickshaw', '民国街景人力黄包车', ['支蓬敞篷载客款', '拉杆放平休整款'], (alt) => ({
    heightM: 1.75,
    widthM: 1.25,
    depthM: 2.4,
    parts: [
      cyl([-0.58, 0.52, -0.15], 0.52, 0.52, 0.08, 'dark', [0, 0, Math.PI / 2]),
      cyl([0.58, 0.52, -0.15], 0.52, 0.52, 0.08, 'dark', [0, 0, Math.PI / 2]),
      box([0, 0.72, -0.2], [0.96, 0.52, 0.95], 'wood'),
      box([0, 1.32, -0.58], [0.98, 0.72, 0.32], 'dark', [0.22, 0, 0]),
      box([-0.36, 0.58, 1.05], [0.06, 0.06, 1.65], 'trunk', [alt ? 0.24 : 0.05, 0, 0]),
      box([0.36, 0.58, 1.05], [0.06, 0.06, 1.65], 'trunk', [alt ? 0.24 : 0.05, 0, 0]),
    ],
  })),

  ...makePair('era_steam_loco', '复古黑铁蒸汽机车头', ['冒烟红轮经典款', '加装除雪铲款'], (alt) => ({
    heightM: 3.85,
    widthM: 2.8,
    depthM: 7.2,
    parts: [
      box([0, 0.78, 0], [2.5, 0.45, 6.6], 'dark'),
      cyl([0, 1.72, 0.7], 0.95, 0.95, 3.9, 'dark', [Math.PI / 2, 0, 0]),
      box([0, 2.02, -2.0], [2.6, 2.15, 2.0], 'accent'),
      box([0, 3.16, -2.0], [2.8, 0.18, 2.3], 'dark'),
      cyl([0, 2.95, 2.1], 0.26, 0.18, 0.95, 'dark'),
      cyl([0, 2.48, 0.5], 0.34, 0.38, 0.52, 'accent'),
      cyl([0, 1.85, 2.7], 0.24, 0.24, 0.15, 'emissiveLamp', [Math.PI / 2, 0, 0]),
      cyl([-1.28, 0.62, -0.8], 0.58, 0.58, 0.16, 'accent', [0, 0, Math.PI / 2]),
      cyl([1.28, 0.62, -0.8], 0.58, 0.58, 0.16, 'accent', [0, 0, Math.PI / 2]),
      cyl([-1.28, 0.62, 0.6], 0.58, 0.58, 0.16, 'accent', [0, 0, Math.PI / 2]),
      cyl([1.28, 0.62, 0.6], 0.58, 0.58, 0.16, 'accent', [0, 0, Math.PI / 2]),
      ...(alt ? [ramp([0, 0.5, 3.45], [2.4, 0.7, 0.85], 'dark')] : []),
    ],
  })),

  ...makePair('era_hover_speeder', '赛博反重力悬浮摩托', ['双引擎流线蓝光款', '重装护盾战斗款'], (alt) => ({
    heightM: 1.45,
    widthM: 1.35,
    depthM: 3.4,
    parts: [
      box([0, 0.78, 0], [0.72, 0.44, 2.75], 'car'),
      cone([0, 0.82, 1.75], 0.38, 1.0, 6, 'accent', [Math.PI / 2, 0, 0]),
      cyl([-0.55, 0.72, -0.85], 0.2, 0.24, 1.05, 'dark', [Math.PI / 2, 0, 0]),
      cyl([0.55, 0.72, -0.85], 0.2, 0.24, 1.05, 'dark', [Math.PI / 2, 0, 0]),
      cyl([-0.55, 0.72, -1.4], 0.16, 0.16, 0.08, 'emissiveLamp', [Math.PI / 2, 0, 0]),
      cyl([0.55, 0.72, -1.4], 0.16, 0.16, 0.08, 'emissiveLamp', [Math.PI / 2, 0, 0]),
      box([0, 1.12, -0.25], [0.5, 0.22, 0.92], 'dark'),
      ...(alt ? [box([0, 0.96, 0.95], [1.28, 0.32, 0.65], 'water', [0.35, 0, 0])] : []),
    ],
  })),

  ...makePair('era_spirit_skiff', '仙侠御剑浮空玄木飞舟', ['灵石驱动金纹舟', '双帆仙鹤翼展款'], (alt) => ({
    heightM: 2.3,
    widthM: 2.2,
    depthM: 6.2,
    parts: [
      box([0, 0.95, 0], [1.65, 0.62, 4.4], 'wood'),
      cone([0, 1.05, 2.75], 0.78, 1.5, 6, 'wood', [Math.PI / 2, 0, 0]),
      cone([0, 1.05, -2.65], 0.72, 1.3, 6, 'accent', [-Math.PI / 2, 0, 0]),
      sph([0, 1.38, 0], 0.38, 0.42, 0.38, 'emissiveLamp'),
      box([-1.1, 1.08, 0], [1.1, 0.08, 0.55], 'accent', [0, 0, 0.28]),
      box([1.1, 1.08, 0], [1.1, 0.08, 0.55], 'accent', [0, 0, -0.28]),
      ...(alt
        ? [torus([0, 0.95, -2.1], 0.95, 0.05, 20, 'emissiveLamp')]
        : []),
    ],
  })),
];

const RICH_TREES: AssetVariantSpec[] = [
  ...makePair('era_giant_banyan', '千年气根大古榕树', ['垂须盘根遮天款', '石坛供奉许愿树款'], (alt) => ({
    heightM: 5.8,
    widthM: 4.8,
    depthM: 4.8,
    parts: [
      cyl([0, 1.25, 0], 0.48, 0.85, 2.5, 'trunk'),
      cyl([-1.25, 1.15, 0.55], 0.08, 0.14, 2.3, 'trunk'),
      cyl([1.35, 1.15, -0.45], 0.08, 0.14, 2.3, 'trunk'),
      cyl([0.45, 1.15, 1.35], 0.07, 0.12, 2.3, 'trunk'),
      sph([0, 3.6, 0], 2.1, 1.35, 2.0, 'foliage'),
      sph([-1.45, 3.05, 0.6], 1.25, 0.95, 1.25, 'foliage'),
      sph([1.45, 3.15, -0.5], 1.3, 1.0, 1.25, 'foliage'),
      ...(alt ? [cyl([0, 0.24, 0], 1.55, 1.65, 0.48, 'rock')] : []),
    ],
  })),

  ...makePair('era_sakura_tree', '和风满开粉樱花树', ['繁花垂枝盛放款', '石灯伴樱庭院款'], (alt) => ({
    heightM: 4.4,
    widthM: 3.4,
    depthM: 3.4,
    parts: [
      cyl([0, 0.85, 0], 0.16, 0.28, 1.7, 'trunk'),
      cyl([-0.42, 1.75, 0.12], 0.1, 0.14, 1.2, 'trunk', [0, 0, 0.48]),
      cyl([0.48, 1.85, -0.1], 0.1, 0.14, 1.3, 'trunk', [0, 0, -0.44]),
      sph([0, 3.15, 0], 1.45, 0.85, 1.35, 'accent'),
      sph([-1.05, 2.65, 0.35], 0.92, 0.65, 0.92, 'accent'),
      sph([1.05, 2.75, -0.25], 0.95, 0.68, 0.95, 'accent'),
      ...(alt ? [sph([0.2, 2.25, 0.85], 0.65, 0.48, 0.65, 'default')] : []),
    ],
  })),

  ...makePair('era_crystal_tree', '异星科幻发光晶簇树', ['紫青晶柱共生款', '浮空悬浮晶冠款'], (alt) => ({
    heightM: 4.6,
    widthM: 2.6,
    depthM: 2.6,
    parts: [
      cyl([0, 1.1, 0], 0.22, 0.36, 2.2, 'dark'),
      cone([0, 3.25, 0], 0.55, 2.1, 6, 'water'),
      cone([-0.75, 2.75, 0.35], 0.35, 1.5, 6, 'emissiveLamp', [0.22, 0, 0.48]),
      cone([0.75, 2.85, -0.32], 0.35, 1.6, 6, 'emissiveLamp', [-0.18, 0, -0.45]),
      cone([0.25, 2.65, 0.72], 0.28, 1.35, 6, 'water', [0.46, 0, -0.15]),
      ...(alt ? [torus([0, 3.1, 0], 1.12, 0.04, 24, 'emissiveLamp', [Math.PI / 2, 0, 0])] : []),
    ],
  })),

  ...makePair('era_desert_cactus', '西部荒漠巨人柱仙人掌', ['双臂标准巨人柱', '多杈带花蕾款'], (alt) => ({
    heightM: 3.8,
    widthM: 1.8,
    depthM: 1.1,
    parts: [
      cyl([0, 1.75, 0], 0.26, 0.3, 3.5, 'foliage'),
      sph([0, 3.5, 0], 0.26, 0.26, 0.26, 'foliage'),
      box([-0.42, 1.68, 0], [0.58, 0.28, 0.28], 'foliage'),
      cyl([-0.68, 2.25, 0], 0.16, 0.18, 1.15, 'foliage'),
      box([0.42, 2.02, 0], [0.58, 0.28, 0.28], 'foliage'),
      cyl([0.68, 2.62, 0], 0.16, 0.18, 1.2, 'foliage'),
      ...(alt ? [sph([0, 3.8, 0], 0.16, 0.16, 0.16, 'accent')] : []),
    ],
  })),
];

const RICH_ROCKS: AssetVariantSpec[] = [
  ...makePair('era_crystal_cluster', '矿洞发光水晶矿簇', ['七星棱晶放射簇', '巨岩母矿嵌晶款'], (alt) => ({
    heightM: 2.3,
    widthM: 2.1,
    depthM: 2.1,
    parts: [
      dodec([0, 0.38, 0], 0.88, 0.45, 0.85, 'rock'),
      cone([0, 1.32, 0], 0.32, 1.55, 6, 'water'),
      cone([-0.48, 1.05, 0.28], 0.24, 1.18, 6, 'emissiveLamp', [0.22, 0, 0.38]),
      cone([0.52, 1.08, -0.22], 0.25, 1.24, 6, 'water', [-0.2, 0, -0.35]),
      cone([0.18, 0.92, 0.55], 0.2, 0.95, 6, 'emissiveLamp', [0.42, 0, -0.15]),
      ...(alt ? [dodec([-0.65, 0.45, -0.52], 0.55, 0.48, 0.52, 'rock')] : []),
    ],
  })),

  ...makePair('era_stonehenge', '史前遗迹巨石阵石门', ['双柱横楣立石门', '倾倒半埋风化款'], (alt) => ({
    heightM: 3.4,
    widthM: 3.2,
    depthM: 1.5,
    parts: [
      box([-0.92, 1.38, 0], [0.76, 2.75, 0.72], 'rock', [0, 0, alt ? 0.08 : 0]),
      box([0.92, 1.38, 0], [0.76, 2.75, 0.72], 'rock', [0, 0, alt ? -0.05 : 0]),
      box([0, 2.95, 0], [2.95, 0.58, 0.88], 'concrete', [0, 0, alt ? 0.04 : 0]),
      ...(alt ? [dodec([-1.45, 0.36, 0.88], 0.58, 0.35, 0.48, 'rock')] : []),
    ],
  })),

  ...makePair('era_basalt_pillars', '火山六方玄武岩阶梯石柱', ['阶梯叠落岩柱群', '熔岩裂纹炽热款'], (alt) => ({
    heightM: 2.6,
    widthM: 2.4,
    depthM: 2.2,
    parts: [
      cyl([0, 1.25, 0], 0.42, 0.44, 2.5, 'rock'),
      cyl([-0.68, 0.92, 0.36], 0.36, 0.38, 1.84, 'dark'),
      cyl([0.72, 0.75, -0.28], 0.38, 0.4, 1.5, 'rock'),
      cyl([0.18, 0.58, 0.68], 0.34, 0.36, 1.16, 'dark'),
      ...(alt ? [cyl([-0.22, 0.25, -0.62], 0.52, 0.56, 0.5, 'emissiveLamp')] : []),
    ],
  })),
];

const RICH_LAMPS: AssetVariantSpec[] = [
  ...makePair('era_brazier_post', '中世纪铁笼火盆立柱', ['燃火铁笼高柱', '城墙双挑火把支架'], (alt) => ({
    heightM: 3.1,
    widthM: 0.9,
    depthM: 0.9,
    parts: [
      cyl([0, 0.2, 0], 0.34, 0.44, 0.4, 'rock'),
      cyl([0, 1.45, 0], 0.08, 0.11, 2.2, 'dark'),
      cyl([0, 2.62, 0], 0.32, 0.18, 0.38, 'dark'),
      sph([0, 2.86, 0], 0.24, 0.3, 0.24, 'emissiveLamp'),
      ...(alt ? [torus([0, 2.68, 0], 0.34, 0.035, 16, 'dark', [Math.PI / 2, 0, 0])] : []),
    ],
  })),

  ...makePair('era_cyber_neon_pole', '赛博朋克霓虹灯牌柱', ['双面发光看板灯柱', '悬浮环状全彩灯塔'], (alt) => ({
    heightM: 4.8,
    widthM: 1.5,
    depthM: 0.7,
    parts: [
      cyl([0, 0.25, 0], 0.24, 0.32, 0.5, 'dark'),
      cyl([0, 2.35, 0], 0.1, 0.14, 4.2, 'dark'),
      box([0.52, 3.2, 0], [0.76, 1.65, 0.12], 'emissiveLamp'),
      box([-0.38, 3.6, 0], [0.48, 0.95, 0.12], 'water'),
      ...(alt
        ? [torus([0, 4.45, 0], 0.45, 0.05, 20, 'emissiveLamp', [Math.PI / 2, 0, 0])]
        : []),
    ],
  })),

  ...makePair('era_gas_streetlamp', '维多利亚复古煤气街灯', ['铸铁玻璃灯罩单灯', '双灯挂牌古典款'], (alt) => ({
    heightM: 4.1,
    widthM: 1.0,
    depthM: 1.0,
    parts: [
      cyl([0, 0.35, 0], 0.2, 0.32, 0.7, 'dark'),
      cyl([0, 2.05, 0], 0.07, 0.12, 3.0, 'dark'),
      cone([0, 3.58, 0], 0.26, 0.24, 6, 'accent'),
      cyl([0, 3.78, 0], 0.22, 0.15, 0.36, 'emissiveLamp'),
      cone([0, 4.06, 0], 0.26, 0.26, 6, 'dark'),
      ...(alt ? [box([0.4, 2.9, 0], [0.55, 0.28, 0.05], 'accent')] : []),
    ],
  })),
];

const RICH_BARRIERS: AssetVariantSpec[] = [
  ...makePair('era_palisade', '中世纪尖木桩拒马阵', ['尖刺原木营垒栅栏', '交叉拒马防骑兵款'], (alt) => ({
    heightM: 1.9,
    widthM: 3.0,
    depthM: 1.2,
    parts: [
      box([0, 0.45, 0], [2.95, 0.14, 0.14], 'wood'),
      box([0, 1.15, 0], [2.95, 0.14, 0.14], 'wood'),
      ...[-1.1, -0.55, 0, 0.55, 1.1].map((x) =>
        cyl([x, 0.92, alt ? 0.12 : 0], 0.1, 0.13, 1.75, 'trunk', [alt ? -0.32 : 0, 0, 0])
      ),
      ...[-1.1, -0.55, 0, 0.55, 1.1].map((x) =>
        cone([x, 1.88, alt ? -0.18 : 0], 0.1, 0.36, 8, 'wood', [alt ? -0.32 : 0, 0, 0])
      ),
    ],
  })),

  ...makePair('era_energy_shield', '科幻激光力场能量护盾墙', ['半透光幕发发生器墙', '高能双柱防御光墙'], (alt) => ({
    heightM: 2.3,
    widthM: 3.4,
    depthM: 0.7,
    parts: [
      box([-1.52, 1.05, 0], [0.34, 2.1, 0.48], 'dark'),
      box([1.52, 1.05, 0], [0.34, 2.1, 0.48], 'dark'),
      box([0, 1.1, 0], [2.72, 1.85, 0.08], 'water'),
      box([0, 2.08, 0], [2.8, 0.08, 0.14], 'emissiveLamp'),
      ...(alt ? [box([0, 0.12, 0], [3.35, 0.24, 0.58], 'accent')] : []),
    ],
  })),

  ...makePair('era_sandbag_bunker', '战地沙袋机枪阵地掩体', ['弧形沙袋堆叠堡', '带伪装顶棚掩体款'], (alt) => ({
    heightM: 1.65,
    widthM: 3.2,
    depthM: 2.2,
    parts: [
      box([0, 0.28, 0.65], [2.8, 0.45, 0.55], 'wood'),
      box([0, 0.72, 0.62], [2.4, 0.42, 0.48], 'concrete'),
      box([-1.15, 0.48, -0.1], [0.55, 0.9, 1.3], 'wood'),
      box([1.15, 0.48, -0.1], [0.55, 0.9, 1.3], 'wood'),
      ...(alt
        ? [
            cyl([-1.15, 1.1, 0.6], 0.06, 0.06, 1.4, 'dark'),
            cyl([1.15, 1.1, 0.6], 0.06, 0.06, 1.4, 'dark'),
            box([0, 1.72, 0], [2.95, 0.12, 2.0], 'foliage'),
          ]
        : []),
    ],
  })),
];

const RICH_CRATES: AssetVariantSpec[] = [
  ...makePair('era_cryo_pod', '科幻基地低温休眠生态舱', ['立式玻璃观察舱', '卧式医疗冷冻舱'], (alt) => ({
    heightM: 2.35,
    widthM: 1.15,
    depthM: 1.15,
    parts: alt
      ? [
          box([0, 0.35, 0], [1.05, 0.65, 2.2], 'dark'),
          cyl([0, 0.78, 0], 0.42, 0.46, 1.95, 'water', [Math.PI / 2, 0, 0]),
          box([0, 0.85, -0.82], [0.85, 0.65, 0.35], 'accent'),
        ]
      : [
          cyl([0, 0.2, 0], 0.52, 0.58, 0.4, 'dark'),
          cyl([0, 1.18, 0], 0.42, 0.42, 1.56, 'water'),
          cyl([0, 2.1, 0], 0.48, 0.54, 0.32, 'accent'),
          torus([0, 1.92, 0], 0.46, 0.035, 20, 'emissiveLamp', [Math.PI / 2, 0, 0]),
        ],
  })),

  ...makePair('era_alchemy_rack', '魔法炼金药剂瓶架', ['双层木架彩瓶组', '悬瓶沸腾锅炉款'], (alt) => ({
    heightM: 1.75,
    widthM: 1.45,
    depthM: 0.65,
    parts: [
      box([0, 0.82, 0], [1.35, 0.08, 0.52], 'wood'),
      box([0, 1.36, 0], [1.35, 0.08, 0.52], 'wood'),
      box([-0.62, 0.85, 0], [0.08, 1.65, 0.52], 'trunk'),
      box([0.62, 0.85, 0], [0.08, 1.65, 0.52], 'trunk'),
      sph([-0.35, 1.02, 0], 0.14, 0.16, 0.14, 'emissiveLamp'),
      sph([0.05, 1.02, 0], 0.14, 0.18, 0.14, 'water'),
      cyl([0.38, 1.02, 0], 0.08, 0.12, 0.28, 'accent'),
      ...(alt ? [sph([0, 0.34, 0], 0.32, 0.28, 0.32, 'dark')] : []),
    ],
  })),

  ...makePair('era_treasure_hoard', '奇幻财宝金币大宝箱', ['敞盖溢金款', '锁链封印重铁箱'], (alt) => ({
    heightM: 1.1,
    widthM: 1.35,
    depthM: 0.92,
    parts: [
      box([0, 0.32, 0], [1.22, 0.62, 0.82], 'wood'),
      box([-0.55, 0.32, 0], [0.1, 0.66, 0.86], 'dark'),
      box([0.55, 0.32, 0], [0.1, 0.66, 0.86], 'dark'),
      ...(alt
        ? [cyl([0, 0.72, 0], 0.42, 0.42, 1.24, 'accent', [0, 0, Math.PI / 2])]
        : [
            box([0, 0.65, 0], [1.1, 0.15, 0.68], 'emissiveLamp'),
            cyl([0, 0.98, -0.35], 0.42, 0.42, 1.22, 'wood', [0, 0, Math.PI / 2]),
          ]),
    ],
  })),
];

const RICH_TABLES: AssetVariantSpec[] = [
  ...makePair('era_feast_table', '中世纪城堡长宴会烛台桌', ['金色烛台高脚杯宴', '羊皮卷轴地图议事款'], (alt) => ({
    heightM: 1.35,
    widthM: 3.2,
    depthM: 1.35,
    parts: [
      box([0, 0.78, 0], [3.1, 0.12, 1.25], 'wood'),
      box([-1.2, 0.38, 0], [0.18, 0.76, 1.05], 'trunk'),
      box([1.2, 0.38, 0], [0.18, 0.76, 1.05], 'trunk'),
      box([0, 0.26, 0], [2.4, 0.1, 0.12], 'trunk'),
      ...(alt
        ? [
            box([0, 0.86, 0], [1.3, 0.03, 0.85], 'default'),
            cyl([-0.55, 0.95, 0.25], 0.04, 0.04, 0.2, 'accent'),
          ]
        : [
            cyl([-0.7, 1.04, 0], 0.04, 0.1, 0.42, 'accent'),
            sph([-0.7, 1.3, 0], 0.06, 0.09, 0.06, 'emissiveLamp'),
            cyl([0.7, 1.04, 0], 0.04, 0.1, 0.42, 'accent'),
            sph([0.7, 1.3, 0], 0.06, 0.09, 0.06, 'emissiveLamp'),
          ]),
    ],
  })),

  ...makePair('era_holo_war_table', '科幻全息战术指挥沙盘桌', ['地形投影态势盘', '三屏环绕参谋终端'], (alt) => ({
    heightM: 1.45,
    widthM: 2.3,
    depthM: 1.7,
    parts: [
      cyl([0, 0.42, 0], 0.95, 1.15, 0.84, 'dark'),
      cyl([0, 0.86, 0], 0.86, 0.86, 0.06, 'water'),
      cone([0, 1.1, 0], 0.26, 0.38, 6, 'emissiveLamp'),
      dodec([-0.32, 1.0, 0.22], 0.22, 0.16, 0.22, 'water'),
      ...(alt
        ? [
            box([0, 1.18, -0.92], [1.15, 0.56, 0.06], 'water', [-0.25, 0, 0]),
          ]
        : []),
    ],
  })),

  ...makePair('era_tatami_tea', '日式和风矮脚围炉茶几', ['坐垫茶壶待客款', '中央铁壶炭火款'], (alt) => ({
    heightM: 0.65,
    widthM: 1.45,
    depthM: 1.05,
    parts: [
      box([0, 0.36, 0], [1.38, 0.08, 0.95], 'wood'),
      box([-0.58, 0.18, -0.38], [0.1, 0.36, 0.1], 'trunk'),
      box([0.58, 0.18, -0.38], [0.1, 0.36, 0.1], 'trunk'),
      box([-0.58, 0.18, 0.38], [0.1, 0.36, 0.1], 'trunk'),
      box([0.58, 0.18, 0.38], [0.1, 0.36, 0.1], 'trunk'),
      cyl([0, 0.48, 0], 0.14, 0.16, 0.18, alt ? 'dark' : 'accent'),
      box([0, 0.12, 0.78], [0.58, 0.12, 0.55], 'default'),
      box([0, 0.12, -0.78], [0.58, 0.12, 0.55], 'default'),
    ],
  })),
];

const RICH_FURNITURE: AssetVariantSpec[] = [
  ...makePair('era_imperial_throne', '古风雕龙鎏金御椅宝座', ['屏风三折皇家座', '带踏脚鎏金独椅'], (alt) => ({
    heightM: 2.3,
    widthM: 2.0,
    depthM: 1.35,
    parts: [
      box([0, 0.12, 0], [1.8, 0.24, 1.25], 'wood'),
      box([0, 0.52, 0.05], [1.05, 0.22, 0.85], 'accent'),
      box([0, 1.08, -0.38], [1.1, 1.05, 0.14], 'accent'),
      box([-0.55, 0.76, 0.05], [0.12, 0.32, 0.82], 'wood'),
      box([0.55, 0.76, 0.05], [0.12, 0.32, 0.82], 'wood'),
      ...(alt
        ? [
            box([0, 1.35, -0.62], [1.95, 1.85, 0.1], 'trunk'),
            box([0, 1.35, -0.56], [1.55, 1.45, 0.04], 'accent'),
          ]
        : []),
    ],
  })),

  ...makePair('era_shoji_screen', '和风格子木框架屏风', ['三折立式透光屏', '推拉障子门框组'], (alt) => ({
    heightM: 2.1,
    widthM: 2.4,
    depthM: 0.45,
    parts: [
      box([0, 1.05, 0], [0.85, 2.02, 0.06], 'default'),
      box([0, 1.05, 0], [0.88, 2.08, 0.04], 'wood'),
      box([-0.82, 1.05, 0.16], [0.82, 2.02, 0.06], 'default', [0, 0.35, 0]),
      box([0.82, 1.05, 0.16], [0.82, 2.02, 0.06], 'default', [0, -0.35, 0]),
      ...(alt ? [box([0, 0.52, 0], [2.45, 0.08, 0.08], 'trunk')] : []),
    ],
  })),

  ...makePair('era_stone_hearth', '欧式石砌壁炉火塘架', ['燃柴炉火暖光款', '上方挂盾装饰款'], (alt) => ({
    heightM: 2.5,
    widthM: 2.1,
    depthM: 1.05,
    parts: [
      box([0, 0.1, 0], [2.15, 0.2, 1.05], 'rock'),
      box([-0.75, 0.78, 0], [0.46, 1.18, 0.86], 'rock'),
      box([0.75, 0.78, 0], [0.46, 1.18, 0.86], 'rock'),
      box([0, 1.42, 0], [2.05, 0.22, 0.92], 'wood'),
      box([0, 1.98, -0.1], [1.25, 0.96, 0.65], 'concrete'),
      sph([0, 0.42, 0], 0.3, 0.25, 0.24, 'emissiveLamp'),
      ...(alt ? [cyl([0, 1.88, 0.28], 0.26, 0.26, 0.08, 'accent', [Math.PI / 2, 0, 0])] : []),
    ],
  })),
];

const RICH_FACILITIES: AssetVariantSpec[] = [
  ...makePair('era_windmill', '乡村木构大风车磨坊塔', ['四翼帆布转动风车', '带粮仓侧屋磨坊款'], (alt) => ({
    heightM: 7.4,
    widthM: 3.6,
    depthM: 3.8,
    parts: [
      cyl([0, 0.4, 0], 1.55, 1.75, 0.8, 'rock'),
      cyl([0, 3.0, 0], 1.18, 1.52, 4.4, 'default'),
      cone([0, 5.85, 0], 1.38, 1.35, 8, 'wood'),
      cyl([0, 4.9, 1.32], 0.18, 0.18, 0.7, 'dark', [Math.PI / 2, 0, 0]),
      box([0, 4.9, 1.65], [0.16, 4.2, 0.08], 'wood', [0, 0, 0.4]),
      box([0, 4.9, 1.65], [4.2, 0.16, 0.08], 'wood', [0, 0, 0.4]),
      ...(alt ? [box([1.85, 1.15, 0], [1.5, 2.2, 2.2], 'trunk')] : []),
    ],
  })),

  ...makePair('era_radar_dish', '科幻深空巨型射电雷达锅', ['仰角追踪深空态', '警戒旋转扫描基座'], (alt) => ({
    heightM: 6.2,
    widthM: 4.5,
    depthM: 4.5,
    parts: [
      box([0, 0.45, 0], [3.4, 0.9, 3.4], 'concrete'),
      cyl([0, 1.65, 0], 0.72, 0.96, 1.6, 'dark'),
      cone([0, 3.55, 0.35], 2.1, 1.15, 18, 'default', [alt ? -0.95 : -0.58, 0, 0]),
      cyl([0, 4.25, 0.95], 0.08, 0.14, 1.5, 'accent', [alt ? -0.95 : -0.58, 0, 0]),
      sph([0, 4.85, 1.38], 0.18, 0.18, 0.18, 'emissiveLamp'),
    ],
  })),

  ...makePair('era_magic_portal', '奇幻符文石拱传送阵门', ['涡旋激活蓝光传送', '封印未激活石环'], (alt) => ({
    heightM: 4.4,
    widthM: 3.8,
    depthM: 1.4,
    parts: [
      cyl([0, 0.18, 0], 1.75, 1.95, 0.36, 'rock'),
      torus([0, 2.15, 0], 1.65, 0.24, 16, 'rock'),
      box([-1.58, 1.0, 0], [0.58, 1.65, 0.68], 'concrete'),
      box([1.58, 1.0, 0], [0.58, 1.65, 0.68], 'concrete'),
      ...(alt
        ? [sph([0, 2.15, 0], 1.36, 1.36, 0.08, 'water')]
        : [
            sph([0, 2.15, 0], 1.36, 1.36, 0.06, 'emissiveLamp'),
            torus([0, 2.15, 0], 1.12, 0.04, 24, 'water'),
          ]),
    ],
  })),

  ...makePair('era_steam_boiler', '蒸汽朋克高压铜管锅炉塔', ['双压力表铜釜', '蓄汽喷阀加压款'], (alt) => ({
    heightM: 4.2,
    widthM: 2.4,
    depthM: 2.2,
    parts: [
      box([0, 0.22, 0], [2.2, 0.44, 2.0], 'dark'),
      cyl([-0.45, 1.45, 0], 0.68, 0.68, 2.1, 'accent'),
      sph([-0.45, 2.5, 0], 0.68, 0.42, 0.68, 'accent'),
      cyl([0.55, 2.15, 0], 0.22, 0.28, 3.6, 'dark'),
      torus([-0.45, 1.85, 0], 0.72, 0.05, 18, 'dark', [Math.PI / 2, 0, 0]),
      ...(alt ? [sph([0.55, 4.1, 0], 0.32, 0.24, 0.32, 'default')] : []),
    ],
  })),
];

const RICH_BUILDINGS: AssetVariantSpec[] = [
  ...makePair('era_medieval_keep', '中世纪欧洲石砌古堡主楼', ['四角角楼垛口版', '高耸尖塔领主堡版'], (alt) => ({
    heightM: 12.5,
    widthM: 11.0,
    depthM: 11.0,
    parts: [
      box([0, 3.8, 0], [8.4, 7.6, 8.4], 'rock'),
      cyl([-4.2, 4.8, -4.2], 1.35, 1.45, 9.6, 'concrete'),
      cyl([4.2, 4.8, -4.2], 1.35, 1.45, 9.6, 'concrete'),
      cyl([-4.2, 4.8, 4.2], 1.35, 1.45, 9.6, 'concrete'),
      cyl([4.2, 4.8, 4.2], 1.35, 1.45, 9.6, 'concrete'),
      cone([-4.2, 10.6, -4.2], 1.6, 2.2, 8, 'dark'),
      cone([4.2, 10.6, -4.2], 1.6, 2.2, 8, 'dark'),
      cone([-4.2, 10.6, 4.2], 1.6, 2.2, 8, 'dark'),
      cone([4.2, 10.6, 4.2], 1.6, 2.2, 8, 'dark'),
      box([0, 1.6, 4.25], [2.4, 3.2, 0.5], 'dark'),
      ...(alt ? [cyl([0, 9.2, 0], 1.45, 1.6, 3.4, 'rock'), cone([0, 12.1, 0], 1.75, 2.6, 8, 'accent')] : []),
    ],
  })),

  ...makePair('era_japanese_tenshu', '和风多层重檐木构天守阁', ['三层千鸟破风城郭', '五层大天守阁金鯱款'], (alt) => ({
    heightM: alt ? 14.5 : 11.5,
    widthM: 10.0,
    depthM: 10.0,
    parts: [
      ramp([0, 1.4, 0], [9.4, 2.8, 9.4], 'rock'),
      box([0, 1.4, 0], [8.2, 2.8, 8.2], 'rock'),
      box([0, 4.1, 0], [6.8, 2.6, 6.8], 'default'),
      cone([0, 5.7, 0], 5.6, 1.3, 4, 'dark', [0, Math.PI / 4, 0]),
      box([0, 7.1, 0], [5.0, 2.2, 5.0], 'default'),
      cone([0, 8.5, 0], 4.2, 1.1, 4, 'dark', [0, Math.PI / 4, 0]),
      box([0, 9.8, 0], [3.4, 1.8, 3.4], 'default'),
      cone([0, 11.2, 0], 3.0, 1.3, 4, 'dark', [0, Math.PI / 4, 0]),
      ...(alt ? [cyl([0, 12.2, 0], 0.14, 0.18, 0.85, 'accent')] : []),
    ],
  })),

  ...makePair('era_cyber_tower', '赛博朋克巨型全息霓虹大厦', ['倾斜霓虹广告塔', '顶层停机坪科幻楼'], (alt) => ({
    heightM: 18.0,
    widthM: 10.0,
    depthM: 10.0,
    parts: [
      box([0, 3.0, 0], [9.2, 6.0, 9.2], 'dark'),
      box([0, 10.2, 0], [7.2, 8.8, 7.2], 'dark'),
      box([-3.9, 9.5, 0], [0.45, 7.2, 2.4], 'emissiveLamp'),
      box([3.9, 11.2, 0], [0.45, 6.4, 2.2], 'water'),
      box([0, 15.8, 0], [5.2, 2.4, 5.2], 'accent'),
      ...(alt
        ? [cyl([0, 17.2, 0], 3.4, 3.4, 0.35, 'dark')]
        : [cyl([2.0, 18.2, 2.0], 0.12, 0.2, 3.4, 'emissiveLamp')]),
    ],
  })),

  ...makePair('era_desert_dome', '西域大漠土坯圆顶清真堡', ['双穹顶黄沙方堡', '带宣礼高塔绿洲堡'], (alt) => ({
    heightM: 9.8,
    widthM: 9.5,
    depthM: 9.5,
    parts: [
      box([0, 2.4, 0], [8.8, 4.8, 8.8], 'wood'),
      sph([0, 4.8, 0], 2.85, 2.4, 2.85, 'default'),
      sph([-2.8, 4.8, 2.6], 1.15, 0.95, 1.15, 'accent'),
      sph([2.8, 4.8, -2.6], 1.15, 0.95, 1.15, 'accent'),
      box([0, 1.4, 4.45], [2.0, 2.8, 0.35], 'dark'),
      ...(alt ? [cyl([3.8, 4.8, 3.8], 0.65, 0.8, 9.6, 'wood'), cone([3.8, 10.1, 3.8], 0.72, 1.2, 10, 'accent')] : []),
    ],
  })),

  // --- Outdoor Camp Structures & Rural Brick-Tile Houses ---
  ...makePair('era_camping_tent', '户外露营三角A字帆布帐篷', ['经典双坡帆布帐', '前支遮阳天幕带篝火'], (alt) => ({
    heightM: 2.35,
    widthM: 3.0,
    depthM: 3.6,
    parts: [
      // Groundsheet tarp + wooden ridge & upright A-frame poles
      box([0, 0.04, 0], [3.0, 0.08, 3.6], 'dark'),
      cyl([0, 1.12, -1.68], 0.05, 0.06, 2.24, 'trunk'),
      cyl([0, 1.12, 1.68], 0.05, 0.06, 2.24, 'trunk'),
      cyl([0, 2.22, 0], 0.045, 0.045, 3.65, 'wood', [Math.PI / 2, 0, 0]),
      // Left & right sloped canvas sides meeting tightly at ridge [0, 2.24, 0]
      box([-0.74, 1.12, 0], [0.06, 2.66, 3.55], 'accent', [0, 0, -0.59]),
      box([0.74, 1.12, 0], [0.06, 2.66, 3.55], 'accent', [0, 0, 0.59]),
      // Back canvas triangular infill + dark inner entryway
      box([0, 0.9, -1.62], [1.95, 1.75, 0.08], 'concrete'),
      box([0, 0.75, 1.56], [0.95, 1.45, 0.06], 'dark'),
      // Side corner anchor pegs
      ...[-1.5, 0, 1.5].flatMap((z) => [
        cyl([-1.58, 0.14, z], 0.025, 0.03, 0.28, 'wood', [0, 0, -0.35]),
        cyl([1.58, 0.14, z], 0.025, 0.03, 0.28, 'wood', [0, 0, 0.35]),
      ]),
      ...(alt
        ? [
            // Extended front awning canopy + support poles + glowing camp lantern
            box([0, 1.88, 2.55], [2.75, 0.06, 1.9], 'default', [-0.12, 0, 0]),
            cyl([-1.28, 0.9, 3.42], 0.04, 0.04, 1.8, 'trunk'),
            cyl([1.28, 0.9, 3.42], 0.04, 0.04, 1.8, 'trunk'),
            cyl([0, 0.16, 4.1], 0.42, 0.46, 0.14, 'rock'),
            sph([0, 0.32, 4.1], 0.16, 0.24, 0.16, 'emissiveLamp'),
          ]
        : []),
    ],
  })),

  ...makePair('era_teepee_tent', '游牧锥形皮毡印第安尖顶帐', ['交叉木杆锥形帐', '带石圈篝火营帐'], (alt) => ({
    heightM: 4.1,
    widthM: 3.8,
    depthM: 3.8,
    parts: [
      cyl([0, 0.06, 0], 1.85, 1.92, 0.12, 'concrete'),
      cone([0, 1.82, 0], 1.78, 3.4, 12, 'wood'),
      box([0, 0.78, 1.38], [0.78, 1.38, 0.42], 'dark', [-0.36, 0, 0]),
      // Protruding crossed ridge poles above smoke vent
      cyl([-0.14, 3.55, 0], 0.04, 0.055, 1.25, 'trunk', [0.18, 0, -0.32]),
      cyl([0.14, 3.55, 0], 0.04, 0.055, 1.25, 'trunk', [-0.18, 0, 0.32]),
      cyl([0, 3.55, -0.14], 0.04, 0.055, 1.25, 'trunk', [0.32, 0, 0.16]),
      ...(alt
        ? [
            cyl([0, 0.12, 2.75], 0.48, 0.52, 0.16, 'rock'),
            sph([0, 0.3, 2.75], 0.2, 0.28, 0.2, 'emissiveLamp'),
          ]
        : []),
    ],
  })),

  ...makePair('era_military_tent', '户外拱形野战军用大帐篷', ['军绿弧顶行军大帐', '带观察窗指挥大帐'], (alt) => ({
    heightM: 3.2,
    widthM: 5.0,
    depthM: 7.4,
    parts: [
      box([0, 0.06, 0], [5.1, 0.12, 7.5], 'concrete'),
      box([0, 0.85, 0], [4.6, 1.65, 7.0], 'foliage'),
      cyl([0, 1.68, 0], 2.34, 2.34, 7.0, 'foliage', [Math.PI / 2, 0, 0]),
      box([0, 1.25, 3.54], [1.65, 2.35, 0.18], 'dark'),
      box([0, 2.48, 3.7], [2.1, 0.14, 0.75], 'trunk', [0.18, 0, 0]),
      ...(alt
        ? [
            box([-2.32, 1.2, -1.6], [0.08, 0.72, 1.15], 'water'),
            box([-2.32, 1.2, 1.2], [0.08, 0.72, 1.15], 'water'),
            box([2.32, 1.2, -1.6], [0.08, 0.72, 1.15], 'water'),
            box([2.32, 1.2, 1.2], [0.08, 0.72, 1.15], 'water'),
          ]
        : []),
    ],
  })),

  ...makePair('era_mongol_yurt', '草原游牧白色毡房蒙古包', ['红门彩带传统蒙古包', '带木栈台迎宾大包'], (alt) => ({
    heightM: 3.9,
    widthM: 5.8,
    depthM: 5.8,
    parts: [
      cyl([0, 0.12, 0], alt ? 3.1 : 2.8, alt ? 3.2 : 2.88, 0.24, alt ? 'wood' : 'rock'),
      cyl([0, 1.25, 0], 2.55, 2.6, 2.05, 'default'),
      torus([0, 2.05, 0], 2.58, 0.05, 24, 'accent', [Math.PI / 2, 0, 0]),
      cone([0, 2.88, 0], 2.75, 1.28, 20, 'default'),
      cyl([0, 3.55, 0], 0.56, 0.62, 0.28, 'trunk'),
      box([0, 1.05, 2.6], [1.18, 1.85, 0.24], 'trunk'),
      box([0, 1.05, 2.72], [0.86, 1.65, 0.06], 'accent'),
    ],
  })),

  ...makePair('era_glamping_dome', '野奢营地星空透明球形帐篷', ['半透穹顶露营球屋', '带观景木甲板民宿球'], (alt) => ({
    heightM: 3.4,
    widthM: 5.4,
    depthM: 6.2,
    parts: [
      box([0, 0.16, 0.3], [5.4, 0.32, 6.2], 'wood'),
      sph([0, 0.32, -0.1], 2.35, 2.45, 2.35, 'water'),
      torus([0, 0.36, -0.1], 2.35, 0.07, 24, 'dark', [Math.PI / 2, 0, 0]),
      box([0, 1.25, 2.2], [1.32, 1.95, 0.45], 'dark'),
      box([0, 1.22, 2.42], [0.92, 1.75, 0.06], 'emissiveLamp'),
      ...(alt
        ? [
            box([-2.58, 0.65, 0.3], [0.08, 0.68, 5.8], 'dark'),
            box([2.58, 0.65, 0.3], [0.08, 0.68, 5.8], 'dark'),
            box([0, 0.65, 3.32], [5.2, 0.68, 0.08], 'dark'),
          ]
        : []),
    ],
  })),

  ...makePair('era_rural_brick_house', '农村单层红砖青瓦农家平房', ['三间带廊檐传统瓦房', '带砖砌烟囱偏房农院'], (alt) => ({
    heightM: 4.8,
    widthM: 9.2,
    depthM: 5.8,
    parts: [
      // Stone stoop plinth & main rural brick masonry walls
      box([0, 0.18, 0.2], [9.4, 0.36, 6.0], 'rock'),
      box([0, 1.75, -0.25], [8.8, 2.8, 4.4], 'trunk'),
      // Front concrete porch veranda + 4 veranda columns
      box([0, 0.24, 2.45], [8.8, 0.16, 1.2], 'concrete'),
      ...[-4.0, -1.4, 1.4, 4.0].map((cx) =>
        cyl([cx, 1.65, 2.9], 0.11, 0.12, 2.7, 'default')
      ),
      // Front central wooden double doors + flanking white-framed windows
      box([0, 1.38, 1.97], [1.35, 2.08, 0.08], 'wood'),
      box([-2.7, 1.62, 1.97], [1.25, 1.15, 0.08], 'water'),
      box([2.7, 1.62, 1.97], [1.25, 1.15, 0.08], 'water'),
      box([-2.7, 1.0, 1.98], [1.35, 0.12, 0.12], 'concrete'),
      box([2.7, 1.0, 1.98], [1.35, 0.12, 0.12], 'concrete'),
      // Overhanging pitched clay-tile roof slopes + stepped gable under-ridge infill
      box([0, 3.68, -0.25], [8.8, 1.05, 1.2], 'trunk'),
      box([0, 3.65, 1.12], [9.6, 0.22, 3.45], 'dark', [0.46, 0, 0]),
      box([0, 3.65, -1.58], [9.6, 0.22, 3.45], 'dark', [-0.46, 0, 0]),
      box([0, 4.42, -0.25], [9.65, 0.22, 0.28], 'accent'),
      // Brick hearth chimney
      box([2.85, 4.35, -1.1], [0.62, 1.4, 0.62], 'trunk'),
      box([2.85, 5.05, -1.1], [0.74, 0.14, 0.74], 'concrete'),
      ...(alt ? [box([-5.65, 1.35, -0.35], [2.5, 2.1, 3.6], 'concrete'), box([-5.65, 2.52, -0.35], [2.75, 0.18, 3.9], 'dark', [0.18, 0, 0])] : []),
    ],
  })),

  ...makePair('era_village_two_story', '乡村二层带露台砖砌小楼', ['红瓦坡顶带挑廊农楼', '晒台太阳能热水器款'], (alt) => ({
    heightM: 7.8,
    widthM: 8.8,
    depthM: 6.4,
    parts: [
      box([0, 0.2, 0], [9.2, 0.4, 6.6], 'rock'),
      box([0, 2.0, -0.2], [8.4, 3.2, 5.4], 'default'),
      box([0, 5.0, -0.2], [8.4, 2.8, 5.4], 'trunk'),
      // 1F & 2F cantilevered front veranda + guardrail
      box([0, 3.52, 2.9], [8.6, 0.2, 1.3], 'concrete'),
      box([0, 4.02, 3.48], [8.5, 0.85, 0.1], 'accent'),
      box([0, 1.5, 2.52], [1.45, 2.2, 0.08], 'wood'),
      box([-2.4, 1.75, 2.52], [1.4, 1.25, 0.08], 'water'),
      box([2.4, 1.75, 2.52], [1.4, 1.25, 0.08], 'water'),
      box([-2.4, 4.95, 2.52], [1.4, 1.25, 0.08], 'water'),
      box([2.4, 4.95, 2.52], [1.4, 1.25, 0.08], 'water'),
      ...(alt
        ? [
            box([0, 6.52, -0.2], [8.8, 0.35, 5.8], 'concrete'),
            cyl([2.1, 7.18, 0.2], 0.22, 0.22, 1.6, 'accent', [0, 0, Math.PI / 2]),
            box([2.1, 6.86, 0.85], [1.65, 0.1, 1.0], 'water', [0.52, 0, 0]),
          ]
        : [
            box([0, 6.95, 1.2], [9.2, 0.22, 3.4], 'dark', [0.44, 0, 0]),
            box([0, 6.95, -1.6], [9.2, 0.22, 3.4], 'dark', [-0.44, 0, 0]),
            box([0, 7.66, -0.2], [9.25, 0.22, 0.28], 'accent'),
          ]),
    ],
  })),

  ...makePair('era_farm_barn', '乡村红顶大谷仓带圆柱粮仓', ['对开木门红顶谷仓', '附高筒粮仓牧场款'], (alt) => ({
    heightM: 6.8,
    widthM: 9.0,
    depthM: 7.4,
    parts: [
      box([0, 0.18, 0], [8.4, 0.36, 7.2], 'concrete'),
      box([0, 2.15, 0], [7.8, 3.6, 6.8], 'trunk'),
      box([0, 4.75, 1.75], [8.2, 0.24, 3.9], 'dark', [0.54, 0, 0]),
      box([0, 4.75, -1.75], [8.2, 0.24, 3.9], 'dark', [-0.54, 0, 0]),
      box([0, 1.55, 3.44], [2.4, 2.7, 0.12], 'wood'),
      box([0, 3.45, 3.44], [1.15, 1.05, 0.12], 'water'),
      ...(alt
        ? [
            cyl([5.15, 3.1, -1.2], 1.35, 1.35, 5.8, 'default'),
            sph([5.15, 6.0, -1.2], 1.35, 0.85, 1.35, 'accent'),
          ]
        : []),
    ],
  })),

  ...makePair('era_stilt_house', '西南山区悬挑木柱干栏吊脚楼', ['挑廊双坡木楼', '山寨连廊阶梯款'], (alt) => ({
    heightM: 7.0,
    widthM: 7.8,
    depthM: 6.2,
    parts: [
      // Elevated wooden stilt posts
      ...[-3.2, 0, 3.2].flatMap((x) =>
        [-2.2, 2.2].map((z) => cyl([x, 1.2, z], 0.15, 0.18, 2.4, 'trunk'))
      ),
      box([0, 2.42, 0], [7.8, 0.26, 6.2], 'wood'),
      box([0, 3.85, -0.3], [7.2, 2.6, 4.4], 'trunk'),
      box([0, 3.15, 2.95], [7.8, 1.05, 0.14], 'wood'),
      box([0, 3.7, 1.95], [1.25, 1.85, 0.08], 'dark'),
      box([0, 5.65, 0.95], [8.6, 0.2, 3.8], 'dark', [0.42, 0, 0]),
      box([0, 5.65, -1.55], [8.6, 0.2, 3.8], 'dark', [-0.42, 0, 0]),
      ...(alt ? [ramp([3.2, 0.05, 3.0], [1.2, 2.35, 2.4], 'wood')] : []),
    ],
  })),

  ...makePair('era_log_cabin', '森林原木尖顶避暑小木屋', ['陡坡木板带门廊木屋', '石砌壁炉烟囱猎人屋'], (alt) => ({
    heightM: 5.4,
    widthM: 6.2,
    depthM: 6.8,
    parts: [
      box([0, 0.2, 0], [6.4, 0.4, 7.0], 'rock'),
      box([0, 1.55, -0.45], [5.4, 2.3, 4.8], 'wood'),
      box([0, 1.35, 2.0], [1.1, 1.9, 0.1], 'trunk'),
      box([1.55, 1.55, 2.0], [0.95, 0.95, 0.08], 'water'),
      box([-1.55, 1.55, 2.0], [0.95, 0.95, 0.08], 'water'),
      box([-1.45, 3.75, -0.2], [0.22, 3.65, 6.8], 'dark', [0, 0, -0.68]),
      box([1.45, 3.75, -0.2], [0.22, 3.65, 6.8], 'dark', [0, 0, 0.68]),
      cyl([-2.3, 1.3, 3.1], 0.1, 0.12, 1.9, 'trunk'),
      cyl([2.3, 1.3, 3.1], 0.1, 0.12, 1.9, 'trunk'),
      ...(alt ? [box([2.75, 2.75, -0.8], [0.85, 4.9, 0.95], 'rock')] : []),
    ],
  })),

  ...makePair('era_thatched_hut', '海滨椰林木柱茅草凉屋', ['敞开休憩茅草凉亭屋', '竹木半围度假草屋'], (alt) => ({
    heightM: 4.2,
    widthM: 4.8,
    depthM: 4.8,
    parts: [
      box([0, 0.22, 0], [4.8, 0.44, 4.8], 'wood'),
      ...[-1.9, 1.9].flatMap((x) =>
        [-1.9, 1.9].map((z) => cyl([x, 1.35, z], 0.11, 0.14, 2.1, 'trunk'))
      ),
      cone([0, 3.15, 0], 3.35, 1.85, 8, 'wood'),
      cone([0, 3.92, 0], 1.15, 0.65, 8, 'trunk'),
      ...(alt ? [box([0, 1.15, -2.0], [3.8, 1.65, 0.16], 'wood')] : []),
    ],
  })),

  ...makePair('era_yaodong_cave', '黄土高原青砖拱券窑洞院', ['双孔拱门夯土窑洞', '三孔窑洞石碾农家院'], (alt) => ({
    heightM: 4.8,
    widthM: alt ? 10.6 : 8.2,
    depthM: 5.4,
    parts: [
      box([0, 2.25, -0.35], [alt ? 10.6 : 8.2, 4.5, 4.4], 'wood'),
      box([0, 2.25, 1.88], [alt ? 10.4 : 8.0, 4.4, 0.28], 'concrete'),
      box([-2.0, 1.45, 2.02], [1.85, 2.5, 0.12], 'dark'),
      box([2.0, 1.45, 2.02], [1.85, 2.5, 0.12], 'dark'),
      torus([-2.0, 2.55, 2.02], 0.92, 0.14, 16, 'concrete'),
      torus([2.0, 2.55, 2.02], 0.92, 0.14, 16, 'concrete'),
      ...(alt ? [box([0, 1.45, 2.02], [1.55, 2.5, 0.12], 'trunk')] : []),
    ],
  })),

  ...makePair('era_greenhouse', '田园阳光玻璃花房育苗温室', ['拱顶玻璃园艺花房', '双排育苗架大棚'], (alt) => ({
    heightM: 3.6,
    widthM: 5.2,
    depthM: 7.4,
    parts: [
      box([0, 0.35, 0], [5.1, 0.7, 7.2], 'trunk'),
      box([0, 1.45, 0], [4.9, 1.6, 7.0], 'water'),
      cyl([0, 2.25, 0], 2.46, 2.46, 7.0, 'water', [Math.PI / 2, 0, 0]),
      box([0, 1.18, 3.55], [1.18, 2.15, 0.12], 'default'),
      ...[-3.4, -1.7, 0, 1.7, 3.4].map((z) =>
        torus([0, 2.25, z], 2.48, 0.045, 18, 'dark')
      ),
      ...(alt
        ? [
            box([-1.35, 0.45, 0], [1.15, 0.42, 5.6], 'foliage'),
            box([1.35, 0.45, 0], [1.15, 0.42, 5.6], 'foliage'),
          ]
        : []),
    ],
  })),

  ...makePair('era_tibetan_house', '高原梯形夯土平顶藏式碉房', ['二层白墙黑窗框藏居', '屋顶立柱经幡碉房'], (alt) => ({
    heightM: 6.4,
    widthM: 7.6,
    depthM: 6.6,
    parts: [
      box([0, 0.25, 0], [7.8, 0.5, 6.8], 'rock'),
      box([0, 3.0, 0], [7.1, 5.1, 6.1], 'default'),
      box([0, 5.75, 0], [7.35, 0.52, 6.35], 'trunk'),
      box([0, 1.35, 3.08], [1.45, 2.25, 0.12], 'dark'),
      box([-2.1, 3.95, 3.08], [1.35, 1.25, 0.14], 'dark'),
      box([2.1, 3.95, 3.08], [1.35, 1.25, 0.14], 'dark'),
      box([-2.1, 3.95, 3.12], [0.95, 0.9, 0.08], 'water'),
      box([2.1, 3.95, 3.12], [0.95, 0.9, 0.08], 'water'),
      ...(alt
        ? [
            cyl([-3.2, 6.8, -2.7], 0.05, 0.06, 1.8, 'wood'),
            cyl([3.2, 6.8, -2.7], 0.05, 0.06, 1.8, 'wood'),
            box([0, 7.1, -2.7], [6.4, 0.18, 0.04], 'accent'),
          ]
        : []),
    ],
  })),

  ...makePair('era_ranger_watchtower', '荒野森林木架高脚瞭望塔屋', ['四腿架空护林瞭望塔', '带楼梯环廊哨塔屋'], (alt) => ({
    heightM: 8.8,
    widthM: 4.8,
    depthM: 4.8,
    parts: [
      cyl([-1.4, 2.6, -1.4], 0.14, 0.22, 5.2, 'trunk', [-0.08, 0, -0.08]),
      cyl([1.4, 2.6, -1.4], 0.14, 0.22, 5.2, 'trunk', [-0.08, 0, 0.08]),
      cyl([-1.4, 2.6, 1.4], 0.14, 0.22, 5.2, 'trunk', [0.08, 0, -0.08]),
      cyl([1.4, 2.6, 1.4], 0.14, 0.22, 5.2, 'trunk', [0.08, 0, 0.08]),
      box([0, 5.15, 0], [4.4, 0.24, 4.4], 'wood'),
      box([0, 5.65, 2.15], [4.4, 0.78, 0.1], 'trunk'),
      box([0, 6.3, 0], [2.95, 2.1, 2.95], 'wood'),
      box([0, 6.55, 0], [3.02, 0.88, 3.02], 'water'),
      cone([0, 7.95, 0], 2.55, 1.45, 4, 'dark', [0, Math.PI / 4, 0]),
      ...(alt ? [ramp([0, 2.5, 2.6], [0.95, 2.6, 2.8], 'trunk')] : []),
    ],
  })),
];

const RICH_DOORWAYS: AssetVariantSpec[] = [
  ...makePair('era_castle_portcullis', '中世纪城堡吊桥铁栅大门', ['升降铁栅拱门洞', '木吊桥放下通行款'], (alt) => ({
    heightM: 4.8,
    widthM: 4.8,
    depthM: 1.8,
    parts: [
      box([-1.85, 2.2, 0], [1.1, 4.4, 1.5], 'rock'),
      box([1.85, 2.2, 0], [1.1, 4.4, 1.5], 'rock'),
      box([0, 4.15, 0], [4.9, 1.1, 1.55], 'concrete'),
      ...[-0.9, -0.45, 0, 0.45, 0.9].map((x) =>
        cyl([x, alt ? 3.1 : 1.9, 0], 0.05, 0.05, 3.2, 'dark')
      ),
      ...(alt ? [box([0, 0.14, 1.75], [2.6, 0.22, 2.8], 'wood')] : []),
    ],
  })),
];

const RICH_PILLARS: AssetVariantSpec[] = [
  ...makePair('era_totem_pillar', '远古部落浮雕木石图腾柱', ['双翼展翅图腾柱', '发光神眼图腾石柱'], (alt) => ({
    heightM: 5.4,
    widthM: 2.4,
    depthM: 1.3,
    parts: [
      cyl([0, 0.25, 0], 0.62, 0.76, 0.5, 'rock'),
      cyl([0, 2.65, 0], 0.46, 0.54, 4.4, 'wood'),
      box([0, 3.9, 0], [2.35, 0.42, 0.22], 'accent', [0, 0, -0.1]),
      box([-0.24, 4.45, 0.44], [0.16, 0.16, 0.12], alt ? 'emissiveLamp' : 'dark'),
      box([0.24, 4.45, 0.44], [0.16, 0.16, 0.12], alt ? 'emissiveLamp' : 'dark'),
      cone([0, 5.15, 0], 0.42, 0.65, 6, 'accent'),
    ],
  })),
];

const RICH_ROADS: AssetVariantSpec[] = [
  ...makePair('era_rope_bridge', '峡谷探险悬崖木索吊桥', ['标准木板索道段', '挂灯笼夜行吊桥'], (alt) => ({
    heightM: 1.45,
    widthM: 3.0,
    depthM: 8.0,
    parts: [
      ...[-3.2, -2.0, -0.8, 0.4, 1.6, 2.8].map((z) =>
        box([0, 0.18, z], [2.2, 0.1, 0.82], 'wood')
      ),
      box([-1.15, 0.92, 0], [0.07, 0.07, 7.6], 'trunk'),
      box([1.15, 0.92, 0], [0.07, 0.07, 7.6], 'trunk'),
      ...[-3.5, 0, 3.5].map((z) => cyl([-1.15, 0.58, z], 0.08, 0.09, 1.15, 'wood')),
      ...[-3.5, 0, 3.5].map((z) => cyl([1.15, 0.58, z], 0.08, 0.09, 1.15, 'wood')),
      ...(alt ? [cyl([-1.15, 1.25, 0], 0.12, 0.12, 0.24, 'emissiveLamp')] : []),
    ],
  })),

  ...makePair('era_maglev_rail', '未来科幻高架磁悬浮光轨', ['流线单梁磁浮轨道', '双侧发光引导光带款'], (alt) => ({
    heightM: 1.4,
    widthM: 4.4,
    depthM: 8.0,
    parts: [
      box([0, 0.35, 0], [3.6, 0.42, 8.0], 'dark'),
      box([-1.55, 0.66, 0], [0.22, 0.36, 8.0], 'emissiveLamp'),
      box([1.55, 0.66, 0], [0.22, 0.36, 8.0], 'emissiveLamp'),
      box([0, 0.62, 0], [0.65, 0.18, 8.0], 'water'),
      ...(alt ? [cyl([0, 0.2, -3.0], 0.55, 0.65, 0.5, 'concrete')] : []),
    ],
  })),
];

const RICH_FLOORS: AssetVariantSpec[] = [
  ...makePair('era_bagua_arena', '武侠八卦太极演武石台', ['八角汉白玉演武场', '四立柱旗幡比武台'], (alt) => ({
    heightM: 1.35,
    widthM: 8.0,
    depthM: 8.0,
    parts: [
      cyl([0, 0.35, 0], 3.85, 4.1, 0.7, 'rock'),
      cyl([0, 0.74, 0], 3.4, 3.4, 0.08, 'default'),
      cyl([0, 0.79, 0], 1.65, 1.65, 0.04, 'dark'),
      ...(alt
        ? [
            cyl([-2.8, 2.0, -2.8], 0.1, 0.12, 2.8, 'trunk'),
            cyl([2.8, 2.0, -2.8], 0.1, 0.12, 2.8, 'trunk'),
            cyl([-2.8, 2.0, 2.8], 0.1, 0.12, 2.8, 'trunk'),
            cyl([2.8, 2.0, 2.8], 0.1, 0.12, 2.8, 'trunk'),
          ]
        : []),
    ],
  })),
];

export const RICH_ERAS_INVENTORY_BY_TYPE: Partial<Record<PropType, AssetVariantSpec[]>> = {
  scene_prop: RICH_SCENE_PROPS,
  vehicle: RICH_VEHICLES,
  tree: RICH_TREES,
  rock: RICH_ROCKS,
  lamp: RICH_LAMPS,
  barrier: RICH_BARRIERS,
  crate: RICH_CRATES,
  table: RICH_TABLES,
  furniture: RICH_FURNITURE,
  facility: RICH_FACILITIES,
  building: RICH_BUILDINGS,
  doorway: RICH_DOORWAYS,
  pillar: RICH_PILLARS,
  road: RICH_ROADS,
  floor: RICH_FLOORS,
};
