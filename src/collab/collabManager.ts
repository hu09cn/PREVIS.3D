import { useCollabStore } from '../store/useCollabStore';
import { useStudioStore } from '../store/useStudioStore';
import type { Vec3, WorldState } from '../types/scene';
import type {
  CollabChatMessage,
  CollabMode,
  DiscoveredRoom,
  DragTransformPreview,
  PeerAwareness,
  WorldSyncOp,
} from './collabTypes';
import { applyWorldSyncOps, diffWorldState } from './worldDiff';

interface WsServerMessage {
  type: 'joined' | 'sync_full' | 'world_ops' | 'peers_update' | 'awareness' | 'chat' | 'error';
  roomId?: string;
  clientId?: string;
  isHost?: boolean;
  revision?: number;
  world?: WorldState | null;
  peers?: PeerAwareness[];
  chatHistory?: CollabChatMessage[];
  message?: CollabChatMessage | string;
  ops?: WorldSyncOp[];
  senderId?: string;
  senderName?: string;
  state?: PeerAwareness;
}

interface TabChannelMessage {
  type: 'tab_hello' | 'tab_welcome' | 'tab_world_ops' | 'tab_replace_world' | 'tab_awareness' | 'tab_chat' | 'tab_bye';
  senderId: string;
  targetId?: string;
  senderName?: string;
  world?: WorldState;
  revision?: number;
  ops?: WorldSyncOp[];
  awareness?: PeerAwareness;
  chatHistory?: CollabChatMessage[];
  chatMessage?: CollabChatMessage;
}

class CollabManager {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private discoveryBc: BroadcastChannel | null = null;
  private shouldStayConnected = false;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;

  private studioUnsub: (() => void) | null = null;
  private suppressOutgoing = false;
  private lastProjectId: string | null = null;
  private lastSyncedWorld: WorldState | null = null;

  private pendingOps: WorldSyncOp[] = [];
  private flushTimer: number | null = null;

  private lastCameraSentAt = 0;
  private lastDragSentAt = 0;
  private localAwareness: Partial<PeerAwareness> = {
    selectedId: null,
    isDragging: false,
    dragTransform: null,
    cameraPos: [0, 8, 16],
    cameraTarget: [0, 1, 0],
  };

