import { getVariantSpec } from '../data/assetInventory';
import { getGroundY, getTerrainHalf, getWildcardRecipe } from './terrain';
import type {
  RoadConfig,
  SceneAsset,
  TerrainConfig,
  TerrainTheme,
} from '../types/scene';

export const TEMPLATE_PROP_ID_PREFIX = 'tpl_prop_';

interface BiomePaletteRule {
  count: number;
  spreadRadius: number;
  trees: string[];
  rocks: string[];
  treeRatio: number; // 0..1
  minY: number;
  maxY: number;
  maxSlope: number;
}

const BIOME_RULES: Partial<Record<TerrainTheme, BiomePaletteRule>> = {
  meadow: {
    count: 96,
    spreadRadius: 320,
    trees: ['weeping_willow', 'birch', 'oak', 'oval_crown', 'shrub_cluster'],
    rocks: ['boulder_cluster', 'stepping_flat'],
    treeRatio: 0.72,
    minY: -0.25,
    maxY: 7,
    maxSlope: 0.45,
  },
  hills: {
    count: 110,
    spreadRadius: 340,
    trees: ['round_crown', 'oval_crown', 'oak', 'umbrella_pine', 'shrub_cluster'],
    rocks: ['boulder_cluster', 'rubble_pile', 'stepping_flat'],
    treeRatio: 0.7,
    minY: -0.2,
    maxY: 18,
    maxSlope: 0.54,
  },
  mountains: {
    count: 120,
    spreadRadius: 360,
    trees: ['conifer_tower', 'cedar', 'redwood', 'cypress_column', 'umbrella_pine'],
    rocks: ['cliff_slab', 'boulder_cluster', 'cracked_monolith', 'rubble_pile'],
    treeRatio: 0.62,
    minY: -0.2,
    maxY: 22,
    maxSlope: 0.62,
  },
  alpine_peaks: {
    count: 108,
    spreadRadius: 360,
    trees: ['conifer_tower', 'cedar', 'dead_tree'],
    rocks: ['spire_peak', 'cliff_slab', 'cracked_monolith', 'rubble_pile'],
    treeRatio: 0.45,
    minY: -0.2,
    maxY: 20,
    maxSlope: 0.68,
  },
  plateau: {
    count: 96,
    spreadRadius: 340,
    trees: ['umbrella_pine', 'shrub_cluster', 'dead_tree', 'cypress_column'],
    rocks: ['cliff_slab', 'arch_rock', 'cracked_monolith', 'boulder_cluster'],
    treeRatio: 0.45,
    minY: -0.1,
    maxY: 32,
    maxSlope: 0.46,
  },
  lone_island: {
    count: 34,
    spreadRadius: 60,
    trees: ['palm', 'banyan', 'shrub_cluster', 'umbrella_pine'],
    rocks: ['boulder_cluster', 'stepping_flat', 'cliff_slab'],
    treeRatio: 0.68,
    minY: -0.25,
    maxY: 12,
    maxSlope: 0.55,
  },
  archipelago: {
    count: 120,
    spreadRadius: 340,
    trees: ['palm', 'umbrella_pine', 'banyan', 'shrub_cluster'],
    rocks: ['boulder_cluster', 'cliff_slab', 'stepping_flat'],
    treeRatio: 0.68,
    minY: -0.25,
    maxY: 14,
    maxSlope: 0.55,
  },
  canyon_valley: {
    count: 96,
    spreadRadius: 340,
    trees: ['weeping_willow', 'poplar', 'shrub_cluster', 'umbrella_pine'],
    rocks: ['arch_rock', 'cliff_slab', 'cracked_monolith', 'rubble_pile'],
    treeRatio: 0.5,
    minY: -0.35,
    maxY: 14,
    maxSlope: 0.46,
  },
  coastal_bay: {
    count: 90,
    spreadRadius: 320,
    trees: ['palm', 'umbrella_pine', 'shrub_cluster', 'banyan'],
    rocks: ['boulder_cluster', 'stepping_flat', 'cliff_slab'],
    treeRatio: 0.65,
    minY: -0.3,
    maxY: 14,
    maxSlope: 0.5,
  },
  coastal_canal: {
    count: 84,
    spreadRadius: 320,
    trees: ['weeping_willow', 'palm', 'shrub_cluster', 'oval_crown'],
    rocks: ['boulder_cluster', 'stepping_flat'],
    treeRatio: 0.72,
    minY: -0.25,
    maxY: 10,
    maxSlope: 0.5,
  },
  hillside_district: {
    count: 90,
    spreadRadius: 330,
    trees: ['round_crown', 'oak', 'conifer_tower', 'shrub_cluster'],
    rocks: ['boulder_cluster', 'cliff_slab'],
    treeRatio: 0.7,
    minY: -0.2,
    maxY: 14,
    maxSlope: 0.52,
  },
  industrial_valley: {
    count: 72,
    spreadRadius: 330,
    trees: ['dead_tree', 'shrub_cluster', 'poplar'],
    rocks: ['rubble_pile', 'cliff_slab', 'boulder_cluster'],
    treeRatio: 0.45,
    minY: -0.2,
    maxY: 12,
    maxSlope: 0.55,
  },
};

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Generates biome-matched trees & rocks seated on top of the selected terrain template.
 */
