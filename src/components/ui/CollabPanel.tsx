import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Dices,
  Laptop,
  LogOut,
  Navigation,
  Radar,
  Radio,
  RefreshCw,
  Server,
  Trash2,
  UploadCloud,
  Users,
} from 'lucide-react';
import { collabManager } from '../../collab/collabManager';
import { generateRoomCode, type CollabMode } from '../../collab/collabTypes';
import { translateDefaultEntityName } from '../../i18n/translations';
import { useCollabStore } from '../../store/useCollabStore';
import { useStudioStore } from '../../store/useStudioStore';

interface CollabPanelProps {
  onClose?: () => void;
}

const MODE_OPTIONS: {
  id: CollabMode;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'cloud',
    label: '云服务器',
    labelEn: 'Cloud Server',
    desc: '跨网远程共创（自动走当前域名 /ws 或自定义 wss:// 地址）',
    descEn: 'Remote over Internet (uses current domain /ws or custom wss://)',
    icon: <Cloud className="w-3.5 h-3.5" />,
  },
  {
    id: 'local_ws',
    label: '本地/局域网服务',
    labelEn: 'Local / LAN',
    desc: '连接本地 Node 协同服务（npm run collab-server，支持同 WiFi 多电脑）',
    descEn: 'Connects to local Node server (npm run collab-server, multi-PC over Wi-Fi)',
    icon: <Server className="w-3.5 h-3.5" />,
  },
  {
    id: 'local_tab',
    label: '本机多标签直连',
    labelEn: 'Browser Tabs',
    desc: '无需启动任何后台服务！本机浏览器开两个标签输入同房间号即可',
    descEn: 'Zero backend! Open two browser tabs locally with the same Room ID',
    icon: <Laptop className="w-3.5 h-3.5" />,
  },
];

