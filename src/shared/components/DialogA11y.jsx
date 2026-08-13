import { useEffect, useRef } from "react";

/**
 * Drop-in accessibility for an existing overlay.
 *
 * §9.1: the app has ~125 `fixed inset-0` overlays. `role="dialog"` appeared
 * ONCE and `aria-modal` once. None had a focus trap, focus restore or a scroll
 * lock — Tab from an open modal walked into the page behind it — and Escape was
 * handled twice in the entire application, so 123 of them could only be
 * dismissed by finding and clicking the close control.
 *
 * `shared/components/Modal.jsx` is the right answer for NEW overlays. This
 * exists for the existing ones: rewriting 125 hand-rolled overlays into a
 * common component means restructuring 125 pieces of JSX, each subtly
 * different. Dropping this in as the first child of the backdrop gets every
 * behaviour without touching the markup around it.
 *
 *   <div role="dialog" aria-modal="true" onClick={onClose} className="fixed inset-0 …">
 *     <DialogA11y onClose={onClose} />
 *     <div onClick={(e) => e.stopPropagation()}> … </div>
 *   </div>
 *
 * It renders nothing and operates on its parent element, so it never affects
 * layout.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function DialogA11y({ onClose, autoFocus = true, lockScroll = true }) {
  const anchorRef = useRef(null);

  useEffect(() => {
    const root = anchorRef.current?.parentElement;
    if (!root) return undefined;

    const previouslyFocused = document.activeElement;

    if (autoFocus) {
      // Prefer the first real control; fall back to the container so the
      // screen reader lands inside the dialog rather than back at the page.
      const nodes = root.querySelectorAll(FOCUSABLE);
      if (nodes.length) {
        nodes[0].focus?.();
      } else {
        root.setAttribute("tabindex", "-1");
        root.focus?.();
      }
    }

    let prevOverflow;
    if (lockScroll) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;

      const nodes = Array.from(root.querySelectorAll(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement
      );
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      // Keep Tab inside the dialog. Without this it walks into the page behind,
      // which is what made these overlays unusable by keyboard.
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!root.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    // Captured on document so it works no matter where focus currently sits.
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (lockScroll) document.body.style.overflow = prevOverflow || "";
      // Focus restore — otherwise the user is dumped at the top of the page and
      // has to tab all the way back to whatever opened the dialog.
      previouslyFocused?.focus?.();
    };
  }, [onClose, autoFocus, lockScroll]);

  return <span ref={anchorRef} style={{ display: "none" }} aria-hidden="true" />;
}
