import { useState } from "react";
import { Users, Swords, Trophy, ChevronRight, Check } from "lucide-react";
import { getAllTeamKnockoutFormats } from "../config/teamKnockoutFormats";

/**
 * Format selector for Davis Cup / Team Knockout tournaments.
 * Displays predefined formulas as selectable cards.
 *
 * Props:
 * - value: currently selected format ID
 * - onChange: (formatId) => void
 * - className: optional wrapper class
 */
export default function TeamKnockoutFormatSelector({ value, onChange, className = "" }) {
  const [expandedId, setExpandedId] = useState(null);
  const formats = getAllTeamKnockoutFormats();

  const twoPlayerSingles = formats.filter((f) => !f.hasDoubles && f.minPlayers === 2);
  const twoPlayerDoubles = formats.filter((f) => f.hasDoubles && f.minPlayers === 2);
  const threePlayerFormats = formats.filter((f) => f.minPlayers === 3);
  const fivePlayerFormats = formats.filter((f) => f.minPlayers >= 5);

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">Match Formula</label>
      <p className="text-xs text-gray-400 mb-4">Choose how teams will compete in each match</p>

      {/* 2-Player Singles */}
      <div className="mb-4">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
          2-Player Teams — Singles
        </h4>
        <div className="space-y-2">
          {twoPlayerSingles.map((fmt) => (
            <FormatCard key={fmt.id} format={fmt} selected={value === fmt.id} expanded={expandedId === fmt.id}
              onSelect={() => onChange(fmt.id)}
              onToggle={() => setExpandedId(expandedId === fmt.id ? null : fmt.id)} />
          ))}
        </div>
      </div>

      {/* 2-Player Mixed */}
      <div className="mb-4">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
          2-Player Teams — Mixed (Singles + Doubles)
        </h4>
        <div className="space-y-2">
          {twoPlayerDoubles.map((fmt) => (
            <FormatCard key={fmt.id} format={fmt} selected={value === fmt.id} expanded={expandedId === fmt.id}
              onSelect={() => onChange(fmt.id)}
              onToggle={() => setExpandedId(expandedId === fmt.id ? null : fmt.id)} />
          ))}
        </div>
      </div>

      {/* 3-Player Formats */}
      <div className="mb-4">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
          3-Player Teams
        </h4>
        <div className="space-y-2">
          {threePlayerFormats.map((fmt) => (
            <FormatCard key={fmt.id} format={fmt} selected={value === fmt.id} expanded={expandedId === fmt.id}
              onSelect={() => onChange(fmt.id)}
              onToggle={() => setExpandedId(expandedId === fmt.id ? null : fmt.id)} />
          ))}
        </div>
      </div>

      {/* 5-Player Formats (Rapid Rallies) */}
      {fivePlayerFormats.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
            5-Player Teams — Dynamic Selection
          </h4>
          <div className="space-y-2">
            {fivePlayerFormats.map((fmt) => (
              <FormatCard key={fmt.id} format={fmt} selected={value === fmt.id} expanded={expandedId === fmt.id}
                onSelect={() => onChange(fmt.id)}
                onToggle={() => setExpandedId(expandedId === fmt.id ? null : fmt.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FormatCard({ format, selected, expanded, onSelect, onToggle }) {
  const singlesCount = format.sets.filter((s) => s.type === "singles").length;
  const doublesCount = format.sets.filter((s) => s.type === "doubles").length;

  return (
    <div className={`rounded-2xl border-2 transition-all overflow-hidden ${
      selected ? "border-orange-500 bg-orange-500/5 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
    }`}>
      {/* Main Row */}
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={onSelect}>
        {/* Radio */}
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
          selected ? "border-orange-500 bg-orange-500" : "border-gray-300"
        }`}>
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>

        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          selected ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"
        }`}>
          {format.hasDoubles ? <Users className="w-5 h-5" /> : <Swords className="w-5 h-5" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold text-sm ${selected ? "text-orange-500" : "text-gray-800"}`}>{format.name}</h3>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {format.totalSets} sets
            </span>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              First to {format.setsToWin}
            </span>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {singlesCount}S{doublesCount > 0 ? ` + ${doublesCount}D` : ""}
            </span>
          </div>
        </div>

        {/* Expand */}
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition w-auto flex-shrink-0">
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
      </div>

      {/* Expanded: Set-by-Set Breakdown */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
          <p className="text-xs text-gray-500 mb-3">{format.description}</p>
          <div className="space-y-1.5">
            {format.sets.map((set) => (
              <div key={set.setNumber} className="flex items-center gap-2 text-xs">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
                  set.isDecider ? "bg-orange-100 text-orange-600" : set.type === "doubles" ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-500"
                }`}>
                  {set.setNumber}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  set.type === "doubles" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-500"
                }`}>
                  {set.type === "doubles" ? "DBL" : "SGL"}
                </span>
                <span className="text-gray-700 font-medium">{set.label}</span>
                {set.requiresSelection && (
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    PICK
                  </span>
                )}
                {set.isDecider && (
                  <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full ml-auto">
                    DECIDER
                  </span>
                )}
              </div>
            ))}
            {/* Show selectable options inline */}
            {format.sets.filter((s) => s.requiresSelection).map((s) => (
              <div key={`opts-${s.setNumber}`} className="mt-2 ml-8 pl-3 border-l-2 border-emerald-200">
                <p className="text-[10px] font-bold text-emerald-600 mb-1">Set {s.setNumber} — Captain picks:</p>
                <div className="space-y-0.5">
                  {s.options && s.options.length > 0 ? (
                    s.options.map((opt) => (
                      <div key={opt.id} className="text-[10px] text-gray-500 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-300" />
                        {opt.label}
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-300" />
                      {s.partnerPool
                        ? `Partner chosen from ${s.partnerPool.join(" / ")}`
                        : s.eligibility === "notPlayedSingles"
                        ? "Any player who hasn't played a singles rubber"
                        : "Captain's choice"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Visual Match Preview */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Team Lineup</div>
            <div className="flex items-center justify-center gap-8 py-2">
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-1">
                  {(format.minPlayers >= 5
                    ? ["P1", "P2", "P3", "P4", "P5"]
                    : ["A", "B", ...(format.minPlayers >= 3 ? ["C"] : [])]
                  ).map((p) => (
                    <div key={p} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                      p === format.femaleSlot ? "bg-pink-100 text-pink-600" : "bg-orange-100 text-orange-600"
                    }`}>{p}</div>
                  ))}
                </div>
                <span className="text-[10px] text-gray-500 font-medium">Home</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-gray-300">VS</span>
                <span className="text-[9px] text-gray-400 mt-0.5">BO{format.totalSets}</span>
              </div>
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-1">
                  {(format.minPlayers >= 5
                    ? ["P1", "P2", "P3", "P4", "P5"]
                    : ["X", "Y", ...(format.minPlayers >= 3 ? ["Z"] : [])]
                  ).map((p) => (
                    <div key={p} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                      p === format.femaleSlot ? "bg-pink-100 text-pink-600" : "bg-red-100 text-red-700"
                    }`}>{p}</div>
                  ))}
                </div>
                <span className="text-[10px] text-gray-500 font-medium">Away</span>
              </div>
            </div>
            {format.femaleSlot && (
              <p className="text-[10px] text-pink-600 text-center mt-1 font-medium">
                {format.femaleSlot} must be female · plays the female singles rubber
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
