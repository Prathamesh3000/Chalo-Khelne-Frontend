import { useState, useRef } from "react";
import { Send, Paperclip, X, FileText } from "lucide-react";

/**
 * Props:
 * - onSend, sending
 * - dark: boolean (default false) — render dark variant for Manager / ClubAdmin shells
 */
export default function MessageInput({ onSend, sending, dark = false }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const fileRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() && files.length === 0) return;
    onSend({ text: text.trim(), files: files.length > 0 ? files : undefined });
    setText("");
    setFiles([]);
  };

  const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx));

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const t = dark
    ? {
        wrapper:      "px-4 py-3",
        wrapperStyle: { background: "#0F1117", borderTop: "1px solid rgba(255,255,255,0.06)" },
        attachBtn:    "text-gray-400 hover:text-white hover:bg-white/[0.06]",
        fileTile:     { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
        fileIcon:     "text-gray-400",
        fileLabel:    "text-gray-400",
        input:        "rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none",
        inputStyle:   { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
        send:         "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30",
      }
    : {
        wrapper:      "border-t border-gray-200 bg-white px-4 py-3",
        wrapperStyle: undefined,
        attachBtn:    "text-gray-500 hover:bg-gray-100",
        fileTile:     undefined,
        fileIcon:     "text-gray-400",
        fileLabel:    "text-gray-400",
        input:        "rounded-xl text-sm bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition",
        inputStyle:   undefined,
        send:         "bg-orange-500 hover:bg-orange-700 text-white",
      };

  return (
    <div className={t.wrapper} style={t.wrapperStyle}>
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {files.map((file, i) => (
            <div key={i} className="relative flex-shrink-0">
              {file.type.startsWith("image") ? (
                <img loading="lazy"
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="w-16 h-16 rounded-md object-cover"
                  style={dark ? { border: "1px solid rgba(255,255,255,0.06)" } : { border: "1px solid #e5e7eb" }}
                />
              ) : (
                <div className={`w-16 h-16 rounded-md flex flex-col items-center justify-center ${dark ? "" : "bg-gray-100 border border-gray-200"}`}
                  style={t.fileTile}>
                  <FileText className={`w-5 h-5 ${t.fileIcon}`} />
                  <span className={`text-[8px] mt-0.5 truncate w-14 text-center ${t.fileLabel}`}>{file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition w-auto"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`h-9 w-9 inline-flex items-center justify-center rounded-md transition flex-shrink-0 w-auto ${t.attachBtn}`}
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])}
          className="hidden"
        />

        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message…"
            rows={1}
            className={`w-full px-4 py-2.5 resize-none ${t.input}`}
            style={t.inputStyle}
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && files.length === 0) || sending}
          className={`h-9 w-9 inline-flex items-center justify-center rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 active:scale-[0.95] w-auto ${t.send}`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
