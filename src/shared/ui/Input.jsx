import { forwardRef } from "react";
import { cn } from "../lib/cn";

export const Input = forwardRef(function Input(
  { label, error, leftIcon, rightIcon, className, id, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-gray-500 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full py-2.5 bg-gray-50 border rounded-xl text-sm outline-none transition-all",
            "focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
            leftIcon ? "pl-11" : "pl-4",
            rightIcon ? "pr-11" : "pr-4",
            error ? "border-red-300" : "border-gray-200",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export default Input;
