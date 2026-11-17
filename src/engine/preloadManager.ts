import {
  ASSET_INVENTORY_BY_TYPE,
  ASSET_ITEM_GROUPS_BY_TYPE,
  CHARACTER_VARIANTS,
  getTotalAssetVariantCount,
} from '../data/assetInventory';
import { getChannelMaterialPool } from './channelMaterials';
import { warmAssetVariantThumb } from '../components/ui/AssetVariantThumb';
import { getGroundY, SCULPT_GRID_DEFAULT } from './terrain';
import { useStudioStore } from '../store/useStudioStore';

export interface PreloadProgressState {
  progress: number; // 0..100
  stageTitle: string;
  stageDetail: string;
  warmedVariants: number;
  totalVariants: number;
  materialsReady: boolean;
  viewportReady: boolean;
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 16);
    }
  });

/**
 * Progressively pre-warms asset inventories, isometric thumbnail caches,
 * terrain heightfield sampling, and Three.js PBR/channel materials so entering
 * the 3D studio and opening Asset drawers stays silky-smooth without frame spikes.
 */
export async function runAssetAndEnginePreload(
  onProgress: (patch: Partial<PreloadProgressState>) => void
): Promise<void> {
  const isEn = useStudioStore.getState().language === 'en';
  const categoryEntries = Object.values(ASSET_INVENTORY_BY_TYPE);
  const allSpecs = [...categoryEntries.flat(), ...CHARACTER_VARIANTS];
  const total = Math.max(getTotalAssetVariantCount(), allSpecs.length);

  onProgress({
    progress: 14,
    stageTitle: isEn
      ? 'Preloading Asset Inventory & 3D Thumbnail Cache'
      : '预加载全量白模资产库与 3D 缩略图缓存',
    stageDetail: isEn
      ? `Indexing ${Object.keys(ASSET_ITEM_GROUPS_BY_TYPE).length} categories (${total} variants)...`
      : `正在索引 ${Object.keys(ASSET_ITEM_GROUPS_BY_TYPE).length} 大分类共 ${total} 个资产变体...`,
    warmedVariants: 0,
    totalVariants: total,
  });
  await nextFrame();

  // Warm isometric thumbnail projections in frame-friendly chunks
  const batchSize = 36;
  for (let i = 0; i < allSpecs.length; i += batchSize) {
    const end = Math.min(allSpecs.length, i + batchSize);
    for (let j = i; j < end; j++) {
      warmAssetVariantThumb(allSpecs[j].parts);
    }
    const frac = end / Math.max(1, allSpecs.length);
    onProgress({
      progress: Math.round(14 + frac * 42),
      stageTitle: isEn
        ? 'Preloading Asset Inventory & 3D Thumbnail Cache'
        : '预加载全量白模资产库与 3D 缩略图缓存',
      stageDetail: isEn
        ? `Warmed isometric thumbnails ${end} / ${allSpecs.length}`
        : `已预热等轴测缩略图缓存 ${end} / ${allSpecs.length}`,
      warmedVariants: end,
      totalVariants: allSpecs.length,
    });
    await nextFrame();
  }

  onProgress({
    progress: 62,
    stageTitle: isEn
      ? 'Warming Terrain Heightfield & Multi-Pass Shaders'
      : '预热地形高度场与 PBR 多通道材质池',
    stageDetail: isEn
      ? 'Initializing Color / Clay / Depth / Normal / Wireframe passes...'
      : '正在初始化 Color / Clay / Depth / Normal / Wireframe 着色材质...',
  });
  await nextFrame();

  // Pre-create Three.js materials & sample default terrain grid
  getChannelMaterialPool();
  for (let gx = -80; gx <= 80; gx += 40) {
    for (let gz = -80; gz <= 80; gz += 40) {
      getGroundY(
        gx,
        gz,
        {
          theme: 'urban_flat',
          relief: 0,
          hasWaterChannel: false,
          sculptGridRes: SCULPT_GRID_DEFAULT,
        },
        { pattern: 'none', width: 12 }
      );
    }
  }

  onProgress({
    progress: 76,
    stageTitle: isEn
      ? 'Mounting 3D Viewport & Compiling WebGL Pipeline'
      : '挂载 3D 视口并预编译 WebGL 着色器管线',
    stageDetail: isEn
      ? 'Warming shadows, ambient occlusion & first-frame pipeline...'
      : '正在预热光影投射、环境光遮蔽与首帧渲染管线...',
    materialsReady: true,
  });
  await nextFrame();
}
