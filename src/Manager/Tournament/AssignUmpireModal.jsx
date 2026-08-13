import { useEffect, useState } from "react";
import { X, Check, Award, Loader2, AlertCircle, Shield } from "lucide-react";
import refereeApi from "../../features/referee/refereeApi";

import DialogA11y from "../../shared/components/DialogA11y";
const SIG = "#5E6AD2";

export default function AssignUmpireModal({
  isOpen,
  onClose,
  matchId,
  tournamentId,
  matchLabel,
  onAssigned,
}) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !tournamentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await refereeApi.fetchTournamentApplicants(tournamentId, {
          includeAll: true,
        });
        const accepted = (all || []).filter((a) => a.status === "accepted");
        if (!cancelled) setApplicants(accepted);
      } catch (e) {
        if (!cancelled)
          setError(
            e?.response?.data?.message || e.message || "Failed to load umpires."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, tournamentId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await refereeApi.assignUmpireToMatch({
        matchId,
        refereeUserId: selectedId,
      });
      onAssigned?.(result);
      onClose();
    } catch (e) {
      setError(
        e?.response?.data?.message || e.message || "Assignment failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <DialogA11y onClose={onClose} />
      <div
        className="bg-white rounded-2xl border border-neutral-200 shadow-[0_24px_64px_rgba(0,0,0,0.16)] max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 mb-0.5">
              Assign umpire
            </p>
            {matchLabel && (
              <p className="text-[14px] font-semibold text-neutral-950 truncate">
                {matchLabel}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-neutral-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[12px]">Loading accepted umpires…</span>
            </div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 inline-flex items-center justify-center mb-3">
                <Award className="w-5 h-5 text-neutral-400" />
              </div>
              <p className="text-[14px] font-semibold text-neutral-900">
                No accepted umpires yet
              </p>
              <p className="text-[12px] text-neutral-500 mt-1">
                Approve umpires in the Staff Applications tab first.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {applicants.map((a) => {
                const userId = a.referee?.userId;
                const name = a.referee?.name || "Unknown";
                const cert = a.referee?.certificationLevel;
                const exp = a.referee?.experience;
                const sports = Array.isArray(a.referee?.sports)
                  ? a.referee.sports.join(", ")
                  : "";
                const isSelected = selectedId === userId;
                return (
                  <li key={a.applicationId || userId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(userId)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition ${
                        isSelected
                          ? "border-transparent ring-2"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: "rgba(94,106,210,0.06)",
                              "--tw-ring-color": SIG,
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-neutral-100 inline-flex items-center justify-center flex-shrink-0">
                            <Shield className="w-3.5 h-3.5 text-neutral-700" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-neutral-900 truncate">
                              {name}
                            </p>
                            <p className="text-[11px] text-neutral-500 truncate">
                              {cert || "Unranked"}
                              {exp ? ` · ${exp}y exp` : ""}
                              {sports ? ` · ${sports}` : ""}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <Check
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: SIG }}
                          />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-[12px]">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-100 bg-neutral-50/60">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-8 px-3 text-[12px] font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId || submitting}
            className="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{ backgroundColor: SIG }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Assigning…
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Confirm
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
