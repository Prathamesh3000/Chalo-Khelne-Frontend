import React from "react";
import { Switch } from "@mui/material";

const SIG = "#F97316";

export default function ToggleCard({
  icon,
  title,
  description,
  checked,
  onChange,
  className = "",
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 bg-[#181A22] rounded-lg border border-white/[0.06] ${className}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <span className="flex-shrink-0" style={{ color: SIG }}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-white">{title}</div>
          {description && (
            <div className="text-[12px] text-gray-400 mt-0.5">{description}</div>
          )}
        </div>
      </div>
      <Switch
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        sx={{
          "& .MuiSwitch-switchBase.Mui-checked": { color: SIG },
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
            backgroundColor: SIG,
          },
        }}
      />
    </div>
  );
}
