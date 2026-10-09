import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { Trash2, ChevronDown, CalendarDays } from "lucide-react";
import { generateFormFields } from "../../utils/ruleBookFormEngine";
import TeamKnockoutFormatSelector from "../TeamKnockoutFormatSelector";
import Card from "./Card";
import FieldLabel from "./FieldLabel";
import NumberInput from "./NumberInput";
import Select from "./Select";
import ExpandableSection from "./ExpandableSection";
import OptionCard from "./OptionCard";
import DashedAddButton from "./DashedAddButton";
import SportNumberBadge from "./SportNumberBadge";
import { getAuthToken } from "../../shared/api/authToken";
import {
  isTeamOnlySport,
  isIndividualOnlySport,
  isNestedSetSport,
  scoringTypeFor,
  slugifyForSport,
  getUnrankedDefaults,
} from "./sportClassification";

const SIG = "#F97316";
const SIG_TINT = "rgba(249,115,22,0.10)";
const SIG_TINT_RING = "rgba(249,115,22,0.25)";

// Sentinel value for the picker's "Custom category…" entry. Not a template id,
// so it can never collide with one.
const CUSTOM_OPTION = "__custom__";

// Module-level cache for category templates so every SportCard on the page
// shares one network call. Refreshes on a hard reload — managers don't edit
// templates from this screen, so a per-tab snapshot is fine.
let CATEGORY_TEMPLATES_CACHE = null;
let CATEGORY_TEMPLATES_INFLIGHT = null;
function fetchCategoryTemplates() {
  if (CATEGORY_TEMPLATES_CACHE) return Promise.resolve(CATEGORY_TEMPLATES_CACHE);
  if (CATEGORY_TEMPLATES_INFLIGHT) return CATEGORY_TEMPLATES_INFLIGHT;
  CATEGORY_TEMPLATES_INFLIGHT = axios
    .get("/api/category-templates", {
      headers: { Authorization: `Bearer ${getAuthToken() || ""}` },
    })
    .then((r) => {
      CATEGORY_TEMPLATES_CACHE = r.data?.templates || [];
      return CATEGORY_TEMPLATES_CACHE;
    })
    .catch((e) => {
      console.error("[category-templates] fetch failed:", e?.response?.data || e.message);
      CATEGORY_TEMPLATES_CACHE = [];
      return [];
    })
    .finally(() => { CATEGORY_TEMPLATES_INFLIGHT = null; });
  return CATEGORY_TEMPLATES_INFLIGHT;
}

function categoryBoundsSummary(cat) {
  const parts = [];
  if (cat.minAge != null && cat.maxAge != null) parts.push(`Age ${cat.minAge}-${cat.maxAge}`);
  else if (cat.maxAge != null) parts.push(`Up to age ${cat.maxAge}`);
  else if (cat.minAge != null) parts.push(`Age ${cat.minAge}+`);
  else parts.push("No age limit");
  if (cat.gender && cat.gender !== "any") {
    parts.push(cat.gender === "male" ? "Male only" : "Female only");
  }
  return parts.join(" · ");
}

function UnrankedCustomRules({ sport, onUpdate, locked = false }) {
  const v = sport._ruleBookValues || {};
  const scoringType = sport.scoringType || scoringTypeFor(sport.sportName) || "sets";

  const setVal = (path, value) => {
    if (locked) return;
    onUpdate({
      _ruleBookValues: { ...(sport._ruleBookValues || {}), [path]: value },
    });
  };
  const num = (path) => (e) =>
    setVal(path, e.target.value === "" ? null : Number(e.target.value));

  if (scoringType === "single") {
    return (
      <div className="text-[12px] text-gray-400 italic px-1">
        Single-result scoring — no extra format fields needed.
      </div>
    );
  }

  if (scoringType === "innings") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Overs</FieldLabel>
          <NumberInput
            value={v["format.oversCount"] ?? 20}
            onChange={num("format.oversCount")}
            min={1}
            disabled={locked}
          />
        </div>
        <div>
          <FieldLabel>Innings</FieldLabel>
          <NumberInput
            value={v["format.inningsCount"] ?? 2}
            onChange={num("format.inningsCount")}
            min={1}
            disabled={locked}
          />
        </div>
      </div>
    );
  }

  if (scoringType === "time") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Halves</FieldLabel>
          <NumberInput
            value={v["format.halvesCount"] ?? 2}
            onChange={num("format.halvesCount")}
            min={1}
            disabled={locked}
          />
        </div>
        <div>
          <FieldLabel>Half duration (min)</FieldLabel>
          <NumberInput
            value={v["format.halvesDuration"] ?? 45}
            onChange={num("format.halvesDuration")}
            min={5}
            disabled={locked}
          />
        </div>
      </div>
    );
  }

  const isNested = isNestedSetSport(sport.sportName);
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <FieldLabel>Total sets</FieldLabel>
        <NumberInput
          value={v["format.totalSets"] ?? 3}
          onChange={num("format.totalSets")}
          min={1}
          disabled={locked}
        />
      </div>
      {isNested ? (
        <>
          <div>
            <FieldLabel>Games per set</FieldLabel>
            <NumberInput
              value={v["format.gamesPerSet"] ?? 6}
              onChange={num("format.gamesPerSet")}
              min={1}
              disabled={locked}
            />
          </div>
          <div>
            <FieldLabel>Points per game</FieldLabel>
            <NumberInput
              value={v["format.pointsPerGame"] ?? 4}
              onChange={num("format.pointsPerGame")}
              min={1}
              disabled={locked}
            />
          </div>
        </>
      ) : (
        <div>
          <FieldLabel>Points per set</FieldLabel>
          <NumberInput
            value={v["format.pointsPerSet"] ?? 11}
            onChange={num("format.pointsPerSet")}
            min={1}
            disabled={locked}
          />
        </div>
      )}
      <div>
        <FieldLabel>Win by margin</FieldLabel>
        <NumberInput
          value={v["format.winByMargin"] ?? 2}
          onChange={num("format.winByMargin")}
          min={0}
          disabled={locked}
        />
      </div>
    </div>
  );
}

