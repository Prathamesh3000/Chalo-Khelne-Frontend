import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageCircle, Users, Crown, X } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useChats, useCreateChat } from "./useGroupChat";

/**
 * Props:
 * - dark: boolean (default false) — render in Manager dark theme
 * - showHeader: boolean (defaults to !dark — page wrapper provides its own header in dark)
 */
export default function ChatList({ dark = false, showHeader }) {
  const { auth } = useContext(AuthContext);
  const userId = auth?._id;
  const navigate = useNavigate();

  const { data: chats = [], isLoading } = useChats(userId);
  const createMutation = useCreateChat(userId);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const renderHeader = showHeader ?? !dark;

  const handleCreate = async () => {
    if (!name.trim()) return;
    const chat = await createMutation.mutateAsync({
      name: name.trim(), description: desc, createdBy: userId,
      createdByName: auth?.name || "User", createdByRole: auth?.role || "Player",
    });
    setName(""); setDesc(""); setShowCreate(false);
    if (chat?._id) navigate(`/group-chat/${chat._id}`);
  };

  const timeAgo = (d) => {
    if (!d) return "";
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const t = dark
    ? {
        wrapper:   "",
        titleText: "text-white",
        metaText:  "text-gray-400",
        cta:       "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30",
        skeleton:  "bg-[#181A22] border border-white/[0.06]",
        emptyBox:  "bg-[#181A22]",
        emptyBorder: { border: "1px solid rgba(255,255,255,0.06)" },
        emptyIconBg: "bg-white/[0.06]",
        emptyIcon:   "text-gray-500",
        emptyTitle:  "text-white",
        emptyDesc:   "text-gray-400",
        rowCard:   "bg-[#181A22] hover:border-white/[0.12] transition",
        rowBorder: "border border-white/[0.06]",
        rowAvatar: "bg-orange-500/15 text-orange-400",
        rowName:   "text-white",
        rowMeta:   "text-gray-500",
        crown:     "text-orange-400",
      }
    : {
        wrapper:   "p-6 lg:p-8 max-w-3xl mx-auto",
        titleText: "text-gray-900",
        metaText:  "text-gray-500",
        cta:       "bg-orange-500 hover:bg-orange-600 text-white shadow-sm",
        skeleton:  "bg-white border border-gray-100",
        emptyBox:  "bg-white border border-gray-100",
        emptyBorder: undefined,
        emptyIconBg: "bg-gray-100",
        emptyIcon:   "text-gray-300",
        emptyTitle:  "text-gray-700",
        emptyDesc:   "text-gray-400",
        rowCard:   "bg-white hover:shadow-md hover:border-gray-200 transition-all",
        rowBorder: "border border-gray-100",
        rowAvatar: "bg-gradient-to-br from-orange-500 to-[#2DA5FF] text-white",
        rowName:   "text-gray-800",
        rowMeta:   "text-gray-400",
        crown:     "text-orange-500",
      };

  return (
    <div className={t.wrapper}>
      {renderHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-black ${t.titleText}`}>Group Chats</h1>
            <p className={`text-sm mt-0.5 ${t.metaText}`}>{chats.length} chat{chats.length === 1 ? "" : "s"}</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-semibold transition active:scale-[0.98] w-auto ${t.cta}`}>
            <Plus className="w-3.5 h-3.5" /> New chat
          </button>
        </div>
      )}

      {/* When dark and header hidden, still show a top-right New chat button */}
      {!renderHeader && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowCreate(true)}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-semibold transition active:scale-[0.98] w-auto ${t.cta}`}>
            <Plus className="w-3.5 h-3.5" /> New chat
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-md p-4 animate-pulse h-16 ${t.skeleton}`} />
          ))}
        </div>
      ) : chats.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${t.emptyBox}`} style={t.emptyBorder}>
          <div className={`w-10 h-10 rounded-md inline-flex items-center justify-center mb-3 ${t.emptyIconBg}`}>
            <MessageCircle className={`w-5 h-5 ${t.emptyIcon}`} />
          </div>
          <h3 className={`text-[14px] font-medium ${t.emptyTitle}`}>No group chats yet</h3>
          <p className={`text-[13px] mt-1 max-w-xs mx-auto ${t.emptyDesc}`}>Create one to start chatting with your community.</p>
          <button onClick={() => setShowCreate(true)}
            className={`mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold transition active:scale-[0.98] w-auto ${t.cta}`}>
            <Plus className="w-3.5 h-3.5" /> New chat
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <button key={chat._id} onClick={() => navigate(`/group-chat/${chat._id}`)}
              className={`w-full rounded-lg p-4 text-left flex items-center gap-3 ${t.rowCard} ${t.rowBorder}`}>
              <div className={`w-11 h-11 rounded-md grid place-items-center text-[15px] font-semibold flex-shrink-0 ${t.rowAvatar}`}>
                {chat.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-[13px] font-medium truncate ${t.rowName}`}>{chat.name}</h3>
                  {chat.isOwner && <Crown className={`w-3.5 h-3.5 flex-shrink-0 ${t.crown}`} />}
                </div>
                <p className={`text-[11px] truncate mt-0.5 ${t.rowMeta}`}>
                  {chat.lastMessageText ? `${chat.lastMessageBy}: ${chat.lastMessageText}` : "No messages yet"}
                </p>
              </div>
              <div className={`flex flex-col items-end gap-1 flex-shrink-0 text-[10px] ${t.rowMeta}`}>
                {chat.lastMessageAt && <span className="font-mono tabular-nums">{timeAgo(chat.lastMessageAt)}</span>}
                <span className="flex items-center gap-0.5">
                  <Users className="w-3 h-3" />
                  <span className="font-mono tabular-nums">{chat.members?.length}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateChatModal
          dark={dark}
          name={name} setName={setName}
          desc={desc} setDesc={setDesc}
          pending={createMutation.isPending}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

