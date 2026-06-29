import { X } from "lucide-react";

/**
 * Shared overlay modal for the Social module (search, follow lists, profile).
 * Props: open, onClose, title, dark, children, maxWidth (Tailwind class)
 */
export default function SocialModal({ open, onClose, title, dark = false, children, maxWidth = "max-w-md" }) {
  if (!open) return null;
  const t = dark
    ? { card: "bg-[#181A22] border border-white/[0.08]", header: "border-b border-white/[0.06]", title: "text-white", close: "text-gray-500 hover:text-white hover:bg-white/5" }
    : { card: "bg-white shadow-xl", header: "border-b border-gray-100", title: "text-gray-900", close: "text-gray-500 hover:bg-gray-100" };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className={`w-full ${maxWidth} max-h-[85vh] flex flex-col rounded-2xl overflow-hidden ${t.card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-3.5 flex-shrink-0 ${t.header}`}>
          <h3 className={`text-[15px] font-semibold ${t.title}`}>{title}</h3>
          <button onClick={onClose} className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition ${t.close}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-3">{children}</div>
      </div>
    </div>
  );
}
