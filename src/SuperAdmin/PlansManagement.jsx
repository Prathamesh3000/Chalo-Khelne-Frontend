/**
 * SuperAdmin → Plans.
 *
 * Composing a plan is the same act as composing a role: tick permission keys
 * from the catalogue. The difference is that a plan also carries a price and a
 * duration, and grants what it holds to ONE subscriber rather than to a role.
 *
 * The permission panel is deliberately laid out like the role editor in
 * RbacManagement — same module grouping, same expand/collapse — so an operator
 * who knows one already knows the other.
 */
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Package, Plus, Trash2, ChevronDown, ChevronRight, RefreshCcw,
  Users, IndianRupee, CalendarClock, Eye, EyeOff, Save, X,
} from "lucide-react";

const AUDIENCES = [
  { key: "club", label: "Clubs" },
  { key: "vendor", label: "Vendors" },
];

const FieldLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[11px] font-medium text-gray-400 mb-1">
    {children}
  </label>
);

const DarkInput = (props) => (
  <input
    {...props}
    className={`w-full h-9 px-3 bg-[#12141A] border border-white/[0.08] rounded-md text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 ${props.className || ""}`}
  />
);

const DarkSelect = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full h-9 px-3 bg-[#12141A] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-500/50"
  >
    {children}
  </select>
);

const emptyPlan = {
  name: "",
  slug: "",
  description: "",
  priceRupees: 0,
  durationDays: 30,
  trialDays: 0,
  audience: "club",
  permissionKeys: [],
  isActive: true,
  isPublic: true,
  sortOrder: 0,
};

