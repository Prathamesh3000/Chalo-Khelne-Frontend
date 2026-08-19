import React, { useState, useContext, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  X,
  Calendar,
  MapPin,
  Trophy,
  Users,
  Image as ImageIcon,
  Clock,
  Type,
  Check,
  Lock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Target,
  Zap,
  Award,
  Info,
} from "lucide-react";
import dayjs from "dayjs";
import { Switch } from "@mui/material";
import { AuthContext } from "../context/AuthContext";
import { getAuthToken } from "../shared/api/authToken";
import {
  generateFormFields,
  validateRuleBookForm,
} from "../utils/ruleBookFormEngine";
// Sub-step 4 — wizard design primitives (Sub-step 1)
// Sub-step 6 — SportCard + DashedAddButton for the new Step 2
// Sub-step 7 — Select for the Cancellation Policy dropdown in Step 3
// Sub-step 9 — Collapsible for ref-measured smooth transitions
import {
  Card as WCard,
  FieldLabel,
  TextInput,
  Select,
  SectionHeader,
  ExpandableSection,
  ToggleCard,
  SportCard,
  DashedAddButton,
  Collapsible,
} from "./wizard";
// Sub-step 5 — sport classification + unranked defaults
import {
  scoringTypeFor,
  isNestedSetSport,
  isTeamOnlySport,
  slugifyForSport,
  UNRANKED_DEFAULTS,
  getUnrankedDefaults,
} from "./wizard/sportClassification";

// Sub-step 5 — sport classification + UNRANKED_DEFAULTS lifted to a shared
// util so SportCard and this file use one source of truth.
// (Imported from "./wizard/sportClassification" above the file's other
// wizard imports — kept inline here only as a comment marker.)

const CK_SIG = "#F97316";
const CK_SIG_TINT = "rgba(249,115,22,0.25)";

// ─── Step definitions — 3 fixed steps, no dynamic insertion ───
// "sportConfig" is removed; locked rule book + custom match format now live
// inside each sport card (Section D) per Sub-step 5.
const STATIC_STEPS = [
  { id: "basic",   label: "Tournament Info",   icon: <Trophy className="w-4 h-4" /> },
  { id: "format",  label: "Sports & Format",   icon: <Type className="w-4 h-4" /> },
  { id: "details", label: "Schedule & Policy", icon: <Calendar className="w-4 h-4" /> },
];

// Tournament level enum — Sub-step 3 hardcodes the schema's 5 values.
// Replaces the per-sport `availableLevels` API roundtrip.
const FIXED_LEVELS = ["district", "state", "national", "international", "unranked"];

// matchFormat schema fields that should NOT be flattened into _ruleBookValues
// (they're metadata, not user-editable rule fields).
const MATCHFORMAT_META_KEYS = new Set(["scoringType", "formatVersion"]);

// matchFormat schema fields derived from other fields (setsToWin = ceil(totalSets/2),
// gamesToWin = ceil(totalGames/2)). Skipped on schema→engine conversion and
// re-derived on engine→schema conversion. Sub-step 10 round-trip fix.
const MATCHFORMAT_DERIVED_KEYS = new Set(["setsToWin", "gamesToWin"]);

// Engine field name (after stripping "format." prefix) → schema field name.
// Both pointsPerGame and pointsPerSet collapse to pointsToWinGame; engine
// emits at most one of them per sport (nested-set vs flat-set), so collision
// is rare. If both ever co-exist, pointsPerGame wins.
const ENGINE_TO_SCHEMA_RENAMES = {
  winByMargin:   "marginToWin",
  deuceEnabled:  "deuceRule",
  gamesPerSet:   "totalGames",
  pointsPerGame: "pointsToWinGame",
  pointsPerSet:  "pointsToWinGame",
};

// Schema field → engine field name (for the inverse, schema→engine direction).
// pointsToWinGame is ambiguous and resolved via sportName context — see
// matchFormatToRuleBookValues below.
const SCHEMA_TO_ENGINE_RENAMES = {
  marginToWin: "winByMargin",
  deuceRule:   "deuceEnabled",
  totalGames:  "gamesPerSet",
};

// Engine path prefixes that don't belong in matchFormat (they live elsewhere
// on sportRules, or nowhere on the persisted document).
const NON_MATCHFORMAT_PREFIXES = ["scoring.", "participantConfig.", "tieBreaker.", "tournamentRules."];

/**
 * Convert a saved matchFormat object (flat schema shape, e.g.
 * { totalSets: 3, pointsToWinGame: 21, marginToWin: 2 }) into the dotted-path
 * values shape used by ruleBookFormEngine (e.g. { "format.totalSets": 3,
 * "format.pointsPerSet": 21, "format.winByMargin": 2 }).
 *
 * Sub-step 10 round-trip fix: previously this just prepended "format." to every
 * key, which left renamed schema fields (marginToWin, deuceRule, totalGames,
 * pointsToWinGame) as unrecognized engine paths — the engine form would not
 * surface them, so user edits silently disappeared on save. Now applies the
 * inverse rename map so saved overrides round-trip correctly through Section D.
 *
 * @param {object} mf - matchFormat in flat schema shape
 * @param {string} sportName - used to disambiguate pointsToWinGame
 *   (nested-set sports → format.pointsPerGame, flat-set → format.pointsPerSet)
 */
function matchFormatToRuleBookValues(mf, sportName) {
  if (!mf || typeof mf !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(mf)) {
    if (v == null) continue;
    if (MATCHFORMAT_META_KEYS.has(k)) continue;
    if (MATCHFORMAT_DERIVED_KEYS.has(k)) continue;

    if (k === "pointsToWinGame") {
      const enginePath = isNestedSetSport(sportName) ? "format.pointsPerGame" : "format.pointsPerSet";
      out[enginePath] = v;
      continue;
    }

    const renamed = SCHEMA_TO_ENGINE_RENAMES[k] || k;
    out[`format.${renamed}`] = v;
  }
  return out;
}

/**
 * Convert ruleBookFormEngine values (flat dotted-path shape, e.g.
 * { "format.totalSets": 3, "format.pointsPerSet": 21, "format.winByMargin": 2 })
 * into a flat schema-shaped matchFormat object (e.g.
 * { totalSets: 3, pointsToWinGame: 21, marginToWin: 2, scoringType: "sets" }).
 *
 * Sub-step 10 fix: previously the submit handler used buildSubmissionPayload()
 * which produces engine-nested shape ({ format: { totalSets: 3 } }) — Mongoose
 * strict mode silently stripped the nested wrapper, so user edits never
 * persisted. This converter strips "format." prefix, applies engine→schema
 * renames, derives setsToWin/gamesToWin, and stamps scoringType.
 *
 * @param {object} values - dotted-path engine values
 * @param {string} scoringType - copied to the output's scoringType field
 */
