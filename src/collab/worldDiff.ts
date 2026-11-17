import { SCULPT_GRID_DEFAULT } from '../engine/terrain';
import type { TerrainConfig, WorldState } from '../types/scene';
import type {
  ArrayWorldCollection,
  ObjectWorldField,
  WorldSyncOp,
} from './collabTypes';

const ARRAY_COLLECTIONS: ArrayWorldCollection[] = [
  'assets',
  'characters',
  'buildings',
  'scatteredProps',
  'customModels',
  'gltfModels',
  'paintedRoads',
  'paintedFences',
];

const OBJECT_FIELDS: ObjectWorldField[] = [
  'road',
  'heroCompound',
  'districts',
  'environment',
  'lastWorldPlan',
];

function diffEntityArray<T extends { id: string }>(
  collection: ArrayWorldCollection,
  prevArr: T[] | undefined,
  nextArr: T[] | undefined
): WorldSyncOp[] {
  if (prevArr === nextArr) return [];
  const prevList = prevArr ?? [];
  const nextList = nextArr ?? [];

  const prevMap = new Map<string, T>();
  for (const item of prevList) {
    if (item && item.id) prevMap.set(item.id, item);
  }

  const nextIds = new Set<string>();
  const upserts: Array<Record<string, unknown> & { id: string }> = [];
  for (const item of nextList) {
    if (!item || !item.id) continue;
    nextIds.add(item.id);
    const oldItem = prevMap.get(item.id);
    if (oldItem !== item) {
      upserts.push(item as unknown as Record<string, unknown> & { id: string });
    }
  }

  const deletedIds: string[] = [];
  for (const item of prevList) {
    if (item && item.id && !nextIds.has(item.id)) {
      deletedIds.push(item.id);
    }
  }

  const ops: WorldSyncOp[] = [];
  if (deletedIds.length > 0) {
    ops.push({ op: 'delete_items', collection, ids: deletedIds });
  }
  if (upserts.length > 0) {
    ops.push({ op: 'upsert_items', collection, items: upserts });
  }
  return ops;
}

function diffNumberGrid(
  prevArr: number[] | undefined,
  nextArr: number[] | undefined
): [number, number][] {
  if (!nextArr || nextArr.length === 0) return [];
  const changes: [number, number][] = [];
  const len = nextArr.length;
  if (!prevArr || prevArr.length !== len) {
    for (let i = 0; i < len; i += 1) {
      const v = nextArr[i];
      if (v !== 0) changes.push([i, v]);
    }
    return changes;
  }
  for (let i = 0; i < len; i += 1) {
    const v = nextArr[i];
    if (v !== prevArr[i]) changes.push([i, v]);
  }
  return changes;
}

function diffTerrain(
  prevTerrain: TerrainConfig,
  nextTerrain: TerrainConfig
): WorldSyncOp[] {
  if (prevTerrain === nextTerrain) return [];
  const ops: WorldSyncOp[] = [];

  const metaPatch: Partial<TerrainConfig> = {};
  let hasMeta = false;
  if (prevTerrain.theme !== nextTerrain.theme) {
    metaPatch.theme = nextTerrain.theme;
    hasMeta = true;
  }
  if (prevTerrain.relief !== nextTerrain.relief) {
    metaPatch.relief = nextTerrain.relief;
    hasMeta = true;
  }
  if (prevTerrain.hasWaterChannel !== nextTerrain.hasWaterChannel) {
    metaPatch.hasWaterChannel = nextTerrain.hasWaterChannel;
    hasMeta = true;
  }
  if (prevTerrain.mapSize !== nextTerrain.mapSize) {
    metaPatch.mapSize = nextTerrain.mapSize;
    hasMeta = true;
  }
  if (prevTerrain.seed !== nextTerrain.seed) {
    metaPatch.seed = nextTerrain.seed;
    hasMeta = true;
  }
  if (prevTerrain.sculptGridRes !== nextTerrain.sculptGridRes) {
    metaPatch.sculptGridRes = nextTerrain.sculptGridRes;
    hasMeta = true;
  }
  if (prevTerrain.sculptDeltas && !nextTerrain.sculptDeltas) {
    metaPatch.sculptDeltas = undefined;
    hasMeta = true;
  }
  if (prevTerrain.paintMaterials && !nextTerrain.paintMaterials) {
    metaPatch.paintMaterials = undefined;
    hasMeta = true;
  }

  if (hasMeta) {
    ops.push({ op: 'set_terrain_meta', patch: metaPatch });
  }

  const sculptChanges =
    prevTerrain.sculptDeltas !== nextTerrain.sculptDeltas
      ? diffNumberGrid(prevTerrain.sculptDeltas, nextTerrain.sculptDeltas)
      : [];
  const materialChanges =
    prevTerrain.paintMaterials !== nextTerrain.paintMaterials
      ? diffNumberGrid(prevTerrain.paintMaterials, nextTerrain.paintMaterials)
      : [];

  if (sculptChanges.length > 0 || materialChanges.length > 0) {
    ops.push({
      op: 'patch_terrain_grid',
      sculptGridRes: nextTerrain.sculptGridRes ?? prevTerrain.sculptGridRes ?? SCULPT_GRID_DEFAULT,
      sculptChanges: sculptChanges.length > 0 ? sculptChanges : undefined,
      materialChanges: materialChanges.length > 0 ? materialChanges : undefined,
    });
  }

  return ops;
}

