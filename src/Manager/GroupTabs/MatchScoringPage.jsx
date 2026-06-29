import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Trophy, RefreshCcw, Check, AlertCircle } from "lucide-react";
import useMatchScoring from "../Tournament/useMatchScoring";
import { DynamicScorer, getSportConfig } from "../../features/scoring";
import { Breadcrumbs } from "../../shared/ui";

/**
 * Detects whether the match format uses nested games (Tennis) or flat sets (TT, Badminton).
 * Mirror of server/factories/MatchFactory.js → hasNestedGames.
 * Kept inline because sports_app has no shared utils with the Express server.
 */
function hasNestedGames(fmt) {
  if (!fmt || typeof fmt !== "object") return false;
  if (fmt.gamesPerSet != null && Number(fmt.gamesPerSet) > 0) return true;
  const tg = Number(fmt.totalGames);
  const ts = Number(fmt.totalSets);
  if (Number.isFinite(tg) && Number.isFinite(ts) && tg > 1 && tg !== ts) return true;
  return false;
}

/**
 * Dedicated match scoring page — sport-aware.
 * Route: /tournament-management/match/:tournamentId/:matchId/score
 * Works for group stage, knockout, direct knockout, team knockout.
 * Renders sport-appropriate chrome (header, scorecard) around DynamicScorer.
 */
