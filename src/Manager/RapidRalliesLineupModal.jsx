// Manager/RapidRalliesLineupModal.jsx
// Manager enters BOTH teams' dynamic picks for a Rapid Rallies tie: the doubles
// partners (rubbers 2 & 4) and the rubber-5 singles player. Options come from
// the server (only legal picks are offered) and narrow live as picks lock.
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { X, Loader2 } from "lucide-react";

const RUBBERS = [
  { setNumber: 2, field: "partner2", title: "Rubber 2 — Doubles", kind: "partner" },
  { setNumber: 4, field: "partner4", title: "Rubber 4 — Doubles", kind: "partner" },
  { setNumber: 5, field: "singles5", title: "Rubber 5 — Singles", kind: "singles" },
];

const ANCHOR = {
  home: { partner2: "P2", partner4: "P1" },
  away: { partner2: "P1", partner4: "P2" },
};

export default function RapidRalliesLineupModal({ open, onClose, matchId, onSaved }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  const load = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/tournaments/team-knockout/matches/${matchId}/rapid-rallies-options`
      );
      if (res.data?.success) setData(res.data.data);
      else toast.error(res.data?.message || "Failed to load lineup options");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load lineup options");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!open) return null;

  const pick = async (side, setNumber, slot) => {
    if (!slot) return;
    const key = `${side}-${setNumber}`;
    setSavingKey(key);
    try {
      const res = await axios.post(
        `/api/tournaments/team-knockout/matches/${matchId}/rapid-rallies-pick`,
        { side, setNumber, slot }
      );
      if (res.data?.success) {
        await load(); // refetch so downstream options narrow
        onSaved?.();
      } else {
        toast.error(res.data?.message || "Invalid pick");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Invalid pick");
    } finally {
      setSavingKey(null);
    }
  };

  const statusOf = (setNumber) =>
    (data?.rubberStatus || []).find((r) => r.setNumber === setNumber)?.status || "PENDING";

  const renderSide = (side) => {
    const sideData = data?.[side];
    if (!sideData) return null;
    const anchorName = (slot) => sideData.slotMap?.[slot] || slot;
    return (
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-gray-200 mb-2 truncate">
          {side === "home" ? "Home · " : "Away · "}
          {sideData.teamName || side}
        </div>
        <div className="space-y-3">
          {RUBBERS.map((rb) => {
            const field = sideData[rb.field] || {};
            const locked = statusOf(rb.setNumber) !== "PENDING";
            const key = `${side}-${rb.setNumber}`;
            return (
              <div key={rb.field}>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  {rb.title}
                  {rb.kind === "partner" && (
                    <span className="text-gray-400 font-normal">
                      {" "}· with {anchorName(ANCHOR[side][rb.field])}
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={field.locked || ""}
                    disabled={locked || savingKey === key}
                    onChange={(e) => pick(side, rb.setNumber, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-gray-200 focus:outline-none focus:border-orange-400 disabled:bg-white/[0.05] disabled:text-gray-500"
                  >
                    <option value="">— select —</option>
                    {(field.options || []).map((o) => (
                      <option key={o.slot} value={o.slot}>
                        {o.name} ({o.slot})
                      </option>
                    ))}
                    {/* keep the locked value visible even if not in current options */}
                    {field.locked && !(field.options || []).some((o) => o.slot === field.locked) && (
                      <option value={field.locked}>
                        {field.lockedName} ({field.locked})
                      </option>
                    )}
                  </select>
                  {savingKey === key && <Loader2 className="w-4 h-4 animate-spin text-orange-500" />}
                  {locked && (
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-[#181A22] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#181A22] rounded-t-2xl">
          <div>
            <h3 className="text-base font-bold text-white">Set lineup</h3>
            <p className="text-xs text-gray-400">Enter both teams' doubles partners & rubber-5 player</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          {loading && !data ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-[11px] text-gray-400 mb-4">
                Only legal picks are shown. Choices narrow so all 5 players end up playing.
                A pick locks once its rubber starts scoring.
              </p>
              <div className="flex flex-col sm:flex-row gap-6">
                {renderSide("home")}
                {renderSide("away")}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06] sticky bottom-0 bg-[#181A22] rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
