import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import {
  Plus,
  Pencil,
  X,
  CheckCircle2,
  XCircle,
  RotateCw,
  Search,
  Filter,
  Settings2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/sports`;

const CATEGORIES = ["Racquet", "Team", "Board", "Individual", "Custom"];
// Values MUST match the Sport model enum (Modal/Sport.js scoringType):
// ["sets","innings","time","single","board","custom"]. The old long-form
// values ("sets-games-points"…) failed Mongoose validation on every write.
const SCORING_TYPES = [
  { value: "sets", label: "Sets / games / points" },
  { value: "innings", label: "Innings / overs (cricket)" },
  { value: "time", label: "Timed (halves / quarters)" },
  { value: "board", label: "Board-by-board (carrom)" },
  { value: "single", label: "Single score / result" },
  { value: "custom", label: "Custom" },
];

const categoryColors = {
  Racquet: "bg-blue-500/15 text-blue-300 border-blue-400/20",
  Team: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  Board: "bg-purple-500/15 text-purple-300 border-purple-400/20",
  Individual: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  Custom: "bg-gray-500/15 text-gray-300 border-gray-400/20",
};

const defaultFormData = {
  name: "",
  category: "Racquet",
  scoringType: "sets",
  matchFormat: {
    totalSets: 3,
    pointsPerSet: 21,
    gamesPerSet: null,
    deuceEnabled: true,
    tiebreakEnabled: false,
    maxPointsCap: null,
    serviceRules: "rally",
    oversCount: null,
    inningsCount: null,
    halvesCount: null,
    halvesDuration: null,
    quartersCount: null,
    quartersDuration: null,
    // Board sports (carrom)
    boardsToWin: null,
    pointsPerBoard: null,
    queenValue: null,
  },
  displayConfig: {
    icon: "Trophy",
    color: "#f97316",
    scoreLabel: "Points",
    setLabel: "Set",
    pointLabel: "Point",
  },
};

// Hoisted helpers (module-scope so they don't remount each keystroke)
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

const FieldLabel = ({ children }) => (
  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5">
    {children}
  </label>
);

const SectionTitle = ({ children }) => (
  <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-3">
    {children}
  </h4>
);

const StatTile = ({ label, value, accent }) => (
  <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-4 py-3">
    <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500">
      {label}
    </p>
    <p className={`mt-1 text-[22px] font-medium ${accent || "text-white"}`}>
      {value}
    </p>
  </div>
);

function FormatSummary({ sport }) {
  const f = sport.matchFormat;
  const st = sport.scoringType;
  let summary = "";
  if (st === "sets") {
    if (f?.totalSets && f?.pointsPerSet)
      summary = `Best of ${f.totalSets}, ${f.pointsPerSet} pts`;
    else if (f?.totalSets && f?.gamesPerSet)
      summary = `Best of ${f.totalSets}, ${f.gamesPerSet} games`;
    else if (f?.totalSets) summary = `Best of ${f.totalSets}`;
    else summary = "—";
  } else if (st === "innings") {
    summary = f?.oversCount
      ? `${f.oversCount} overs, ${f.inningsCount || 2} innings`
      : "—";
  } else if (st === "time") {
    if (f?.halvesCount)
      summary = `${f.halvesCount} halves, ${f.halvesDuration}min`;
    else if (f?.quartersCount)
      summary = `${f.quartersCount} quarters, ${f.quartersDuration}min`;
    else summary = "—";
  } else if (st === "board") {
    summary = f?.boardsToWin
      ? `First to ${f.boardsToWin} boards${f.pointsPerBoard ? `, ${f.pointsPerBoard} pts` : ""}`
      : "—";
  } else if (st === "single") {
    summary = "Single result";
  } else {
    summary = "Custom";
  }
  return <span className="text-[12px] text-gray-400">{summary}</span>;
}

export default function SportsManagement() {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingSport, setEditingSport] = useState(null);
  const [configSport, setConfigSport] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchSports();
  }, []);

  const fetchSports = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API_URL);
      setSports(Array.isArray(data) ? data : data?.data || []);
    } catch {
      toast.error("Failed to load sports");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!window.confirm("Seed the default sport presets?")) return;
    setSeeding(true);
    try {
      const { data } = await axios.post(`${API_URL}/seed`);
      const r = data.data || {};
      toast.success(
        data.message ||
          `Seeded sports — ${r.created ?? 0} created, ${r.updated ?? 0} updated`
      );
      await fetchSports();
    } catch (err) {
      toast.error(err.response?.data?.error || "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleActive = async (sport) => {
    try {
      await axios.put(`${API_URL}/${sport._id}`, {
        ...sport,
        isActive: !sport.isActive,
      });
      toast.success(sport.isActive ? "Deactivated" : "Activated");
      fetchSports();
    } catch {
      toast.error("Failed to update");
    }
  };

  const openCreateModal = () => {
    setEditingSport(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const openEditModal = (sport) => {
    setEditingSport(sport);
    setFormData({
      name: sport.name,
      category: sport.category,
      scoringType: sport.scoringType,
      matchFormat: { ...defaultFormData.matchFormat, ...sport.matchFormat },
      displayConfig: { ...defaultFormData.displayConfig, ...sport.displayConfig },
    });
    setShowModal(true);
  };

  const openConfigModal = (sport) => {
    setConfigSport(sport);
    setFormData({
      ...sport,
      matchFormat: { ...defaultFormData.matchFormat, ...sport.matchFormat },
      displayConfig: { ...defaultFormData.displayConfig, ...sport.displayConfig },
    });
    setShowConfigModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSport) {
        await axios.put(`${API_URL}/${editingSport._id}`, formData);
        toast.success("Sport updated");
      } else {
        await axios.post(API_URL, formData);
        toast.success("Sport created");
      }
      setShowModal(false);
      fetchSports();
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/${configSport._id}/config`, {
        matchFormat: formData.matchFormat,
        displayConfig: formData.displayConfig,
      });
      toast.success("Config saved");
      setShowConfigModal(false);
      fetchSports();
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleFormatChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({
      ...p,
      matchFormat: {
        ...p.matchFormat,
        [name]: type === "checkbox" ? checked : value === "" ? null : value,
      },
    }));
  };

  const handleDisplayChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({
      ...p,
      displayConfig: { ...p.displayConfig, [name]: value },
    }));
  };

  const getFormatFields = () => {
    switch (formData.scoringType) {
      case "sets":
        return [
          "totalSets",
          "pointsPerSet",
          "gamesPerSet",
          "deuceEnabled",
          "tiebreakEnabled",
          "maxPointsCap",
          "serviceRules",
        ];
      case "innings":
        return ["oversCount", "inningsCount"];
      case "time":
        return [
          "halvesCount",
          "halvesDuration",
          "quartersCount",
          "quartersDuration",
        ];
      case "board":
        return ["boardsToWin", "pointsPerBoard", "queenValue"];
      default:
        return [];
    }
  };

  const stats = {
    total: sports.length,
    active: sports.filter((s) => s.isActive).length,
    inactive: sports.filter((s) => !s.isActive).length,
    presets: sports.filter((s) => s.isPreset).length,
  };

  const filteredSports = sports.filter((s) => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      filterCategory === "All" || s.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <SuperAdminShell searchPlaceholder="Search sports…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Trophy className="w-3.5 h-3.5" />
            Content · Sports engine
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Sports Management
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Configure scoring engines, match formats and display rules for each
            sport.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="h-9 px-3 inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200 disabled:opacity-50"
          >
            {seeding ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Seed presets
          </button>
          <button
            onClick={openCreateModal}
            className="h-9 px-3 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            New sport
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Total sports" value={stats.total} />
        <StatTile label="Active" value={stats.active} accent="text-emerald-300" />
        <StatTile label="Inactive" value={stats.inactive} accent="text-gray-400" />
        <StatTile label="Presets" value={stats.presets} accent="text-orange-300" />
      </div>

      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-3 mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search sports…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40"
          />
        </div>
        <div className="relative sm:w-56">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 appearance-none"
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <RotateCw className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
          <p className="text-[13px] text-gray-400 mt-2">Loading sports…</p>
        </div>
      ) : filteredSports.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <Trophy className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">No sports found</h3>
          <p className="text-[13px] text-gray-400 mt-1">
            Try a different filter, or seed the presets to start.
          </p>
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Sport
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Scoring
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Format
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSports.map((sport) => (
                  <tr
                    key={sport._id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-md inline-flex items-center justify-center text-[12px] font-bold"
                          style={{
                            backgroundColor: `${
                              sport.displayConfig?.color || "#f97316"
                            }22`,
                            color: sport.displayConfig?.color || "#f97316",
                          }}
                        >
                          {sport.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-white truncate">
                            {sport.name}
                          </p>
                          {sport.isPreset && (
                            <p className="text-[10px] uppercase tracking-wider text-orange-300/80 font-bold">
                              Preset
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          categoryColors[sport.category] ||
                          categoryColors.Custom
                        }`}
                      >
                        {sport.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-400 font-mono">
                      {sport.scoringType}
                    </td>
                    <td className="px-4 py-3">
                      <FormatSummary sport={sport} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(sport)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${
                          sport.isActive
                            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                            : "bg-gray-500/15 text-gray-400 hover:bg-gray-500/25"
                        }`}
                      >
                        {sport.isActive ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(sport)}
                          className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-md transition"
                          title="Edit Sport"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openConfigModal(sport)}
                          className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-md transition"
                          title="Edit Config"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#181A22] border border-white/[0.08] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-white">
                {editingSport ? "Edit Sport" : "Create Sport"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-md transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <FieldLabel>Sport name</FieldLabel>
                <DarkInput
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Badminton"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <DarkSelect
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </DarkSelect>
                </div>
                <div>
                  <FieldLabel>Scoring type</FieldLabel>
                  <DarkSelect
                    name="scoringType"
                    value={formData.scoringType}
                    onChange={handleInputChange}
                  >
                    {SCORING_TYPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </DarkSelect>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white"
                >
                  {editingSport ? "Update sport" : "Create sport"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfigModal && configSport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#181A22] border border-white/[0.08] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="text-[15px] font-medium text-white">
                  {configSport.name}{" "}
                  <span className="text-gray-500">— Config</span>
                </h3>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  Match format and display settings
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-md transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleConfigSubmit}
              className="p-6 space-y-6 overflow-y-auto"
            >
              <div>
                <SectionTitle>Match format</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {getFormatFields().map((field) =>
                    field === "deuceEnabled" || field === "tiebreakEnabled" ? (
                      <label
                        key={field}
                        className="flex items-center gap-2 h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md cursor-pointer hover:border-orange-400/40 transition"
                      >
                        <input
                          type="checkbox"
                          name={field}
                          checked={formData.matchFormat[field] || false}
                          onChange={handleFormatChange}
                          className="h-3.5 w-3.5 accent-orange-500"
                        />
                        <span className="text-[12px] text-gray-200 capitalize">
                          {field.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </label>
                    ) : field === "serviceRules" ? (
                      <div key={field}>
                        <FieldLabel>Service rules</FieldLabel>
                        <DarkSelect
                          name={field}
                          value={formData.matchFormat[field] || ""}
                          onChange={handleFormatChange}
                        >
                          <option value="">None</option>
                          <option value="rally">Rally</option>
                          <option value="alternate-2">Alternate (2)</option>
                          <option value="alternate-game">Alternate Game</option>
                          <option value="side-out">Side Out</option>
                          <option value="rotate">Rotate</option>
                        </DarkSelect>
                      </div>
                    ) : (
                      <div key={field}>
                        <FieldLabel>
                          {field.replace(/([A-Z])/g, " $1").trim()}
                        </FieldLabel>
                        <DarkInput
                          type="number"
                          name={field}
                          value={formData.matchFormat[field] ?? ""}
                          onChange={handleFormatChange}
                          placeholder="—"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>

              <div>
                <SectionTitle>Display config</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Icon name</FieldLabel>
                    <DarkInput
                      type="text"
                      name="icon"
                      value={formData.displayConfig.icon}
                      onChange={handleDisplayChange}
                    />
                  </div>
                  <div>
                    <FieldLabel>Color</FieldLabel>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        name="color"
                        value={formData.displayConfig.color}
                        onChange={handleDisplayChange}
                        className="w-9 h-9 rounded-md border border-white/[0.08] bg-[#0F1117] cursor-pointer"
                      />
                      <DarkInput
                        type="text"
                        name="color"
                        value={formData.displayConfig.color}
                        onChange={handleDisplayChange}
                      />
                    </div>
                  </div>
                  {["scoreLabel", "setLabel", "pointLabel"].map((field) => (
                    <div key={field}>
                      <FieldLabel>
                        {field.replace(/([A-Z])/g, " $1").trim()}
                      </FieldLabel>
                      <DarkInput
                        type="text"
                        name={field}
                        value={formData.displayConfig[field]}
                        onChange={handleDisplayChange}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="h-9 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white"
                >
                  Save configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}