  private beforeUnloadBound = () => {
    this.notifyLeavingSync();
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.beforeUnloadBound);
    }
  }

  public initFromUrlIfPresent(): void {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      const mode = params.get('collab');
      const ws = params.get('ws');
      if (!room) return;

      const store = useCollabStore.getState();
      store.setRoomId(room);
      if (mode === 'cloud' || mode === 'local_ws' || mode === 'local_tab') {
        store.setMode(mode);
      }
      if (ws) {
        if (mode === 'local_ws') store.setLocalWsUrl(ws);
        else store.setCloudWsUrl(ws);
      }
      store.setPanelOpen(true);
    } catch {
      // ignore invalid URL params
    }
  }

  public joinRoom(): void {
    this.leaveRoom(false);

    const collab = useCollabStore.getState();
    const roomId = collab.roomId.trim() || 'default';
    if (roomId !== collab.roomId) collab.setRoomId(roomId);

    this.shouldStayConnected = true;
    this.reconnectAttempt = 0;
    this.ensureStudioSubscription();

    const activeProj = useStudioStore.getState().getActiveProject();
    this.lastProjectId = activeProj.id;
    this.lastSyncedWorld = activeProj.world;

    if (collab.mode === 'local_tab') {
      this.connectLocalTab(roomId);
    } else {
      const url = collab.mode === 'cloud' ? collab.cloudWsUrl.trim() : collab.localWsUrl.trim();
      this.connectWebSocket(url, roomId);
    }
  }

  public leaveRoom(notify = true): void {
    this.shouldStayConnected = false;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.flushTimer !== null) {
      window.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.pendingOps = [];

    if (notify) {
      this.notifyLeavingSync();
    }

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    if (this.bc) {
      try {
        this.bc.close();
      } catch {
        // ignore
      }
      this.bc = null;
    }

    if (this.discoveryBc) {
      try {
        this.discoveryBc.close();
      } catch {
        // ignore
      }
      this.discoveryBc = null;
    }

    if (this.studioUnsub) {
      this.studioUnsub();
      this.studioUnsub = null;
    }

    useCollabStore.setState({
      status: 'disconnected',
      errorMsg: null,
      peers: [],
      remoteDragPreviews: {},
      revision: 0,
      chatOpen: false,
      chatMessages: [],
      unreadChatCount: 0,
    });
  }

  public sendChatMessage(rawText: string, includeCameraLocation = false): void {
    const collab = useCollabStore.getState();
    if (collab.status !== 'connected') return;
    const text = rawText.trim().slice(0, 500);
    if (!text) return;

    const msg: CollabChatMessage = {
      id: `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      roomId: collab.roomId,
      clientId: collab.clientId,
      senderName: collab.nickname || collabTx('协作者', 'Collaborator'),
      color: collab.color,
      text,
      timestamp: Date.now(),
      kind: includeCameraLocation ? 'location' : 'text',
      cameraPos: includeCameraLocation
        ? (this.localAwareness.cameraPos ?? [14, 11, 28])
        : undefined,
      cameraTarget: includeCameraLocation
        ? (this.localAwareness.cameraTarget ?? [0, 1, 0])
        : undefined,
    };

    collab.appendChatMessage(msg, true);

    if (collab.mode === 'local_tab' && this.bc) {
      this.bc.postMessage({
        type: 'tab_chat',
        senderId: collab.clientId,
        chatMessage: msg,
      } satisfies TabChannelMessage);
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'chat',
          roomId: collab.roomId,
          clientId: collab.clientId,
          id: msg.id,
          text: msg.text,
          kind: msg.kind,
          cameraPos: msg.cameraPos,
          cameraTarget: msg.cameraTarget,
        })
      );
    }
  }

  public pushCurrentWorldToRoom(): void {
    const collab = useCollabStore.getState();
    if (collab.status !== 'connected') return;
    const world = useStudioStore.getState().getActiveProject().world;
    this.lastSyncedWorld = world;

    if (collab.mode === 'local_tab' && this.bc) {
      this.bc.postMessage({
        type: 'tab_replace_world',
        senderId: collab.clientId,
        senderName: collab.nickname,
        revision: collab.revision + 1,
        world,
      } satisfies TabChannelMessage);
      useCollabStore.setState((s) => ({ revision: s.revision + 1 }));
      collab.pushActivity(
        collabTx('你已将当前画布全量同步给房间成员', 'You pushed full stage snapshot to the room'),
        collab.color
      );
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'replace_world',
          roomId: collab.roomId,
          clientId: collab.clientId,
          world,
        })
      );
      collab.pushActivity(
        collabTx('你已将当前画布全量同步给房间成员', 'You pushed full stage snapshot to the room'),
        collab.color
      );
    }
  }

  public async scanRooms(): Promise<DiscoveredRoom[]> {
    const collab = useCollabStore.getState();
    useCollabStore.setState({ isScanningRooms: true, scanError: null });

    if (collab.mode === 'local_tab') {
      const rooms = await this.scanLocalTabRooms();
      useCollabStore.setState({
        discoveredRooms: rooms,
        isScanningRooms: false,
      });
      return rooms;
    }

    const wsUrl = (
      collab.mode === 'cloud' ? collab.cloudWsUrl : collab.localWsUrl
    ).trim();

    const httpUrl = toRoomsHttpUrl(wsUrl);
    if (!httpUrl) {
      useCollabStore.setState({
        discoveredRooms: [],
        isScanningRooms: false,
        scanError: collabTx('同步地址格式无效', 'Invalid sync URL format'),
      });
      return [];
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(httpUrl, {
        cache: 'no-store',
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { ok?: boolean; rooms?: DiscoveredRoom[] };
      const list = Array.isArray(data.rooms) ? data.rooms : [];
      useCollabStore.setState({
        discoveredRooms: list,
        isScanningRooms: false,
        scanError: null,
      });
      return list;
    } catch (err) {
      window.clearTimeout(timer);
      const hint =
        collab.mode === 'local_ws'
          ? collabTx(
              '未扫到局域网服务（请确认房主电脑已启动协同服务或防火墙已放行 3001）',
              'No LAN server found (ensure host started collab server & port 3001 is open)'
            )
          : collabTx(
              `房间扫描失败：${err instanceof Error ? err.message : String(err)}`,
              `Room scan failed: ${err instanceof Error ? err.message : String(err)}`
            );
      useCollabStore.setState({
        discoveredRooms: [],
        isScanningRooms: false,
        scanError: hint,
      });
      return [];
    }
  }

  public async clearHistoricalRooms(): Promise<{
    ok: boolean;
    clearedCount: number;
    error?: string;
  }> {
    const collab = useCollabStore.getState();

    if (collab.mode === 'local_tab') {
      const remaining = collab.discoveredRooms.filter((r) => r.onlineCount > 0);
      useCollabStore.setState({
        discoveredRooms: remaining,
        scanError: null,
      });
      return { ok: true, clearedCount: 0 };
    }

    const wsUrl = (
      collab.mode === 'cloud' ? collab.cloudWsUrl : collab.localWsUrl
    ).trim();
    const roomsUrl = toRoomsHttpUrl(wsUrl);
    if (!roomsUrl) {
      return { ok: false, clearedCount: 0, error: collabTx('同步地址格式无效', 'Invalid sync URL format') };
    }

    let clearUrl: string;
    try {
      const parsed = new URL(roomsUrl);
      parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/clear`;
      clearUrl = parsed.toString();
    } catch {
      return { ok: false, clearedCount: 0, error: collabTx('同步地址格式无效', 'Invalid sync URL format') };
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(clearUrl, {
        method: 'POST',
        cache: 'no-store',
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        ok?: boolean;
        clearedCount?: number;
        rooms?: DiscoveredRoom[];
      };
      const list = Array.isArray(data.rooms) ? data.rooms : [];
      useCollabStore.setState({
        discoveredRooms: list,
        scanError: null,
      });
      return {
        ok: true,
        clearedCount:
          typeof data.clearedCount === 'number' ? data.clearedCount : 0,
      };
    } catch (err) {
      window.clearTimeout(timer);
      return {
        ok: false,
        clearedCount: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private scanLocalTabRooms(): Promise<DiscoveredRoom[]> {
    if (typeof BroadcastChannel === 'undefined') {
      return Promise.resolve([]);
    }
    return new Promise((resolve) => {
      const found = new Map<string, DiscoveredRoom>();
      const ch = new BroadcastChannel('previs_collab_discovery_v1');
      const reqId = Math.random().toString(36).slice(2);

      ch.onmessage = (evt: MessageEvent<{
        type?: string;
        reqId?: string;
        room?: DiscoveredRoom;
      }>) => {
        const d = evt.data;
        if (!d || d.type !== 'discover_pong' || d.reqId !== reqId || !d.room) {
          return;
        }
        const prev = found.get(d.room.roomId);
        if (!prev || d.room.onlineCount >= prev.onlineCount) {
          found.set(d.room.roomId, d.room);
        }
      };

      ch.postMessage({ type: 'discover_ping', reqId });
      window.setTimeout(() => {
        try {
          ch.close();
        } catch {
          // ignore
        }
        resolve(
          Array.from(found.values()).sort(
            (a, b) => b.onlineCount - a.onlineCount
          )
        );
      }, 280);
    });
  }

  public joinSpecificRoom(roomId: string): void {
    useCollabStore.getState().setRoomId(roomId);
    this.joinRoom();
  }

  public buildInviteUrl(): string {
    if (typeof window === 'undefined') return '';
    const collab = useCollabStore.getState();
    const url = new URL(window.location.href);
    url.searchParams.set('room', collab.roomId);
    url.searchParams.set('collab', collab.mode);
    if (collab.mode === 'local_ws' && collab.localWsUrl) {
      url.searchParams.set('ws', collab.localWsUrl);
    }
    return url.toString();
  }

  public updateSelectedId(selectedId: string | null): void {
    if (this.localAwareness.selectedId === selectedId) return;
    this.localAwareness.selectedId = selectedId;
    if (!selectedId) {
      this.localAwareness.isDragging = false;
      this.localAwareness.dragTransform = null;
    }
    this.sendAwareness({
      selectedId,
      isDragging: this.localAwareness.isDragging,
      dragTransform: this.localAwareness.dragTransform,
    });
  }

  public updateDragState(
    isDragging: boolean,
    dragTransform: DragTransformPreview | null = null
  ): void {
    const now = performance.now();
    const changedBool = this.localAwareness.isDragging !== isDragging;
    if (isDragging && !changedBool && now - this.lastDragSentAt < 55) {
      return;
    }
    this.lastDragSentAt = now;
    this.localAwareness.isDragging = isDragging;
    this.localAwareness.dragTransform = dragTransform;
    this.sendAwareness({ isDragging, dragTransform });
  }

  public updateCameraPose(cameraPos: Vec3, cameraTarget: Vec3): void {
    const now = performance.now();
    if (now - this.lastCameraSentAt < 140) return;
    const prevP = this.localAwareness.cameraPos ?? [0, 0, 0];
    const prevT = this.localAwareness.cameraTarget ?? [0, 0, 0];
    const moved =
      Math.hypot(cameraPos[0] - prevP[0], cameraPos[1] - prevP[1], cameraPos[2] - prevP[2]) > 0.15 ||
      Math.hypot(cameraTarget[0] - prevT[0], cameraTarget[1] - prevT[1], cameraTarget[2] - prevT[2]) > 0.15;
    if (!moved) return;

    this.lastCameraSentAt = now;
    this.localAwareness.cameraPos = cameraPos;
    this.localAwareness.cameraTarget = cameraTarget;
    this.sendAwareness({ cameraPos, cameraTarget });
  }

  // -------------------------------------------------------------------------
  // Internal: Store Subscription + Batching
  // -------------------------------------------------------------------------

  private ensureStudioSubscription(): void {
    if (this.studioUnsub) return;
    this.studioUnsub = useStudioStore.subscribe((state) => {
      if (this.suppressOutgoing) return;
      const collab = useCollabStore.getState();
      if (collab.status !== 'connected') return;

      const proj = state.projects.find((p) => p.id === state.activeProjectId) ?? state.projects[0];
      if (!proj) return;

      // If user switched project locally, reset baseline instead of broadcasting a full cross-project diff
      if (proj.id !== this.lastProjectId) {
        this.lastProjectId = proj.id;
        this.lastSyncedWorld = proj.world;
        return;
      }

      if (!this.lastSyncedWorld || proj.world === this.lastSyncedWorld) return;
      const ops = diffWorldState(this.lastSyncedWorld, proj.world);
      this.lastSyncedWorld = proj.world;
      if (ops.length > 0) {
        this.enqueueOutgoingOps(ops);
      }
    });
  }

  private enqueueOutgoingOps(ops: WorldSyncOp[]): void {
    this.pendingOps.push(...ops);
    if (this.flushTimer !== null) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      this.flushOutgoingOps();
    }, 45);
  }

  private flushOutgoingOps(): void {
    if (this.pendingOps.length === 0) return;
    const ops = this.pendingOps;
    this.pendingOps = [];

    const collab = useCollabStore.getState();
    if (collab.status !== 'connected') return;

    if (collab.mode === 'local_tab' && this.bc) {
      const nextRev = collab.revision + 1;
      useCollabStore.setState({ revision: nextRev });
      this.bc.postMessage({
        type: 'tab_world_ops',
        senderId: collab.clientId,
        senderName: collab.nickname,
        revision: nextRev,
        ops,
      } satisfies TabChannelMessage);
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const fallbackWorld = useStudioStore.getState().getActiveProject().world;
      this.ws.send(
        JSON.stringify({
          type: 'world_ops',
          roomId: collab.roomId,
          clientId: collab.clientId,
          ops,
          fallbackWorld,
        })
      );
    }
  }

  // -------------------------------------------------------------------------
  // Internal: Remote World Application
  // -------------------------------------------------------------------------

  private applyRemoteFullWorld(world: WorldState, activityText?: string, color?: string): void {
    this.suppressOutgoing = true;
    try {
      useStudioStore.getState().applyRemoteWorld(() => world);
      this.lastSyncedWorld = useStudioStore.getState().getActiveProject().world;
    } finally {
      this.suppressOutgoing = false;
    }
    if (activityText) {
      useCollabStore.getState().pushActivity(activityText, color);
    }
  }

  private applyRemoteOps(ops: WorldSyncOp[], senderName?: string, color?: string): void {
    this.suppressOutgoing = true;
    try {
      useStudioStore.getState().applyRemoteWorld((prev) => applyWorldSyncOps(prev, ops));
      this.lastSyncedWorld = useStudioStore.getState().getActiveProject().world;
    } finally {
      this.suppressOutgoing = false;
    }

    if (senderName) {
      const summary = summarizeOps(ops);
      if (summary) {
        useCollabStore.getState().pushActivity(`${senderName} ${summary}`, color);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Internal: WebSocket Transport (Cloud & Local LAN WS)
  // -------------------------------------------------------------------------

  private connectWebSocket(url: string, roomId: string): void {
    useCollabStore.setState({ status: 'connecting', errorMsg: null });

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      useCollabStore.setState({
        status: 'error',
        errorMsg: collabTx(
          `无效的同步地址: ${err instanceof Error ? err.message : String(err)}`,
          `Invalid sync URL: ${err instanceof Error ? err.message : String(err)}`
        ),
      });
      return;
    }

    this.ws = socket;

    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.reconnectAttempt = 0;
      const collab = useCollabStore.getState();
      const initialWorld = useStudioStore.getState().getActiveProject().world;
      this.lastSyncedWorld = initialWorld;
      socket.send(
        JSON.stringify({
          type: 'join',
          roomId,
          clientId: collab.clientId,
          name: collab.nickname || collabTx('协作者', 'Collaborator'),
          color: collab.color,
          initialWorld,
        })
      );
      this.sendAwareness(this.localAwareness);
    };

    socket.onmessage = (evt) => {
      if (this.ws !== socket) return;
      let msg: WsServerMessage;
      try {
        msg = JSON.parse(String(evt.data));
      } catch {
        return;
      }

      if (msg.type === 'joined') {
        useCollabStore.setState({
          status: 'connected',
          errorMsg: null,
          revision: msg.revision ?? 1,
          peers: msg.peers ?? [],
          remoteDragPreviews: {},
          chatMessages: Array.isArray(msg.chatHistory) ? msg.chatHistory : [],
          unreadChatCount: 0,
        });
        if (msg.world && !msg.isHost) {
          this.applyRemoteFullWorld(
            msg.world,
            collabTx(
              `已加入房间 ${roomId}，已同步房间最新画布`,
              `Joined room ${roomId}, synced latest stage`
            )
          );
        } else {
          useCollabStore
            .getState()
            .pushActivity(
              collabTx(
                `已创建房间 ${roomId}（等待协作者加入）`,
                `Created room ${roomId} (waiting for peers)`
              ),
              useCollabStore.getState().color
            );
        }
      } else if (msg.type === 'sync_full' && msg.world) {
        useCollabStore.setState({ revision: msg.revision ?? 0 });
        this.applyRemoteFullWorld(
          msg.world,
          msg.senderName
            ? collabTx(`${msg.senderName} 同步了全量画布`, `${msg.senderName} pushed full stage`)
            : collabTx('已同步房间画布', 'Stage synced from room')
        );
      } else if (msg.type === 'world_ops' && msg.ops) {
        useCollabStore.setState({ revision: msg.revision ?? 0 });
        const senderPeer = useCollabStore
          .getState()
          .peers.find((p) => p.clientId === msg.senderId);
        this.applyRemoteOps(msg.ops, msg.senderName, senderPeer?.color);
      } else if (msg.type === 'peers_update' && msg.peers) {
        this.handlePeersUpdate(msg.peers);
      } else if (msg.type === 'awareness' && msg.state && msg.clientId) {
        this.handleSinglePeerAwareness(msg.state);
      } else if (msg.type === 'chat' && msg.message && typeof msg.message === 'object') {
        useCollabStore.getState().appendChatMessage(msg.message, false);
      } else if (msg.type === 'error' && typeof msg.message === 'string') {
        useCollabStore.setState({ errorMsg: msg.message });
      }
    };

    socket.onerror = () => {
      if (this.ws !== socket) return;
      const mode: CollabMode = useCollabStore.getState().mode;
      const hint =
        mode === 'local_ws'
          ? collabTx(
              '未检测到本地协同服务：请先运行 npm run collab-server，或切到“同机标签直连”',
              'Local collab server not found: run `npm run collab-server` or switch to Browser Tabs'
            )
          : collabTx(
              '无法连接云服务器 WebSocket（/ws），请检查 Nginx 反代或地址是否正确',
              'Cannot connect to cloud WebSocket (/ws); check Nginx proxy or URL'
            );
      useCollabStore.setState({ errorMsg: hint });
    };

    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.ws = null;
      if (!this.shouldStayConnected) return;

      this.reconnectAttempt += 1;
      const delay = Math.min(5000, 1500 + this.reconnectAttempt * 800);
      useCollabStore.setState({ status: 'reconnecting' });
      this.reconnectTimer = window.setTimeout(() => {
        if (!this.shouldStayConnected) return;
        const c = useCollabStore.getState();
        const nextUrl = c.mode === 'cloud' ? c.cloudWsUrl.trim() : c.localWsUrl.trim();
        this.connectWebSocket(nextUrl, c.roomId);
      }, delay);
    };
  }

  // -------------------------------------------------------------------------
  // Internal: BroadcastChannel Transport (Zero-Server Local Same-Browser Tabs)
  // -------------------------------------------------------------------------

  private connectLocalTab(roomId: string): void {
    if (typeof BroadcastChannel === 'undefined') {
      useCollabStore.setState({
        status: 'error',
        errorMsg: collabTx(
          '当前浏览器不支持 BroadcastChannel，请使用本地服务模式',
          'Browser does not support BroadcastChannel; use Local Server mode'
        ),
      });
      return;
    }

    const bc = new BroadcastChannel(`previs_collab_v1_${roomId}`);
    this.bc = bc;

    // Also answer cross-tab room discovery pings while connected in local_tab mode
    const discBc = new BroadcastChannel('previs_collab_discovery_v1');
    this.discoveryBc = discBc;
    discBc.onmessage = (evt: MessageEvent<{ type?: string; reqId?: string }>) => {
      const msg = evt.data;
      if (!msg || msg.type !== 'discover_ping') return;
      const curCollab = useCollabStore.getState();
      const curWorld = useStudioStore.getState().getActiveProject().world;
      const objectCount =
        curWorld.assets.length +
        curWorld.characters.length +
        curWorld.buildings.length +
        (curWorld.customModels?.length ?? 0) +
        (curWorld.gltfModels?.length ?? 0) +
        (curWorld.heroCompound ? 1 : 0);
      discBc.postMessage({
        type: 'discover_pong',
        reqId: msg.reqId,
        room: {
          roomId,
          onlineCount: Math.max(1, curCollab.peers.length),
          peerNames: curCollab.peers.map((p) => p.name),
          revision: curCollab.revision,
          updatedAt: Date.now(),
          objectCount,
          terrainTheme: curWorld.terrain.theme,
        } satisfies DiscoveredRoom,
      });
    };
    const collab = useCollabStore.getState();
    const myAwareness = this.buildMyAwareness();

    useCollabStore.setState({
      status: 'connected',
      errorMsg: null,
      revision: 1,
      peers: [myAwareness],
      remoteDragPreviews: {},
    });
    collab.pushActivity(
      collabTx(
        `已开启本地同机直连房间 ${roomId}（再开一个浏览器标签输入同房间号即可共创）`,
        `Opened Browser-Tab room ${roomId} (open a 2nd tab with same code)`
      ),
      collab.color
    );

    let adoptedWorld = false;

    bc.onmessage = (evt: MessageEvent<TabChannelMessage>) => {
      const msg = evt.data;
      if (!msg || msg.senderId === useCollabStore.getState().clientId) return;

      if (msg.type === 'tab_hello') {
        if (msg.awareness) {
          this.upsertLocalPeer(msg.awareness);
          useCollabStore
            .getState()
            .pushActivity(
              collabTx(`${msg.awareness.name} 加入了房间`, `${msg.awareness.name} joined`),
              msg.awareness.color
            );
        }
        // Share our current world with the newcomer
        const curWorld = useStudioStore.getState().getActiveProject().world;
        bc.postMessage({
          type: 'tab_welcome',
          senderId: useCollabStore.getState().clientId,
          targetId: msg.senderId,
          revision: useCollabStore.getState().revision,
          world: curWorld,
          chatHistory: useCollabStore.getState().chatMessages.slice(-50),
          awareness: this.buildMyAwareness(),
        } satisfies TabChannelMessage);
      } else if (msg.type === 'tab_welcome') {
        if (msg.awareness) this.upsertLocalPeer(msg.awareness);
        if (Array.isArray(msg.chatHistory) && msg.chatHistory.length > 0) {
          for (const cm of msg.chatHistory) {
            useCollabStore.getState().appendChatMessage(cm, cm.clientId === useCollabStore.getState().clientId);
          }
        }
        if (
          !adoptedWorld &&
          (!msg.targetId || msg.targetId === useCollabStore.getState().clientId) &&
          msg.world
        ) {
          adoptedWorld = true;
          useCollabStore.setState({ revision: msg.revision ?? 1 });
          this.applyRemoteFullWorld(
            msg.world,
            collabTx(
              `已从本地标签页同步房间 ${roomId} 画布`,
              `Synced room ${roomId} stage from peer tab`
            )
          );
        }
      } else if (msg.type === 'tab_world_ops' && msg.ops) {
        useCollabStore.setState({ revision: msg.revision ?? 0 });
        const peer = useCollabStore
          .getState()
          .peers.find((p) => p.clientId === msg.senderId);
        this.applyRemoteOps(msg.ops, msg.senderName, peer?.color);
      } else if (msg.type === 'tab_replace_world' && msg.world) {
        useCollabStore.setState({ revision: msg.revision ?? 0 });
        this.applyRemoteFullWorld(
          msg.world,
          msg.senderName
            ? collabTx(`${msg.senderName} 同步了全量画布`, `${msg.senderName} pushed full stage`)
            : collabTx('画布已更新', 'Stage updated')
        );
      } else if (msg.type === 'tab_awareness' && msg.awareness) {
        this.handleSinglePeerAwareness(msg.awareness);
      } else if (msg.type === 'tab_chat' && msg.chatMessage) {
        useCollabStore.getState().appendChatMessage(msg.chatMessage, false);
      } else if (msg.type === 'tab_bye') {
        const left = useCollabStore
          .getState()
          .peers.find((p) => p.clientId === msg.senderId);
        this.removeLocalPeer(msg.senderId);
        if (left) {
          useCollabStore
            .getState()
            .pushActivity(
              collabTx(`${left.name} 离开了房间`, `${left.name} left`),
              left.color
            );
        }
      }
    };

    bc.postMessage({
      type: 'tab_hello',
      senderId: collab.clientId,
      awareness: myAwareness,
    } satisfies TabChannelMessage);
  }

  private buildMyAwareness(): PeerAwareness {
    const collab = useCollabStore.getState();
    return {
      clientId: collab.clientId,
      name: collab.nickname || collabTx('协作者', 'Collaborator'),
      color: collab.color,
      selectedId: this.localAwareness.selectedId ?? null,
      isDragging: Boolean(this.localAwareness.isDragging),
      dragTransform: this.localAwareness.dragTransform ?? null,
      cameraPos: this.localAwareness.cameraPos ?? [0, 8, 16],
      cameraTarget: this.localAwareness.cameraTarget ?? [0, 1, 0],
      updatedAt: Date.now(),
    };
  }

  private sendAwareness(patch: Partial<PeerAwareness>): void {
    const collab = useCollabStore.getState();
    if (collab.status !== 'connected') return;

    const payload: Partial<PeerAwareness> = {
      ...patch,
      name: collab.nickname || collabTx('协作者', 'Collaborator'),
      color: collab.color,
    };

    if (collab.mode === 'local_tab' && this.bc) {
      const full = { ...this.buildMyAwareness(), ...payload };
      this.bc.postMessage({
        type: 'tab_awareness',
        senderId: collab.clientId,
        awareness: full,
      } satisfies TabChannelMessage);
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'awareness',
          roomId: collab.roomId,
          clientId: collab.clientId,
          state: payload,
        })
      );
    }
  }

  private handlePeersUpdate(peers: PeerAwareness[]): void {
    const prevPeers = useCollabStore.getState().peers;
    const prevIds = new Set(prevPeers.map((p) => p.clientId));
    const nextIds = new Set(peers.map((p) => p.clientId));
    const myId = useCollabStore.getState().clientId;

    for (const p of peers) {
      if (p.clientId !== myId && !prevIds.has(p.clientId)) {
        useCollabStore
          .getState()
          .pushActivity(collabTx(`${p.name} 加入了房间`, `${p.name} joined`), p.color);
      }
    }
    for (const p of prevPeers) {
      if (p.clientId !== myId && !nextIds.has(p.clientId)) {
        useCollabStore
          .getState()
          .pushActivity(collabTx(`${p.name} 离开了房间`, `${p.name} left`), p.color);
      }
    }

    const nextPreviews = { ...useCollabStore.getState().remoteDragPreviews };
    for (const [objId, info] of Object.entries(nextPreviews)) {
      if (!nextIds.has(info.clientId)) {
        delete nextPreviews[objId];
      }
    }
    useCollabStore.setState({ peers, remoteDragPreviews: nextPreviews });
  }

  private upsertLocalPeer(peer: PeerAwareness): void {
    useCollabStore.setState((s) => {
      const idx = s.peers.findIndex((p) => p.clientId === peer.clientId);
      const next = [...s.peers];
      if (idx >= 0) next[idx] = peer;
      else next.push(peer);
      return { peers: next };
    });
  }

  private removeLocalPeer(clientId: string): void {
    useCollabStore.setState((s) => {
      const nextPreviews = { ...s.remoteDragPreviews };
      for (const [objId, info] of Object.entries(nextPreviews)) {
        if (info.clientId === clientId) delete nextPreviews[objId];
      }
      return {
        peers: s.peers.filter((p) => p.clientId !== clientId),
        remoteDragPreviews: nextPreviews,
      };
    });
  }

  private handleSinglePeerAwareness(state: PeerAwareness): void {
    useCollabStore.setState((s) => {
      const idx = s.peers.findIndex((p) => p.clientId === state.clientId);
      const nextPeers = [...s.peers];
      if (idx >= 0) nextPeers[idx] = state;
      else nextPeers.push(state);

      const nextPreviews = { ...s.remoteDragPreviews };
      // Remove any previous drag preview owned by this client
      for (const [objId, info] of Object.entries(nextPreviews)) {
        if (info.clientId === state.clientId) {
          delete nextPreviews[objId];
        }
      }
      if (state.isDragging && state.dragTransform) {
        nextPreviews[state.dragTransform.objectId] = {
          ...state.dragTransform,
          clientId: state.clientId,
          name: state.name,
          color: state.color,
        };
      }
      return { peers: nextPeers, remoteDragPreviews: nextPreviews };
    });
  }

  private notifyLeavingSync(): void {
    const collab = useCollabStore.getState();
    if (collab.status !== 'connected') return;
    if (collab.mode === 'local_tab' && this.bc) {
      try {
        this.bc.postMessage({
          type: 'tab_bye',
          senderId: collab.clientId,
        } satisfies TabChannelMessage);
      } catch {
        // ignore
      }
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'leave',
            roomId: collab.roomId,
            clientId: collab.clientId,
          })
        );
      } catch {
        // ignore
      }
    }
  }
}

