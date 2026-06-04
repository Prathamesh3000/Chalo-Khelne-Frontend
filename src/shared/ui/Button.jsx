import { forwardRef } from "react";

/**
 * Standardized button component.
 *
 * variant: "primary" | "secondary" | "danger" | "ghost" | "outline"
 * size: "sm" | "md" | "lg"
 */
const VARIANTS = {
  primary: "bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow",
  secondary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow",
  soft: "bg-gray-100 hover:bg-gray-200 text-gray-700",
  danger: "bg-red-500 hover:bg-red-600 text-white shadow-sm",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-600",
  outline: "bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50",
  accent: "bg-amber-400 hover:bg-amber-500 text-gray-900 shadow-sm hover:shadow",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-sm gap-2",
};

const Button = forwardRef(({
  variant = "primary",
  size = "md",
  className = "",
  children,
  loading = false,
  disabled,
  ...props
}, ref) => {
  // `loading` is destructured (not spread to the DOM) so callers like
  // <Button loading={...}/> don't trigger React's
  // "Received `false` for a non-boolean attribute `loading`" warning.
  // While loading, the button is also disabled so it can't be re-clicked.
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-semibold rounded-xl
        transition-all duration-150 active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        w-auto
        ${VARIANTS[variant] || VARIANTS.primary}
        ${SIZES[size] || SIZES.md}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";
export default Button;