function CreateChatModal({ dark, name, setName, desc, setDesc, pending, onClose, onCreate }) {
  const t = dark
    ? {
        backdrop: "bg-black/60 backdrop-blur-sm",
        card:     "bg-[#181A22] border border-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
        header:   "border-b border-white/[0.06]",
        title:    "text-white",
        close:    "text-gray-500 hover:text-white hover:bg-white/5",
        label:    "text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]",
        input:    "h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none",
        inputStyle: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
        cancel:   "text-gray-300 hover:text-white hover:bg-white/[0.06]",
        cancelStyle: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
      }
    : {
        backdrop: "bg-black/40 backdrop-blur-sm",
        card:     "bg-white shadow-2xl",
        header:   "border-b border-gray-100",
        title:    "text-gray-800",
        close:    "text-gray-500 hover:bg-gray-100",
        label:    "text-xs font-semibold text-gray-500 uppercase tracking-wider",
        input:    "px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition",
        inputStyle: undefined,
        cancel:   "text-gray-600 hover:bg-gray-100",
        cancelStyle: undefined,
      };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${t.backdrop}`} onClick={onClose}>
      <div className={`rounded-2xl w-full max-w-md overflow-hidden ${t.card}`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-5 py-4 ${t.header}`}>
          <h3 className={`text-[14px] font-medium ${t.title}`}>Create group chat</h3>
          <button onClick={onClose} className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition w-auto ${t.close}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={`block mb-1.5 ${t.label}`} htmlFor="chat-name">Chat name *</label>
            <input id="chat-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Table Tennis Squad"
              className={`w-full ${t.input}`} style={t.inputStyle} autoFocus />
          </div>
          <div>
            <label className={`block mb-1.5 ${t.label}`} htmlFor="description">Description</label>
            <input id="description" type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this chat about?"
              className={`w-full ${t.input}`} style={t.inputStyle} />
          </div>
        </div>
        <div className={`px-5 py-3 flex justify-end gap-2 ${t.header.replace("border-b", "border-t")} ${dark ? "bg-white/[0.02]" : ""}`}>
          <button onClick={onClose}
            className={`h-9 px-3.5 rounded-md text-[13px] font-semibold transition w-auto ${t.cancel}`}
            style={t.cancelStyle}>
            Cancel
          </button>
          <button onClick={onCreate} disabled={!name.trim() || pending}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold rounded-md transition active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-orange-500/30 w-auto">
            {pending ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
