import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { LayoutGrid, Plus, Trash2, Check, X, Pencil, Undo2, AlertTriangle, Upload, Shuffle } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import useTournament from "./useTournament";
import Breadcrumbs from "./Breadcrumbs";
import TournamentStepper from "./TournamentStepper";
import refereeApi from "../../features/referee/refereeApi";

const SIG = "#5E6AD2";

// Preset court-type options with a "Custom..." escape hatch (Q3 = preset dropdown).
// `value` is what gets stored on the server; "Other" triggers a free-text input
// on the same row. "" = no type selected (sent as null on the server).
const TYPE_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "table", label: "Table" },
  { value: "court", label: "Court" },
  { value: "lawn", label: "Lawn" },
];
const PRESET_VALUES = new Set(TYPE_OPTIONS.map((o) => o.value));

const ENDPOINT = (tournamentId, suffix = "") =>
  `/api/tournaments/${tournamentId}/courts${suffix}`;

export default function CourtsPage() {
  const { tournamentId } = useParams();
  const { title, currentStage } = useTournament(tournamentId);

  // Full court list (active + inactive). Components below derive views from this.
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRetired, setShowRetired] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Sub-step 6 — utilization summary (per-court status counts + unassigned).
  // Auto-refreshed after every catalog mutation (Q4) so counts stay in sync.
  const [utilization, setUtilization] = useState({ courts: [], unassigned: { all: 0 } });

  // Accepted umpires available to assign to courts (one umpire per court).
  const [umpires, setUmpires] = useState([]);
  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    (async () => {
      try {
        const all = await refereeApi.fetchTournamentApplicants(tournamentId, { includeAll: true });
        if (!cancelled) setUmpires((all || []).filter((a) => a.status === "accepted"));
      } catch { /* non-fatal — the umpire dropdown just stays empty */ }
    })();
    return () => { cancelled = true; };
  }, [tournamentId]);

  const assignUmpireToCourt = async (courtId, refereeUserId) => {
    const before = courts.find((c) => c._id === courtId);
    const ump = umpires.find((u) => String(u.referee?.userId) === String(refereeUserId));
    // Optimistic (mirrors patchCourt): update UI, roll back on failure.
    setCourts((prev) => prev.map((c) => (c._id === courtId
      ? { ...c, assignedUmpire: refereeUserId
          ? { refereeId: refereeUserId, name: ump?.referee?.name || "Assigned" }
          : { refereeId: null, name: null } }
      : c)));
    try {
      const res = await axios.patch(ENDPOINT(tournamentId, `/${courtId}/umpire`), {
        refereeUserId: refereeUserId || null,
      });
      if (res.data?.court) {
        setCourts((prev) => prev.map((c) => (c._id === courtId ? res.data.court : c)));
      }
    } catch (e) {
      if (before) setCourts((prev) => prev.map((c) => (c._id === courtId ? before : c)));
      toast.error(e?.response?.data?.message || "Failed to assign umpire to court");
    }
  };

  // Round-robin existing matches across the active courts. Fixes the common
  // "created courts after generating fixtures" case where matches carry a
  // legacy court label that doesn't match the catalog names.
  const [distributing, setDistributing] = useState(false);
  const distributeMatches = async () => {
    if (distributing) return;
    setDistributing(true);
    try {
      const res = await axios.post(ENDPOINT(tournamentId, "/distribute"), {
        onlyUnassigned: true,
        includeCompleted: false,
      });
      const n = res.data?.totalUpdated || 0;
      if (n > 0) toast.success(res.data?.message || `Distributed ${n} matches across courts`);
      else toast.info(res.data?.message || "Nothing to distribute");
      refreshUtilization();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to distribute matches");
    } finally {
      setDistributing(false);
    }
  };

  const refreshUtilization = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await axios.get(ENDPOINT(tournamentId, "/utilization"));
      setUtilization(res.data || { courts: [], unassigned: { all: 0 } });
    } catch (err) {
      // Silent failure — utilization is supplementary; don't disrupt the page.
      console.error("Failed to load utilization:", err);
    }
  }, [tournamentId]);

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tournamentId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(ENDPOINT(tournamentId, "?includeInactive=true"));
        setCourts(res.data?.courts || []);
      } catch (err) {
        console.error("Error fetching courts:", err);
        toast.error("Failed to load courts");
      } finally {
        setLoading(false);
      }
    })();
    refreshUtilization();
  }, [tournamentId, refreshUtilization]);

  // ── Mutations (optimistic with rollback) ───────────────────────────────
  // Add: create the row optimistically with a placeholder _id, replace on
  // success, remove on failure.
  const addCourt = async ({ name, type }) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) {
      toast.warn("Court name is required");
      return false;
    }
    const tempId = `_pending_${Date.now()}`;
    const optimistic = {
      _id: tempId,
      name: trimmed,
      type: type || null,
      sportId: null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setCourts((prev) => [...prev, optimistic]);
    try {
      const res = await axios.post(ENDPOINT(tournamentId), {
        name: trimmed,
        type: type || null,
      });
      const created = res.data?.court;
      setCourts((prev) => prev.map((c) => (c._id === tempId ? created : c)));
      refreshUtilization(); // Sub-step 6 — keep counts in sync
      return true;
    } catch (err) {
      setCourts((prev) => prev.filter((c) => c._id !== tempId));
      const msg = err.response?.data?.message || err.message || "Failed to add court";
      toast.error(msg);
      return false;
    }
  };

  // Bulk add: parses lines into name objects, posts to the bulk endpoint,
  // appends created rows to local state, and surfaces skipped rows so the
  // manager can fix duplicates / empties without losing context.
  const bulkAddCourts = async ({ names, type }) => {
    const payload = (names || []).map((n) => ({ name: n, type: type || null }));
    if (payload.length === 0) {
      toast.warn("Add at least one court name");
      return { created: [], skipped: [] };
    }
    try {
      const res = await axios.post(ENDPOINT(tournamentId, "/bulk"), {
        courts: payload,
        sportId: null,
      });
      const created = res.data?.created || [];
      const skipped = res.data?.skipped || [];
      if (created.length > 0) {
        setCourts((prev) => [...prev, ...created]);
        refreshUtilization();
      }
      if (created.length > 0 && skipped.length === 0) {
        toast.success(`${created.length} court${created.length === 1 ? "" : "s"} added`);
      } else if (created.length > 0 && skipped.length > 0) {
        toast.info(`${created.length} added · ${skipped.length} skipped`);
      } else if (created.length === 0 && skipped.length > 0) {
        toast.warn("No courts added — all rows were skipped");
      }
      return { created, skipped };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Bulk add failed";
      toast.error(msg);
      return { created: [], skipped: [] };
    }
  };

  // Generic patch: rename, type change, isActive toggle.
  const patchCourt = async (courtId, patch, { successToast } = {}) => {
    const before = courts.find((c) => c._id === courtId);
    if (!before) return;
    setCourts((prev) => prev.map((c) => (c._id === courtId ? { ...c, ...patch } : c)));
    try {
      const res = await axios.put(ENDPOINT(tournamentId, `/${courtId}`), patch);
      const updated = res.data?.court;
      if (updated) {
        setCourts((prev) => prev.map((c) => (c._id === courtId ? updated : c)));
      }
      // Rename or isActive toggle changes per-court bucketing — refresh.
      // Type-only changes don't, but the cost is one cheap query.
      refreshUtilization();
      if (successToast) toast.info(successToast);
    } catch (err) {
      setCourts((prev) => prev.map((c) => (c._id === courtId ? before : c)));
      const msg = err.response?.data?.message || err.message || "Failed to update court";
      toast.error(msg);
    }
  };

  // Soft-delete: optimistic isActive=false; keep doc in state so the
  // "retired" section can show it (and reactivate works).
  const softDeleteCourt = async (courtId) => {
    const before = courts.find((c) => c._id === courtId);
    if (!before) return;
    setCourts((prev) =>
      prev.map((c) => (c._id === courtId ? { ...c, isActive: false } : c))
    );
    try {
      await axios.delete(ENDPOINT(tournamentId, `/${courtId}`));
      toast.info(`"${before.name}" retired. Past matches keep the name; new generations skip it.`);
      refreshUtilization(); // matches now move to the unassigned bucket
    } catch (err) {
      setCourts((prev) => prev.map((c) => (c._id === courtId ? before : c)));
      toast.error(err.response?.data?.message || "Failed to retire court");
    }
  };

  const reactivateCourt = (courtId) =>
    patchCourt(courtId, { isActive: true }, { successToast: "Court reactivated" });

  // ── Derived views ──────────────────────────────────────────────────────
  const activeCourts = courts.filter((c) => c.isActive !== false);
  const retiredCourts = courts.filter((c) => c.isActive === false);

  return (
    <div className="p-6 max-w-[1320px] mx-auto">
      <Breadcrumbs tournamentName={title} />
      <TournamentStepper currentStage={currentStage} />

      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-neutral-900">
            Courts
          </h1>
          <p className="text-[12px] text-neutral-500 mt-1">
            {loading
              ? "Loading…"
              : `${activeCourts.length} active${
                  retiredCourts.length > 0 ? ` · ${retiredCourts.length} retired` : ""
                }`}
          </p>
        </div>
      </div>

      {/* Always-visible add form + bulk trigger */}
      <div className="flex items-stretch gap-2 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <AddCourtForm onAdd={addCourt} disabled={loading} />
        </div>
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          disabled={loading}
          className="h-auto px-4 rounded-xl border border-neutral-200 bg-white text-[12px] font-semibold text-neutral-700 inline-flex items-center gap-1.5 hover:border-[#5E6AD2] hover:text-[#5E6AD2] transition disabled:opacity-50 disabled:cursor-not-allowed w-auto"
          title="Bulk add multiple courts at once"
        >
          <Upload className="w-3.5 h-3.5" />
          Bulk add
        </button>
      </div>

      {/* Bulk add modal */}
      {bulkOpen && (
        <BulkAddModal
          onClose={() => setBulkOpen(false)}
          onSubmit={bulkAddCourts}
        />
      )}

      {/* Empty state below the form */}
      {!loading && courts.length === 0 && <EmptyState />}

      {/* Active list */}
      {!loading && activeCourts.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mt-4">
          <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
              Active
            </h2>
            <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
              {activeCourts.length}
            </span>
          </div>
          <ul className="divide-y divide-neutral-100">
            {activeCourts.map((court) => (
              <CourtRow
                key={court._id}
                court={court}
                umpires={umpires}
                onAssignUmpire={(refId) => assignUmpireToCourt(court._id, refId)}
                onRename={(newName) => patchCourt(court._id, { name: newName })}
                onTypeChange={(newType) => patchCourt(court._id, { type: newType || null })}
                onSoftDelete={() => softDeleteCourt(court._id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Retired toggle + list */}
      {!loading && retiredCourts.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowRetired((v) => !v)}
            className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1.5 transition w-auto bg-transparent"
          >
            {showRetired ? "Hide" : "Show"} {retiredCourts.length} retired
          </button>

          {showRetired && (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mt-2 opacity-90">
              <div className="px-4 py-2.5 border-b border-neutral-100">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                  Retired
                </h2>
              </div>
              <ul className="divide-y divide-neutral-100">
                {retiredCourts.map((court) => (
                  <RetiredRow
                    key={court._id}
                    court={court}
                    onReactivate={() => reactivateCourt(court._id)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Sub-step 6 — Utilization summary. Hidden when no active courts.
          Active-court catalog is required for the per-court bucket math
          to make sense; orphan-only state is handled by the unassigned
          row inside the section. */}
      {!loading && activeCourts.length > 0 && (
        <UtilizationSection
          utilization={utilization}
          onDistribute={distributeMatches}
          distributing={distributing}
          hasActiveCourts={activeCourts.length > 0}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// AddCourtForm — always at the top. Keeps focus on the name input after a
// successful add so the manager can rapid-fire several entries.
// ────────────────────────────────────────────────────────────────────────────
function AddCourtForm({ onAdd, disabled }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [customType, setCustomType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef(null);

  const usingCustom = type === "_other";
  const resolvedType = usingCustom ? String(customType || "").trim() : type;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (submitting || disabled) return;
    if (!name.trim()) return;
    setSubmitting(true);
    const ok = await onAdd({ name, type: resolvedType });
    setSubmitting(false);
    if (ok) {
      setName("");
      setCustomType("");
      // Keep type selection — managers often add several courts of the same type.
      nameRef.current?.focus();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center gap-2 flex-wrap"
    >
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Court name (e.g. Court 1, Table A)"
        disabled={disabled || submitting}
        className="flex-1 min-w-[180px] h-9 px-3 rounded-lg border border-neutral-200 bg-neutral-50 text-[13px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/20 transition"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        disabled={disabled || submitting}
        className="h-9 px-2.5 rounded-lg border border-neutral-200 bg-white text-[13px] text-neutral-700 focus:outline-none focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/20 transition"
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value || "none"} value={opt.value}>
            {opt.label}
          </option>
        ))}
        <option value="_other">Other…</option>
      </select>
      {usingCustom && (
        <input
          type="text"
          value={customType}
          onChange={(e) => setCustomType(e.target.value)}
          placeholder="Custom type"
          disabled={disabled || submitting}
          className="w-32 h-9 px-3 rounded-lg border border-neutral-200 bg-neutral-50 text-[13px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/20 transition"
        />
      )}
      <button
        type="submit"
        disabled={disabled || submitting || !name.trim()}
        className="h-9 px-4 rounded-lg text-[12px] font-semibold text-white inline-flex items-center gap-1.5 transition disabled:cursor-not-allowed disabled:bg-neutral-300 w-auto"
        style={{ backgroundColor: name.trim() && !submitting && !disabled ? SIG : undefined }}
      >
        <Plus className="w-3.5 h-3.5" />
        {submitting ? "Adding…" : "Add"}
      </button>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// EmptyState — first-launch experience. Lives BELOW the Add form so the
// manager can act on the call-to-action without scrolling or clicking through.
// ────────────────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="bg-white border border-dashed border-neutral-200 rounded-xl p-8 mt-4 text-center">
      <LayoutGrid className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
      <p className="text-[14px] font-semibold text-neutral-900">No courts set up yet</p>
      <p className="text-[12px] text-neutral-500 mt-1.5 max-w-md mx-auto">
        Add your first court to enable auto-distribution of matches across multiple
        courts. Without courts, match generation will continue to use a single-court
        input.
      </p>
      <p className="text-[11px] text-neutral-400 mt-3">↑ Add a court above to get started</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CourtRow — one active court. Inline rename (click name → input, Enter to
// save, Esc to cancel). Type dropdown saves on change. Trash icon soft-deletes.
// ────────────────────────────────────────────────────────────────────────────
function CourtRow({ court, umpires = [], onAssignUmpire, onRename, onTypeChange, onSoftDelete }) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(court.name);
  const [usingCustomType, setUsingCustomType] = useState(
    court.type != null && !PRESET_VALUES.has(court.type)
  );
  const inputRef = useRef(null);

  // When entering edit mode, focus + select the input contents.
  useEffect(() => {
    if (editing) {
      // Defer to next tick — input may not be mounted yet.
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [editing]);

  const startEdit = () => {
    setDraftName(court.name);
    setEditing(true);
  };

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === court.name) {
      setEditing(false);
      return;
    }
    onRename(trimmed);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraftName(court.name);
    setEditing(false);
  };

  // Type dropdown value: preset OR "_other" when current value isn't in presets.
  const dropdownValue = usingCustomType ? "_other" : court.type || "";

  const handleTypeChange = (e) => {
    const v = e.target.value;
    if (v === "_other") {
      setUsingCustomType(true);
      // Don't change court.type yet; wait for the custom-text blur/Enter.
      return;
    }
    setUsingCustomType(false);
    onTypeChange(v);
  };

  const handleCustomTypeBlur = (e) => {
    const v = String(e.target.value || "").trim();
    if (!v) {
      // User cleared the custom field — fall back to None.
      setUsingCustomType(false);
      onTypeChange("");
      return;
    }
    if (v !== court.type) onTypeChange(v);
  };

  return (
    <li className="px-4 py-2.5 flex items-center gap-3 hover:bg-neutral-50/60 transition">
      {/* Name (click to edit) */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
            className="w-full h-8 px-2 rounded-md border border-[#5E6AD2] bg-white text-[13px] font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/20"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-900 hover:text-[#5E6AD2] transition w-auto bg-transparent"
            title="Click to rename"
          >
            <span className="truncate">{court.name}</span>
            <Pencil className="w-3 h-3 text-neutral-400 hover:text-[#5E6AD2] transition" />
          </button>
        )}
      </div>

      {/* Type dropdown (+ custom text input when "Other") */}
      <div className="flex items-center gap-2">
        <select
          value={dropdownValue}
          onChange={handleTypeChange}
          className="h-8 px-2 rounded-md border border-neutral-200 bg-white text-[12px] text-neutral-700 focus:outline-none focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/20 transition"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>
              {opt.label}
            </option>
          ))}
          <option value="_other">Other…</option>
        </select>
        {usingCustomType && (
          <input
            type="text"
            defaultValue={PRESET_VALUES.has(court.type) ? "" : court.type || ""}
            onBlur={handleCustomTypeBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.target.blur();
              }
            }}
            placeholder="Custom"
            className="w-24 h-8 px-2 rounded-md border border-neutral-200 bg-white text-[12px] text-neutral-700 focus:outline-none focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/20 transition"
          />
        )}
      </div>

      {/* Umpire assignment — one umpire per court, covers every match on it */}
      {onAssignUmpire && (
        <select
          value={court.assignedUmpire?.refereeId || ""}
          onChange={(e) => onAssignUmpire(e.target.value || null)}
          className="h-8 px-2 rounded-md border border-neutral-200 bg-white text-[12px] text-neutral-700 max-w-[150px] focus:outline-none focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/20 transition"
          title="Umpire responsible for this court"
        >
          <option value="">— umpire —</option>
          {umpires.map((u) => (
            <option key={u.referee?.userId || u.applicationId} value={u.referee?.userId || ""}>
              {u.referee?.name || "Unknown"}
            </option>
          ))}
          {/* Keep the current umpire selectable even if not in the accepted list */}
          {court.assignedUmpire?.refereeId &&
            !umpires.some((u) => String(u.referee?.userId) === String(court.assignedUmpire.refereeId)) && (
              <option value={court.assignedUmpire.refereeId}>{court.assignedUmpire.name || "Assigned"}</option>
            )}
        </select>
      )}

      {/* Status + actions */}
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
        Active
      </span>
      {!editing && (
        <button
          type="button"
          onClick={startEdit}
          className="p-1.5 rounded-md text-neutral-400 hover:text-[#5E6AD2] hover:bg-[#5E6AD2]/10 transition w-auto bg-transparent"
          title="Rename court"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onSoftDelete}
        className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition w-auto bg-transparent"
        title="Retire court"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// RetiredRow — read-only view of a soft-deleted court, with a Reactivate button.
// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────
// UtilizationSection — Sub-step 6 v1: simple per-court status counts.
// Each row shows the court name, a progress bar (completed + in-progress +
// pending stripes), and a status text summary. Footer shows an orphan-match
// warning when the unassigned bucket is non-zero.
// ────────────────────────────────────────────────────────────────────────────
function UtilizationSection({ utilization, onDistribute, distributing, hasActiveCourts }) {
  const { courts = [], unassigned = { all: 0 } } = utilization || {};

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mt-4">
      <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
          Match assignments per court
        </h2>
        {onDistribute && hasActiveCourts && (
          <button
            type="button"
            onClick={onDistribute}
            disabled={distributing}
            className="h-7 px-2.5 rounded-md text-[11px] font-semibold text-white inline-flex items-center gap-1.5 transition disabled:cursor-not-allowed disabled:bg-neutral-300 w-auto"
            style={{ backgroundColor: distributing ? undefined : SIG }}
            title="Round-robin all matches across the active courts"
          >
            <Shuffle className="w-3.5 h-3.5" />
            {distributing ? "Distributing…" : "Distribute matches"}
          </button>
        )}
      </div>
      <ul className="divide-y divide-neutral-100">
        {courts.length === 0 ? (
          <li className="px-4 py-3 text-[12px] text-neutral-400 italic">
            No active courts to summarize.
          </li>
        ) : (
          courts.map((c) => <UtilizationRow key={c._id} court={c} />)
        )}
      </ul>

      {unassigned.all > 0 && (
        <div className="px-4 py-2.5 border-t border-amber-200 bg-amber-50/50 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-800 leading-snug">
            <span className="font-semibold">
              {unassigned.all} match{unassigned.all === 1 ? "" : "es"}
            </span>{" "}
            assigned to retired or unknown courts (
            {unassigned.completed} done · {unassigned.inProgress} in progress · {unassigned.pending} pending). Use <span className="font-semibold">Distribute matches</span> above to spread them across your active courts, or reassign individually via the match cards on Groups / Knockout.
          </p>
        </div>
      )}
    </div>
  );
}

function UtilizationRow({ court }) {
  const t = court.totals || { all: 0, completed: 0, inProgress: 0, pending: 0 };
  const pctDone = t.all > 0 ? (t.completed / t.all) * 100 : 0;
  const pctLive = t.all > 0 ? (t.inProgress / t.all) * 100 : 0;

  let summary;
  if (t.all === 0) {
    summary = <span className="text-neutral-400 italic">0 matches yet</span>;
  } else if (t.completed === t.all) {
    summary = (
      <span className="text-emerald-700 font-semibold">
        {t.completed}/{t.all} done <Check className="inline w-3 h-3 ml-0.5" />
      </span>
    );
  } else {
    const parts = [`${t.completed}/${t.all} done`];
    if (t.inProgress > 0) parts.push(`${t.inProgress} in progress`);
    if (t.pending > 0) parts.push(`${t.pending} pending`);
    summary = <span className="text-neutral-700">{parts.join(" · ")}</span>;
  }

  return (
    <li className="px-4 py-2.5 flex items-center gap-3">
      {/* Court name — fixed-width left column */}
      <div className="w-24 flex-shrink-0 text-[12px] font-semibold text-neutral-900 truncate">
        {court.name}
      </div>

      {/* Progress bar — completed (filled) + in-progress (lighter) + pending (muted bg) */}
      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${pctDone}%`, backgroundColor: SIG }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left: `${pctDone}%`,
            width: `${pctLive}%`,
            backgroundColor: "rgba(94,106,210,0.35)",
          }}
        />
      </div>

      {/* Status text — right column */}
      <div className="text-[11px] flex-shrink-0">{summary}</div>
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// BulkAddModal — paste-list textarea for rapid creation of multiple courts.
// One name per line, optional shared type. Splits on \n / , / ; / tab so
// pasting from a spreadsheet works. Surfaces skipped rows from the server
// (duplicates, empties) so the manager can fix and retry without losing
// context.
// ────────────────────────────────────────────────────────────────────────────
function BulkAddModal({ onClose, onSubmit }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("");
  const [customType, setCustomType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [skipped, setSkipped] = useState([]);

  const usingCustom = type === "_other";
  const resolvedType = usingCustom ? String(customType || "").trim() : type;

  // Parse lines: split on newlines, commas, semicolons, tabs. Trim each.
  // Drop empties. Dedupe (case-insensitive, first occurrence wins) so the
  // visible count matches what'll actually be sent.
  const parsedNames = (() => {
    const tokens = String(text || "")
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const seen = new Set();
    const out = [];
    for (const t of tokens) {
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    return out;
  })();

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (submitting || parsedNames.length === 0) return;
    setSubmitting(true);
    setSkipped([]);
    const result = await onSubmit({ names: parsedNames, type: resolvedType });
    setSubmitting(false);
    if ((result?.skipped || []).length > 0) {
      // Keep modal open so user can see what was skipped.
      setSkipped(result.skipped);
      // Drop successful rows from the textarea so retry only hits the failed.
      const createdLower = new Set((result.created || []).map((c) => c.name.toLowerCase()));
      const remaining = parsedNames.filter((n) => !createdLower.has(n.toLowerCase()));
      setText(remaining.join("\n"));
    } else if ((result?.created || []).length > 0) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900">Bulk add courts</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              One court name per line. Commas, tabs, and semicolons also work.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 w-auto bg-transparent"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Court 1\nCourt 2\nTable A\nTable B"}
            rows={10}
            disabled={submitting}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-[13px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/20 transition font-mono leading-relaxed"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
              Type for all
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={submitting}
              className="h-8 px-2 rounded-md border border-neutral-200 bg-white text-[12px] text-neutral-700 focus:outline-none focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/20 transition"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="_other">Other…</option>
            </select>
            {usingCustom && (
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Custom type"
                disabled={submitting}
                className="w-32 h-8 px-2.5 rounded-md border border-neutral-200 bg-white text-[12px] text-neutral-700 focus:outline-none focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/20 transition"
              />
            )}
            <span className="ml-auto text-[11px] text-neutral-500 font-mono tabular-nums">
              {parsedNames.length} {parsedNames.length === 1 ? "row" : "rows"}
            </span>
          </div>

          {skipped.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {skipped.length} row{skipped.length === 1 ? "" : "s"} skipped
              </p>
              <ul className="text-[11px] text-amber-800 space-y-0.5 max-h-32 overflow-y-auto">
                {skipped.map((s, i) => (
                  <li key={`${s.name}-${i}`} className="font-mono">
                    <span className="font-semibold">{s.name || "(empty)"}</span>{" "}
                    <span className="text-amber-600">— {s.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>

        <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-9 px-3 rounded-lg text-[12px] font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 transition w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || parsedNames.length === 0}
            className="h-9 px-4 rounded-lg text-[12px] font-semibold text-white inline-flex items-center gap-1.5 transition disabled:cursor-not-allowed disabled:bg-neutral-300 w-auto"
            style={{ backgroundColor: parsedNames.length > 0 && !submitting ? SIG : undefined }}
          >
            <Plus className="w-3.5 h-3.5" />
            {submitting
              ? "Adding…"
              : parsedNames.length === 0
              ? "Add courts"
              : `Add ${parsedNames.length} court${parsedNames.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function RetiredRow({ court, onReactivate }) {
  return (
    <li className="px-4 py-2.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-medium text-neutral-500 line-through truncate">
          {court.name}
        </span>
        {court.type && (
          <span className="ml-2 text-[11px] text-neutral-400">{court.type}</span>
        )}
      </div>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
        Retired
      </span>
      <button
        type="button"
        onClick={onReactivate}
        className="px-2.5 h-7 rounded-md text-[11px] font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 inline-flex items-center gap-1 transition w-auto"
        title="Reactivate court"
      >
        <Undo2 className="w-3 h-3" />
        Reactivate
      </button>
    </li>
  );
}
