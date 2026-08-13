import React, { useState, useRef } from "react";
import { Trophy, Check, Sparkles, ZoomIn, ZoomOut, RotateCcw, Download, Loader2, Pencil, Save, X, GripVertical } from "lucide-react";
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

// Bracket geometry. EVERY position — card placement, column offsets and the SVG
// connector coordinates — is derived from these four numbers, so swapping the
// set swaps the whole layout coherently.
//
// PRINT uses bigger cards on purpose. On screen a 220px card with truncated
// text is fine because you can hover for the full name; on paper the truncated
// half of a doubles pairing is simply gone. The print layout gives names room
// to wrap onto a second line.
const LAYOUT_SCREEN = {
  CARD_H: 82,
  CARD_W: 220,
  COL_GAP: 56,
  VERT_GAP: 24,
  HEADER_OFFSET: 54,
};

// Used ONLY by the PDF renderer (handleDownloadPDF), never mounted.
// Deliberately close to the screen layout so the exported sheet has the same
// proportions as the bracket on screen — just a little taller per card, because
// the PDF wraps long doubles pairings onto a second line instead of truncating
// them the way the CSS does.
const LAYOUT_PRINT = {
  CARD_H: 92,
  CARD_W: 220,
  COL_GAP: 56,
  VERT_GAP: 24,
  HEADER_OFFSET: 54,
};

const withBaseSlot = (l) => ({ ...l, BASE_SLOT: l.CARD_H + l.VERT_GAP });

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
    } catch {
      /* unparseable start time — omit it from the meta line */
    }
  }
  return parts.join(" · ");
};

