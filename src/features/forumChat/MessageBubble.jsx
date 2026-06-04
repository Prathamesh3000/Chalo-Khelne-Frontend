import { FileText, Download, Eye } from "lucide-react";

/**
 * Props:
 * - message, isOwn
 * - dark: boolean (default false) — render dark variant for Manager / ClubAdmin shells
 */
export default function MessageBubble({ message, isOwn, dark = false }) {
  const timeStr = new Date(message.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const t = dark
    ? {
        nameText:    "text-gray-200",
        roleBadge:   "text-orange-400 bg-orange-500/15",
        bubbleOther: "bg-[#181A22] text-gray-200",
        bubbleOtherStyle: { border: "1px solid rgba(255,255,255,0.06)" },
        timeOther:   "text-gray-500",
        attachOtherBorder: "border-white/[0.06]",
      }
    : {
        nameText:    "text-gray-700",
        roleBadge:   "text-orange-500 bg-orange-500/10",
        bubbleOther: "bg-white border border-gray-200 text-gray-800",
        bubbleOtherStyle: undefined,
        timeOther:   "text-gray-400",
        attachOtherBorder: "border-gray-100",
      };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name (not own) */}
        {!isOwn && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className={`text-xs font-bold ${t.nameText}`}>{message.senderName}</span>
            <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${t.roleBadge}`}>{message.senderRole}</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isOwn
              ? "bg-orange-500 text-white rounded-br-md"
              : `${t.bubbleOther} rounded-bl-md`
          }`}
          style={isOwn ? undefined : t.bubbleOtherStyle}
        >
          {message.text && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
          )}

          {message.attachments?.length > 0 && (
            <div className={`${message.text ? "mt-2 pt-2 border-t" : ""} ${isOwn ? "border-white/20" : t.attachOtherBorder} space-y-1.5`}>
              {message.attachments.map((att, i) => (
                <AttachmentPreview key={i} attachment={att} isOwn={isOwn} dark={dark} />
              ))}
            </div>
          )}

          <p className={`text-[10px] mt-1 ${isOwn ? "text-white/60" : t.timeOther} text-right`}>
            {timeStr}
          </p>
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment, isOwn, dark }) {
  const mimeType = (attachment.type || "").toLowerCase();
  const isImage = mimeType.startsWith("image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.name || "");
  const isPdf = mimeType.includes("pdf") || /\.pdf$/i.test(attachment.name || "");
  const fileUrl = attachment.url?.startsWith("http") ? attachment.url : `${window.location.origin}/${attachment.url}`;

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.name || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(fileUrl, "_blank");
    }
  };

  // Token map per (isOwn, dark) — own messages always orange so they read on dark or light page
  const fileTile = isOwn
    ? "bg-white/10"
    : dark
      ? "bg-white/[0.04]"
      : "bg-gray-50";
  const fileTileStyle = !isOwn && dark ? { border: "1px solid rgba(255,255,255,0.06)" } : undefined;
  const subText = isOwn
    ? "text-white/50"
    : dark
      ? "text-gray-500"
      : "text-gray-400";

  if (isImage) {
    return (
      <div className="relative group">
        <img src={fileUrl} alt={attachment.name} className="max-w-[240px] rounded-xl object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-xl transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 bg-white/90 rounded-full hover:bg-white transition w-auto" title="View">
            <Eye className="w-4 h-4 text-gray-700" />
          </a>
          <button onClick={handleDownload}
            className="p-2 bg-white/90 rounded-full hover:bg-white transition w-auto" title="Download">
            <Download className="w-4 h-4 text-gray-700" />
          </button>
        </div>
        {attachment.name && (
          <p className={`text-[10px] mt-1 truncate ${subText}`}>{attachment.name}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${fileTile}`} style={fileTileStyle}>
      <FileText className={`w-5 h-5 flex-shrink-0 ${isPdf ? "text-red-400" : "text-blue-400"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{attachment.name || "File"}</p>
        {attachment.size > 0 && (
          <p className={`text-[10px] ${subText}`}>
            {attachment.size > 1048576 ? `${(attachment.size / 1048576).toFixed(1)} MB` : `${(attachment.size / 1024).toFixed(0)} KB`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
          className={`p-1.5 rounded-lg transition w-auto ${isOwn ? "hover:bg-white/20" : dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-200"}`} title="View">
          <Eye className="w-3.5 h-3.5" />
        </a>
        <button onClick={handleDownload}
          className={`p-1.5 rounded-lg transition w-auto ${isOwn ? "hover:bg-white/20" : dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-200"}`} title="Download">
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
