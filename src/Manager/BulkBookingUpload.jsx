import { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet, Upload, Download, CheckCircle, AlertCircle, Trash2,
  ChevronLeft, Users, UserPlus, X, Trophy, Loader2, ClipboardList, ListPlus, Layers,
} from "lucide-react";
import { toast } from "react-toastify";
import { ManagerShell } from "../shared/layout";
import { parsePastedLines, isDoublesCategory, parseConsolidatedWorkbook, entryKey } from "./bulkParse";

// Staging-list identity: a registrant is unique per (entry, category). entryKey
// makes a doubles pair order-independent, so "Rahul & Amit" pasted now and
// "Amit & Rahul" imported later are recognised as the same pair.
const stagedKey = (p) => `${entryKey(p?.name)}|${(p?.category || "").toLowerCase()}`;

const BulkBookingUpload = () => {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get("tournamentId");
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [fileError, setFileError] = useState("");
  // Distinct categories in the batch just registered — drives the
  // "generate bracket" hand-off shown on the results panel.
  const [uploadedCategories, setUploadedCategories] = useState([]);

  // ── Quick-paste mode (Challonge-style) ──
  const [mode, setMode] = useState("excel"); // "excel" | "paste"
  const [pasteSport, setPasteSport] = useState("");
  const [pasteCategory, setPasteCategory] = useState("");
  const [pasteText, setPasteText] = useState("");

  const sportsList = Array.isArray(tournament?.sports) ? tournament.sports : [];
  const activeSportTrack = sportsList.find((s) => s.sportName === pasteSport) || sportsList[0] || null;
  const activeCategories = Array.isArray(activeSportTrack?.categories) ? activeSportTrack.categories : [];
  const activeCategoryObj = activeCategories.find((c) => c.name === pasteCategory) || null;
  const pasteIsDoubles = activeCategoryObj ? isDoublesCategory(activeCategoryObj, activeSportTrack) : false;

  // Default the paste dropdowns once the tournament loads.
  useEffect(() => {
    if (!tournament) return;
    const first = sportsList[0];
    if (first && !pasteSport) setPasteSport(first.sportName || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament]);

  // Keep the category valid when the sport changes.
  useEffect(() => {
    if (activeCategories.length === 0) { setPasteCategory(""); return; }
    if (!activeCategories.some((c) => c.name === pasteCategory)) {
      setPasteCategory(activeCategories[0].name || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasteSport, tournament]);

  // Live preview count without committing to the list yet.
  const pastePreview = pasteText.trim()
    ? parsePastedLines(pasteText, { doubles: pasteIsDoubles, category: pasteCategory, sport: pasteSport })
    : [];

  const addPastedToList = () => {
    if (!pasteCategory) { toast.error("Pick a category first"); return; }
    const parsed = parsePastedLines(pasteText, {
      doubles: pasteIsDoubles, category: pasteCategory, sport: pasteSport,
    });
    if (parsed.length === 0) { toast.error("No names found to add"); return; }
    // Dedupe against what's already staged (same name in the same category).
    setPlayers((prev) => {
      const seen = new Set(prev.map(stagedKey));
      const fresh = parsed.filter((p) => !seen.has(stagedKey(p)));
      if (fresh.length < parsed.length) {
        toast.info(`${parsed.length - fresh.length} already in the list — skipped`);
      }
      return [...prev, ...fresh];
    });
    toast.success(`${parsed.length} ${pasteIsDoubles ? "pairs" : "players"} added to ${pasteCategory}`);
    setPasteText("");
  };

  // ── Consolidated-file import mode ──
  const [importGroups, setImportGroups] = useState([]); // editable detected groups
  const [importSkipped, setImportSkipped] = useState([]);
  const [importError, setImportError] = useState("");
  const [importFileName, setImportFileName] = useState("");

  const handleConsolidatedUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportGroups([]);
    setImportSkipped([]);
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const sheets = wb.SheetNames.map((name) => ({
          name,
          rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", blankrows: false }),
        }));
        const { groups, skipped } = parseConsolidatedWorkbook(sheets, { sports: sportsList });
        if (groups.length === 0) {
          setImportError("No player groups detected. Check that each sheet is a sport with category columns.");
        }
        // Seed each detected group with editable sport/category + include flag.
        setImportGroups(groups.map((g) => ({
          ...g,
          sport: g.sportGuess || (sportsList[0]?.sportName || ""),
          category: g.categoryGuess || "",
          include: Boolean(g.sportGuess && g.categoryGuess),
        })));
        setImportSkipped(skipped);
      } catch (err) {
        setImportError("Failed to read the file. Please upload a valid .xlsx / .xls workbook.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const updateImportGroup = (id, patch) =>
    setImportGroups((prev) => prev.map((g) => {
      if (g.id !== id) return g;
      const next = { ...g, ...patch };
      // When the sport changes, keep the category valid for the new sport.
      if (patch.sport && patch.sport !== g.sport) {
        const track = sportsList.find((s) => s.sportName === patch.sport);
        const cats = Array.isArray(track?.categories) ? track.categories : [];
        if (!cats.some((c) => c.name === next.category)) next.category = cats[0]?.name || "";
      }
      return next;
    }));

  const includedImportCount = importGroups
    .filter((g) => g.include && g.sport && g.category)
    .reduce((n, g) => n + g.entries.length, 0);

  const addImportedToList = () => {
    const usable = importGroups.filter((g) => g.include && g.sport && g.category);
    if (usable.length === 0) { toast.error("Select at least one group with a sport and category"); return; }
    const flattened = usable.flatMap((g) =>
      g.entries.map((name) => ({ name, category: g.category, sport: g.sport, seed: null }))
    );
    setPlayers((prev) => {
      const seen = new Set(prev.map(stagedKey));
      const fresh = [];
      for (const p of flattened) {
        const key = stagedKey(p);
        if (seen.has(key)) continue;
        seen.add(key);
        fresh.push(p);
      }
      if (fresh.length < flattened.length) {
        toast.info(`${flattened.length - fresh.length} duplicate(s) skipped`);
      }
      return [...prev, ...fresh];
    });
    toast.success(`${flattened.length} entries added from ${usable.length} group(s)`);
    setImportGroups([]);
    setImportSkipped([]);
    setImportFileName("");
  };

  const categoriesForSport = (sportName) => {
    const track = sportsList.find((s) => s.sportName === sportName);
    return Array.isArray(track?.categories) ? track.categories : [];
  };

  useEffect(() => {
    if (tournamentId) fetchTournament();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/tournaments/${tournamentId}`);
      setTournament(res.data.tournament || res.data);
    } catch (err) {
      toast.error("Failed to load tournament details");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Seed and Sport carry the two things the bracket needs but the old
    // template couldn't express. Seed removes the manual click-players-in-
    // rank-order step entirely; Sport routes each row to the right sport in a
    // multi-sport tournament. Both are optional — leave them blank and the
    // behaviour is exactly as before.
    const firstSport = tournament?.sports?.[0]?.sportName || "";
    const firstCategory = tournament?.sports?.[0]?.categories?.[0]?.name || "";
    const templateData = [
      { Name: "John Doe", Seed: 1, Category: firstCategory, Sport: firstSport, Email: "john@company.com", Phone: "9876543210", EmployeeId: "EMP001" },
      { Name: "Jane Smith", Seed: 2, Category: firstCategory, Sport: firstSport, Email: "", Phone: "", EmployeeId: "EMP002" },
      { Name: "Amit Patel", Seed: "", Category: firstCategory, Sport: firstSport, Email: "", Phone: "", EmployeeId: "EMP003" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 25 }, { wch: 8 }, { wch: 20 }, { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Players");
    XLSX.writeFile(wb, "Bulk_Booking_Template.xlsx");
    toast.success("Template downloaded!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          setFileError("Excel file is empty or has no data rows.");
          return;
        }

        const mapped = data.map((row) => {
          const get = (keys) => {
            for (const k of keys) {
              const val = row[k] || row[k.toLowerCase()] || row[k.toUpperCase()];
              if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
            }
            return "";
          };
          const seedRaw = get(["Seed", "seed", "Rank", "rank", "Seeding", "SeedNo", "Seed No"]);
          const seedNum = Number(seedRaw);
          return {
            name:       get(["Name", "name", "Player Name", "PlayerName", "FullName"]),
            email:      get(["Email", "email", "E-mail", "EmailId"]),
            phone:      get(["Phone", "phone", "Mobile", "mobile", "Phone Number", "PhoneNumber", "Contact"]),
            employeeId: get(["EmployeeId", "employeeId", "Employee ID", "EmpId", "ID", "Emp_Id"]),
            category:   get(["Category", "category", "Cat"]),
            sport:      get(["Sport", "sport", "SportName", "Sport Name", "Game"]),
            seed:       Number.isFinite(seedNum) && seedNum > 0 ? Math.floor(seedNum) : null,
          };
        }).filter((p) => p.name);

        if (mapped.length === 0) {
          setFileError("No valid player rows found. Make sure the 'Name' column exists and has data.");
          return;
        }

        // Sort by seed so the upload order IS the seeding order. Bracket
        // generation uses input order as seed rank, so getting this right here
        // is what lets the manager skip ranking players by hand later.
        // Unseeded rows keep their sheet order and sit after every seeded one.
        const sorted = [...mapped].sort((a, b) => {
          if (a.seed && b.seed) return a.seed - b.seed;
          if (a.seed) return -1;
          if (b.seed) return 1;
          return 0;
        });

        // Duplicate seed numbers make the draw ambiguous — warn, don't block.
        const seedCounts = sorted.reduce((acc, p) => {
          if (p.seed) acc[p.seed] = (acc[p.seed] || 0) + 1;
          return acc;
        }, {});
        const dupeSeeds = Object.keys(seedCounts).filter((s) => seedCounts[s] > 1);
        if (dupeSeeds.length > 0) {
          toast.warn(`Duplicate seed number(s): ${dupeSeeds.join(", ")}. Draw order may be unpredictable.`);
        }

        setPlayers(sorted);
        const seededCount = sorted.filter((p) => p.seed).length;
        toast.success(
          `${sorted.length} players loaded${seededCount > 0 ? ` · ${seededCount} seeded` : ""}`
        );
      } catch (err) {
        setFileError("Failed to parse Excel file. Please check the format.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const removePlayer = (index) => setPlayers((prev) => prev.filter((_, i) => i !== index));

  // Jump to the knockout setup with everything pre-filled. `autoselect=1` tells
  // that page to pick the whole (filtered) registrant list in seed order and
  // open the confirm modal, so the manager lands on a review step rather than
  // an empty form.
  const goToBracket = (category) => {
    const params = new URLSearchParams({ tournamentId });
    if (category) params.set("category", category);
    params.set("autoselect", "1");
    navigate(`/tournament-management/direct-knockout?${params.toString()}`);
  };

  const handleSubmit = async () => {
    if (players.length === 0) { toast.error("No players to upload"); return; }
    setUploading(true);
    setResult(null);
    try {
      const res = await axios.post("/api/tournaments/bookings/bulk-create", { tournamentId, players });
      setResult(res.data);
      if (res.data.created?.length > 0) toast.success(`${res.data.created.length} bookings created successfully!`);
      if (res.data.skipped?.length > 0) toast.warn(`${res.data.skipped.length} players skipped (duplicates or missing data)`);

      // Remember what was just registered so the results panel can offer a
      // direct hand-off into bracket generation — one bracket per category.
      const registeredNames = new Set((res.data.created || []).map((c) => c.userName));
      const landed = players.filter((p) => registeredNames.has(p.name));
      const cats = [...new Set(landed.map((p) => (p.category || "").trim()).filter(Boolean))];
      setUploadedCategories(cats);

      setPlayers([]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create bookings");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <ManagerShell searchPlaceholder="Bulk register players…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </ManagerShell>
    );
  }

  return (
    <ManagerShell searchPlaceholder="Bulk register players…">
      {/* Header */}
      <header className="flex items-start gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.04] transition w-auto flex-shrink-0"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Users className="w-3.5 h-3.5" />
            Tournament · Bulk register
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Bulk player registration
          </h1>
          <p className="mt-1 text-[13px] text-gray-400 inline-flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-orange-400" />
            {tournament?.title || "Tournament"}
          </p>
        </div>
      </header>

      {/* Mode toggle: Excel upload vs Challonge-style quick paste */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06] w-fit">
        {[
          { id: "excel", label: "Upload Excel", icon: FileSpreadsheet },
          { id: "paste", label: "Quick paste", icon: ClipboardList },
          { id: "import", label: "Import file", icon: Layers },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold transition w-auto ${
              mode === m.id ? "bg-white/[0.10] text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <m.icon className="w-3.5 h-3.5" /> {m.label}
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div className="px-4 py-3 rounded-md flex items-start gap-3 mb-5"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}>
        <span className="w-7 h-7 rounded-md bg-amber-500/15 grid place-items-center flex-shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        </span>
        <div>
          <p className="text-[13px] font-medium text-amber-200">Manager bulk upload</p>
          <p className="text-[12px] text-amber-200/80 mt-0.5">
            Upload an Excel sheet with player details to register them directly. No player accounts required.
            Email will be auto-generated for players who don't have one.
          </p>
        </div>
      </div>

      {/* Upload section */}
      {mode === "excel" && (
      <Section
        icon={FileSpreadsheet}
        title="Upload Excel"
        rightSlot={
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold text-gray-200 hover:text-white hover:bg-white/[0.06] transition w-auto"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Download className="w-3.5 h-3.5" /> Download template
          </button>
        }
      >
        <div className="rounded-md p-8 text-center transition relative cursor-pointer group hover:bg-white/[0.04]"
          style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          <Upload className="w-9 h-9 text-gray-500 group-hover:text-orange-400 mx-auto mb-2.5 transition" />
          <p className="text-[13px] font-medium text-gray-200">Drop your Excel file here or click to browse</p>
          <p className="text-[12px] text-gray-500 mt-1">Supports .xlsx and .xls formats</p>
        </div>

        {fileError && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-red-300">
            <AlertCircle className="w-3.5 h-3.5" />
            {fileError}
          </div>
        )}
      </Section>
      )}

      {/* Quick paste (Challonge-style): pick sport + category, paste names */}
      {mode === "paste" && (
        <Section icon={ClipboardList} title="Quick paste players">
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5" htmlFor="sport">Sport</label>
              <select id="sport"
                value={pasteSport}
                onChange={(e) => setPasteSport(e.target.value)}
                className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {sportsList.length === 0 && <option value="">No sports</option>}
                {sportsList.map((s, i) => (
                  <option key={i} value={s.sportName} className="bg-[#181A22]">{s.sportName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5" htmlFor="category">Category</label>
              <select id="category"
                value={pasteCategory}
                onChange={(e) => setPasteCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {activeCategories.length === 0 && <option value="">No categories</option>}
                {activeCategories.map((c, i) => (
                  <option key={i} value={c.name} className="bg-[#181A22]">{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
              {pasteIsDoubles ? "Paste pairs — one per line" : "Paste names — one per line"}
            </label>
            {pasteIsDoubles && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-300 bg-orange-500/15 px-1.5 py-0.5 rounded">
                <Users className="w-2.5 h-2.5" /> Doubles
              </span>
            )}
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={pasteIsDoubles
              ? "Shekhar Purandare & Aditya Solanke\nSharang Mittal & Rohit Giri\n…"
              : "Shekhar Purandare\nSaurabh Patel\nGavara Rambabu\n…"}
            className="w-full px-3 py-2.5 rounded-md text-[13px] text-gray-200 placeholder:text-gray-600 focus:outline-none font-mono leading-relaxed resize-y"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          />

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[12px] text-gray-500">
              {pastePreview.length > 0
                ? <><span className="font-mono tabular-nums text-gray-300">{pastePreview.length}</span> {pasteIsDoubles ? "pair(s)" : "player(s)"} detected</>
                : "Paste a list to get started"}
            </p>
            <button
              onClick={addPastedToList}
              disabled={pastePreview.length === 0}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed w-auto"
            >
              <ListPlus className="w-3.5 h-3.5" /> Add {pastePreview.length || ""} to list
            </button>
          </div>
        </Section>
      )}

      {/* Import a consolidated multi-sheet file: auto-detect sport/category, confirm, register */}
      {mode === "import" && (
        <Section icon={Layers} title="Import consolidated file">
          <div className="px-4 py-3 rounded-md flex items-start gap-3 mb-4"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.20)" }}>
            <span className="w-7 h-7 rounded-md bg-blue-500/15 grid place-items-center flex-shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-blue-300" />
            </span>
            <p className="text-[12px] text-blue-200/90">
              Upload any layout — one sheet per sport, categories as columns, doubles as
              "A &amp; B" or two columns. We auto-detect each group; review the sport/category
              mapping below, then add everything to the list.
            </p>
          </div>

          <div className="rounded-md p-8 text-center transition relative cursor-pointer group hover:bg-white/[0.04]"
            style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleConsolidatedUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <Layers className="w-9 h-9 text-gray-500 group-hover:text-orange-400 mx-auto mb-2.5 transition" />
            <p className="text-[13px] font-medium text-gray-200">
              {importFileName || "Drop your consolidated file here or click to browse"}
            </p>
            <p className="text-[12px] text-gray-500 mt-1">Multi-sheet .xlsx / .xls — sport per sheet, category per column</p>
          </div>

          {importError && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-red-300">
              <AlertCircle className="w-3.5 h-3.5" /> {importError}
            </div>
          )}

          {importSkipped.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {importSkipped.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-md"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="font-medium text-gray-200">{s.sheet}</span>
                  <span className="text-gray-500">—</span>
                  <span className="text-amber-300">{s.reason}</span>
                </div>
              ))}
            </div>
          )}

          {importGroups.length > 0 && (
            <div className="mt-4">
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <Th />
                      <Th>Detected (sheet · header)</Th>
                      <Th>Sport</Th>
                      <Th>Category</Th>
                      <Th>Count</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {importGroups.map((g) => {
                      const cats = categoriesForSport(g.sport);
                      const unmapped = !g.category;
                      return (
                        <tr key={g.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition">
                          <Td>
                            <input
                              type="checkbox"
                              checked={g.include}
                              onChange={(e) => updateImportGroup(g.id, { include: e.target.checked })}
                              className="w-4 h-4 accent-orange-500 cursor-pointer"
                            />
                          </Td>
                          <Td>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate flex items-center gap-1.5">
                                {g.header}
                                {g.isDoubles && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-orange-300 bg-orange-500/15 px-1 py-0.5 rounded">
                                    <Users className="w-2.5 h-2.5" /> DBL
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">{g.sheet}</p>
                            </div>
                          </Td>
                          <Td>
                            <select
                              value={g.sport}
                              onChange={(e) => updateImportGroup(g.id, { sport: e.target.value })}
                              className="h-8 px-2 rounded-md text-[12px] text-gray-200 focus:outline-none cursor-pointer max-w-[150px]"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                              <option value="" className="bg-[#181A22]">—</option>
                              {sportsList.map((s, i) => (
                                <option key={i} value={s.sportName} className="bg-[#181A22]">{s.sportName}</option>
                              ))}
                            </select>
                          </Td>
                          <Td>
                            <select
                              value={g.category}
                              onChange={(e) => updateImportGroup(g.id, { category: e.target.value })}
                              className={`h-8 px-2 rounded-md text-[12px] focus:outline-none cursor-pointer max-w-[160px] ${unmapped ? "text-amber-300" : "text-gray-200"}`}
                              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${unmapped ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.06)"}` }}
                            >
                              <option value="" className="bg-[#181A22]">Select…</option>
                              {cats.map((c, i) => (
                                <option key={i} value={c.name} className="bg-[#181A22]">{c.name}</option>
                              ))}
                            </select>
                          </Td>
                          <Td><span className="font-mono tabular-nums text-gray-300">{g.entries.length}</span></Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[12px] text-gray-500">
                  <span className="font-mono tabular-nums text-gray-300">{includedImportCount}</span> entries from{" "}
                  <span className="font-mono tabular-nums text-gray-300">{importGroups.filter((g) => g.include && g.sport && g.category).length}</span> selected group(s)
                </p>
                <button
                  onClick={addImportedToList}
                  disabled={includedImportCount === 0}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed w-auto"
                >
                  <ListPlus className="w-3.5 h-3.5" /> Add {includedImportCount || ""} to list
                </button>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Preview table */}
      {players.length > 0 && (
        <div className="mt-4">
          <Section
            icon={Users}
            title={`Preview (${players.length} players)`}
            rightSlot={
              <button
                onClick={() => setPlayers([])}
                className="text-[12px] font-semibold text-red-400 hover:text-red-300 transition inline-flex items-center gap-1 w-auto"
              >
                <X className="w-3.5 h-3.5" /> Clear all
              </button>
            }
          >
            <div className="overflow-x-auto -mx-5 -mb-4">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <Th>#</Th>
                    <Th>Seed</Th>
                    <Th>Name</Th>
                    <Th>Category</Th>
                    <Th>Sport</Th>
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>Emp ID</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition">
                      <Td><span className="text-gray-500 font-mono tabular-nums">{i + 1}</span></Td>
                      <Td>
                        {p.seed ? (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md bg-orange-500/15 text-orange-300 text-[11px] font-bold tabular-nums">
                            {p.seed}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[12px]">—</span>
                        )}
                      </Td>
                      <Td><span className="font-medium text-white">{p.name}</span></Td>
                      <Td><span className="text-gray-300">{p.category || <span className="text-gray-500">Default</span>}</span></Td>
                      <Td><span className="text-gray-300">{p.sport || <span className="text-gray-500">Default</span>}</span></Td>
                      <Td><span className="text-gray-300">{p.email || <span className="text-gray-500 italic">Auto-generate</span>}</span></Td>
                      <Td><span className="text-gray-300 font-mono tabular-nums">{p.phone || <span className="text-gray-500">—</span>}</span></Td>
                      <Td><span className="text-gray-300 font-mono">{p.employeeId || <span className="text-gray-500">—</span>}</span></Td>
                      <Td>
                        <button
                          onClick={() => removePlayer(i)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating bookings…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Register {players.length} players
                  </>
                )}
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-4">
          <Section icon={CheckCircle} title="Upload results">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-md p-4 text-center"
                style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <p className="text-[22px] font-semibold text-emerald-300 tabular-nums leading-none">{result.created?.length || 0}</p>
                <p className="text-[12px] text-emerald-300/80 font-medium mt-1.5">Created</p>
              </div>
              <div className="rounded-md p-4 text-center"
                style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <p className="text-[22px] font-semibold text-amber-300 tabular-nums leading-none">{result.skipped?.length || 0}</p>
                <p className="text-[12px] text-amber-300/80 font-medium mt-1.5">Skipped</p>
              </div>
            </div>

            {result.skipped?.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Skipped players</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {result.skipped.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-md"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="font-medium text-gray-200">{s.name || "Unknown"}</span>
                      <span className="text-gray-500">—</span>
                      <span className="text-amber-300">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hand-off straight into bracket generation. Without this the
                manager had to navigate back to the tournament list and re-enter
                the whole knockout setup by hand. */}
            {result.created?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-[13px] font-medium text-white mb-1">Next: build the bracket</p>
                <p className="text-[12px] text-gray-400 mb-3">
                  Players are pre-selected in seed order — review the draw and confirm.
                </p>
                {uploadedCategories.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {uploadedCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => goToBracket(cat)}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        Generate {cat} bracket
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => goToBracket(uploadedCategories[0] || null)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    Generate bracket
                  </button>
                )}
              </div>
            )}
          </Section>
        </div>
      )}
    </ManagerShell>
  );
};

function Section({ icon: Icon, title, rightSlot, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
            <Icon className="w-3.5 h-3.5 text-orange-400" />
          </span>
          <h3 className="text-[13px] font-medium text-white truncate">{title}</h3>
        </div>
        {rightSlot}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="py-3 px-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">{children}</th>;
}
function Td({ children }) {
  return <td className="py-3 px-3">{children}</td>;
}

export default BulkBookingUpload;
