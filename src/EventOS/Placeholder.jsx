import { useParams } from "react-router-dom";
import { Construction } from "lucide-react";
import { ALL_ITEMS } from "./nav";

export default function Placeholder() {
  const { view } = useParams();
  const item = ALL_ITEMS.find((i) => i.id === view);
  const Icon = item?.icon || Construction;
  return (
    <div>
      <h1 className="text-[22px] font-black text-white flex items-center gap-2.5">
        <Icon size={22} /> {item?.label || "Module"}
      </h1>
      <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500 mt-4.5" style={{ marginTop: 18 }}>
        <Construction size={40} className="opacity-30 mx-auto mb-3" />
        <div className="text-gray-300 font-semibold">{item?.label || "This module"} — coming in a later phase</div>
        <div className="text-[13px] mt-1.5 max-w-md mx-auto">
          Phase 0 ships the shell + Event Planner. This module is on the roadmap (see ROLES_AND_FLOWS_PLAN.md).
        </div>
      </div>
    </div>
  );
}