function ruleBookValuesToMatchFormat(values, scoringType) {
  const out = {};
  if (values && typeof values === "object") {
    let pointsPerGameVal = null;
    let pointsPerSetVal = null;

    for (const [path, val] of Object.entries(values)) {
      if (val == null) continue;
      if (NON_MATCHFORMAT_PREFIXES.some((p) => path.startsWith(p))) continue;
      if (path === "gameStructureType") continue;
      if (!path.startsWith("format.")) continue;

      const key = path.slice(7);

      // Defer pointsPerGame/pointsPerSet so the collision rule (pointsPerGame
      // wins if both are present) runs after the loop.
      if (key === "pointsPerGame") { pointsPerGameVal = val; continue; }
      if (key === "pointsPerSet")  { pointsPerSetVal  = val; continue; }

      const renamed = ENGINE_TO_SCHEMA_RENAMES[key];
      out[renamed || key] = val;
    }

    if (pointsPerGameVal != null) out.pointsToWinGame = pointsPerGameVal;
    else if (pointsPerSetVal != null) out.pointsToWinGame = pointsPerSetVal;
  }

  if (typeof out.totalSets === "number") {
    out.setsToWin = Math.ceil(out.totalSets / 2);
  }
  if (typeof out.totalGames === "number") {
    out.gamesToWin = Math.ceil(out.totalGames / 2);
  }

  if (scoringType) out.scoringType = scoringType;

  return out;
}

/**
 * Unified Tournament Form — supports both create and edit mode.
 *
 * Props:
 * - showPopup: boolean
 * - setShowPopup: (bool) => void
 * - mode: "create" | "edit" (default: "create")
 * - initialData: tournament object (for edit mode)
 * - onSuccess: () => void (optional callback after save)
 */
/**
 * Map a single API sport entry to the unified form-sport shape.
 * Used for every entry in t.sports[] — no more primary/additional split.
 */
function mapSportApiToFormSport(s, isFirst, legacyRootLevel = "") {
  return {
    _key: Math.random().toString(36).slice(2, 10),
    _expanded: !!isFirst, // first card auto-expanded, others collapsed
    _ruleBook: null, // lazy-fetched on Section D expand
    _ruleBookValues: matchFormatToRuleBookValues(s.matchFormat, s.sportName),
    _ruleBookErrors: {},
    _loadingRuleBook: false,
    // Sub-step 5 — one-shot guard for the lazy rule-book fetch in SportCard.
    // Always false on edit-load: we don't pre-fetch, the user has to expand
    // Section D first. Cleared on sport-change and on level-change.
    _ruleBookFetchAttempted: false,

    sportName: s.sportName || "",
    sportSlug: s.sportSlug || slugifyForSport(s.sportName),
    scoringType: s.matchFormat?.scoringType || scoringTypeFor(s.sportName) || "sets",
    // Per-sport tournament level. Edit-load fallback chain:
    //   sport entry's own level → legacy root tournamentLevel → "" (force pick)
    tournamentLevel: s.tournamentLevel || legacyRootLevel || "",
    type: s.type || "knockout + group stage",
    // Edit-load preserves the template snapshot fields so the picker re-hydrates
    // to the saved choice and the bounds caption still renders.
    categories: (Array.isArray(s.categories) && s.categories.length > 0)
      ? s.categories.map((c) => ({
          templateId: c.templateId || null,
          name: c.name || "",
          fee: Number(c.fee || 0),
          minAge: c.minAge ?? null,
          maxAge: c.maxAge ?? null,
          gender: c.gender || "any",
          // Per-category format overrides — null means the row inherits the
          // sport track, which is how every tournament saved before this
          // feature loads.
          type: c.type || null,
          groupStageFormat: c.groupStageFormat || null,
          knockoutFormat: c.knockoutFormat || null,
          qualifyPerGroup: c.qualifyPerGroup ?? null,
          drawSize: c.drawSize ?? null,
        }))
      : [{ templateId: null, name: "", fee: 0, minAge: null, maxAge: null, gender: "any" }],
    // Which scope the tournament was authored in. Anything saved before this
    // existed has no value and loads as "sport" — its original behaviour.
    formatScope: s.formatScope === "category" ? "category" : "sport",
    groupStageFormat: s.groupStageFormat || null,
    knockoutFormat: s.knockoutFormat || null,
    davisCupFormatId: s.davisCupFormatId || null,
    qualifyPerGroup: Number(s.qualifyPerGroup ?? 2),
    drawSize: s.drawSize ?? null,
    matchFormat: s.matchFormat || { ...UNRANKED_DEFAULTS.sets },
  };
}

/**
 * Maps raw tournament API data to form field values.
 * Sub-step 3: every sport (including the first) flows into formData.sports[].
 * Root form keys are tournament-wide only (title, level, dates, etc.).
 */
function mapTournamentToForm(t, defaults, auth) {
  if (!t) return { ...defaults };

  // Per-sport level migration: pass legacy root tournamentLevel as fallback
  // so existing tournaments with mixed-or-uniform levels load correctly even
  // before any sports[i].tournamentLevel field has been written.
  const legacyRootLevel = t.tournamentLevel || "";

  const sports = (Array.isArray(t.sports) && t.sports.length > 0)
    ? t.sports.map((s, idx) => mapSportApiToFormSport(s, idx === 0, legacyRootLevel))
    : [newSportEntry({ expanded: true })];

  return {
    ...defaults,
    title: t.title || "",
    description: t.description || "",
    organizerName: t.organizerName || "",
    cancellationPolicy: t.cancellationPolicy || "NO",
    eventLocation: Array.isArray(t.eventLocation) ? t.eventLocation.join(", ") : t.eventLocation || "",
    startDate: t.startDate ? t.startDate.split("T")[0] : "",
    endDate: t.endDate ? t.endDate.split("T")[0] : "",
    termsAndConditions: t.termsAndConditions || "",
    selectedTime: t.selectedTime || { startTime: "10:00", endTime: "18:00" },
    registrationDeadline: t.registrationDeadline || "",
    managerId: t.managerId || [auth?._id || ""],
    isPrivate: t.isPrivate || false,
    clientId: t.clientId || "",
    sports,
  };
}

// ───────────────────────────────────────────────────────────
// Sub-step 3 — Unified sport-entry factory (replaces newAdditionalSport).
// Every entry in formData.sports[] uses this shape, including index 0.
// ───────────────────────────────────────────────────────────

