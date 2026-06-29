import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { QRCodeCanvas } from "qrcode.react";
import {
  Edit2, Trash2, Share2, X, Trophy, Calendar, MapPin, Users, Plus,
  QrCode, UserPlus, Lock, Target, Search, Download, LayoutGrid,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MCreateTournament from "./MCreateTournament";
import {
  getSportName, getTournamentType, getKnockoutFormat, getCurrentStage,
} from "../utils/sportTrack";
import { resolveManageUrl } from "../features/tournaments";

const SIG = "#5E6AD2";

const STAGE_PILL = {
  group_stage: { bg: "bg-neutral-100", text: "text-neutral-700", label: "Group stage" },
  group_completed: { bg: "bg-amber-50", text: "text-amber-700", label: "Groups done" },
  knockout: { bg: "bg-neutral-900", text: "text-white", label: "Knockout" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Completed" },
};

const TournamentList = ({ onTournamentSelect, selectedTournament }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [activeTab, setActiveTab] = useState("Live");
  const [search, setSearch] = useState("");
  const [displayData, setDisplayData] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);

  const [showFlowChooser, setShowFlowChooser] = useState(false);
  const [flowChooserTournamentId, setFlowChooserTournamentId] = useState(null);

  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [qrCodeTournament, setQrCodeTournament] = useState(null);

  const fetchTournaments = async () => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      const managerId = u?._id;
      if (!managerId) {
        setTournaments([]);
        return;
      }
      const response = await axios.get(`/api/tournaments/manager/${managerId}`);
      setTournaments(response.data.tournaments || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (tournaments.length > 0 && !selectedTournament) {
      onTournamentSelect?.(tournaments[0]._id);
    }
  }, [tournaments, selectedTournament, onTournamentSelect]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = tournaments.filter((t) => {
      if (!t.startDate) return false;
      const start = new Date(t.startDate);
      start.setHours(0, 0, 0, 0);
      const end = t.endDate ? new Date(t.endDate) : new Date(t.startDate);
      end.setHours(23, 59, 59, 999);

      if (activeTab === "Live") return start <= today && end >= today;
      if (activeTab === "Upcoming") return start > today;
      if (activeTab === "History") return end < today;
      return false;
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((t) =>
        (t.title || "").toLowerCase().includes(q) ||
        (getSportName(t) || "").toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      const da = new Date(a.startDate);
      const db = new Date(b.startDate);
      return activeTab === "Upcoming" ? da - db : db - da;
    });

    setDisplayData(filtered);
  }, [activeTab, tournaments, search]);

  const counts = {
    Live: tournaments.filter((t) => {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const s = t.startDate ? new Date(t.startDate) : null;
      const e = t.endDate ? new Date(t.endDate) : s;
      if (!s) return false;
      s.setHours(0, 0, 0, 0); e?.setHours(23, 59, 59, 999);
      return s <= now && e >= now;
    }).length,
    Upcoming: tournaments.filter((t) => {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const s = t.startDate ? new Date(t.startDate) : null;
      if (!s) return false;
      s.setHours(0, 0, 0, 0);
      return s > now;
    }).length,
    History: tournaments.filter((t) => {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const e = t.endDate ? new Date(t.endDate) : t.startDate ? new Date(t.startDate) : null;
      if (!e) return false;
      e.setHours(23, 59, 59, 999);
      return e < now;
    }).length,
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/tournaments/${id}`);
      setTournaments((prev) => prev.filter((t) => t._id !== id));
      toast.success("Tournament deleted.");
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast.error("Failed to delete tournament");
    }
  };

  const handleEditClick = async (tournamentId, e) => {
    e.stopPropagation();
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}`);
      setEditingTournament(response.data.tournament);
      setShowCreate(true);
    } catch (error) {
      console.error("Error fetching tournament details:", error);
      toast.error("Failed to load tournament details");
    }
  };

  const handleShareClick = (tournament, e) => {
    e.stopPropagation();
    const shareLink = `${window.location.origin}/tournament/${tournament._id}`;
    navigator.clipboard
      .writeText(shareLink)
      .then(() => toast.success("Link copied to clipboard"))
      .catch(() => toast.info(`Share link:\n${shareLink}`));
  };

  const handleQRCodeClick = (tournament, e) => {
    e.stopPropagation();
    setQrCodeTournament(tournament);
    setShowQRCodeModal(true);
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-code-canvas");
    if (!canvas) return;
    const url = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    const link = document.createElement("a");
    link.href = url;
    link.download = `tournament_qr_${qrCodeTournament._id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openTournament = (tournament) => {
    onTournamentSelect?.(tournament._id);
    const t = (getTournamentType(tournament) || "").toLowerCase();
    if (t.includes("group stage") && t.includes("knockout")) {
      setFlowChooserTournamentId(tournament._id);
      setShowFlowChooser(true);
    } else if (t.includes("group stage")) {
      navigate(`/tournament-management/group-stage?tournamentId=${tournament._id}`);
    } else if (t.includes("knockout")) {
      // Davis-Cup team engine only for a real team-track that isn't time/innings.
      // Football (time) / Cricket (innings) use the auto-advancing Direct engine.
      const _sports = Array.isArray(tournament?.sports) ? tournament.sports : [];
      const hasDavisCupTrack = _sports.some((s) =>
        ["Davis Cup", "Teams Knockout"].includes(s?.knockoutFormat) &&
        !["time", "innings"].includes((s?.matchFormat?.scoringType || "").toLowerCase())
      );
      if (hasDavisCupTrack) {
        navigate(`/tournament-management/team-knockouts?tournamentId=${tournament._id}`);
      } else {
        navigate(`/tournament-management/direct-knockout?tournamentId=${tournament._id}`);
      }
    } else {
      // Unknown / unconfigured type: go straight to the canonical V1 manage
      // URL instead of bouncing through the V2 overview redirect shim.
      navigate(resolveManageUrl(tournament));
    }
  };

  return (
    <div className="p-6 max-w-[1320px] mx-auto">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 mb-1.5">
            Tournaments
          </p>
          <h1 className="text-[28px] leading-[1.1] font-semibold tracking-tight text-neutral-950">
            Your tournaments
          </h1>
        </div>
        <button
          onClick={() => {
            setEditingTournament(null);
            setShowCreate(true);
          }}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white rounded-lg transition active:scale-[0.98]"
          style={{ backgroundColor: SIG }}
        >
          <Plus className="w-4 h-4" />
          New tournament
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg">
          {["Live", "Upcoming", "History"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-7 px-3 inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium transition ${
                activeTab === tab
                  ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {tab}
              <span className="font-mono tabular-nums text-[10px] text-neutral-500">
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tournaments"
            className="w-full h-8 pl-8 pr-3 border border-neutral-200 rounded-lg text-[12px] bg-white focus:outline-none focus:border-[var(--sig)] focus:ring-2 focus:ring-[var(--sig-tint)]"
            style={{ "--sig": SIG, "--sig-tint": "rgba(94,106,210,0.15)" }}
          />
        </div>
      </div>

      {displayData.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 inline-flex items-center justify-center mb-3">
            <Trophy className="w-5 h-5 text-neutral-400" />
          </div>
          <h3 className="text-[14px] font-semibold text-neutral-900">
            No {activeTab.toLowerCase()} tournaments
          </h3>
          <p className="text-[13px] text-neutral-500 mt-1 max-w-md mx-auto">
            {activeTab === "Live"
              ? "No tournaments are running right now."
              : activeTab === "Upcoming"
              ? "Create a tournament to see it here."
              : "Past tournaments will appear here once they end."}
          </p>
          <button
            onClick={() => {
              setEditingTournament(null);
              setShowCreate(true);
            }}
            className="mt-4 h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white rounded-lg transition"
            style={{ backgroundColor: SIG }}
          >
            <Plus className="w-3.5 h-3.5" />
            New tournament
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayData.map((tournament) => (
            <TournamentCard
              key={tournament._id}
              tournament={tournament}
              isSelected={selectedTournament === tournament._id}
              onOpen={() => openTournament(tournament)}
              onEdit={(e) => handleEditClick(tournament._id, e)}
              onShare={(e) => handleShareClick(tournament, e)}
              onQR={(e) => handleQRCodeClick(tournament, e)}
              onDelete={(e) => {
                e.stopPropagation();
                if (window.confirm("Delete this tournament?")) {
                  handleDelete(tournament._id);
                }
              }}
              onInvite={
                user?.isCorporate
                  ? (e) => {
                      e.stopPropagation();
                      navigate(`/invite-employees?tournamentId=${tournament._id}`);
                    }
                  : null
              }
              onBulkRegister={
                tournament.isPrivate
                  ? (e) => {
                      e.stopPropagation();
                      navigate(`/bulk-booking?tournamentId=${tournament._id}`);
                    }
                  : null
              }
              onCourts={(e) => {
                e.stopPropagation();
                navigate(`/tournaments/${tournament._id}/courts`);
              }}
            />
          ))}
        </div>
      )}

      {showQRCodeModal && qrCodeTournament && (
        <Modal
          title="Booking QR code"
          subtitle={qrCodeTournament.title}
          onClose={() => setShowQRCodeModal(false)}
          footer={
            <button
              onClick={downloadQRCode}
              className="w-full h-9 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-white rounded-lg transition active:scale-[0.98]"
              style={{ backgroundColor: SIG }}
            >
              <Download className="w-4 h-4" />
              Download QR code
            </button>
          }
        >
          <div className="flex justify-center mb-4 p-4 bg-white rounded-xl border border-neutral-200">
            <QRCodeCanvas
              id="qr-code-canvas"
              value={`intent://tournament/details/${qrCodeTournament._id}#Intent;scheme=chalokhelne;package=com.chalokhelne.app;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.chalokhelne.app;end`}
              size={200}
              level="H"
              includeMargin
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500 mb-1">
              Deep link
            </p>
            <p className="text-[11px] font-mono text-neutral-700 bg-neutral-50 border border-neutral-200 p-2.5 rounded-lg break-all">
              chalokhelne://tournament/details/{qrCodeTournament._id}
            </p>
          </div>
        </Modal>
      )}

      {showFlowChooser && flowChooserTournamentId && (
        <Modal
          title="Choose a stage"
          subtitle="This tournament has both Group Stage and Knockout phases. Pick which to manage."
          onClose={() => setShowFlowChooser(false)}
        >
          <div className="space-y-2">
            <FlowOption
              icon={Users}
              title="Group stage"
              desc="Manage groups, matches, and progression"
              onClick={() => {
                setShowFlowChooser(false);
                navigate(
                  `/tournament-management/group-stage?tournamentId=${flowChooserTournamentId}`
                );
              }}
            />
            <FlowOption
              icon={Trophy}
              title="Team knockout"
              desc="Team-based knockout brackets and finals"
              onClick={() => {
                setShowFlowChooser(false);
                navigate(
                  `/tournament-management/team-knockouts?tournamentId=${flowChooserTournamentId}`
                );
              }}
            />
            <FlowOption
              icon={Target}
              title="Singles knockout"
              desc="Direct elimination bracket (16/32/64)"
              onClick={() => {
                setShowFlowChooser(false);
                navigate(
                  `/tournament-management/direct-knockout?tournamentId=${flowChooserTournamentId}`
                );
              }}
            />
          </div>
        </Modal>
      )}

      <MCreateTournament
        key={editingTournament?._id || "create"}
        showPopup={showCreate}
        setShowPopup={setShowCreate}
        mode={editingTournament ? "edit" : "create"}
        initialData={editingTournament}
        onSuccess={fetchTournaments}
      />
    </div>
  );
};

