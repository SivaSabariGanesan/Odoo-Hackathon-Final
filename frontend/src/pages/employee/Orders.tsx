import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, User, Tag, Menu, MonitorSmartphone,
  ShoppingCart, ArrowUpFromLine, LayoutGrid, LogOut,
  Users, Ticket, CalendarRange, ChefHat, BarChart3,
  CreditCard, X, Pencil, Trash2, Loader2, AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import { useNavItems } from "../../hooks/useNavItems";
import { listOrders, cancelOrder, type Order } from "../../api/orders";

const NAV_ITEMS_PLACEHOLDER = null; // replaced by useNavItems hook

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN");
}

function formatTime(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const map: Record<string, string> = {
    DRAFT:            "bg-gray-100 text-gray-600 border border-gray-200",
    SENT_TO_KITCHEN:  "bg-blue-100 text-blue-700 border border-blue-200",
    PREPARING:        "bg-amber-100 text-amber-700 border border-amber-200",
    READY:            "bg-teal-100 text-teal-700 border border-teal-200",
    PAYMENT_PENDING:  "bg-yellow-100 text-yellow-700 border border-yellow-200",
    PAID:             "bg-[#714B67] text-white",
    CANCELLED:        "bg-red-100 text-red-600 border border-red-200",
  };
  const label: Record<string, string> = {
    DRAFT: "Draft", SENT_TO_KITCHEN: "In Kitchen", PREPARING: "Preparing",
    READY: "Ready", PAYMENT_PENDING: "Processing", PAID: "Paid", CANCELLED: "Cancelled",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {label[status] ?? status}
    </span>
  );
}

function OrderDetailModal({ order, onClose, onDelete }: {
  order: Order; onClose: () => void; onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await cancelOrder(order.publicId, "Cancelled from Orders list");
      onDelete(order.publicId);
      onClose();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>
            Order #{order.orderNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Date</p>
              <p className="text-sm font-medium" style={{ color: "#121B35" }}>
                {formatDate(order.createdAt)}
              </p>
              <p className="text-xs text-gray-500">{formatTime(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Customer</p>
              <p className="text-sm font-medium" style={{ color: "#121B35" }}>
                {order.customer?.name ?? order.guestName ?? "Walk-in"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Total</p>
              <p className="text-base font-bold text-[#714B67]">₹{parseFloat(order.grandTotal).toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <StatusBadge status={order.status} />
            </div>
          </div>
          {order.table && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Table</p>
              <p className="text-sm font-medium text-[#121B35]">Table {order.table.tableNumber}</p>
            </div>
          )}
          {order.items && order.items.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Items</p>
              <div className="space-y-1">
                {order.items.map((item) => (
                  <div key={item.publicId} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#714B67]/40 shrink-0" />
                    <span className="text-sm text-gray-600">
                      {item.productName} ×{item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {order.status === "DRAFT" || order.status === "SENT_TO_KITCHEN" || order.status === "PREPARING" || order.status === "READY" ? (
          <div className="grid grid-cols-2 border-t border-gray-100">
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition border-r border-gray-100 disabled:opacity-50">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Cancel
            </button>
            <button onClick={() => navigate(ROUTES.EDIT_ORDER.replace(":id", order.publicId))}
              className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition">
              <Pencil className="w-4 h-4" />Edit
            </button>
          </div>
        ) : (
          <div className="px-5 pb-4 pt-1">
            <p className="text-xs text-center text-gray-400">This order cannot be edited.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Orders() {
  const navItems = useNavItems();
  const [search, setSearch]     = useState("");
  const [navOpen, setNavOpen]   = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOrders({ pageSize: 100 });
      setOrders(data);
    } catch {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.customer?.name ?? "").toLowerCase().includes(q) ||
      (o.guestName ?? "").toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  });

  function handleDelete(id: string) {
    setOrders(prev => prev.filter(o => o.publicId !== id));
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <img src="/logo.svg" alt="RestoPOS" className="h-7 shrink-0" />
        <span className="text-sm font-bold hidden sm:block" style={{ color: "#121B35" }}>Orders</span>
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
              {navItems.map(({ label, icon: Icon, to }) => (
                <Link key={label} to={to} onClick={() => setNavOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                  <Icon className="w-3.5 h-3.5 text-[#714B67]" />{label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 p-3 sm:p-6">
        <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold" style={{ color: "#121B35" }}>Orders</h2>
              <button onClick={loadOrders}
                className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-100 rounded-lg transition">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search customer, order…"
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] focus:bg-white transition placeholder:text-gray-400 text-[#121B35]" />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Date", "Time", "Order #", "Customer", "Amount", "Status"].map(h => (
                    <th key={h}
                      className={`px-4 sm:px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap
                        ${h === "Amount" ? "text-right" : h === "Status" ? "text-center" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading orders…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-red-400">
                      <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                      {error}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">No orders found</td>
                  </tr>
                ) : (
                  filtered.map(order => (
                    <tr key={order.publicId} onClick={() => setSelected(order)}
                      className="hover:bg-gray-50/70 transition cursor-pointer">
                      <td className="px-4 sm:px-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                        {formatTime(order.createdAt)}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className="text-[#714B67] font-semibold text-sm">{order.orderNumber}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#714B67]/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-[#714B67]">
                              {(order.customer?.name ?? order.guestName ?? "W")[0]}
                            </span>
                          </div>
                          <span className="text-sm font-medium" style={{ color: "#121B35" }}>
                            {order.customer?.name ?? order.guestName ?? "Walk-in"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right text-sm font-semibold" style={{ color: "#121B35" }}>
                        ₹{parseFloat(order.grandTotal).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</p>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
