import { create } from 'zustand';
import {
  type CollabActivityItem,
  type CollabChatMessage,
  type CollabConnectionStatus,
  type CollabMode,
  type DiscoveredRoom,
  type DragTransformPreview,
  type PeerAwareness,
  generateRoomCode,
  getDefaultCloudWsUrl,
  getDefaultLocalWsUrl,
  pickPeerColor,
} from '../collab/collabTypes';

const NICKNAME_STORAGE_KEY = 'previs_collab_nickname_v1';
const CLIENT_ID_STORAGE_KEY = 'previs_collab_client_id_v1';
const CLOUD_URL_STORAGE_KEY = 'previs_collab_cloud_url_v1';
const LOCAL_URL_STORAGE_KEY = 'previs_collab_local_url_v1';

function loadOrCreateClientId(): string {
  try {
    const existing = sessionStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing) return existing;
    const next = `u_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, next);
    return next;
  } catch {
    return `u_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function loadNickname(clientId: string): string {
  try {
    const saved = localStorage.getItem(NICKNAME_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore
  }
  const savedLang = typeof window !== 'undefined' ? window.localStorage.getItem('previs_lang_v1') : null;
  const prefix = savedLang === 'en' ? 'Director' : '导演';
  return `${prefix}-${clientId.slice(-4).toUpperCase()}`;
}

function loadSavedUrl(key: string, fallback: string): string {
  try {
    const saved = localStorage.getItem(key);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore
  }
  return fallback;
}

export interface CollabState {
  panelOpen: boolean;
  mode: CollabMode;
  roomId: string;
  cloudWsUrl: string;
  localWsUrl: string;
  clientId: string;
  nickname: string;
  color: string;
  status: CollabConnectionStatus;
  errorMsg: string | null;
  revision: number;
  peers: PeerAwareness[];
  remoteDragPreviews: Record<string, DragTransformPreview & { clientId: string; name: string; color: string }>;
  activities: CollabActivityItem[];
  discoveredRooms: DiscoveredRoom[];
  isScanningRooms: boolean;
  scanError: string | null;
  chatOpen: boolean;
  chatMessages: CollabChatMessage[];
  unreadChatCount: number;

  setPanelOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  appendChatMessage: (msg: CollabChatMessage, isMine?: boolean) => void;
  setMode: (mode: CollabMode) => void;
  setRoomId: (roomId: string) => void;
  setNickname: (nickname: string) => void;
  setCloudWsUrl: (url: string) => void;
  setLocalWsUrl: (url: string) => void;
  pushActivity: (text: string, color?: string) => void;
}

const initialClientId = loadOrCreateClientId();

export const useCollabStore = create<CollabState>((set) => ({
  panelOpen: false,
  mode: 'cloud',
  roomId: generateRoomCode(),
  cloudWsUrl: loadSavedUrl(CLOUD_URL_STORAGE_KEY, getDefaultCloudWsUrl()),
  localWsUrl: loadSavedUrl(LOCAL_URL_STORAGE_KEY, getDefaultLocalWsUrl()),
  clientId: initialClientId,
  nickname: loadNickname(initialClientId),
  color: pickPeerColor(initialClientId),
  status: 'disconnected',
  errorMsg: null,
  revision: 0,
  peers: [],
  remoteDragPreviews: {},
  activities: [],
  discoveredRooms: [],
  isScanningRooms: false,
  scanError: null,
  chatOpen: false,
  chatMessages: [],
  unreadChatCount: 0,

  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setChatOpen: (chatOpen) =>
    set((s) => ({
      chatOpen,
      unreadChatCount: chatOpen ? 0 : s.unreadChatCount,
    })),
  appendChatMessage: (msg, isMine = false) =>
    set((s) => {
      if (s.chatMessages.some((m) => m.id === msg.id)) return s;
      return {
        chatMessages: [...s.chatMessages, msg].slice(-150),
        unreadChatCount:
          !isMine && !s.chatOpen ? s.unreadChatCount + 1 : s.unreadChatCount,
      };
    }),
  setMode: (mode) => set({ mode, errorMsg: null }),
  setRoomId: (roomId) =>
    set({ roomId: roomId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) }),
  setNickname: (nickname) => {
    const clean = nickname.slice(0, 24);
    try {
      localStorage.setItem(NICKNAME_STORAGE_KEY, clean);
    } catch {
      // ignore
    }
    set({ nickname: clean });
  },
  setCloudWsUrl: (cloudWsUrl) => {
    try {
      localStorage.setItem(CLOUD_URL_STORAGE_KEY, cloudWsUrl);
    } catch {
      // ignore
    }
    set({ cloudWsUrl });
  },
  setLocalWsUrl: (localWsUrl) => {
    try {
      localStorage.setItem(LOCAL_URL_STORAGE_KEY, localWsUrl);
    } catch {
      // ignore
    }
    set({ localWsUrl });
  },
  pushActivity: (text, color = '#0ea5e9') =>
    set((s) => ({
      activities: [
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          time: Date.now(),
          text,
          color,
        },
        ...s.activities,
      ].slice(0, 18),
    })),
}));
