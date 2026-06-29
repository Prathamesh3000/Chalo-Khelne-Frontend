import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Trash2, ChevronDown } from "lucide-react";
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
import {
  isTeamOnlySport,
  isIndividualOnlySport,
  isNestedSetSport,
  SPORT_SCORING_TYPES,
  slugifyForSport,
  getUnrankedDefaults,
} from "./sportClassification";

const SIG = "#F97316";
const SIG_TINT = "rgba(249,115,22,0.10)";
const SIG_TINT_RING = "rgba(249,115,22,0.25)";

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
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
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
  const scoringType = sport.scoringType || SPORT_SCORING_TYPES[sport.sportName] || "sets";

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
}) {
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

  // Edit-mode bridge: existing categories created before templates existed
  // have a name but no templateId. Once templates load, look up each unlinked
  // row by label (case-insensitive) and back-link the templateId so the
  // picker pre-selects correctly. Snapshot fields (minAge/maxAge/gender) are
  // intentionally NOT refreshed — preserves the rules in effect when the
  // tournament was first saved.
  useEffect(() => {
    if (!categoryTemplates.length) return;
    const cats = sport.categories || [];
    if (!cats.length) return;
    let changed = false;
    const next = cats.map((c) => {
      if (c.templateId || !c.name?.trim()) return c;
      const wanted = c.name.trim().toLowerCase();
      const match = categoryTemplates.find(
        (t) => t.label.trim().toLowerCase() === wanted
      );
      if (!match) return c;
      changed = true;
      return { ...c, templateId: match._id };
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
        scoringType: SPORT_SCORING_TYPES[newName] || "sets",
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
    onUpdate({
      categories: [
        ...(sport.categories || []),
        { templateId: null, name: "", fee: 0, minAge: null, maxAge: null, gender: "any" },
      ],
    });
  };

  // Apply a template to a category row — snapshots label + age + gender so
  // later deactivation of the template never changes the saved tournament.
  const applyCategoryTemplate = (i, templateId) => {
    if (!templateId) {
      onUpdate({
        categories: (sport.categories || []).map((c, idx) =>
          idx === i
            ? { ...c, templateId: null, name: "", minAge: null, maxAge: null, gender: "any" }
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

          <div className="space-y-2.5">
            <FieldLabel>Categories &amp; registration fees</FieldLabel>
            <p className="text-[11px] text-gray-500 -mt-1">
              Pick from the SuperAdmin-approved templates — age + gender bounds
              are applied automatically.
            </p>
            {categoryTemplates.length === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-[12px] text-amber-300">
                No active category templates exist yet. Ask your SuperAdmin to
                seed templates under <strong>SuperAdmin · Category Templates</strong>.
              </div>
            )}
            <div className="space-y-2">
              {(sport.categories || []).map((cat, ci) => {
                const isFree = Number(cat.fee || 0) === 0;
                const nameError = errors[`categories[${ci}].name`];
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
                // Legacy row: no templateId, but a name like "Open Category"
                // saved from before templates existed AND no matching label.
                // Surface it as a non-pickable option so the manager can see
                // what is currently set and then pick a real template.
                const legacyUnlinked =
                  !selectedId &&
                  !!cat.name?.trim() &&
                  !categoryTemplates.some(
                    (t) => t.label.trim().toLowerCase() === cat.name.trim().toLowerCase()
                  );
                return (
                  <div key={ci}>
                    <div className="flex gap-2 items-center">
                      <select
                        value={selectedId || (legacyUnlinked ? `__legacy_${ci}` : "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v.startsWith("__legacy_")) return; // legacy option is informational only
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
                        {legacyUnlinked && (
                          <option value={`__legacy_${ci}`} className="bg-[#181A22]" disabled>
                            {cat.name} · legacy (pick a template to migrate)
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
                    {(selectedId || legacyUnlinked) && (
                      <p className="text-[11px] text-gray-500 mt-1 pl-0.5">
                        {categoryBoundsSummary(cat)}
                      </p>
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
              {selectedTypeCard === "groupKO" && (
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

              {selectedTypeCard === "knockout" && (
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
