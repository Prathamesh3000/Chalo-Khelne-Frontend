import { useState, useMemo } from "react";
import { CalendarDays } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const VIEWS = ["Daily", "Weekly", "Coach-wise", "Class-wise"];

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : 99999;
};
const to12h = (hhmm) => {
  const mins = toMin(hhmm);
  if (mins >= 99999) return "";
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
};
const slotKey = (r) => r.startTime || r.time || "—";
const slotLabel = (r) => (r.startTime ? `${to12h(r.startTime)}${r.endTime ? ` – ${to12h(r.endTime)}` : ""}` : r.time || "—");
const classLabel = (r) => (r.standard ? `Std ${r.standard}${r.section ? `-${r.section}` : ""}` : "—");
const sportOf = (r) => r.sport || (r.sports || []).join(", ") || "—";

// One session block (used in grid cells and lists).
function Cell({ r }) {
  return (
    <div className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-1.5">
      <p className="text-[11px] font-semibold text-white leading-tight">{classLabel(r)}</p>
      <p className="text-[11px] text-blue-300 leading-tight">{sportOf(r)}</p>
      {r.coachName ? <p className="text-[10px] text-gray-400 leading-tight">{r.coachName}</p> : null}
    </div>
  );
}

/**
 * Read-only timetable visualisations over the schedule rows (Daily / Weekly /
 * Coach-wise / Class-wise). Pure pivots — no API calls.
 */
export default function ScheduleTimetable({ rows = [] }) {
  const [view, setView] = useState("Weekly");
  const [day, setDay] = useState(DAYS[0]);

  // Unique time slots, sorted by start time.
  const slots = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => {
      const k = slotKey(r);
      if (!seen.has(k)) seen.set(k, { key: k, sort: toMin(r.startTime), label: slotLabel(r) });
    });
    return [...seen.values()].sort((a, b) => a.sort - b.sort);
  }, [rows]);

  const cell = (d, k) => rows.filter((r) => r.day === d && slotKey(r) === k);

  const groupBy = (keyFn) => {
    const g = {};
    rows.forEach((r) => {
      const k = keyFn(r) || "Unassigned";
      (g[k] = g[k] || []).push(r);
    });
    return g;
  };

  const dayRows = rows
    .filter((r) => r.day === day)
    .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

  return (
    <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-white inline-flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-orange-400" /> Sports Timetable
        </h3>
      </div>

      {/* View switch */}
      <div className="flex rounded-lg bg-white/[0.04] p-1 mb-4 max-w-xl">
        {VIEWS.map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 h-8 rounded-md text-[12px] font-semibold transition w-auto ${view === v ? "bg-blue-600 text-white" : "text-gray-300 hover:text-white"}`}>
            {v}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-[13px] text-gray-400 py-8 text-center">No schedule yet.</p>
      ) : view === "Weekly" ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 px-3 py-2 w-28">Time</th>
                {DAYS.map((d) => (
                  <th key={d} className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 px-3 py-2 min-w-[140px]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => (
                <tr key={s.key} className="border-t border-white/[0.06] align-top">
                  <td className="px-3 py-2 text-[12px] text-gray-400 whitespace-nowrap">{s.label}</td>
                  {DAYS.map((d) => {
                    const items = cell(d, s.key);
                    return (
                      <td key={d} className="px-3 py-2">
                        {items.length === 0 ? (
                          <span className="text-gray-700">–</span>
                        ) : (
                          <div className="space-y-1.5">{items.map((r) => <Cell key={r._id} r={r} />)}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "Daily" ? (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DAYS.map((d) => (
              <button key={d} onClick={() => setDay(d)}
                className={`px-3 h-8 rounded-md text-[12px] font-semibold transition w-auto ${day === d ? "bg-blue-600 text-white" : "text-gray-300 bg-white/[0.04] hover:bg-white/[0.08]"}`}>
                {d}
              </button>
            ))}
          </div>
          {dayRows.length === 0 ? (
            <p className="text-[13px] text-gray-500 py-6 text-center">No sessions on {day}.</p>
          ) : (
            <div className="space-y-2">
              {dayRows.map((r) => (
                <div key={r._id} className="flex items-center gap-3 rounded-md bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                  <span className="text-[12px] text-gray-400 w-32 shrink-0">{slotLabel(r)}</span>
                  <span className="text-[13px] font-semibold text-white">{sportOf(r)}</span>
                  <span className="text-[12px] text-gray-400">{classLabel(r)}</span>
                  {r.coachName ? <span className="text-[12px] text-blue-300 ml-auto">{r.coachName}</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Coach-wise / Class-wise
        <div className="space-y-3">
          {Object.entries(groupBy(view === "Coach-wise" ? (r) => r.coachName : classLabel)).map(([k, items]) => (
            <div key={k} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[13px] font-semibold text-white mb-2">{k}</p>
              <div className="space-y-1.5">
                {items
                  .slice()
                  .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || toMin(a.startTime) - toMin(b.startTime))
                  .map((r) => (
                    <div key={r._id} className="flex items-center gap-3 text-[12px]">
                      <span className="text-gray-400 w-20 shrink-0">{r.day}</span>
                      <span className="text-gray-400 w-28 shrink-0">{slotLabel(r)}</span>
                      <span className="text-blue-300">{sportOf(r)}</span>
                      <span className="text-gray-400">{view === "Coach-wise" ? classLabel(r) : r.coachName || ""}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
