import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Trash2, Dumbbell, UserPlus, X, Loader2 } from "lucide-react";

const SPORTS_OPTIONS = [
  "Badminton", "Table Tennis", "Tennis", "Cricket", "Football", "Basketball",
  "Volleyball", "Chess", "Carrom", "Pickleball", "Snooker", "Hockey",
  "Kabaddi", "Swimming", "Athletics",
];

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" };

/**
 * Sports & Trainers (school / organization admins). Flow:
 *   1) Add the sports the school offers.
 *   2) Assign trainers to each sport (multiple allowed). An empty slot is
 *      "Not decided".
 * Trainers come from the Managers tab (staffRole === "trainer").
 */
export default function SportTrainers({ trainers = [] }) {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSport, setNewSport] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchSports = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/club-sports");
      setSports(res.data?.sports || []);
    } catch {
      setSports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSports(); }, []);

  const usedNames = new Set(sports.map((s) => s.name));
  const available = SPORTS_OPTIONS.filter((s) => !usedNames.has(s));

  const addSport = async () => {
    if (!newSport) return;
    setAdding(true);
    try {
      await axios.post("/api/club-sports", { name: newSport });
      setNewSport("");
      fetchSports();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add sport");
    } finally {
      setAdding(false);
    }
  };

  const removeSport = async (id) => {
    if (!window.confirm("Remove this sport and its trainer assignments?")) return;
    try {
      await axios.delete(`/api/club-sports/${id}`);
      setSports((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove sport");
    }
  };

  // Persist a sport's slots; backend snapshots the trainer names.
  const saveSlots = async (sportId, slots) => {
    try {
      const res = await axios.put(`/api/club-sports/${sportId}/trainers`, {
        trainers: slots.map((s) => ({ trainer: s.trainer || null })),
      });
      const updated = res.data?.sport;
      if (updated) setSports((prev) => prev.map((s) => (s._id === sportId ? updated : s)));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update trainers");
      fetchSports();
    }
  };

  const addSlot = (sport) =>
    saveSlots(sport._id, [...(sport.trainers || []), { trainer: null, name: "Not decided" }]);
  const removeSlot = (sport, idx) =>
    saveSlots(sport._id, (sport.trainers || []).filter((_, i) => i !== idx));
  const changeSlot = (sport, idx, trainerId) =>
    saveSlots(
      sport._id,
      (sport.trainers || []).map((s, i) => (i === idx ? { ...s, trainer: trainerId || null } : s))
    );

  return (
    <div className="space-y-4">
      {/* Add a sport */}
      <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
        <h3 className="text-[14px] font-semibold text-white mb-3 inline-flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-orange-400" /> Available sports
        </h3>
        <div className="flex items-end gap-2 max-w-md">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5" htmlFor="add-a-sport">Add a sport</label>
            <select id="add-a-sport"
              value={newSport}
              onChange={(e) => setNewSport(e.target.value)}
              className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none"
              style={inputStyle}
            >
              <option value="">Select a sport…</option>
              {available.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={addSport}
            disabled={!newSport || adding}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition disabled:opacity-50 w-auto"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
          </button>
        </div>
        {trainers.length === 0 && (
          <p className="text-[12px] text-amber-300/80 mt-3">
            Tip: create your trainers first in the <strong>Managers</strong> tab (role “Trainer”), then assign them here.
          </p>
        )}
      </div>

      {/* Sports list */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
      ) : sports.length === 0 ? (
        <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center">
          <Dumbbell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400">No sports added yet. Add one above to start assigning trainers.</p>
        </div>
      ) : (
        sports.map((sport) => (
          <div key={sport._id} className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[14px] font-semibold text-white">{sport.name}</h4>
              <button
                onClick={() => removeSport(sport._id)}
                title="Remove sport"
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {(sport.trainers || []).length === 0 && (
                <p className="text-[12px] text-gray-500">No trainers assigned yet.</p>
              )}
              {(sport.trainers || []).map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 w-14">Trainer {idx + 1}</span>
                  <select
                    value={slot.trainer ? String(slot.trainer) : ""}
                    onChange={(e) => changeSlot(sport, idx, e.target.value)}
                    className="flex-1 max-w-xs h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none"
                    style={inputStyle}
                  >
                    <option value="">Not decided</option>
                    {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                  <button
                    onClick={() => removeSlot(sport, idx)}
                    title="Remove slot"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addSlot(sport)}
              className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-gray-200 text-[12px] font-semibold transition w-auto"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add trainer
            </button>
          </div>
        ))
      )}
    </div>
  );
}
