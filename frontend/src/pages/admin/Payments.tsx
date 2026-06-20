import { useState, useRef, useEffect } from "react";
import {
  Plus, Trash2, User, Menu, MonitorSmartphone,
  ShoppingCart, ArrowUpFromLine, LayoutGrid, Tag,
  CreditCard, Ticket, CalendarRange, Users, ChefHat,
  BarChart3, LogOut, X, GripVertical, Check, QrCode,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

type PayType = "Cash" | "Card" | "UPI";

interface PayMethod {
  id: string;
  name: string;
  type: PayType;
  upiId: string;   // only relevant for UPI
  active: boolean;
}

const INIT: PayMethod[] = [
  { id: "p1", name: "Cash", type: "Cash", upiId: "",             active: false },
  { id: "p2", name: "Card", type: "Card", upiId: "",             active: false },
  { id: "p3", name: "UPI",  type: "UPI",  upiId: "abc@upi.com",  active: false },
];

const NAV_ITEMS = [
  { label: "Products",           icon: LayoutGrid,    to: ROUTES.PRODUCTS },
  { label: "Category",           icon: Tag,           to: ROUTES.CATEGORIES },
  { label: "Payment Method",     icon: CreditCard,    to: ROUTES.PAYMENTS },
  { label: "Coupon & Promotion", icon: Ticket,        to: ROUTES.COUPONS },
  { label: "Booking",            icon: CalendarRange, to: ROUTES.FLOOR_TABLES },
  { label: "User/Employee",      icon: Users,         to: ROUTES.EMPLOYEES },
  { label: "KDS",                icon: ChefHat,       to: ROUTES.KDS },
  { label: "Reports",            icon: BarChart3,     to: ROUTES.REPORTS },
  { label: "Log Out",            icon: LogOut,        to: ROUTES.LOGIN },
];

// ── Fake QR using a placeholder SVG ─────────────────────────────
function QRPreview({ value }: { value: string }) {
  // Use a public QR API for preview
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(value || "upi://pay")}`;
  return (
    <div className="border-2 border-dashed border-[#714B67]/30 rounded-xl p-3 flex flex-col items-center gap-2 bg-[#714B67]/5">
      <img src={url} alt="QR Preview" className="w-24 h-24 rounded-lg" />
      <p className="text-[10px] text-gray-400 text-center">UPI QR · {value || "upi://pay"}</p>
    </div>
  );
}

// ── Payment Method Form ──────────────────────────────────────────
function PayMethodForm({
  method,
  onClose,
  onSave,
}: {
  method: PayMethod | null;
  onClose: () => void;
  onSave: (m: PayMethod) => void;
}) {
  const [name,   setName]   = useState(method?.name   ?? "");
  const [type,   setType]   = useState<PayType>(method?.type   ?? "Cash");
  const [upiId,  setUpiId]  = useState(method?.upiId  ?? "");
  const [active, setActive] = useState(method?.active ?? false);

  function handleSave() {
    if (!name.trim()) return;
    onSave({ id: method?.id ?? crypto.randomUUID(), name: name.trim(), type, upiId, active });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>
            {method ? "Edit Payment Method" : "New Payment Method"}
          </h3>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Payment method Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. UPI Payment"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
            <select value={type} onChange={e => setType(e.target.value as PayType)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] bg-white">
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
            </select>
          </div>

          {/* UPI-only: UPI ID + QR preview */}
          {type === "UPI" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">UPI ID</label>
                <input value={upiId} onChange={e => setUpiId(e.target.value)}
                  placeholder="abc@upi.com"
                  className="w-full px-3 py-2.5 text-sm border border-[#714B67]/40 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300 bg-[#714B67]/5" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#714B67]" />
                  QR Preview
                </label>
                <QRPreview value={upiId} />
              </div>
            </div>
          )}

          {/* Activate toggle */}
          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs font-semibold text-gray-500">Activate</label>
            <button onClick={() => setActive(a => !a)}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0
                ${active ? "bg-[#714B67]" : "bg-gray-200"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all
                ${active ? "left-4" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
          <button onClick={onClose}
            className="py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">Discard</button>
          <button onClick={handleSave}
            className="py-3 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" />Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function Payments() {
  const [methods,  setMethods]  = useState<PayMethod[]>(INIT);
  const [navOpen,  setNavOpen]  = useState(false);
  const [editing,  setEditing]  = useState<PayMethod | null | "new">(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function toggleActive(id: string) {
    setMethods(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m));
  }

  function handleSave(m: PayMethod) {
    setMethods(prev => prev.find(x => x.id === m.id) ? prev.map(x => x.id === m.id ? m : x) : [...prev, m]);
  }

  function handleDelete(id: string) {
    setMethods(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
        <span className="text-sm font-bold" style={{ color: "#121B35" }}>Payment Method</span>

        <div className="flex items-center gap-0.5 ml-auto">
          {[
            { icon: ShoppingCart,      to: ROUTES.ORDERS,      title: "Orders" },
            { icon: MonitorSmartphone, to: ROUTES.TABLE_VIEW,  title: "Tables" },
            { icon: ArrowUpFromLine,   to: ROUTES.POS_SESSION, title: "Close" },
          ].map(({ icon: Icon, to, title }) => (
            <Link key={title} to={to} title={title}
              className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
              <Icon className="w-4 h-4" />
            </Link>
          ))}
        </div>
        <Link to={ROUTES.CUSTOMERS} className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
          <User className="w-4 h-4" />
        </Link>
        <div className="relative" ref={navRef}>
          <button onClick={() => setNavOpen(!navOpen)}
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
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

      {/* ── CONTENT ── */}
      <div className="flex-1 p-3 sm:p-6">
        <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-100">
            <button onClick={() => setEditing("new")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition">
              <Plus className="w-3.5 h-3.5" />New
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-8 pl-3" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Id</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Activate</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {methods.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No payment methods</td></tr>
                ) : (
                  methods.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/70 transition group">
                      <td className="pl-3 pr-1 py-3.5">
                        <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 cursor-grab" />
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => setEditing(m)}
                          className="text-sm font-medium text-[#714B67] hover:underline">
                          {m.name}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-600 flex items-center gap-1.5">
                          {m.type}
                          {m.type === "UPI"  && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">V</span>}
                          {m.type === "Card" && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-semibold">V</span>}
                          {m.type === "Cash" && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-semibold">V</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-400">
                        {m.type === "UPI" ? m.upiId || "—" : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button onClick={() => toggleActive(m.id)}
                          className={`w-8 h-4.5 rounded-full transition-colors relative inline-flex items-center
                            ${m.active ? "bg-[#714B67]" : "bg-gray-200"}`}
                          style={{ height: "18px", width: "34px" }}>
                          <span className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all
                            ${m.active ? "left-[16px]" : "left-[2px]"}`} />
                        </button>
                      </td>
                      <td className="pr-3 py-3.5 text-right">
                        <button onClick={() => handleDelete(m.id)}
                          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">{methods.length} method{methods.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {editing !== null && (
        <PayMethodForm
          method={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
