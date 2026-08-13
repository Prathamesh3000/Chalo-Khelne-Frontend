import { X } from "lucide-react";
import { cn } from "../lib/cn";

export function Modal({ open, onClose, title, children, footer, size = "md", className, theme = "light" }) {
  if (!open) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  const baseLight = "relative bg-white rounded-2xl shadow-2xl w-full max-h-[85vh] overflow-hidden";
  const baseDark = "relative bg-[#181A22] rounded-2xl shadow-2xl w-full max-h-[85vh] overflow-hidden border border-white/[0.04]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          theme === "dark" ? baseDark : baseLight,
          sizes[size],
          className
        )}
      >
        {title && (
          <div className={cn("flex items-center justify-between p-5", theme === "dark" ? "border-b border-white/[0.06]" : "border-b border-gray-100") }>
            <h3 className={theme === "dark" ? "text-lg font-bold text-white" : "text-lg font-bold text-gray-900"}>{title}</h3>
            <button
              onClick={onClose}
              className={cn("p-1.5 rounded-lg transition w-auto", theme === "dark" ? "hover:bg-white/[0.02]" : "hover:bg-gray-100")}
              aria-label="Close"
            >
              <X className={theme === "dark" ? "w-4 h-4 text-gray-300" : "w-4 h-4 text-gray-500"} />
            </button>
          </div>
        )}
        <div className={cn("p-5 overflow-y-auto max-h-[calc(85vh-8rem)]", theme === "dark" ? "text-gray-100" : "text-gray-800")}>
          {children}
        </div>
        {footer && (
          <div className={cn("flex gap-3 p-5", theme === "dark" ? "border-t border-white/[0.06] bg-[#0F1115]" : "border-t border-gray-100 bg-gray-50")}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
