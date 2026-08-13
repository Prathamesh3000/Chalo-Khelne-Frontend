import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../lib";

/**
 * Positions a workspace sidebar: static column on desktop, off-canvas drawer
 * below lg. The five shells each pass their own <aside> contents; nothing about
 * the nav itself changes.
 *
 * Desktop rendering is deliberately identical to what the shells did before —
 * same width, same `flex-shrink-0` — so a laptop sees no difference at all.
 */
export default function SidebarFrame({ open, isDesktop, onClose, width = 200, children }) {
  const panelRef = useRef(null);

  // Esc closes, and focus is trapped while the drawer covers the page. Only
  // applies to the drawer — the desktop column is part of the normal page flow.
  useEffect(() => {
    if (isDesktop || !open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isDesktop, open, onClose]);

  if (isDesktop) {
    return (
      <aside
        className="flex-shrink-0 bg-[#0F1117] flex flex-col"
        style={{ width }}
      >
        {children}
      </aside>
    );
  }

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        ref={panelRef}
        aria-label="Sidebar"
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0F1117] shadow-2xl transition-transform duration-200 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-md text-gray-400 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </aside>
    </>
  );
}
