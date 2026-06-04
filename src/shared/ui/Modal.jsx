import { X } from "lucide-react";
import { cn } from "../lib/cn";

export function Modal({ open, onClose, title, children, footer, size = "md", className }) {
  if (!open) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative bg-white rounded-2xl shadow-2xl w-full max-h-[85vh] overflow-hidden",
          sizes[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition w-auto"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-8rem)]">{children}</div>
        {footer && (
          <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">{footer}</div>
        )}
      </div>
    </div>
  );
}

export default Modal;
