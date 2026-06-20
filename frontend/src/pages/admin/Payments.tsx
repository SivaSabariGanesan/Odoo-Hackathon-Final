import { useState, useRef, useEffect } from "react";
import {
  Plus, Trash2, User, Menu, MonitorSmartphone,
  ShoppingCart, ArrowUpFromLine, LayoutGrid, Tag,
  CreditCard, Ticket, CalendarRange, Users, ChefHat,
  BarChart3, LogOut, X, Check, Loader2, Settings,
  Eye, EyeOff, RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ROUTES } from "../../routes/paths";
import {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  enablePaymentMethod,
  disablePaymentMethod,
  getCashfreeConfig,
  updateCashfreeConfig,
  type PaymentMethod,
  type PaymentMethodType,
  type CashfreeConfig,
} from "../../api/payments";

const NAV_ITEMS = [
  { label: "Products", icon: LayoutGrid, to: ROUTES.PRODUCTS },
  { label: "Category", icon: Tag, to: ROUTES.CATEGORIES },
  { label: "Payment Method", icon: CreditCard, to: ROUTES.PAYMENTS },
  { label: "Coupon & Promotion", icon: Ticket, to: ROUTES.COUPONS },
  { label: "Booking", icon: CalendarRange, to: ROUTES.FLOOR_TABLES },
  { label: "User/Employee", icon: Users, to: ROUTES.EMPLOYEES },
  { label: "KDS", icon: ChefHat, to: ROUTES.KDS },
  { label: "Reports", icon: BarChart3, to: ROUTES.REPORTS },
  { label: "Log Out", icon: LogOut, to: ROUTES.LOGIN },
];

const TYPE_COLORS: Record<PaymentMethodType, string> = {
  CASH: "bg-green-100 text-green-700",
  CARD: "bg-purple-100 text-purple-700",
  CASHFREE: "bg-blue-100 text-blue-700",
};

