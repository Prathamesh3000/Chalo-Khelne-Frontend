/**
 * Billing — the customer's own plan, and the plans they can buy.
 *
 * One component serves both ClubAdmin and Vendor. The server decides which
 * plans a caller sees from WHO THEY ARE (their billing subject type), not from
 * anything this page sends, so there is nothing role-specific to branch on
 * here — which is also why a club cannot see vendor pricing by tampering.
 */
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  IndianRupee, Check, CalendarClock, ShieldCheck, RefreshCcw, Sparkles, AlertTriangle,
} from "lucide-react";
import { subscribeToPlan } from "../../utils/razorpayCheckout";

/** Human label for a permission key: "payment:approve" → "Verify payments". */
function permissionLabel(key, catalogue) {
  return catalogue[key] || key;
}

export default function BillingPage({ title = "Billing" }) {
  const [state, setState] = useState({ plans: [], currentPlanSlug: null, audience: null });
  const [me, setMe] = useState(null);
  const [labels, setLabels] = useState({});
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    document.title = `${title} · Chalo Khelne`;
  }, [title]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, meRes] = await Promise.all([
        axios.get("/api/billing/plans"),
        axios.get("/api/billing/me"),
      ]);
      setState(planRes.data);
      setMe(meRes.data);

      // Permission names, so a plan lists "Verify payments" rather than
      // "payment:approve". Optional — the raw key is a fine fallback.
      try {
        const { data } = await axios.get("/api/roles/permissions/list");
        const map = {};
        (data.flat || []).forEach((p) => { map[p.key] = p.name; });
        setLabels(map);
      } catch {
        /* SuperAdmin-only endpoint for some deployments — keys still render */
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const buy = async (plan) => {
    setBuying(plan._id);
    try {
      await subscribeToPlan({ planId: plan._id, planName: plan.name });
      toast.success(`${plan.name} is active.`);
      load();
    } catch (err) {
      // "Payment cancelled" is a normal outcome, not an error worth shouting.
      if (/cancelled/i.test(err.message)) toast.info("Payment cancelled");
      else toast.error(err.message || "Payment failed");
    } finally {
      setBuying(null);
    }
  };

  const sub = me?.subscription;
  const expiringSoon = sub && sub.daysRemaining !== null && sub.daysRemaining <= 7;

  if (loading) {
    return (
      <div className="p-5">
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <RefreshCcw className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
          <p className="text-[13px] text-gray-400 mt-2">Loading billing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-[1100px]">
      <header className="mb-5">
        <h1 className="text-[18px] font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-orange-400" />
          {title}
        </h1>
        <p className="text-[12px] text-gray-400 mt-1 max-w-[64ch]">
          Your plan adds features on top of what your account already includes.
          When it ends, those extras switch off and everything else keeps working.
        </p>
      </header>

      {/* ── Current plan ─────────────────────────────────────── */}
      <section className="mb-6">
        {sub ? (
          <div
            className={`rounded-lg border p-4 ${
              expiringSoon
                ? "bg-amber-500/[0.06] border-amber-500/25"
                : "bg-[#181A22] border-white/[0.06]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">
                  {sub.status === "trialing" ? "Free trial" : "Current plan"}
                </p>
                <p className="text-[16px] font-semibold text-white mt-0.5">
                  {sub.planSlug || "Active"}
                  {sub.isComped && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400 align-middle">
                      Included
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-500 flex items-center gap-1 justify-end">
                  <CalendarClock className="w-3 h-3" />
                  {sub.daysRemaining === 0 ? "Ends today" : `${sub.daysRemaining} days left`}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 tabular-nums">
                  until {new Date(sub.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {expiringSoon && (
              <p className="mt-3 text-[12px] text-amber-200/90 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-none" />
                {sub.status === "trialing"
                  ? "Your trial ends soon. Choose a plan below to keep these features."
                  : "Renew below to keep these features. Renewing early adds to your remaining days — you lose nothing."}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4">
            <p className="text-[13px] text-white font-medium">No plan active</p>
            <p className="text-[12px] text-gray-400 mt-1">
              You have core tournament management. Add a plan below for more.
            </p>
          </div>
        )}
      </section>

      {/* ── Available plans ──────────────────────────────────── */}
      {state.plans.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-12 text-center">
          <Sparkles className="w-5 h-5 text-gray-600 mx-auto" />
          <p className="text-[13px] text-gray-400 mt-2">No plans are available right now.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {state.plans.map((plan) => {
            const isCurrent = state.currentPlanSlug === plan.slug;
            return (
              <article
                key={plan._id}
                className={`rounded-lg border p-4 flex flex-col gap-3 ${
                  isCurrent
                    ? "bg-[#181A22] border-orange-500/40"
                    : "bg-[#181A22] border-white/[0.06]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-semibold text-white">{plan.name}</h2>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300">
                        Current
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-[12px] text-gray-400 mt-1 leading-snug">{plan.description}</p>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <IndianRupee className="w-4 h-4 text-white" />
                  <span className="text-[26px] font-semibold text-white tabular-nums leading-none">
                    {plan.priceRupees}
                  </span>
                  <span className="text-[12px] text-gray-500">/ {plan.durationDays} days</span>
                </div>

                {plan.permissionKeys?.length > 0 && (
                  <ul className="space-y-1 flex-1">
                    {plan.permissionKeys.slice(0, 6).map((key) => (
                      <li key={key} className="flex items-start gap-1.5 text-[12px] text-gray-300">
                        <Check className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-none" />
                        <span>{permissionLabel(key, labels)}</span>
                      </li>
                    ))}
                    {plan.permissionKeys.length > 6 && (
                      <li className="text-[11px] text-gray-500 pl-5">
                        +{plan.permissionKeys.length - 6} more
                      </li>
                    )}
                  </ul>
                )}

                <button
                  onClick={() => buy(plan)}
                  disabled={buying === plan._id}
                  className="mt-auto h-9 rounded-md bg-orange-500/15 text-orange-300 text-[13px] font-medium hover:bg-orange-500/25 transition disabled:opacity-50"
                >
                  {buying === plan._id
                    ? "Opening payment…"
                    : isCurrent
                      ? `Renew — ₹${plan.priceRupees}`
                      : `Choose ${plan.name} — ₹${plan.priceRupees}`}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
