import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  UserCheck, UserX, Search, RefreshCcw, UserPlus, ClipboardPaste,
  IndianRupee, X, Check, Users, ChevronRight, AlertTriangle,
} from "lucide-react";
import { ManagerShell } from "../shared/layout";

import DialogA11y from "../shared/components/DialogA11y";
/**
 * Tournament-day check-in.
 *
 * WHY: local tournaments routinely take 53 registrations and see 16–25 players
 * on the day. Draw generation has to run on who is PRESENT, but nothing
 * recorded presence — the manager hand-ticked players into the generation
 * screen every time, in state that did not survive a refresh, with no record of
 * who was absent and no way to admit a walk-in who paid cash at the desk.
 *
 * DESIGN NOTES
 *  • Presence is independent of payment. Unpaid players show an "Owes ₹N" chip
 *    so the desk can collect, but nothing blocks them being marked present or
 *    drawn — a player standing in front of you with cash is present.
 *  • One row per (sport, category) ENTRY, not per person: an entrant in MS + MD
 *    + XD may turn up for only some of them.
 *  • Every action writes through to the server immediately. This screen is used
 *    by whoever is holding the laptop, and a refresh must never lose work.
 */

const STATUS_STYLES = {
  checked_in: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  no_show: "bg-red-500/15 text-red-300 border-red-500/30",
  withdrawn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  registered: "bg-white/[0.04] text-gray-400 border-white/[0.08]",
};

const STATUS_LABEL = {
  checked_in: "Present",
  no_show: "Absent",
  withdrawn: "Withdrawn",
  registered: "Not marked",
};