export default function PlansManagement() {
  const [plans, setPlans] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // plan object or null
  const [expanded, setExpanded] = useState({});
  const [audienceFilter, setAudienceFilter] = useState("all");

  useEffect(() => {
    document.title = "Plans · Chalo Khelne";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, permRes] = await Promise.all([
        axios.get("/api/plans"),
        axios.get("/api/roles/permissions/list"),
      ]);
      setPlans(planRes.data.plans || []);
      setPermissions(permRes.data.permissions || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setEditing({ ...emptyPlan });
    setExpanded({});
  };

  const startEdit = (plan) => {
    setEditing({ ...plan, permissionKeys: [...(plan.permissionKeys || [])] });
    setExpanded({});
  };

  const togglePermission = (key) => {
    setEditing((prev) => {
      const has = prev.permissionKeys.includes(key);
      return {
        ...prev,
        permissionKeys: has
          ? prev.permissionKeys.filter((k) => k !== key)
          : [...prev.permissionKeys, key],
      };
    });
  };

  const toggleModule = (module, keys) => {
    setEditing((prev) => {
      const allOn = keys.every((k) => prev.permissionKeys.includes(k));
      const next = allOn
        ? prev.permissionKeys.filter((k) => !keys.includes(k))
        : [...new Set([...prev.permissionKeys, ...keys])];
      return { ...prev, permissionKeys: next };
    });
  };

  const savePlan = async () => {
    if (!editing.name || !editing.slug) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    try {
      const isNew = !editing._id;
      const { data } = isNew
        ? await axios.post("/api/plans", editing)
        : await axios.put(`/api/plans/${editing._id}`, editing);

      // The server tells us when live subscribers were left untouched by an
      // edit. Surface it — otherwise the operator assumes the change applied
      // to everyone, which is exactly the misunderstanding the snapshot design
      // creates.
      if (data.note) toast.info(data.note, { autoClose: 8000 });
      toast.success(isNew ? "Plan created" : "Plan saved");

      setEditing(null);
      load();
    } catch (err) {
      const d = err.response?.data;
      toast.error(d?.unknownKeys?.length
        ? `Unknown permission key(s): ${d.unknownKeys.join(", ")}`
        : d?.message || "Could not save plan");
    } finally {
      setSaving(false);
    }
  };

  const removePlan = async (plan) => {
    if (!window.confirm(`Delete the "${plan.name}" plan? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/plans/${plan._id}`);
      toast.success("Plan deleted");
      load();
    } catch (err) {
      // 409 = subscribers exist. The message explains retiring instead.
      toast.error(err.response?.data?.message || "Could not delete plan", { autoClose: 9000 });
    }
  };

  const visible = plans.filter(
    (p) => audienceFilter === "all" || p.audience === audienceFilter
  );

  return (
    <div className="p-5 max-w-[1200px]">
      <header className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-[18px] font-semibold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-400" />
            Plans
          </h1>
          <p className="text-[12px] text-gray-400 mt-1 max-w-[64ch]">
            A plan grants its permissions to one subscriber for its duration. Editing
            a plan never changes what existing subscribers already bought — their
            permissions were recorded at purchase.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-orange-500/15 text-orange-300 text-[12px] font-medium hover:bg-orange-500/25 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          New plan
        </button>
      </header>

      <div className="inline-flex items-center gap-1 bg-[#181A22] border border-white/[0.06] rounded-md p-1 mb-4">
        {[{ key: "all", label: "All" }, ...AUDIENCES].map((a) => (
          <button
            key={a.key}
            onClick={() => setAudienceFilter(a.key)}
            className={`h-8 px-3 rounded-md text-[12px] font-medium transition ${
              audienceFilter === a.key
                ? "bg-orange-500/15 text-orange-300"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <RefreshCcw className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
          <p className="text-[13px] text-gray-400 mt-2">Loading plans…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <Package className="w-6 h-6 text-gray-600 mx-auto" />
          <p className="text-[13px] text-gray-400 mt-2">No plans yet.</p>
          <p className="text-[12px] text-gray-500 mt-1">
            Create one, or run <code className="text-gray-400">node scripts/seedPlans.js</code> for starter plans.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((plan) => (
            <article
              key={plan._id}
              className={`bg-[#181A22] border rounded-lg p-4 flex flex-col gap-3 ${
                plan.isActive ? "border-white/[0.06]" : "border-white/[0.03] opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-semibold text-white truncate">{plan.name}</h2>
                  <p className="text-[11px] text-gray-500 font-mono">{plan.slug}</p>
                </div>
                <div className="flex items-center gap-1 flex-none">
                  {plan.isPublic ? (
                    <Eye className="w-3.5 h-3.5 text-gray-500" title="Listed to customers" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-gray-600" title="Hidden from the plans list" />
                  )}
                  {!plan.isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400">
                      Retired
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-1">
                <IndianRupee className="w-4 h-4 text-white" />
                <span className="text-[22px] font-semibold text-white tabular-nums">
                  {plan.priceRupees}
                </span>
                <span className="text-[12px] text-gray-500">
                  / {plan.durationDays} days
                </span>
              </div>

              {plan.description && (
                <p className="text-[12px] text-gray-400 leading-snug">{plan.description}</p>
              )}

              <dl className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <dt className="text-gray-500">Permissions</dt>
                  <dd className="text-white tabular-nums">{plan.permissionKeys?.length || 0}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Subscribers
                  </dt>
                  <dd className="text-white tabular-nums">{plan.activeSubscribers ?? 0}</dd>
                </div>
                {plan.trialDays > 0 && (
                  <div className="col-span-2">
                    <dt className="text-gray-500 flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> Trial
                    </dt>
                    <dd className="text-white">{plan.trialDays} days</dd>
                  </div>
                )}
              </dl>

              <div className="flex items-center gap-2 mt-auto pt-1">
                <button
                  onClick={() => startEdit(plan)}
                  className="h-7 px-2.5 rounded-md bg-white/[0.06] text-gray-200 text-[12px] hover:bg-white/[0.1] transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => removePlan(plan)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                  aria-label={`Delete ${plan.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Editor ─────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
          <div className="bg-[#14161C] border border-white/[0.08] rounded-lg w-full max-w-[720px] my-8">
            <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <h2 className="text-[14px] font-semibold text-white">
                {editing._id ? `Edit ${editing.name}` : "New plan"}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.06]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="plan-name">Name</FieldLabel>
                  <DarkInput
                    id="plan-name"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="Pro"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="plan-slug">Slug</FieldLabel>
                  <DarkInput
                    id="plan-slug"
                    value={editing.slug}
                    disabled={!!editing._id}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                    placeholder="pro"
                    className={editing._id ? "opacity-50 cursor-not-allowed" : ""}
                  />
                  {editing._id && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Fixed after creation — subscription records reference it.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="plan-desc">Description</FieldLabel>
                <DarkInput
                  id="plan-desc"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="What a buyer gets"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <FieldLabel htmlFor="plan-price">Price (₹)</FieldLabel>
                  <DarkInput
                    id="plan-price" type="number" min="0" step="1"
                    value={editing.priceRupees}
                    onChange={(e) => setEditing({ ...editing, priceRupees: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="plan-days">Duration (days)</FieldLabel>
                  <DarkInput
                    id="plan-days" type="number" min="1" step="1"
                    value={editing.durationDays}
                    onChange={(e) => setEditing({ ...editing, durationDays: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="plan-trial">Trial (days)</FieldLabel>
                  <DarkInput
                    id="plan-trial" type="number" min="0" step="1"
                    value={editing.trialDays}
                    onChange={(e) => setEditing({ ...editing, trialDays: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="plan-audience">Audience</FieldLabel>
                  <DarkSelect
                    id="plan-audience"
                    value={editing.audience}
                    onChange={(e) => setEditing({ ...editing, audience: e.target.value })}
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a.key} value={a.key}>{a.label}</option>
                    ))}
                  </DarkSelect>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <label className="inline-flex items-center gap-2 text-[12px] text-gray-300">
                  <input
                    type="checkbox"
                    checked={editing.isActive}
                    onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                    className="accent-orange-500"
                  />
                  Active (purchasable)
                </label>
                <label className="inline-flex items-center gap-2 text-[12px] text-gray-300">
                  <input
                    type="checkbox"
                    checked={editing.isPublic}
                    onChange={(e) => setEditing({ ...editing, isPublic: e.target.checked })}
                    className="accent-orange-500"
                  />
                  Listed to customers
                </label>
              </div>

              {/* ── Permission panel ───────────────────────────── */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-[12px] font-medium text-gray-300">
                    Permissions granted by this plan
                  </h3>
                  <span className="text-[11px] text-gray-500 tabular-nums">
                    {editing.permissionKeys.length} selected
                  </span>
                </div>

                <div className="border border-white/[0.06] rounded-md divide-y divide-white/[0.04] max-h-[340px] overflow-y-auto">
                  {Object.entries(permissions).map(([module, perms]) => {
                    const keys = perms.map((p) => p.key);
                    const on = keys.filter((k) => editing.permissionKeys.includes(k)).length;
                    const isOpen = expanded[module];
                    return (
                      <div key={module}>
                        <div className="flex items-center gap-2 px-3 py-2 bg-[#12141A]">
                          <button
                            onClick={() => setExpanded({ ...expanded, [module]: !isOpen })}
                            className="text-gray-400 hover:text-white"
                            aria-label={`${isOpen ? "Collapse" : "Expand"} ${module}`}
                          >
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          <span className="text-[12px] text-white capitalize flex-1">{module}</span>
                          <span className="text-[11px] text-gray-500 tabular-nums">{on}/{keys.length}</span>
                          <button
                            onClick={() => toggleModule(module, keys)}
                            className="text-[11px] text-orange-300/80 hover:text-orange-300"
                          >
                            {on === keys.length ? "none" : "all"}
                          </button>
                        </div>
                        {isOpen && (
                          <ul className="px-3 py-1.5 space-y-1">
                            {perms.map((p) => (
                              <li key={p.key}>
                                <label className="flex items-start gap-2 text-[12px] text-gray-300 py-0.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editing.permissionKeys.includes(p.key)}
                                    onChange={() => togglePermission(p.key)}
                                    className="mt-0.5 accent-orange-500"
                                  />
                                  <span>
                                    <span className="font-mono text-[11px] text-gray-400">{p.key}</span>
                                    <span className="block text-gray-500 text-[11px]">{p.name}</span>
                                  </span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
              <button
                onClick={() => setEditing(null)}
                className="h-8 px-3 rounded-md text-[12px] text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={savePlan}
                disabled={saving}
                className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-orange-500/15 text-orange-300 text-[12px] font-medium hover:bg-orange-500/25 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Save plan"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
