import { useState } from "react";
import { X, Send } from "lucide-react";

/**
 * Modal for creating a new post.
 * Used by Manager and ClubAdmin roles.
 *
 * Props:
 * - isOpen, onClose, onSubmit, loading
 * - dark: boolean (default false) — dark theme variant
 */
export default function CreatePostModal({ isOpen, onClose, onSubmit, loading, dark = false }) {
  const [tournamentName, setTournamentName] = useState("");
  const [caption, setCaption] = useState("");
  const [link, setLink] = useState("");
  const [location, setLocation] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!caption.trim()) return;
    await onSubmit({
      tournamentName,
      caption,
      tags: [],
      location,
      link,
    });
    setTournamentName("");
    setCaption("");
    setLink("");
    setLocation("");
    onClose();
  };

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const t = dark
    ? {
        backdrop:   "bg-black/60 backdrop-blur-sm",
        card:       "bg-[#181A22]",
        cardBorder: "border border-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
        headerBorder: "border-b border-white/[0.06]",
        title:      "text-white",
        closeBtn:   "text-gray-500 hover:text-white hover:bg-white/5",
        label:      "text-gray-500",
        input:      "rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none",
        inputStyle: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
        footerBorder: "border-t border-white/[0.06] bg-white/[0.02]",
        cancelBtn:  "text-gray-300 hover:text-white hover:bg-white/[0.06]",
        cancelStyle: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
      }
    : {
        backdrop:   "bg-black/50",
        card:       "bg-white",
        cardBorder: "shadow-xl",
        headerBorder: "border-b border-gray-100",
        title:      "text-gray-800",
        closeBtn:   "text-gray-500 hover:bg-gray-100",
        label:      "text-gray-700",
        input:      "rounded-xl text-sm border border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none",
        inputStyle: undefined,
        footerBorder: "border-t border-gray-100",
        cancelBtn:  "text-gray-600 hover:bg-gray-100",
        cancelStyle: undefined,
      };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${t.backdrop}`} onClick={onClose}>
      <div
        className={`rounded-2xl w-full max-w-lg overflow-hidden ${t.card} ${t.cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 ${t.headerBorder}`}>
          <h3 className={`text-[14px] font-medium ${t.title}`}>Create post</h3>
          <button onClick={onClose} className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition w-auto ${t.closeBtn}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <Field label="Tournament name" labelClass={t.label} dark={dark}>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="e.g. Pune Open 2026"
              className={`w-full h-9 px-3 ${t.input}`}
              style={t.inputStyle}
            />
          </Field>

          <Field label="Caption *" labelClass={t.label} dark={dark}>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening in sports?"
              rows={3}
              className={`w-full px-3 py-2.5 resize-none ${t.input}`}
              style={t.inputStyle}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Location" labelClass={t.label} dark={dark}>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City"
                className={`w-full h-9 px-3 ${t.input}`}
                style={t.inputStyle}
              />
            </Field>
            <Field label="Link" labelClass={t.label} dark={dark}>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className={`w-full h-9 px-3 ${t.input}`}
                style={t.inputStyle}
              />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 flex justify-end gap-2 ${t.footerBorder}`}>
          <button
            onClick={onClose}
            className={`h-9 px-3.5 rounded-md text-[13px] font-semibold transition active:scale-[0.98] w-auto ${t.cancelBtn}`}
            style={t.cancelStyle}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!caption.trim() || loading}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold shadow-sm shadow-orange-500/30 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-auto"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, labelClass, dark, children }) {
  return (
    <div>
      <label className={`block ${
        dark
          ? "text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5"
          : "text-sm font-medium mb-1"
      } ${labelClass}`}>
        {label}
      </label>
      {children}
    </div>
  );
}
