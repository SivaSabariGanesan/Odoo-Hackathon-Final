import { useState, useRef, useEffect } from "react";
import {
  User, Menu, MonitorSmartphone, ShoppingCart, ArrowUpFromLine,
  LayoutGrid, Tag, CreditCard, Ticket, CalendarRange, Users,
  ChefHat, BarChart3, LogOut, X, Download, CalendarDays,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

// ── Mock Data ────────────────────────────────────────────────────
const SALES_TREND = [
  { time: "9AM",  revenue: 120 },
  { time: "12PM", revenue: 890 },
  { time: "3PM",  revenue: 430 },
  { time: "6PM",  revenue: 760 },
  { time: "9PM",  revenue: 310 },
];

const CATEGORY_PIE = [
  { name: "Burger 30%",   value: 30, color: "#e07b54" },
  { name: "Drink 25%",    value: 25, color: "#2196f3" },
  { name: "Appetizer 10%",value: 10, color: "#4caf50" },
  { name: "Desert 10%",   value: 10, color: "#9c27b0" },
  { name: "Other 25%",    value: 25, color: "#714B67" },
];

const TOP_ORDERS = [
  { order: "Shop#001", session: "POS/0001", pos: "Drop/Allow",  date: "7/12/2022", customer: "Dave Abbott, Addison Dixon", employee: "", total: 24.94 },
];

const TOP_PRODUCTS = [
  { name: "Lassi",  qty: 45, revenue: 2500 },
  { name: "Coffee", qty: 30, revenue: 2200 },
  { name: "Fries",  qty: 22, revenue: 670  },
  { name: "Beer",   qty: 18, revenue: 2700 },
];

const TOP_CATEGORIES = [
  { name: "Drink",     revenue: 12500 },
  { name: "Hot Drink", revenue: 5000  },
  { name: "Beer",      revenue: 8000  },
  { name: "Desert",    revenue: 2100  },
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

type FilterChip = { label: string; key: string }

export default function Reports() {
  const [navOpen,  setNavOpen]  = useState(false);
  const [filters,  setFilters]  = useState<FilterChip[]>([
    { label: "Select period", key: "period" },
    { label: "User",          key: "user"   },
    { label: "Session",       key: "session"},
    { label: "Product",       key: "product"},
  ]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function removeFilter(key: string) {
    setFilters(p => p.filter(f => f.key !== key));
  }

  // KPI helpers
  const kpis = [
    { label: "Total order",    value: "90",   suffix: "",   trend: "+10%", up: true  },
    { label: "Revenue",        value: "$190", suffix: "",   trend: "+100%", up: true  },
    { label: "Average Order",  value: "80",   suffix: "",   trend: "-20%", up: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
        <span className="text-sm font-bold" style={{ color: "#121B35" }}>Reports</span>

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

        <Link to={ROUTES.CUSTOMERS}
          className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
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
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">

        {/* Filter chips + Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f.key}
              onClick={() => f.key === "period" && setShowDatePicker(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-[#714B67]/40 transition shadow-sm">
              {f.key === "period" && <CalendarDays className="w-3 h-3 text-[#714B67]" />}
              {f.label}
              <button onClick={e => { e.stopPropagation(); removeFilter(f.key); }}
                className="text-gray-400 hover:text-red-400 transition">
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
          {/* Star / reset */}
          <button className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center text-xs font-bold transition">
            ✱
          </button>

          {/* Export */}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition">
              <Download className="w-3.5 h-3.5" />PDF
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition">
              <Download className="w-3.5 h-3.5" />XLS
            </button>
          </div>
        </div>

        {/* Date picker tooltip */}
        {showDatePicker && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-64 -mt-2">
            <p className="text-xs font-semibold text-gray-500 mb-2">Select date range</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#714B67]" />
              <input type="date" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#714B67]" />
            </div>
            <button onClick={() => setShowDatePicker(false)}
              className="mt-2 w-full bg-[#714B67] text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-[#5d3d55] transition">
              Apply
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
              <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
              <p className="text-3xl font-extrabold mb-1" style={{ color: "#121B35" }}>{kpi.value}</p>
              <div className={`flex items-center gap-1 text-xs font-semibold
                ${kpi.up ? "text-emerald-600" : "text-red-500"}`}>
                {kpi.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {kpi.trend} since last period
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sales trend line chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-bold mb-4" style={{ color: "#121B35" }}>Sales</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={SALES_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  labelStyle={{ color: "#121B35", fontWeight: 600 }} />
                <Line type="monotone" dataKey="revenue"
                  stroke="#714B67" strokeWidth={2.5} dot={{ fill: "#714B67", r: 3 }}
                  activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top selling category pie */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-bold mb-4" style={{ color: "#121B35" }}>Top Selling Category</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={CATEGORY_PIE} cx="50%" cy="50%" innerRadius={30} outerRadius={65}
                    dataKey="value" strokeWidth={1} stroke="#fff">
                    {CATEGORY_PIE.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5">
                {CATEGORY_PIE.map(c => (
                  <div key={c.name} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Orders table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-blue-50/50">
            <p className="text-sm font-bold text-blue-700">Top Orders</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Order","Sessions","Point of Sale","Date","Customer","Employee","Total"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOP_ORDERS.map((o, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-[#714B67] font-semibold">{o.order}</td>
                    <td className="px-4 py-3 text-gray-600">{o.session}</td>
                    <td className="px-4 py-3 text-gray-600">{o.pos}</td>
                    <td className="px-4 py-3 text-gray-600">{o.date}</td>
                    <td className="px-4 py-3 text-gray-600">{o.customer}</td>
                    <td className="px-4 py-3 text-gray-400">{o.employee}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#121B35" }}>${o.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Product + Top Category side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Product */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-bold" style={{ color: "#121B35" }}>Top Product</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Product","Qty","Revenue"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOP_PRODUCTS.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.qty}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">${p.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Category */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-bold" style={{ color: "#121B35" }}>Top Category</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Category","Revenue"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOP_CATEGORIES.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{c.name}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">${c.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
