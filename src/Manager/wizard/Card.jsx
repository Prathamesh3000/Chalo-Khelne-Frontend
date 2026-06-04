import React from "react";

export default function Card({ children, className = "", as: Tag = "div", ...rest }) {
  return (
    <Tag
      className={`bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
