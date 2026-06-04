import { useState, useEffect } from "react";
import assetUrl, { IMAGE_PLACEHOLDER } from "../lib/assetUrl";

/**
 * AppImage — the standard image renderer for the web panel.
 * - Resolves any backend image path via assetUrl (relative OR already-full).
 * - Shows a shimmer skeleton while loading.
 * - Falls back to a placeholder on error (and never loops on a broken fallback).
 *
 * Usage:  <AppImage src={turf.images?.[0]} alt={turf.name} className="turf-thumb" />
 * Pass the RAW backend value as `src` — do NOT pre-build the /uploads path.
 */
export default function AppImage({
  src,
  alt = "",
  fallback = IMAGE_PLACEHOLDER,
  className,
  style,
  imgStyle,
  ...rest
}) {
  const resolved = assetUrl(src, fallback);
  const [current, setCurrent] = useState(resolved);
  const [status, setStatus] = useState("loading"); // loading | loaded | error

  // Re-resolve if the src prop changes.
  useEffect(() => {
    setCurrent(assetUrl(src, fallback));
    setStatus("loading");
  }, [src, fallback]);

  return (
    <span
      className={className}
      style={{ position: "relative", display: "inline-block", overflow: "hidden", ...style }}
    >
      {status === "loading" && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg,#eee 25%,#f5f5f5 37%,#eee 63%)",
            backgroundSize: "400% 100%",
            animation: "appimg-shimmer 1.2s ease-in-out infinite",
            borderRadius: "inherit",
          }}
        />
      )}
      <img
        src={current}
        alt={alt}
        loading="lazy"
        onLoad={() => setStatus("loaded")}
        onError={() => {
          if (current !== fallback) setCurrent(fallback); // swap once
          setStatus("error");
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          borderRadius: "inherit",
          opacity: status === "loaded" || status === "error" ? 1 : 0,
          transition: "opacity .2s ease",
          ...imgStyle,
        }}
        {...rest}
      />
      <style>{`@keyframes appimg-shimmer{0%{background-position:100% 0}100%{background-position:0 0}}`}</style>
    </span>
  );
}
