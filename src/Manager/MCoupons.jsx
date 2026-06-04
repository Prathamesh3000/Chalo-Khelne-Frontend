import { toast } from "react-toastify";
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import {
  Tag, Plus, Trash2, ToggleLeft, ToggleRight, IndianRupee, Calendar, Copy,
  Users, X, Check, RefreshCcw, Search, Gift, Shuffle,
} from "lucide-react";
import { ManagerShell } from "../shared/layout";

const EMPTY_FORM = {
  code: "", discountType: "percentage", discountValue: "",
  applicableTo: "all", applicableId: "", applicableName: "",
  usageLimit: "", perUserLimit: "1", expiryDate: "",
  minAmount: "", maxDiscount: "", description: "",
};

export default function MCoupons() {
  const { auth } = useContext(AuthContext);
  const managerId = auth?._id;

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCoupons();
    fetchAnalytics();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/coupons/list", { params: { createdBy: managerId } });
      if (res.data.success) setCoupons(res.data.coupons);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get("/api/coupons/analytics", { params: { createdBy: managerId } });
      if (res.data.success) setStats(res.data.stats);
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.post("/api/coupons/create", {
        ...form,
        code: form.code.toUpperCase(),
        discountValue: Number(form.discountValue),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perUserLimit: Number(form.perUserLimit) || 1,
        minAmount: form.minAmount ? Number(form.minAmount) : 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        createdBy: managerId,
        createdByName: auth?.name,
        createdByModel: "Manager",
      });
      if (res.data.success) {
        setShowCreate(false);
        setForm(EMPTY_FORM);
        fetchCoupons();
        fetchAnalytics();
        toast.success("Coupon created");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try { await axios.put(`/api/coupons/toggle/${id}`); fetchCoupons(); }
    catch (err) { toast.info(err.response?.data?.message || err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    try { await axios.delete(`/api/coupons/${id}`); fetchCoupons(); fetchAnalytics(); }
    catch (err) { toast.info(err.response?.data?.message || err.message); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.info(`Copied: ${code}`);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, code });
  };

  const filtered = coupons.filter(
    (c) => !search || c.code.includes(search.toUpperCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ManagerShell searchPlaceholder="Search coupons…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Tag className="w-3.5 h-3.5" />
            Finance · Coupons & discounts
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Coupons & discounts
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Create and manage discount coupons for tournament registrations and turf bookings.
          </p>
        </div>
        <DarkButton onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New coupon
        </DarkButton>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile icon={Tag}         label="Total coupons"        value={stats.totalCoupons || 0} />
        <StatTile icon={Check}       label="Active"               value={stats.activeCoupons || 0} tone="green" />
        <StatTile icon={Users}       label="Times used"           value={stats.totalUsage || 0} />
        <StatTile icon={IndianRupee} label="Total discount given" value={`₹${(stats.totalDiscountGiven || 0).toLocaleString("en-IN")}`} />
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search coupons…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCcw className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyBlock
          icon={Gift}
          title="No coupons yet"
          desc="Create your first coupon to start offering discounts."
          ctaLabel="New coupon"
          onCta={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((coupon) => (
            <CouponCard
              key={coupon._id}
              coupon={coupon}
              onToggle={() => handleToggle(coupon._id)}
              onDelete={() => handleDelete(coupon._id)}
              onCopy={() => copyCode(coupon.code)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <DarkModal
          title="New coupon"
          subtitle="Create a new discount code."
          onClose={() => setShowCreate(false)}
          footer={
            <div className="flex gap-2">
              <DarkButton type="button" variant="ghost" className="flex-1" onClick={() => setShowCreate(false)} disabled={saving}>
                Cancel
              </DarkButton>
              <DarkButton type="submit" form="create-coupon-form" className="flex-1" disabled={saving}>
                <Check className="w-3.5 h-3.5" /> {saving ? "Creating…" : "Create coupon"}
              </DarkButton>
            </div>
          }
        >
          <form id="create-coupon-form" onSubmit={handleCreate} className="space-y-3">
            <div>
              <DarkLabel>Coupon code *</DarkLabel>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                  className="flex-1 h-9 px-3 rounded-md text-[13px] font-mono font-semibold tracking-wider text-gray-200 placeholder:text-gray-500 focus:outline-none uppercase"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  placeholder="SUMMER20"
                />
                <DarkButton type="button" variant="ghost" onClick={generateCode}>
                  <Shuffle className="w-3.5 h-3.5" /> Generate
                </DarkButton>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DarkSelect label="Discount type *" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                <option value="percentage" className="bg-[#181A22]">Percentage (%)</option>
                <option value="flat"       className="bg-[#181A22]">Flat amount (₹)</option>
              </DarkSelect>
              <DarkInput
                label={form.discountType === "percentage" ? "Percentage *" : "Amount (₹) *"}
                type="number"
                required
                min={1}
                max={form.discountType === "percentage" ? 100 : 99999}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                placeholder={form.discountType === "percentage" ? "20" : "100"}
              />
            </div>

            <DarkSelect label="Applicable to *" value={form.applicableTo} onChange={(e) => setForm({ ...form, applicableTo: e.target.value })}>
              <option value="all"        className="bg-[#181A22]">All (facility + tournament)</option>
              <option value="facility"   className="bg-[#181A22]">Facility bookings only</option>
              <option value="tournament" className="bg-[#181A22]">Tournament registrations only</option>
            </DarkSelect>

            <div className="grid grid-cols-2 gap-3">
              <DarkInput label="Expiry date *" type="date" required value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              <DarkInput label="Usage limit"  type="number" min={1} value={form.usageLimit}  onChange={(e) => setForm({ ...form, usageLimit:  e.target.value })} placeholder="Unlimited" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DarkInput label="Min order (₹)" type="number" min={0} value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} placeholder="0" />
              {form.discountType === "percentage" && (
                <DarkInput label="Max discount (₹)" type="number" min={1} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="No cap" />
              )}
            </div>

            <DarkInput
              label="Description"
              type="text"
              maxLength={200}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Summer discount for all bookings"
            />
          </form>
        </DarkModal>
      )}
    </ManagerShell>
  );
}

// ── Coupon card ──────────────────────────────────────────────────────────────

function CouponCard({ coupon, onToggle, onDelete, onCopy }) {
  const isExpired   = coupon.isExpired;
  const isExhausted = coupon.isExhausted;
  const isInactive  = !coupon.isActive;
  const dimmed      = isExpired || isInactive;

  const scopeColor =
    coupon.applicableTo === "facility"   ? "bg-blue-500/15 text-blue-300"
    : coupon.applicableTo === "tournament" ? "bg-orange-500/15 text-orange-400"
    : "bg-white/[0.06] text-gray-400";

  return (
    <article className={`bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden transition ${dimmed ? "opacity-60" : "hover:border-white/[0.12]"}`}>
      {/* Top accent stripe — orange for tournament, blue for facility, neutral for all */}
      <div
        aria-hidden="true"
        style={{
          height: 3,
          background:
            coupon.applicableTo === "facility"   ? "#3b82f6"
            : coupon.applicableTo === "tournament" ? "#f97316"
            : "rgba(255,255,255,0.12)",
        }}
      />

      <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Pill className={scopeColor}>{coupon.applicableTo}</Pill>
          {isExpired   && <Pill className="bg-red-500/15 text-red-400">Expired</Pill>}
          {isExhausted && <Pill className="bg-amber-500/15 text-amber-400">Exhausted</Pill>}
        </div>
        <div className="flex items-center gap-0.5">
          <IconBtn onClick={onToggle} title={coupon.isActive ? "Deactivate" : "Activate"}>
            {coupon.isActive
              ? <ToggleRight className="w-4 h-4 text-emerald-400" />
              : <ToggleLeft  className="w-4 h-4" />}
          </IconBtn>
          <IconBtn onClick={onDelete} title="Delete" danger>
            <Trash2 className="w-3.5 h-3.5" />
          </IconBtn>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-[13px] font-medium text-white bg-white/[0.06] px-2.5 py-1 rounded tracking-wider">
            {coupon.code}
          </span>
          <IconBtn onClick={onCopy} title="Copy code">
            <Copy className="w-3.5 h-3.5" />
          </IconBtn>
        </div>

        <div className="flex items-baseline gap-1.5 mb-2">
          {coupon.discountType === "percentage" ? (
            <>
              <span className="text-[28px] font-medium text-orange-400 tabular-nums">{coupon.discountValue}%</span>
              <span className="text-[13px] text-gray-400">off</span>
              {coupon.maxDiscount && <span className="text-[11px] text-gray-500 ml-1">(max ₹{coupon.maxDiscount})</span>}
            </>
          ) : (
            <>
              <span className="text-[28px] font-medium text-orange-400 tabular-nums">₹{coupon.discountValue}</span>
              <span className="text-[13px] text-gray-400">flat off</span>
            </>
          )}
        </div>

        {coupon.description && <p className="text-[12px] text-gray-400 mb-3">{coupon.description}</p>}

        <div className="space-y-1 text-[12px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-gray-500" />
            Expires <span className="font-mono tabular-nums">{new Date(coupon.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-gray-500" />
            <span>Used <span className="font-mono tabular-nums">{coupon.usedCount}</span>{coupon.usageLimit ? ` / ${coupon.usageLimit}` : " (unlimited)"}</span>
          </div>
          {coupon.minAmount > 0 && (
            <div className="flex items-center gap-1.5">
              <IndianRupee className="w-3 h-3 text-gray-500" />
              Min order <span className="font-mono tabular-nums">₹{coupon.minAmount}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Dark inline primitives ───────────────────────────────────────────────────

function DarkButton({ children, onClick, variant = "primary", type = "button", disabled, form, className = "" }) {
  const base = "h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-md transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-auto";
  if (variant === "ghost") {
    return (
      <button type={type} onClick={onClick} disabled={disabled} form={form}
        className={`${base} text-gray-200 hover:text-white hover:bg-white/[0.06] ${className}`}
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {children}
      </button>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} form={form}
      className={`${base} bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30 ${className}`}>
      {children}
    </button>
  );
}

function StatTile({ icon: Icon, label, value, tone = "orange" }) {
  const tones = {
    orange: { bg: "bg-orange-500/15",  text: "text-orange-400"  },
    green:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  };
  const t = tones[tone] || tones.orange;
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`grid w-[34px] h-[34px] rounded-md place-items-center ${t.bg}`}>
          <Icon className={`w-[18px] h-[18px] ${t.text}`} />
        </span>
      </div>
      <p className="text-[24px] font-medium leading-none text-white tabular-nums">{value ?? 0}</p>
      <p className="mt-1 text-[12px] text-gray-400">{label}</p>
    </div>
  );
}

function DarkLabel({ children }) {
  return <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{children}</label>;
}

function DarkInput({ label, ...rest }) {
  return (
    <div>
      <DarkLabel>{label}</DarkLabel>
      <input
        {...rest}
        className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      />
    </div>
  );
}

function DarkSelect({ label, children, ...rest }) {
  return (
    <div>
      <DarkLabel>{label}</DarkLabel>
      <select
        {...rest}
        className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {children}
      </select>
    </div>
  );
}

function Pill({ className, children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition w-auto ${
        danger ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-500 hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function DarkModal({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#181A22] border border-white/[0.06] rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.5)] max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-white">{title}</p>
            {subtitle && <p className="text-[12px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition flex-shrink-0 w-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">{footer}</div>}
      </div>
    </div>
  );
}

function EmptyBlock({ icon: Icon, title, desc, ctaLabel, onCta }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
      <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <h3 className="text-[14px] font-medium text-white">{title}</h3>
      <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">{desc}</p>
      {ctaLabel && (
        <button onClick={onCta}
          className="mt-4 h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white rounded-md transition active:scale-[0.98] bg-orange-500 hover:bg-orange-600 w-auto">
          <Plus className="w-3.5 h-3.5" /> {ctaLabel}
        </button>
      )}
    </div>
  );
}
