import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  RotateCw,
  Search,
  BookOpen,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";

const API = import.meta.env.VITE_API_BASE_URL;
const ENDPOINT = `${API}/sport-library`;

const TYPES = ["Indoor", "Outdoor"];
const TIP_TYPES = ["numbered", "cross", "bullet"];

const emptySection = () => ({
  title: "",
  text: "",
  points: "",
  highlightBlock: "",
});
const emptyTip = () => ({ title: "", type: "bullet", points: "" });

const defaultForm = {
  name: "",
  type: "Outdoor",
  description: "",
  iconName: "trophy-outline",
  iconColor: "#f97316",
  iconBgColor: "#1F232C",
  image: "",
  popularity: 0,
  eventsCount: 0,
  playersCount: "0",
  coaches: 0,
  turfs: 0,
  performance: "0%",
  isActive: true,
  order: 0,
  aboutSections: [emptySection()],
  courtSections: [emptySection()],
  tipsSections: [emptyTip()],
  rules: [emptySection()],
};

const linesToArr = (s) =>
  (s || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
const arrToLines = (a) => (Array.isArray(a) ? a.join("\n") : "");

const sectionToForm = (s) => ({
  title: s.title || "",
  text: s.text || "",
  points: arrToLines(s.points),
  highlightBlock: arrToLines(s.highlightBlock),
});
const tipToForm = (s) => ({
  title: s.title || "",
  type: s.type || "bullet",
  points: arrToLines(s.points),
});

const formSectionToApi = (s) => ({
  title: s.title.trim(),
  text: s.text.trim(),
  points: linesToArr(s.points),
  highlightBlock: linesToArr(s.highlightBlock),
});
const formTipToApi = (s) => ({
  title: s.title.trim(),
  type: s.type,
  points: linesToArr(s.points),
});

// Hoisted dark form helpers
const DarkInput = (props) => (
  <input
    {...props}
    className={
      "w-full h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40 transition " +
      (props.className || "")
    }
  />
);

const DarkTextarea = (props) => (
  <textarea
    {...props}
    className={
      "w-full px-3 py-2 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40 transition " +
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

const FieldLabel = ({ children }) => (
  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5">
    {children}
  </label>
);

const SectionTitle = ({ children }) => (
  <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-500">
    {children}
  </h4>
);

// Hoisted section editor
function SectionEditor({
  label,
  sectionKey,
  withHighlight,
  form,
  addSection,
  updateSectionField,
  removeSection,
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <SectionTitle>{label}</SectionTitle>
        <button
          type="button"
          onClick={() => addSection(sectionKey, emptySection)}
          className="inline-flex items-center gap-1 text-[11px] text-orange-300 hover:text-orange-200"
        >
          <Plus className="w-3 h-3" /> Add section
        </button>
      </div>
      <div className="space-y-2">
        {form[sectionKey].map((s, idx) => (
          <div
            key={idx}
            className="border border-white/[0.06] rounded-md p-3 bg-[#0F1117]"
          >
            <div className="flex gap-2 mb-2">
              <DarkInput
                placeholder="Section title (e.g. Origin & History)"
                value={s.title}
                onChange={(e) =>
                  updateSectionField(sectionKey, idx, "title", e.target.value)
                }
              />
              <button
                type="button"
                onClick={() => removeSection(sectionKey, idx)}
                className="shrink-0 w-9 h-9 inline-flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <DarkTextarea
              rows={2}
              placeholder="Paragraph text (optional)"
              value={s.text}
              onChange={(e) =>
                updateSectionField(sectionKey, idx, "text", e.target.value)
              }
              className="mb-2"
            />
            {withHighlight && (
              <DarkTextarea
                rows={3}
                placeholder="Highlighted spec lines (one per line)"
                value={s.highlightBlock}
                onChange={(e) =>
                  updateSectionField(
                    sectionKey,
                    idx,
                    "highlightBlock",
                    e.target.value
                  )
                }
                className="mb-2 border-orange-400/20 bg-orange-500/5"
              />
            )}
            <DarkTextarea
              rows={3}
              placeholder="Bullet points (one per line)"
              value={s.points}
              onChange={(e) =>
                updateSectionField(sectionKey, idx, "points", e.target.value)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SportsLibrary() {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchSports = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ENDPOINT}?all=true`);
      setSports(res.data?.data || []);
    } catch {
      toast.error("Failed to load sports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSports();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (sport) => {
    setEditingId(sport._id);
    setForm({
      ...defaultForm,
      ...sport,
      aboutSections: sport.aboutSections?.length
        ? sport.aboutSections.map(sectionToForm)
        : [emptySection()],
      courtSections: sport.courtSections?.length
        ? sport.courtSections.map(sectionToForm)
        : [emptySection()],
      tipsSections: sport.tipsSections?.length
        ? sport.tipsSections.map(tipToForm)
        : [emptyTip()],
      rules: sport.rules?.length
        ? sport.rules.map(sectionToForm)
        : [emptySection()],
    });
    setModalOpen(true);
  };

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const updateSectionField = (key, idx, field, value) =>
    setForm((p) => ({
      ...p,
      [key]: p[key].map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  const addSection = (key, factory) =>
    setForm((p) => ({ ...p, [key]: [...p[key], factory()] }));
  const removeSection = (key, idx) =>
    setForm((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.warn("Sport name is required");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim(),
        iconName: form.iconName.trim(),
        iconColor: form.iconColor.trim(),
        iconBgColor: form.iconBgColor.trim(),
        image: form.image.trim() || null,
        popularity: Number(form.popularity) || 0,
        eventsCount: Number(form.eventsCount) || 0,
        playersCount: String(form.playersCount || "0"),
        coaches: Number(form.coaches) || 0,
        turfs: Number(form.turfs) || 0,
        performance: String(form.performance || "0%"),
        isActive: !!form.isActive,
        order: Number(form.order) || 0,
        aboutSections: form.aboutSections
          .filter((s) => s.title.trim())
          .map(formSectionToApi),
        courtSections: form.courtSections
          .filter((s) => s.title.trim())
          .map(formSectionToApi),
        tipsSections: form.tipsSections
          .filter((s) => s.title.trim())
          .map(formTipToApi),
        rules: form.rules.filter((s) => s.title.trim()).map(formSectionToApi),
      };

      if (editingId) {
        await axios.put(`${ENDPOINT}/${editingId}`, payload);
        toast.success("Sport updated");
      } else {
        await axios.post(ENDPOINT, payload);
        toast.success("Sport created");
      }
      setModalOpen(false);
      fetchSports();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (sport) => {
    try {
      await axios.patch(`${ENDPOINT}/${sport._id}/toggle`);
      fetchSports();
    } catch {
      toast.error("Failed to toggle");
    }
  };

  const handleDelete = async (sport) => {
    if (!window.confirm(`Delete "${sport.name}" from the library?`)) return;
    try {
      await axios.delete(`${ENDPOINT}/${sport._id}`);
      toast.success("Deleted");
      fetchSports();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = sports.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminShell searchPlaceholder="Search sports library…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <BookOpen className="w-3.5 h-3.5" />
            Content · Library
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Sports Library
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Encyclopedic sport content shown in the mobile library — about,
            court info, beginner tips and rules.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchSports}
            className="w-9 h-9 inline-flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-gray-300"
            title="Refresh"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={openCreate}
            className="h-9 px-3 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Add sport
          </button>
        </div>
      </header>

      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-3 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search sports…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <RotateCw className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
          <p className="text-[13px] text-gray-400 mt-2">Loading sports…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">
            No library entries
          </h3>
          <p className="text-[13px] text-gray-400 mt-1">
            Add a sport to start populating the encyclopedic content.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <div
              key={s._id}
              className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-md inline-flex items-center justify-center text-[12px] font-bold shrink-0"
                    style={{
                      background: s.iconBgColor || "#1F232C",
                      color: s.iconColor || "#f97316",
                    }}
                  >
                    {s.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-medium text-white truncate">
                      {s.name}
                    </h3>
                    <span className="text-[11px] text-gray-500">{s.type}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    s.isActive
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-gray-500/15 text-gray-400"
                  }`}
                >
                  {s.isActive ? "Active" : "Hidden"}
                </span>
              </div>

              <p className="text-[12px] text-gray-400 mt-3 line-clamp-2 min-h-[2.5em]">
                {s.description || "—"}
              </p>

              <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 mt-3">
                <span>⭐ {s.popularity}%</span>
                <span>📅 {s.eventsCount}</span>
                <span>👥 {s.playersCount}</span>
                <span>🏟 {s.turfs}</span>
              </div>

              <div className="flex gap-1.5 mt-4 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => openEdit(s)}
                  className="flex-1 h-8 inline-flex items-center justify-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => handleToggle(s)}
                  className="w-8 h-8 inline-flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-gray-300"
                  title={s.isActive ? "Hide" : "Show"}
                >
                  {s.isActive ? (
                    <XCircle className="w-3.5 h-3.5 text-orange-300" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="w-8 h-8 inline-flex items-center justify-center bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-400/30 rounded-md text-gray-300 hover:text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181A22] border border-white/[0.08] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
              <h2 className="text-[15px] font-medium text-white">
                {editingId ? "Edit sport" : "Add sport"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <FieldLabel>Name *</FieldLabel>
                  <DarkInput
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <DarkSelect
                    value={form.type}
                    onChange={(e) => setField("type", e.target.value)}
                  >
                    {TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </DarkSelect>
                </div>
              </div>

              <div className="mb-4">
                <FieldLabel>Description</FieldLabel>
                <DarkTextarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <FieldLabel>Icon name (MCI)</FieldLabel>
                  <DarkInput
                    value={form.iconName}
                    onChange={(e) => setField("iconName", e.target.value)}
                    placeholder="cricket, soccer…"
                  />
                </div>
                <div>
                  <FieldLabel>Icon color</FieldLabel>
                  <DarkInput
                    value={form.iconColor}
                    onChange={(e) => setField("iconColor", e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Icon background</FieldLabel>
                  <DarkInput
                    value={form.iconBgColor}
                    onChange={(e) => setField("iconBgColor", e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <FieldLabel>Image URL (optional)</FieldLabel>
                <DarkInput
                  value={form.image || ""}
                  onChange={(e) => setField("image", e.target.value)}
                  placeholder="https://…"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  ["popularity", "Popularity %"],
                  ["eventsCount", "Events"],
                  ["playersCount", "Players (e.g. 1250+)"],
                  ["coaches", "Coaches"],
                  ["turfs", "Turfs"],
                  ["performance", "Performance"],
                ].map(([key, lbl]) => (
                  <div key={key}>
                    <FieldLabel>{lbl}</FieldLabel>
                    <DarkInput
                      value={form[key]}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <FieldLabel>Sort order</FieldLabel>
                  <DarkInput
                    type="number"
                    value={form.order}
                    onChange={(e) => setField("order", e.target.value)}
                  />
                </div>
                <label className="flex items-end gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setField("isActive", e.target.checked)}
                    className="h-3.5 w-3.5 accent-orange-500"
                  />
                  <span className="text-[12px] text-gray-300">
                    Active (visible in app)
                  </span>
                </label>
              </div>

              <hr className="border-white/[0.06] mb-4" />

              <SectionEditor
                label="About"
                sectionKey="aboutSections"
                form={form}
                addSection={addSection}
                updateSectionField={updateSectionField}
                removeSection={removeSection}
              />
              <SectionEditor
                label="Court info"
                sectionKey="courtSections"
                withHighlight
                form={form}
                addSection={addSection}
                updateSectionField={updateSectionField}
                removeSection={removeSection}
              />

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <SectionTitle>Beginner tips</SectionTitle>
                  <button
                    type="button"
                    onClick={() => addSection("tipsSections", emptyTip)}
                    className="inline-flex items-center gap-1 text-[11px] text-orange-300 hover:text-orange-200"
                  >
                    <Plus className="w-3 h-3" /> Add tip section
                  </button>
                </div>
                <div className="space-y-2">
                  {form.tipsSections.map((s, idx) => (
                    <div
                      key={idx}
                      className="border border-white/[0.06] rounded-md p-3 bg-[#0F1117]"
                    >
                      <div className="flex gap-2 mb-2">
                        <DarkInput
                          placeholder="Tip section title (e.g. How to Start)"
                          value={s.title}
                          onChange={(e) =>
                            updateSectionField(
                              "tipsSections",
                              idx,
                              "title",
                              e.target.value
                            )
                          }
                        />
                        <DarkSelect
                          value={s.type}
                          onChange={(e) =>
                            updateSectionField(
                              "tipsSections",
                              idx,
                              "type",
                              e.target.value
                            )
                          }
                          className="!w-32"
                        >
                          {TIP_TYPES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </DarkSelect>
                        <button
                          type="button"
                          onClick={() => removeSection("tipsSections", idx)}
                          className="shrink-0 w-9 h-9 inline-flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <DarkTextarea
                        rows={4}
                        placeholder="Points (one per line)"
                        value={s.points}
                        onChange={(e) =>
                          updateSectionField(
                            "tipsSections",
                            idx,
                            "points",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <SectionEditor
                label="Rules"
                sectionKey="rules"
                form={form}
                addSection={addSection}
                updateSectionField={updateSectionField}
                removeSection={removeSection}
              />
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="h-9 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-4 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}
