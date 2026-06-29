// useSafetyGate (web) — Families Policy req: show the SafetyReminder to MINOR
// users before they create a post or story. Acknowledged once per session,
// shared across every Social surface. Mirrors the mobile hook.

import { useState, useCallback, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { userIsMinor } from "../../shared/lib/age";

let acknowledgedThisSession = false;
export const isSafetyAcknowledged = () => acknowledgedThisSession;
export const markSafetyAcknowledged = () => {
  acknowledgedThisSession = true;
};

export default function useSafetyGate() {
  const { auth } = useContext(AuthContext);
  const minor = userIsMinor(auth);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);

  // Adults / already-acknowledged minors run the action immediately; otherwise
  // show the reminder first and run the action only after acknowledgement.
  const guard = useCallback(
    (action) => {
      if (!minor || acknowledgedThisSession) {
        action?.();
        return;
      }
      setPending(() => action);
      setOpen(true);
    },
    [minor]
  );

  const onAcknowledge = useCallback(() => {
    acknowledgedThisSession = true;
    setOpen(false);
    const a = pending;
    setPending(null);
    a?.();
  }, [pending]);

  const onCancel = useCallback(() => {
    setOpen(false);
    setPending(null);
  }, []);

  return { guard, isMinor: minor, safetyProps: { open, onAcknowledge, onCancel } };
}
