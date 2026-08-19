// Doubles pair naming — web mirror of server/utils/doublesPair.js.
//
// A doubles entry is ONE entrant made of two people, shown as a single name
// joined by " & " ("Rahul & Amit"). Every consumer downstream — group standings
// rows, the bracket renderer, the PDF export — treats an entrant as one name;
// nothing carries a second playerId.
//
// The partner is stored per (booking, category) on
// `booking.sportSelections[].partnerName`, because one booking can cover
// several categories with a different partner in each.
//
// Keep in step with the server util, which is authoritative.

const SEPARATOR = " & ";

/** Normalize one person's name for comparison: trimmed, lowercased, single-spaced. */
export const normalizeName = (raw) =>
  String(raw == null ? "" : raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

/** Split an entrant name into its halves. A singles entrant yields one. */
export const splitPair = (raw) =>
  String(raw == null ? "" : raw)
    .split("&")
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * Comparison key for an entrant name, order-insensitive for pairs, so the same
 * pair typed either way round is not treated as two entrants.
 */
export const pairKey = (raw) => {
  const parts = splitPair(raw).map(normalizeName).filter(Boolean);
  if (parts.length < 2) return parts[0] || "";
  return parts.sort().join(SEPARATOR);
};

/**
 * Build the entrant name for a doubles pair. Returns the lone name unchanged
 * when there is no partner, so it is safe to call for singles entries too.
 */
export const pairDisplayName = (playerName, partnerName) => {
  const a = String(playerName == null ? "" : playerName).trim();
  const b = String(partnerName == null ? "" : partnerName).trim();
  if (!a) return b;
  if (!b) return a;
  return `${a}${SEPARATOR}${b}`;
};

export default { SEPARATOR, normalizeName, splitPair, pairKey, pairDisplayName };