export default TournamentList;

function TournamentCard({
  tournament,
  isSelected,
  onOpen,
  onEdit,
  onShare,
  onQR,
  onDelete,
  onInvite,
  onBulkRegister,
  onCourts,
}) {
  const stage = getCurrentStage(tournament);
  const stagePill = STAGE_PILL[stage];
  const sport = getSportName(tournament) || "Sport";
  const tType = getTournamentType(tournament);
  const tTypeShort = tType === "knockout + group stage" ? "Group + KO" : tType;

  const startDate = tournament.startDate ? new Date(tournament.startDate) : null;
  const endDate = tournament.endDate ? new Date(tournament.endDate) : null;
  const dateLabel = startDate
    ? endDate && startDate.toDateString() !== endDate.toDateString()
      ? `${startDate.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })} – ${endDate.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}`
      : startDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "TBD";

  const venue =
    typeof tournament.eventLocation === "string"
      ? tournament.eventLocation
      : Array.isArray(tournament.eventLocation)
      ? tournament.eventLocation[0]
      : "";

  return (
    <div
      onClick={onOpen}
      className={`group relative bg-white border rounded-2xl p-4 cursor-pointer transition ${
        isSelected
          ? "border-transparent ring-2"
          : "border-neutral-200 hover:border-neutral-300"
      }`}
      style={
        isSelected
          ? { "--tw-ring-color": SIG }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {tTypeShort && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-700">
              {tTypeShort}
            </span>
          )}
          {tournament.isPrivate && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700">
              <Lock className="w-2.5 h-2.5" />
              Private
            </span>
          )}
          {stagePill && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${stagePill.bg} ${stagePill.text}`}
            >
              {stagePill.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onInvite && (
            <IconButton onClick={onInvite} icon={UserPlus} title="Invite employees" />
          )}
          {onBulkRegister && (
            <IconButton onClick={onBulkRegister} icon={Users} title="Bulk register" />
          )}
          {onCourts && (
            <IconButton onClick={onCourts} icon={LayoutGrid} title="Courts" />
          )}
          <IconButton onClick={onEdit} icon={Edit2} title="Edit" />
          <IconButton onClick={onQR} icon={QrCode} title="QR code" />
          <IconButton onClick={onShare} icon={Share2} title="Share link" />
          <IconButton onClick={onDelete} icon={Trash2} title="Delete" danger />
        </div>
      </div>

      <h3 className="text-[15px] font-semibold text-neutral-950 truncate mb-2">
        {tournament.title}
      </h3>

      <div className="space-y-1">
        <Meta icon={Trophy}>{sport}</Meta>
        {venue && <Meta icon={MapPin}>{venue}</Meta>}
        <div className="flex items-center gap-3 text-[12px] text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            <span className="font-mono tabular-nums">{dateLabel}</span>
          </span>
          {tournament.participants?.length > 0 && (
            <>
              <span className="text-neutral-300">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                <span className="font-mono tabular-nums">
                  {tournament.participants.length}
                </span>
                <span>players</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ icon: Icon, children }) {
  return (
    <div className="text-[12px] text-neutral-500 inline-flex items-center gap-1.5">
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function IconButton({ onClick, icon: Icon, title, danger = false }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition ${
        danger
          ? "text-neutral-400 hover:text-rose-600 hover:bg-rose-50"
          : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function Modal({ title, subtitle, onClose, children, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-neutral-200 shadow-[0_24px_64px_rgba(0,0,0,0.16)] max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-neutral-950">{title}</p>
            {subtitle && (
              <p className="text-[12px] text-neutral-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function FlowOption({ icon: Icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/60 transition text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-neutral-100 inline-flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-neutral-700" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-neutral-950">{title}</p>
        <p className="text-[12px] text-neutral-500">{desc}</p>
      </div>
    </button>
  );
}
