import { useParams } from "react-router-dom";
import { Hammer } from "lucide-react";
import { ALL_ITEMS } from "./nav";

// Coming-soon placeholder for Club modules not yet built (per-phase rollout).
export default function Placeholder() {
  const { view } = useParams();
  const item = ALL_ITEMS.find((i) => i.id === view);
  const label = item?.label || (view ? view.replace(/-/g, " ") : "Module");

  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
        <Hammer size={26} className="text-emerald-400/70" />
      </div>
      <h1 className="text-[20px] font-black text-white capitalize">{label}</h1>
      <p className="text-gray-500 text-[13px] mt-1.5 max-w-md mx-auto">
        This Club module is part of the facility-business revamp and is being built in a later phase.
      </p>
    </div>
  );
}