export const CollabPanel: React.FC<CollabPanelProps> = ({ onClose }) => {
  const language = useStudioStore((s) => s.language);
  const en = language === 'en';
  const tx = (zhText: string, enText: string) => (en ? enText : zhText);
  const mode = useCollabStore((s) => s.mode);
  const roomId = useCollabStore((s) => s.roomId);
  const cloudWsUrl = useCollabStore((s) => s.cloudWsUrl);
  const localWsUrl = useCollabStore((s) => s.localWsUrl);
  const clientId = useCollabStore((s) => s.clientId);
  const nickname = useCollabStore((s) => s.nickname);
  const status = useCollabStore((s) => s.status);
  const errorMsg = useCollabStore((s) => s.errorMsg);
  const revision = useCollabStore((s) => s.revision);
  const peers = useCollabStore((s) => s.peers);
  const activities = useCollabStore((s) => s.activities);
  const discoveredRooms = useCollabStore((s) => s.discoveredRooms);
  const isScanningRooms = useCollabStore((s) => s.isScanningRooms);
  const scanError = useCollabStore((s) => s.scanError);

  const setMode = useCollabStore((s) => s.setMode);
  const setRoomId = useCollabStore((s) => s.setRoomId);
  const setNickname = useCollabStore((s) => s.setNickname);
  const setCloudWsUrl = useCollabStore((s) => s.setCloudWsUrl);
  const setLocalWsUrl = useCollabStore((s) => s.setLocalWsUrl);

  const world = useStudioStore((s) => s.getActiveProject().world);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [clearFeedback, setClearFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const historicalCount = useMemo(
    () => discoveredRooms.filter((r) => r.onlineCount === 0).length,
    [discoveredRooms]
  );

  const objectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of world.assets) map.set(a.id, translateDefaultEntityName(language, a.name));
    for (const c of world.characters) map.set(c.id, translateDefaultEntityName(language, c.name));
    for (const b of world.buildings) map.set(b.id, translateDefaultEntityName(language, b.name));
    for (const cm of world.customModels ?? []) map.set(cm.id, translateDefaultEntityName(language, cm.name));
    for (const gm of world.gltfModels ?? []) map.set(gm.id, translateDefaultEntityName(language, gm.name));
    if (world.heroCompound) map.set(world.heroCompound.id, translateDefaultEntityName(language, world.heroCompound.name));
    return map;
  }, [world, language]);

  const isConnected = status === 'connected';
  const isBusy = status === 'connecting' || status === 'reconnecting';

  useEffect(() => {
    setConfirmClearHistory(false);
    setClearFeedback(null);
    if (!isConnected && !isBusy) {
      void collabManager.scanRooms();
    }
  }, [mode, isConnected, isBusy]);

  const handleClearHistory = async () => {
    if (isClearingHistory) return;
    setIsClearingHistory(true);
    const result = await collabManager.clearHistoricalRooms();
    setIsClearingHistory(false);
    setConfirmClearHistory(false);
    if (result.ok) {
      setClearFeedback({
        ok: true,
        text:
          result.clearedCount > 0
            ? en
              ? `Cleared ${result.clearedCount} offline history saves (active rooms kept)`
              : `已清除 ${result.clearedCount} 个历史存档（在线房间已保留）`
            : tx('当前没有需要清理的历史存档', 'No offline history saves to clear'),
      });
    } else {
      setClearFeedback({
        ok: false,
        text: en
          ? `Clear failed: ${result.error || 'Check collab server version'}`
          : `清理失败：${result.error || '请检查协同服务版本是否已更新'}`,
      });
    }
    window.setTimeout(() => setClearFeedback(null), 3500);
  };

  const handleCopyInvite = async () => {
    const url = collabManager.buildInviteUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      window.prompt(tx('复制下面链接发给协作者：', 'Copy invite link to share:'), url);
    }
  };

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedRoom(true);
      window.setTimeout(() => setCopiedRoom(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleTeleportToPeer = (
    cameraPos: [number, number, number],
    cameraTarget: [number, number, number]
  ) => {
    useStudioStore.setState({
      pendingDirectorCamera: {
        position: cameraPos,
        target: cameraTarget,
        nonce: Date.now(),
      },
    });
    onClose?.();
  };

  return (
    <div className="space-y-3 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>{tx('多人共创房间', 'Live Co-Creation')}</span>
              {isConnected && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {tx('已连接', 'Connected')} #{revision}
                </span>
              )}
              {isBusy && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 text-[10px] font-semibold">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  {status === 'reconnecting'
                    ? tx('重连中', 'Reconnecting')
                    : tx('连接中', 'Connecting')}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500">
              {tx(
                '同步模型 · 人物 · 建筑 · 地形（每人镜头与视角独立）',
                'Sync Models · Actors · Buildings · Terrain (Independent Cameras)'
              )}
            </div>
          </div>
        </div>
      </div>

      {!isConnected && !isBusy ? (
        <>
          {/* Nickname */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-600">
              {tx('你的显示昵称', 'Your Display Name')}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={tx('例如：张老师 / 导演A', 'e.g. Director Alex')}
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-sky-500"
            />
          </div>

          {/* Mode Selector: Cloud vs Local WS vs Local Tab */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-600">
              {tx('共创网络模式', 'Co-Creation Network Mode')}
            </label>
            <div className="grid grid-cols-3 gap-1">
              {MODE_OPTIONS.map((opt) => {
                const active = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`collab-mode-${opt.id}`}
                    onClick={() => setMode(opt.id)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center border transition ${
                      active
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white/70 text-slate-700 border-slate-200/80 hover:bg-white'
                    }`}
                  >
                    {opt.icon}
                    <span className="text-[11px] font-semibold leading-tight">
                      {en ? opt.labelEn : opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed px-0.5">
              {(() => {
                const m = MODE_OPTIONS.find((item) => item.id === mode);
                return m ? (en ? m.descEn : m.desc) : '';
              })()}
            </p>
          </div>

          {/* WebSocket Endpoint Input (for Cloud or Local WS) */}
          {mode !== 'local_tab' && (
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                {mode === 'cloud'
                  ? tx('云服务器同步地址 (WebSocket)', 'Cloud Sync URL (WebSocket)')
                  : tx('本地 / 局域网协同地址', 'Local / LAN WebSocket URL')}
              </label>
              <input
                type="text"
                value={mode === 'cloud' ? cloudWsUrl : localWsUrl}
                onChange={(e) =>
                  mode === 'cloud'
                    ? setCloudWsUrl(e.target.value)
                    : setLocalWsUrl(e.target.value)
                }
                placeholder={
                  mode === 'cloud'
                    ? tx('wss://你的服务器/ws', 'wss://your-server/ws')
                    : 'ws://127.0.0.1:3001/ws'
                }
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-[11px] font-mono text-slate-800 outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Discovered Active Rooms (One-Click Join without typing code) */}
          <div className="space-y-1.5 rounded-xl bg-slate-900/5 border border-slate-200/80 p-2">
            <div className="flex items-center justify-between gap-1.5">
              <span
                title={tx(
                  '附近在线房间与历史存档，点击可直接加入',
                  'Nearby active rooms and history saves — click to join'
                )}
                className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 min-w-0 truncate"
              >
                <Radar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="truncate">{tx('附近/在线房间', 'Nearby / Online Rooms')}</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {mode !== 'local_tab' && (
                  <button
                    type="button"
                    data-testid="collab-clear-history-btn"
                    title={
                      historicalCount > 0
                        ? en
                          ? `Clear ${historicalCount} offline history saves (active rooms kept)`
                          : `清除 ${historicalCount} 个离线历史存档（不影响在线房间）`
                        : tx('暂无历史存档可清理', 'No offline saves to clear')
                    }
                    disabled={
                      isClearingHistory || isScanningRooms || historicalCount === 0
                    }
                    onClick={() => setConfirmClearHistory(true)}
                    className="glass-btn px-2 py-0.5 rounded-lg text-[10px] font-semibold text-rose-600 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>
                      {isClearingHistory
                        ? tx('清理中...', 'Clearing...')
                        : historicalCount > 0
                          ? `${tx('清空存档', 'Clear Saves')}(${historicalCount})`
                          : tx('清空存档', 'Clear Saves')}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  data-testid="collab-scan-btn"
                  disabled={isScanningRooms || isClearingHistory}
                  onClick={() => void collabManager.scanRooms()}
                  className="glass-btn px-2 py-0.5 rounded-lg text-[10px] font-semibold text-sky-700 flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isScanningRooms ? 'animate-spin' : ''}`}
                  />
                  <span>{isScanningRooms ? tx('扫描中...', 'Scanning...') : tx('扫描房间', 'Scan')}</span>
                </button>
              </div>
            </div>

            {confirmClearHistory && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-2 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[10px] text-rose-800 leading-snug">
                  {en
                    ? `Clear all ${historicalCount} offline saved rooms? (Online rooms unaffected)`
                    : `清除全部 ${historicalCount} 个离线历史存档？（在线房间不受影响）`}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    data-testid="collab-cancel-clear-btn"
                    disabled={isClearingHistory}
                    onClick={() => setConfirmClearHistory(false)}
                    className="px-2 py-0.5 rounded-md bg-white/80 hover:bg-white text-slate-600 border border-slate-200 text-[10px] font-medium"
                  >
                    {tx('取消', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    data-testid="collab-confirm-clear-btn"
                    disabled={isClearingHistory}
                    onClick={() => void handleClearHistory()}
                    className="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold disabled:opacity-50"
                  >
                    {isClearingHistory ? tx('清空中...', 'Clearing...') : tx('确认清空', 'Confirm Clear')}
                  </button>
                </div>
              </div>
            )}

            {clearFeedback && (
              <div
                data-testid="collab-clear-feedback"
                className={`rounded-lg px-2 py-1 text-[10px] font-medium ${
                  clearFeedback.ok
                    ? 'bg-emerald-500/12 text-emerald-800 border border-emerald-500/25'
                    : 'bg-rose-500/12 text-rose-800 border border-rose-500/25'
                }`}
              >
                {clearFeedback.text}
              </div>
            )}

            {scanError ? (
              <div className="text-[10px] text-amber-700 leading-relaxed px-0.5">
                {scanError}
              </div>
            ) : discoveredRooms.length === 0 ? (
              <div className="text-[10px] text-slate-500 px-0.5 py-1">
                {isScanningRooms
                  ? tx('正在扫描局域网活跃房间...', 'Scanning LAN for active rooms...')
                  : tx('暂未发现现成房间，可直接点下方按钮创建新房间', 'No active rooms found — create a new one below')}
              </div>
            ) : (
              <div className="max-h-28 overflow-y-auto space-y-1 pr-0.5">
                {discoveredRooms.map((r) => (
                  <div
                    key={r.roomId}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white/85 border border-slate-200/80 px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-slate-900">
                          #{r.roomId}
                        </span>
                        {r.onlineCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 text-[9px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {r.onlineCount} {tx('人在线', 'online')}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[9px] font-medium">
                            {tx('历史存档', 'Saved')}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {r.peerNames.length > 0
                          ? `${tx('成员', 'Peers')}: ${r.peerNames.join(', ')} · `
                          : ''}
                        {r.objectCount} {tx('个场内元素', 'items')}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid={`collab-quick-join-${r.roomId}`}
                      onClick={() => collabManager.joinSpecificRoom(r.roomId)}
                      className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-semibold shrink-0 transition"
                    >
                      {tx('一键加入', 'Join')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Room ID */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-600">
              {tx('房间号（同房间号即可进入同一张画布）', 'Room ID (share code to collaborate on same stage)')}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                data-testid="collab-room-input"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder={tx('输入6位房间号', 'Enter 6-char room code')}
                className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs font-mono font-semibold tracking-wider text-slate-900 outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setRoomId(generateRoomCode())}
                title={tx('随机生成新房间号', 'Generate Random Room ID')}
                className="glass-btn p-2 rounded-xl text-slate-700"
              >
                <Dices className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-2.5 py-2 text-[11px] text-rose-700 leading-relaxed">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            data-testid="collab-join-btn"
            onClick={() => collabManager.joinRoom()}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white py-2 text-xs font-semibold shadow-sm transition"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{tx('创建 / 加入共创房间', 'Create / Join Co-Create Room')}</span>
          </button>
        </>
      ) : (
        <>
          {/* Connected Room Bar */}
          <div className="flex items-center justify-between rounded-xl bg-slate-900/5 border border-slate-200/80 px-2.5 py-2">
            <div>
              <div className="text-[10px] text-slate-500">
                {tx('当前房间号', 'Room ID')} ·{' '}
                {mode === 'cloud'
                  ? tx('云服务器模式', 'Cloud Server')
                  : mode === 'local_ws'
                    ? tx('本地服务模式', 'Local / LAN')
                    : tx('本机多标签直连', 'Browser Tabs')}
              </div>
              <div className="text-sm font-mono font-bold tracking-widest text-slate-900">
                {roomId}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyRoomId}
                title={tx('复制房间号', 'Copy Room ID')}
                className="glass-btn px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1"
              >
                {copiedRoom ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedRoom ? tx('已复制', 'Copied') : tx('房号', 'Code')}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyInvite}
                title={tx('复制一键直达邀请链接', 'Copy Direct Invite URL')}
                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold flex items-center gap-1 transition"
              >
                {copiedLink ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedLink ? tx('已复制链接', 'Link Copied') : tx('邀请链接', 'Invite Link')}</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 text-[11px] text-amber-800">
              {errorMsg}
            </div>
          )}

          {/* Online Peers */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
              <span>{tx('在线协作者', 'Online Peers')} ({peers.length})</span>
              <span className="text-[10px] font-normal text-slate-400">
                {tx('各自镜头独立', 'Independent Cameras')}
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
              {peers.map((peer) => {
                const isMe = peer.clientId === clientId;
                const selName = peer.selectedId
                  ? objectNameMap.get(peer.selectedId) ?? peer.selectedId
                  : null;
                return (
                  <div
                    key={peer.clientId}
                    className="flex items-center justify-between rounded-xl bg-white/70 border border-slate-200/70 px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white"
                        style={{ backgroundColor: peer.color }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate flex items-center gap-1">
                          <span>{peer.name}</span>
                          {isMe && (
                            <span className="text-[10px] px-1 rounded bg-slate-200/80 text-slate-600 font-normal">
                              {tx('我', 'Me')}
                            </span>
                          )}
                        </div>
                        {selName && (
                          <div className="text-[10px] text-slate-500 truncate">
                            {peer.isDragging
                              ? tx('正在拖拽: ', 'Dragging: ')
                              : tx('已选中: ', 'Selected: ')}
                            {selName}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isMe && (
                      <button
                        type="button"
                        onClick={() =>
                          handleTeleportToPeer(peer.cameraPos, peer.cameraTarget)
                        }
                        title={tx(
                          '仅移动你自己的视口过去看看 TA 的工作区',
                          "Fly only your camera to inspect this peer's area"
                        )}
                        className="glass-btn px-2 py-1 rounded-lg text-[10px] font-medium text-sky-700 flex items-center gap-1 shrink-0"
                      >
                        <Navigation className="w-2.5 h-2.5" />
                        <span>{tx('飞去看看', 'Fly To')}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Log */}
          {activities.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-500">
                {tx('协同动态', 'Activity')}
              </div>
              <div className="max-h-20 overflow-y-auto rounded-xl bg-slate-900/5 px-2 py-1.5 space-y-1">
                {activities.slice(0, 6).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center gap-1.5 text-[10px] text-slate-600"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: act.color }}
                    />
                    <span className="truncate">{act.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => collabManager.pushCurrentWorldToRoom()}
              title={tx(
                '将你本地当前画布强制全量覆盖同步给房间成员',
                'Push full local stage snapshot to overwrite the room'
              )}
              className="flex-1 glass-btn flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-medium text-slate-700"
            >
              <UploadCloud className="w-3.5 h-3.5 text-sky-600" />
              <span>{tx('覆盖同步画布', 'Push Full Stage')}</span>
            </button>
            <button
              type="button"
              data-testid="collab-leave-btn"
              onClick={() => collabManager.leaveRoom(true)}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 text-[11px] font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{tx('退出', 'Leave')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
