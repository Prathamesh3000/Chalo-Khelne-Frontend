// Manager/RapidRalliesRegisterModal.jsx
// Register / edit a Rapid Rallies team: exactly 5 players (P1..P5) with gender,
// P3 locked to female (plays the Women's Singles rubber). Posts to the
// self-contained team-knockout register endpoint.
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { X, Crown, Loader2 } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const SLOTS = [
  { slot: "P1", label: "Captain", locked: null },
  { slot: "P2", label: "Player 2", locked: null },
  { slot: "P3", label: "Women's Singles", locked: "female" },
  { slot: "P4", label: "Player 4", locked: null },
  { slot: "P5", label: "Player 5", locked: null },
];

const emptyPlayers = () =>
  SLOTS.map((s) => ({ name: "", gender: s.locked || "male" }));

export default function RapidRalliesRegisterModal({
  open,
  onClose,
  tournamentId,
  sportId,
  editingTeam,
  onSaved,
}) {
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState(emptyPlayers());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingTeam) {
      setTeamName(editingTeam.teamName || editingTeam.team?.name || "");
      const roster = editingTeam.roster || [];
      setPlayers(
        SLOTS.map((s, i) => ({
          name: roster[i]?.name || "",
          gender: s.locked || roster[i]?.gender || "male",
        }))
      );
    } else {
      setTeamName("");
      setPlayers(emptyPlayers());
    }
  }, [editingTeam, open]);

  if (!open) return null;

  const setPlayer = (i, patch) =>
    setPlayers((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const submit = async () => {
    if (!teamName.trim()) return toast.error("Team name is required");
    for (let i = 0; i < SLOTS.length; i++) {
      if (!players[i].name.trim())
        return toast.error(`${SLOTS[i].slot} (${SLOTS[i].label}) needs a player name`);
    }
    if (players[2].gender !== "female")
      return toast.error("Slot P3 must be a female player");

    setSaving(true);
    try {
      const res = await axios.post(
        "/api/tournaments/team-knockout/rapid-rallies/register-team",
        {
          tournamentId,
          sportId: sportId || undefined,
          teamName: teamName.trim(),
          players: players.map((p) => ({ name: p.name.trim(), gender: p.gender })),
          teamId: editingTeam?._id || undefined,
        }
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Team saved");
        onSaved?.();
        onClose?.();
      } else {
        toast.error(res.data?.message || "Failed to save team");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save team");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onClose}
      >
        <DialogA11y onClose={onClose} />
      <div
        className="bg-[#181A22] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#181A22] rounded-t-2xl">
          <div>
            <h3 className="text-base font-bold text-white">
              {editingTeam ? "Edit Team" : "Register Team"}
            </h3>
            <p className="text-xs text-gray-400">Rapid Rallies — 5 players, one female at P3</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1" htmlFor="team-name">Team name</label>
            <input id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Kharadi Falcons"
              className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">Roster (P1–P5)</label>
            {SLOTS.map((s, i) => (
              <div key={s.slot} className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                    s.locked === "female" ? "bg-pink-500/15 text-pink-400" : "bg-orange-500/15 text-orange-400"
                  }`}
                >
                  {s.slot}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    value={players[i].name}
                    onChange={(e) => setPlayer(i, { name: e.target.value })}
                    placeholder={`${s.label} name`}
                    className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                {s.locked === "female" ? (
                  <span className="text-[11px] font-bold text-pink-400 bg-pink-500/15 px-2.5 py-2 rounded-xl whitespace-nowrap">
                    Female
                  </span>
                ) : (
                  <select
                    value={players[i].gender}
                    onChange={(e) => setPlayer(i, { gender: e.target.value })}
                    className="px-2 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-gray-200 focus:outline-none focus:border-orange-400"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                )}
                {i === 0 && <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" title="Captain" />}
              </div>
            ))}
            <p className="text-[10px] text-gray-400 pt-1">
              P1 is the captain. P3 must be female and plays the Women's Singles rubber. No substitutes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06] sticky bottom-0 bg-[#181A22] rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingTeam ? "Save changes" : "Register team"}
          </button>
        </div>
      </div>
    </div>
  );
}
