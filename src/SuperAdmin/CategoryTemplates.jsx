import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  Sparkles,
  Trash2,
  Pencil,
  X,
  ToggleLeft,
  ToggleRight,
  Tag,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import { SuperAdminShell } from "../shared/layout";

import { getAuthToken } from "../shared/api/authToken";
const API = `${import.meta.env.VITE_API_BASE_URL || "/api"}/category-templates`;

const GENDER_LABEL = {
  any: "Any gender",
  male: "Male only",
  female: "Female only",
};

// Mirrors the controller's parseLabelSuggestion — gives instant client-side
// hints without a network call on every keystroke.
function suggestFromLabel(label) {
  if (!label) return null;
  const s = label.trim();
  const under = s.match(/^(?:U|Under\s*)(\d{1,2})\s*$/i);
  if (under) return { minAge: null, maxAge: Number(under[1]), gender: "any" };
  const over = s.match(
    /^(?:U(\d{1,2})\+|Over\s*(\d{1,2})|Veterans?\s*(\d{1,2})\+?)$/i
  );
  if (over) {
    const n = Number(over[1] || over[2] || over[3]);
    return { minAge: n, maxAge: null, gender: "any" };
  }
  const range = s.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
  if (range)
    return { minAge: Number(range[1]), maxAge: Number(range[2]), gender: "any" };
  if (/^(open|senior)/i.test(s))
    return { minAge: null, maxAge: null, gender: "any" };
  return null;
}

const EMPTY_FORM = {
  label: "",
  code: "",
  minAge: "",
  maxAge: "",
  gender: "any",
  description: "",
  isActive: true,
};

function formatBounds(t) {
  if (t.minAge == null && t.maxAge == null) return "No age limit";
  if (t.minAge != null && t.maxAge != null) return `Age ${t.minAge}-${t.maxAge}`;
  if (t.maxAge != null) return `Up to age ${t.maxAge}`;
  return `Age ${t.minAge}+`;
}

// Hoisted helpers (module scope — avoid keyboard focus drop on re-render)
const FieldLabel = ({ children }) => (
  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5">
    {children}
  </label>
);

const DarkInput = (props) => (
  <input
    {...props}
    className={
      "w-full h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40 transition " +
      (props.className || "")
    }
  />
);

const DarkSelect = ({ children, ...props }) => (
  <select
    {...props}
    className={
      "w-full h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 transition appearance-none " +
      (props.className || "")
    }
  >
    {children}
  </select>
);