function MatchCard({
  match, onClick, onEditPlayer, roundKey, matchIndex, isFirstRound,
  // Drag-and-drop / click-to-swap (all optional — omit and the card behaves
  // exactly as before).
  onSwapRequest, pickedUp, onPickUp, dragOverSlot, setDragOverSlot, rearrangeMode,
  layout,
}) {
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

  // A live or finished match must not have players moved out of it — the
  // server refuses it too (409), but disabling the affordance is clearer than
  // letting a manager drag and then get an error.
  const swapLocked = isCompleted || match.status === "IN_PROGRESS";
  const canSwap = Boolean(onSwapRequest) && !swapLocked;

  const slotKey = (slot) => `${match.matchId || match._id}|${slot}`;
  const isPickedUp = (slot) => pickedUp && pickedUp.key === slotKey(slot);
  const isDragTarget = (slot) => dragOverSlot === slotKey(slot);

  // Native HTML5 DnD for the mouse.
  const dragProps = (slot, name) =>
    !canSwap
      ? {}
      : {
          draggable: true,
          onDragStart: (e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            // Some browsers refuse a drag with no payload.
            e.dataTransfer.setData("text/plain", name);
            onPickUp({ key: slotKey(slot), match, slot, name });
          },
          onDragEnd: () => {
            onPickUp(null);
            setDragOverSlot(null);
          },
          onDragOver: (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragOverSlot !== slotKey(slot)) setDragOverSlot(slotKey(slot));
          },
          onDragLeave: () => {
            if (dragOverSlot === slotKey(slot)) setDragOverSlot(null);
          },
          onDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverSlot(null);
            onSwapRequest({ match, slot });
          },
        };

  // Keyboard/click path. Native drag-and-drop is unreachable without a mouse,
  // so the same operation is available as pick-up → drop: click (or Enter) a
  // player to lift them, then click the slot to swap with.
  const pickProps = (slot, name) =>
    !canSwap
      ? {}
      : {
          role: "button",
          tabIndex: 0,
          "aria-label": isPickedUp(slot)
            ? `${name} picked up. Choose another player to swap with, or press Escape to cancel.`
            : pickedUp
            ? `Swap ${pickedUp.name} with ${name}`
            : `Pick up ${name} to swap`,
          "aria-pressed": isPickedUp(slot),
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              if (pickedUp && !isPickedUp(slot)) onSwapRequest({ match, slot });
              else onPickUp(isPickedUp(slot) ? null : { key: slotKey(slot), match, slot, name });
            }
          },
          onClick: (e) => {
            // Row click acts ONLY as a drop target, and only while a player is
            // lifted. Picking up is done from the grip button, so an ordinary
            // click on a card still opens the match — which is what a manager
            // expects the bracket to do most of the time.
            if (!pickedUp) return;
            e.stopPropagation();
            if (!isPickedUp(slot)) onSwapRequest({ match, slot });
            else onPickUp(null);
          },
        };

  const rowSwapClasses = (slot) =>
    !canSwap
      ? ""
      : `${isPickedUp(slot) ? "ring-2 ring-sky-400/80 bg-sky-500/10 " : ""}` +
        `${isDragTarget(slot) ? "ring-2 ring-emerald-400/80 bg-emerald-500/10 " : ""}` +
        `${pickedUp && !isPickedUp(slot) ? "cursor-copy " : "cursor-grab "}`;

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
      style={{ width: layout.CARD_W, height: layout.CARD_H }}
      data-pdf="card"
    >
      {/* PDF Meta Label Line: R64 · Game 1 · Court 1 · 09:00 AM */}
      <div data-pdf="meta" className="px-2.5 h-[22px] border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
        <span className="text-[9px] font-semibold text-gray-400 truncate tracking-wide leading-none">
          {metaText}
        </span>
        {isBye && (
          <span data-pdf="bye" className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded leading-none">
            BYE
          </span>
        )}
      </div>

      {/* Player 1 Row */}
      <div
        data-pdf="row"
        data-winner={p1IsWinner ? "true" : "false"}
        {...dragProps("player1", p1)}
        {...pickProps("player1", p1)}
        className={`flex items-center justify-between px-2.5 h-[28px] group/p1 min-w-0 transition-all ${rowSwapClasses("player1")} ${
          p1IsWinner
            ? "text-emerald-400 font-bold bg-emerald-500/10"
            : p1 === "TBD"
            ? "text-gray-500"
            : "text-gray-200"
        }`}
      >
        {/* min-w-0 on the flex container is required for `truncate` to work on
            flex children — without it, the flex item won't shrink below its
            text content width (classic CSS gotcha for doubles long names). */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          {p1Sr && (
            <span data-pdf="seed" className="text-[9px] font-extrabold text-gray-400 bg-white/[0.08] px-1 rounded text-center min-w-[16px] flex-shrink-0 leading-none">
              {p1Sr}
            </span>
          )}
          <span
            data-pdf="name"
            className="text-[11px] font-medium tracking-wide leading-tight min-w-0 truncate"
            title={p1 !== "TBD" ? p1 : undefined}
          >
            {p1}
          </span>
          {canSwap && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPickUp(
                  isPickedUp("player1")
                    ? null
                    : { key: slotKey("player1"), match, slot: "player1", name: p1 }
                );
              }}
              title={isPickedUp("player1") ? "Cancel move" : `Move ${p1}`}
              aria-label={isPickedUp("player1") ? `Cancel moving ${p1}` : `Move ${p1}`}
              aria-pressed={isPickedUp("player1")}
              className={`p-0.5 rounded hover:bg-white/20 transition-opacity w-auto flex-shrink-0 ${
                isPickedUp("player1")
                  ? "opacity-100 text-sky-300 bg-sky-500/20"
                  : `${rearrangeMode ? "opacity-100" : "opacity-0"} group-hover/p1:opacity-100 text-gray-400 hover:text-white`
              }`}
            >
              <GripVertical className="w-2.5 h-2.5" />
            </button>
          )}
          {onEditPlayer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditPlayer(match, "player1", p1);
              }}
              className="opacity-0 group-hover/p1:opacity-100 p-0.5 hover:bg-white/20 rounded text-gray-400 hover:text-white transition-opacity w-auto flex-shrink-0"
              title="Edit Player 1 Name"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <span data-pdf="score" className="text-[11px] font-bold ml-1 text-right min-w-[14px] flex-shrink-0">
          {p1Score !== "" ? p1Score : isCompleted || isBye ? "0" : ""}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mx-2" />

      {/* Player 2 Row */}
      <div
        data-pdf="row"
        data-winner={p2IsWinner ? "true" : "false"}
        {...dragProps("player2", p2)}
        {...pickProps("player2", p2)}
        className={`flex items-center justify-between px-2.5 h-[28px] group/p2 min-w-0 transition-all ${rowSwapClasses("player2")} ${
          p2IsWinner
            ? "text-emerald-400 font-bold bg-emerald-500/10"
            : p2 === "TBD"
            ? "text-gray-500"
            : "text-gray-200"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          {p2Sr && (
            <span data-pdf="seed" className="text-[9px] font-extrabold text-gray-400 bg-white/[0.08] px-1 rounded text-center min-w-[16px] flex-shrink-0 leading-none">
              {p2Sr}
            </span>
          )}
          <span
            data-pdf="name"
            className="text-[11px] font-medium tracking-wide leading-tight min-w-0 truncate"
            title={p2 !== "TBD" ? p2 : undefined}
          >
            {p2}
          </span>
          {canSwap && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPickUp(
                  isPickedUp("player2")
                    ? null
                    : { key: slotKey("player2"), match, slot: "player2", name: p2 }
                );
              }}
              title={isPickedUp("player2") ? "Cancel move" : `Move ${p2}`}
              aria-label={isPickedUp("player2") ? `Cancel moving ${p2}` : `Move ${p2}`}
              aria-pressed={isPickedUp("player2")}
              className={`p-0.5 rounded hover:bg-white/20 transition-opacity w-auto flex-shrink-0 ${
                isPickedUp("player2")
                  ? "opacity-100 text-sky-300 bg-sky-500/20"
                  : `${rearrangeMode ? "opacity-100" : "opacity-0"} group-hover/p2:opacity-100 text-gray-400 hover:text-white`
              }`}
            >
              <GripVertical className="w-2.5 h-2.5" />
            </button>
          )}
          {onEditPlayer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditPlayer(match, "player2", p2);
              }}
              className="opacity-0 group-hover/p2:opacity-100 p-0.5 hover:bg-white/20 rounded text-gray-400 hover:text-white transition-opacity w-auto flex-shrink-0"
              title="Edit Player 2 Name"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <span data-pdf="score" className="text-[11px] font-bold ml-1 text-right min-w-[14px] flex-shrink-0">
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
  /**
   * Swap two players between bracket slots.
   *   onSwapPlayers({ from: { match, slot }, to: { match, slot } }) => Promise
   * Omit it and the bracket is read-only for swaps, exactly as before.
   *
   * This is deliberately separate from onEditPlayerName: renaming rewrites a
   * LABEL, swapping moves the whole slot including playerId. Progression and
   * result attribution key on the id, so a name-only "swap" would show one
   * player while the engine advanced another.
   */
  onSwapPlayers,
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [editingPlayerModal, setEditingPlayerModal] = useState(null);

  // Swap state. `pickedUp` is the lifted player — set by a drag start OR by a
  // click/Enter, so mouse and keyboard share one model.
  // The screen always uses the compact layout. The PDF is drawn from
  // LAYOUT_PRINT directly inside handleDownloadPDF — it is not rendered to the
  // DOM at all, so there is nothing to toggle here.
  const L = withBaseSlot(LAYOUT_SCREEN);

  const [rearrangeMode, setRearrangeMode] = useState(false);
  const [pickedUp, setPickedUp] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [swapping, setSwapping] = useState(false);

  // Escape cancels a pick-up. Registered only while something is lifted.
  React.useEffect(() => {
    if (!pickedUp) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPickedUp(null);
        setDragOverSlot(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickedUp]);

  const handleSwapRequest = async (target) => {
    if (!pickedUp || !onSwapPlayers || swapping) return;
    const sameSlot =
      String(pickedUp.match.matchId || pickedUp.match._id) ===
        String(target.match.matchId || target.match._id) &&
      pickedUp.slot === target.slot;
    if (sameSlot) {
      setPickedUp(null);
      return;
    }

    setSwapping(true);
    try {
      await onSwapPlayers({
        from: { match: pickedUp.match, slot: pickedUp.slot },
        to: { match: target.match, slot: target.slot },
      });
    } finally {
      setSwapping(false);
      setPickedUp(null);
      setDragOverSlot(null);
    }
  };
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

  // ── PDF export — drawn as VECTOR, not screenshotted ────────────────────
  //
  // Previous attempts rasterised the DOM with html2canvas and produced, in
  // order: a 944x1018 mm 39 MB single sheet, then a 12-sheet tiling in which
  // every sheet carried the same crop because the absolutely-positioned bracket
  // reports a collapsed scrollHeight.
  //
  // Screenshotting was the wrong tool. The bracket's geometry is already known
  // exactly — every card position and connector coordinate is computed from
  // four layout constants — so the PDF is now DRAWN with jsPDF primitives:
  //
  //   * one page, the whole bracket, at the size the bracket actually is;
  //   * real text, so it is selectable, searchable and sharp at any zoom;
  //   * ~100 KB instead of tens of megabytes;
  //   * no clipping, because nothing is constrained by a CSS box.
  //
  // Colours are the light print palette: a bracket gets printed and pinned up,
  // and the on-screen dark theme is not a printable document.
  const PDF_SCALE = 0.75;          // CSS px -> pt (96dpi -> 72dpi), so 12px = 9pt
  const PDF_TITLE_BLOCK = 96;      // px of header space above the bracket
  const PDF_PAD = 40;              // px padding around everything

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      const PL = withBaseSlot(LAYOUT_PRINT);
      const rounds = sortedRounds;
      const nRounds = rounds.length;
      if (nRounds === 0) {
        toast.info("Nothing to export yet — generate the bracket first.");
        return;
      }
      const firstCount = Math.max(
        (canonicalMatchesByRound[rounds[0]] || []).length,
        1
      );

      // The third-place play-off is deliberately NOT part of the binary tree
      // (it shares the final's roundNumber, so leaving it in would put two
      // matches in the final's column and mis-aim the semi-final connectors).
      // It is therefore absent from `rounds` / `canonicalMatchesByRound` and has
      // to be drawn separately — otherwise the exported bracket silently loses
      // a match that was actually played.
      const playoff = Object.values(matchesByRound || {})
        .flat()
        .filter((m) => m?.round === "third-place")[0] || null;

      // Same maths the screen layout uses, recomputed at print size. No React
      // re-render and no DOM measurement involved.
      const centerY = (r, i) => {
        const factor = Math.pow(2, r);
        const mid = i * factor + (factor - 1) / 2;
        return PL.HEADER_OFFSET + mid * PL.BASE_SLOT + PL.CARD_H / 2;
      };
      const topY = (r, i) => centerY(r, i) - PL.CARD_H / 2;
      const colX = (r) => r * (PL.CARD_W + PL.COL_GAP);

      const bracketW = (nRounds + 1) * (PL.CARD_W + PL.COL_GAP);

      // Play-off placement mirrors the on-screen rule: tucked between the semis
      // when there is room, otherwise parked below the final on a small draw.
      const finalCY = centerY(nRounds - 1, 0);
      const roomy = nRounds >= 3;
      const poX = (roomy ? nRounds - 2 : nRounds - 1) * (PL.CARD_W + PL.COL_GAP);
      const poY = roomy
        ? finalCY - PL.CARD_H / 2 - 18
        : finalCY + PL.BASE_SLOT;

      // A play-off parked below the final on a small draw can sit lower than the
      // tree itself, so the page has to grow to keep it on the sheet.
      const bracketH = Math.max(
        PL.HEADER_OFFSET + firstCount * PL.BASE_SLOT,
        playoff ? poY + PL.CARD_H + 16 : 0
      );

      const pageWpx = bracketW + PDF_PAD * 2;
      const pageHpx = PDF_TITLE_BLOCK + bracketH + PDF_PAD * 2;

      const X = (px) => (PDF_PAD + px) * PDF_SCALE;
      const Y = (px) => (PDF_TITLE_BLOCK + px) * PDF_SCALE;
      const U = (px) => px * PDF_SCALE;

      const pdf = new jsPDF({
        orientation: pageWpx > pageHpx ? "l" : "p",
        unit: "pt",
        format: [pageWpx * PDF_SCALE, pageHpx * PDF_SCALE],
      });

      const INK = [20, 24, 31];
      const MUTED = [90, 100, 116];
      const LINE = [152, 161, 175];
      const CARD_BORDER = [185, 192, 203];
      const META_BG = [241, 243, 247];
      const WIN_BG = [231, 247, 239];
      const WIN_INK = [11, 122, 75];
      const SEED_BG = [232, 235, 240];
      const BYE_BG = [253, 240, 214];
      const BYE_INK = [138, 90, 0];

      // ── Title block ────────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(...INK);
      pdf.text(
        (tournamentTitle || "Tournament") + (sportName ? "  —  " + sportName : ""),
        X(0),
        U(PDF_PAD + 26)
      );
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text("KNOCKOUT BRACKET", X(0), U(PDF_PAD + 44));
      pdf.setDrawColor(...CARD_BORDER);
      pdf.setLineWidth(0.7);
      pdf.line(X(0), U(PDF_PAD + 56), X(bracketW), U(PDF_PAD + 56));

      // ── Connectors, drawn first so cards sit on top ─────────────────────
      pdf.setLineWidth(0.8);
      for (let r = 0; r < nRounds - 1; r++) {
        const children = canonicalMatchesByRound[rounds[r + 1]] || [];
        for (let ci = 0; ci < children.length; ci++) {
          const yA = centerY(r, ci * 2);
          const yB = centerY(r, ci * 2 + 1);
          const yC = centerY(r + 1, ci);
          const xSrc = colX(r) + PL.CARD_W;
          const xDst = colX(r + 1);
          const xMid = xSrc + PL.COL_GAP / 2;

          const done = children[ci]?.status === "COMPLETED";
          if (done) pdf.setDrawColor(...WIN_INK);
          else pdf.setDrawColor(...LINE);

          pdf.line(X(xSrc), Y(yA), X(xMid), Y(yA));
          pdf.line(X(xSrc), Y(yB), X(xMid), Y(yB));
          pdf.line(X(xMid), Y(yA), X(xMid), Y(yB));
          pdf.line(X(xMid), Y(yC), X(xDst), Y(yC));
        }
      }

      // ── Round headings ─────────────────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      rounds.forEach((rk, r) => {
        const label = (getRoundName ? getRoundName(rk) : rk) || rk;
        pdf.setTextColor(...INK);
        pdf.text(String(label).toUpperCase(), X(colX(r)), Y(20));
        pdf.setDrawColor(...CARD_BORDER);
        pdf.setLineWidth(0.5);
        pdf.line(X(colX(r)), Y(28), X(colX(r) + PL.CARD_W), Y(28));
      });

      // ── Match cards ────────────────────────────────────────────────────
      const META_H = 22;
      const rowH = (PL.CARD_H - META_H) / 2;
      const PADX = 8;
      const SCORE_W = 22;
      const SEED_W = 16;

      const drawPlayer = (slot, x, y, w, h, isWinner, seedLabel, score) => {
        if (isWinner) {
          pdf.setFillColor(...WIN_BG);
          pdf.rect(X(x), Y(y), U(w), U(h), "F");
        }
        if (seedLabel) {
          pdf.setFillColor(...SEED_BG);
          pdf.roundedRect(X(x + PADX), Y(y + h / 2 - 6), U(SEED_W), U(12), U(2), U(2), "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6.5);
          pdf.setTextColor(...MUTED);
          pdf.text(String(seedLabel), X(x + PADX + SEED_W / 2), Y(y + h / 2), {
            align: "center",
            baseline: "middle",
          });
        }

        const nameX = x + PADX + (seedLabel ? SEED_W + 6 : 0);
        const nameW = w - (nameX - x) - SCORE_W - PADX;

        pdf.setFont("helvetica", isWinner ? "bold" : "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...(isWinner ? WIN_INK : INK));

        // Real wrapping: full doubles pairings survive onto paper instead of
        // being cut mid-word by a CSS truncate.
        const lines = pdf.splitTextToSize(String(slot || "TBD"), U(nameW));
        const shown = lines.slice(0, 2);
        const lead = 10;
        const startY = y + h / 2 - ((shown.length - 1) * lead) / 2 / PDF_SCALE;
        shown.forEach((ln, i) => {
          pdf.text(ln, X(nameX), Y(startY) + i * lead, { baseline: "middle" });
        });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(...(isWinner ? WIN_INK : INK));
        pdf.text(String(score ?? ""), X(x + w - PADX), Y(y + h / 2), {
          align: "right",
          baseline: "middle",
        });
      };

      rounds.forEach((rk, r) => {
        const list = canonicalMatchesByRound[rk] || [];
        list.forEach((m, i) => {
          const x = colX(r);
          const y = topY(r, i);
          const isBye = (m.notes || "").includes("BYE");

          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(...CARD_BORDER);
          pdf.setLineWidth(0.7);
          pdf.roundedRect(X(x), Y(y), U(PL.CARD_W), U(PL.CARD_H), U(4), U(4), "FD");

          // meta strip
          pdf.setFillColor(...META_BG);
          pdf.rect(X(x), Y(y), U(PL.CARD_W), U(META_H), "F");
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(...MUTED);
          pdf.text(formatMatchMeta(m, rk), X(x + PADX), Y(y + META_H / 2), {
            baseline: "middle",
          });
          if (isBye) {
            pdf.setFillColor(...BYE_BG);
            pdf.roundedRect(X(x + PL.CARD_W - 34), Y(y + 5), U(26), U(12), U(2), U(2), "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(6);
            pdf.setTextColor(...BYE_INK);
            pdf.text("BYE", X(x + PL.CARD_W - 21), Y(y + 11), {
              align: "center",
              baseline: "middle",
            });
          }

          const winnerName = m.result?.winner?.playerName;
          const p1 = m.player1?.playerName || "TBD";
          const p2 = m.player2?.playerName || "TBD";
          const isFirst = r === 0;

          drawPlayer(
            p1,
            x,
            y + META_H,
            PL.CARD_W,
            rowH,
            Boolean(winnerName) && winnerName === p1,
            m.player1?.seed ? "[" + m.player1.seed + "]" : isFirst ? String(i * 2 + 1) : null,
            m.result?.finalScore?.player1Sets ?? m.result?.player1Score ?? ""
          );

          pdf.setDrawColor(...CARD_BORDER);
          pdf.setLineWidth(0.4);
          pdf.line(X(x + 6), Y(y + META_H + rowH), X(x + PL.CARD_W - 6), Y(y + META_H + rowH));

          drawPlayer(
            p2,
            x,
            y + META_H + rowH,
            PL.CARD_W,
            rowH,
            Boolean(winnerName) && winnerName === p2,
            m.player2?.seed ? "[" + m.player2.seed + "]" : isFirst ? String(i * 2 + 2) : null,
            m.result?.finalScore?.player2Sets ?? m.result?.player2Score ?? ""
          );
        });
      });

      // ── Third-place play-off ───────────────────────────────────────────
      if (playoff) {
        // Label it explicitly. On paper there is no colour-coded chrome to lean
        // on, and an unlabelled card floating beside the semi-finals reads as a
        // stray fixture.
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...BYE_INK);
        pdf.text("3RD PLACE PLAY-OFF", X(poX), Y(poY - 6));

        const isBye = (playoff.notes || "").includes("BYE");
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(...BYE_INK);
        pdf.setLineWidth(0.9);
        pdf.roundedRect(X(poX), Y(poY), U(PL.CARD_W), U(PL.CARD_H), U(4), U(4), "FD");

        pdf.setFillColor(...BYE_BG);
        pdf.rect(X(poX), Y(poY), U(PL.CARD_W), U(META_H), "F");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(...BYE_INK);
        pdf.text(formatMatchMeta(playoff, "third-place"), X(poX + PADX), Y(poY + META_H / 2), {
          baseline: "middle",
        });
        if (isBye) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6);
          pdf.text("BYE", X(poX + PL.CARD_W - 21), Y(poY + META_H / 2), {
            align: "center",
            baseline: "middle",
          });
        }

        const poWinner = playoff.result?.winner?.playerName;
        const q1 = playoff.player1?.playerName || "TBD";
        const q2 = playoff.player2?.playerName || "TBD";

        drawPlayer(
          q1, poX, poY + META_H, PL.CARD_W, rowH,
          Boolean(poWinner) && poWinner === q1,
          null,
          playoff.result?.finalScore?.player1Sets ?? playoff.result?.player1Score ?? ""
        );
        pdf.setDrawColor(...CARD_BORDER);
        pdf.setLineWidth(0.4);
        pdf.line(X(poX + 6), Y(poY + META_H + rowH), X(poX + PL.CARD_W - 6), Y(poY + META_H + rowH));
        drawPlayer(
          q2, poX, poY + META_H + rowH, PL.CARD_W, rowH,
          Boolean(poWinner) && poWinner === q2,
          null,
          playoff.result?.finalScore?.player2Sets ?? playoff.result?.player2Score ?? ""
        );
      }

      // ── Champion ───────────────────────────────────────────────────────
      const finalMatches = canonicalMatchesByRound[rounds[nRounds - 1]] || [];
      const champ = finalMatches[0]?.result?.winner?.playerName;
      const cx = colX(nRounds);
      const cy = topY(nRounds - 1, 0);
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(...WIN_INK);
      pdf.setLineWidth(1);
      pdf.roundedRect(X(cx), Y(cy), U(PL.CARD_W), U(PL.CARD_H), U(4), U(4), "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...WIN_INK);
      pdf.text("CHAMPION", X(cx + PL.CARD_W / 2), Y(cy + PL.CARD_H / 2 - 12), {
        align: "center",
        baseline: "middle",
      });
      pdf.setFontSize(10);
      pdf.setTextColor(...INK);
      const champLines = pdf.splitTextToSize(champ || "TBD", U(PL.CARD_W - 16));
      champLines.slice(0, 2).forEach((ln, i) => {
        pdf.text(ln, X(cx + PL.CARD_W / 2), Y(cy + PL.CARD_H / 2 + 6) + i * 11, {
          align: "center",
          baseline: "middle",
        });
      });

      const fileTitle = (tournamentTitle || "Tournament")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const fileSport = (sportName || "Knockout")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      pdf.save(fileTitle + "_" + fileSport + "_Bracket.pdf");
      toast.success("Bracket exported as PDF");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export bracket PDF");
    } finally {
      setExporting(false);
    }
  };

  const getRoundKeyForNumber = (roundNumber, total) => {
    const roundsFromEnd = total - roundNumber + 1;
    if (roundsFromEnd === 1) return "final";
    if (roundsFromEnd === 2) return "semi-final";
    if (roundsFromEnd === 3) return "quarter-final";
    const playersInRound = Math.pow(2, roundsFromEnd);
    return `round-of-${playersInRound}`;
  };

  // The third-place play-off is NOT part of the binary tree. It deliberately
  // shares the final's roundNumber (taking matchNumber 2 so the ids can't
  // collide), and grouping below canonicalises by roundNumber — so left in, it
  // lands in the final's column, giving that round two matches. Every position
  // here assumes each round holds half the previous round's matches, so that
  // mis-places the final and points the semi-final connectors at the wrong
  // cards. It is surfaced separately, outside the tree.
  const isPlayoffMatch = (m) => m?.round === "third-place";

  // The play-off is kept out of the binary tree above, but the manager still
  // needs a card to see and open it — surfaced as its own card below the tree.
  const playoffMatches = Object.values(matchesByRound || {})
    .flat()
    .filter((m) => isPlayoffMatch(m));

  const roundEntries = Object.entries(matchesByRound || {})
    .map(([roundKey, roundMatches]) => {
      const list = (Array.isArray(roundMatches) ? roundMatches : []).filter((m) => !isPlayoffMatch(m));
      const roundNumber = list.length > 0
        ? Number(list[0]?.roundNumber ?? list[list.length - 1]?.roundNumber)
        : null;
      return {
        roundKey,
        roundMatches: list,
        roundNumber: Number.isFinite(roundNumber) ? roundNumber : null,
      };
    })
    // A round key that held nothing but the play-off is now empty — drop it so
    // it doesn't render as a blank column.
    .filter((entry) => entry.roundMatches.length > 0);

  const maxRoundNumber = roundEntries.reduce(
    (max, entry) => Math.max(max, entry.roundNumber || 0),
    0
  );

  const canonicalMatchesByRound = {};
  roundEntries.forEach((entry) => {
    const canonicalKey = entry.roundNumber
      ? getRoundKeyForNumber(entry.roundNumber, maxRoundNumber || entry.roundNumber)
      : entry.roundKey;
    if (!canonicalMatchesByRound[canonicalKey]) {
      canonicalMatchesByRound[canonicalKey] = [];
    }
    canonicalMatchesByRound[canonicalKey] = canonicalMatchesByRound[canonicalKey].concat(entry.roundMatches);
  });

  let sortedRounds = [];
  if (maxRoundNumber > 0) {
    for (let r = 1; r <= maxRoundNumber; r++) {
      sortedRounds.push(getRoundKeyForNumber(r, maxRoundNumber));
    }
    // Preserve any additional round keys not accounted for by the range.
    Object.keys(canonicalMatchesByRound).forEach((key) => {
      if (!sortedRounds.includes(key)) sortedRounds.push(key);
    });
  } else {
    sortedRounds = Object.keys(canonicalMatchesByRound).sort((a, b) => {
      const ai = ROUND_ORDER.indexOf(a);
      const bi = ROUND_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  if (sortedRounds.length === 0) {
    return null;
  }

  const firstRoundMatches = canonicalMatchesByRound[sortedRounds[0]] || [];
  const firstRoundCount = Math.max(firstRoundMatches.length, 1);
  const totalRounds = sortedRounds.length;

  // ── 2. Calculate Layout Heights and Positions ───────────────────────────
  const totalBaseHeight = L.HEADER_OFFSET + firstRoundCount * L.BASE_SLOT + 40;
  const totalWidth = (totalRounds + 1) * (L.CARD_W + L.COL_GAP) + 80;

  const getCenterY = (r, i) => {
    const factor = Math.pow(2, r);
    const midSlotIndex = i * factor + (factor - 1) / 2;
    return L.HEADER_OFFSET + midSlotIndex * L.BASE_SLOT + L.CARD_H / 2;
  };

  const getTopY = (r, i) => {
    return getCenterY(r, i) - L.CARD_H / 2;
  };

  // ── 3. Build SVG Connector Lines ───────────────────────────────────────
  const lineElements = [];
  for (let r = 0; r < totalRounds - 1; r++) {
    const childMatches = canonicalMatchesByRound[sortedRounds[r + 1]] || [];
    for (let ci = 0; ci < childMatches.length; ci++) {
      const childMatch = childMatches[ci];
      const srcAIndex = ci * 2;
      const srcBIndex = ci * 2 + 1;

      const yA = getCenterY(r, srcAIndex);
      const yB = getCenterY(r, srcBIndex);
      const yC = getCenterY(r + 1, ci);

      const xSrc = r * (L.CARD_W + L.COL_GAP) + L.CARD_W;
      const xDst = (r + 1) * (L.CARD_W + L.COL_GAP);
      const xMid = xSrc + L.COL_GAP / 2;

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
  const finalMatch = (canonicalMatchesByRound[finalRoundKey] || [])[0];
  const championName = finalMatch?.result?.winner?.playerName;
  const finalCenterY = getCenterY(totalRounds - 1, 0);

  const champLeft = totalRounds * (L.CARD_W + L.COL_GAP);
  const champTop = finalCenterY - 38;

  if (championName) {
    lineElements.push(
      <line
        key="line-champion"
        x1={(totalRounds - 1) * (L.CARD_W + L.COL_GAP) + L.CARD_W}
        y1={finalCenterY}
        x2={champLeft}
        y2={finalCenterY}
        stroke="#10b981"
        strokeWidth="2"
      />
    );
  }

  // Consolation connectors — drop lines from the two semi-finals into the 3rd
  // place card that sits between them (roomy layout only; a tiny 2-semi draw
  // places the card below the final instead, where these don't apply). Same
  // style as every other bracket line: solid, emerald once the play-off is
  // completed, translucent white otherwise.
  if (playoffMatches.length > 0 && totalRounds >= 3) {
    const poCol = totalRounds - 2;
    const xC = poCol * (L.CARD_W + L.COL_GAP) + L.CARD_W / 2;
    const topSemiBottom = getCenterY(poCol, 0) + L.CARD_H / 2;
    const botSemiTop = getCenterY(poCol, 1) - L.CARD_H / 2;
    const bronzeTop = finalCenterY - L.CARD_H / 2;
    const bronzeBottom = finalCenterY + L.CARD_H / 2;
    const poDone = playoffMatches[0]?.status === "COMPLETED";
    const poStroke = poDone ? "#10b981" : "rgba(255, 255, 255, 0.2)";
    const poWidth = poDone ? "2" : "1.5";
    lineElements.push(
      <g key="bronze-connectors">
        <line x1={xC} y1={topSemiBottom} x2={xC} y2={bronzeTop} stroke={poStroke} strokeWidth={poWidth} />
        <line x1={xC} y1={botSemiTop} x2={xC} y2={bronzeBottom} stroke={poStroke} strokeWidth={poWidth} />
      </g>
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

      {/* Rearrange toggle + how-to. Outside bracketRef, so it never appears in
          the exported PDF. */}
      {onSwapPlayers && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setRearrangeMode((v) => !v);
              setPickedUp(null);
            }}
            aria-pressed={rearrangeMode}
            className={`w-auto flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold transition-colors ${
              rearrangeMode
                ? "bg-sky-500 text-white"
                : "bg-[#181A22] text-gray-300 border border-white/[0.08] hover:bg-white/[0.06]"
            }`}
          >
            <GripVertical className="w-3.5 h-3.5" />
            {rearrangeMode ? "Done rearranging" : "Rearrange players"}
          </button>

          {rearrangeMode && !pickedUp && (
            <span className="text-[12px] text-gray-400">
              Click the <GripVertical className="w-3 h-3 inline align-text-bottom" /> next to a
              player to pick them up — then click whoever you want to swap them with.
              You can also drag a name straight onto another.
            </span>
          )}
        </div>
      )}

      {/* Swap status. The PDF is drawn from data rather than screenshotted, so
          on-screen chrome like this can never leak into the export. */}
      {onSwapPlayers && pickedUp && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border border-sky-400/40 bg-sky-500/10"
        >
          <GripVertical className="w-4 h-4 text-sky-300 flex-shrink-0" />
          <span className="text-[13px] text-sky-100">
            <strong className="font-bold">{pickedUp.name}</strong> picked up —
            {" "}drop them on another player to swap, or press{" "}
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-[11px] font-mono">Esc</kbd>{" "}
            to cancel.
          </span>
          {swapping && <span className="text-[12px] text-sky-300">Saving…</span>}
          <button
            onClick={() => setPickedUp(null)}
            className="w-auto ml-auto px-2.5 py-1 rounded-lg text-[12px] font-semibold text-sky-200 bg-white/[0.06] hover:bg-white/[0.12]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Bracket Canvas Container (on-screen only) */}
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
                    left: r * (L.CARD_W + L.COL_GAP),
                    top: 0,
                    width: L.CARD_W,
                  }}
                  className="text-left"
                >
                  <div data-pdf="round-title" className="text-xs font-bold text-gray-300 uppercase tracking-wider py-1 border-b border-white/10">
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
              const roundMatches = canonicalMatchesByRound[roundKey] || [];
              return roundMatches.map((match, i) => {
                const top = getTopY(r, i);
                const left = r * (L.CARD_W + L.COL_GAP);
                return (
                  <div
                    key={match._id || `${roundKey}-${i}`}
                    style={{
                      position: "absolute",
                      top,
                      left,
                      width: L.CARD_W,
                      height: L.CARD_H,
                    }}
                  >
                    <MatchCard
                      match={match}
                      onClick={onMatchClick}
                      onEditPlayer={onEditPlayerName ? handleOpenEditModal : null}
                      roundKey={roundKey}
                      matchIndex={i}
                      isFirstRound={r === 0}
                      onSwapRequest={onSwapPlayers ? handleSwapRequest : null}
                      pickedUp={pickedUp}
                      onPickUp={setPickedUp}
                      dragOverSlot={dragOverSlot}
                      setDragOverSlot={setDragOverSlot}
                      rearrangeMode={rearrangeMode && !exporting}
                      layout={L}
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

            {/* 3rd Place Play-off — placed BETWEEN the two semi-final cards (their
                vertical midpoint is the final's centre line). Positioned manually
                instead of through the round-grouping layout, which would otherwise
                mis-place the final and its connectors. Small draws (only 2 semis,
                one slot apart) have no room between the semis, so those drop the
                card just below the final line instead. */}
            {playoffMatches.length > 0 && totalRounds >= 2 && (() => {
              const roomy = totalRounds >= 3;
              const poLeft = (roomy ? totalRounds - 2 : totalRounds - 1) * (L.CARD_W + L.COL_GAP);
              const poTop = roomy
                ? finalCenterY - L.CARD_H / 2 - 18   // centred between the semis (minus label)
                : finalCenterY + L.BASE_SLOT;         // below the final for tiny draws
              const po = playoffMatches[0];
              return (
                <div style={{ position: "absolute", top: poTop, left: poLeft, width: L.CARD_W }}>
                  <div className="flex items-center gap-1 mb-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/90">
                      3rd Place
                    </span>
                  </div>
                  <MatchCard
                    match={po}
                    onClick={onMatchClick}
                    onEditPlayer={null}
                    roundKey="third-place"
                    matchIndex={0}
                    isFirstRound={false}
                    onSwapRequest={null}
                    pickedUp={pickedUp}
                    onPickUp={setPickedUp}
                    dragOverSlot={dragOverSlot}
                    setDragOverSlot={setDragOverSlot}
                    rearrangeMode={false}
                    layout={L}
                  />
                </div>
              );
            })()}
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
              <label className="text-xs text-gray-400 font-medium block mb-1" htmlFor="player-team-name">
                Player / Team Name
              </label>
              <input id="player-team-name"
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


