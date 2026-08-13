// Shared parsing/normalization helpers for the manager bulk-registration flows
// (Quick paste + the consolidated Excel importer). Kept framework-free so both
// the paste box and the workbook importer produce the SAME registrant shape the
// `/api/tournaments/bookings/bulk-create` endpoint expects.
//
// Registrant shape produced here: { name, category, sport, seed }
// For DOUBLES categories a pair is ONE registrant whose `name` is the combined
// "A & B" — direct-knockout treats each booking as a single bracket entrant, so
// a pair must land as one entrant (this also matches how the client's sheet
// already stores pairs).

// Collapse whitespace, trim, and fix common human-entry noise. Deliberately
// light — we don't want to "correct" real names, just tidy obvious mess.
export function normalizeName(raw) {
  let s = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();
  if (!s) return "";
  // "Last, First" → "First Last" (only for a single comma with two parts).
  const commaParts = s.split(",");
  if (commaParts.length === 2 && commaParts[0].trim() && commaParts[1].trim()) {
    s = `${commaParts[1].trim()} ${commaParts[0].trim()}`;
  }
  return s;
}

// Split a doubles cell/line into its two partner names. Handles "A & B",
// "A and B", "A/B" and comma-separated pairs. Returns [a, b] (b may be "" when
// only one name is present).
export function splitPair(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return ["", ""];

  // Explicit pair delimiters are unambiguous — split on those first.
  const explicit = s.split(/\s*(?:&|\/)\s*|\s+and\s+/i).map((p) => p.trim()).filter(Boolean);
  if (explicit.length >= 2) {
    return [normalizeName(explicit[0]), normalizeName(explicit.slice(1).join(" & "))];
  }

  // A single comma is genuinely ambiguous: "Sharma, Rahul" is ONE person
  // written surname-first (normalizeName flips it), while "Rahul Sharma, Amit
  // Patel" is TWO people. Treat it as a pair only when both sides are
  // multi-word — otherwise a surname-first entry got split into two entrants.
  const commaParts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length === 2 && commaParts.every((p) => p.includes(" "))) {
    return [normalizeName(commaParts[0]), normalizeName(commaParts[1])];
  }

  return [normalizeName(s), ""];
}

// Combine two names into the canonical pair label. Drops an empty partner.
export function pairLabel(a, b) {
  const A = normalizeName(a);
  const B = normalizeName(b);
  return B ? `${A} & ${B}` : A;
}

// Order-independent identity for a registrant, used for de-duplication.
//
// A doubles pair is the same pair whichever partner is typed first, but the
// LABEL differs ("Rahul & Amit" vs "Amit & Rahul"). De-duping on the label let
// the same pair register twice and enter the bracket as two entrants. Sorting
// the partners gives one stable key while leaving the displayed label exactly
// as the manager typed it.
export function entryKey(name) {
  const parts = String(name == null ? "" : name)
    .split("&")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length < 2) return parts[0] || "";
  return parts.sort().join(" & ");
}

// Is this category a doubles/pair category? Prefer the tournament's explicit
// per-category format; fall back to a name heuristic for sheets/categories that
// don't carry a format (e.g. the client's "…Doubles Pair" headers).
export function isDoublesCategory(category, sportTrack) {
  const fmt = (
    category?.knockoutFormat ||
    category?.groupStageFormat ||
    sportTrack?.knockoutFormat ||
    sportTrack?.groupStageFormat ||
    ""
  ).toString().toLowerCase();
  if (fmt.includes("doubles")) return true;
  if (fmt === "singles" || fmt === "teams") return false;
  const name = (category?.name || category || "").toString().toLowerCase();
  return /\b(doubles|pair|mixed)\b/.test(name);
}

// Parse a paste box into registrants. One entrant per non-empty line; for
// doubles, each line is a pair ("A & B"). `seedFromOrder` assigns 1-based seeds
// in paste order when true (else seed = null and order is preserved anyway).
export function parsePastedLines(text, { doubles = false, category = "", sport = "", seedFromOrder = false } = {}) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    let name;
    if (doubles) {
      const [a, b] = splitPair(line);
      name = pairLabel(a, b);
    } else {
      name = normalizeName(line);
    }
    if (!name) continue;
    // Order-independent so a reversed pair isn't registered twice.
    const key = entryKey(name);
    if (seen.has(key)) continue; // drop duplicate lines within this paste
    seen.add(key);
    out.push({ name, category, sport, seed: seedFromOrder ? out.length + 1 : null });
  }
  return out;
}