export default function CategoryTemplates() {
  const [templates, setTemplates] = useState([]);
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const authHeader = () => ({
    Authorization: `Bearer ${getAuthToken() || ""}`,
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [listRes, usageRes] = await Promise.all([
        axios.get(`${API}?all=1`, { headers: authHeader() }),
        axios.get(`${API}/usage`, { headers: authHeader() }),
      ]);
      setTemplates(listRes.data?.templates || []);
      setUsage(usageRes.data?.usage || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (!showInactive && !t.isActive) return false;
      if (!q) return true;
      return (
        t.label.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    });
  }, [templates, search, showInactive]);

  const openNew = () => {
    setEditing("new");
    setForm(EMPTY_FORM);
  };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      label: t.label || "",
      code: t.code || "",
      minAge: t.minAge ?? "",
      maxAge: t.maxAge ?? "",
      gender: t.gender || "any",
      description: t.description || "",
      isActive: t.isActive !== false,
    });
  };
  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleLabelChange = (val) => {
    setForm((p) => {
      const next = { ...p, label: val };
      if (editing !== "new") return next;
      const sugg = suggestFromLabel(val);
      if (!sugg) return next;
      if (p.minAge === "" && p.maxAge === "" && p.gender === "any") {
        return {
          ...next,
          minAge: sugg.minAge ?? "",
          maxAge: sugg.maxAge ?? "",
          gender: sugg.gender,
        };
      }
      return next;
    });
  };

  const submitForm = async () => {
    if (!form.label.trim() || !form.code.trim()) {
      toast.error("Label and code are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        code: form.code.trim(),
        minAge: form.minAge === "" ? null : Number(form.minAge),
        maxAge: form.maxAge === "" ? null : Number(form.maxAge),
        gender: form.gender,
        description: form.description,
        isActive: form.isActive,
      };
      if (editing === "new") {
        await axios.post(API, payload, { headers: authHeader() });
        toast.success("Template created");
      } else {
        await axios.put(`${API}/${editing._id}`, payload, {
          headers: authHeader(),
        });
        toast.success("Template updated");
      }
      closeForm();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t) => {
    try {
      await axios.patch(
        `${API}/${t._id}`,
        { isActive: !t.isActive },
        { headers: authHeader() }
      );
      toast.success(t.isActive ? "Template deactivated" : "Template reactivated");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Toggle failed");
    }
  };

  const deleteTemplate = async (t) => {
    const inUse = usage[String(t._id)] || 0;
    const message = inUse
      ? `This template is used by ${inUse} tournament(s). Hard delete is blocked — deactivate instead?`
      : `Hard-delete "${t.label}"? This cannot be undone.`;
    if (!window.confirm(message)) return;
    try {
      await axios.delete(`${API}/${t._id}`, { headers: authHeader() });
      toast.success("Template deleted");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await axios.post(
        `${API}/seed`,
        {},
        { headers: authHeader() }
      );
      const { inserted = 0, skipped = 0 } = res.data || {};
      toast.success(`Seed complete — ${inserted} added, ${skipped} skipped`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <SuperAdminShell searchPlaceholder="Search category templates…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Tag className="w-3.5 h-3.5" />
            Content · Categories
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Category templates
          </h1>
          <p className="mt-1 text-[13px] text-gray-400 max-w-xl">
            Predefined age and gender categories. Managers pick from active
            templates when creating tournaments — they cannot enter custom age
            values.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="h-9 px-3 inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {seeding ? "Seeding…" : "Seed starter templates"}
          </button>
          <button
            onClick={openNew}
            className="h-9 px-3 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            New template
          </button>
        </div>
      </header>

      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by label, code, or description…"
            className="w-full h-9 pl-9 pr-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-[12px] text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-3.5 w-3.5 accent-orange-500"
          />
          Show inactive
        </label>
      </div>

      {loading ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <p className="text-[13px] text-gray-400">Loading templates…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <Tag className="w-6 h-6 text-gray-500 mx-auto mb-2" />
          <p className="text-[13px] text-gray-400">
            {templates.length === 0
              ? 'No templates yet. Click "Seed starter templates" to populate the standard age groups.'
              : "No templates match your search."}
          </p>
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                  Label
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                  Code
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                  Age bounds
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                  Gender
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                  Usage
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500 w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const inUse = usage[String(t._id)] || 0;
                return (
                  <tr
                    key={t._id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition ${
                      !t.isActive ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium text-white">
                        {t.label}
                      </div>
                      {t.description && (
                        <div className="text-[11px] text-gray-500">
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-300">
                      {t.code}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-300">
                      {formatBounds(t)}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-300">
                      {GENDER_LABEL[t.gender] || t.gender}
                    </td>
                    <td className="px-4 py-3">
                      {t.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-500/15 text-gray-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[12px] text-gray-300">
                      {inUse > 0 ? (
                        `${inUse}`
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-1">
                        <button
                          onClick={() => toggleActive(t)}
                          title={t.isActive ? "Deactivate" : "Reactivate"}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-orange-300 hover:bg-orange-500/10 transition"
                        >
                          {t.isActive ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(t)}
                          title="Edit"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08] transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(t)}
                          title={
                            inUse > 0
                              ? "In use — deactivate instead"
                              : "Delete"
                          }
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181A22] border border-white/[0.08] rounded-xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-white">
                {editing === "new"
                  ? "New category template"
                  : `Edit "${editing.label}"`}
              </h2>
              <button
                onClick={closeForm}
                className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editing !== "new" && (usage[String(editing._id)] || 0) > 0 && (
              <div className="mx-6 mt-4 px-3 py-2 bg-amber-500/10 border border-amber-400/20 rounded-md text-[12px] text-amber-200 flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  This template is used by{" "}
                  <strong>{usage[String(editing._id)]}</strong> tournament(s).
                  Existing tournaments use a frozen snapshot, so edits here only
                  affect future use.
                </span>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Label</FieldLabel>
                  <DarkInput
                    type="text"
                    value={form.label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="Under 19"
                  />
                  {editing === "new" && suggestFromLabel(form.label) && (
                    <p className="text-[10px] text-orange-300 mt-1">
                      Auto-detected from label · adjust below if needed
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel>Code</FieldLabel>
                  <DarkInput
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="U19"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FieldLabel>Min age</FieldLabel>
                  <DarkInput
                    type="number"
                    min="0"
                    value={form.minAge}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, minAge: e.target.value }))
                    }
                    placeholder="—"
                  />
                </div>
                <div>
                  <FieldLabel>Max age</FieldLabel>
                  <DarkInput
                    type="number"
                    min="0"
                    value={form.maxAge}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, maxAge: e.target.value }))
                    }
                    placeholder="—"
                  />
                </div>
                <div>
                  <FieldLabel>Gender</FieldLabel>
                  <DarkSelect
                    value={form.gender}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, gender: e.target.value }))
                    }
                  >
                    <option value="any">Any</option>
                    <option value="male">Male only</option>
                    <option value="female">Female only</option>
                  </DarkSelect>
                </div>
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <DarkInput
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Players aged 19 or below"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-[12px] text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, isActive: e.target.checked }))
                  }
                  className="h-3.5 w-3.5 accent-orange-500"
                />
                Active — visible to managers
              </label>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
              <button
                onClick={closeForm}
                className="h-9 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={submitForm}
                disabled={saving}
                className="h-9 px-4 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : editing === "new"
                  ? "Create template"
                  : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}
