import { useState, useRef, useEffect } from "react";
import {
  Search, RefreshCw, User, Tag, Menu, MonitorSmartphone,
  ShoppingCart, ArrowUpFromLine, LayoutGrid, LogOut,
  Users, Ticket, CalendarRange, ChefHat, BarChart3,
  CreditCard, X, Pencil, Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

interface Order {
  id: string; date: string; time: string; orderNo: string | null;
  customer: string; amount: number; status: "Draft" | "Paid"; products: string[];
}

const MOCK_ORDERS: Order[] = [
  { id: "1", date: "4/5/2025", time: "11:27 AM", orderNo: null,    customer: "Admin", amount: 540,  status: "Draft", products: ["Masala Tea x2", "Lassi x1"] },
  { id: "2", date: "4/5/2025", time: "11:27 AM", orderNo: "00001", customer: "Eric",  amount: 1080, status: "Paid",  products: ["Coffee x2"] },
  { id: "3", date: "4/5/2025", time: "11:27 AM", orderNo: null,    customer: "Alex",  amount: 540,  status: "Draft", products: ["Masala Tea x1"] },
  { id: "4", date: "4/5/2025", time: "11:27 AM", orderNo: "00002", customer: "Sara",  amount: 540,  status: "Paid",  products: ["Lassi x1"] },
  { id: "5", date: "4/5/2025", time: "11:27 AM", orderNo: "00003", customer: "Dowel", amount: 540,  status: "Paid",  products: ["Coffee x1"] },
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

function OrderDetailModal({ order, onClose, onDelete }: {
  order: Order; onClose: () => void; onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>Order #{order.orderNo ?? "—"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Date</p>
              <p className="text-sm font-medium" style={{ color: "#121B35" }}>{order.date}</p>
              <p className="text-xs text-gray-500">{order.time}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Customer</p>
              <p className="text-sm font-medium" style={{ color: "#121B35" }}>{order.customer}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Amount</p>
              <p className="text-base font-bold text-[#714B67]">₹{order.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              {order.status === "Paid"
                ? <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#714B67] text-white">Paid</span>
                : <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">Draft</span>}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Products</p>
            <div className="space-y-1">
              {order.products.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#714B67]/40 shrink-0" />
                  <span className="text-sm text-gray-600">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {order.status === "Draft" ? (
          <div className="grid grid-cols-2 border-t border-gray-100">
            <button onClick={() => { onDelete(order.id); onClose(); }}
              className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition border-r border-gray-100">
              <Trash2 className="w-4 h-4" />Delete
            </button>
            <button onClick={() => navigate(ROUTES.POS_ORDER)}
              className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition">
              <Pencil className="w-4 h-4" />Edit Order
            </button>
          </div>
        ) : (
          <div className="px-5 pb-4 pt-1">
            <p className="text-xs text-center text-gray-400">This order has been paid and cannot be edited.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Orders() {
  const [search, setSearch]     = useState("");
  const [navOpen, setNavOpen]   = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [orders, setOrders]     = useState<Order[]>(MOCK_ORDERS);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return o.customer.toLowerCase().includes(q) || (o.orderNo ?? "").includes(q) || o.date.includes(q);
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
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
        <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Card header — stacks on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold" style={{ color: "#121B35" }}>Orders</h2>
              <button className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-100 rounded-lg transition">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search customer, order, date…"
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] focus:bg-white transition placeholder:text-gray-400 text-[#121B35]" />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table — horizontal scroll on small screens */}
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">No orders found</td>
                  </tr>
                ) : (
                  filtered.map(order => (
                    <tr key={order.id} onClick={() => setSelected(order)}
                      className="hover:bg-gray-50/70 transition cursor-pointer">
                      <td className="px-4 sm:px-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">{order.date}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-sm text-gray-500 whitespace-nowrap">{order.time}</td>
                      <td className="px-4 sm:px-6 py-3.5">
                        {order.orderNo
                          ? <span className="text-[#714B67] font-semibold text-sm">{order.orderNo}</span>
                          : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#714B67]/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-[#714B67]">{order.customer[0]}</span>
                          </div>
                          <span className="text-sm font-medium" style={{ color: "#121B35" }}>{order.customer}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right text-sm font-semibold" style={{ color: "#121B35" }}>
                        ₹{order.amount.toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center">
                        {order.status === "Paid"
                          ? <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#714B67] text-white">Paid</span>
                          : <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">Draft</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</p>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <OrderDetailModal order={selected} onClose={() => setSelected(null)} onDelete={id => setOrders(p => p.filter(o => o.id !== id))} />
      )}
    </div>
  );
}