function newSportEntry({ expanded = false } = {}) {
  return {
    // UI-only fields — stripped at submit
    _key: Math.random().toString(36).slice(2, 10),
    _expanded: !!expanded,
    _ruleBook: null,
    _ruleBookValues: {},
    _ruleBookErrors: {},
    _loadingRuleBook: false,
    _ruleBookFetchAttempted: false, // Sub-step 5 — one-shot fetch guard

    // Persisted fields (sent to API)
    sportName: "",
    sportSlug: "",
    scoringType: "sets",
    // Per-sport tournament level — empty default forces explicit choice.
    tournamentLevel: "",
    type: "knockout + group stage",
    // First row is empty so the picker prompts the manager to select a
    // SuperAdmin template — there is no free-form category entry.
    categories: [{ templateId: null, name: "", fee: 0, minAge: null, maxAge: null, gender: "any" }],
    // Format is declared once for the whole sport by default; the manager can
    // switch to per-category in step 2.
    formatScope: "sport",
    groupStageFormat: "Singles",
    knockoutFormat: "Singles",
    davisCupFormatId: null,
    qualifyPerGroup: 2,
    drawSize: null,
    matchFormat: { ...UNRANKED_DEFAULTS.sets },
  };
}


const MCreateTournament = ({ showPopup, setShowPopup, mode = "create", initialData = null, onSuccess, redirectOnSuccess = true }) => {
  const isEditMode = mode === "edit";
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Sub-step 8 — split error display:
  //   fieldErrors  → inline per-field validation errors keyed by dotted path
  //                  ("title", "tournamentLevel", "sports[i].sportName",
  //                   "sports[i].categories[j].name", "eventLocation", etc.)
  //   submitError  → server/network errors from createTournament catch block;
  //                  surfaced via react-toastify (existing global ToastContainer)
  // The legacy global red banner is GONE — validation errors render inline at
  // the offending input; server/upload errors go to toast.
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");
  const { auth } = useContext(AuthContext);

  // Sub-step 4 — Step 1 UI state
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Sub-step 7 — Step 3 UI state (T&C collapsible link)
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // Wizard step
  const [currentStep, setCurrentStep] = useState(0);

  // Sports list (active sports for the dropdowns)
  const [sportsList, setSportsList] = useState([]);

  // Sub-step 3 — Tournament-wide form state. Per-sport state (rule book, format,
  // categories, expansion) lives on each entry in formData.sports[].
  const defaultFormData = {
    title: "",
    description: "",
    registrationDeadline: "",
    organizerName: "",
    cancellationPolicy: "YES",
    eventLocation: "",
    managerId: [auth?._id || ""],
    selectedTime: { startTime: "10:00", endTime: "18:00" },
    startDate: dayjs().format("YYYY-MM-DD"),
    endDate: dayjs().add(7, "day").format("YYYY-MM-DD"),
    termsAndConditions: "",
    isPrivate: false,
    clientId: "",
    // Unified sports[] — first entry replaces the legacy primary-sport root scalars.
    sports: [newSportEntry({ expanded: true })],
  };

  const [formData, setFormData] = useState(() => {
    if (isEditMode && initialData) {
      return mapTournamentToForm(initialData, defaultFormData, auth);
    }
    return { ...defaultFormData, sports: [newSportEntry({ expanded: true })] };
  });

  // Sync form when modal opens, initialData changes, or mode changes
  useEffect(() => {
    if (!showPopup) return; // Component returns null anyway when !showPopup

    if (isEditMode && initialData) {
      setFormData(mapTournamentToForm(initialData, defaultFormData, auth));
      setImage(initialData.tournamentLogo ? `/uploads/tournaments/${initialData.tournamentLogo}` : null);
      setIsDescriptionOpen(!!initialData.description);
      setIsTermsOpen(!!initialData.termsAndConditions);
    } else {
      setFormData({ ...defaultFormData, sports: [newSportEntry({ expanded: true })] });
      setImage(null);
      setIsDescriptionOpen(false);
      setIsTermsOpen(false);
    }
    setImageFile(null);
    setFieldErrors({});
    setSuccess("");
    setCurrentStep(0);
  }, [showPopup, isEditMode, initialData]);

  // Sub-step 3 — 3 fixed steps. No more dynamic insertion.
  const steps = STATIC_STEPS;

  // Fetch active sports on mount
  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await axios.get("/api/sports/active");
        setSportsList(res.data.data || res.data || []);
      } catch (err) {
        console.error("Failed to fetch sports:", err);
      }
    };
    fetchSports();
  }, []);

  // Per-sport level: rule-book invalidation on level change is now handled
  // inside SportCard (in onLevelChange, mirror of onSportChange). The
  // tournament-wide level effect was removed when tournamentLevel moved to
  // per-sport — invalidation needs to scope to the single sport whose level
  // changed, not all sports.

  // ── Sub-step 3 — Sport helpers (single source of truth: formData.sports) ──
  // Sub-step 9 — auto-clear inline errors for any keys touched by a patch.
  const updateSport = useCallback((idx, patch) => {
    setFormData((prev) => {
      const next = [...prev.sports];
      if (!next[idx]) return prev;
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, sports: next };
    });
    setFieldErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      let changed = false;
      const out = { ...prev };
      const prefix = `sports[${idx}].`;
      for (const key of Object.keys(patch)) {
        if (key.startsWith("_")) continue; // UI-only fields don't have inline errors
        const errPath = `${prefix}${key}`;
        if (out[errPath]) { delete out[errPath]; changed = true; }
        // Editing categories clears all category-related errors for this sport.
        if (key === "categories") {
          for (const k of Object.keys(out)) {
            if (k.startsWith(`${prefix}categories`)) { delete out[k]; changed = true; }
          }
        }
        // Editing sportName auto-corrects type/format → also clear the type error.
        if (key === "sportName") {
          if (out[`${prefix}type`]) { delete out[`${prefix}type`]; changed = true; }
        }
      }
      return changed ? out : prev;
    });
  }, []);

  const addSport = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      sports: [
        // Collapse all existing cards when adding a new one
        ...prev.sports.map((s) => ({ ...s, _expanded: false })),
        newSportEntry({ expanded: true }),
      ],
    }));
  }, []);

  const removeSport = useCallback((idx) => {
    setFormData((prev) => {
      if (prev.sports.length <= 1) return prev; // never remove the last card
      return { ...prev, sports: prev.sports.filter((_, i) => i !== idx) };
    });
  }, []);

  const toggleSportExpanded = useCallback((idx) => {
    setFormData((prev) => ({
      ...prev,
      sports: prev.sports.map((s, i) => (i === idx ? { ...s, _expanded: !s._expanded } : s)),
    }));
  }, []);

  // ── Handlers ──
  // Sub-step 4 — image upload helpers (drag-and-drop + click + remove).
  // Sub-step 8 — image upload errors go to toast (no longer a global banner).
  const acceptImageFile = useCallback((file) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG or JPG).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo file too large — max 5MB.");
      return;
    }
    setImageFile(file);
    setImage(URL.createObjectURL(file));
  }, []);

  const handleImageChange = (event) => {
    acceptImageFile(event.target.files[0]);
  };

  const removeImage = useCallback(() => {
    setImageFile(null);
    setImage(null);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) acceptImageFile(file);
  }, [acceptImageFile]);

  // Generic root-field setter. The legacy `sportsType` field name maps to
  // sports[0].sportName via the bridge below — special-cased here so existing
  // <select name="sportsType" onChange={handleInputChange}> JSX still works.
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "sportsType") {
      // Sport change: also reset per-sport format defaults + clear rule book
      // (matches the pre-Sub-step-3 userChangedSport reset behavior).
      const isTeam = isTeamOnlySport(value);
      const scoringType = scoringTypeFor(value) || "sets";
      updateSport(0, {
        sportName: value,
        sportSlug: slugifyForSport(value),
        scoringType,
        type: isTeam ? "knockout" : "knockout + group stage",
        knockoutFormat: isTeam ? "Teams Knockout" : "Singles",
        groupStageFormat: isTeam ? "Teams" : "Singles",
        _ruleBook: null,
        _ruleBookValues: {},
        _ruleBookErrors: {},
        _loadingRuleBook: false,
        _ruleBookFetchAttempted: false, // Sub-step 5 — re-arm SportCard's lazy fetch
      });
      // Reset tournamentLevel — different sports may not have rule books at every level.
      setFormData((prev) => ({ ...prev, tournamentLevel: "" }));
      return;
    }
    // Bridge — primary-sport scalars previously held at root now live on sports[0].
    if (name === "qualifyPerGroup") {
      updateSport(0, { qualifyPerGroup: Number(value) });
      return;
    }
    if (name === "drawSize") {
      updateSport(0, { drawSize: value ? Number(value) : null });
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Sub-step 9 — auto-clear inline error for this root field.
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };


  // Rule-book field handlers operate on sports[0]._ruleBookValues / _ruleBookErrors.
  const handleRuleBookFieldChange = useCallback((path, value) => {
    setFormData((prev) => {
      const sp = prev.sports[0];
      const nextValues = { ...(sp._ruleBookValues || {}), [path]: value };
      const nextErrors = { ...(sp._ruleBookErrors || {}) };
      delete nextErrors[path];
      const sports = [...prev.sports];
      sports[0] = { ...sp, _ruleBookValues: nextValues, _ruleBookErrors: nextErrors };
      return { ...prev, sports };
    });
  }, []);

  const handleMultiSelectToggle = useCallback((path, option) => {
    setFormData((prev) => {
      const sp = prev.sports[0];
      const current = Array.isArray(sp._ruleBookValues?.[path]) ? [...sp._ruleBookValues[path]] : [];
      const i = current.indexOf(option);
      if (i >= 0) current.splice(i, 1);
      else current.push(option);
      const sports = [...prev.sports];
      sports[0] = { ...sp, _ruleBookValues: { ...(sp._ruleBookValues || {}), [path]: current } };
      return { ...prev, sports };
    });
  }, []);

  // ── Step Validation ──
  // Sub-step 8 — populates a fieldErrors map keyed by dotted path. Returns
  // true iff the map is empty. Inline error rendering at each input consumes
  // these errors; there is no global validation banner.
  const validateCurrentStep = () => {
    const stepId = steps[currentStep]?.id;
    const errors = {};

    if (stepId === "basic") {
      // Per-sport level: tournamentLevel validation moved to Step 2 since
      // each sport now has its own level.
      if (!formData.title.trim()) errors.title = "Tournament name is required";
    } else if (stepId === "format") {
      // Sub-step 6 — uniform per-sport validation. Errors stored at
      // sports[i].<field> paths so SportCard can slice and forward them.
      const sports = formData.sports || [];
      sports.forEach((s, i) => {
        const prefix = `sports[${i}]`;
        if (!s.sportName?.trim()) {
          errors[`${prefix}.sportName`] = "Please select a sport";
        }
        if (!s.tournamentLevel) {
          errors[`${prefix}.tournamentLevel`] = "Please select a tournament level";
        }
        if (!s.type) {
          errors[`${prefix}.type`] = "Please pick a tournament type";
        }
        // Max players (draw size) is optional, but if provided must be a positive number.
        if (s.drawSize !== null && s.drawSize !== undefined && s.drawSize !== "") {
          const n = Number(s.drawSize);
          if (!Number.isFinite(n) || n <= 0) {
            errors[`${prefix}.drawSize`] = "Max players must be a positive number";
          }
        }
        if (!Array.isArray(s.categories) || s.categories.length === 0) {
          errors[`${prefix}.categories`] = "At least one category is required";
        } else {
          s.categories.forEach((c, j) => {
            // Managers must pick a template — both the templateId and the
            // snapshot label are required. Older categories created before
            // templates existed only have `name`, so we accept either signal
            // to stay backward-compatible with mid-flight tournaments.
            // A template row carries a templateId; a custom row carries only a
            // name. Either is valid — the wizard offers both.
            if (!c?.templateId && !c?.name?.trim()) {
              errors[`${prefix}.categories[${j}].name`] =
                "Pick a category, or choose Custom and name it";
            }
            const minSet = c?.minAge !== null && c?.minAge !== undefined && c?.minAge !== "";
            const maxSet = c?.maxAge !== null && c?.maxAge !== undefined && c?.maxAge !== "";
            if (minSet && maxSet && Number(c.maxAge) < Number(c.minAge)) {
              errors[`${prefix}.categories[${j}].ageRange`] =
                "Max age must be greater than or equal to min age";
            }
          });
        }
        // Rule-book validation only for sports whose Section D has fetched a
        // ruleBook. Per-rule errors live on the sport entry's _ruleBookErrors;
        // a single pointer error at the sport level surfaces them in the
        // outer banner-equivalent (Sub-step 5's locked grid renders disabled
        // for ranked, so this rarely fires in practice).
        if (s._ruleBook) {
          const { sections } = generateFormFields(s._ruleBook);
          if (sections.length > 0) {
            const { valid, errors: rbErrors } = validateRuleBookForm(s._ruleBookValues || {}, sections);
            if (!valid) {
              updateSport(i, { _ruleBookErrors: rbErrors });
              errors[`${prefix}.ruleBook`] = "Please fix the rule-book fields";
            } else {
              updateSport(i, { _ruleBookErrors: {} });
            }
          }
        }
      });
    } else if (stepId === "details") {
      if (!formData.eventLocation.trim()) errors.eventLocation = "Event location is required";
      if (!formData.startDate) errors.startDate = "Start date is required";
      if (!formData.endDate) errors.endDate = "End date is required";
      // End date must not be before the start date.
      if (
        formData.startDate &&
        formData.endDate &&
        dayjs(formData.endDate).isBefore(dayjs(formData.startDate), "day")
      ) {
        errors.endDate = "End date must be on or after the start date";
      }
      // Registration deadline (if set) must not be after the start date.
      if (
        formData.registrationDeadline &&
        formData.startDate &&
        dayjs(formData.registrationDeadline).isAfter(dayjs(formData.startDate), "day")
      ) {
        errors.registrationDeadline = "Registration deadline must be on or before the start date";
      }
    }

    setFieldErrors(errors);
    return errors; // empty object means valid
  };

  // Sub-step 9 — Scroll the first errored field into view (and expand its
  // sport card if collapsed) so the user sees the red border without having
  // to hunt for it. Defers to next tick so the DOM has the updated red
  // borders rendered before scrolling.
  const scrollToFirstError = useCallback((errors) => {
    if (!errors || Object.keys(errors).length === 0) return;
    const firstKey = Object.keys(errors)[0];

    // If the first error is on a sport card that's collapsed, expand it first.
    const sportMatch = firstKey.match(/^sports\[(\d+)\]/);
    if (sportMatch) {
      const idx = Number(sportMatch[1]);
      const sport = formData.sports[idx];
      if (sport && !sport._expanded) {
        toggleSportExpanded(idx);
      }
    }

    // Map error key → DOM selector.
    let selector = null;
    if (firstKey === "title") selector = "#title";
    else if (firstKey === "eventLocation") selector = "#eventLocation";
    else if (firstKey === "startDate") selector = "#startDate";
    else if (firstKey === "endDate") selector = "#endDate";
    else if (sportMatch) selector = `[data-sport-index='${sportMatch[1]}']`;

    if (!selector) return;
    // setTimeout to let the expand animation begin and inline errors paint.
    setTimeout(() => {
      const el = document.querySelector(selector);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (
        el.tagName === "INPUT" ||
        el.tagName === "SELECT" ||
        el.tagName === "TEXTAREA"
      ) {
        try { el.focus({ preventScroll: true }); } catch { /* old browsers */ }
      }
    }, 50);
  }, [formData.sports, toggleSportExpanded]);

  const goNext = () => {
    const errors = validateCurrentStep();
    const isValid = Object.keys(errors).length === 0;
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep((p) => p + 1);
      setFieldErrors({});
    } else if (!isValid) {
      scrollToFirstError(errors);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep((p) => p - 1);
      setFieldErrors({});
    }
  };

  const goToStep = (idx) => {
    // Only allow going back freely, forward requires validation
    if (idx < currentStep) {
      setCurrentStep(idx);
      setFieldErrors({});
    } else if (idx === currentStep + 1) {
      goNext();
    }
  };

  // ── Submit ──
  // Sub-step 3 — sports[] is the canonical source. Legacy root scalars
  // (type, sportsType, groupStageFormat, knockoutFormat, qualifyPerGroup,
  // drawSize, davisCupFormatId, matchFormatOverrides, category) are dropped:
  // Mongoose strict mode strips them post-STEP 17e, and the backend has
  // treated sports[] as the source of truth since STEP 10a.
  const createTournament = async () => {
    const errors = validateCurrentStep();
    if (Object.keys(errors).length > 0) {
      scrollToFirstError(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (!formData.title || !formData.sports[0]?.sportName) {
        // Defensive — should be caught by validateCurrentStep already.
        toast.error("Title and at least one sport are required");
        setIsSubmitting(false);
        return;
      }

      const tournamentFormData = new FormData();

      if (imageFile) tournamentFormData.append("tournamentLogo", imageFile);

      tournamentFormData.append("title", formData.title.trim());
      tournamentFormData.append("description", formData.description || "");
      tournamentFormData.append("organizerName", formData.organizerName || "");
      tournamentFormData.append("cancellationPolicy", formData.cancellationPolicy || "NO");
      tournamentFormData.append("termsAndConditions", formData.termsAndConditions || "");

      // Per-sport level: tournamentLevel is no longer sent at root; each
      // sport carries its own value inside the sports[] payload below.
      if (formData.registrationDeadline) tournamentFormData.append("registrationDeadline", formData.registrationDeadline);
      if (formData.startDate) tournamentFormData.append("startDate", formData.startDate);
      if (formData.endDate) tournamentFormData.append("endDate", formData.endDate);
      if (formData.selectedTime) tournamentFormData.append("selectedTime", JSON.stringify(formData.selectedTime));
      if (formData.managerId?.length) tournamentFormData.append("managerId", JSON.stringify(formData.managerId));
      if (formData.eventLocation) tournamentFormData.append("eventLocation", formData.eventLocation);
      tournamentFormData.append("isPrivate", formData.isPrivate ? "true" : "false");
      if (formData.isPrivate && formData.clientId) {
        tournamentFormData.append("clientId", formData.clientId.trim());
      }

      // Build sports[] payload — strip UI-only fields, resolve matchFormat per sport.
      // Sub-step 10 round-trip fix: ruleBookValuesToMatchFormat converts engine
      // shape (dotted paths, engine field names) → flat schema shape with renames
      // and derived setsToWin/gamesToWin. Three resolution paths:
      //   - Path 1 (ranked + locked rule book): _ruleBookValues mirrors ruleBook
      //     defaults; converter produces a consistent flat-schema matchFormat.
      //   - Path 2 (unranked + Section D opened): user edits sit in
      //     _ruleBookValues; converter applies renames so they survive save.
      //   - Path 3 (fresh sport, Section D never opened): _ruleBookValues is
      //     empty; fall back to sport-aware defaults via getUnrankedDefaults.
      const sportsPayload = formData.sports.map((s) => {
        const scoringType = s.scoringType || scoringTypeFor(s.sportName) || "sets";
        const matchFormat = (s._ruleBookValues && Object.keys(s._ruleBookValues).length > 0)
          ? ruleBookValuesToMatchFormat(s._ruleBookValues, scoringType)
          : ruleBookValuesToMatchFormat(getUnrankedDefaults(s.sportName), scoringType);

        // Per-category format is only sent when the manager chose that scope.
        // Otherwise stale overrides — left behind by switching the scope or
        // the tournament type back and forth — would keep winning on the
        // server, where a category value always beats the track.
        const perCategoryFormat = s.formatScope === "category";

        return {
          sportName: s.sportName,
          sportSlug: s.sportSlug || slugifyForSport(s.sportName),
          scoringType,
          tournamentLevel: s.tournamentLevel || "",
          type: s.type,
          formatScope: perCategoryFormat ? "category" : "sport",
          categories: (s.categories || []).map((c) => {
            const ageOrNull = (v) => {
              if (v === null || v === undefined || v === "") return null;
              const n = Number(v);
              return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
            };
            const intOrNull = (v) => {
              if (v === null || v === undefined || v === "") return null;
              const n = Number(v);
              return Number.isFinite(n) ? n : null;
            };
            return {
              templateId: c.templateId || null,
              name: c.name,
              fee: Number(c.fee || 0),
              minAge: ageOrNull(c.minAge),
              maxAge: ageOrNull(c.maxAge),
              gender: ["male", "female", "any"].includes(c.gender)
                ? c.gender
                : "any",
              // null = inherit the sport track, which is what the server's
              // resolvers expect for every category the manager left alone.
              type: perCategoryFormat ? c.type || null : null,
              groupStageFormat: perCategoryFormat ? c.groupStageFormat || null : null,
              knockoutFormat: perCategoryFormat ? c.knockoutFormat || null : null,
              qualifyPerGroup: perCategoryFormat ? intOrNull(c.qualifyPerGroup) : null,
              drawSize: perCategoryFormat ? intOrNull(c.drawSize) : null,
            };
          }),
          // Default to "Singles" (the same fallback the format-picker uses) so a
          // group-stage / knockout tournament can never save with a null format
          // just because the manager didn't touch the dropdown. Only null it out
          // when the format genuinely doesn't apply to the chosen type.
          groupStageFormat: String(s.type || "").includes("group stage")
            ? (s.groupStageFormat || "Singles")
            : null,
          knockoutFormat: String(s.type || "").includes("knockout")
            ? (s.knockoutFormat || "Singles")
            : null,
          davisCupFormatId: s.davisCupFormatId || null,
          qualifyPerGroup: Number(s.qualifyPerGroup || 2),
          drawSize: s.drawSize ? Number(s.drawSize) : null,
          matchFormat,
        };
      });
      tournamentFormData.append("sports", JSON.stringify(sportsPayload));

      let createdTournament = null;
      if (isEditMode && initialData?._id) {
        // EDIT MODE — update existing tournament
        await axios.put(`/api/tournaments/edit/${initialData._id}`, tournamentFormData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${getAuthToken()}`,
          },
        });
        setSuccess("Tournament updated successfully!");
      } else {
        // CREATE MODE — create new tournament
        const createRes = await axios.post(`/api/tournaments/createTournament`, tournamentFormData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${getAuthToken()}`,
          },
        });
        createdTournament = createRes?.data?.tournament || null;
        setSuccess("Tournament created successfully!");
      }

      setTimeout(() => {
        setShowPopup(false);
        // Pass the created tournament so callers (e.g. Event OS) can wrap it.
        onSuccess?.(createdTournament);
        // Default: managers land on tournament management. Event OS passes
        // redirectOnSuccess={false} to stay in its own shell.
        if (!isEditMode && redirectOnSuccess) window.location.href = "/mtournament-management";
      }, 1500);
    } catch (err) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} tournament:`, err);
      toast.error(err.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} tournament`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Helpers ──
  const renderRuleValue = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return val;
  };

  const formatLabel = (key) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();

  // NOTE: a dead `renderDynamicField` helper used to live here. It was never
  // called (it referenced undefined `ruleBookValues`/`ruleBookErrors` — the live
  // rule-book UI is rendered by SportCard via `_ruleBookValues`) and produced
  // no-undef errors, so it was removed.

  if (!showPopup) return null;

  const activeStep = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // ═══════════════════════════════════════════
  //  STEP CONTENT RENDERERS
  // ═══════════════════════════════════════════

  const renderStepBasic = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left — main fields */}
      <div className="lg:col-span-8">
        <WCard className="space-y-5">
          <SectionHeader
            icon={<Trophy className="w-4 h-4" style={{ color: CK_SIG }} />}
            title="Tournament info"
          />

          {/* Tournament Name */}
          <div>
            <FieldLabel htmlFor="title" required>Tournament Name</FieldLabel>
            <TextInput
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g. Summer Championship 2026"
              error={fieldErrors.title}
            />
          </div>

          {/* Tournament Level: moved to per-sport (each SportCard on Step 2
              has its own level selector). Allows mixing e.g. Football=state
              and TableTennis=unranked in one tournament. */}

          {/* Organizer Name */}
          <div>
            <FieldLabel htmlFor="organizerName">Organizer Name</FieldLabel>
            <TextInput
              id="organizerName"
              name="organizerName"
              value={formData.organizerName}
              onChange={handleInputChange}
              placeholder="Organization or person name"
            />
          </div>

          {/* Public/Private toggle card */}
          <ToggleCard
            icon={formData.isPrivate ? <Lock className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            title={formData.isPrivate ? "Private Tournament" : "Public Tournament"}
            description={
              formData.isPrivate
                ? "Hidden from public listing. Only you can manage registrations via bulk upload."
                : "Visible to everyone. Players can self-register via the app."
            }
            checked={formData.isPrivate}
            onChange={(b) => setFormData((prev) => ({ ...prev, isPrivate: b }))}
          />

          {/* Client ID slide-in (auto-controlled by isPrivate). Sub-step 9:
              Collapsible — ref-measured for smooth open/close. */}
          <Collapsible open={!!formData.isPrivate}>
            <div className="pt-1">
              <FieldLabel htmlFor="clientId">Client ID</FieldLabel>
              <TextInput
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleInputChange}
                placeholder="Leave empty to auto-generate (e.g. CK-TEN-A3F8X2)"
                className="uppercase placeholder:normal-case font-mono tracking-wider"
              />
              <p className="text-xs text-gray-400 mt-1.5">A unique identifier for this corporate client. Auto-generated if left blank.</p>
            </div>
          </Collapsible>

          {/* + Add description (collapsed by default; auto-opens on edit-load when description has content) */}
          <ExpandableSection
            variant="link"
            open={isDescriptionOpen}
            onToggle={() => setIsDescriptionOpen((o) => !o)}
            label={isDescriptionOpen ? "Hide description" : "+ Add description"}
          >
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Describe your tournament…"
              className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[13px] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition resize-y"
              style={{ "--tw-ring-color": CK_SIG_TINT }}
              onFocus={(e) => { e.currentTarget.style.borderColor = CK_SIG; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = ""; }}
            />
          </ExpandableSection>
        </WCard>
      </div>

      {/* Right — Logo upload */}
      <div className="lg:col-span-4">
        <WCard className="space-y-4">
          <SectionHeader
            icon={<ImageIcon className="w-4 h-4 text-gray-400" />}
            title="Tournament logo"
          />

          {image ? (
            <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.03]">
              <img loading="lazy" src={image} alt="Tournament logo" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                aria-label="Remove logo"
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-gray-300 hover:text-red-400 inline-flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.20)] transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="block w-full aspect-square rounded-xl border border-dashed transition cursor-pointer"
              style={{
                borderColor: isDragging ? CK_SIG : "rgba(255,255,255,0.12)",
                backgroundColor: isDragging ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.03)",
              }}
            >
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleImageChange}
                className="sr-only"
              />
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                <div className="w-10 h-10 bg-white/[0.04] rounded-xl flex items-center justify-center mb-3 text-gray-400 border border-white/[0.08]">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <p className="text-[13px] font-semibold text-gray-100">Click to upload or drag &amp; drop</p>
                <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>
              </div>
            </label>
          )}
        </WCard>
      </div>
    </div>
  );

  // ───────────────────────────────────
  //  STEP: TOURNAMENT SETUP
  // ───────────────────────────────────
  // Sub-step 6 — Step 2 is now a list of unified <SportCard>. Each sport
  // entry in formData.sports[] renders as one card. The legacy "Playing
  // Format" multi-select chrome, sub-format pills, primary categories card,
  // and AdditionalSports section are all gone — every concern lives inside
  // SportCard now (Sub-step 5).
  // Sub-step 8 — slice fieldErrors per sport index and pass to each card.
  const renderStepFormat = () => {
    const canAddSport = !!formData.sports.at(-1)?.sportName?.trim();
    const sliceSportErrors = (idx) => {
      const out = {};
      const prefix = `sports[${idx}].`;
      for (const [k, v] of Object.entries(fieldErrors)) {
        if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
      }
      return out;
    };
    return (
      <div className="space-y-4">
        {formData.sports.map((sport, idx) => (
          <SportCard
            key={sport._key}
            sport={sport}
            index={idx}
            totalSports={formData.sports.length}
            sportsList={sportsList}
            onUpdate={(patch) => updateSport(idx, patch)}
            onRemove={() => removeSport(idx)}
            onToggleExpand={() => toggleSportExpanded(idx)}
            errors={sliceSportErrors(idx)}
            fixedLevels={FIXED_LEVELS}
            rulesLocked={isRulesLocked}
          />
        ))}

        {/* + Add Another Sport — fades in when the last card has a sport selected.
            Sub-step 9: wrapped in Collapsible for consistent smooth transition. */}
        <Collapsible open={canAddSport} className="mt-2">
          <DashedAddButton
            onClick={addSport}
            tabIndex={canAddSport ? 0 : -1}
          >
            + Add Another Sport
          </DashedAddButton>
        </Collapsible>
      </div>
    );
  };

  // ───────────────────────────────────
  //  STEP: SCHEDULE & DETAILS
  // ───────────────────────────────────
  // Sub-step 7 — Step 3 redesigned. Two-column layout: Schedule (left) +
  // Location & Policy (right). Cancellation Policy folded into the Location
  // & Policy card. Terms & Conditions becomes a full-width collapsible link
  // below both columns.
  const renderStepDetails = () => {
    const today = new Date().toISOString().split("T")[0];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Schedule */}
          <WCard className="space-y-5">
            <SectionHeader
              icon={<Calendar className="w-4 h-4" style={{ color: CK_SIG }} />}
              title="Schedule"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="startDate" required>Start Date</FieldLabel>
                <TextInput
                  id="startDate"
                  type="date"
                  name="startDate"
                  min={today}
                  value={formData.startDate}
                  onChange={handleInputChange}
                  error={fieldErrors.startDate}
                />
              </div>
              <div>
                <FieldLabel htmlFor="endDate" required>End Date</FieldLabel>
                <TextInput
                  id="endDate"
                  type="date"
                  name="endDate"
                  min={formData.startDate || today}
                  value={formData.endDate}
                  onChange={handleInputChange}
                  error={fieldErrors.endDate}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Daily schedule</FieldLabel>
              <div
                className="flex items-center gap-2 px-3 h-9 rounded-lg border border-white/[0.08] bg-white/[0.04] focus-within:ring-2 transition"
                style={{ "--tw-ring-color": CK_SIG_TINT }}
              >
                <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <input
                  type="time"
                  aria-label="Daily start time"
                  value={formData.selectedTime?.startTime || ""}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      selectedTime: { ...p.selectedTime, startTime: e.target.value },
                    }))
                  }
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[13px] font-mono tabular-nums text-gray-100 p-0"
                />
                <span className="text-gray-600">—</span>
                <input
                  type="time"
                  aria-label="Daily end time"
                  value={formData.selectedTime?.endTime || ""}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      selectedTime: { ...p.selectedTime, endTime: e.target.value },
                    }))
                  }
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[13px] font-mono tabular-nums text-gray-100 p-0"
                />
              </div>
            </div>
          </WCard>

          {/* Right — Location & Policy */}
          <WCard className="space-y-5">
            <SectionHeader
              icon={<MapPin className="w-4 h-4" style={{ color: CK_SIG }} />}
              title="Location"
            />

            <div>
              <FieldLabel htmlFor="eventLocation" required>Venue Address</FieldLabel>
              <TextInput
                id="eventLocation"
                name="eventLocation"
                value={formData.eventLocation}
                onChange={handleInputChange}
                placeholder="Enter full venue address"
                error={fieldErrors.eventLocation}
              />
            </div>

            <div>
              <FieldLabel htmlFor="registrationDeadline">Registration Deadline</FieldLabel>
              <TextInput
                id="registrationDeadline"
                type="datetime-local"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-400 mt-1.5">Last date and time for players to register.</p>
            </div>

            <div>
              <FieldLabel htmlFor="cancellationPolicy">Cancellation Policy</FieldLabel>
              <Select
                id="cancellationPolicy"
                name="cancellationPolicy"
                value={formData.cancellationPolicy}
                onChange={handleInputChange}
                options={[
                  { value: "YES", label: "Allow Cancellation" },
                  { value: "NO",  label: "No Cancellation" },
                ]}
              />
            </div>
          </WCard>
        </div>

        {/* + Add terms & conditions — full-width expandable link */}
        <ExpandableSection
          variant="link"
          open={isTermsOpen}
          onToggle={() => setIsTermsOpen((o) => !o)}
          label={isTermsOpen ? "Hide terms & conditions" : "+ Add terms & conditions"}
        >
          <textarea
            name="termsAndConditions"
            value={formData.termsAndConditions}
            onChange={handleInputChange}
            rows={4}
            placeholder="Enter specific rules or terms…"
            className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[13px] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition resize-y"
            style={{ "--tw-ring-color": CK_SIG_TINT }}
            onFocus={(e) => { e.currentTarget.style.borderColor = CK_SIG; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = ""; }}
          />
        </ExpandableSection>
      </div>
    );
  };

  // ═══════════════════════════════════════════
  //  RENDER ACTIVE STEP
  // ═══════════════════════════════════════════
  // STEP 17c — currentStage moved from root to per-sport. Derive from
  // sports[0] (representative when sports advance independently). Safe to
  // default to "registration" when sports[] is missing or empty.
  const initialStage = initialData?.sports?.[0]?.currentStage || "registration";
  // Rules editor is locked whenever we are editing an existing tournament.
  // Format selection, categories, dates and other fields remain editable —
  // only the rules block inside SportCard's Section D is disabled.
  const isRulesLocked = isEditMode && !!initialData;

  const renderActiveStep = () => {
    switch (activeStep?.id) {
      case "basic": return renderStepBasic();
      case "format": return renderStepFormat();
      case "details": return renderStepDetails();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#181A22] w-full max-w-6xl h-[90vh] rounded-2xl border border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">

        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-[#181A22]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-1">
              {isEditMode ? "Edit tournament" : "New tournament"}
            </p>
            <h2 className="text-[20px] leading-tight font-semibold tracking-tight text-white truncate">
              Step <span className="font-mono tabular-nums">{currentStep + 1}</span> of <span className="font-mono tabular-nums">{steps.length}</span>
              <span className="mx-2 text-gray-600">·</span>
              <span className="text-gray-300">{activeStep?.label}</span>
            </h2>
          </div>
          <button
            onClick={() => setShowPopup(false)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-gray-100 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-3 bg-white/[0.04] border-b border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            {steps.map((step, idx) => {
              const isActive = idx === currentStep;
              const isDone = idx < currentStep;
              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(idx)}
                    className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium transition ${
                      isActive
                        ? "text-white"
                        : isDone
                        ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer"
                        : "bg-white/[0.04] text-gray-500 border border-white/[0.08]"
                    }`}
                    style={isActive ? { backgroundColor: CK_SIG } : undefined}
                  >
                    {isDone ? <Check className="w-3 h-3" strokeWidth={2.5} /> : step.icon}
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden font-mono tabular-nums">{idx + 1}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className="flex-1 h-px"
                      style={{
                        backgroundColor: idx < currentStep ? "#10B981" : "rgba(255,255,255,0.10)",
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#13141B]">
          {success ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl inline-flex items-center justify-center mb-4">
                <Check className="w-7 h-7 text-emerald-400" strokeWidth={2.5} />
              </div>
              <h3 className="text-[20px] font-semibold tracking-tight text-white mb-1">
                {isEditMode ? "Tournament updated" : "Tournament created"}
              </h3>
              <p className="text-[13px] text-gray-400">{success}</p>
            </div>
          ) : (
            <div className="p-6">
              {renderActiveStep()}
            </div>
          )}
        </div>

        {!success && (
          <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between bg-[#181A22]">
            <button
              type="button"
              onClick={currentStep === 0 ? () => setShowPopup(false) : goPrev}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-300 hover:bg-white/[0.06] rounded-lg transition"
            >
              {currentStep === 0 ? (
                "Cancel"
              ) : (
                <>
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex gap-1 sm:hidden">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        idx === currentStep
                          ? CK_SIG
                          : idx < currentStep
                          ? "#10B981"
                          : "rgba(255,255,255,0.12)",
                    }}
                  />
                ))}
              </div>

              {isLastStep ? (
                <button
                  type="button"
                  onClick={createTournament}
                  disabled={isSubmitting}
                  className="group h-10 px-5 inline-flex items-center gap-2 text-[13px] font-semibold text-white whitespace-nowrap rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-[0_4px_12px_rgba(249,115,22,0.25)] hover:shadow-[0_6px_16px_rgba(249,115,22,0.35)] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-orange-500 disabled:hover:shadow-[0_4px_12px_rgba(249,115,22,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181A22]"
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      {isEditMode ? "Updating…" : "Creating…"}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                      {isEditMode ? "Update tournament" : "Create tournament"}
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="group h-10 px-5 inline-flex items-center gap-2 text-[13px] font-semibold text-white whitespace-nowrap rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-[0_4px_12px_rgba(249,115,22,0.25)] hover:shadow-[0_6px_16px_rgba(249,115,22,0.35)] transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181A22]"
                >
                  Next
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function CustomRuleInput({ label, field, type = "number", min, max, step, value, onChange }) {
  const val = value[field] ?? "";
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => onChange((prev) => ({ ...prev, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
        className="w-full h-9 px-3 border border-white/[0.08] hover:border-white/[0.16] rounded-lg text-[13px] font-mono tabular-nums bg-white/[0.04] focus:outline-none focus:ring-2 transition"
        style={{ "--tw-ring-color": CK_SIG_TINT }}
        onFocus={(e) => { e.currentTarget.style.borderColor = CK_SIG; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = ""; }}
      />
    </div>
  );
}

function CustomRuleToggle({ label, field, value, onChange }) {
  const checked = !!value[field];
  return (
    <div className="flex items-center justify-between bg-white/[0.04] rounded-lg px-3 h-10 border border-white/[0.08]">
      <span className="text-[12px] font-medium text-gray-300">{label}</span>
      <Switch
        checked={checked}
        onChange={() => onChange((prev) => ({ ...prev, [field]: !prev[field] }))}
        size="small"
        sx={{
          "& .MuiSwitch-switchBase.Mui-checked": { color: CK_SIG },
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: CK_SIG },
        }}
      />
    </div>
  );
}

function FormatCheck() {
  return (
    <div
      className="absolute top-3 right-3 w-4 h-4 rounded-full inline-flex items-center justify-center"
      style={{ backgroundColor: CK_SIG }}
    >
      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
    </div>
  );
}

export default MCreateTournament;
