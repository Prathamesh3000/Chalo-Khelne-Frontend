import { cn } from "../lib";

/**
 * Big uppercase page title. One word can be highlighted with a gradient via
 * the `accent` prop — pass the literal word to gradient-tint, e.g.:
 *   <PageTitle accent="Rohan">Welcome back, Rohan</PageTitle>
 */
const SIZES = {
  sm: "text-2xl sm:text-3xl",
  md: "text-3xl sm:text-4xl",
  lg: "text-4xl sm:text-5xl",
  xl: "text-5xl sm:text-6xl",
};

export function PageTitle({
  children,
  accent,
  size = "md",
  tone = "dark", // "dark" — gray-900 text  |  "light" — white text
  className,
}) {
  const text = typeof children === "string" ? children : "";
  const useAccent = accent && text.includes(accent);

  return (
    <h1
      className={cn(
        "font-black uppercase leading-[0.95] tracking-tight",
        tone === "light" ? "text-white" : "text-gray-900",
        SIZES[size],
        className
      )}
    >
      {useAccent ? (
        <>
          {text.split(accent).map((piece, i, arr) => (
            <span key={i}>
              {piece}
              {i < arr.length - 1 && (
                <span className="bg-gradient-to-br from-orange-500 to-orange-300 bg-clip-text text-transparent">
                  {accent}
                </span>
              )}
            </span>
          ))}
        </>
      ) : (
        children
      )}
    </h1>
  );
}

export default PageTitle;
