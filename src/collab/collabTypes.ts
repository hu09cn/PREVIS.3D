import type { Vec3, WorldState } from '../types/scene';

export type CollabMode = 'cloud' | 'local_ws' | 'local_tab';

export type CollabConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type ArrayWorldCollection =
  | 'assets'
  | 'characters'
  | 'buildings'
  | 'scatteredProps'
  | 'customModels'
  | 'gltfModels'
  | 'paintedRoads'
  | 'paintedFences';

export type ObjectWorldField =
  | 'road'
  | 'heroCompound'
  | 'districts'
  | 'environment'
  | 'lastWorldPlan';

export type WorldSyncOp =
  | {
      op: 'upsert_items';
      collection: ArrayWorldCollection;
      items: Array<Record<string, unknown> & { id: string }>;
    }
  | {
      op: 'delete_items';
      collection: ArrayWorldCollection;
      ids: string[];
    }
  | {
      op: 'set_terrain_meta';
      patch: Partial<WorldState['terrain']>;
    }
  | {
      op: 'patch_terrain_grid';
      sculptGridRes?: number;
      sculptChanges?: [number, number][];
      materialChanges?: [number, number][];
    }
  | {
      op: 'set_field';
      field: ObjectWorldField;
      value: unknown;
    };

export interface DragTransformPreview {
  objectId: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface PeerAwareness {
  clientId: string;
  name: string;
  color: string;
  selectedId: string | null;
  isDragging: boolean;
  dragTransform: DragTransformPreview | null;
  cameraPos: Vec3;
  cameraTarget: Vec3;
  updatedAt: number;
}

export interface CollabActivityItem {
  id: string;
  time: number;
  text: string;
  color: string;
}

export interface DiscoveredRoom {
  roomId: string;
  onlineCount: number;
  peerNames: string[];
  revision: number;
  updatedAt: number;
  objectCount: number;
  terrainTheme?: string;
}

export interface CollabChatMessage {
  id: string;
  roomId: string;
  clientId: string;
  senderName: string;
  color: string;
  text: string;
  timestamp: number;
  kind?: 'text' | 'location';
  cameraPos?: Vec3;
  cameraTarget?: Vec3;
}

export const PEER_PALETTE = [
  '#0ea5e9',
  '#8b5cf6',
  '#f43f5e',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#6366f1',
];

export function pickPeerColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PEER_PALETTE[hash % PEER_PALETTE.length];
}

export function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function getDefaultCloudWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://127.0.0.1:3001/ws';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export function getDefaultLocalWsUrl(): string {
  if (typeof window === 'undefined' || !window.location.host) {
    return 'ws://127.0.0.1:3001/ws';
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const port = window.location.port;
  if (port === '3001' || port === '5180' || port === '5173') {
    return `${proto}//${window.location.host}/ws`;
  }
  const host = window.location.hostname || '127.0.0.1';
  return `ws://${host}:3001/ws`;
}
