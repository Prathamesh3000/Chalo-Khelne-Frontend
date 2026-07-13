import { useState } from "react";
import { Check, RefreshCcw, Plus, Minus, Clock, Undo2 } from "lucide-react";
import { toast } from "react-toastify";
import { scoreErrorMessage } from "./scoreError";

/**
 * Scorer for time-based sports: Football, Basketball, Hockey, Kabaddi.
 *
 * Professional dark scoreboard. Football-styled (crests, big GOALS, halves,
 * goal timeline) but config-adaptive: the period label (Half/Quarter), score
 * label (Goal/Point) and basketball's +1/+2/+3 point values all come from
 * `config`, so the same board serves every time sport.
 *
 * Goals/points are collected client-side (with optional minute) and submitted
 * as one final game via onSubmitScores([{ a, b }]).
 *
 * Props: config, matchFormat, player1Name, player2Name,
 *        onSubmitScores, submitting, onRefresh
 */
export default function TimeBasedScorer({
  config,
  matchFormat,
  player1Name,
  player2Name,
  onSubmitScores,
  submitting,
  onRefresh,
}) {
  const labels = config.labels;
  const periods = config.scoring?.periods || config.defaults?.periods || 2;
  const periodDuration = config.scoring?.periodDuration || config.defaults?.periodDuration || 45;
  const pointValues = config.scoring?.pointValues || null; // basketball: [1,2,3]
  const scoreLabel = labels?.score || "Goal";
  const periodLabel = labels?.period || "Period";
  const accent = config.color || "#3B82F6";

  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [events, setEvents] = useState([]);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [minute, setMinute] = useState("");

  const addEvent = (player, value = 1) => {
    const event = { player, value, period: currentPeriod, minute: minute || "", id: events.length + 1 };
    setEvents((prev) => [...prev, event]);
    if (player === 1) setPlayer1Score((p) => p + value);
    else setPlayer2Score((p) => p + value);
    setMinute("");
  };
  const removeLastForPlayer = (player) => {
    const idx = [...events].reverse().findIndex((e) => e.player === player);
    if (idx === -1) return;
    const realIdx = events.length - 1 - idx;
    const ev = events[realIdx];
    if (player === 1) setPlayer1Score((p) => Math.max(0, p - ev.value));
    else setPlayer2Score((p) => Math.max(0, p - ev.value));
    setEvents(events.filter((_, i) => i !== realIdx));
  };
  const undoLast = () => {
    if (!events.length) return;
    const last = events[events.length - 1];
    if (last.player === 1) setPlayer1Score((p) => Math.max(0, p - last.value));
    else setPlayer2Score((p) => Math.max(0, p - last.value));
    setEvents(events.slice(0, -1));
  };

  const handleSubmit = async () => {
    try {
      await onSubmitScores([{ a: String(player1Score), b: String(player2Score) }]);
      setPlayer1Score(0); setPlayer2Score(0); setEvents([]); setCurrentPeriod(1); setMinute("");
    } catch (e) {
      toast.error(scoreErrorMessage(e));
    }
  };

  const card = "bg-[#181A22] rounded-2xl border border-white/[0.06]";
  const teamColor = (n) => (n === 1 ? "#F97316" : "#3B82F6");
  const leadClass = (mine, other) => (mine > other ? "text-white" : mine < other ? "text-gray-500" : "text-gray-200");

  const Crest = ({ name, color }) => (
    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-black flex-shrink-0" style={{ background: color }}>
      {name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* ── SCORE HEADER ── */}
      <div className={`${card} p-5`}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Team 1 */}
          <div className="flex items-center gap-3">
            <Crest name={player1Name} color={teamColor(1)} />
            <div>
              <div className="text-sm font-bold text-gray-300 truncate max-w-[160px]">{player1Name || "Team A"}</div>
              <div className={`text-5xl font-black leading-none mt-1 ${leadClass(player1Score, player2Score)}`}>{player1Score}</div>
            </div>
          </div>
          {/* Center */}
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] px-5 py-3 text-center min-w-[120px]">
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>{labels?.matchResult || "Goals"}</div>
            <div className="text-2xl font-black text-gray-200">{player1Score} – {player2Score}</div>
            <div className="text-[11px] text-gray-400 mt-1">{periodLabel} {currentPeriod} · {periodDuration}′</div>
          </div>
          {/* Team 2 */}
          <div className="flex items-center gap-3 flex-row-reverse text-right">
            <Crest name={player2Name} color={teamColor(2)} />
            <div>
              <div className="text-sm font-bold text-gray-300 truncate max-w-[160px]">{player2Name || "Team B"}</div>
              <div className={`text-5xl font-black leading-none mt-1 ${leadClass(player2Score, player1Score)}`}>{player2Score}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PERIOD + MINUTE CONTROL ── */}
      <div className={`${card} p-3 flex items-center gap-3 flex-wrap`}>
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{periodLabel}:</span>
        {Array.from({ length: periods }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => setCurrentPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition w-auto ${currentPeriod === p ? "text-white" : "bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]"}`}
            style={currentPeriod === p ? { background: accent } : undefined}>
            {periodLabel} {p}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <input value={minute} onChange={(e) => setMinute(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            placeholder="min" inputMode="numeric"
            className="w-20 bg-[#12141B] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/20" />
          <span className="text-[11px] text-gray-500">optional</span>
        </div>
      </div>

      {/* ── GOAL/POINT ENTRY ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2].map((n) => {
          const name = n === 1 ? player1Name : player2Name;
          return (
            <div key={n} className={`${card} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-300 truncate">{name || `Team ${n === 1 ? "A" : "B"}`}</span>
                <button onClick={() => removeLastForPlayer(n)}
                  className="text-gray-500 hover:text-red-400 transition flex items-center gap-1 text-xs w-auto">
                  <Minus className="w-3.5 h-3.5" /> remove
                </button>
              </div>
              {pointValues ? (
                <div className="grid grid-cols-3 gap-2">
                  {pointValues.map((v) => (
                    <button key={v} onClick={() => addEvent(n, v)} disabled={submitting}
                      className="h-16 rounded-xl text-white font-black text-xl transition active:scale-95 disabled:opacity-40 w-auto"
                      style={{ background: teamColor(n) }}>
                      +{v}
                    </button>
                  ))}
                </div>
              ) : (
                <button onClick={() => addEvent(n)} disabled={submitting}
                  className="w-full h-16 rounded-xl text-white font-black text-lg transition active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: teamColor(n) }}>
                  <Plus className="w-5 h-5" /> {scoreLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── TIMELINE + ACTIONS ── */}
      <div className={`${card} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{scoreLabel} Timeline</span>
          <button onClick={undoLast} disabled={!events.length}
            className="text-gray-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold disabled:opacity-40 w-auto">
            <Undo2 className="w-3.5 h-3.5" /> Undo last
          </button>
        </div>
        {events.length ? (
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {[...events].reverse().map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-sm bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: teamColor(e.player) }} />
                <span className="font-semibold text-gray-100 truncate">{e.player === 1 ? player1Name : player2Name}</span>
                <span className="text-gray-400">+{e.value} {scoreLabel.toLowerCase()}</span>
                <span className="ml-auto text-[11px] text-gray-500">
                  {periodLabel} {e.period}{e.minute ? ` · ${e.minute}′` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic py-3 text-center">No {scoreLabel.toLowerCase()}s yet — tap a team's {scoreLabel} button.</div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><RefreshCcw className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save Final Score</>}
          </button>
          <button onClick={onRefresh} className="px-5 py-3 rounded-xl border border-white/[0.08] text-gray-300 hover:bg-white/[0.04] w-auto">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