/**
 * Compute granular operations transforming prev -> next for WorldState only.
 * Shots, camera keyframes, and local view settings are intentionally excluded.
 */
export function diffWorldState(prev: WorldState, next: WorldState): WorldSyncOp[] {
  if (prev === next) return [];
  const ops: WorldSyncOp[] = [];

  for (const col of ARRAY_COLLECTIONS) {
    const prevArr = prev[col] as Array<{ id: string }> | undefined;
    const nextArr = next[col] as Array<{ id: string }> | undefined;
    ops.push(...diffEntityArray(col, prevArr, nextArr));
  }

  ops.push(...diffTerrain(prev.terrain, next.terrain));

  for (const field of OBJECT_FIELDS) {
    if (prev[field] !== next[field]) {
      ops.push({ op: 'set_field', field, value: next[field] });
    }
  }

  return ops;
}

/**
 * Apply remote granular WorldSyncOps immutably to the current local WorldState.
 */
export function applyWorldSyncOps(
  current: WorldState,
  ops: WorldSyncOp[]
): WorldState {
  if (!ops || ops.length === 0) return current;
  const next: WorldState = { ...current };

  for (const op of ops) {
    if (op.op === 'upsert_items') {
      const prevArr = (next[op.collection] as Array<{ id: string }> | undefined) ?? [];
      const arr = [...prevArr];
      const idxMap = new Map<string, number>();
      arr.forEach((item, idx) => {
        if (item?.id) idxMap.set(item.id, idx);
      });
      for (const item of op.items) {
        if (!item?.id) continue;
        const existingIdx = idxMap.get(item.id);
        if (existingIdx !== undefined) {
          arr[existingIdx] = item as unknown as { id: string };
        } else {
          idxMap.set(item.id, arr.length);
          arr.push(item as unknown as { id: string });
        }
      }
      (next as unknown as Record<string, unknown>)[op.collection] = arr;
    } else if (op.op === 'delete_items') {
      const delSet = new Set(op.ids);
      const prevArr = (next[op.collection] as Array<{ id: string }> | undefined) ?? [];
      (next as unknown as Record<string, unknown>)[op.collection] = prevArr.filter(
        (item) => item && !delSet.has(item.id)
      );
    } else if (op.op === 'set_terrain_meta') {
      const merged: TerrainConfig = {
        ...next.terrain,
        ...op.patch,
      };
      if ('sculptDeltas' in op.patch && op.patch.sculptDeltas === undefined) {
        delete merged.sculptDeltas;
      }
      if ('paintMaterials' in op.patch && op.patch.paintMaterials === undefined) {
        delete merged.paintMaterials;
      }
      next.terrain = merged;
    } else if (op.op === 'patch_terrain_grid') {
      const res = op.sculptGridRes ?? next.terrain.sculptGridRes ?? SCULPT_GRID_DEFAULT;
      const total = (res + 1) * (res + 1);
      const prevTerrain: TerrainConfig = {
        ...next.terrain,
        sculptGridRes: res,
      };

      if (op.sculptChanges && op.sculptChanges.length > 0) {
        const deltas =
          prevTerrain.sculptDeltas && prevTerrain.sculptDeltas.length === total
            ? [...prevTerrain.sculptDeltas]
            : new Array<number>(total).fill(0);
        for (const [idx, val] of op.sculptChanges) {
          if (idx >= 0 && idx < total) deltas[idx] = val;
        }
        prevTerrain.sculptDeltas = deltas;
      }

      if (op.materialChanges && op.materialChanges.length > 0) {
        const mats =
          prevTerrain.paintMaterials && prevTerrain.paintMaterials.length === total
            ? [...prevTerrain.paintMaterials]
            : new Array<number>(total).fill(0);
        for (const [idx, val] of op.materialChanges) {
          if (idx >= 0 && idx < total) mats[idx] = val;
        }
        prevTerrain.paintMaterials = mats;
      }

      next.terrain = prevTerrain;
    } else if (op.op === 'set_field') {
      (next as unknown as Record<string, unknown>)[op.field] = op.value;
    }
  }

  return next;
}
