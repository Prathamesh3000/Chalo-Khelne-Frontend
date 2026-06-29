// sports_app/src/Manager/components/SeedPositionsPreview.jsx
//
// Shared seed-placement preview for knockout bracket generation UIs.
// Reads drawSize + numberOfSeeds, shows where each seed lands on the bracket
// using the Mirror & Flip algorithm in utils/seedingUtils.js.
//
// Column counts per spec: 1 col for 4/8, 2 cols for 16/32, 3 cols for 64, 4 for 128.
// Reading order: top-to-bottom within each column, left column first.
//
// Optional `players` prop (array of { name, isSeeded }):
//   - seeded entries come first (indices 0..numberOfSeeds-1 map to seed 1..N),
//     unseeded follow in order.
//   - When provided, each row shows the actual player name instead of a
//     generic "Seed N"/"Unseeded" label. Missing entries fall back to "BYE".
//   - When omitted, the component renders the generic seed labels.

import { useMemo } from "react";
import { generateSeedPositions, buildR1SlotAssignment } from "../../utils/seedingUtils";

export default function SeedPositionsPreview({ drawSize, numberOfSeeds, players }) {
  const rows = useMemo(() => {
    try {
      // Clamp numberOfSeeds so Standard mode (which sets seeds to player count)
      // and other callers can't blow up the util with out-of-range values.
      const clamped = Math.max(0, Math.min(numberOfSeeds || 0, drawSize));
      return generateSeedPositions(drawSize, clamped);
    } catch {
      return [];
    }
  }, [drawSize, numberOfSeeds]);

  // Compute line -> player name mapping and authoritative BYE lines via the
  // shared helper so preview matches the backend bracket byte-for-byte for
  // priority BYEs (opponents of top seeds). Extra BYEs and unseeded-player
  // placement would normally be random on the server; here we pass an identity
  // shuffle so the preview stays stable across keystrokes. The manager sees an
  // example layout for the random parts; priority BYEs are always accurate.
  const { lineToPlayer, helperByeLines } = useMemo(() => {
    if (!Array.isArray(players) || players.length === 0) {
      return { lineToPlayer: null, helperByeLines: null };
    }
    try {
      const clampedSeeds = Math.max(0, Math.min(numberOfSeeds || 0, drawSize));
      // Order the player list exactly as the backend will consume it:
      // seeded entries (in given order) followed by unseeded.
      const seededPlayers = players.filter((p) => p?.isSeeded);
      const unseededPlayers = players.filter((p) => !p?.isSeeded);
      const orderedPlayers = [...seededPlayers, ...unseededPlayers];

      const { slots, byeLines } = buildR1SlotAssignment({
        drawSize,
        numberOfSeeds: clampedSeeds,
        players: orderedPlayers,
        shuffle: (arr) => [...arr], // identity — deterministic preview
      });

      const map = new Map();
      slots.forEach((slot, idx) => {
        if (slot) map.set(idx + 1, slot.name || slot.playerName);
      });
      return { lineToPlayer: map, helperByeLines: new Set(byeLines) };
    } catch {
      return { lineToPlayer: null, helperByeLines: null };
    }
  }, [drawSize, numberOfSeeds, players]);

  if (!rows.length) return null;

  const columnCount =
    drawSize >= 128 ? 4 :
    drawSize >= 64 ? 3 :
    drawSize >= 16 ? 2 : 1;
  const perColumn = Math.ceil(rows.length / columnCount);
  const columns = [];
  for (let c = 0; c < columnCount; c++) {
    columns.push(rows.slice(c * perColumn, (c + 1) * perColumn));
  }
  const seededCount = rows.filter((r) => r.isSeeded).length;

  // Resolve what to show as the row label. Priority:
  //   1. "BYE" if the helper says this line is a BYE (authoritative)
  //   2. Player name (if players prop provided and slot has a match)
  //   3. "BYE" (if players prop provided but slot empty)
  //   4. Generic "Seed N" / "Unseeded" (no players prop)
  const resolveLabel = (row) => {
    if (!lineToPlayer) return row.label;
    if (helperByeLines && helperByeLines.has(row.lineNumber)) return "BYE";
    const name = lineToPlayer.get(row.lineNumber);
    if (name) return row.isSeeded ? `Seed ${row.seedNumber} · ${name}` : name;
    return "BYE";
  };

  return (
    <div className="mb-6 bg-[#181A22] rounded-xl p-4 border border-white/[0.06]">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-white">Seed Positions Preview</h4>
          <span className="text-[10px] font-bold bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
            {drawSize} Draw
          </span>
          <span className="text-[10px] font-bold bg-white/[0.08] text-gray-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
            {seededCount}/{drawSize} Seeded
          </span>
          {Array.isArray(players) && (
            <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {players.length} Players
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">
        {lineToPlayer
          ? "Priority BYEs are exact; remaining placement is an example — extras shuffle server-side."
          : "Where each seed will be placed in the bracket (updates live as you change draw size or seeds)."}
      </p>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {columns.map((col, cIdx) => (
          <div key={cIdx} className="flex flex-col gap-1">
            {col.map((row) => {
              const label = resolveLabel(row);
              const isBye = lineToPlayer && (
                (helperByeLines && helperByeLines.has(row.lineNumber)) ||
                label === "BYE"
              );
              return (
                <div
                  key={row.lineNumber}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    row.isSeeded
                      ? "bg-orange-500/10 border border-orange-500/30"
                      : isBye
                        ? "bg-white/[0.04] border border-dashed border-white/[0.12]"
                        : "bg-white/[0.04] border border-white/[0.06]"
                  }`}
                >
                  <span
                    className={`w-7 text-center text-[10px] font-bold flex-shrink-0 ${
                      row.isSeeded ? "text-orange-400" : "text-gray-500"
                    }`}
                  >
                    {row.lineNumber}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      row.isSeeded ? "bg-orange-500" : isBye ? "bg-gray-400" : "bg-gray-500"
                    }`}
                  />
                  <span
                    className={`truncate ${
                      row.isSeeded
                        ? "font-bold text-orange-300"
                        : isBye
                          ? "italic text-gray-500"
                          : "text-gray-300"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