function LockedRulesGrid({ ruleBook, ruleBookValues }) {
  const { sections } = generateFormFields(ruleBook);
  if (!sections.length) {
    return (
      <div className="text-[12px] text-gray-400 italic px-1">
        No rule sections to display.
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.id}>
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-2">
            {section.title}
            {section.subtitle && (
              <span className="ml-2 text-gray-500 normal-case font-normal tracking-normal">
                ({section.subtitle})
              </span>
            )}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.fields.map((field) => {
              const value = ruleBookValues[field.path] ?? field.defaultValue;
              return (
                <div
                  key={field.path}
                  className={field.type === "multiselect" ? "sm:col-span-2" : ""}
                >
                  <FieldLabel>{field.label}</FieldLabel>
                  <LockedFieldDisplay field={field} value={value} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function LockedFieldDisplay({ field, value }) {
  if (field.type === "boolean") {
    return (
      <div className="px-3 h-9 inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-gray-300 w-full">
        {value ? "Yes" : "No"}
      </div>
    );
  }
  if (field.type === "multiselect" && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] min-h-[36px]">
        {value.length > 0 ? (
          value.map((v) => (
            <span
              key={v}
              className="text-[11px] text-gray-300 bg-white/[0.06] border border-white/[0.08] rounded-md px-1.5 py-0.5"
            >
              {v}
            </span>
          ))
        ) : (
          <span className="text-[12px] text-gray-500 italic">None</span>
        )}
      </div>
    );
  }
  return (
    <input
      type="text"
      value={value == null ? "" : String(value)}
      disabled
      className="w-full h-9 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-gray-300 cursor-not-allowed"
    />
  );
}

function SectionDBody({ sport, tournamentLevel, onUpdate, locked = false }) {
  if (tournamentLevel !== "unranked" && !sport.sportName) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-[12px] text-gray-300">
        Pick a sport above first — locked rules are looked up per sport + level.
      </div>
    );
  }
  if (tournamentLevel === "unranked") {
    return <UnrankedCustomRules sport={sport} onUpdate={onUpdate} locked={locked} />;
  }
  if (sport._loadingRuleBook) {
    return (
      <div className="flex items-center justify-center py-6 text-[12px] text-gray-400">
        <span
          className="inline-block w-3.5 h-3.5 mr-2 border-2 border-white/[0.16] rounded-full animate-spin"
          style={{ borderTopColor: SIG }}
        />
        Loading {tournamentLevel} rules for {sport.sportName}…
      </div>
    );
  }
  if (sport._ruleBookFetchAttempted && !sport._ruleBook) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-800">
        No locked rule book exists for{" "}
        <strong className="font-semibold">{sport.sportName}</strong> at{" "}
        <strong className="font-semibold">{tournamentLevel}</strong> level. Match
        format will use defaults.
      </div>
    );
  }
  if (sport._ruleBook) {
    return (
      <LockedRulesGrid
        ruleBook={sport._ruleBook}
        ruleBookValues={sport._ruleBookValues || {}}
      />
    );
  }
  return (
    <div className="flex items-center justify-center py-6 text-[12px] text-gray-500">
      Preparing…
    </div>
  );
}

// Every day from start to end inclusive, as "YYYY-MM-DD" (capped so a
// mistyped year can't build a huge dropdown).
function tournamentDays(start, end) {
  const s = dayjs(start);
  const e = dayjs(end);
  if (!start || !end || !s.isValid() || !e.isValid() || e.isBefore(s, "day")) return [];
  const days = [];
  for (let d = s; !d.isAfter(e, "day") && days.length < 62; d = d.add(1, "day")) {
    days.push(d.format("YYYY-MM-DD"));
  }
  return days;
}

