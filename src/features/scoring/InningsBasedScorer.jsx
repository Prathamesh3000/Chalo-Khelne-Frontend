import { useState, useEffect } from "react";
import { Undo2, LayoutGrid, FileText, Users, BarChart3, Info, Plus, X, GripVertical, Pencil } from "lucide-react";
import { toast } from "react-toastify";

/**
 * Cricket scorer — innings/over level, INCREMENTAL, professional broadcast board.
 *
 * Now lineup-aware: the scorer sets overs + batting order + bowling order at the
 * start of each innings (typed names — no squad system), the board tracks the
 * live striker / non-striker / bowler with strike rotation, and the order or
 * roles can be changed at any time during the match.
 *
 * Per-batsman and per-bowler figures are derived from the per-ball striker /
 * bowler now recorded on every delivery.
 *
 * Props: config, matchFormat, player1Name, player2Name, liveScore,
 *        onSetupInnings, onUpdateLineup, onSubmitBall, onUndoBall,
 *        onSwitchInnings, onFinishMatch, submitting, onRefresh
 */
export default function InningsBasedScorer({
  config,
  matchFormat,
  player1Name,
  player2Name,
  liveScore,
  player1Squad,
  player2Squad,
  onSetupInnings,
  onUpdateLineup,
  onSubmitBall,
  onUndoBall,
  onSwitchInnings,
  onFinishMatch,
  submitting,
  onRefresh,
}) {
  const innings = liveScore?.innings || [];
  const currentInnings = liveScore?.currentInnings || 1;
  const [firstBatting, setFirstBatting] = useState("player1");

  // Setup form state (overs + lineups), used before an innings is configured.
  const defaultOvers = matchFormat?.oversCount || config?.defaults?.overs || 5;
  const [oversInput, setOversInput] = useState(String(defaultOvers));
  const [batList, setBatList] = useState([]);
  const [bowlList, setBowlList] = useState([]);
  const [showLineup, setShowLineup] = useState(false);

  const currentInn = innings.find((i) => i.inningsNumber === currentInnings) || null;
  const battingSide =
    currentInn?.battingSide ||
    (currentInnings === 1 ? firstBatting : firstBatting === "player1" ? "player2" : "player1");

  // Team rosters → ordered player names (the batting team bats, the other bowls).
  const squadNames = (sq) =>
    (sq || []).slice().sort((a, b) => (a.battingOrder || 999) - (b.battingOrder || 999)).map((p) => p.name).filter(Boolean);
  const batSquad = squadNames(battingSide === "player1" ? player1Squad : player2Squad);
  const bowlSquad = squadNames(battingSide === "player1" ? player2Squad : player1Squad);

  // Seed the setup lists from the squads whenever the batting side / rosters
  // change. Falls back to blank rows when no squad exists.
  useEffect(() => {
    setBatList(batSquad.length ? batSquad : ["", ""]);
    setBowlList(bowlSquad.length ? bowlSquad : [""]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battingSide, (player1Squad || []).length, (player2Squad || []).length]);

  const inn = currentInn || { runs: 0, wickets: 0, oversBowled: 0, ballsBowled: 0, extras: {}, deliveries: [], fallOfWickets: [], battingOrder: [], bowlingOrder: [] };
  const ex = inn.extras || {};
  const extrasTotal = (ex.wides || 0) + (ex.noBalls || 0) + (ex.byes || 0) + (ex.legByes || 0);
  const maxOvers = inn.maxOvers || matchFormat?.oversCount || defaultOvers;

  const battingOrder = inn.battingOrder || [];
  const bowlingOrder = inn.bowlingOrder || [];
  const striker = inn.striker || null;
  const nonStriker = inn.nonStriker || null;
  const bowler = inn.currentBowler || null;
  // Treat an innings as already set up if it has a striker, a lineup, OR balls
  // bowled (so matches scored before this feature don't show the setup screen).
  const isSetup = !!(inn.striker || battingOrder.length > 0 || (inn.deliveries || []).length > 0);

  const sideName = (s) => (s === "player1" ? player1Name : player2Name) || (s === "player1" ? "Team A" : "Team B");
  const innForSide = (s) => innings.find((i) => i.battingSide === s) || (s === battingSide ? inn : null);

  const dels = inn.deliveries || [];

  // ── per-player aggregates (from per-ball striker/bowler) ──
  const batStats = (name) => {
    let r = 0, b = 0, f = 0, sx = 0;
    for (const d of dels) {
      if (!name || d.striker !== name) continue;
      const off = Number(d.runs) || 0;
      r += off;
      if (d.legalDelivery !== false) b += 1;
      if (off === 4) f += 1;
      if (off === 6) sx += 1;
    }
    return { r, b, f, sx, sr: b ? ((r / b) * 100).toFixed(1) : "0.0" };
  };
  const bowlStats = (name) => {
    let runs = 0, wk = 0, legal = 0;
    for (const d of dels) {
      if (!name || d.bowler !== name) continue;
      runs += (Number(d.runs) || 0) + (Number(d.extraRuns) || 0);
      if (d.isWicket) wk += 1;
      if (d.legalDelivery !== false) legal += 1;
    }
    return { ov: `${Math.floor(legal / 6)}.${legal % 6}`, runs, wk, econ: legal ? (runs / (legal / 6)).toFixed(1) : "0.0" };
  };

  // ── submit a delivery, computing strike rotation + roles ──
  const submit = async (payload) => {
    try {
      const legalBefore = (inn.oversBowled || 0) * 6 + (inn.ballsBowled || 0);
      const isLegal = payload.legalDelivery !== false;
      const legalAfter = legalBefore + (isLegal ? 1 : 0);
      const off = Number(payload.runs) || 0;
      let s = striker, ns = nonStriker, b = bowler;

      // Wicket → next batsman replaces the striker (openers at index 0,1).
      if (payload.isWicket) {
        const newWk = (inn.wickets || 0) + 1;
        s = battingOrder[newWk + 1] || null;
      }
      // Odd runs off the bat → swap ends.
      if (isLegal && off % 2 === 1) { const t = s; s = ns; ns = t; }
      // End of over → swap ends + next bowler.
      if (isLegal && legalAfter > 0 && legalAfter % 6 === 0) {
        const t = s; s = ns; ns = t;
        if (bowlingOrder.length > 1) {
          const idx = bowlingOrder.indexOf(b);
          b = bowlingOrder[(idx + 1) % bowlingOrder.length];
        }
      }

      await onSubmitBall({
        innings: currentInnings, battingPlayer: battingSide,
        striker, bowler,                       // who faced / bowled THIS ball
        nextStriker: s, nextNonStriker: ns, nextBowler: b, // after rotation
        ...payload,
      });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not record delivery");
    }
  };
  const addRuns = (v) => submit({ runs: v, legalDelivery: true });
  const addWicket = () => submit({ runs: 0, isWicket: true, legalDelivery: true });
  const addExtra = (e) => submit({ runs: 0, extra: e, extraRuns: 1, legalDelivery: !(e === "wide" || e === "no-ball") });
  const undo = async () => { try { await onUndoBall(); } catch { toast.error("Undo failed"); } };
  const switchInnings = async () => { try { await onSwitchInnings(); } catch (e) { toast.error(e?.response?.data?.message || "Could not switch innings"); } };
  const finish = async () => {
    try {
      const res = await onFinishMatch({});
      if (res?.winnerSide === null) {
        const w = window.prompt(`Match tied! Super-over winner — "1" for ${sideName("player1")} or "2" for ${sideName("player2")}:`);
        if (w === "1" || w === "2") await onFinishMatch({ result: "super_over", winner: w === "1" ? "player1" : "player2" });
      }
    } catch (e) { toast.error(e?.response?.data?.message || "Could not finish match"); }
  };

  // ── change a live role mid-match ──
  const setRole = async (field, value) => {
    try { await onUpdateLineup({ innings: currentInnings, [field]: value }); }
    catch (e) { toast.error(e?.response?.data?.message || "Could not update"); }
  };
  const saveOrder = async (battingOrderNew, bowlingOrderNew) => {
    try { await onUpdateLineup({ innings: currentInnings, battingOrder: battingOrderNew, bowlingOrder: bowlingOrderNew }); toast.success("Lineup updated"); }
    catch (e) { toast.error(e?.response?.data?.message || "Could not update lineup"); }
  };

  // ── setup submit ──
  const startInnings = async () => {
    const bo = batList.map((s) => s.trim()).filter(Boolean);
    const wo = bowlList.map((s) => s.trim()).filter(Boolean);
    if (bo.length < 2) return toast.error("Add at least 2 batsmen");
    if (wo.length < 1) return toast.error("Add at least 1 bowler");
    const ov = Math.max(1, parseInt(oversInput, 10) || 0);
    try {
      await onSetupInnings({
        innings: currentInnings, battingPlayer: battingSide, maxOvers: ov,
        battingOrder: bo, bowlingOrder: wo, striker: bo[0], nonStriker: bo[1], currentBowler: wo[0],
      });
    } catch (e) { toast.error(e?.response?.data?.message || "Could not start innings"); }
  };

  const card = "bg-[#181A22] rounded-2xl border border-white/[0.06]";
  const COL = "grid grid-cols-1 xl:grid-cols-[1fr_1fr_340px] gap-3";

  // ── SETUP SCREEN (before the innings is configured) ──
  if (!isSetup) {
    return (
      <div className="space-y-3">
        <div className={`${card} p-5 space-y-4`}>
          <h3 className="text-lg font-black text-white">Set up Innings {currentInnings}</h3>

          {currentInnings === 1 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Batting first:</span>
              {["player1", "player2"].map((s) => (
                <button key={s} onClick={() => setFirstBatting(s)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition w-auto ${firstBatting === s ? "bg-orange-500 text-white" : "bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]"}`}>
                  {sideName(s)}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overs:</span>
            <input type="number" min="1" value={oversInput} onChange={(e) => setOversInput(e.target.value)}
              className="w-24 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-bold" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ReorderList
              title={`Batting order — ${sideName(battingSide)}`}
              list={batList} setList={setBatList}
              hint={batSquad.length ? "Loaded from the team — reorder, then start." : "No squad — add players."} />
            <ReorderList
              title={`Bowling order — ${sideName(battingSide === "player1" ? "player2" : "player1")}`}
              list={bowlList} setList={setBowlList}
              hint={bowlSquad.length ? "Loaded from the team — reorder as needed." : "No squad — add players."} />
          </div>

          <button onClick={startInnings} disabled={submitting}
            className="w-full h-12 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition disabled:opacity-50">
            Start Innings {currentInnings}
          </button>
        </div>
      </div>
    );
  }

  const ss = batStats(striker);
  const ns = batStats(nonStriker);
  const bs = bowlStats(bowler);
  const overs = splitOvers(dels);
  const thisOver = overs[overs.length - 1] || [];
  const recent = dels.slice(-6);
  const fow = inn.fallOfWickets || [];
  const disabled = submitting || inn.status === "COMPLETED";

  return (
    <div className="space-y-3">
      {/* ── ROW 1: header band ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-3">
        <div className={`${card} p-5`}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TeamCard letter="A" color="#2563EB" name={sideName("player1")} inn={innForSide("player1")} batting={battingSide === "player1"} align="left" />
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] px-5 py-3 text-center min-w-[110px]">
              <div className="text-sm font-bold text-gray-200">VS</div>
              <div className="text-[11px] text-gray-400 mt-1">{maxOvers} Overs</div>
              <div className="text-[11px] text-gray-400">Innings {currentInnings}</div>
            </div>
            <TeamCard letter="B" color="#16A34A" name={sideName("player2")} inn={innForSide("player2")} batting={battingSide === "player2"} align="right" />
          </div>
        </div>
        <div className={`${card} p-4 flex flex-col justify-center divide-y divide-white/[0.06]`}>
          <RailStat label="Current Run Rate" value={liveScore?.currentRunRate ?? "0.00"} big />
          <RailStat label="Required Run Rate" value={liveScore?.requiredRate ?? "—"} accent="text-orange-400" />
          <RailStat label="Target" value={liveScore?.target ?? "—"} accent="text-emerald-400" />
        </div>
      </div>

      {/* ── ROW 2: batsmen / bowler+thisover / partnership ── */}
      <div className={COL}>
        {/* Batsmen (live striker / non-striker) */}
        <div className={`${card} p-4`}>
          <div className="grid grid-cols-[1fr_repeat(5,minmax(0,42px))] text-[10px] font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-white/[0.06]">
            <span>Batsman</span><span className="text-right">R</span><span className="text-right">B</span><span className="text-right">4s</span><span className="text-right">6s</span><span className="text-right">SR</span>
          </div>
          <BatRow name={striker} stats={ss} onStrike order={battingOrder} onChange={(v) => setRole("striker", v)} />
          <BatRow name={nonStriker} stats={ns} order={battingOrder} onChange={(v) => setRole("nonStriker", v)} />
        </div>
        {/* Bowler + this over */}
        <div className={`${card} p-4`}>
          <div className="grid grid-cols-[1fr_repeat(4,minmax(0,46px))] text-[10px] font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-white/[0.06]">
            <span>Bowler</span><span className="text-right">O</span><span className="text-right">R</span><span className="text-right">W</span><span className="text-right">Econ</span>
          </div>
          <div className="grid grid-cols-[1fr_repeat(4,minmax(0,46px))] items-center py-2">
            <RoleSelect value={bowler} options={bowlingOrder} onChange={(v) => setRole("currentBowler", v)} />
            <span className="text-right text-sm font-bold text-white">{bs.ov}</span>
            <span className="text-right text-sm text-gray-300">{bs.runs}</span>
            <span className="text-right text-sm text-gray-300">{bs.wk}</span>
            <span className="text-right text-sm text-gray-300">{bs.econ}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap border-t border-white/[0.06] pt-3 mt-1">
            <span className="text-[11px] font-bold text-gray-400">This Over:</span>
            {thisOver.length ? thisOver.map((d, i) => ballPill(d, i)) : <span className="text-xs text-gray-500 italic">—</span>}
          </div>
        </div>
        {/* Lineup control */}
        <div className={`${card} p-4`}>
          <button onClick={() => setShowLineup((v) => !v)} className="w-full flex items-center justify-between text-left">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Lineups</span>
            <Pencil className="w-4 h-4 text-gray-400" />
          </button>
          {showLineup ? (
            <LineupEditor battingOrder={battingOrder} bowlingOrder={bowlingOrder} onSave={saveOrder} />
          ) : (
            <div className="mt-3 space-y-1 text-[11px] text-gray-400">
              <div><span className="text-gray-500">Batting:</span> {battingOrder.join(", ") || "—"}</div>
              <div><span className="text-gray-500">Bowling:</span> {bowlingOrder.join(", ") || "—"}</div>
              <div className="text-gray-600 italic mt-2">Tap ✏ to reorder or add players.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 3: scoring grid / recent+extras / fall of wickets ── */}
      <div className={COL}>
        <div className={`${card} p-3`}>
          <div className="grid grid-cols-4 gap-2">
            <RunKey v={0} label="Zero" onClick={addRuns} disabled={disabled} />
            <RunKey v={1} label="One" onClick={addRuns} disabled={disabled} />
            <RunKey v={2} label="Two" onClick={addRuns} disabled={disabled} />
            <RunKey v={3} label="Three" onClick={addRuns} disabled={disabled} />
            <RunKey v={4} label="Boundary" color="bg-blue-600 hover:bg-blue-500 border-blue-500" onClick={addRuns} disabled={disabled} />
            <RunKey v={6} label="Six" color="bg-emerald-600 hover:bg-emerald-500 border-emerald-500" onClick={addRuns} disabled={disabled} />
            <ActionKey t="W" label="Wicket" color="bg-red-600 hover:bg-red-500" onClick={addWicket} disabled={disabled} />
            <ActionKey t="WD" label="Wide" color="bg-amber-600 hover:bg-amber-500" onClick={() => addExtra("wide")} disabled={disabled} />
            <ActionKey t="NB" label="No Ball" color="bg-purple-600 hover:bg-purple-500" onClick={() => addExtra("no-ball")} disabled={disabled} />
            <ActionKey t="LB" label="Leg Bye" color="bg-teal-600 hover:bg-teal-500" onClick={() => addExtra("leg-bye")} disabled={disabled} />
            <ActionKey t="B" label="Bye" color="bg-orange-700 hover:bg-orange-600" onClick={() => addExtra("bye")} disabled={disabled} />
            <ActionKey t="↺" label="Swap Strike" color="bg-white/[0.06]" textCls="text-gray-200" onClick={() => onUpdateLineup({ innings: currentInnings, striker: nonStriker, nonStriker: striker })} disabled={disabled} />
          </div>
          <button onClick={undo} disabled={submitting || dels.length === 0}
            className="w-full mt-2 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-300 font-bold hover:bg-white/[0.08] transition flex items-center justify-center gap-2 disabled:opacity-40">
            <Undo2 className="w-4 h-4" /> UNDO LAST BALL
          </button>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {currentInnings === 1 ? (
              <button onClick={switchInnings} disabled={submitting}
                className="h-11 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition disabled:opacity-50 w-auto">
                End Innings 1
              </button>
            ) : <div />}
            <button onClick={finish} disabled={submitting}
              className="h-11 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition disabled:opacity-50 w-auto">
              Finish Match
            </button>
          </div>
        </div>

        <div className={`${card} p-4 space-y-3`}>
          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Recent Balls</div>
            <div className="flex gap-2 flex-wrap min-h-[36px]">
              {recent.length ? recent.map((d, i) => ballPill(d, i)) : <span className="text-sm text-gray-500 italic">No balls yet</span>}
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-300">Extras</span>
              <span className="text-sm font-black text-white">{extrasTotal}</span>
            </div>
            <div className="text-[11px] text-gray-500">Byes: {ex.byes || 0} · Leg Byes: {ex.legByes || 0} · Wides: {ex.wides || 0} · No Balls: {ex.noBalls || 0}</div>
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
              <span className="text-sm font-bold text-gray-300">Total</span>
              <span className="text-lg font-black text-white">{inn.runs ?? 0}/{inn.wickets ?? 0}</span>
            </div>
          </div>
        </div>

        <div className={`${card} p-4`}>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Fall of Wickets</div>
          {fow.length ? (
            <div className="divide-y divide-white/[0.05]">
              {fow.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-bold text-white">{f.wicket}-{f.runs}</span>
                  <span className="text-xs text-gray-400">{f.over} ov</span>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-gray-500 italic py-3 text-center">No wickets yet</div>}
        </div>
      </div>

      <div className={`${card} px-4 py-2.5 flex items-center justify-around`}>
        <TabItem icon={LayoutGrid} label="Scoreboard" active />
        <TabItem icon={FileText} label="Score Card" />
        <TabItem icon={Users} label="Squad" />
        <TabItem icon={BarChart3} label="Stats" />
        <TabItem icon={Info} label="Info" />
      </div>
    </div>
  );
}

/* ── sub-components ── */
// Drag-and-drop reorderable name list. The grip handle is the only draggable
// element so the text inputs stay editable; rows are drop targets and reorder
// live as you drag over them.
function ReorderList({ title, list, setList, hint, compact }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const setAt = (i, v) => setList(list.map((x, idx) => (idx === i ? v : x)));
  const removeAt = (i) => setList(list.filter((_, idx) => idx !== i));
  const add = () => setList([...list, ""]);
  const reorder = (from, to) => {
    if (from == null || from === to) return;
    const n = [...list];
    const [moved] = n.splice(from, 1);
    n.splice(to, 0, moved);
    setList(n);
  };
  const onDragOver = (e, i) => {
    e.preventDefault();
    setOverIndex(i);
    if (dragIndex != null && dragIndex !== i) {
      reorder(dragIndex, i);
      setDragIndex(i);
    }
  };
  const endDrag = () => { setDragIndex(null); setOverIndex(null); };
  const inputCls = compact ? "text-xs px-2 py-1.5" : "text-sm px-3 py-2";

  return (
    <div>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</div>
      <div className={compact ? "space-y-1" : "space-y-1.5"}>
        {list.map((n, i) => (
          <div key={i}
            onDragOver={(e) => onDragOver(e, i)}
            onDrop={endDrag}
            className={`flex items-center gap-2 rounded-lg transition ${dragIndex === i ? "opacity-40" : ""} ${overIndex === i && dragIndex !== i ? "ring-1 ring-emerald-500/50" : ""}`}>
            <span
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={endDrag}
              className="shrink-0 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 p-0.5"
              title="Drag to reorder">
              <GripVertical className="w-4 h-4" />
            </span>
            <span className="text-xs text-gray-500 w-5 shrink-0 text-right">{i + 1}.</span>
            <input value={n} onChange={(e) => setAt(i, e.target.value)} placeholder={`Player ${i + 1}`}
              className={`flex-1 min-w-0 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white ${inputCls}`} />
            <button onClick={() => removeAt(i)} className="w-8 h-8 shrink-0 rounded-md bg-white/[0.05] hover:bg-red-500/20 flex items-center justify-center">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="mt-2 inline-flex w-auto items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300">
        <Plus className="w-4 h-4" /> Add player
      </button>
      {hint ? <div className="text-[11px] text-gray-600 italic mt-1">{hint}</div> : null}
    </div>
  );
}

function RoleSelect({ value, options, onChange }) {
  const opts = Array.from(new Set([...(options || []), value].filter(Boolean)));
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)}
      className="bg-transparent text-sm font-bold text-white outline-none max-w-[150px] truncate">
      {!value ? <option value="">—</option> : null}
      {opts.map((o) => <option key={o} value={o} className="bg-[#181A22]">{o}</option>)}
    </select>
  );
}

function BatRow({ name, stats, onStrike, order, onChange }) {
  return (
    <div className="grid grid-cols-[1fr_repeat(5,minmax(0,42px))] items-center py-2 border-b border-white/[0.04]">
      <div className="flex items-center gap-1 min-w-0">
        {onStrike ? <span className="text-emerald-400 font-black">★</span> : null}
        <RoleSelect value={name} options={order} onChange={onChange} />
      </div>
      <span className="text-right text-sm font-bold text-white">{stats.r}</span>
      <span className="text-right text-sm text-gray-300">{stats.b}</span>
      <span className="text-right text-sm text-gray-300">{stats.f}</span>
      <span className="text-right text-sm text-gray-300">{stats.sx}</span>
      <span className="text-right text-sm text-gray-300">{stats.sr}</span>
    </div>
  );
}

function LineupEditor({ battingOrder, bowlingOrder, onSave }) {
  const [bat, setBat] = useState(battingOrder);
  const [bowl, setBowl] = useState(bowlingOrder);
  return (
    <div className="mt-3 space-y-3">
      <ReorderList title="Batting order" list={bat} setList={setBat} compact hint="Drag ⠿ to reorder." />
      <ReorderList title="Bowling order" list={bowl} setList={setBowl} compact />
      <button onClick={() => onSave(bat.map((s) => s.trim()).filter(Boolean), bowl.map((s) => s.trim()).filter(Boolean))}
        className="w-full mt-1 h-9 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">
        Save lineup
      </button>
    </div>
  );
}

function ballPill(d, i) {
  let t = "0", cls = "bg-transparent text-gray-300 border border-white/15";
  if (d.isWicket) { t = "W"; cls = "bg-red-600 text-white"; }
  else if (d.extra === "wide") { t = "WD"; cls = "bg-amber-500 text-white"; }
  else if (d.extra === "no-ball") { t = "NB"; cls = "bg-purple-500 text-white"; }
  else {
    const r = (Number(d.runs) || 0) + (Number(d.extraRuns) || 0);
    t = String(r);
    if (r === 4) cls = "bg-blue-600 text-white";
    else if (r === 6) cls = "bg-emerald-600 text-white";
  }
  return <span key={i} className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold flex-shrink-0 ${cls}`}>{t}</span>;
}

function splitOvers(dels) {
  const overs = []; let cur = []; let legal = 0;
  for (const d of dels) {
    cur.push(d);
    if (d.legalDelivery !== false) { legal++; if (legal % 6 === 0) { overs.push(cur); cur = []; } }
  }
  if (cur.length) overs.push(cur);
  return overs;
}

function TeamCard({ letter, color, name, inn, batting, align }) {
  const score = inn ? `${inn.runs ?? 0}/${inn.wickets ?? 0}` : null;
  const overs = inn ? `${inn.oversBowled ?? 0}.${inn.ballsBowled ?? 0} Overs` : null;
  const badge = batting ? ["Batting", "bg-blue-600"] : ["Bowling", "bg-emerald-600"];
  const shield = (
    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center flex-shrink-0">
      <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-white leading-none" style={{ background: color }}>
        <span className="text-[7px] font-black">TEAM</span>
        <span className="text-base font-black">{letter}</span>
      </div>
    </div>
  );
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {shield}
      <div>
        <div className="text-base font-black text-white">{name}</div>
        {score && <div className="text-4xl font-black text-white leading-none my-0.5">{score}</div>}
        {overs && <div className="text-[11px] text-gray-400">{overs}</div>}
        <span className={`inline-block mt-1.5 px-3 py-1 rounded-full text-white text-[11px] font-bold ${badge[1]}`}>{badge[0]}</span>
      </div>
    </div>
  );
}

function RailStat({ label, value, accent = "text-white", big }) {
  return (
    <div className="py-2 text-center">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`font-black ${big ? "text-3xl" : "text-xl"} ${accent}`}>{value}</div>
    </div>
  );
}

function RunKey({ v, label, color, onClick, disabled }) {
  return (
    <button onClick={() => onClick(v)} disabled={disabled}
      className={`h-20 rounded-xl flex flex-col items-center justify-center transition active:scale-95 disabled:opacity-40 w-auto ${color || "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white"}`}>
      <span className={`text-3xl font-black ${color ? "text-white" : ""}`}>{v}</span>
      <span className="text-[9px] font-bold uppercase opacity-70 mt-0.5">{label}</span>
    </button>
  );
}

function ActionKey({ t, label, color, textCls = "text-white", onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`h-20 rounded-xl flex flex-col items-center justify-center transition active:scale-95 disabled:opacity-40 w-auto ${color} ${textCls}`}>
      <span className="text-2xl font-black">{t}</span>
      <span className="text-[9px] font-bold uppercase opacity-80 mt-0.5">{label}</span>
    </button>
  );
}

function TabItem({ icon: Icon, label, active }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${active ? "text-blue-400" : "text-gray-500"}`}>
      <Icon className="w-5 h-5" />
      <span className="text-[11px] font-semibold">{label}</span>
    </div>
  );
}