export function buildTerrainTemplateProps(
  theme: TerrainTheme,
  terrain: TerrainConfig,
  road: RoadConfig
): SceneAsset[] {
  let rule = BIOME_RULES[theme];
  if (!rule && theme === 'wildcard') {
    const wc = getWildcardRecipe(terrain.seed);
    switch (wc.biome) {
      case 'alpine_snow':
      case 'nordic_fjord':
        rule = {
          count: 112,
          spreadRadius: 360,
          trees: ['conifer_tower', 'cedar', 'redwood', 'dead_tree'],
          rocks: ['spire_peak', 'cliff_slab', 'cracked_monolith', 'boulder_cluster'],
          treeRatio: 0.56,
          minY: -0.2,
          maxY: 22,
          maxSlope: 0.65,
        };
        break;
      case 'tropical_atoll':
        rule = {
          count: 96,
          spreadRadius: 340,
          trees: ['palm', 'banyan', 'shrub_cluster', 'umbrella_pine'],
          rocks: ['boulder_cluster', 'stepping_flat', 'cliff_slab'],
          treeRatio: 0.72,
          minY: -0.25,
          maxY: 16,
          maxSlope: 0.54,
        };
        break;
      case 'red_canyon':
      case 'golden_steppe':
        rule = {
          count: 88,
          spreadRadius: 340,
          trees: ['umbrella_pine', 'dead_tree', 'shrub_cluster', 'poplar'],
          rocks: ['arch_rock', 'cliff_slab', 'cracked_monolith', 'rubble_pile'],
          treeRatio: 0.42,
          minY: -0.2,
          maxY: 28,
          maxSlope: 0.52,
        };
        break;
      case 'volcanic_basalt':
        rule = {
          count: 78,
          spreadRadius: 340,
          trees: ['dead_tree', 'shrub_cluster', 'conifer_tower'],
          rocks: ['cracked_monolith', 'spire_peak', 'rubble_pile', 'cliff_slab'],
          treeRatio: 0.34,
          minY: -0.2,
          maxY: 24,
          maxSlope: 0.62,
        };
        break;
      case 'karst_mist':
      case 'emerald_valley':
      default:
        rule = {
          count: 112,
          spreadRadius: 350,
          trees: ['weeping_willow', 'oak', 'birch', 'umbrella_pine', 'shrub_cluster'],
          rocks: ['spire_peak', 'boulder_cluster', 'cliff_slab', 'stepping_flat'],
          treeRatio: 0.68,
          minY: -0.25,
          maxY: 22,
          maxSlope: 0.58,
        };
        break;
    }
  }
  if (!rule) return [];

  const worldHalf = getTerrainHalf(terrain);
  const effectiveRadius = Math.max(12, Math.min(rule.spreadRadius, worldHalf - 6));
  const radiusRatio = Math.max(0.12, Math.min(1.8, effectiveRadius / Math.max(1, rule.spreadRadius)));
  const targetCount = Math.max(
    8,
    Math.round(rule.count * Math.pow(radiusRatio, 1.2))
  );

  const stamp = Date.now().toString(36);
  const rand = makeRng(Date.now() ^ theme.length * 9973);
  const items: SceneAsset[] = [];

  let attempts = 0;
  const maxAttempts = targetCount * 14;

  while (items.length < targetCount && attempts < maxAttempts) {
    attempts++;
    const angle = rand() * Math.PI * 2;
    const radial = Math.sqrt(rand()) * effectiveRadius;
    const x = Number((Math.cos(angle) * radial).toFixed(2));
    const z = Number((Math.sin(angle) * radial).toFixed(2));

    // Keep immediate foreground camera position uncluttered
    if (Math.hypot(x, z - 20) < 6.5) continue;

    // Maintain clear spacing from already placed template props
    if (items.some((it) => Math.hypot(it.position[0] - x, it.position[2] - z) < 4.5)) {
      continue;
    }

    const gy = getGroundY(x, z, terrain, road);
    const gxSlope = Math.abs(
      getGroundY(x + 1.5, z, terrain, road) - getGroundY(x - 1.5, z, terrain, road)
    ) / 3;
    const gzSlope = Math.abs(
      getGroundY(x, z + 1.5, terrain, road) - getGroundY(x, z - 1.5, terrain, road)
    ) / 3;
    const slope = Math.max(gxSlope, gzSlope);

    const pickTree = rule.trees.length > 0 && rand() < rule.treeRatio;
    const propType: 'tree' | 'rock' = pickTree ? 'tree' : 'rock';

    if (pickTree) {
      if (gy < rule.minY || gy > rule.maxY || slope > rule.maxSlope) continue;
    } else {
      if (gy < rule.minY - 0.1 || slope > rule.maxSlope + 0.12) continue;
    }

    const pool = pickTree ? rule.trees : rule.rocks;
    if (pool.length === 0) continue;
    const variantId = pool[Math.floor(rand() * pool.length)];
    const spec = getVariantSpec(propType, variantId);

    const baseScale = pickTree
      ? 0.8 + rand() * 0.55
      : 0.78 + rand() * 0.75;

    const placeY = gy;

    items.push({
      id: `${TEMPLATE_PROP_ID_PREFIX}${theme}_${items.length}_${stamp}`,
      kind: 'asset',
      type: propType,
      variantId,
      name: spec.label,
      position: [x, Number(placeY.toFixed(2)), z],
      rotation: [0, Number((rand() * Math.PI * 2).toFixed(2)), 0],
      scale: [
        Number(baseScale.toFixed(2)),
        Number((baseScale * (0.9 + rand() * 0.2)).toFixed(2)),
        Number(baseScale.toFixed(2)),
      ],
      visible: true,
      locked: false,
    });
  }

  return items;
}