export default function SportCard({
  sport,
  index,
  totalSports,
  sportsList,
  onUpdate,
  onRemove,
  onToggleExpand,
  errors = {},
  fixedLevels = ["district", "state", "national", "international", "unranked"],
  rulesLocked = false,
  tournamentStartDate = null,
  tournamentEndDate = null,
}) {
  // Per-category play day is only offered for multi-day tournaments.
  const eventDays = tournamentDays(tournamentStartDate, tournamentEndDate);
  const isMultiDay = eventDays.length > 1;
  const [isSectionDOpen, setIsSectionDOpen] = useState(false);
  const [categoryTemplates, setCategoryTemplates] = useState(
    () => CATEGORY_TEMPLATES_CACHE || []
  );

  useEffect(() => {
    let cancelled = false;
    fetchCategoryTemplates().then((tpls) => {
      if (!cancelled) setCategoryTemplates(tpls);
    });
    return () => { cancelled = true; };
  }, []);

  // Edit-mode bridge, run once the templates load. Two jobs:
  //
  //   1. A row with a name but no templateId whose name MATCHES a template gets
  //      back-linked, so the picker pre-selects correctly. Snapshot fields
  //      (minAge/maxAge/gender) are intentionally NOT refreshed — that
  //      preserves the rules in effect when the tournament was first saved.
  //
  //   2. A row whose name matches NOTHING is a custom category, so mark it as
  //      one and it renders as an editable custom row. This also covers rows
  //      saved before templates existed: they used to show as a dead "legacy"
  //      option that could only be replaced, which meant a tournament could
  //      not keep a category the SuperAdmin list does not contain.
  useEffect(() => {
    if (!categoryTemplates.length) return;
    const cats = sport.categories || [];
    if (!cats.length) return;
    let changed = false;
    const next = cats.map((c) => {
      if (c.templateId || c._customEntry || !c.name?.trim()) return c;
      const wanted = c.name.trim().toLowerCase();
      const match = categoryTemplates.find(
        (t) => t.label.trim().toLowerCase() === wanted
      );
      changed = true;
      return match
        ? { ...c, templateId: match._id }
        : { ...c, _customEntry: true };
    });
    if (changed) onUpdate({ categories: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryTemplates.length]);

  const tournamentLevel = sport.tournamentLevel || "";
  const isTeam = isTeamOnlySport(sport.sportName);
  const isIndividual = isIndividualOnlySport(sport.sportName);
  // Football (a team sport) offers real football formats: League (round-robin),
  // Single Knockout, or Group + Knockout — not Davis Cup / Singles-Doubles.
  const isFootball = /football|soccer/i.test(sport.sportName || "");
  const footballCard = !isFootball ? null
    : sport.type === "group stage" ? "league"
    : sport.type === "knockout + group stage" ? "groupKO"
    : sport.type === "knockout" ? "knockout"
    : null;

  const selectedTypeCard = (() => {
    const t = sport.type || "";
    const kf = sport.knockoutFormat || "";
    if (t === "knockout + group stage") return "groupKO";
    if (t === "knockout") {
      if (kf === "Davis Cup" || kf === "Teams Knockout") return "team";
      return "knockout";
    }
    return null;
  })();

  useEffect(() => {
    if (!isSectionDOpen) return;
    if (!sport.sportName || !tournamentLevel) return;
    if (sport._loadingRuleBook) return;
    if (sport._ruleBookFetchAttempted) return;

    if (tournamentLevel === "unranked") {
      const haveValues = Object.keys(sport._ruleBookValues || {}).length > 0;
      onUpdate({
        _ruleBookValues: haveValues
          ? sport._ruleBookValues
          : getUnrankedDefaults(sport.sportName),
        _ruleBookFetchAttempted: true,
      });
      return;
    }

    let cancelled = false;
    onUpdate({ _loadingRuleBook: true });

    axios
      .get(`/api/sport-rules/sport/${sport.sportName}/${tournamentLevel}`)
      .then((res) => {
        if (cancelled) return;
        const rb = res.data?.data || null;
        const { defaults } = rb ? generateFormFields(rb) : { defaults: {} };
        const existing = sport._ruleBookValues || {};
        const merged = Object.keys(existing).length > 0 ? existing : { ...defaults };
        onUpdate({
          _ruleBook: rb,
          _ruleBookValues: merged,
          _ruleBookErrors: {},
          _loadingRuleBook: false,
          _ruleBookFetchAttempted: true,
        });
      })
      .catch(() => {
        if (cancelled) return;
        onUpdate({
          _ruleBook: null,
          _loadingRuleBook: false,
          _ruleBookFetchAttempted: true,
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSectionDOpen, sport.sportName, tournamentLevel]);

  const onSportChange = useCallback(
    (newName) => {
      const isTeam2 = isTeamOnlySport(newName);
      const isIndiv2 = isIndividualOnlySport(newName);

      let newType = sport.type || "knockout + group stage";
      let newKnockoutFormat = sport.knockoutFormat || "Singles";
      let newGroupStageFormat = sport.groupStageFormat || "Singles";

      if (isTeam2) {
        newType = "knockout";
        newKnockoutFormat = "Teams Knockout";
        newGroupStageFormat = "Teams";
      } else if (
        isIndiv2 &&
        (newKnockoutFormat === "Davis Cup" || newKnockoutFormat === "Teams Knockout")
      ) {
        newType = "knockout";
        newKnockoutFormat = "Singles";
      }

      onUpdate({
        sportName: newName,
        sportSlug: slugifyForSport(newName),
        scoringType: scoringTypeFor(newName) || "sets",
        type: newType,
        knockoutFormat: newKnockoutFormat,
        groupStageFormat: newGroupStageFormat,
        _ruleBook: null,
        _ruleBookValues: {},
        _ruleBookErrors: {},
        _loadingRuleBook: false,
        _ruleBookFetchAttempted: false,
      });
    },
    [sport.type, sport.knockoutFormat, sport.groupStageFormat, onUpdate]
  );

  const onLevelChange = useCallback(
    (newLevel) => {
      onUpdate({
        tournamentLevel: newLevel,
        _ruleBook: null,
        _ruleBookErrors: {},
        _loadingRuleBook: false,
        _ruleBookFetchAttempted: false,
      });
    },
    [onUpdate]
  );

  const selectTypeCard = useCallback(
    (cardId) => {
      const koPreserve =
        sport.knockoutFormat === "Davis Cup" ||
        sport.knockoutFormat === "Teams Knockout"
          ? "Singles"
          : sport.knockoutFormat || "Singles";

      if (cardId === "groupKO") {
        onUpdate({
          type: "knockout + group stage",
          knockoutFormat: koPreserve,
          groupStageFormat: sport.groupStageFormat || "Singles",
        });
      } else if (cardId === "knockout") {
        onUpdate({
          type: "knockout",
          knockoutFormat: koPreserve,
        });
      } else if (cardId === "team") {
        onUpdate({
          type: "knockout",
          knockoutFormat: isTeam ? "Teams Knockout" : "Davis Cup",
        });
      }
    },
    [sport.knockoutFormat, sport.groupStageFormat, isTeam, onUpdate]
  );

  const addCategory = () => {
    // New rows start with no template picked. The manager must pick from the
    // SuperAdmin-controlled list — there is no free-form entry.
    const blank = { templateId: null, name: "", fee: 0, minAge: null, maxAge: null, gender: "any", date: null };
    onUpdate({
      categories: [
        ...(sport.categories || []),
        // In per-category mode a new row starts from the sport's settings
        // rather than blank, so adding a category never silently leaves its
        // format unset. (seedCategoryFormat is assigned below in the same
        // render; this only runs on click, after that.)
        sport.formatScope === "category" ? seedCategoryFormat(blank) : blank,
      ],
    });
  };

  // Turn a row into a custom category: no template behind it, the manager
  // names it and supplies the age/gender bounds a template would have carried.
  // `_customEntry` is UI-only — it marks intent while the name is still empty,
  // which is the one state a name-plus-no-templateId check cannot detect. The
  // submit payload in MCreateTournament is built field by field, so it never
  // reaches the API.
  const startCustomCategory = (i) => {
    onUpdate({
      categories: (sport.categories || []).map((c, idx) =>
        idx === i
          ? { ...c, _customEntry: true, templateId: null, name: "", minAge: null, maxAge: null, gender: "any" }
          : c
      ),
    });
  };

  // Apply a template to a category row — snapshots label + age + gender so
  // later deactivation of the template never changes the saved tournament.
  const applyCategoryTemplate = (i, templateId) => {
    if (!templateId) {
      onUpdate({
        categories: (sport.categories || []).map((c, idx) =>
          idx === i
            ? { ...c, _customEntry: false, templateId: null, name: "", minAge: null, maxAge: null, gender: "any" }
            : c
        ),
      });
      return;
    }
    const tpl = categoryTemplates.find((t) => String(t._id) === String(templateId));
    if (!tpl) return;
    onUpdate({
      categories: (sport.categories || []).map((c, idx) =>
        idx === i
          ? {
              ...c,
              _customEntry: false,
              templateId: tpl._id,
              name: tpl.label,
              minAge: tpl.minAge ?? null,
              maxAge: tpl.maxAge ?? null,
              gender: tpl.gender || "any",
            }
          : c
      ),
    });
  };

  // Fee is the only manager-editable field on a category row — age and gender
  // come from the template snapshot.
  const updateCategoryFee = (i, value) => {
    const fee = Math.max(0, Number(value) || 0);
    onUpdate({
      categories: (sport.categories || []).map((c, idx) =>
        idx === i ? { ...c, fee } : c
      ),
    });
  };
  const removeCategory = (i) => {
    if ((sport.categories || []).length <= 1) return;
    onUpdate({
      categories: (sport.categories || []).filter((_, idx) => idx !== i),
    });
  };

  // ── Where format is declared: once per sport, or under each category ──
  //
  // A sport track carries ONE format for all its categories, which cannot
  // express "Men's Doubles plays its group stage in singles and advances the
  // top 3, Women's Singles plays doubles and advances the top 2". The manager
  // picks the scope here and the fields move accordingly. On the server a null
  // category value means "inherit the track", so both modes stay valid data.
  const formatScope = sport.formatScope === "category" ? "category" : "sport";

  // Singles/doubles is meaningless for football and for the team-tie formats,
  // so the choice is only offered where it changes something.
  const supportsPerCategoryFormat =
    !isFootball && (selectedTypeCard === "groupKO" || selectedTypeCard === "knockout");

  // Values a category inherits when per-category mode is switched on: whatever
  // the manager already chose at sport level, so they start from their own
  // settings rather than an empty form.
  const seedCategoryFormat = (c) => ({
    ...c,
    type: c.type ?? sport.type ?? null,
    groupStageFormat:
      c.groupStageFormat ??
      (selectedTypeCard === "groupKO" ? sport.groupStageFormat || "Singles" : null),
    knockoutFormat: c.knockoutFormat ?? sport.knockoutFormat ?? "Singles",
    qualifyPerGroup:
      c.qualifyPerGroup ??
      (selectedTypeCard === "groupKO" ? Number(sport.qualifyPerGroup ?? 2) : null),
    drawSize: c.drawSize ?? (selectedTypeCard === "knockout" ? sport.drawSize ?? null : null),
  });

  const clearCategoryFormat = (c) => ({
    ...c,
    type: null,
    groupStageFormat: null,
    knockoutFormat: null,
    qualifyPerGroup: null,
    drawSize: null,
  });

  const changeFormatScope = (scope) => {
    if (scope === formatScope) return;
    onUpdate({
      formatScope: scope,
      // Going back to sport level drops the overrides, so the track value is
      // unambiguously the one that applies — otherwise a stale category value
      // would keep winning and the manager could not see why.
      categories: (sport.categories || []).map(
        scope === "category" ? seedCategoryFormat : clearCategoryFormat
      ),
    });
  };

  const updateCategory = (i, patch) => {
    onUpdate({
      categories: (sport.categories || []).map((c, idx) =>
        idx === i ? { ...c, ...patch } : c
      ),
    });
  };

  const categoryCount = sport.categories?.length || 0;

  return (
    <Card
      className="p-0 overflow-hidden border-l-2"
      data-sport-index={index}
      style={{ borderLeftColor: sport.sportName ? SIG : "rgba(255,255,255,0.10)" }}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={!!sport._expanded}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/[0.04] transition text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SportNumberBadge index={index + 1} />
          <span
            className={`text-[13px] font-semibold truncate ${
              sport.sportName ? "text-white" : "text-gray-500 italic"
            }`}
          >
            {sport.sportName || "Select a sport"}
          </span>
          <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400 flex-shrink-0">
            {categoryCount}{" "}
            {categoryCount === 1 ? "category" : "categories"}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            role="button"
            tabIndex={totalSports === 1 ? -1 : 0}
            aria-label="Remove sport"
            aria-disabled={totalSports === 1}
            onClick={(e) => {
              e.stopPropagation();
              if (totalSports === 1) return;
              onRemove();
            }}
            onKeyDown={(e) => {
              if (totalSports === 1) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }
            }}
            className={`inline-flex items-center justify-center h-7 w-7 rounded-md transition ${
              totalSports === 1
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-150 ease-out ${
              sport._expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <div
        style={{ display: sport._expanded ? "block" : "none" }}
        aria-hidden={!sport._expanded}
      >
        <div className="px-6 pb-6 pt-3 space-y-5 border-t border-white/[0.06]">
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor={`sport-${sport._key}`} required>
                Sport
              </FieldLabel>
              <Select
                id={`sport-${sport._key}`}
                value={sport.sportName || ""}
                onChange={(e) => onSportChange(e.target.value)}
                placeholder="Select a sport"
                options={(sportsList || []).map((s) => ({
                  value: s.name,
                  label: s.name,
                }))}
                error={errors.sportName}
              />
            </div>

            <div data-field-sport-level={index}>
              <FieldLabel required>Tournament level</FieldLabel>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {fixedLevels.map((level) => {
                  const selected = tournamentLevel === level;
                  const hasError = !!errors.tournamentLevel;
                  const display =
                    level === "unranked"
                      ? "Unranked"
                      : level.charAt(0).toUpperCase() + level.slice(1);
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => onLevelChange(level)}
                      aria-pressed={selected}
                      className={`h-8 px-2 rounded-lg text-[12px] font-medium border transition ${
                        selected
                          ? "border-transparent ring-2 text-white"
                          : hasError
                          ? "border-red-400/40 bg-red-500/10 text-gray-300 hover:border-red-400/50"
                          : "border-white/[0.08] bg-[#181A22] text-gray-300 hover:border-white/[0.16] hover:bg-white/[0.03]"
                      }`}
                      style={
                        selected
                          ? {
                              backgroundColor: SIG_TINT,
                              "--tw-ring-color": SIG,
                            }
                          : undefined
                      }
                    >
                      {display}
                    </button>
                  );
                })}
              </div>
              {errors.tournamentLevel && (
                <p className="text-[11px] text-red-400 mt-1.5 font-medium">
                  {errors.tournamentLevel}
                </p>
              )}
              {!errors.tournamentLevel && tournamentLevel === "unranked" && (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Custom rules — define your match format below.
                </p>
              )}
            </div>

            {sport.sportName && (
              <div>
                <FieldLabel>Tournament type</FieldLabel>
                {isTeam && !isFootball && (
                  <p className="text-[12px] text-gray-300 bg-white/[0.03] border border-white/[0.08] rounded-lg p-2.5 mb-2">
                    {sport.sportName} uses Team Knockout format.
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {isFootball ? (
                    <>
                      <OptionCard
                        icon="📋"
                        title="League"
                        description="Round-robin — every team plays every team"
                        selected={footballCard === "league"}
                        onClick={() => onUpdate({ type: "group stage", knockoutFormat: null, groupStageFormat: "Singles" })}
                      />
                      <OptionCard
                        icon="⚡"
                        title="Single knockout"
                        description="Direct team-vs-team elimination bracket"
                        selected={footballCard === "knockout"}
                        onClick={() => onUpdate({ type: "knockout", knockoutFormat: "Teams Knockout", groupStageFormat: null })}
                      />
                      <OptionCard
                        icon="🏆"
                        title="Group + knockout"
                        description="Round-robin groups, then knockout bracket"
                        selected={footballCard === "groupKO"}
                        onClick={() => onUpdate({ type: "knockout + group stage", knockoutFormat: "Teams Knockout", groupStageFormat: "Singles" })}
                      />
                    </>
                  ) : (
                    <>
                      {!isTeam && (
                        <OptionCard
                          icon="🏆"
                          title="Group stage + knockout"
                          description="Round-robin groups then elimination bracket"
                          selected={selectedTypeCard === "groupKO"}
                          onClick={() => selectTypeCard("groupKO")}
                        />
                      )}
                      {!isTeam && (
                        <OptionCard
                          icon="⚡"
                          title="Knockout only"
                          description="Direct elimination bracket"
                          selected={selectedTypeCard === "knockout"}
                          onClick={() => selectTypeCard("knockout")}
                        />
                      )}
                      {!isIndividual && (
                        <OptionCard
                          icon="🛡"
                          title={isTeam ? "Teams knockout" : "Team knockout"}
                          description={
                            isTeam
                              ? "Team-vs-team elimination bracket"
                              : "Davis Cup singles + doubles format"
                          }
                          selected={selectedTypeCard === "team"}
                          onClick={() => selectTypeCard("team")}
                        />
                      )}
                    </>
                  )}
                </div>
                {errors.type && (
                  <p className="text-[11px] text-red-400 mt-1.5 font-medium">
                    {errors.type}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Where the format is declared — one setting for the whole sport,
              or a separate one under each category. */}
          {supportsPerCategoryFormat && (
            <div className="space-y-2">
              <FieldLabel>Format applies to</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    key: "sport",
                    title: "The whole sport",
                    blurb: "One format for every category.",
                  },
                  {
                    key: "category",
                    title: "Each category",
                    blurb: "Set format per category.",
                  },
                ].map((opt) => {
                  const active = formatScope === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => changeFormatScope(opt.key)}
                      className={`text-left rounded-lg border px-3 py-2.5 transition ${
                        active
                          ? "bg-white/[0.07]"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]"
                      }`}
                      style={active ? { borderColor: SIG } : undefined}
                    >
                      <span
                        className="block text-[12px] font-semibold"
                        style={{ color: active ? SIG : "#E5E7EB" }}
                      >
                        {opt.title}
                      </span>
                      <span className="block text-[11px] text-gray-400 mt-0.5">
                        {opt.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
              {formatScope === "category" && (
                <p className="text-[11px] text-gray-400">
                  Each category below carries its own format — e.g. Men&apos;s
                  Doubles can run a singles group stage advancing the top 3,
                  while Women&apos;s Singles runs a doubles group stage
                  advancing the top 2.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <FieldLabel>Categories &amp; registration fees</FieldLabel>
            <p className="text-[11px] text-gray-500 -mt-1">
              Pick a SuperAdmin template — age + gender bounds are applied
              automatically — or choose <strong>Custom category…</strong> and
              set your own.
            </p>
            {categoryTemplates.length === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-[12px] text-amber-300">
                No active category templates exist yet — use{" "}
                <strong>Custom category…</strong> to add one by hand, or ask your
                SuperAdmin to seed templates under{" "}
                <strong>SuperAdmin · Category Templates</strong>.
              </div>
            )}
            <div className="space-y-2">
              {(sport.categories || []).map((cat, ci) => {
                const isFree = Number(cat.fee || 0) === 0;
                const nameError = errors[`categories[${ci}].name`];
                const dateError = errors[`categories[${ci}].date`];
                // A saved day that no longer falls inside the tournament dates
                // stays selectable (flagged) so it is visible, not silently lost.
                const staleDate = cat.date && !eventDays.includes(cat.date);
                // Build the set of already-used template IDs in this sport so
                // the picker can grey them out — no duplicates within one sport.
                const usedIds = new Set(
                  (sport.categories || [])
                    .map((c, ix) => (ix !== ci && c.templateId ? String(c.templateId) : null))
                    .filter(Boolean)
                );
                const selectedId = cat.templateId ? String(cat.templateId) : "";
                // If the row carries a templateId that's no longer in the
                // active list (template was deactivated after this row was
                // added) we still want to render its label rather than blank.
                const orphanedSelected =
                  selectedId &&
                  !categoryTemplates.some((t) => String(t._id) === selectedId);
                // A custom category: named by the manager, with no template
                // behind it. Also covers rows saved before templates existed —
                // those used to render as a dead "legacy" option that could
                // only be replaced, which meant a tournament could not keep a
                // category the SuperAdmin list does not contain.
                const isCustom = !!cat._customEntry;
                return (
                  <div key={ci}>
                    <div className="flex gap-2 items-center">
                      <select
                        value={isCustom ? CUSTOM_OPTION : selectedId}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === CUSTOM_OPTION) {
                            startCustomCategory(ci);
                            return;
                          }
                          applyCategoryTemplate(ci, v);
                        }}
                        aria-invalid={!!nameError || undefined}
                        className={`flex-1 h-9 px-3 rounded-lg border text-[13px] text-gray-100 focus:outline-none focus:ring-2 transition appearance-none ${
                          nameError
                            ? "border-red-400/50 bg-red-500/10"
                            : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.16]"
                        }`}
                        style={{
                          "--tw-ring-color": nameError
                            ? "rgba(239,68,68,0.25)"
                            : SIG_TINT_RING,
                        }}
                      >
                        <option value="" className="bg-[#181A22]">
                          {categoryTemplates.length === 0
                            ? "No templates available"
                            : "Select a category…"}
                        </option>
                        {orphanedSelected && (
                          <option value={selectedId} className="bg-[#181A22]">
                            {cat.name || "(removed template)"} · archived
                          </option>
                        )}
                        {categoryTemplates.map((tpl) => {
                          const used = usedIds.has(String(tpl._id));
                          return (
                            <option
                              key={tpl._id}
                              value={tpl._id}
                              disabled={used}
                              className="bg-[#181A22]"
                            >
                              {tpl.label}
                              {used ? " · already added" : ""}
                            </option>
                          );
                        })}
                        {/* Escape hatch for a category the SuperAdmin list does
                            not cover. The server never enforced the template
                            list — it accepts any name — so this only lifts a
                            restriction that lived in this dropdown. */}
                        <option value={CUSTOM_OPTION} className="bg-[#181A22]">
                          Custom category…
                        </option>
                      </select>
                      <div className="relative w-24 flex-shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[12px] pointer-events-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={cat.fee ?? 0}
                          onChange={(e) => updateCategoryFee(ci, e.target.value)}
                          className="w-full h-9 pl-6 pr-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[13px] font-mono tabular-nums text-gray-100 focus:outline-none focus:ring-2 transition"
                          style={{ "--tw-ring-color": SIG_TINT_RING }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = SIG; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = ""; }}
                        />
                      </div>
                      {isFree && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 rounded px-1.5 py-0.5 flex-shrink-0">
                          Free
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeCategory(ci)}
                        disabled={(sport.categories || []).length <= 1}
                        aria-label="Remove category"
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {nameError && (
                      <p className="text-[11px] text-red-400 mt-1 font-medium">
                        {nameError}
                      </p>
                    )}

                    {(isMultiDay || cat.date) && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <label
                          htmlFor={`cat-date-${sport._key}-${ci}`}
                          className="text-[11px] text-gray-400 flex-shrink-0"
                        >
                          Play day
                        </label>
                        <select
                          id={`cat-date-${sport._key}-${ci}`}
                          value={cat.date || ""}
                          onChange={(e) => updateCategory(ci, { date: e.target.value || null })}
                          aria-invalid={!!dateError || undefined}
                          className={`flex-1 h-8 px-2.5 rounded-lg border text-[12px] text-gray-100 focus:outline-none focus:ring-2 transition appearance-none ${
                            dateError || staleDate
                              ? "border-red-400/50 bg-red-500/10"
                              : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.16]"
                          }`}
                          style={{ "--tw-ring-color": SIG_TINT_RING }}
                        >
                          <option value="" className="bg-[#181A22]">
                            All tournament days
                          </option>
                          {staleDate && (
                            <option value={cat.date} className="bg-[#181A22]">
                              {dayjs(cat.date).format("ddd, D MMM YYYY")} · outside tournament dates
                            </option>
                          )}
                          {eventDays.map((d) => (
                            <option key={d} value={d} className="bg-[#181A22]">
                              {dayjs(d).format("ddd, D MMM YYYY")}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {dateError && (
                      <p className="text-[11px] text-red-400 mt-1 font-medium">
                        {dateError}
                      </p>
                    )}

                    {/* Custom category: the manager supplies what a template
                        would otherwise have provided. Age + gender are not
                        cosmetic — the server rejects ineligible players at
                        booking from these values, so leaving them blank makes
                        the category open to everyone rather than unchecked. */}
                    {isCustom && (
                      <div className="mt-2 ml-0.5 pl-3 border-l-2 border-white/[0.06] space-y-2.5">
                        <div>
                          <FieldLabel htmlFor={`cat-name-${sport._key}-${ci}`}>
                            Category name
                          </FieldLabel>
                          <input
                            id={`cat-name-${sport._key}-${ci}`}
                            type="text"
                            value={cat.name || ""}
                            onChange={(e) => updateCategory(ci, { name: e.target.value })}
                            placeholder="e.g. Corporate Doubles"
                            className={`w-full h-9 px-3 rounded-lg border text-[13px] text-gray-100 focus:outline-none focus:ring-2 transition ${
                              nameError
                                ? "border-red-400/50 bg-red-500/10"
                                : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.16]"
                            }`}
                            style={{ "--tw-ring-color": SIG_TINT_RING }}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <FieldLabel htmlFor={`cat-minage-${sport._key}-${ci}`}>
                              Min age
                            </FieldLabel>
                            <input
                              id={`cat-minage-${sport._key}-${ci}`}
                              type="number"
                              min="0"
                              value={cat.minAge ?? ""}
                              onChange={(e) =>
                                updateCategory(ci, {
                                  minAge: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                              placeholder="Any"
                              className="w-full h-9 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[13px] font-mono tabular-nums text-gray-100 focus:outline-none focus:ring-2 transition"
                              style={{ "--tw-ring-color": SIG_TINT_RING }}
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor={`cat-maxage-${sport._key}-${ci}`}>
                              Max age
                            </FieldLabel>
                            <input
                              id={`cat-maxage-${sport._key}-${ci}`}
                              type="number"
                              min="0"
                              value={cat.maxAge ?? ""}
                              onChange={(e) =>
                                updateCategory(ci, {
                                  maxAge: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                              placeholder="Any"
                              className="w-full h-9 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[13px] font-mono tabular-nums text-gray-100 focus:outline-none focus:ring-2 transition"
                              style={{ "--tw-ring-color": SIG_TINT_RING }}
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor={`cat-gender-${sport._key}-${ci}`}>
                              Gender
                            </FieldLabel>
                            <Select
                              id={`cat-gender-${sport._key}-${ci}`}
                              value={cat.gender || "any"}
                              onChange={(e) => updateCategory(ci, { gender: e.target.value })}
                              options={[
                                { value: "any", label: "Any" },
                                { value: "male", label: "Male" },
                                { value: "female", label: "Female" },
                              ]}
                            />
                          </div>
                        </div>

                        {errors[`categories[${ci}].ageRange`] && (
                          <p className="text-[11px] text-red-400 font-medium">
                            {errors[`categories[${ci}].ageRange`]}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500">
                          Leave age and gender empty to open this category to everyone.
                        </p>
                      </div>
                    )}

                    {!isCustom && selectedId && (
                      <p className="text-[11px] text-gray-500 mt-1 pl-0.5">
                        {categoryBoundsSummary(cat)}
                      </p>
                    )}

                    {/* Per-category format. Only rendered once the row has a
                        category — the fields make no sense on a blank row, and
                        an unnamed category cannot be resolved on the server
                        (the name is the link to the category row). A custom row
                        qualifies as soon as it has been named. */}
                    {supportsPerCategoryFormat &&
                      formatScope === "category" &&
                      (selectedId || (isCustom && !!cat.name?.trim())) && (
                        <div className="mt-2 ml-0.5 pl-3 border-l-2 border-white/[0.06] space-y-2.5">
                          {selectedTypeCard === "groupKO" && (
                            <>
                              <div>
                                <FieldLabel htmlFor={`cat-gsformat-${sport._key}-${ci}`}>
                                  Group stage format
                                </FieldLabel>
                                <Select
                                  id={`cat-gsformat-${sport._key}-${ci}`}
                                  value={cat.groupStageFormat || "Singles"}
                                  onChange={(e) =>
                                    updateCategory(ci, { groupStageFormat: e.target.value })
                                  }
                                  options={["Singles", "Doubles"]}
                                />
                              </div>
                              <div>
                                <FieldLabel htmlFor={`cat-qpg-${sport._key}-${ci}`}>
                                  Qualify per group
                                </FieldLabel>
                                <Select
                                  id={`cat-qpg-${sport._key}-${ci}`}
                                  value={String(cat.qualifyPerGroup ?? 2)}
                                  onChange={(e) =>
                                    updateCategory(ci, {
                                      qualifyPerGroup: Number(e.target.value),
                                    })
                                  }
                                  options={[
                                    { value: "1", label: "Top 1" },
                                    { value: "2", label: "Top 2" },
                                    { value: "3", label: "Top 3" },
                                    { value: "4", label: "Top 4" },
                                  ]}
                                />
                              </div>
                            </>
                          )}

                          <div>
                            <FieldLabel htmlFor={`cat-koformat-${sport._key}-${ci}`}>
                              Knockout format
                            </FieldLabel>
                            <Select
                              id={`cat-koformat-${sport._key}-${ci}`}
                              value={cat.knockoutFormat || "Singles"}
                              onChange={(e) =>
                                updateCategory(ci, { knockoutFormat: e.target.value })
                              }
                              options={["Singles", "Doubles"]}
                            />
                          </div>

                          {selectedTypeCard === "knockout" && (
                            <div>
                              <FieldLabel htmlFor={`cat-drawsize-${sport._key}-${ci}`}>
                                Draw size
                              </FieldLabel>
                              <Select
                                id={`cat-drawsize-${sport._key}-${ci}`}
                                value={cat.drawSize == null ? "" : String(cat.drawSize)}
                                onChange={(e) =>
                                  updateCategory(ci, {
                                    drawSize:
                                      e.target.value === "" ? null : Number(e.target.value),
                                  })
                                }
                                options={[
                                  { value: "", label: "Auto" },
                                  { value: "16", label: "16" },
                                  { value: "32", label: "32" },
                                  { value: "64", label: "64" },
                                ]}
                              />
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
            {errors.categories && (
              <p className="text-[11px] text-red-400 font-medium">
                {errors.categories}
              </p>
            )}
            <DashedAddButton onClick={addCategory}>
              Add category
            </DashedAddButton>
          </div>

          {/* Football: format-specific config (no Singles/Doubles — it's teams). */}
          {isFootball && footballCard && (
            <div className="space-y-3.5 pt-1">
              {footballCard === "league" && (
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-gray-300">
                    Every team plays every other team once. Final standings by points
                    (3 win / 1 draw / 0 loss), then head-to-head, then goal difference.
                  </p>
                </div>
              )}
              {footballCard === "groupKO" && (
                <div>
                  <FieldLabel htmlFor={`qpg-${sport._key}`}>Qualify per group</FieldLabel>
                  <Select
                    id={`qpg-${sport._key}`}
                    value={String(sport.qualifyPerGroup ?? 2)}
                    onChange={(e) => onUpdate({ qualifyPerGroup: Number(e.target.value) })}
                    options={[
                      { value: "1", label: "Top 1" },
                      { value: "2", label: "Top 2" },
                      { value: "3", label: "Top 3" },
                      { value: "4", label: "Top 4" },
                    ]}
                  />
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Top N teams from each group advance to a team-vs-team knockout bracket.
                  </p>
                </div>
              )}
              {footballCard === "knockout" && (
                <div>
                  <FieldLabel htmlFor={`drawsize-fb-${sport._key}`}>Draw size</FieldLabel>
                  <Select
                    id={`drawsize-fb-${sport._key}`}
                    value={sport.drawSize == null ? "" : String(sport.drawSize)}
                    onChange={(e) => onUpdate({ drawSize: e.target.value === "" ? null : Number(e.target.value) })}
                    options={[
                      { value: "", label: "Auto" },
                      { value: "8", label: "8" },
                      { value: "16", label: "16" },
                      { value: "32", label: "32" },
                    ]}
                  />
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Single-elimination bracket. A level knockout match is decided on penalties.
                  </p>
                </div>
              )}
            </div>
          )}

          {!!(sport.sportName && selectedTypeCard && !isFootball) && (
            <div>
              {/* Sport-level format — replaced by the per-category fields in
                  the category list above when the manager picks that scope. */}
              {selectedTypeCard === "groupKO" && formatScope === "sport" && (
                <div className="space-y-3.5 pt-1">
                  <div>
                    <FieldLabel htmlFor={`gsformat-${sport._key}`}>
                      Group stage format
                    </FieldLabel>
                    <Select
                      id={`gsformat-${sport._key}`}
                      value={sport.groupStageFormat || "Singles"}
                      onChange={(e) =>
                        onUpdate({ groupStageFormat: e.target.value })
                      }
                      options={["Singles", "Doubles"]}
                    />
                  </div>
                  <div className="pl-3 border-l-2 border-white/[0.06]">
                    <FieldLabel htmlFor={`qpg-${sport._key}`}>
                      Qualify per group
                    </FieldLabel>
                    <Select
                      id={`qpg-${sport._key}`}
                      value={String(sport.qualifyPerGroup ?? 2)}
                      onChange={(e) =>
                        onUpdate({ qualifyPerGroup: Number(e.target.value) })
                      }
                      options={[
                        { value: "1", label: "Top 1" },
                        { value: "2", label: "Top 2" },
                        { value: "3", label: "Top 3" },
                        { value: "4", label: "Top 4" },
                      ]}
                    />
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      Top N players from each group advance to knockout.
                    </p>
                  </div>
                  <div>
                    <FieldLabel htmlFor={`koformat-${sport._key}`}>
                      Knockout format
                    </FieldLabel>
                    <Select
                      id={`koformat-${sport._key}`}
                      value={sport.knockoutFormat || "Singles"}
                      onChange={(e) =>
                        onUpdate({ knockoutFormat: e.target.value })
                      }
                      options={["Singles", "Doubles"]}
                    />
                  </div>
                </div>
              )}

              {selectedTypeCard === "knockout" && formatScope === "sport" && (
                <div className="space-y-3.5 pt-1">
                  <div>
                    <FieldLabel htmlFor={`koformat-${sport._key}`}>
                      Knockout format
                    </FieldLabel>
                    <Select
                      id={`koformat-${sport._key}`}
                      value={sport.knockoutFormat || "Singles"}
                      onChange={(e) =>
                        onUpdate({ knockoutFormat: e.target.value })
                      }
                      options={["Singles", "Doubles"]}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor={`drawsize-${sport._key}`}>
                      Draw size
                    </FieldLabel>
                    <Select
                      id={`drawsize-${sport._key}`}
                      value={sport.drawSize == null ? "" : String(sport.drawSize)}
                      onChange={(e) =>
                        onUpdate({
                          drawSize:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      options={[
                        { value: "", label: "Auto" },
                        { value: "16", label: "16" },
                        { value: "32", label: "32" },
                        { value: "64", label: "64" },
                      ]}
                    />
                  </div>
                </div>
              )}

              {selectedTypeCard === "team" && !isTeam && (
                <div className="pt-1">
                  <TeamKnockoutFormatSelector
                    value={sport.davisCupFormatId || ""}
                    onChange={(id) => onUpdate({ davisCupFormatId: id })}
                  />
                </div>
              )}

              {selectedTypeCard === "team" && isTeam && (
                <div className="pt-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-gray-300">
                    Teams compete head-to-head in a single elimination bracket.
                    No additional format selection needed.
                  </p>
                </div>
              )}
            </div>
          )}

          {!tournamentLevel ? (
            <div className="bg-white/[0.03] px-3 h-9 inline-flex items-center w-full rounded-lg border border-white/[0.08]">
              <span className="text-[12px] font-medium text-gray-400">
                Select a tournament level to configure rules
              </span>
            </div>
          ) : (
            <div>
              <ExpandableSection
                open={isSectionDOpen}
                onToggle={() => setIsSectionDOpen((o) => !o)}
                label={
                  tournamentLevel === "unranked"
                    ? rulesLocked
                      ? "Custom match format · Locked"
                      : "Custom match format"
                    : "Sport rules · Locked"
                }
                animate={false}
              >
                <SectionDBody
                  sport={sport}
                  tournamentLevel={tournamentLevel}
                  onUpdate={onUpdate}
                  locked={rulesLocked}
                />
              </ExpandableSection>
              {errors.ruleBook && (
                <p className="text-[11px] text-red-400 mt-1.5 font-medium">
                  {errors.ruleBook}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
