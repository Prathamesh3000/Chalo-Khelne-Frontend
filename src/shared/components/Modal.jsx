import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

/**
 * Accessible modal primitive.
 *
 * §9.1: the app had 127 `fixed inset-0` overlays and `role="dialog"` appeared
 * ONCE. None of them had a focus trap, focus restore or a scroll lock, so Tab
 * from an open modal walked into the page behind it, and 125 of 127 could only
 * be dismissed by finding and clicking the close control — Escape was handled
 * twice in the entire application.
 *
 * Everything a dialog owes the user is here so no overlay has to remember it:
 *   • role="dialog" + aria-modal + a labelled title
 *   • focus moves in on open and RETURNS to the trigger on close
 *   • Tab and Shift+Tab cycle inside the dialog
 *   • Escape closes
 *   • the page behind is scroll-locked
 *   • clicking the backdrop closes, clicking the panel does not
 *
 * Use this for new overlays, and migrate existing ones as they are touched.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open = true,
  onClose,
  title,
  children,
  footer,
  /** Set false for a destructive confirm you want deliberately dismissed. */
  closeOnBackdrop = true,
  size = "md",
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;

      // Focus trap: keep Tab inside the dialog instead of letting it walk into
      // the page behind, which is what made these overlays unusable by keyboard.
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;

    // Move focus in, preferring the first control over the panel itself.
    const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
    (nodes && nodes.length ? nodes[0] : panelRef.current)?.focus?.();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
      // Focus restore — without this the user is dumped at the top of the page
      // and has to tab all the way back to whatever opened the dialog.
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };
  const titleId = title ? `modal-title-${String(title).replace(/\W+/g, "-").toLowerCase()}` : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        // mousedown, not click: a click that STARTS inside the panel and ends
        // on the backdrop (a drag-select) must not close the dialog.
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`w-full ${widths[size] || widths.md} rounded-2xl border border-white/[0.08] bg-[#12141A] p-5 shadow-2xl outline-none`}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 id={titleId} className="text-[15px] font-bold text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="w-auto p-1 rounded-lg text-gray-400 hover:bg-white/[0.08] hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {children}

        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
