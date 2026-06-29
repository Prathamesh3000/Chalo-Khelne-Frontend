import { useState, useEffect, useRef } from "react";
import { X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import Avatar from "./Avatar";
import { assetUrl } from "../../shared/lib/assetUrl";

const DURATION = 5000; // ms per story
const STEP = 50;

/**
 * Full-screen story viewer with per-story progress bars and 5s auto-advance.
 *
 * Props:
 * - open, onClose
 * - stories: array for the active group
 * - author: { name, profileImage }
 * - isOwn: boolean — show delete
 * - onDelete: (id) => void
 * - markViewed: (id) => void
 */
export default function StoryViewer({ open, onClose, stories = [], author, isOwn, onDelete, markViewed }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timer = useRef(null);

  useEffect(() => { if (open) { setIndex(0); setProgress(0); } }, [open]);

  const current = stories[index];
  const storyId = current?._id || current?.id;

  useEffect(() => {
    if (!open || !current) return;
    setProgress(0);
    if (storyId) markViewed?.(storyId);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setProgress((p) => {
        const np = p + (STEP / DURATION) * 100;
        if (np >= 100) {
          clearInterval(timer.current);
          setIndex((i) => {
            if (i + 1 < stories.length) return i + 1;
            onClose?.();
            return i;
          });
          return 100;
        }
        return np;
      });
    }, STEP);
    return () => timer.current && clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, storyId]);

  if (!open || !current) return null;

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => {
    if (i + 1 < stories.length) return i + 1;
    onClose?.();
    return i;
  });

  const isImage = current.type === "image" && current.image;

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
      <div className="relative w-full max-w-[420px] h-full sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-black">
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-3 right-3 z-20 flex items-center gap-2.5">
          <Avatar user={author} size={32} dark />
          <span className="text-white text-[13px] font-semibold flex-1 truncate">{author?.name || "User"}</span>
          {isOwn && (
            <button
              onClick={() => { onDelete?.(storyId); onClose?.(); }}
              className="h-8 w-8 inline-flex items-center justify-center rounded-full text-white/80 hover:bg-white/10"
              title="Delete story"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-full text-white/80 hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isImage ? (
          <img src={assetUrl(current.image)} alt="" className="w-full h-full object-contain" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-8 text-center"
            style={{ background: current.bgColor || "#2D3E4E" }}
          >
            <p className="text-white text-[24px] font-semibold leading-snug break-words">{current.text}</p>
          </div>
        )}

        {/* Tap zones */}
        <button onClick={goPrev} className="absolute inset-y-0 left-0 w-1/3 z-10 flex items-center justify-start pl-2 group">
          <ChevronLeft className="w-6 h-6 text-white/0 group-hover:text-white/50 transition" />
        </button>
        <button onClick={goNext} className="absolute inset-y-0 right-0 w-1/3 z-10 flex items-center justify-end pr-2 group">
          <ChevronRight className="w-6 h-6 text-white/0 group-hover:text-white/50 transition" />
        </button>
      </div>
    </div>
  );
}
