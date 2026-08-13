import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "react-toastify";

import { getAuthToken } from "../../shared/api/authToken";
/*
 * Drop-in "export" buttons for any tournament context — wires to:
 *   GET /api/tournaments/:tournamentId/export/participants.csv
 *   GET /api/tournaments/:tournamentId/export/results.xlsx
 * Both are allowUserOrManager + requireTournamentOwner on the backend, so the
 * caller must own the tournament. We use a JS fetch + blob (not <a download>)
 * because the browser won't attach the Bearer token to plain link navigation.
 */

async function downloadAuthed(url, fallbackFilename) {
  const token = getAuthToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch {
      // non-JSON error body — keep the default status message
    }
    throw new Error(msg);
  }
  // Filename from Content-Disposition when present.
  const cd = res.headers.get("Content-Disposition") || "";
  const m = /filename="?([^";]+)"?/.exec(cd);
  const filename = (m && m[1]) || fallbackFilename;
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export default function ExportTournamentMenu({ tournamentId, compact = false }) {
  const [busy, setBusy] = useState(null); // "participants" | "results" | null
  if (!tournamentId) return null;

  const handle = async (kind) => {
    const url = kind === "participants"
      ? `/api/tournaments/${tournamentId}/export/participants.csv`
      : `/api/tournaments/${tournamentId}/export/results.xlsx`;
    const fallback = kind === "participants" ? "participants.csv" : "results.xlsx";
    try {
      setBusy(kind);
      await downloadAuthed(url, fallback);
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const btnClass =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg bg-white hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition disabled:opacity-50 w-auto";

  return (
    <div className={`flex ${compact ? "gap-1" : "gap-2"}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => handle("participants")}
        disabled={busy !== null}
        className={btnClass}
        title="Download the registered participants as a CSV"
      >
        <Download className="w-3.5 h-3.5" />
        {compact ? "Participants" : "Participants (CSV)"}
      </button>
      <button
        type="button"
        onClick={() => handle("results")}
        disabled={busy !== null}
        className={btnClass}
        title="Download the group standings / results as an Excel file"
      >
        <Download className="w-3.5 h-3.5" />
        {compact ? "Results" : "Results (XLSX)"}
      </button>
    </div>
  );
}
