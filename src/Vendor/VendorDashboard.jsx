import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Store, Package, ShoppingBag, BadgeCheck, AlertTriangle } from "lucide-react";

export default function VendorDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/vendors/me");
        setProfile(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load your vendor profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading your dashboard…</div>;
  }
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5" /> {error}
        </div>
      </div>
    );
  }

  const suspended = profile?.status === "suspended";

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <Store className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {profile?.businessName || "Vendor Dashboard"}
          </h1>
          <p className="text-sm text-gray-500">Welcome back, {profile?.ownerName}</p>
        </div>
      </div>

      {suspended && (
        <div className="mt-4 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Your vendor account is suspended. Please contact the platform admin.
        </div>
      )}

      {/* Stat cards (placeholders until products/store are connected) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { label: "Products", value: "—", icon: Package, hint: "Coming soon" },
          { label: "Orders", value: "—", icon: ShoppingBag, hint: "Coming soon" },
          { label: "Account", value: suspended ? "Suspended" : "Active", icon: BadgeCheck, hint: profile?.email },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold text-gray-800">{s.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">{s.label}</p>
              {s.hint && <p className="text-[11px] text-gray-400 truncate">{s.hint}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Business summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Business details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <Row label="Business name" value={profile?.businessName} />
          <Row label="Owner" value={profile?.ownerName} />
          <Row label="Email" value={profile?.email} />
          <Row label="Phone" value={profile?.phone || "—"} />
          <Row label="Category" value={profile?.category || "—"} />
          <Row label="City" value={profile?.address?.city || "—"} />
        </dl>
        <Link to="/vendor-profile" className="inline-block mt-4 text-sm font-medium text-green-600 hover:underline">
          Edit store profile →
        </Link>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Link to="/vendor-incoming" className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Package className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Incoming Products</p>
            <p className="text-xs text-gray-500">Review &amp; accept products to buy</p>
          </div>
        </Link>
        <Link to="/vendor-acquisitions" className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-sm font-semibold text-gray-800">My Acquisitions</p>
            <p className="text-xs text-gray-500">Pick up, price &amp; publish to store</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-1.5">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-800 font-medium text-right truncate ml-4">{value}</dd>
    </div>
  );
}
