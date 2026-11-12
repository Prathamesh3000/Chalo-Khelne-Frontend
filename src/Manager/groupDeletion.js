/**
 * What deleting a group takes with it — shown in the confirmation so the manager
 * decides with real numbers instead of a generic "are you sure?".
 *
 * The server cascades: deleting a group deletes its matches too (and, until the
 * tournament has progressed past the group stage, that includes COMPLETED ones —
 * their recorded scores go with them).
 */
const isCompleted = (m) => String(m?.status || "").toUpperCase() === "COMPLETED";

export function describeGroupDeletion({ group, matches }) {
  const list = Array.isArray(matches) ? matches : [];
  const completedCount = list.filter(isCompleted).length;
  return {
    name: group?.groupName || "this group",
    playerCount: group?.players?.length || 0,
    matchCount: list.length,
    completedCount,
    hasResults: completedCount > 0,
  };
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The lines the modal lists. Each is { text, tone } where tone is "warn" or "info". */
export function groupDeletionLines(d) {
  const lines = [];
  if (d.matchCount === 0) {
    lines.push({ text: "No matches have been generated for this group yet.", tone: "info" });
  } else if (d.hasResults) {
    lines.push({
      text: `${plural(d.matchCount, "match", "matches")} will be deleted, including ${plural(
        d.completedCount,
        "completed match",
        "completed matches"
      )} with recorded scores.`,
      tone: "warn",
    });
  } else {
    lines.push({
      text: `${plural(d.matchCount, "match", "matches")} will be deleted (none have been played).`,
      tone: "info",
    });
  }
  if (d.playerCount > 0) {
    lines.push({
      text: `${plural(d.playerCount, "player")} will be removed from this group. They stay registered and can be placed in another group.`,
      tone: "info",
    });
  }
  return lines;
}