// ── Payment Method Form ───────────────────────────────────────────
function PayMethodForm({
  method,
  onClose,
  onSaved,
}: {
  method: PaymentMethod | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(method?.name ?? "");
  const [type, setType] = useState<PaymentMethodType>(method?.type ?? "CASH");
  const [isEnabled, setIsEnabled] = useState(method?.isEnabled ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (method) {
        await updatePaymentMethod(method.publicId, { name: name.trim(), isEnabled });
        toast.success("Payment method updated");
      } else {
        await createPaymentMethod({ name: name.trim(), type, isEnabled });
        toast.success("Payment method created");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message ?? "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>
            {method ? "Edit Payment Method" : "New Payment Method"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Cash, Card"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition"
            />
          </div>

          {/* Type — only editable on create */}
          {!method && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as PaymentMethodType)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] bg-white transition"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="CASHFREE">Cashfree</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs font-semibold text-gray-500">Enabled</label>
            <button
              onClick={() => setIsEnabled(v => !v)}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isEnabled ? "bg-[#714B67]" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isEnabled ? "left-4" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
          <button onClick={onClose} className="py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="py-3 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cashfree Config Form ──────────────────────────────────────────
function CashfreeConfigModal({
  config,
  onClose,
  onSaved,
}: {
  config: CashfreeConfig | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [environment, setEnvironment] = useState<"SANDBOX" | "PRODUCTION">(config?.environment ?? "SANDBOX");
  const [isEnabled, setIsEnabled] = useState(config?.isEnabled ?? false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const payload: any = { environment, isEnabled };
      if (clientId.trim()) payload.clientId = clientId.trim();
      if (clientSecret.trim()) payload.clientSecret = clientSecret.trim();
      if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim();
      await updateCashfreeConfig(payload);
      toast.success("Cashfree configuration saved");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>Cashfree Configuration</h3>
            <p className="text-xs text-gray-400 mt-0.5">Secrets are encrypted at rest — leave blank to keep existing values</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Current status indicators */}
          {config && (
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Client ID", has: config.hasClientId },
                { label: "Client Secret", has: config.hasClientSecret },
                { label: "Webhook Secret", has: config.hasWebhookSecret },
              ].map(({ label, has }) => (
                <span key={label} className={`text-[10px] font-semibold px-2 py-1 rounded-full ${has ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  {has ? "✓" : "✗"} {label}
                </span>
              ))}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Environment</label>
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value as any)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] bg-white"
            >
              <option value="SANDBOX">Sandbox (Testing)</option>
              <option value="PRODUCTION">Production</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Show secrets</span>
            <button onClick={() => setShowSecrets(v => !v)} className="text-gray-400 hover:text-gray-600">
              {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {[
            { label: "Client ID", value: clientId, setter: setClientId, placeholder: config?.hasClientId ? "Leave blank to keep existing" : "Enter Client ID" },
            { label: "Client Secret", value: clientSecret, setter: setClientSecret, placeholder: config?.hasClientSecret ? "Leave blank to keep existing" : "Enter Client Secret" },
            { label: "Webhook Secret", value: webhookSecret, setter: setWebhookSecret, placeholder: config?.hasWebhookSecret ? "Leave blank to keep existing" : "Enter Webhook Secret" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
              <input
                type={showSecrets ? "text" : "password"}
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition font-mono"
              />
            </div>
          ))}

          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs font-semibold text-gray-500">Enable Cashfree</label>
            <button
              onClick={() => setIsEnabled(v => !v)}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isEnabled ? "bg-[#714B67]" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isEnabled ? "left-4" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
          <button onClick={onClose} className="py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="py-3 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Payments() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [cashfreeConfig, setCashfreeConfig] = useState<CashfreeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PaymentMethod | null | "new">(null);
  const [cfOpen, setCfOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  async function loadAll() {
    try {
      const [ms, cf] = await Promise.all([listPaymentMethods(), getCashfreeConfig()]);
      setMethods(ms);
      setCashfreeConfig(cf);
    } catch {
      toast.error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function handleToggle(m: PaymentMethod) {
    setTogglingId(m.publicId);
    try {
      const updated = m.isEnabled
        ? await disablePaymentMethod(m.publicId)
        : await enablePaymentMethod(m.publicId);
      setMethods(prev => prev.map(x => x.publicId === updated.publicId ? updated : x));
      toast.success(`${updated.name} ${updated.isEnabled ? "enabled" : "disabled"}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Failed to update");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(m: PaymentMethod) {
    if (!confirm(`Delete "${m.name}"? This cannot be undone.`)) return;
    setDeletingId(m.publicId);
    try {
      await deletePaymentMethod(m.publicId);
      setMethods(prev => prev.filter(x => x.publicId !== m.publicId));
      toast.success(`${m.name} deleted`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const enabledCount = methods?.filter(m => m.isEnabled).length ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* TOP BAR */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
        <span className="text-sm font-bold" style={{ color: "#121B35" }}>Payment Methods</span>

        <div className="flex items-center gap-0.5 ml-auto">
          {[
            { icon: ShoppingCart, to: ROUTES.ORDERS, title: "Orders" },
            { icon: MonitorSmartphone, to: ROUTES.TABLE_VIEW, title: "Tables" },
            { icon: ArrowUpFromLine, to: ROUTES.POS_SESSION, title: "Close" },
          ].map(({ icon: Icon, to, title }) => (
            <Link key={title} to={to} title={title} className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
              <Icon className="w-4 h-4" />
            </Link>
          ))}
        </div>
        <Link to={ROUTES.CUSTOMERS} className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
          <User className="w-4 h-4" />
        </Link>
        <div className="relative" ref={navRef}>
          <button onClick={() => setNavOpen(!navOpen)} className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <Menu className="w-4 h-4" />
          </button>
          {navOpen && (
            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-52 py-1">
              {NAV_ITEMS.map(({ label, icon: Icon, to }) => (
                <Link key={label} to={to} onClick={() => setNavOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                  <Icon className="w-3.5 h-3.5 text-[#714B67]" />{label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 p-3 sm:p-6 space-y-4">

        {/* Payment Methods Table */}
        <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-100">
            <button
              onClick={() => setEditing("new")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />New
            </button>
            <button
              onClick={loadAll}
              className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Cashfree config button */}
            <button
              onClick={() => setCfOpen(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              Cashfree Config
              {cashfreeConfig?.isEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" />
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Enabled</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!methods || methods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No payment methods yet. Click New to create one.
                      </td>
                    </tr>
                  ) : (
                    methods.map(m => (
                      <tr key={m.publicId} className="hover:bg-gray-50/70 transition group">
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => setEditing(m)}
                            className="text-sm font-medium text-[#714B67] hover:underline"
                          >
                            {m.name}
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[m.type]}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-400">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleToggle(m)}
                            disabled={togglingId === m.publicId}
                            className={`relative inline-flex items-center rounded-full transition-colors disabled:opacity-50
                              ${m.isEnabled ? "bg-[#714B67]" : "bg-gray-200"}`}
                            style={{ width: 34, height: 18 }}
                          >
                            {togglingId === m.publicId
                              ? <Loader2 className="w-3 h-3 text-white absolute left-1 animate-spin" />
                              : <span className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all ${m.isEnabled ? "left-[16px]" : "left-[2px]"}`} />
                            }
                          </button>
                        </td>
                        <td className="pr-3 py-3.5 text-right">
                          <button
                            onClick={() => handleDelete(m)}
                            disabled={deletingId === m.publicId}
                            className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                          >
                            {deletingId === m.publicId
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <X className="w-3.5 h-3.5" />
                            }
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">{methods?.length ?? 0} method{(methods?.length ?? 0) !== 1 ? "s" : ""}</p>
            {enabledCount === 0 && (methods?.length ?? 0) > 0 && (
              <p className="text-xs text-red-500 font-semibold">⚠ No enabled payment methods — POS checkout blocked</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {editing !== null && (
        <PayMethodForm
          method={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={loadAll}
        />
      )}

      {cfOpen && (
        <CashfreeConfigModal
          config={cashfreeConfig}
          onClose={() => setCfOpen(false)}
          onSaved={loadAll}
        />
      )}
    </div>
  );
}
