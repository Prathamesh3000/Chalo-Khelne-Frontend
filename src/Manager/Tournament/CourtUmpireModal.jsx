import { useEffect, useState } from "react";
import { X, Plus, Loader2, AlertCircle, LayoutGrid, Shield } from "lucide-react";
import { toast } from "react-toastify";
import refereeApi from "../../features/referee/refereeApi";

/**
 * CourtUmpireModal — inline court/table ⇆ umpire assignment for the manager,
 * so there's no need to navigate to the separate Courts page just to assign
 * umpires. Lists the tournament's active courts, each with an umpire dropdown
 * (accepted umpires only), plus a quick add-court row. One umpire per court —
 * they officiate every match on it (server: utils/umpireAuth.js path C).
 *
 * Dark-themed to match the TeamKnockouts / Event-OS surface it opens from.
 */
export default function CourtUmpireModal({ isOpen, onClose, tournamentId, onChanged }) {
  const [courts, setCourts] = useState([]);
  const [umpires, setUmpires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (!isOpen || !tournamentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [courtList, applicants] = await Promise.all([
          refereeApi.fetchCourts(tournamentId),
          refereeApi.fetchTournamentApplicants(tournamentId, { includeAll: true }),
        ]);
        if (cancelled) return;
        setCourts((courtList || []).filter((c) => c && c.isActive !== false));
        setUmpires((applicants || []).filter((a) => a.status === "accepted"));
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || e.message || "Failed to load courts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, tournamentId]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const created = await refereeApi.createCourt(tournamentId, { name, type: "table" });
      if (created) {
        setCourts((prev) => [...prev, created]);
        setNewName("");
        onChanged?.();
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to add court");
    } finally {
      setAdding(false);
    }
  };

  const handleAssign = async (court, refereeUserId) => {
    const ump = umpires.find((u) => String(u.referee?.userId) === String(refereeUserId));
    const prev = court.assignedUmpire;
    // Optimistic
    setCourts((cs) => cs.map((c) => (c._id === court._id
      ? { ...c, assignedUmpire: refereeUserId ? { refereeId: refereeUserId, name: ump?.referee?.name || "Assigned" } : { refereeId: null, name: null } }
      : c)));
    setSavingId(court._id);
    try {
      const updated = await refereeApi.assignUmpireToCourt(tournamentId, court._id, refereeUserId || null);
      if (updated) setCourts((cs) => cs.map((c) => (c._id === court._id ? updated : c)));
      onChanged?.();
    } catch (e) {
      setCourts((cs) => cs.map((c) => (c._id === court._id ? { ...c, assignedUmpire: prev } : c)));
      toast.error(e?.response?.data?.message || "Failed to assign umpire");
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#181A22] rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 inline-flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-white leading-tight">Courts &amp; Umpires</h2>
              <p className="text-[11px] text-white/50">Assign one umpire per table — they score every match on it.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-white/10 text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick add */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="Add a table / court (e.g. Table 4)"
              className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white placeholder-white/35 focus:outline-none focus:border-orange-500/60"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || adding}
              className="h-9 px-3 rounded-lg text-[12px] font-semibold text-white inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed w-auto"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
          </div>
        </div>

        {/* Court list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-white/50 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[12px]">Loading courts…</span>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-[12px]">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : courts.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-xl bg-white/5 inline-flex items-center justify-center mb-3">
                <LayoutGrid className="w-5 h-5 text-white/40" />
              </div>
              <p className="text-[14px] font-semibold text-white">No courts yet</p>
              <p className="text-[12px] text-white/50 mt-1">Add a table above to start assigning umpires.</p>
            </div>
          ) : umpires.length === 0 ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-[12px] mb-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>No accepted umpires yet — approve umpires in the Staff Applications tab, then assign them here.</span>
              </div>
              {courts.map((c) => (
                <CourtRow key={c._id} court={c} umpires={umpires} saving={savingId === c._id} onAssign={handleAssign} />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {courts.map((c) => (
                <li key={c._id}>
                  <CourtRow court={c} umpires={umpires} saving={savingId === c._id} onAssign={handleAssign} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg text-[12px] font-semibold text-white bg-white/10 hover:bg-white/15 transition w-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function CourtRow({ court, umpires, saving, onAssign }) {
  const currentId = court.assignedUmpire?.refereeId || "";
  const currentInList = umpires.some((u) => String(u.referee?.userId) === String(currentId));
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
      <div className="w-7 h-7 rounded-lg bg-white/5 inline-flex items-center justify-center flex-shrink-0">
        <Shield className="w-3.5 h-3.5 text-white/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white truncate">{court.name}</p>
        <p className="text-[11px] text-white/45 truncate">
          {court.assignedUmpire?.refereeId ? `Umpire: ${court.assignedUmpire.name || "Assigned"}` : "No umpire assigned"}
        </p>
      </div>
      <div className="relative flex items-center">
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/50 mr-2" />}
        <select
          value={currentId}
          onChange={(e) => onAssign(court, e.target.value || null)}
          disabled={saving}
          className="h-8 px-2 rounded-md bg-[#20222C] border border-white/10 text-[12px] text-white max-w-[160px] focus:outline-none focus:border-orange-500/60 disabled:opacity-50"
        >
          <option value="">— umpire —</option>
          {umpires.map((u) => (
            <option key={u.referee?.userId || u.applicationId} value={u.referee?.userId || ""}>
              {u.referee?.name || "Unknown"}
            </option>
          ))}
          {currentId && !currentInList && (
            <option value={currentId}>{court.assignedUmpire?.name || "Assigned"}</option>
          )}
        </select>
      </div>
    </div>
  );
}
