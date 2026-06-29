import { useState, useRef } from "react";
import { X, Type, Image as ImageIcon } from "lucide-react";

const BG_COLORS = ["#2D3E4E", "#F97316", "#2DA5FF", "#16A34A", "#DB2777", "#7C3AED", "#0F172A", "#DC2626"];

/**
 * Story composer — text or image. Mirrors the mobile composer (bg-color picker
 * for text stories, gallery picker for image stories).
 *
 * Props: open, onClose, onCreateText({text,bgColor,fontFamily}), onCreateImage(file), creating
 */
export default function StoryComposer({ open, onClose, onCreateText, onCreateImage, creating }) {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  if (!open) return null;

  const reset = () => { setText(""); setBgColor(BG_COLORS[0]); setFile(null); setPreview(null); setMode("text"); };
  const close = () => { reset(); onClose?.(); };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    try {
      if (mode === "text") {
        if (!text.trim()) return;
        await onCreateText?.({ text: text.trim(), bgColor, fontFamily: "System" });
      } else {
        if (!file) return;
        await onCreateImage?.(file);
      }
      close();
    } catch {
      /* surfaced by caller */
    }
  };

  const canSubmit = mode === "text" ? !!text.trim() : !!file;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={close}>
      <div className="w-full max-w-sm rounded-2xl bg-[#181A22] border border-white/[0.08] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-[14px] font-semibold text-white">Add to your story</h3>
          <button onClick={close} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 px-4 pt-3">
          {[{ k: "text", Icon: Type, label: "Text" }, { k: "image", Icon: ImageIcon, label: "Photo" }].map(({ k, Icon, label }) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`flex-1 w-auto inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[12px] font-semibold transition ${
                mode === k ? "bg-orange-500 text-white" : "bg-white/[0.05] text-gray-300 hover:bg-white/[0.1]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4">
          {mode === "text" ? (
            <>
              <div
                className="rounded-xl h-44 flex items-center justify-center p-4 mb-3"
                style={{ background: bgColor }}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 200))}
                  placeholder="Type something…"
                  rows={3}
                  className="w-full bg-transparent text-white text-center text-[18px] font-semibold placeholder:text-white/60 resize-none focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition ${bgColor === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2 text-right">{text.length}/200</p>
            </>
          ) : (
            <>
              {preview ? (
                <div className="rounded-xl overflow-hidden mb-3 bg-black flex items-center justify-center h-56">
                  <img src={preview} alt="preview" className="max-h-56 object-contain" />
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-44 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-white/30 mb-3"
                >
                  <ImageIcon className="w-7 h-7" />
                  <span className="text-[12px]">Choose a photo</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
              {preview && (
                <button onClick={() => fileRef.current?.click()} className="text-[12px] text-orange-400 hover:text-orange-300 w-auto">
                  Choose a different photo
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.06] flex justify-end">
          <button
            onClick={submit}
            disabled={!canSubmit || creating}
            className="h-9 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition disabled:opacity-50 w-auto"
          >
            {creating ? "Sharing…" : "Share to story"}
          </button>
        </div>
      </div>
    </div>
  );
}
