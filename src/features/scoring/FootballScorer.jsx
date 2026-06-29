import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Undo2, Settings, MoreVertical, Plus, Pencil, Clock,
  ArrowLeftRight, Flag, Goal, Hand, Ban, ListChecks, Calendar, MapPin,
  User, Trophy, Check, RefreshCcw, ShieldAlert,
} from "lucide-react";
import { toast } from "react-toastify";

/**
 * FootballScorer — rich, event-driven football board (dark theme, matches the
 * cricket board + the rest of the manager UI).
 *
 * Phase 1: the full designed layout. The GOAL TALLY persists to the backend on
 * "Save Match" (onSubmitScores([{a,b}]) → time-sport completeGame). Everything
 * else — player-attributed goals, cards, subs, corners, penalties, the events
 * timeline and editable match info — is tracked live in component state but is
 * NOT persisted yet (Phase 2 adds event/card/sub storage + mobile parity).
 *
 * Props: sportName, matchFormat, player1Name, player2Name, player1Squad,
 *        player2Squad, matchMeta, onSubmitScores, submitting, onBack, onRefresh
 */

const POS = ["GK", "DF", "DF", "MF", "MF", "FW", "FW", "FW", "MF", "DF", "FW"];
const toRoster = (squad, fallbackPrefix) =>
  (squad && squad.length ? squad : []).map((p, i) => ({
    number: p.battingOrder || p.number || i + 1,
    name: p.name || `${fallbackPrefix} ${i + 1}`,
    position: p.position || POS[i] || "FW",
  }));

const HALVES = ["FIRST HALF", "SECOND HALF", "EXTRA TIME", "PENALTIES"];