// ── Consolidated workbook importer ───────────────────────────────────────────
// The client's real file is a wide matrix: one sheet per SPORT, each CATEGORY a
// column (header in row 0, names listed downward), doubles stored either as an
// "A & B" cell or split across two adjacent columns (P1 | partner). This turns
// that into detected groups the manager can confirm/remap before registering.

const cell = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();
const normKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Does column `c` have any data below the header row?
function columnHasData(rows, c) {
  for (let r = 1; r < rows.length; r++) if (cell(rows[r]?.[c])) return true;
  return false;
}

// Best fuzzy match of `text` against candidate strings (by containment on the
// alnum-normalized forms). Returns the matched candidate or "".
function guessMatch(text, candidates) {
  const t = normKey(text);
  if (!t) return "";
  let best = "";
  let bestLen = 0;
  for (const c of candidates) {
    const k = normKey(c);
    if (!k) continue;
    if (t === k || t.includes(k) || k.includes(t)) {
      if (k.length > bestLen) { best = c; bestLen = k.length; }
    }
  }
  return best;
}

const looksDoublesHeader = (h) => /\b(doubles|mixed|pair)\b/i.test(h || "");

/**
 * parseConsolidatedWorkbook(sheets, { sports })
 *   sheets: [{ name, rows }]  where rows is a 2D array (XLSX sheet_to_json header:1)
 *   sports: tournament.sports  (used to guess sport/category mappings)
 * Returns { groups, skipped }.
 *   group: { id, sheet, header, sportGuess, categoryGuess, isDoubles, entries[] }
 *   skipped: [{ sheet, reason }]
 */
export function parseConsolidatedWorkbook(sheets, { sports = [] } = {}) {
  const sportNames = sports.map((s) => s.sportName).filter(Boolean);
  const groups = [];
  const skipped = [];
  let gid = 0;

  for (const sheet of sheets || []) {
    const name = sheet?.name || "";
    const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
    if (rows.length < 2) { skipped.push({ sheet: name, reason: "No data rows" }); continue; }

    // The "Extra Players" style addendum sheets use an ad-hoc layout we don't
    // try to auto-map — flag them for manual entry instead of importing garbage.
    if (/\bextra\b/i.test(name)) { skipped.push({ sheet: name, reason: "Ad-hoc layout — add via Quick paste" }); continue; }

    const sportGuess = guessMatch(name, sportNames) || "";
    const sportTrack = sports.find((s) => s.sportName === sportGuess) || null;
    const catNames = Array.isArray(sportTrack?.categories) ? sportTrack.categories.map((c) => c.name) : [];

    const header = rows[0] || [];
    const maxCols = rows.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0);
    const consumed = new Set();
    let foundAnyHeader = false;

    for (let c = 0; c < maxCols; c++) {
      if (consumed.has(c)) continue;
      const h = cell(header[c]);
      if (!h) continue;
      foundAnyHeader = true;

      // Two-column doubles: next column has empty header but its own data.
      const hasPartnerCol =
        looksDoublesHeader(h) && !cell(header[c + 1]) && columnHasData(rows, c + 1);
      if (hasPartnerCol) consumed.add(c + 1);

      const groupDoublesHint = looksDoublesHeader(h) || hasPartnerCol;
      const entries = [];
      const seen = new Set();
      for (let r = 1; r < rows.length; r++) {
        const left = cell(rows[r]?.[c]);
        const right = hasPartnerCol ? cell(rows[r]?.[c + 1]) : "";
        if (!left && !right) continue;
        if (normKey(left) === normKey(h)) continue; // stray repeat of the header

        let entry;
        const dbl = groupDoublesHint || /&|\/|\sand\s/i.test(left);
        if (dbl) {
          if (hasPartnerCol && right && !/&|\/|\sand\s/i.test(left)) {
            entry = pairLabel(left, right);
          } else {
            const [a, b] = splitPair(left);
            entry = pairLabel(a, b);
          }
        } else {
          entry = normalizeName(left);
        }
        if (!entry) continue;
        const key = entryKey(entry);
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push(entry);
      }

      if (entries.length === 0) continue;

      const isDoubles = groupDoublesHint || entries.some((e) => e.includes(" & "));
      // Fall back to the sport's only category when the header doesn't name one
      // (e.g. a plain "Name" column for a single-category sport like Chess).
      let categoryGuess = guessMatch(h, catNames);
      if (!categoryGuess && catNames.length === 1) categoryGuess = catNames[0];
      groups.push({
        id: `g${gid++}`,
        sheet: name,
        header: h,
        sportGuess,
        categoryGuess,
        isDoubles,
        entries,
      });
    }

    if (!foundAnyHeader) skipped.push({ sheet: name, reason: "No category headers found" });
  }

  return { groups, skipped };
}
