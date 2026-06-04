import { toast } from "react-toastify";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import {
  Plus, Search, Trash2, Pencil, CreditCard, Receipt, TrendingUp, Tag,
  FileText, CheckCircle, AlertCircle, Clock, X, BarChart3, ChevronLeft,
  ChevronRight, History, Loader2,
} from "lucide-react";

const SIG = "#5E6AD2";
const SIG_TINT = "rgba(94,106,210,0.12)";

const EVENT_TYPES      = ["Tournament", "Training", "Facility", "Club", "Other"];
const PAYMENT_MODES    = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"];
const PAYMENT_STATUSES = ["Pending", "Partial", "Paid", "Failed"];

const formatCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const EMPTY_EXPENSE = {
  title: "", description: "", amount: "", category: "", eventType: "Club",
  eventName: "", vendor: "", expenseDate: new Date().toISOString().split("T")[0], notes: "",
};

const EMPTY_PAYMENT = {
  expenseId: "", amount: "", paymentMode: "Cash",
  paymentDate: new Date().toISOString().split("T")[0], transactionId: "", notes: "",
};

export default function MExpenses() {
  const { auth } = useContext(AuthContext);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [searchQuery, setSearchQuery]       = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterEventType, setFilterEventType] = useState("");
  const [filterStatus, setFilterStatus]     = useState("");

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");

  const [showExpenseModal,  setShowExpenseModal]  = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPaymentModal,  setShowPaymentModal]  = useState(false);
  const [showHistory,       setShowHistory]       = useState(false);

  const [editingExpense,  setEditingExpense]  = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expensePayments, setExpensePayments] = useState([]);

  const [expenseForm,  setExpenseForm]  = useState(EMPTY_EXPENSE);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [paymentForm,  setPaymentForm]  = useState(EMPTY_PAYMENT);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory, filterEventType, filterStatus, pagination.page]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: pagination.page, limit: 20 });
      if (searchQuery)     params.append("search", searchQuery);
      if (filterCategory)  params.append("category", filterCategory);
      if (filterEventType) params.append("eventType", filterEventType);
      if (filterStatus)    params.append("paymentStatus", filterStatus);

      const res = await axios.get(`/api/expenses?${params}`, { headers });
      setExpenses(res.data.expenses || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error("Fetch expenses error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get("/api/expenses/categories", { headers });
      setCategories(res.data.categories || []);
    } catch (err) { console.error("Fetch categories error:", err); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get("/api/expenses/analytics", { headers });
      setAnalytics(res.data.analytics || null);
    } catch (err) { console.error("Fetch analytics error:", err); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchExpenses();
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.category || !expenseForm.expenseDate) {
      toast.warn("Please fill title, amount, category, and date");
      return;
    }
    try {
      const payload = { ...expenseForm, amount: parseFloat(expenseForm.amount) };
      if (editingExpense) await axios.put(`/api/expenses/update/${editingExpense._id}`, payload, { headers });
      else                await axios.post("/api/expenses/add", payload, { headers });
      setShowExpenseModal(false);
      resetExpenseForm();
      fetchExpenses();
      fetchAnalytics();
      toast.success(editingExpense ? "Expense updated" : "Expense added");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await axios.delete(`/api/expenses/delete/${id}`, { headers });
      fetchExpenses();
      fetchAnalytics();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      title: expense.title,
      description: expense.description || "",
      amount: expense.amount.toString(),
      category: expense.category?._id || "",
      eventType: expense.eventType,
      eventName: expense.eventName || "",
      vendor: expense.vendor || "",
      expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split("T")[0] : "",
      notes: expense.notes || "",
    });
    setShowExpenseModal(true);
  };

  const resetExpenseForm = () => {
    setEditingExpense(null);
    setExpenseForm(EMPTY_EXPENSE);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) { toast.warn("Category name is required"); return; }
    try {
      await axios.post("/api/expenses/categories/create", categoryForm, { headers });
      setCategoryForm({ name: "", description: "" });
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm("Delete this category?")) return;
    try { await axios.delete(`/api/expenses/categories/${id}`, { headers }); fetchCategories(); }
    catch (err) { toast.error(err.response?.data?.message || err.message); }
  };

  const openPaymentModal = (expense) => {
    setPaymentForm({
      ...EMPTY_PAYMENT,
      expenseId: expense._id,
      amount: (expense.amount - expense.totalPaid).toString(),
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || !paymentForm.paymentMode) {
      toast.warn("Amount and payment mode are required");
      return;
    }
    try {
      await axios.post("/api/expenses/payment", {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
      }, { headers });
      setShowPaymentModal(false);
      fetchExpenses();
      fetchAnalytics();
      toast.success("Payment recorded");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const viewPaymentHistory = async (expense) => {
    try {
      setSelectedExpense(expense);
      const res = await axios.get(`/api/expenses/payments/${expense._id}`, { headers });
      setExpensePayments(res.data.payments || []);
      setShowHistory(true);
    } catch (err) {
      toast.error("Error fetching payments");
    }
  };

  const outstanding = analytics
    ? (analytics.totals.totalAmount || 0) - (analytics.totals.totalPaid || 0)
    : 0;

  return (
    <div className="p-6 max-w-[1320px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 mb-1.5">
            Finance · Expenses
          </p>
          <h1 className="text-[28px] leading-[1.1] font-semibold tracking-tight text-neutral-950">
            Expense management
          </h1>
          <p className="text-[13px] text-neutral-500 mt-1.5">
            Track and manage your event expenses.
          </p>
        </div>
        <div className="flex gap-2">
          <SigButton variant="outline" onClick={() => setShowCategoryModal(true)}>
            <Tag className="w-3.5 h-3.5" /> Categories
          </SigButton>
          <SigButton onClick={() => { resetExpenseForm(); setShowExpenseModal(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add expense
          </SigButton>
        </div>
      </div>

      {/* Analytics summary */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatTile icon={Receipt}     label="Total expenses" value={formatCurrency(analytics.totals.totalAmount)} />
          <StatTile icon={CheckCircle} label="Total paid"     value={formatCurrency(analytics.totals.totalPaid)} />
          <StatTile icon={AlertCircle} label="Outstanding"    value={formatCurrency(outstanding)} />
          <StatTile icon={BarChart3}   label="Categories"     value={analytics.byCategory?.length || 0} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg w-fit mb-4">
        {[
          { key: "expenses",  label: "Expenses",  icon: FileText  },
          { key: "analytics", label: "Analytics", icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`h-7 px-3 inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium transition ${
                active ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          );
        })}
      </div>

      {activeTab === "expenses" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <form onSubmit={handleSearch} className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search expenses…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 border border-neutral-200 rounded-lg text-[12px] bg-white focus:outline-none focus:border-[--sig] focus:ring-2 focus:ring-[--sig-tint]"
                style={{ "--sig": SIG, "--sig-tint": SIG_TINT }}
              />
            </form>
            <FilterSelect value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </FilterSelect>
            <FilterSelect value={filterEventType} onChange={(e) => { setFilterEventType(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
              <option value="">All event types</option>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </FilterSelect>
            <FilterSelect value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
              <option value="">All statuses</option>
              {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </FilterSelect>
          </div>

          {/* Table */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <EmptyBlock
                icon={Receipt}
                title="No expenses found"
                desc="Add your first expense to start tracking."
                ctaLabel="Add expense"
                onCta={() => { resetExpenseForm(); setShowExpenseModal(true); }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <Th>Expense</Th>
                      <Th>Category</Th>
                      <Th>Event</Th>
                      <Th align="right">Amount</Th>
                      <Th align="right">Paid</Th>
                      <Th align="center">Status</Th>
                      <Th>Date</Th>
                      <Th align="center">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((row) => (
                      <tr key={row._id} className="border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50/40 transition">
                        <Td>
                          <p className="text-[13px] font-semibold text-neutral-900">{row.title}</p>
                          {row.vendor && <p className="text-[11px] text-neutral-500">{row.vendor}</p>}
                        </Td>
                        <Td>
                          <Pill className="bg-neutral-100 text-neutral-700">
                            <Tag className="w-2.5 h-2.5" /> {row.category?.name || "—"}
                          </Pill>
                        </Td>
                        <Td>
                          <p className="text-[12px] text-neutral-700">{row.eventType}</p>
                          {row.eventName && <p className="text-[11px] text-neutral-500">{row.eventName}</p>}
                        </Td>
                        <Td align="right"><span className="text-[13px] font-semibold text-neutral-950 tabular-nums">{formatCurrency(row.amount)}</span></Td>
                        <Td align="right"><span className="text-[13px] font-semibold text-emerald-700 tabular-nums">{formatCurrency(row.totalPaid)}</span></Td>
                        <Td align="center"><ExpenseStatusPill status={row.paymentStatus} /></Td>
                        <Td><span className="text-[12px] text-neutral-500 font-mono tabular-nums">{formatDate(row.expenseDate)}</span></Td>
                        <Td align="center">
                          <div className="flex items-center justify-center gap-0.5">
                            {row.paymentStatus !== "Paid" && (
                              <IconBtn title="Record payment" onClick={() => openPaymentModal(row)}>
                                <CreditCard className="w-3.5 h-3.5" />
                              </IconBtn>
                            )}
                            <IconBtn title="Payment history" onClick={() => viewPaymentHistory(row)}>
                              <History className="w-3.5 h-3.5" />
                            </IconBtn>
                            <IconBtn title="Edit" onClick={() => openEditExpense(row)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </IconBtn>
                            <IconBtn title="Delete" onClick={() => handleDeleteExpense(row._id)} danger>
                              <Trash2 className="w-3.5 h-3.5" />
                            </IconBtn>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination.pages > 1 && (
              <div className="px-4 py-3 border-t border-neutral-100 flex justify-between items-center bg-neutral-50/60">
                <span className="text-[12px] text-neutral-500">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </span>
                <div className="flex gap-1.5">
                  <SigButton variant="outline" onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1} className="!h-8 !px-2.5 !text-[12px]">
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </SigButton>
                  <SigButton variant="outline" onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.pages} className="!h-8 !px-2.5 !text-[12px]">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </SigButton>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "analytics" && analytics && (
        <div className="space-y-4">
          <Section title="Expenses by category" icon={Tag}>
            {analytics.byCategory?.length > 0 ? (
              <div className="space-y-2.5">
                {analytics.byCategory.map((cat) => {
                  const pct = analytics.totals.totalAmount > 0 ? (cat.total / analytics.totals.totalAmount) * 100 : 0;
                  return (
                    <div key={cat._id} className="flex items-center gap-3">
                      <div className="w-32 text-[12px] font-semibold text-neutral-900 truncate">{cat._id}</div>
                      <div className="flex-1 bg-neutral-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max(pct, 5)}%`, background: SIG }}
                        >
                          <span className="text-[10px] font-semibold text-white tabular-nums">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-24 text-right text-[12px] font-semibold text-neutral-950 tabular-nums">{formatCurrency(cat.total)}</div>
                      <div className="w-14 text-right text-[11px] text-neutral-400 font-mono tabular-nums">{cat.count}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-neutral-400">No data yet</p>
            )}
          </Section>

          <Section title="Expenses by event type" icon={TrendingUp}>
            {analytics.byEventType?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analytics.byEventType.map((evt) => (
                  <div key={evt._id} className="rounded-xl border border-neutral-200 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{evt._id}</p>
                    <p className="text-[20px] font-semibold text-neutral-950 tabular-nums leading-none mt-1.5">{formatCurrency(evt.total)}</p>
                    <div className="flex justify-between mt-2 text-[11px] text-neutral-500">
                      <span>Paid: <span className="font-mono tabular-nums">{formatCurrency(evt.paid)}</span></span>
                      <span><span className="font-mono tabular-nums">{evt.count}</span> expenses</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-neutral-400">No data yet</p>
            )}
          </Section>

          <Section title="By payment status" icon={CreditCard}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {analytics.byStatus?.map((s) => (
                <div key={s._id} className="rounded-xl border border-neutral-200 p-3.5 text-center">
                  <ExpenseStatusPill status={s._id} />
                  <p className="text-[20px] font-semibold text-neutral-950 mt-2 tabular-nums leading-none">{formatCurrency(s.total)}</p>
                  <p className="text-[11px] text-neutral-500 mt-1"><span className="font-mono tabular-nums">{s.count}</span> expenses</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* === Add / Edit expense modal === */}
      {showExpenseModal && (
        <Modal
          title={editingExpense ? "Edit expense" : "Add expense"}
          subtitle={editingExpense ? "Update the details of this expense." : "Track a new expense for an event."}
          onClose={() => { setShowExpenseModal(false); resetExpenseForm(); }}
          footer={
            <div className="flex gap-2">
              <SigButton variant="outline" className="flex-1" onClick={() => { setShowExpenseModal(false); resetExpenseForm(); }}>Cancel</SigButton>
              <SigButton className="flex-1" onClick={handleSaveExpense}>
                <CheckCircle className="w-3.5 h-3.5" /> {editingExpense ? "Update" : "Add expense"}
              </SigButton>
            </div>
          }
        >
          <div className="space-y-3">
            <SigInput label="Title *" value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} placeholder="e.g. Shuttlecocks for tournament" />
            <div className="grid grid-cols-2 gap-3">
              <SigInput label="Amount (₹) *" type="number" min="0" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0" />
              <SigInput label="Date *" type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SigSelect label="Category *" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </SigSelect>
              <SigSelect label="Event type" value={expenseForm.eventType} onChange={(e) => setExpenseForm({ ...expenseForm, eventType: e.target.value })}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </SigSelect>
            </div>
            <SigInput label="Event name" value={expenseForm.eventName} onChange={(e) => setExpenseForm({ ...expenseForm, eventName: e.target.value })} placeholder="e.g. State Badminton Championship 2026" />
            <SigInput label="Vendor"     value={expenseForm.vendor}    onChange={(e) => setExpenseForm({ ...expenseForm, vendor:    e.target.value })} placeholder="e.g. Decathlon" />
            <div>
              <Label>Description</Label>
              <textarea
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-[13px] bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[--sig] focus:ring-2 focus:ring-[--sig-tint] resize-none"
                style={{ "--sig": SIG, "--sig-tint": SIG_TINT }}
                placeholder="Optional notes…"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* === Category modal === */}
      {showCategoryModal && (
        <Modal title="Expense categories" subtitle="Add or remove your custom categories." onClose={() => setShowCategoryModal(false)}>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="New category name…"
              className="flex-1 h-9 px-3 border border-neutral-200 rounded-lg text-[13px] bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[--sig] focus:ring-2 focus:ring-[--sig-tint]"
              style={{ "--sig": SIG, "--sig-tint": SIG_TINT }}
            />
            <SigButton onClick={handleSaveCategory}>
              <Plus className="w-3.5 h-3.5" /> Add
            </SigButton>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-[12px] text-neutral-400 text-center py-4">No categories yet. Add one above.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat._id} className="flex justify-between items-center px-3 py-2 rounded-lg border border-neutral-200">
                  <span className="text-[13px] font-medium text-neutral-900">{cat.name}</span>
                  <IconBtn onClick={() => handleDeleteCategory(cat._id)} title="Delete" danger>
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconBtn>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* === Record payment modal === */}
      {showPaymentModal && (
        <Modal
          title="Record payment"
          onClose={() => setShowPaymentModal(false)}
          footer={
            <div className="flex gap-2">
              <SigButton variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>Cancel</SigButton>
              <SigButton className="flex-1" onClick={handleRecordPayment}>
                <CheckCircle className="w-3.5 h-3.5" /> Record payment
              </SigButton>
            </div>
          }
        >
          <div className="space-y-3">
            <SigInput label="Amount (₹) *" type="number" min="0" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            <SigSelect label="Payment mode *" value={paymentForm.paymentMode} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}>
              {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </SigSelect>
            <SigInput label="Payment date *" type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
            <SigInput label="Transaction ID" value={paymentForm.transactionId} onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })} placeholder="Optional" />
            <SigInput label="Notes"          value={paymentForm.notes}         onChange={(e) => setPaymentForm({ ...paymentForm, notes:         e.target.value })} placeholder="Optional" />
          </div>
        </Modal>
      )}

      {/* === Payment history modal === */}
      {showHistory && (
        <Modal
          title="Payment history"
          subtitle={selectedExpense?.title}
          onClose={() => setShowHistory(false)}
        >
          <div className="grid grid-cols-3 gap-2 mb-4">
            <SummaryTile label="Total"     value={formatCurrency(selectedExpense?.amount)} />
            <SummaryTile label="Paid"      value={formatCurrency(selectedExpense?.totalPaid)} tone="emerald" />
            <SummaryTile label="Remaining" value={formatCurrency((selectedExpense?.amount || 0) - (selectedExpense?.totalPaid || 0))} tone="amber" />
          </div>
          {expensePayments.length === 0 ? (
            <p className="text-[12px] text-neutral-400 text-center py-6">No payments recorded yet</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {expensePayments.map((p) => (
                <div key={p._id} className="flex justify-between items-center px-3 py-2.5 rounded-lg border border-neutral-200">
                  <div>
                    <p className="text-[13px] font-semibold text-neutral-950 tabular-nums">{formatCurrency(p.amount)}</p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      {p.paymentMode} · {formatDate(p.paymentDate)}
                      {p.transactionId && ` · ${p.transactionId}`}
                    </p>
                  </div>
                  <ExpenseStatusPill status={p.status} />
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── SIG inline primitives ────────────────────────────────────────────────────

function SigButton({ children, onClick, variant = "primary", type = "button", disabled, className = "" }) {
  const base = "h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-lg transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  if (variant === "outline") {
    return (
      <button type={type} onClick={onClick} disabled={disabled}
        className={`${base} border border-neutral-200 hover:border-neutral-300 text-neutral-700 hover:bg-neutral-50 ${className}`}>
        {children}
      </button>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} text-white ${className}`}
      style={{ backgroundColor: SIG }}>
      {children}
    </button>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="w-8 h-8 inline-flex items-center justify-center rounded-lg" style={{ background: SIG_TINT, color: SIG }}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="text-[22px] font-semibold leading-none text-neutral-950 tabular-nums">{value ?? 0}</p>
      <p className="mt-1.5 text-[12px] text-neutral-500">{label}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400" />}
        <h3 className="text-[13px] font-semibold text-neutral-950">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500 mb-1.5">{children}</label>;
}

function SigInput({ label, ...rest }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        {...rest}
        className="w-full h-9 px-3 border border-neutral-200 rounded-lg text-[13px] bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[--sig] focus:ring-2 focus:ring-[--sig-tint]"
        style={{ "--sig": SIG, "--sig-tint": SIG_TINT }}
      />
    </div>
  );
}

function SigSelect({ label, children, ...rest }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        {...rest}
        className="w-full h-9 px-3 border border-neutral-200 rounded-lg text-[13px] bg-white text-neutral-900 outline-none transition focus:border-[--sig] focus:ring-2 focus:ring-[--sig-tint]"
        style={{ "--sig": SIG, "--sig-tint": SIG_TINT }}
      >
        {children}
      </select>
    </div>
  );
}

function FilterSelect({ children, ...rest }) {
  return (
    <select
      {...rest}
      className="h-8 px-3 border border-neutral-200 rounded-lg text-[12px] bg-white text-neutral-700 focus:outline-none focus:border-[--sig] focus:ring-2 focus:ring-[--sig-tint]"
      style={{ "--sig": SIG, "--sig-tint": SIG_TINT }}
    >
      {children}
    </select>
  );
}

function Pill({ className, children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${className}`}>
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
      className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition ${
        danger ? "text-neutral-400 hover:text-rose-600 hover:bg-rose-50" : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );
}

function Th({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500 ${a}`}>{children}</th>;
}

function Td({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`py-3 px-4 ${a}`}>{children}</td>;
}

function ExpenseStatusPill({ status }) {
  let cls = "bg-neutral-100 text-neutral-700";
  let icon = null;
  switch (status) {
    case "Paid":    cls = "bg-emerald-50 text-emerald-700"; icon = <CheckCircle className="w-2.5 h-2.5" />; break;
    case "Partial": cls = "bg-amber-50 text-amber-700";     icon = <AlertCircle className="w-2.5 h-2.5" />; break;
    case "Pending": cls = "bg-neutral-100 text-neutral-700"; icon = <Clock className="w-2.5 h-2.5" />; break;
    case "Failed":  cls = "bg-rose-50 text-rose-700";       icon = <X className="w-2.5 h-2.5" />; break;
    default: break;
  }
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {icon} {status || "—"}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-neutral-200 shadow-[0_24px_64px_rgba(0,0,0,0.16)] max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-neutral-950">{title}</p>
            {subtitle && <p className="text-[12px] text-neutral-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/60">{footer}</div>}
      </div>
    </div>
  );
}

function EmptyBlock({ icon: Icon, title, desc, ctaLabel, onCta }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="w-10 h-10 rounded-xl bg-neutral-100 inline-flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-neutral-400" />
      </div>
      <h3 className="text-[14px] font-semibold text-neutral-900">{title}</h3>
      <p className="text-[13px] text-neutral-500 mt-1 max-w-md mx-auto">{desc}</p>
      {ctaLabel && (
        <button onClick={onCta}
          className="mt-4 h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white rounded-lg transition active:scale-[0.98]"
          style={{ backgroundColor: SIG }}>
          <Plus className="w-3.5 h-3.5" /> {ctaLabel}
        </button>
      )}
    </div>
  );
}

function SummaryTile({ label, value, tone }) {
  const tones = { emerald: "text-emerald-700", amber: "text-amber-700" };
  return (
    <div className="rounded-lg border border-neutral-200 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</p>
      <p className={`text-[15px] font-semibold tabular-nums leading-tight mt-1 ${tones[tone] || "text-neutral-950"}`}>{value}</p>
    </div>
  );
}
