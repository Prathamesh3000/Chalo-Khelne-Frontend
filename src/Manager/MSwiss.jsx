import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Trophy, Users, Play, RotateCcw, Clock, Crown, AlertCircle, Check, Info,
} from "lucide-react";
import { ManagerShell } from "../shared/layout";
import { Modal } from "../shared/ui";
import { getMatchFormat as getMatchFormatHelper } from "../utils/sportTrack";
import BulkScoreUploadModal from "./BulkScoreUploadModal";

/**
 * Swiss event manager.
 *
 * Rounds are generated ONE AT A TIME — round N's pairings depend on round N-1's
 * results — so the page is built around a single question: is the current round
 * finished, and can the next one be generated? The server answers that with
 * `canGenerateNextRound`, and this page never second-guesses it.
 */

// Smallest sensible round count: each round halves how many players can still
// be undefeated, so ceil(log2(n)) separates the field.
const recommendRounds = (n) => (n >= 2 ? Math.ceil(Math.log2(n)) : 0);
// Beyond n-1 rounds a repeat pairing is unavoidable.
const maxRounds = (n) => (n >= 2 ? n - 1 : 0);

export default function MSwiss() {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get("tournamentId");

  const [tournament, setTournament] = useState(null);
  const [activeSportId, setActiveSportId] = useState(null);
  const [category, setCategory] = useState("ALL");
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  // Setup form
  const [registered, setRegistered] = useState([]);
  const [rounds, setRounds] = useState(5);
  const [courtCount, setCourtCount] = useState(3);
  const [matchDuration, setMatchDuration] = useState(30);
  const [gapMinutes, setGapMinutes] = useState(10);

  const sports = Array.isArray(tournament?.sports) ? tournament.sports : [];
  const activeSport = sports.find((s) => String(s.sportId) === String(activeSportId)) || sports[0] || null;
  const categories = Array.isArray(activeSport?.categories) ? activeSport.categories : [];

  useEffect(() => {
    if (tournamentId) fetchTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    if (!tournament) return;
    if (!activeSportId && sports[0]) setActiveSportId(sports[0].sportId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament]);

  useEffect(() => {
    if (!tournamentId || !activeSportId) return;
    fetchEvent();
    fetchRegistered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, activeSportId, category]);

  const fetchTournament = async () => {
    try {
      const res = await axios.get(`/api/tournaments/${tournamentId}`);
      setTournament(res.data.tournament || res.data);
    } catch {
      toast.error("Failed to load tournament");
    } finally {
      setLoading(false);
    }
  };

  const scopeQuery = () => {
    const p = new URLSearchParams();
    if (activeSportId) p.set("sportId", activeSportId);
    if (category && category !== "ALL") p.set("category", category);
    return p.toString();
  };

  const fetchEvent = async () => {
    try {
      const res = await axios.get(`/api/tournaments/swiss/${tournamentId}?${scopeQuery()}`);
      setEvent(res.data);
    } catch {
      setEvent(null);
    }
  };

  const fetchRegistered = async () => {
    try {
      const res = await axios.get(`/api/tournaments/bookings/tournament/${tournamentId}`);
      const bookings = res.data.bookings || res.data.data || [];
      const list = bookings
        .filter((b) => b.status === "confirmed")
        .filter((b) => {
          const ss = Array.isArray(b.sportSelections) ? b.sportSelections : [];
          if (ss.length === 0) return true;
          return ss.some((s) => String(s.sportId) === String(activeSportId));
        })
        .filter((b) => {
          if (!category || category === "ALL") return true;
          const ss = Array.isArray(b.sportSelections) ? b.sportSelections : [];
          return ss.some((s) => s.categoryName === category);
        })
        .map((b) => ({
          playerId: b.userId?._id || b.userId || null,
          userName: b.userName || "Unknown",
          seed: b.seed ?? null,
        }));
      // Seeded first (the Excel column), unseeded after in registration order.
      list.sort((a, b) => {
        if (a.seed && b.seed) return a.seed - b.seed;
        if (a.seed) return -1;
        if (b.seed) return 1;
        return 0;
      });
      setRegistered(list);
    } catch {
      setRegistered([]);
    }
  };

  const openStart = () => {
    const n = registered.length;
    if (n < 2) { toast.warn("At least 2 registered players are needed."); return; }
    setRounds(recommendRounds(n));
    setShowStart(true);
  };

  const startEvent = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`/api/tournaments/swiss/${tournamentId}/start`, {
        sportId: activeSportId,
        category: category !== "ALL" ? category : null,
        players: registered.map((p, i) => ({ ...p, seed: p.seed ?? i + 1 })),
        rounds: Number(rounds),
        courtCount: Number(courtCount),
        matchDurationMinutes: Number(matchDuration),
        gapMinutes: Number(gapMinutes),
      });
      toast.success(res.data.message);
      setShowStart(false);
      fetchEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const generateNext = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`/api/tournaments/swiss/${tournamentId}/next-round`, {
        sportId: activeSportId,
        category: category !== "ALL" ? category : null,
        courtCount: Number(courtCount),
        matchDurationMinutes: Number(matchDuration),
        gapMinutes: Number(gapMinutes),
      });
      toast.success(res.data.message);
      fetchEvent();
    } catch (err) {
      const d = err.response?.data;
      // The server names the matches still to be played — repeat that rather
      // than a generic failure, so the manager knows what to chase.
      if (d?.pending?.length) {
        toast.warn(`${d.message}\n${d.pending.map((m) => `${m.player1} vs ${m.player2}`).join(", ")}`);
      } else {
        toast.error(d?.message || err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const resetEvent = async () => {
    if (!confirm("Reset this Swiss event? Every round and result will be deleted.")) return;
    setBusy(true);
    try {
      await axios.delete(`/api/tournaments/swiss/${tournamentId}?${scopeQuery()}`);
      toast.success("Event reset");
      fetchEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const pendingMatches = useMemo(() => {
    if (!event?.rounds) return [];
    const current = event.rounds[event.rounds.length - 1];
    return (current?.matches || []).filter((m) => !m.isBye && m.status !== "COMPLETED");
  }, [event]);

  const fmt = getMatchFormatHelper(tournament, activeSportId) || {};

  if (loading) {
    return <ManagerShell searchPlaceholder="Swiss event…"><div className="py-20 text-center text-gray-400">Loading…</div></ManagerShell>;
  }

  return (
    <ManagerShell searchPlaceholder="Swiss event…">
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
          <Users className="w-3.5 h-3.5" /> Tournament · Swiss system
        </p>
        <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
          {tournament?.title || "Swiss event"}
        </h1>
        <p className="mt-1 text-[13px] text-gray-400">
          Fixed rounds, nobody eliminated — the standings decide the result.
        </p>
      </header>

      {/* Scope pickers */}
      <div className="flex flex-wrap gap-3 mb-6">
        {sports.length > 1 && (
          <Picker
            label="Sport"
            value={String(activeSportId || "")}
            options={sports.map((s) => ({ value: String(s.sportId), label: s.sportName }))}
            onChange={(v) => setActiveSportId(v)}
          />
        )}
        {categories.length > 0 && (
          <Picker
            label="Category"
            value={category}
            options={[{ value: "ALL", label: "All" }, ...categories.map((c) => ({ value: c.name, label: c.name }))]}
            onChange={setCategory}
          />
        )}
      </div>

      {!event?.exists ? (
        <EmptyState
          count={registered.length}
          onStart={openStart}
          recommended={recommendRounds(registered.length)}
        />
      ) : (
        <>
          {/* Progress + actions */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-5 mb-6">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div className="flex gap-6">
                <Stat label="Round" value={`${event.currentRound} / ${event.totalRounds}`} />
                <Stat label="Players" value={event.standings.length} />
                <Stat
                  label="Status"
                  value={event.isFinalRound && !event.canGenerateNextRound ? "Final round" : "In progress"}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {pendingMatches.length > 0 && (
                  <button
                    onClick={() => setShowBulk(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Enter scores ({pendingMatches.length})
                  </button>
                )}
                <button
                  onClick={generateNext}
                  disabled={busy || !event.canGenerateNextRound}
                  title={!event.canGenerateNextRound
                    ? (event.isFinalRound ? "All rounds have been generated" : "Finish the current round first")
                    : undefined}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed w-auto"
                >
                  <Play className="w-3.5 h-3.5" />
                  Generate round {event.currentRound + 1}
                </button>
                <button
                  onClick={resetEvent}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.04] transition w-auto"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>

            {event.isFinalRound && !event.canGenerateNextRound && (
              <div
                className="mt-4 px-4 py-3 rounded-md flex items-start gap-3"
                style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.20)" }}
              >
                <Crown className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-orange-200">
                  This is the final round. Once every result is in, the standings below are the result.
                </p>
              </div>
            )}
          </div>

          <Standings rows={event.standings} />

          {[...event.rounds].reverse().map((r) => (
            <RoundCard key={r.round} round={r} />
          ))}
        </>
      )}

      {/* Start-event modal */}
      <Modal
        open={showStart}
        onClose={() => setShowStart(false)}
        title="Start Swiss event"
        size="md"
        theme="dark"
        footer={
          <>
            <button
              onClick={() => setShowStart(false)}
              className="h-9 px-3.5 inline-flex items-center rounded-md text-[13px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.04] transition w-auto"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              Cancel
            </button>
            <button
              onClick={startEvent}
              disabled={busy || !roundsValid(rounds, registered.length)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed w-auto"
            >
              <Trophy className="w-3.5 h-3.5" />
              {busy ? "Starting…" : "Start event"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <TileStat label="Players" value={registered.length} />
            <TileStat label="Rounds" value={rounds || "—"} />
            <TileStat label="Matches" value={estimateMatches(registered.length, rounds)} muted />
          </div>

          <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Rounds</p>
            <NumField label="Number of rounds" value={rounds} min={1} onChange={setRounds} />
            <p className="mt-2 text-[12px] text-gray-400">
              {registered.length} players · recommended <strong className="text-white">{recommendRounds(registered.length)}</strong>,
              maximum <strong className="text-white">{maxRounds(registered.length)}</strong>.
            </p>
            {!roundsValid(rounds, registered.length) && (
              <p className="mt-1 text-[12px] text-amber-300">
                Choose between 1 and {maxRounds(registered.length)} — beyond that a fixture would have to repeat.
              </p>
            )}
          </div>

          <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Scheduling</p>
            <div className="grid grid-cols-3 gap-3">
              <NumField label="Courts" value={courtCount} min={1} onChange={setCourtCount} />
              <NumField label="Duration (min)" value={matchDuration} min={1} onChange={setMatchDuration} />
              <NumField label="Gap (min)" value={gapMinutes} min={0} onChange={setGapMinutes} />
            </div>
          </div>

          <div
            className="px-4 py-3 rounded-md flex items-start gap-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Info className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-gray-300 leading-relaxed">
              Round 1 is generated now. Each later round is paired only after the previous one is
              fully scored, because the pairings depend on those results.
            </p>
          </div>
        </div>
      </Modal>

      <BulkScoreUploadModal
        isOpen={showBulk}
        onClose={() => setShowBulk(false)}
        onSuccess={fetchEvent}
        matches={pendingMatches}
        tournamentId={tournamentId}
        matchType="player"
        maxSets={fmt.totalSets || 3}
        setsToWin={Math.ceil((fmt.totalSets || 3) / 2)}
        title={`Enter scores — round ${event?.currentRound || 1}`}
      />
    </ManagerShell>
  );
}

const roundsValid = (r, playerCount) => {
  const n = Number(r);
  return Number.isFinite(n) && n >= 1 && n <= maxRounds(playerCount);
};

// Matches played over the whole event: floor(n/2) per round, plus a bye when odd.
const estimateMatches = (players, rounds) => {
  const n = Number(players), r = Number(rounds);
  if (!n || !r) return "—";
  return Math.floor(n / 2) * r;
};

function EmptyState({ count, onStart, recommended }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-8 text-center">
      <span className="w-12 h-12 rounded-xl bg-orange-500/15 grid place-items-center mx-auto mb-4">
        <Users className="w-5 h-5 text-orange-400" />
      </span>
      <h3 className="text-[15px] font-medium text-white">No Swiss event yet</h3>
      <p className="mt-1.5 text-[13px] text-gray-400 max-w-md mx-auto">
        {count >= 2
          ? `${count} registered players. A ${recommended}-round event gives everyone ${recommended} matches with nobody knocked out.`
          : "Register at least 2 players for this sport and category first."}
      </p>
      <button
        onClick={onStart}
        disabled={count < 2}
        className="mt-5 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 disabled:opacity-40 w-auto"
      >
        <Trophy className="w-3.5 h-3.5" /> Set up event
      </button>
    </div>
  );
}

function Standings({ rows }) {
  if (!rows?.length) return null;
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden mb-6">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center">
          <Trophy className="w-3.5 h-3.5 text-orange-400" />
        </span>
        <h3 className="text-[13px] font-medium text-white">Standings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <Th>#</Th><Th>Player</Th><Th>Pts</Th><Th>P</Th><Th>W</Th><Th>D</Th><Th>L</Th>
              {/* Buchholz separates players level on points by how strong their
                  opponents were — without it the order among them is arbitrary. */}
              <Th title="Sum of opponents' scores — the strength of your draw">BH</Th>
              <Th title="Sonneborn-Berger — scores of opponents you beat, half for draws">SB</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                <Td>
                  <span className={`font-mono tabular-nums ${r.rank === 1 ? "text-orange-300 font-bold" : "text-gray-500"}`}>
                    {r.rank}{r.tied ? "=" : ""}
                  </span>
                </Td>
                <Td><span className="font-medium text-white">{r.name}</span></Td>
                <Td><span className="font-bold text-orange-300 tabular-nums">{r.score}</span></Td>
                <Td><span className="text-gray-300 tabular-nums">{r.played}</span></Td>
                <Td><span className="text-emerald-300 tabular-nums">{r.won}</span></Td>
                <Td><span className="text-gray-300 tabular-nums">{r.drawn}</span></Td>
                <Td><span className="text-gray-400 tabular-nums">{r.lost}</span></Td>
                <Td><span className="text-gray-400 tabular-nums">{r.buchholz}</span></Td>
                <Td><span className="text-gray-400 tabular-nums">{r.sonnebornBerger}</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.some((r) => r.tied) && (
        <div className="px-5 py-2.5 border-t border-white/[0.06]">
          <p className="text-[11px] text-gray-500">
            <span className="font-mono">=</span> means level on every tiebreak — genuinely joint, not ordered.
          </p>
        </div>
      )}
    </div>
  );
}

function RoundCard({ round }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden mb-4">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-white">Round {round.round}</h3>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
          round.complete ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-gray-400"
        }`}>
          {round.complete ? "Complete" : "In progress"}
        </span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {round.matches.map((m) => (
          <div key={m._id} className="px-5 py-3 flex items-center gap-3">
            {m.isBye ? (
              <>
                <span className="w-5 h-5 rounded-full bg-white/[0.06] grid place-items-center flex-shrink-0">
                  <Clock className="w-3 h-3 text-gray-400" />
                </span>
                <span className="text-[13px] text-gray-300">
                  <strong className="text-white">{m.player1?.userName}</strong> — bye
                </span>
              </>
            ) : (
              <>
                <span className={`w-5 h-5 rounded-full grid place-items-center flex-shrink-0 ${
                  m.status === "COMPLETED" ? "bg-emerald-500/15" : "bg-white/[0.06]"
                }`}>
                  {m.status === "COMPLETED"
                    ? <Check className="w-3 h-3 text-emerald-400" />
                    : <AlertCircle className="w-3 h-3 text-gray-400" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-gray-200 leading-snug">
                    {m.player1?.userName} <span className="text-gray-500">vs</span> {m.player2?.userName}
                  </p>
                  {m.status === "COMPLETED" && (
                    <p className="text-[12px] text-gray-500 leading-snug">
                      {m.result?.isDraw
                        ? "Drawn"
                        : `${m.result?.winner?.playerName} won`}
                    </p>
                  )}
                </div>
                {m.courtNumber && (
                  <span className="text-[11px] text-gray-500 flex-shrink-0">Court {m.courtNumber}</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Picker({ label, value, options, onChange }) {
  return (
    <div>
      <label className="block mb-1.5 text-[11px] font-semibold text-gray-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-3 rounded-md bg-[#12141B] border border-white/[0.06] text-[13px] text-gray-100 outline-none focus:border-orange-500"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function NumField({ label, value, min, onChange }) {
  return (
    <div className="h-full flex flex-col">
      <label className="block text-[11px] font-semibold text-gray-400 leading-snug">{label}</label>
      <input
        type="number"
        min={min}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="mt-auto w-full h-9 px-3 rounded-md bg-[#12141B] border border-white/[0.06] text-[13px] text-gray-100 tabular-nums outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-[18px] font-semibold text-white tabular-nums leading-tight mt-0.5">{value}</p>
    </div>
  );
}

function TileStat({ label, value, muted = false }) {
  return (
    <div
      className="rounded-md p-3 text-center"
      style={{
        background: muted ? "rgba(255,255,255,0.03)" : "rgba(249,115,22,0.10)",
        border: `1px solid ${muted ? "rgba(255,255,255,0.06)" : "rgba(249,115,22,0.25)"}`,
      }}
    >
      <p className={`text-[22px] font-semibold tabular-nums leading-none ${muted ? "text-gray-400" : "text-orange-300"}`}>{value}</p>
      <p className={`text-[11px] font-medium mt-1.5 ${muted ? "text-gray-500" : "text-orange-300/80"}`}>{label}</p>
    </div>
  );
}

function Th({ children, title }) {
  return (
    <th title={title} className="py-3 px-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">
      {children}
    </th>
  );
}
function Td({ children }) {
  return <td className="py-2.5 px-3">{children}</td>;
}
