import React, { useState, useRef } from "react";
import { Trophy, Check, Sparkles, ZoomIn, ZoomOut, RotateCcw, Download, Loader2, Pencil, Save, X } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "react-toastify";

const ROUND_ORDER = [
  "round-of-128",
  "round-of-64",
  "round-of-32",
  "round-of-16",
  "round-of-8",
  "quarter-final",
  "semi-final",
  "final",
];

const CARD_H = 82;     // Height of each match card box (px)
const CARD_W = 220;    // Width of each match card box (px)
const COL_GAP = 56;    // Horizontal gap between round columns (px)
const VERT_GAP = 24;   // Gap between base matches in round 0 (px)
const BASE_SLOT = CARD_H + VERT_GAP; // 106px base slot height
const HEADER_OFFSET = 54; // Space at top for round headers (px)

const getRoundPrefix = (roundKey) => {
  const map = {
    "round-of-128": "R128",
    "round-of-64": "R64",
    "round-of-32": "R32",
    "round-of-16": "R16",
    "round-of-8": "QF",
    "quarter-final": "QF",
    "semi-final": "SF",
    "final": "F",
  };
  return map[roundKey] || (roundKey ? roundKey.toUpperCase() : "M");
};

const formatMatchMeta = (match, roundKey) => {
  const parts = [];
  parts.push(getRoundPrefix(roundKey));
  parts.push(`Game ${match.matchNumber || 1}`);
  if (match.courtNumber) {
    parts.push(`Court ${match.courtNumber}`);
  }
  if (match.matchStartTime) {
    try {
      const d = new Date(match.matchStartTime);
      parts.push(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {}
  }
  return parts.join(" · ");
};

function MatchCard({ match, onClick, onEditPlayer, roundKey, matchIndex, isFirstRound }) {
  const p1 = match.player1?.playerName || "TBD";
  const p2 = match.player2?.playerName || "TBD";
  const winner = match.result?.winner?.playerName;
  const isCompleted = match.status === "COMPLETED";
  const isBye = match.notes?.includes("BYE");

  const p1IsWinner = winner && (winner === p1 || winner === match.player1?.userName);
  const p2IsWinner = winner && (winner === p2 || winner === match.player2?.userName);

  const p1Score = match.result?.finalScore?.player1Sets ?? match.result?.player1Score ?? "";
  const p2Score = match.result?.finalScore?.player2Sets ?? match.result?.player2Score ?? "";

  const metaText = formatMatchMeta(match, roundKey);

  // Sr No / Seed badge calculation:
  const p1Sr = match.player1?.seed
    ? `[${match.player1.seed}]`
    : match.player1?.srNo
    ? `${match.player1.srNo}`
    : isFirstRound
    ? `${matchIndex * 2 + 1}`
    : null;

  const p2Sr = match.player2?.seed
    ? `[${match.player2.seed}]`
    : match.player2?.srNo
    ? `${match.player2.srNo}`
    : isFirstRound
    ? `${matchIndex * 2 + 2}`
    : null;

  return (
    <div
      onClick={() => onClick && onClick(match)}
      className={`relative rounded-lg border transition-all duration-200 cursor-pointer shadow-sm select-none group hover:border-emerald-500/60 overflow-hidden flex flex-col justify-between ${
        isCompleted
          ? "border-emerald-500/40 bg-[#111622]"
          : match.player1?.playerName && match.player1.playerName !== "TBD"
          ? "border-white/15 bg-[#141724]"
          : "border-white/10 bg-[#0F111A] opacity-80"
      }`}
      style={{ width: CARD_W, height: CARD_H }}
    >
      {/* PDF Meta Label Line: R64 · Game 1 · Court 1 · 09:00 AM */}
      <div className="px-2.5 h-[22px] border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
        <span className="text-[9px] font-semibold text-gray-400 truncate tracking-wide leading-none">
          {metaText}
        </span>
        {isBye && (
          <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded leading-none">
            BYE
          </span>
        )}
      </div>

      {/* Player 1 Row */}
      <div
        className={`flex items-center justify-between px-2.5 h-[28px] group/p1 ${
          p1IsWinner
            ? "text-emerald-400 font-bold bg-emerald-500/10"
            : p1 === "TBD"
            ? "text-gray-500"
            : "text-gray-200"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate max-w-[165px]">
          {p1Sr && (
            <span className="text-[9px] font-extrabold text-gray-400 bg-white/[0.08] px-1 py-0.2 rounded text-center min-w-[16px] flex-shrink-0 leading-none">
              {p1Sr}
            </span>
          )}
          <span className="text-[11px] truncate font-medium tracking-wide leading-tight">
            {p1}
          </span>
          {onEditPlayer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditPlayer(match, "player1", p1);
              }}
              className="opacity-0 group-hover/p1:opacity-100 p-0.5 hover:bg-white/20 rounded text-gray-400 hover:text-white transition-opacity w-auto"
              title="Edit Player 1 Name"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <span className="text-[11px] font-bold ml-1 text-right min-w-[14px]">
          {p1Score !== "" ? p1Score : isCompleted || isBye ? "0" : ""}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mx-2" />

      {/* Player 2 Row */}
      <div
        className={`flex items-center justify-between px-2.5 h-[28px] group/p2 ${
          p2IsWinner
            ? "text-emerald-400 font-bold bg-emerald-500/10"
            : p2 === "TBD"
            ? "text-gray-500"
            : "text-gray-200"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate max-w-[165px]">
          {p2Sr && (
            <span className="text-[9px] font-extrabold text-gray-400 bg-white/[0.08] px-1 py-0.2 rounded text-center min-w-[16px] flex-shrink-0 leading-none">
              {p2Sr}
            </span>
          )}
          <span className="text-[11px] truncate font-medium tracking-wide leading-tight">
            {p2}
          </span>
          {onEditPlayer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditPlayer(match, "player2", p2);
              }}
              className="opacity-0 group-hover/p2:opacity-100 p-0.5 hover:bg-white/20 rounded text-gray-400 hover:text-white transition-opacity w-auto"
              title="Edit Player 2 Name"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <span className="text-[11px] font-bold ml-1 text-right min-w-[14px]">
          {p2Score !== "" ? p2Score : isCompleted || isBye ? "0" : ""}
        </span>
      </div>
    </div>
  );
}

export default function BracketTree({
  matchesByRound,
  onMatchClick,
  onEditPlayerName,
  getRoundName,
  tournamentTitle,
  sportName,
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [editingPlayerModal, setEditingPlayerModal] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const bracketRef = useRef(null);

  const handleOpenEditModal = (match, playerSlot, currentName) => {
    setEditingPlayerModal({ match, playerSlot, currentName });
    setEditingName(currentName === "TBD" ? "" : currentName);
  };

  const handleSavePlayerName = async () => {
    if (!editingPlayerModal || !editingName.trim()) return;
    setIsSavingName(true);
    try {
      if (onEditPlayerName) {
        await onEditPlayerName(
          editingPlayerModal.match,
          editingPlayerModal.playerSlot,
          editingName.trim()
        );
      }
      setEditingPlayerModal(null);
    } catch (err) {
      console.error("Save player error:", err);
    } finally {
      setIsSavingName(false);
    }
  };

  // Download PDF Handler
  const handleDownloadPDF = async () => {
    if (!bracketRef.current) return;
    setExporting(true);
    try {
      const currentZoom = zoomLevel;
      setZoomLevel(1);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const element = bracketRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0B0D14",
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      setZoomLevel(currentZoom);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "l" : "p",
        unit: "mm",
        format: [canvas.width * 0.264583, canvas.height * 0.264583],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width * 0.264583, canvas.height * 0.264583);
      
      const titleStr = (tournamentTitle || "Tournament").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const sportStr = (sportName || "Knockout").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      
      pdf.save(`${titleStr}_${sportStr}_Knockout_Bracket.pdf`);
      toast.success("Knockout bracket exported as PDF!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export bracket PDF");
    } finally {
      setExporting(false);
    }
  };

  // ── 1. Sort rounds into correct tournament order ────────────────────────
  const sortedRounds = Object.keys(matchesByRound || {}).sort((a, b) => {
    const ai = ROUND_ORDER.indexOf(a);
    const bi = ROUND_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  if (sortedRounds.length === 0) {
    return null;
  }

  const totalRounds = sortedRounds.length;
  const firstRoundMatches = matchesByRound[sortedRounds[0]] || [];
  const firstRoundCount = Math.max(firstRoundMatches.length, 1);

  // ── 2. Calculate Layout Heights and Positions ───────────────────────────
  const totalBaseHeight = HEADER_OFFSET + firstRoundCount * BASE_SLOT + 40;
  const totalWidth = (totalRounds + 1) * (CARD_W + COL_GAP) + 80;

  const getCenterY = (r, i) => {
    const factor = Math.pow(2, r);
    const midSlotIndex = i * factor + (factor - 1) / 2;
    return HEADER_OFFSET + midSlotIndex * BASE_SLOT + CARD_H / 2;
  };

  const getTopY = (r, i) => {
    return getCenterY(r, i) - CARD_H / 2;
  };

  // ── 3. Build SVG Connector Lines ───────────────────────────────────────
  const lineElements = [];
  for (let r = 0; r < totalRounds - 1; r++) {
    const childMatches = matchesByRound[sortedRounds[r + 1]] || [];
    for (let ci = 0; ci < childMatches.length; ci++) {
      const childMatch = childMatches[ci];
      const srcAIndex = ci * 2;
      const srcBIndex = ci * 2 + 1;

      const yA = getCenterY(r, srcAIndex);
      const yB = getCenterY(r, srcBIndex);
      const yC = getCenterY(r + 1, ci);

      const xSrc = r * (CARD_W + COL_GAP) + CARD_W;
      const xDst = (r + 1) * (CARD_W + COL_GAP);
      const xMid = xSrc + COL_GAP / 2;

      const isChildDone = childMatch?.status === "COMPLETED";
      const strokeColor = isChildDone ? "#10b981" : "rgba(255, 255, 255, 0.2)";
      const strokeWidth = isChildDone ? "2" : "1.5";

      lineElements.push(
        <g key={`bracket-line-${r}-${ci}`}>
          {/* Top parent right line */}
          <line
            x1={xSrc}
            y1={yA}
            x2={xMid}
            y2={yA}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          {/* Bottom parent right line */}
          <line
            x1={xSrc}
            y1={yB}
            x2={xMid}
            y2={yB}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          {/* Vertical connecting bar */}
          <line
            x1={xMid}
            y1={yA}
            x2={xMid}
            y2={yB}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          {/* Horizontal line into child match */}
          <line
            x1={xMid}
            y1={yC}
            x2={xDst}
            y2={yC}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    }
  }

  // Champion details
  const finalRoundKey = sortedRounds[totalRounds - 1];
  const finalMatch = (matchesByRound[finalRoundKey] || [])[0];
  const championName = finalMatch?.result?.winner?.playerName;
  const finalCenterY = getCenterY(totalRounds - 1, 0);

  const champLeft = totalRounds * (CARD_W + COL_GAP);
  const champTop = finalCenterY - 38;

  if (championName) {
    lineElements.push(
      <line
        key="line-champion"
        x1={(totalRounds - 1) * (CARD_W + COL_GAP) + CARD_W}
        y1={finalCenterY}
        x2={champLeft}
        y2={finalCenterY}
        stroke="#10b981"
        strokeWidth="2"
      />
    );
  }

  return (
    <div className="bg-[#0B0D14] rounded-2xl border border-white/[0.08] p-5 relative overflow-hidden shadow-2xl">
      {/* Top Controls Toolbar */}
      <div className="mb-4 pb-4 border-b border-white/[0.08] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Interactive Knockout Tree
          </span>
        </div>

        {/* Zoom & PDF Download Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md w-auto disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {exporting ? "Generating PDF..." : "Download PDF"}
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all w-auto"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-gray-400 w-10 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all w-auto"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all w-auto ml-1"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Bracket Canvas Container (Captured by html2canvas) */}
      <div className="overflow-x-auto overflow-y-auto max-h-[800px] pb-6 custom-scrollbar">
        <div
          ref={bracketRef}
          style={{
            backgroundColor: "#0B0D14",
            padding: "24px",
            minWidth: totalWidth + 48,
          }}
          className="rounded-xl"
        >
          {/* Document PDF Header Banner inside Bracket Canvas */}
          <div className="mb-6 pb-4 border-b border-white/10">
            <h1 className="text-lg font-bold text-white tracking-wide">
              {tournamentTitle || "Multi-Sport Championship"}{sportName ? ` — ${sportName}` : ""}
            </h1>
            <p className="text-xs text-gray-400 font-medium tracking-wider uppercase">
              Bracket — Knockout Bracket
            </p>
          </div>

          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left",
              width: totalWidth,
              height: totalBaseHeight,
              position: "relative",
            }}
            className="transition-transform duration-150 ease-out"
          >
            {/* SVG Connectors */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: totalWidth,
                height: totalBaseHeight,
                pointerEvents: "none",
                overflow: "visible",
              }}
            >
              {lineElements}
            </svg>

            {/* Column Round Titles */}
            {sortedRounds.map((roundKey, r) => {
              const displayName = getRoundName ? getRoundName(roundKey) : roundKey;
              return (
                <div
                  key={`header-${roundKey}`}
                  style={{
                    position: "absolute",
                    left: r * (CARD_W + COL_GAP),
                    top: 0,
                    width: CARD_W,
                  }}
                  className="text-left"
                >
                  <div className="text-xs font-bold text-gray-300 uppercase tracking-wider py-1 border-b border-white/10">
                    {displayName}
                  </div>
                </div>
              );
            })}

            {/* Header for Champion Column */}
            <div
              style={{
                position: "absolute",
                left: champLeft,
                top: 0,
                width: 170,
              }}
              className="text-left"
            >
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider py-1 border-b border-emerald-500/30">
                Champion
              </div>
            </div>

            {/* Match Cards Grid */}
            {sortedRounds.map((roundKey, r) => {
              const roundMatches = matchesByRound[roundKey] || [];
              return roundMatches.map((match, i) => {
                const top = getTopY(r, i);
                const left = r * (CARD_W + COL_GAP);
                return (
                  <div
                    key={match._id || `${roundKey}-${i}`}
                    style={{
                      position: "absolute",
                      top,
                      left,
                      width: CARD_W,
                      height: CARD_H,
                    }}
                  >
                    <MatchCard
                      match={match}
                      onClick={onMatchClick}
                      onEditPlayer={onEditPlayerName ? handleOpenEditModal : null}
                      roundKey={roundKey}
                      matchIndex={i}
                      isFirstRound={r === 0}
                    />
                  </div>
                );
              });
            })}

            {/* Champion Box */}
            <div
              style={{
                position: "absolute",
                top: champTop,
                left: champLeft,
                width: 170,
              }}
              className={`rounded-lg border p-3 text-center shadow-lg transition-all ${
                championName
                  ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300"
                  : "bg-[#141724] border-white/10 text-gray-500"
              }`}
            >
              <div className="flex justify-center mb-1">
                <Trophy
                  className={`w-5 h-5 ${
                    championName ? "text-emerald-400" : "text-gray-600"
                  }`}
                />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                Champion
              </p>
              <p className="text-xs font-bold truncate">
                {championName || "TBD"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Player Name Modal */}
      {editingPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#141724] border border-white/15 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Edit {editingPlayerModal.playerSlot === "player1" ? "Player 1 / Team A" : "Player 2 / Team B"} Name
                </h3>
              </div>
              <button
                onClick={() => setEditingPlayerModal(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 w-auto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">
                Player / Team Name
              </label>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0D14] border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Enter player/team name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSavePlayerName();
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingPlayerModal(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlayerName}
                disabled={!editingName.trim() || isSavingName}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold w-auto flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


