// Shared per-round bestOf + slot + match duration UI used by every knockout
// generation modal. Two modes:
//   - Uniform: single bestOf chip + slot + match (fanned to every round on submit)
//   - Customize: per-round table with bestOf + slot + match per row
// Plus a single breakBetweenRoundsMinutes input applied to all rounds.
//
// Caller owns the state (lifted up so the modal can also wire the API call).
// Caller passes drawSize → totalRounds is derived. bestOf chips are hidden
// when isSetBased is false (Football/Cricket/etc).

import { useEffect, useMemo } from "react";
import {
  BEST_OF_OPTIONS,
  totalRoundsFor,
  roundNameFor,
  buildDefaultRoundsArray,
  validateRoundEntry,
} from "../utils/knockoutDefaults";

export default function KnockoutFormatPanel({
  drawSize,
  isSetBased,
  // controlled state
  customizeRounds,
  setCustomizeRounds,
  uniformBestOf,
  setUniformBestOf,
  uniformSlot,
  setUniformSlot,
  uniformMatch,
  setUniformMatch,
  roundOverrides,
  setRoundOverrides,
  breakBetweenRoundsMinutes,
  setBreakBetweenRoundsMinutes,
  // optional brand color override
  accent = "#5E6AD2",
}) {
  const totalRounds = totalRoundsFor(drawSize);

  // Re-seed roundOverrides when totalRounds changes (e.g. drawSize toggle in
  // the parent) so the table always matches the current bracket size.
  useEffect(() => {
    if (!customizeRounds) return;
    if (
      !Array.isArray(roundOverrides) ||
      roundOverrides.length !== totalRounds
    ) {
      setRoundOverrides(buildDefaultRoundsArray(totalRounds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalRounds, customizeRounds]);

  const uniformGap = Math.max(0, (uniformSlot || 0) - (uniformMatch || 0));

  // Inline validation of every row. Used to disable the parent submit button
  // (parent reads via a callback or recomputes itself).
  const errorsByRound = useMemo(() => {
    if (!customizeRounds) return {};
    const errs = {};
    for (const r of roundOverrides || []) {
      const e = validateRoundEntry(r);
      if (e) errs[r.roundNumber] = e;
    }
    return errs;
  }, [customizeRounds, roundOverrides]);

  const updateRound = (roundNumber, patch) => {
    setRoundOverrides((prev) =>
      (prev || []).map((r) => (r.roundNumber === roundNumber ? { ...r, ...patch } : r))
    );
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-3 text-[12px]">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            checked={!customizeRounds}
            onChange={() => setCustomizeRounds(false)}
            className="accent-current"
            style={{ accentColor: accent }}
          />
          <span className={!customizeRounds ? "font-semibold text-gray-800" : "text-gray-600"}>
            Use same format for all rounds
          </span>
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            checked={customizeRounds}
            onChange={() => setCustomizeRounds(true)}
            className="accent-current"
            style={{ accentColor: accent }}
          />
          <span className={customizeRounds ? "font-semibold text-gray-800" : "text-gray-600"}>
            Customize per round
          </span>
        </label>
      </div>

      {/* Uniform mode — single set of inputs */}
      {!customizeRounds && (
        <div className="rounded-lg border border-gray-200 p-3 space-y-3">
          {isSetBased && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                Best of
              </label>
              <div className="inline-flex gap-1.5">
                {BEST_OF_OPTIONS.map((n) => {
                  const active = parseInt(uniformBestOf, 10) === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setUniformBestOf(n)}
                      className={`h-8 w-12 rounded-md text-[13px] font-semibold transition border ${
                        active
                          ? "text-white border-transparent"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                      }`}
                      style={active ? { backgroundColor: accent } : {}}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1" htmlFor="slot-mins">Slot (mins)</label>
              <input id="slot-mins"
                type="number"
                min="1"
                value={uniformSlot}
                onChange={(e) => setUniformSlot(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1" htmlFor="match-mins">Match (mins)</label>
              <input id="match-mins"
                type="number"
                min="1"
                value={uniformMatch}
                onChange={(e) => setUniformMatch(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            Gap between matches:{" "}
            <span className="font-semibold text-gray-700">{uniformGap} mins</span>
          </p>
        </div>
      )}

      {/* Customize mode — per-round table */}
      {customizeRounds && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <div className="col-span-3">Round</div>
            {isSetBased && <div className="col-span-3">Best of</div>}
            <div className={isSetBased ? "col-span-2" : "col-span-3"}>Slot</div>
            <div className={isSetBased ? "col-span-2" : "col-span-3"}>Match</div>
            <div className={isSetBased ? "col-span-2" : "col-span-3"}>Gap</div>
          </div>
          {(roundOverrides || []).map((r) => {
            const gap = Math.max(0, (r.slotDurationMinutes || 0) - (r.matchDurationMinutes || 0));
            const err = errorsByRound[r.roundNumber];
            return (
              <div key={r.roundNumber} className="border-b border-gray-100 last:border-b-0">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                  <div className="col-span-3 text-[12px] font-semibold text-gray-800">
                    {roundNameFor(r.roundNumber, totalRounds)}
                  </div>
                  {isSetBased && (
                    <div className="col-span-3 inline-flex gap-1">
                      {BEST_OF_OPTIONS.map((n) => {
                        const active = parseInt(r.bestOf, 10) === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => updateRound(r.roundNumber, { bestOf: n })}
                            className={`h-7 w-9 rounded-md text-[12px] font-semibold transition border ${
                              active
                                ? "text-white border-transparent"
                                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                            }`}
                            style={active ? { backgroundColor: accent } : {}}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className={isSetBased ? "col-span-2" : "col-span-3"}>
                    <input
                      type="number"
                      min="1"
                      value={r.slotDurationMinutes}
                      onChange={(e) =>
                        updateRound(r.roundNumber, {
                          slotDurationMinutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2 py-1.5 text-[12px] bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className={isSetBased ? "col-span-2" : "col-span-3"}>
                    <input
                      type="number"
                      min="1"
                      value={r.matchDurationMinutes}
                      onChange={(e) =>
                        updateRound(r.roundNumber, {
                          matchDurationMinutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-2 py-1.5 text-[12px] bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className={`${isSetBased ? "col-span-2" : "col-span-3"} text-[12px] text-gray-600 font-mono tabular-nums`}>
                    {gap}m
                  </div>
                </div>
                {err && (
                  <div className="px-3 pb-2 text-[11px] text-rose-600 font-medium">{err}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inter-round break */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider" htmlFor="break-between-rounds-mins">
          Break between rounds (mins)
        </label>
        <input id="break-between-rounds-mins"
          type="number"
          min="0"
          value={breakBetweenRoundsMinutes}
          onChange={(e) => setBreakBetweenRoundsMinutes(parseInt(e.target.value) || 0)}
          className="w-20 px-2 py-1 text-[12px] bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-400"
        />
      </div>
    </div>
  );
}

// Convenience: parent calls this to know if anything's invalid before submit.
export function hasFormatPanelErrors({ customizeRounds, roundOverrides, uniformSlot, uniformMatch }) {
  if (customizeRounds) {
    for (const r of roundOverrides || []) {
      if (validateRoundEntry(r)) return true;
    }
    return false;
  }
  // Uniform mode validation
  if (!uniformSlot || uniformSlot < 1) return true;
  if (!uniformMatch || uniformMatch < 1) return true;
  if (uniformMatch > uniformSlot) return true;
  return false;
}