export default function MatchScoringPage() {
  const { matchId, tournamentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Default back target carries `?tab=groups` so the user lands on the Groups
  // tab they came from, not the default Players tab. An explicit
  // `location.state.backTo` (passed by callers that want a different
  // destination) still wins.
  const backTo = location.state?.backTo || `/tournament-management/group-stage?tournamentId=${tournamentId}&tab=groups`;

  const {
    match, matchFormat, loading, error, submitting,
    player1Name, player2Name,
    sets, player1SetsWon, player2SetsWon,
    isCompleted, isInProgress, winnerName,
    submitBulkScores, loadMatch,
    liveScore,
    setupCricketInnings, updateCricketLineup,
    submitCricketBall, undoCricketBall, switchCricketInnings, finishCricketMatch,
    submitCarromBoard,
  } = useMatchScoring(matchId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white/[0.04]">
        <div className="text-center">
          <RefreshCcw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading match...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="flex items-center justify-center h-screen bg-white/[0.04]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-semibold">{error || "Match not found"}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-orange-500 underline">Go Back</button>
        </div>
      </div>
    );
  }

  // Sport detection — explicit, no silent "Table Tennis" fallback.
  // STEP 13: prefer the denormalized `sportName` populated by
  // MatchFactory._stamp on every new match; older fallbacks remain for
  // matches created before STEP 9a stamping landed.
  const sportName = match.sportName || match.sportsType || match.sport || null;
  const sportConfig = getSportConfig(sportName);
  const scoringType = matchFormat?.scoringType || sportConfig.scoringType || "sets";
  const isSetBased = scoringType === "sets";
  const nested = hasNestedGames(matchFormat);

  // Format description for header
  const formatDesc = getFormatDescription(scoringType, matchFormat, sportConfig);

  // Cricket/Carrom broadcast boards want the full width; set sports read better
  // in a narrow column.
  const containerW = isSetBased ? "max-w-4xl" : "max-w-7xl";

  // Football has its own full-bleed, light, event-driven board that owns the
  // whole view (its own header/clock/tabs). Render it directly, skipping the
  // dark page chrome, breadcrumbs and summary card.
  const isFootball = scoringType === "time" && /football|soccer/i.test(sportName || "");
  if (isFootball && !isCompleted && matchFormat) {
    return (
      <div className="min-h-screen bg-[#0a0e16] p-2 sm:p-3">
        <DynamicScorer
          sportName={sportName}
          matchFormat={matchFormat}
          player1Name={player1Name}
          player2Name={player2Name}
          player1Squad={match.player1?.squad || []}
          player2Squad={match.player2?.squad || []}
          matchMeta={{
            venue: match.courtNumber || "",
            date: match.startTime || null,
            referee: match.referee?.name || "",
            competition: match.roundName || match.round || "Group Stage",
            matchNumber: match.matchNumber,
            tournamentTitle: match.tournamentId?.title || "",
            // Knockout matches can't end level → force a penalty-shootout winner.
            isKnockout: !!(match.nextMatchId || match.roundName ||
              (typeof match.round === "string" && /final|quarter|semi|knockout|round/i.test(match.round))),
          }}
          onSubmitScores={submitBulkScores}
          submitting={submitting}
          onBack={() => navigate(backTo)}
          onRefresh={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] text-gray-200">
      {/* Header */}
      <div className="text-white px-6 py-4" style={{ background: `linear-gradient(135deg, ${sportConfig.color || "#F97316"}, ${sportConfig.color || "#F97316"}dd)` }}>
        <div className={`${containerW} mx-auto flex items-center gap-4`}>
          <button onClick={() => navigate(backTo)} className="p-2 hover:bg-white/10 rounded-lg transition w-auto">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{sportConfig.icon}</span>
              <h1 className="text-lg font-bold">Match Scoring</h1>
            </div>
            <p className="text-white/70 text-sm">
              {match.roundName || match.round || "Group Stage"} {match.matchNumber && `• M${match.matchNumber}`}
              {formatDesc && ` • ${formatDesc}`}
            </p>
          </div>
          <StatusBadge status={match.status} />
        </div>
      </div>

      <div className={`${containerW} mx-auto p-6 space-y-6`}>
        <Breadcrumbs
          items={[
            { label: "Tournaments", to: "/mtournament-management" },
            { label: "Manage tournament", to: `/tournament-management/group-stage?tournamentId=${tournamentId}` },
            { label: `Match${match.matchNumber ? ` · M${match.matchNumber}` : ""}` },
          ]}
        />

        {/* Players + Score Summary — hidden for live cricket/carrom; their boards own the view */}
        {(isSetBased || isCompleted) && (
        <div className="bg-[#181A22] rounded-2xl shadow-sm border border-white/[0.06] overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500/10 to-transparent p-6">
            <div className="flex items-center justify-between">
              <PlayerCard name={player1Name} score={player1SetsWon} isWinner={winnerName === player1Name} />
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
                  {sportConfig.labels?.matchResult || (isSetBased ? "Sets" : "Score")}
                </span>
                <span className="text-3xl font-black text-gray-100">
                  {player1SetsWon} — {player2SetsWon}
                </span>
              </div>
              <PlayerCard name={player2Name} score={player2SetsWon} isWinner={winnerName === player2Name} />
            </div>
          </div>

          {/* Winner Banner */}
          {isCompleted && winnerName && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 text-white text-center">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5" />
                <span className="font-bold">{winnerName} wins!</span>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Set-based Scorecard — only for set-based sports */}
        {isSetBased && sets.length > 0 && (
          <SetScorecard sets={sets} player1Name={player1Name} player2Name={player2Name}
            player1SetsWon={player1SetsWon} player2SetsWon={player2SetsWon} match={match} nested={nested} />
        )}

        {/* Non-set match summary for time/innings/single */}
        {!isSetBased && sets.length > 0 && sets[0]?.games?.length > 0 && (
          <div className="bg-[#181A22] rounded-2xl shadow-sm border border-white/[0.06] p-6">
            <h3 className="font-bold text-gray-100 mb-3">Match Summary</h3>
            <div className="bg-white/[0.04] rounded-xl p-4">
              {sets[0].games.filter(g => g.status === "COMPLETED").map((g, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm font-semibold text-gray-400">{player1Name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-black ${(g.finalScore?.player1 || 0) > (g.finalScore?.player2 || 0) ? "text-emerald-400" : "text-gray-400"}`}>
                      {g.finalScore?.player1 ?? 0}
                    </span>
                    <span className="text-gray-300">-</span>
                    <span className={`text-lg font-black ${(g.finalScore?.player2 || 0) > (g.finalScore?.player1 || 0) ? "text-emerald-400" : "text-gray-400"}`}>
                      {g.finalScore?.player2 ?? 0}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-400">{player2Name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Score Entry — sport-aware, config-driven */}
        {!isCompleted && matchFormat && (
          <DynamicScorer
            sportName={sportName}
            matchFormat={matchFormat}
            sets={sets}
            currentSet={match.currentSet || 1}
            player1Name={player1Name}
            player2Name={player2Name}
            onSubmitScores={submitBulkScores}
            submitting={submitting}
            onRefresh={() => {}}
            // Live block + incremental scorers for cricket (innings) & carrom (board)
            liveScore={liveScore}
            player1Squad={match?.player1?.squad || []}
            player2Squad={match?.player2?.squad || []}
            onSetupInnings={setupCricketInnings}
            onUpdateLineup={updateCricketLineup}
            onSubmitBall={submitCricketBall}
            onUndoBall={undoCricketBall}
            onSwitchInnings={switchCricketInnings}
            onFinishMatch={finishCricketMatch}
            onSubmitBoard={submitCarromBoard}
          />
        )}
      </div>
    </div>
  );
}

// ---- Helpers ----

function getFormatDescription(scoringType, matchFormat, sportConfig) {
  if (!matchFormat) return "";
  switch (scoringType) {
    case "sets": {
      const nested = hasNestedGames(matchFormat);
      return nested
        ? `Best of ${matchFormat.totalSets} sets • ${matchFormat.gamesToWin} ${sportConfig.labels?.game?.toLowerCase() || "game"}s/set • ${matchFormat.pointsToWinGame} pts/${sportConfig.labels?.game?.toLowerCase() || "game"}`
        : `Best of ${matchFormat.totalSets} sets • ${matchFormat.pointsToWinGame} pts/${sportConfig.labels?.set?.toLowerCase() || "set"}`;
    }
    case "time":
      return `${sportConfig.scoring?.periods || matchFormat.totalSets || 2} ${sportConfig.labels?.period?.toLowerCase() || "period"}s`;
    case "innings":
      return `${sportConfig.defaults?.overs || 20} overs • ${sportConfig.defaults?.innings || 2} innings`;
    case "single":
      return sportConfig.labels?.matchResult || "Single result";
    default:
      return "";
  }
}

// ---- Sub-components ----

function StatusBadge({ status }) {
  const s = (status || "").toUpperCase();
  const config = {
    COMPLETED: { bg: "bg-green-500", text: "Completed" },
    IN_PROGRESS: { bg: "bg-yellow-500", text: "Live" },
    SCHEDULED: { bg: "bg-orange-400", text: "Scheduled" },
  };
  const c = config[s] || config.SCHEDULED;
  return <span className={`${c.bg} text-white text-xs font-bold px-3 py-1 rounded-full`}>{c.text}</span>;
}

function PlayerCard({ name, score, isWinner }) {
  return (
    <div className={`flex flex-col items-center ${isWinner ? "scale-105" : ""}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black ${isWinner ? "bg-green-500 ring-4 ring-green-200" : "bg-orange-500"}`}>
        {name?.charAt(0) || "?"}
      </div>
      <span className={`mt-2 font-bold text-sm ${isWinner ? "text-emerald-300" : "text-gray-100"}`}>{name}</span>
      {isWinner && <Trophy className="w-4 h-4 text-yellow-500 mt-1" />}
    </div>
  );
}

function SetScorecard({ sets, player1Name, player2Name, player1SetsWon, player2SetsWon, match, nested }) {
  return (
    <div className="bg-[#181A22] rounded-2xl shadow-sm border border-white/[0.06] p-6">
      <h3 className="font-bold text-gray-100 mb-4">Set Scorecard</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Player</th>
              {sets.map((s, i) => (
                <th key={i} className={`text-center py-2 px-3 font-medium ${s.status === "COMPLETED" ? "text-gray-100" : "text-gray-300"}`}>
                  S{s.setNumber || i + 1}
                </th>
              ))}
              <th className="text-center py-2 px-3 font-bold text-gray-100">Sets</th>
            </tr>
          </thead>
          <tbody>
            {[{ name: player1Name, key: "player1", setsWon: player1SetsWon }, { name: player2Name, key: "player2", setsWon: player2SetsWon }].map((player) => (
              <tr key={player.key} className="border-b border-white/[0.06] last:border-b-0">
                <td className="py-3 px-3 font-semibold text-orange-500">{player.name}</td>
                {sets.map((s, i) => {
                  if (nested) {
                    // Nested (Tennis): show games this player won in the set
                    const gamesWon = s.games?.filter((g) => {
                      const w = g.winner;
                      if (!w) return false;
                      return w.playerId?.toString() === match[player.key]?.playerId?.toString() || w.playerName === player.name;
                    }).length || 0;
                    const otherGames = (s.games?.filter(g => g.status === "COMPLETED").length || 0) - gamesWon;
                    return (
                      <td key={i} className={`text-center py-3 px-3 font-bold ${gamesWon > otherGames ? "text-emerald-400" : "text-gray-400"}`}>
                        {s.status === "COMPLETED" || s.games?.length > 0 ? gamesWon : "-"}
                      </td>
                    );
                  } else {
                    // Flat (TT, Badminton): show this player's set score (points in the single synthetic game)
                    const g = s.games?.[0];
                    const myScore = g?.finalScore?.[player.key] ?? null;
                    const otherKey = player.key === "player1" ? "player2" : "player1";
                    const otherScore = g?.finalScore?.[otherKey] ?? null;
                    const isWinner = myScore != null && otherScore != null && myScore > otherScore;
                    return (
                      <td key={i} className={`text-center py-3 px-3 font-bold ${isWinner ? "text-emerald-400" : "text-gray-400"}`}>
                        {myScore != null ? myScore : "-"}
                      </td>
                    );
                  }
                })}
                <td className="text-center py-3 px-3 font-black text-lg text-orange-500">{player.setsWon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Game Details per Set */}
      <div className="mt-4 flex flex-wrap gap-3">
        {sets.map((s, i) => (
          <SetDetail key={i} set={s} player1Name={player1Name} player2Name={player2Name} match={match} />
        ))}
      </div>
    </div>
  );
}

function SetDetail({ set, player1Name, player2Name, match }) {
  if (!set.games || set.games.length === 0) return null;
  return (
    <div className={`border rounded-xl p-3 min-w-[120px] ${set.status === "COMPLETED" ? "border-white/[0.06]" : "border-orange-500/40 bg-orange-500/10"}`}>
      <div className="text-xs font-bold text-gray-500 mb-2 text-center uppercase">Set {set.setNumber}</div>
      <div className="space-y-1">
        {set.games.map((g, i) => {
          const p1 = g.finalScore?.player1 ?? g.homePoints ?? 0;
          const p2 = g.finalScore?.player2 ?? g.awayPoints ?? 0;
          return (
            <div key={i} className="flex justify-center gap-2 text-sm">
              <span className={`font-bold ${p1 > p2 ? "text-emerald-400" : "text-gray-400"}`}>{p1}</span>
              <span className="text-gray-300">-</span>
              <span className={`font-bold ${p2 > p1 ? "text-emerald-400" : "text-gray-400"}`}>{p2}</span>
            </div>
          );
        })}
      </div>
      {set.setWinner && (
        <div className="text-[10px] text-center text-emerald-400 font-bold mt-1 border-t border-white/[0.06] pt-1">
          {typeof set.setWinner === "object" ? (set.setWinner.playerName || "Winner") : set.setWinner === "player1" ? player1Name : player2Name}
        </div>
      )}
    </div>
  );
}