const isCollabEn = () => useStudioStore.getState().language === 'en';
const collabTx = (zhText: string, enText: string) =>
  isCollabEn() ? enText : zhText;

function summarizeOps(ops: WorldSyncOp[]): string {
  for (const op of ops) {
    if (op.op === 'upsert_items') {
      const label =
        op.collection === 'characters'
          ? collabTx('人物', 'actor(s)')
          : op.collection === 'buildings'
            ? collabTx('建筑', 'building(s)')
            : op.collection === 'paintedRoads' || op.collection === 'paintedFences'
              ? collabTx('道路/围栏', 'path(s)')
              : collabTx('模型', 'object(s)');
      return isCollabEn()
        ? `Updated ${op.items.length} ${label}`
        : `更新了 ${op.items.length} 个${label}`;
    }
    if (op.op === 'delete_items') {
      return isCollabEn()
        ? `Removed ${op.ids.length} item(s)`
        : `移除了 ${op.ids.length} 个元素`;
    }
    if (op.op === 'set_terrain_meta' || op.op === 'patch_terrain_grid') {
      return collabTx('修改了地形', 'Modified terrain');
    }
    if (op.op === 'set_field') {
      if (op.field === 'environment') return collabTx('调整了天光环境', 'Adjusted lighting');
      if (op.field === 'road') return collabTx('调整了道路格局', 'Updated road layout');
      if (op.field === 'heroCompound') return collabTx('调整了复合建筑', 'Updated hero compound');
    }
  }
  return '';
}

function toRoomsHttpUrl(wsUrl: string): string | null {
  try {
    const normalized = wsUrl
      .replace(/^wss:/i, 'https:')
      .replace(/^ws:/i, 'http:');
    const u = new URL(normalized);
    if (u.pathname.endsWith('/ws')) {
      u.pathname = `${u.pathname}/rooms`;
    } else if (u.pathname === '/' || u.pathname === '') {
      u.pathname = '/ws/rooms';
    } else {
      u.pathname = `${u.pathname.replace(/\/+$/, '')}/rooms`;
    }
    return u.toString();
  } catch {
    return null;
  }
}

export const collabManager = new CollabManager();
