import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Eye, AlertCircle, Grid3X3, Loader2 } from "lucide-react";
import { assetUrl } from "../shared/lib/assetUrl";
import { ManagerShell } from "../shared/layout";

const SlotBooking = () => {
  const navigate = useNavigate();
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user?._id) throw new Error("Manager ID not found");
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/turfs/assigned/${user._id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to fetch assigned turfs");
        const data = await res.json();
        setTurfs(Array.isArray(data) ? data : data.turfs || []);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <ManagerShell searchPlaceholder="Search turfs…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Grid3X3 className="w-3.5 h-3.5" />
            Tournaments · Slot booking
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Slot booking
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            {turfs.length} turf{turfs.length === 1 ? "" : "s"} assigned to you.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="px-4 py-3 rounded-md flex items-center gap-2.5 text-[13px] text-red-300"
          style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      ) : turfs.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <MapPin className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">No turfs assigned</h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">Contact your club admin to get turfs assigned.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {turfs.map((turf) => (
            <TurfCard key={turf._id} turf={turf} onView={() => navigate(`/turf-details/${turf._id}`)} />
          ))}
        </div>
      )}
    </ManagerShell>
  );
};

function TurfCard({ turf, onView }) {
  return (
    <article className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden group transition hover:border-white/[0.12]">
      {/* Image */}
      <div className="h-40 bg-white/[0.04] overflow-hidden relative">
        {turf.images?.length > 0 ? (
          <img
            src={assetUrl(turf.images[0])}
            alt={turf.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-600" />
          </div>
        )}
        <span
          className={`absolute top-2.5 right-2.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            turf.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
          }`}
          style={{ backdropFilter: "blur(8px)" }}
        >
          {turf.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="p-4">
        <h3 className="text-[14px] font-medium text-white truncate mb-1.5 group-hover:text-orange-300 transition">
          {turf.name}
        </h3>

        {(turf.address?.area || turf.address?.city) && (
          <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-3">
            <MapPin className="w-3 h-3 flex-shrink-0 text-gray-500" />
            <span className="truncate">{[turf.address?.area, turf.address?.city].filter(Boolean).join(", ")}</span>
          </div>
        )}

        {turf.sports?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {turf.sports.slice(0, 3).map((sport, i) => (
              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400">
                {sport.name}
              </span>
            ))}
            {turf.sports.length > 3 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/[0.06] text-gray-400">
                +{turf.sports.length - 3}
              </span>
            )}
          </div>
        )}

        {turf.owner?.clubName && (
          <p className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 mb-3">
            {turf.owner.clubName}
          </p>
        )}

        <button
          onClick={onView}
          className="w-full h-9 inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold rounded-md transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
        >
          <Eye className="w-3.5 h-3.5" /> View details
        </button>
      </div>
    </article>
  );
}

export default SlotBooking;
