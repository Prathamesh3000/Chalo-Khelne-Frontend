// Turns a scoring API error into a clean, human message for the manager/umpire —
// so a 400/403/404 reads as a real explanation instead of a silent dead button.
export function scoreErrorMessage(err) {
  const status = err?.response?.status;
  const raw = err?.response?.data?.message || err?.response?.data?.error || "";
  const m = String(raw).toLowerCase();

  if (status === 403) {
    if (m.includes("not a scorer")) {
      return "You're not authorised to score this match. Ask the organiser to assign you.";
    }
    return "You don't have permission to update scores. Ask the tournament organiser for access.";
  }
  if (status === 400 && (m.includes("completed") || m.includes("already finished") || m.includes("not in progress"))) {
    if (m.includes("completed") || m.includes("already finished")) {
      return "This match is already completed — its score can't be changed.";
    }
    return "This match hasn't been started yet.";
  }
  if (status === 404) {
    return "Couldn't reach this match — it may have been removed or belongs to a different stage.";
  }
  if (status === 401) {
    return "Your session has expired. Please log in again and retry.";
  }
  if (err?.message === "Network Error" || !err?.response) {
    return "Network problem — check your connection and try again.";
  }
  return raw || "Could not submit scores. Please try again.";
}
