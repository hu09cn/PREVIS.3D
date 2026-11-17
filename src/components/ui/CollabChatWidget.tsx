import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Send,
} from 'lucide-react';
import { collabManager } from '../../collab/collabManager';
import { useCollabStore } from '../../store/useCollabStore';
import { useStudioStore } from '../../store/useStudioStore';

interface CollabChatWidgetProps {
  inspectorOpen: boolean;
}

function formatChatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const CollabChatWidget: React.FC<CollabChatWidgetProps> = ({
  inspectorOpen,
}) => {
  const language = useStudioStore((s) => s.language);
  const en = language === 'en';
  const tx = (zhText: string, enText: string) => (en ? enText : zhText);
  const status = useCollabStore((s) => s.status);
  const mode = useCollabStore((s) => s.mode);
  const roomId = useCollabStore((s) => s.roomId);
  const clientId = useCollabStore((s) => s.clientId);
  const peers = useCollabStore((s) => s.peers);
  const chatOpen = useCollabStore((s) => s.chatOpen);
  const setChatOpen = useCollabStore((s) => s.setChatOpen);
  const chatMessages = useCollabStore((s) => s.chatMessages);

  const [draft, setDraft] = useState('');
  const [attachLocation, setAttachLocation] = useState(false);
  const [toastMsgId, setToastMsgId] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);

  // Auto-scroll when messages arrive while open
  useEffect(() => {
    if (chatOpen) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatOpen, chatMessages.length]);

  // Show brief incoming toast preview when chat is collapsed
  useEffect(() => {
    const prevCount = prevMsgCountRef.current;
    prevMsgCountRef.current = chatMessages.length;
    if (chatMessages.length <= prevCount || chatOpen) return;

    const latest = chatMessages[chatMessages.length - 1];
    if (!latest || latest.clientId === clientId) return;

    setToastMsgId(latest.id);
    const timer = window.setTimeout(() => {
      setToastMsgId((cur) => (cur === latest.id ? null : cur));
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [chatMessages, chatOpen, clientId]);

  if (status !== 'connected') return null;

  const latestToastMsg =
    !chatOpen && toastMsgId
      ? chatMessages.find((m) => m.id === toastMsgId) ?? null
      : null;

  const handleSend = () => {
    const clean = draft.trim();
    if (!clean) return;
    collabManager.sendChatMessage(clean, attachLocation);
    setDraft('');
    setAttachLocation(false);
  };

  const handleJumpToLocation = (
    pos?: [number, number, number],
    target?: [number, number, number]
  ) => {
    if (!pos || !target) return;
    useStudioStore.setState({
      pendingDirectorCamera: {
        position: [...pos],
        target: [...target],
        nonce: Date.now() + Math.random(),
      },
    });
  };

  const anchorClass = inspectorOpen
    ? 'right-[19.5rem] bottom-4'
    : 'right-4 bottom-[12.5rem]';

  const modeBadge =
    mode === 'cloud'
      ? tx('云联机', 'Cloud')
      : mode === 'local_ws'
        ? tx('局域网', 'LAN')
        : tx('同机直连', 'Local Tabs');

  if (!chatOpen) {
    if (!latestToastMsg) return null;
    return (
      <button
        type="button"
        onClick={() => {
          setToastMsgId(null);
          setChatOpen(true);
        }}
        className={`pointer-events-auto fixed ${anchorClass} z-30 max-w-72 rounded-2xl glass-drawer px-3 py-2 text-left shadow-xl hover:scale-[1.01] transition flex items-start gap-2`}
      >
        <span
          className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 ring-2 ring-white"
          style={{ backgroundColor: latestToastMsg.color }}
        />
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-slate-700 truncate">
            {latestToastMsg.senderName} {tx('发来消息：', 'sent a message:')}
          </div>
          <div className="text-xs text-slate-900 line-clamp-2 break-words">
            {latestToastMsg.text}
          </div>
        </div>
      </button>
    );
  }

  return (
    <section
      data-testid="collab-chat-window"
      className={`pointer-events-auto fixed ${anchorClass} z-30 w-76 rounded-2xl glass-drawer flex flex-col overflow-hidden text-slate-800 shadow-2xl`}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/60 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <MessageCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="text-xs font-bold text-slate-900 truncate">
            {tx('房间聊天', 'Room Chat')} #{roomId}
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 text-[9px] font-semibold shrink-0">
            {modeBadge} · {Math.max(1, peers.length)} {tx('人', 'online')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setChatOpen(false)}
          title={tx('收起聊天窗口', 'Minimize Chat')}
          className="glass-btn p-1 rounded-full text-slate-500 hover:text-slate-800"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div
        data-testid="collab-chat-messages"
        className="h-52 overflow-y-auto px-2.5 py-2 space-y-2 bg-white/30"
      >
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[11px] text-slate-400 px-4">
            <MessageCircle className="w-5 h-5 mb-1 opacity-50" />
            <span>
              {tx(
                '暂无消息，发句话跟队友沟通构图吧',
                'No messages yet — say hi to your team'
              )}
            </span>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMine = msg.clientId === clientId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isMine ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                  {!isMine && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: msg.color }}
                    />
                  )}
                  <span className="text-[10px] font-semibold text-slate-600">
                    {isMine ? tx('我', 'Me') : msg.senderName}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {formatChatTime(msg.timestamp)}
                  </span>
                </div>

                <div
                  className={`max-w-[88%] rounded-2xl px-2.5 py-1.5 text-xs break-words shadow-xs ${
                    isMine
                      ? 'bg-sky-600 text-white rounded-tr-sm'
                      : 'bg-white/90 text-slate-800 border border-slate-200/70 rounded-tl-sm'
                  }`}
                >
                  <div>{msg.text}</div>
                  {msg.kind === 'location' && msg.cameraPos && msg.cameraTarget && (
                    <button
                      type="button"
                      onClick={() =>
                        handleJumpToLocation(msg.cameraPos, msg.cameraTarget)
                      }
                      className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
                        isMine
                          ? 'bg-white/20 hover:bg-white/30 text-white'
                          : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-700'
                      }`}
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>{tx('定位查看此处视角', 'Fly to Shared View')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-2 border-t border-white/60 bg-white/55 flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setAttachLocation((v) => !v)}
          title={tx(
            '附带我当前 3D 视角坐标（队友点消息就能飞过来看）',
            'Attach my 3D camera viewpoint (teammates can click to fly here)'
          )}
          className={`p-1.5 rounded-xl border transition shrink-0 ${
            attachLocation
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white/80 text-slate-500 border-slate-200 hover:text-sky-600'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>
        <input
          type="text"
          data-testid="collab-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            attachLocation
              ? tx('输入消息（将附带当前视角位置）...', 'Message (with shared viewpoint)...')
              : tx('输入消息，回车发送...', 'Type message, Enter to send...')
          }
          className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-sky-500"
        />
        <button
          type="button"
          data-testid="collab-chat-send-btn"
          disabled={!draft.trim()}
          onClick={handleSend}
          title={tx('发送', 'Send')}
          className="p-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white transition shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
