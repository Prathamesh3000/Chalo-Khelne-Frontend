import { getCurrentStage } from "../../utils/sportTrack";

/**
 * NextStepBanner — a clear "you are here / next step" guide with a primary CTA.
 * Designed to sit in TournamentShell's `banner` slot (which already renders the
 * breadcrumb + step pipeline above it), so this only adds the missing
 * orientation: WHAT the manager should do next, and a button to do it.
 *
 * Props:
 * - tournament, sportId: to read the current stage of the active sport-track
 * - counts: { players, groups, matches } optional, to refine guidance
 * - onPrimaryAction, primaryLabel: the next-step CTA
 * - overrideStatus / overrideNext: optional explicit text (when the page knows better)
 */
function deriveGuidance(stage, counts = {}) {
  const s = (stage || "registration").toLowerCase();
  const { players = 0, groups = 0 } = counts;
  if (s === "registration") {
    if (players === 0) return { status: "No players registered yet", next: "Register players to begin", cta: "Register players" };
    if (groups === 0) return { status: `${players} players registered`, next: "Create groups, then generate matches", cta: "Create groups" };
    return { status: `${groups} groups created`, next: "Generate the group matches", cta: "Generate matches" };
  }
  if (s === "group_stage") return { status: "Group stage in progress", next: "Score the group matches", cta: null };
  if (s === "group_completed") return { status: "Group stage complete", next: "Pick qualifiers & generate the knockout", cta: "Set up knockout" };
  if (s === "knockout") return { status: "Knockout stage", next: "Score matches & advance rounds", cta: null };
  if (s === "completed") return { status: "Tournament complete", next: "View the final results", cta: "View results" };
  return { status: "Setup", next: "Configure the tournament", cta: null };
}

export default function TournamentFlowHeader({
  tournament, sportId, counts, onPrimaryAction, primaryLabel, overrideStatus, overrideNext,
}) {
  const stage = getCurrentStage(tournament, sportId);
  const g = deriveGuidance(stage, counts);
  const status = overrideStatus || g.status;
  const next = overrideNext || g.next;
  const ctaLabel = primaryLabel || g.cta;

  return (
    <div style={S.banner}>
      <div style={S.left}>
        <span style={S.pin}>📍</span>
        <div>
          <div style={S.status}>{status}</div>
          <div style={S.next}>Next: {next}</div>
        </div>
      </div>
      {ctaLabel && onPrimaryAction ? (
        <button style={S.cta} onClick={onPrimaryAction}>{ctaLabel} →</button>
      ) : null}
    </div>
  );
}

const GREEN = "#15A765";
const S = {
  banner: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "11px 14px" },
  left: { display: "flex", alignItems: "center", gap: 11, minWidth: 0 },
  pin: { fontSize: 17 },
  status: { fontSize: 13.5, fontWeight: 800, color: "#0F172A" },
  next: { fontSize: 12, fontWeight: 600, color: "#15803D", marginTop: 2 },
  cta: { background: GREEN, color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
};