export default function FootballScorer({
  sportName,
  matchFormat,
  player1Name,
  player2Name,
  player1Squad = [],
  player2Squad = [],
  matchMeta = {},
  onSubmitScores,
  submitting,
  onBack,
  onRefresh,
}) {
  const teamName = (n) => (n === 1 ? player1Name : player2Name) || (n === 1 ? "Team A" : "Team B");

  const [score, setScore] = useState({ 1: 0, 2: 0 });
  const [half, setHalf] = useState("FIRST HALF");
  const [tab, setTab] = useState("score");
  const [team, setTeam] = useState(1); // selected team for goal/quick-select
  const [scorer, setScorer] = useState("");
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState("");
  const [roster, setRoster] = useState({
    1: toRoster(player1Squad, "Player"),
    2: toRoster(player2Squad, "Player"),
  });
  const [info, setInfo] = useState({
    venue: matchMeta.venue || "—",
    date: matchMeta.date ? new Date(matchMeta.date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—",
    referee: matchMeta.referee || "—",
    competition: matchMeta.competition || "—",
  });

  // match clock
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const timer = useRef(null);
  useEffect(() => {
    if (running) timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer.current);
  }, [running]);
  const clockStr = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  // ── event helpers ──
  const pushEvent = (e) => setEvents((prev) => [...prev, { id: prev.length + 1, half, clock: clockStr, ...e }]);
  const scoreGoal = (n) => {
    setScore((s) => ({ ...s, [n]: s[n] + 1 }));
    pushEvent({ type: "goal", team: n, player: scorer || null, label: "Goal", color: "#22C55E" });
    setScorer("");
  };
  const ownGoal = () => {
    const other = team === 1 ? 2 : 1;
    setScore((s) => ({ ...s, [other]: s[other] + 1 }));
    pushEvent({ type: "own_goal", team, beneficiary: other, player: scorer || null, label: "Own Goal", color: "#EF4444" });
  };
  const logEvent = (type, label, color) => pushEvent({ type, team, player: scorer || null, label, color });

  const undoLast = () => {
    if (!events.length) return;
    const last = events[events.length - 1];
    if (last.type === "goal") setScore((s) => ({ ...s, [last.team]: Math.max(0, s[last.team] - 1) }));
    else if (last.type === "own_goal") setScore((s) => ({ ...s, [last.beneficiary]: Math.max(0, s[last.beneficiary] - 1) }));
    setEvents((prev) => prev.slice(0, -1));
  };

  const addPlayer = (n) => {
    const name = window.prompt(`Add a player to ${teamName(n)}:`);
    if (!name) return;
    setRoster((r) => ({ ...r, [n]: [...r[n], { number: r[n].length + 1, name: name.trim(), position: "SUB" }] }));
  };
  const editInfo = (key, label) => {
    const val = window.prompt(`${label}:`, info[key]);
    if (val != null) setInfo((p) => ({ ...p, [key]: val.trim() || "—" }));
  };

  const save = async () => {
    setRunning(false);
    // A knockout match can't end level — decide it by penalty shootout.
    let penaltyWinner = null;
    if (matchMeta.isKnockout && score[1] === score[2]) {
      const w = window.prompt(
        `Knockout match level at ${score[1]}-${score[2]} — penalty shootout winner?\n` +
        `Type "1" for ${teamName(1)} or "2" for ${teamName(2)}:`
      );
      if (w !== "1" && w !== "2") { toast.info("Penalty winner required to finish a knockout."); setRunning(true); return; }
      penaltyWinner = w === "1" ? "player1" : "player2";
    }
    try {
      await onSubmitScores([{ a: String(score[1]), b: String(score[2]) }], { penaltyWinner });
      toast.success(penaltyWinner ? "Match saved (decided on penalties)" : "Match saved");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save match");
      setRunning(true);
    }
  };

  const teamColor = (n) => (n === 1 ? "#2563EB" : "#16A34A");
  const last5 = [...events].reverse().slice(0, 5);

  return (
    <div className="bg-[#0F1117] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.06] max-w-[1100px] mx-auto text-gray-200">
      {/* ── TOP HEADER ── */}
      <div className="bg-[#0a0d14] text-white px-4 sm:px-6 py-3 flex items-center gap-3 border-b border-white/[0.06]">
        <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-lg w-auto bg-transparent"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold text-base truncate flex-1">{matchMeta.tournamentTitle || "Football Tournament"}</h1>
        {running && <span className="px-2 py-0.5 rounded bg-green-600 text-white text-[11px] font-bold tracking-wide">LIVE</span>}
        <button onClick={() => setRunning((r) => !r)} className="font-mono text-lg font-bold tabular-nums w-auto bg-transparent" title={running ? "Pause clock" : "Resume clock"}>{clockStr}</button>
        <button onClick={undoLast} className="flex items-center gap-1.5 text-sm hover:bg-white/10 px-2 py-1 rounded w-auto bg-transparent"><Undo2 className="w-4 h-4" /> Undo</button>
        <button onClick={onRefresh} className="hidden sm:flex items-center gap-1.5 text-sm hover:bg-white/10 px-2 py-1 rounded w-auto bg-transparent"><Settings className="w-4 h-4" /> Settings</button>
        <button className="p-1 hover:bg-white/10 rounded w-auto bg-transparent"><MoreVertical className="w-5 h-5" /></button>
      </div>

      {/* ── SCORE BAND ── */}
      <div className="px-4 sm:px-8 py-5 border-b border-white/[0.06] bg-[#12141B]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center gap-4 justify-start">
            <Shield letter="A" color="#2563EB" />
            <span className="text-xl sm:text-2xl font-black tracking-wide text-gray-100 truncate">{teamName(1)}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3">
              <ScoreBox value={score[1]} />
              <span className="text-3xl font-black text-gray-600">-</span>
              <ScoreBox value={score[2]} />
            </div>
            <div className="mt-2 relative">
              <select value={half} onChange={(e) => setHalf(e.target.value)}
                className="appearance-none text-center text-[12px] font-bold text-emerald-400 bg-[#0F1117] border border-white/[0.08] rounded-lg pl-3 pr-7 py-1.5 cursor-pointer focus:outline-none">
                {HALVES.map((h) => <option key={h} className="bg-[#181A22]">{h}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-end">
            <span className="text-xl sm:text-2xl font-black tracking-wide text-gray-100 truncate">{teamName(2)}</span>
            <Shield letter="B" color="#16A34A" />
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center px-2 sm:px-6 border-b border-white/[0.06] overflow-x-auto bg-[#12141B]">
        <TabButton icon={Goal} label="Score" active={tab === "score"} onClick={() => setTab("score")} />
        <TabButton icon={CardIcon} label="Cards" active={tab === "cards"} onClick={() => setTab("cards")} />
        <TabButton icon={ArrowLeftRight} label="Substitution" active={tab === "substitution"} onClick={() => setTab("substitution")} />
        <TabButton icon={Clock} label="Timeline" active={tab === "timeline"} onClick={() => setTab("timeline")} />
        <TabButton icon={ListChecks} label="Notes" active={tab === "notes"} onClick={() => setTab("notes")} />
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="p-4 sm:p-6">
        {tab === "score" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT */}
            <div className="space-y-5">
              {/* Goal scoring */}
              <Panel title="Goal Scoring" subtitle="Select the team and player who scored">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[1, 2].map((n) => (
                    <button key={n} onClick={() => { setTeam(n); setScorer(""); }}
                      className={`py-3 rounded-lg font-bold text-sm transition w-auto border ${team === n ? "text-white border-transparent" : "bg-[#12141B] text-gray-300 border-white/[0.08] hover:bg-white/[0.04]"}`}
                      style={team === n ? { background: teamColor(n) } : undefined}>
                      {teamName(n)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-300">Goal Scorer ({teamName(team)})</span>
                  <button onClick={() => addPlayer(team)} className="flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300 w-auto bg-transparent"><Plus className="w-4 h-4" /> Add Player</button>
                </div>
                <select value={scorer} onChange={(e) => setScorer(e.target.value)}
                  className="w-full border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-200 bg-[#12141B] focus:outline-none focus:border-blue-400/60 mb-4">
                  <option value="" className="bg-[#181A22]">Select Player</option>
                  {roster[team].map((p, i) => <option key={i} value={p.name} className="bg-[#181A22]">#{p.number} {p.name} · {p.position}</option>)}
                </select>
                <button onClick={() => scoreGoal(team)} disabled={submitting}
                  className="w-full py-3.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-50">
                  <span className="text-lg">⚽</span> GOAL
                </button>
              </Panel>

              {/* Other events */}
              <Panel title="Other Events" subtitle="Select the event type and enter details">
                <div className="grid grid-cols-3 gap-3">
                  <EventBtn onClick={ownGoal} label="OWN GOAL"><span className="text-2xl">⚽</span></EventBtn>
                  <EventBtn onClick={() => logEvent("yellow", "Yellow Card", "#F59E0B")} label="YELLOW CARD"><CardIcon className="w-6 h-7" color="#F59E0B" /></EventBtn>
                  <EventBtn onClick={() => logEvent("red", "Red Card", "#DC2626")} label="RED CARD"><CardIcon className="w-6 h-7" color="#DC2626" /></EventBtn>
                  <EventBtn onClick={() => { setTab("substitution"); }} label="SUBSTITUTION"><ArrowLeftRight className="w-6 h-6 text-green-400" /></EventBtn>
                  <EventBtn onClick={() => logEvent("corner", "Corner Kick", "#3B82F6")} label="CORNER KICK"><Flag className="w-6 h-6 text-gray-300" /></EventBtn>
                  <EventBtn onClick={() => logEvent("penalty", "Penalty Kick", "#8B5CF6")} label="PENALTY KICK"><Goal className="w-6 h-6 text-gray-300" /></EventBtn>
                  <EventBtn onClick={() => logEvent("throwin", "Throw-In", "#6B7280")} label="THROW-IN"><Hand className="w-6 h-6 text-gray-300" /></EventBtn>
                  <EventBtn onClick={() => logEvent("foul", "Foul", "#EF4444")} label="FOUL"><ShieldAlert className="w-6 h-6 text-gray-300" /></EventBtn>
                  <EventBtn onClick={() => logEvent("clearance", "Clearance", "#6B7280")} label="CLEARANCE"><Ban className="w-6 h-6 text-gray-300" /></EventBtn>
                </div>
              </Panel>
            </div>

            {/* RIGHT */}
            <div className="space-y-5">
              <Panel title="Match Info">
                <div className="divide-y divide-white/[0.06]">
                  <InfoRow icon={MapPin} label="Venue" value={info.venue} onEdit={() => editInfo("venue", "Venue")} />
                  <InfoRow icon={Calendar} label="Match Date" value={info.date} onEdit={() => editInfo("date", "Match Date")} />
                  <InfoRow icon={User} label="Referee" value={info.referee} onEdit={() => editInfo("referee", "Referee")} />
                  <InfoRow icon={Trophy} label="Competition" value={info.competition} onEdit={() => editInfo("competition", "Competition")} />
                </div>
              </Panel>
              <Panel title="Last 5 Events">
                {last5.length ? (
                  <div className="space-y-2">
                    {last5.map((e) => <EventRow key={e.id} e={e} teamName={teamName} teamColor={teamColor} />)}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-gray-300">No events recorded yet</p>
                    <p className="text-sm">Start adding events using the options on the left.</p>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}

        {tab === "timeline" && (
          <Panel title="Match Timeline">
            {events.length ? (
              <div className="space-y-2">
                {[...events].reverse().map((e) => <EventRow key={e.id} e={e} teamName={teamName} teamColor={teamColor} />)}
              </div>
            ) : <Empty text="No events yet." />}
          </Panel>
        )}

        {tab === "cards" && (
          <Panel title="Cards" subtitle="Disciplinary events">
            <div className="flex gap-3 mb-4">
              <button onClick={() => logEvent("yellow", "Yellow Card", "#F59E0B")} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30 w-auto"><CardIcon className="w-4 h-5" color="#F59E0B" /> Yellow ({teamName(team)})</button>
              <button onClick={() => logEvent("red", "Red Card", "#DC2626")} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-300 font-bold border border-red-500/30 w-auto"><CardIcon className="w-4 h-5" color="#DC2626" /> Red ({teamName(team)})</button>
            </div>
            {events.filter((e) => e.type === "yellow" || e.type === "red").length
              ? <div className="space-y-2">{events.filter((e) => e.type === "yellow" || e.type === "red").reverse().map((e) => <EventRow key={e.id} e={e} teamName={teamName} teamColor={teamColor} />)}</div>
              : <Empty text="No cards shown yet." />}
          </Panel>
        )}

        {tab === "substitution" && (
          <Panel title="Substitution" subtitle={`Log a substitution for ${teamName(team)}`}>
            <button onClick={() => logEvent("sub", "Substitution", "#16A34A")} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30 w-auto mb-4">
              <ArrowLeftRight className="w-4 h-4" /> Record Substitution ({teamName(team)})
            </button>
            {events.filter((e) => e.type === "sub").length
              ? <div className="space-y-2">{events.filter((e) => e.type === "sub").reverse().map((e) => <EventRow key={e.id} e={e} teamName={teamName} teamColor={teamColor} />)}</div>
              : <Empty text="No substitutions yet." />}
          </Panel>
        )}

        {tab === "notes" && (
          <Panel title="Match Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Add match notes…"
              className="w-full border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-200 bg-[#12141B] placeholder-gray-600 focus:outline-none focus:border-blue-400/60 resize-none" />
          </Panel>
        )}

        {/* Quick player selection */}
        <Panel title={`Quick Player Selection (${teamName(team)})`} className="mt-5">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {roster[team].map((p, i) => (
              <button key={i} onClick={() => setScorer(p.name)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-shrink-0 transition w-auto ${scorer === p.name ? "border-blue-500/60 bg-blue-500/10" : "border-white/[0.08] bg-[#12141B] hover:bg-white/[0.05]"}`}>
                <Jersey number={p.number} color={teamColor(team)} />
                <div className="text-left leading-tight">
                  <div className="text-sm font-bold text-gray-100">{p.name}</div>
                  <div className="text-[11px] text-gray-500 font-semibold">{p.position}</div>
                </div>
              </button>
            ))}
            <button onClick={() => addPlayer(team)} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/15 text-gray-400 flex-shrink-0 hover:bg-white/[0.05] w-auto bg-[#12141B]">
              <Plus className="w-4 h-4" /> <span className="text-sm font-semibold">Add Player</span>
            </button>
          </div>
        </Panel>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="px-4 sm:px-6 py-3 bg-[#12141B] border-t border-white/[0.06] flex items-center gap-3">
        <button onClick={undoLast} disabled={!events.length}
          className="flex items-center gap-2 px-5 py-3 rounded-lg text-blue-400 font-bold hover:bg-blue-500/10 disabled:opacity-40 w-auto bg-transparent">
          <Undo2 className="w-4 h-4" /> UNDO LAST ACTION
        </button>
        <button onClick={save} disabled={submitting}
          className="flex-1 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-50">
          {submitting ? <><RefreshCcw className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> SAVE MATCH</>}
        </button>
      </div>
    </div>
  );
}

/* ── module-scope sub-components (hoisted so inputs never remount) ── */
function Shield({ letter, color }) {
  return (
    <svg viewBox="0 0 100 120" className="w-14 h-16 sm:w-16 sm:h-20 flex-shrink-0">
      <path d="M50 5 L92 21 V58 C92 88 73 107 50 115 C27 107 8 88 8 58 V21 Z" fill={color} stroke="#fff" strokeWidth="4" opacity="0.95" />
      <text x="50" y="42" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" opacity="0.85">TEAM</text>
      <text x="50" y="78" textAnchor="middle" fill="#fff" fontSize="34" fontWeight="900">{letter}</text>
    </svg>
  );
}
function ScoreBox({ value }) {
  return <div className="w-16 h-16 rounded-lg border border-white/[0.08] bg-[#0F1117] flex items-center justify-center text-4xl font-black text-gray-100">{value}</div>;
}
function TabButton({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition flex-shrink-0 w-auto bg-transparent ${active ? "text-blue-400 border-blue-500" : "text-gray-400 border-transparent hover:text-gray-200"}`}>
      <Icon className="w-4 h-4" {...(label === "Cards" ? { color: active ? "#60A5FA" : "#F59E0B" } : {})} /> {label}
    </button>
  );
}
function CardIcon({ className = "w-5 h-6", color = "#F59E0B" }) {
  return <span className={`inline-block rounded-[3px] ${className}`} style={{ background: color }} />;
}
function Panel({ title, subtitle, children, className = "" }) {
  return (
    <div className={`bg-[#181A22] rounded-xl border border-white/[0.06] p-4 sm:p-5 ${className}`}>
      <h3 className="font-bold text-gray-100">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}
function EventBtn({ onClick, label, children }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-white/[0.08] bg-[#12141B] hover:bg-white/[0.05] hover:border-white/[0.12] transition w-auto">
      {children}
      <span className="text-[11px] font-bold text-gray-300 text-center leading-tight">{label}</span>
    </button>
  );
}
function InfoRow({ icon: Icon, label, value, onEdit }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="flex items-center gap-2.5 text-sm text-gray-400"><Icon className="w-4 h-4 text-gray-500" /> {label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-100">{value}</span>
        <button onClick={onEdit} className="text-gray-500 hover:text-gray-300 w-auto bg-transparent"><Pencil className="w-3.5 h-3.5" /></button>
      </span>
    </div>
  );
}
function Jersey({ number, color }) {
  return (
    <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 40 40" className="w-8 h-8"><path d="M13 4 L8 9 L4 14 L9 19 V36 H31 V19 L36 14 L32 9 L27 4 L24 7 H16 Z" fill={color} /></svg>
      <span className="absolute text-[10px] font-black text-white">{number}</span>
    </div>
  );
}
function EventRow({ e, teamName, teamColor }) {
  return (
    <div className="flex items-center gap-3 bg-white/[0.04] rounded-lg px-3 py-2">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color || teamColor(e.team) }} />
      <span className="font-semibold text-sm text-gray-100">{e.label}</span>
      {e.player && <span className="text-sm text-gray-400">· {e.player}</span>}
      <span className="text-xs text-gray-500 ml-auto">{teamName(e.team)} · {e.half.replace(" HALF", "H")} {e.clock}</span>
    </div>
  );
}
function Empty({ text }) {
  return <div className="text-center py-8 text-gray-500 text-sm">{text}</div>;
}
