import { useEffect, useRef, useContext, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, UserPlus, Trash2, X, Search, Loader2, RefreshCcw, Crown, AlertTriangle } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useChat, useMessages, useSendMessage, useAddMember, useRemoveMember, useDeleteChat } from "./useGroupChat";
import useRealtimeGroupChat from "./useRealtimeGroupChat";
import groupChatApi from "./groupChatApi";

// MessageBubble/MessageInput moved here when the dead forumChat feature was
// removed (§3.8) — groupChat was their only consumer.
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

/**
 * Props:
 * - dark: boolean (default false) — Manager dark theme
 */
export default function ChatPage({ dark = false }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const userId = auth?._id;
  const bottomRef = useRef(null);

  const { data: chat, isLoading: chatLoading } = useChat(chatId);
  const { data: messages = [], isLoading: msgLoading } = useMessages(chatId);
  const sendMutation = useSendMessage(chatId);
  const addMemberMutation = useAddMember(chatId);
  const removeMemberMutation = useRemoveMember(chatId);
  const deleteMutation = useDeleteChat(userId);

  const isOwner = chat?.createdBy === userId;

  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useRealtimeGroupChat(chatId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const users = await groupChatApi.searchUsers(q);
      const memberIds = (chat?.members || []).map((m) => m.userId);
      setSearchResults(users.filter((u) => !memberIds.includes(u._id)));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleAddMember = async (user) => {
    await addMemberMutation.mutateAsync({ requesterId: userId, userId: user._id, name: user.name, role: user.role });
    setSearchResults(searchResults.filter((u) => u._id !== user._id));
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Remove this member?")) return;
    await removeMemberMutation.mutateAsync({ requesterId: userId, userId: memberId });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ chatId, requesterId: userId });
    navigate("/group-chat");
  };

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const t = dark
    ? {
        // Outer container — let it fill the ManagerShell main area
        outer:        "flex h-[calc(100vh-160px)] -mx-6 -my-6 overflow-hidden",
        // Header bar (the chat's own top strip)
        headerBar:    "bg-[#0F1117] px-4 py-3 flex items-center gap-3 flex-shrink-0",
        headerBorder: { borderBottom: "1px solid rgba(255,255,255,0.06)" },
        headerBack:   "text-gray-400 hover:text-white hover:bg-white/[0.04]",
        headerTitle:  "text-white",
        headerMeta:   "text-gray-500",
        crown:        "text-orange-400",
        ctaPrimary:   "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30",
        ctaDelete:    "text-gray-500 hover:text-red-400 hover:bg-red-500/10",
        toggleBg:     "bg-orange-500 text-white",
        toggleIdle:   "text-gray-400 hover:text-white hover:bg-white/[0.04]",
        messagesBg:   "bg-[#0F1117]",
        emptyText:    "text-gray-500",
        // Members sidebar
        sidebar:      "w-72 bg-[#181A22] flex flex-col flex-shrink-0",
        sidebarBorder: { borderLeft: "1px solid rgba(255,255,255,0.06)" },
        sidebarHeaderBorder: "border-b border-white/[0.06]",
        sidebarTitle: "text-white",
        sidebarRowHover: "hover:bg-white/[0.04]",
        sidebarAvatar: "bg-orange-500/15 text-orange-400",
        memberName:   "text-white",
        memberMeta:   "text-gray-500",
        roleBadge:    "bg-white/[0.06] text-gray-300",
        removeBtn:    "text-gray-500 hover:text-red-400 hover:bg-red-500/10",
        sidebarFooterBorder: "border-t border-white/[0.06]",
        // Modal
        modalBackdrop:   "bg-black/60 backdrop-blur-sm",
        modalCard:       "bg-[#181A22]",
        modalCardBorder: "border border-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
        modalHeaderBorder: "border-b border-white/[0.06]",
        modalTitle:      "text-white",
        modalClose:      "text-gray-500 hover:text-white hover:bg-white/5",
        modalSubtle:     "text-gray-400",
        modalDanger:     "text-red-300",
        modalDangerBg:   "bg-red-500/15",
        modalSearchInput: "h-9 px-3 pl-9 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none",
        modalSearchStyle: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
        modalRow:        "hover:bg-white/[0.04]",
        modalCancel:     "text-gray-300 hover:text-white hover:bg-white/[0.06]",
        modalCancelStyle: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
      }
    : {
        outer:        "flex h-[calc(100vh-64px)]",
        headerBar:    "bg-white px-4 py-3 flex items-center gap-3 flex-shrink-0 border-b border-gray-200",
        headerBorder: undefined,
        headerBack:   "text-gray-500 hover:bg-gray-100",
        headerTitle:  "text-gray-800",
        headerMeta:   "text-gray-400",
        crown:        "text-orange-500",
        ctaPrimary:   "bg-orange-500 hover:bg-orange-700 text-white",
        ctaDelete:    "text-gray-400 hover:text-red-500 hover:bg-red-50",
        toggleBg:     "bg-orange-500 text-white",
        toggleIdle:   "text-gray-500 hover:bg-gray-100",
        messagesBg:   "bg-[#F5F7FA]",
        emptyText:    "text-gray-400",
        sidebar:      "w-72 bg-white flex flex-col flex-shrink-0 border-l border-gray-200",
        sidebarBorder: undefined,
        sidebarHeaderBorder: "border-b border-gray-100",
        sidebarTitle: "text-gray-800",
        sidebarRowHover: "hover:bg-gray-50",
        sidebarAvatar: "bg-gradient-to-br from-orange-500 to-[#2DA5FF] text-white",
        memberName:   "text-gray-800",
        memberMeta:   "text-gray-400",
        roleBadge:    "bg-gray-100 text-gray-400",
        removeBtn:    "text-gray-300 hover:text-red-500 hover:bg-red-50",
        sidebarFooterBorder: "border-t border-gray-100",
        modalBackdrop:   "bg-black/40 backdrop-blur-sm",
        modalCard:       "bg-white",
        modalCardBorder: "shadow-2xl",
        modalHeaderBorder: "border-b border-gray-100",
        modalTitle:      "text-gray-800",
        modalClose:      "text-gray-500 hover:bg-gray-100",
        modalSubtle:     "text-gray-500",
        modalDanger:     "text-red-500",
        modalDangerBg:   "bg-red-100",
        modalSearchInput: "px-4 py-2.5 pl-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition",
        modalSearchStyle: undefined,
        modalRow:        "hover:bg-gray-50",
        modalCancel:     "text-gray-600 hover:bg-gray-100",
        modalCancelStyle: undefined,
      };

  if (chatLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCcw className={`w-6 h-6 animate-spin ${dark ? "text-gray-500" : "text-gray-400"}`} />
      </div>
    );
  }
  if (!chat) {
    return (
      <div className="p-8 text-center">
        <p className={`font-semibold ${dark ? "text-red-300" : "text-red-500"}`}>Chat not found</p>
      </div>
    );
  }

  const handleSend = ({ text, files }) => {
    sendMutation.mutate({ senderId: userId, senderName: auth?.name || "User", senderRole: auth?.role || "Player", text, files });
  };

  return (
    <div className={t.outer}>
      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className={t.headerBar} style={t.headerBorder}>
          <button onClick={() => navigate("/group-chat")}
            className={`h-9 w-9 inline-flex items-center justify-center rounded-md transition w-auto ${t.headerBack}`}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className={`text-[14px] font-medium truncate ${t.headerTitle}`}>{chat.name}</h2>
              {isOwner && <Crown className={`w-3.5 h-3.5 flex-shrink-0 ${t.crown}`} />}
            </div>
            <p className={`text-[11px] ${t.headerMeta}`}>
              <span className="font-mono tabular-nums">{chat.members?.length || 0}</span> members
              {isOwner && " · You own this chat"}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {isOwner && (
              <>
                <button onClick={() => setShowAddMember(true)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold transition w-auto ${t.ctaPrimary}`}>
                  <UserPlus className="w-3.5 h-3.5" /> Add
                </button>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition w-auto ${t.ctaDelete}`}
                  title="Delete chat">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button onClick={() => setShowMembers(!showMembers)}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition w-auto ${
                showMembers ? t.toggleBg : t.toggleIdle
              }`}>
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto px-4 py-4 ${t.messagesBg}`}>
          {msgLoading ? (
            <div className={`text-center py-8 ${t.emptyText}`}>Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className={`text-center py-16 ${t.emptyText}`}>
              <p className="text-[13px] font-medium">No messages yet</p>
              <p className="text-[12px] mt-1">Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg._id} message={msg} isOwn={msg.senderId === userId} dark={dark} />
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <MessageInput onSend={handleSend} sending={sendMutation.isPending} dark={dark} />
      </div>

      {/* Members sidebar */}
      {showMembers && (
        <div className={t.sidebar} style={t.sidebarBorder}>
          <div className={`px-4 py-3 flex items-center justify-between ${t.sidebarHeaderBorder}`}>
            <h3 className={`text-[13px] font-medium ${t.sidebarTitle}`}>
              Members (<span className="font-mono tabular-nums">{chat.members?.length || 0}</span>)
            </h3>
            <button onClick={() => setShowMembers(false)}
              className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition w-auto ${
                dark ? "text-gray-500 hover:text-white hover:bg-white/5" : "text-gray-400 hover:bg-gray-100"
              }`}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {(chat.members || []).map((member) => (
              <div key={member.userId} className={`flex items-center justify-between p-2 rounded-md transition group ${t.sidebarRowHover}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold flex-shrink-0 ${t.sidebarAvatar}`}>
                    {member.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className={`text-[13px] font-medium truncate ${t.memberName}`}>{member.name}</p>
                      {member.userId === chat.createdBy && <Crown className={`w-3 h-3 flex-shrink-0 ${t.crown}`} />}
                    </div>
                    <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded capitalize mt-0.5 ${t.roleBadge}`}>
                      {member.role}
                    </span>
                  </div>
                </div>
                {isOwner && member.userId !== chat.createdBy && (
                  <button onClick={() => handleRemoveMember(member.userId)}
                    className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition opacity-0 group-hover:opacity-100 w-auto ${t.removeBtn}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {isOwner && (
            <div className={`p-3 ${t.sidebarFooterBorder}`}>
              <button onClick={() => setShowAddMember(true)}
                className={`w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-[12px] font-semibold transition w-auto ${t.ctaPrimary}`}>
                <UserPlus className="w-3.5 h-3.5" /> Add member
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${t.modalBackdrop}`} onClick={() => { setShowAddMember(false); setSearchQuery(""); setSearchResults([]); }}>
          <div className={`rounded-2xl w-full max-w-md overflow-hidden ${t.modalCard} ${t.modalCardBorder}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 ${t.modalHeaderBorder}`}>
              <h3 className={`text-[14px] font-medium ${t.modalTitle}`}>Add member</h3>
              <button onClick={() => { setShowAddMember(false); setSearchQuery(""); setSearchResults([]); }}
                className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition w-auto ${t.modalClose}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="relative mb-3">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${dark ? "text-gray-500" : "text-gray-400"}`} />
                <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Search by name…" autoFocus
                  className={`w-full ${t.modalSearchInput}`} style={t.modalSearchStyle} />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {searching && (
                  <div className="text-center py-4">
                    <Loader2 className={`w-4 h-4 animate-spin mx-auto ${dark ? "text-gray-500" : "text-gray-400"}`} />
                  </div>
                )}
                {!searching && searchQuery.length >= 1 && searchResults.length === 0 && (
                  <p className={`text-center text-[12px] py-4 ${t.modalSubtle}`}>No users found</p>
                )}
                {searchResults.map((user) => (
                  <div key={user._id} className={`flex items-center justify-between p-2.5 rounded-md transition ${t.modalRow}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold flex-shrink-0 ${t.sidebarAvatar}`}>
                        {(user.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-medium truncate ${t.memberName}`}>{user.name}</p>
                        <p className={`text-[10px] truncate ${t.memberMeta}`}>{user.role}{user.email && ` · ${user.email}`}</p>
                      </div>
                    </div>
                    <button onClick={() => handleAddMember(user)} disabled={addMemberMutation.isPending}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-semibold transition disabled:opacity-50 w-auto ${t.ctaPrimary}`}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${t.modalBackdrop}`} onClick={() => setShowDeleteConfirm(false)}>
          <div className={`rounded-2xl w-full max-w-sm p-6 text-center ${t.modalCard} ${t.modalCardBorder}`} onClick={(e) => e.stopPropagation()}>
            <div className={`w-12 h-12 rounded-full grid place-items-center mx-auto mb-3 ${t.modalDangerBg}`}>
              <AlertTriangle className={`w-6 h-6 ${t.modalDanger}`} />
            </div>
            <h3 className={`text-[14px] font-medium mb-1.5 ${t.modalTitle}`}>Delete chat?</h3>
            <p className={`text-[12px] mb-5 ${t.modalSubtle}`}>
              This will permanently delete the chat and all <span className="font-mono tabular-nums">{chat.messageCount || 0}</span> messages. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowDeleteConfirm(false)}
                className={`h-9 px-3.5 rounded-md text-[13px] font-semibold transition w-auto ${t.modalCancel}`}
                style={t.modalCancelStyle}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteMutation.isPending}
                className="h-9 px-3.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold rounded-md transition active:scale-[0.98] disabled:opacity-50 w-auto">
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