export default function MCheckIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tournamentId = params.get("tournamentId");

  const [tournament, setTournament] = useState(null);
  const [roster, setRoster] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const [activeSportId, setActiveSportId] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkIn, setWalkIn] = useState({ name: "", phone: "", markPaid: false });
  const [savingWalkIn, setSavingWalkIn] = useState(false);

  const [showPaste, setShowPaste] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pasting, setPasting] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
  const loadTournament = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await axios.get(`/api/tournaments/${tournamentId}`);
      const t = res.data?.data || res.data?.tournament || res.data;
      setTournament(t);
      const firstSport = t?.sports?.[0];
      if (firstSport) {
        setActiveSportId(String(firstSport.sportId));
        setActiveCategory(firstSport.categories?.[0]?.name || "");
      }
    } catch {
      toast.error("Could not load tournament");
    }
  }, [tournamentId]);

  const loadRoster = useCallback(async () => {
    if (!tournamentId || !activeSportId || !activeCategory) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/tournaments/${tournamentId}/attendance`, {
        params: { sportId: activeSportId, categoryName: activeCategory },
      });
      setRoster(res.data?.data || []);
      setSummary(res.data?.summary || {});
    } catch {
      toast.error("Could not load the check-in list");
    } finally {
      setLoading(false);
    }
  }, [tournamentId, activeSportId, activeCategory]);

  useEffect(() => { loadTournament(); }, [loadTournament]);
  useEffect(() => { loadRoster(); }, [loadRoster]);

  const categories = useMemo(() => {
    const sport = tournament?.sports?.find((s) => String(s.sportId) === String(activeSportId));
    return sport?.categories || [];
  }, [tournament, activeSportId]);

  const visible = useMemo(() => {
    let list = roster;
    if (statusFilter !== "all") {
      list = list.filter((r) =>
        statusFilter === "unmarked"
          ? r.attendanceStatus === "registered"
          : r.attendanceStatus === statusFilter
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => (r.userName || "").toLowerCase().includes(q));
    }
    return list;
  }, [roster, statusFilter, search]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const rowKey = (r) => `${r.bookingId}|${r.sportId}|${r.categoryName}`;

  // Optimistic: the desk taps fast and must never wait on a round trip. On
  // failure the row reverts and the error is surfaced.
  const setStatus = async (row, status) => {
    const key = rowKey(row);
    const previous = row.attendanceStatus;
    setBusyKey(key);
    setRoster((rs) =>
      rs.map((r) => (rowKey(r) === key ? { ...r, attendanceStatus: status } : r))
    );

    try {
      await axios.post(`/api/tournaments/${tournamentId}/attendance/mark`, {
        bookingId: row.bookingId,
        sportId: row.sportId,
        categoryName: row.categoryName,
        status,
      });
      await refreshSummary();
    } catch (err) {
      setRoster((rs) =>
        rs.map((r) => (rowKey(r) === key ? { ...r, attendanceStatus: previous } : r))
      );
      toast.error(err.response?.data?.message || "Could not save");
    } finally {
      setBusyKey(null);
    }
  };

  const refreshSummary = async () => {
    try {
      const res = await axios.get(`/api/tournaments/${tournamentId}/attendance/summary`, {
        params: { sportId: activeSportId, categoryName: activeCategory },
      });
      setSummary(res.data?.summary || {});
    } catch { /* the counter is cosmetic */ }
  };

  const markRemainingAbsent = async () => {
    const unmarked = roster.filter((r) => r.attendanceStatus === "registered").length;
    if (unmarked === 0) return toast.info("Everyone has already been marked");
    if (!window.confirm(`Mark the remaining ${unmarked} player(s) as absent?`)) return;

    try {
      const res = await axios.post(
        `/api/tournaments/${tournamentId}/attendance/mark-remaining`,
        { sportId: activeSportId, categoryName: activeCategory, status: "no_show" }
      );
      toast.success(`${res.data.marked} marked absent`);
      loadRoster();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not mark remaining");
    }
  };

  const submitWalkIn = async (e) => {
    e.preventDefault();
    if (!walkIn.name.trim()) return toast.warn("Enter the player's name");
    setSavingWalkIn(true);
    try {
      const res = await axios.post(`/api/tournaments/${tournamentId}/attendance/walk-in`, {
        name: walkIn.name.trim(),
        phone: walkIn.phone.trim() || undefined,
        sportId: activeSportId,
        categoryName: activeCategory,
        markPaid: walkIn.markPaid,
      });
      toast.success(res.data.message);
      setWalkIn({ name: "", phone: "", markPaid: false });
      setShowWalkIn(false);
      loadRoster();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add the player");
    } finally {
      setSavingWalkIn(false);
    }
  };

  const submitPaste = async () => {
    const names = pasted.split(/[\n,]/).map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return toast.warn("Paste at least one name");
    setPasting(true);
    try {
      const res = await axios.post(`/api/tournaments/${tournamentId}/attendance/bulk`, {
        sportId: activeSportId,
        categoryName: activeCategory,
        status: "checked_in",
        names,
      });
      const { marked, unmatched } = res.data;
      toast.success(`${marked} marked present`);
      if (unmatched?.length) {
        toast.warn(
          `${unmatched.length} not matched: ${unmatched.slice(0, 3).map((u) => u.name).join(", ")}${
            unmatched.length > 3 ? "…" : ""
          }`
        );
      }
      setPasted("");
      setShowPaste(false);
      loadRoster();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not import");
    } finally {
      setPasting(false);
    }
  };

  const goToDraw = (path) =>
    navigate(`${path}?tournamentId=${tournamentId}&sportId=${activeSportId}&source=checked_in`);

  if (!tournamentId) {
    return (
      <ManagerShell>
        <div className="p-8 text-gray-400">
          No tournament selected. Open check-in from a tournament.
        </div>
      </ManagerShell>
    );
  }

  const present = summary.checkedIn || 0;

  return (
    <ManagerShell>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header + counters */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Tournament-day check-in</h1>
            <p className="text-sm text-gray-400 mt-1">
              {tournament?.title || "Tournament"} — mark who actually turned up. The
              draw is built from this list, not from every registration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRoster}
              className="w-auto flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold
                         text-gray-300 bg-[#181A22] border border-white/[0.06] hover:bg-white/[0.04]"
            >
              <RefreshCcw size={15} /> Refresh
            </button>
            <button
              onClick={() => setShowPaste(true)}
              className="w-auto flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold
                         text-gray-300 bg-[#181A22] border border-white/[0.06] hover:bg-white/[0.04]"
            >
              <ClipboardPaste size={15} /> Paste list
            </button>
            <button
              onClick={() => setShowWalkIn(true)}
              className="w-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                         text-white bg-emerald-500 hover:bg-emerald-600"
            >
              <UserPlus size={15} /> Walk-in
            </button>
          </div>
        </div>

        {/* The number that matters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat label="Present" value={present} tone="emerald" big />
          <Stat label="Registered" value={summary.total || 0} />
          <Stat label="Absent" value={summary.noShow || 0} tone="red" />
          <Stat label="Not marked" value={summary.unmarked || 0} tone="amber" />
          <Stat label="Present, unpaid" value={summary.unpaidPresent || 0} tone="amber" />
        </div>

        {/* Sport + category selectors — the desk works one entry list at a time */}
        <div className="space-y-2">
          {(tournament?.sports?.length || 0) > 1 && (
            <div className="flex flex-wrap gap-2">
              {tournament.sports.map((s) => (
                <button
                  key={String(s.sportId)}
                  onClick={() => {
                    setActiveSportId(String(s.sportId));
                    setActiveCategory(s.categories?.[0]?.name || "");
                  }}
                  className={`w-auto px-3 py-1.5 rounded-lg text-[13px] font-semibold ${
                    String(s.sportId) === String(activeSportId)
                      ? "bg-emerald-500 text-white"
                      : "bg-[#181A22] text-gray-300 border border-white/[0.06]"
                  }`}
                >
                  {s.sportName}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => setActiveCategory(c.name)}
                className={`w-auto px-3 py-1.5 rounded-lg text-[13px] font-semibold ${
                  c.name === activeCategory
                    ? "bg-white/[0.10] text-white border border-white/[0.14]"
                    : "bg-[#181A22] text-gray-400 border border-white/[0.06]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search + status filter + bulk action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="checkin-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player…"
              aria-label="Search players by name"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#181A22] border border-white/[0.06]
                         text-sm text-white placeholder:text-gray-500"
            />
          </div>

          {["all", "unmarked", "checked_in", "no_show"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`w-auto px-3 py-2 rounded-xl text-[13px] font-semibold ${
                statusFilter === f
                  ? "bg-white/[0.10] text-white border border-white/[0.14]"
                  : "bg-[#181A22] text-gray-400 border border-white/[0.06]"
              }`}
            >
              {f === "all" ? "All" : STATUS_LABEL[f] || "Not marked"}
            </button>
          ))}

          <button
            onClick={markRemainingAbsent}
            className="w-auto px-3 py-2 rounded-xl text-[13px] font-semibold text-red-300
                       bg-red-500/10 border border-red-500/25 hover:bg-red-500/20"
          >
            Mark rest absent
          </button>
        </div>

        {/* Roster */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#12141A] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {roster.length === 0
                ? "No registrations for this category yet."
                : "No players match this filter."}
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {visible.map((r) => {
                const key = rowKey(r);
                const owes = r.paymentStatus !== "paid" && r.paymentStatus !== "waived";
                return (
                  <li
                    key={key}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-white/[0.02]"
                  >
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-white">
                          {r.userName}
                        </span>
                        {r.seed && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-300">
                            Seed {r.seed}
                          </span>
                        )}
                        {r.isGuestBooking && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/[0.06] text-gray-400">
                            Guest
                          </span>
                        )}
                        {owes && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300">
                            <IndianRupee size={9} />
                            Owes {r.feeOwed}
                          </span>
                        )}
                      </div>
                      {r.userPhone && (
                        <div className="text-[11px] text-gray-500 mt-0.5">{r.userPhone}</div>
                      )}
                    </div>

                    <span
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                        STATUS_STYLES[r.attendanceStatus]
                      }`}
                    >
                      {STATUS_LABEL[r.attendanceStatus]}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={busyKey === key}
                        onClick={() => setStatus(r, "checked_in")}
                        aria-label={`Mark ${r.userName} present`}
                        className={`w-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold
                          disabled:opacity-50 ${
                            r.attendanceStatus === "checked_in"
                              ? "bg-emerald-500 text-white"
                              : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20"
                          }`}
                      >
                        <UserCheck size={13} /> Present
                      </button>
                      <button
                        disabled={busyKey === key}
                        onClick={() => setStatus(r, "no_show")}
                        aria-label={`Mark ${r.userName} absent`}
                        className={`w-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold
                          disabled:opacity-50 ${
                            r.attendanceStatus === "no_show"
                              ? "bg-red-500 text-white"
                              : "bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/20"
                          }`}
                      >
                        <UserX size={13} /> Absent
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Hand-off to the draw */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#12141A] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Users size={16} className="text-emerald-400" />
            <span className="text-gray-300">
              <strong className="text-white">{present}</strong> player{present === 1 ? "" : "s"} present
              {summary.unmarked > 0 && (
                <span className="text-amber-400 ml-2 inline-flex items-center gap-1">
                  <AlertTriangle size={13} />
                  {summary.unmarked} still unmarked
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToDraw("/tournament-management/group-stage")}
              className="w-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                         text-gray-200 bg-[#181A22] border border-white/[0.06] hover:bg-white/[0.04]"
            >
              Make groups <ChevronRight size={14} />
            </button>
            <button
              onClick={() => goToDraw("/tournament-management/direct-knockout")}
              className="w-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                         text-white bg-emerald-500 hover:bg-emerald-600"
            >
              Generate bracket <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Walk-in */}
      {showWalkIn && (
        <Modal title="Add a walk-in player" onClose={() => setShowWalkIn(false)}>
          <form onSubmit={submitWalkIn} className="space-y-3">
            <p className="text-[12px] text-gray-400">
              Registers them for <strong className="text-gray-200">{activeCategory}</strong> and
              marks them present. Payment can be collected separately.
            </p>
            <Field label="Player name" htmlFor="walkin-name">
              <input
                id="walkin-name"
                autoFocus
                value={walkIn.name}
                onChange={(e) => setWalkIn((w) => ({ ...w, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#0F1116] border border-white/[0.08] text-sm text-white"
              />
            </Field>
            <Field label="Phone (optional)" htmlFor="walkin-phone">
              <input
                id="walkin-phone"
                value={walkIn.phone}
                onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#0F1116] border border-white/[0.08] text-sm text-white"
              />
            </Field>
            <label htmlFor="walkin-paid" className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                id="walkin-paid"
                type="checkbox"
                checked={walkIn.markPaid}
                onChange={(e) => setWalkIn((w) => ({ ...w, markPaid: e.target.checked }))}
                className="w-auto"
              />
              Paid the fee at the desk
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWalkIn(false)}
                className="w-auto px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 bg-[#181A22] border border-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingWalkIn}
                className="w-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
              >
                <Check size={14} /> {savingWalkIn ? "Adding…" : "Add & check in"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Paste list */}
      {showPaste && (
        <Modal title="Paste who turned up" onClose={() => setShowPaste(false)}>
          <p className="text-[12px] text-gray-400 mb-2">
            One name per line (or comma-separated). Everyone matched is marked present;
            anything unmatched is reported rather than silently dropped.
          </p>
          <label htmlFor="paste-names" className="sr-only">Player names</label>
          <textarea
            id="paste-names"
            rows={8}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={"Rahul Sharma\nPriya Nair\n…"}
            className="w-full px-3 py-2 rounded-xl bg-[#0F1116] border border-white/[0.08] text-sm text-white font-mono"
          />
          <div className="flex justify-end gap-2 pt-3">
            <button
              onClick={() => setShowPaste(false)}
              className="w-auto px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 bg-[#181A22] border border-white/[0.06]"
            >
              Cancel
            </button>
            <button
              onClick={submitPaste}
              disabled={pasting}
              className="w-auto px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
            >
              {pasting ? "Importing…" : "Mark present"}
            </button>
          </div>
        </Modal>
      )}
    </ManagerShell>
  );
}

/* ── Small presentational pieces (module scope, never re-created per render) ── */

function Stat({ label, value, tone = "slate", big = false }) {
  const tones = {
    emerald: "text-emerald-300",
    red: "text-red-300",
    amber: "text-amber-300",
    slate: "text-white",
  };
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#12141A] px-4 py-3">
      <div className={`${big ? "text-3xl" : "text-2xl"} font-extrabold ${tones[tone]}`}>
        {value}
      </div>
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-0.5">
        {label}
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[12px] font-semibold text-gray-400 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={onClose}
      >
        <DialogA11y onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#12141A] p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-auto p-1 rounded-lg text-gray-400 hover:bg-white/[0.06]"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
