import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LayoutGrid, Tag, CreditCard, Ticket, CalendarRange, Users,
  ChefHat, BarChart3, LogOut, Menu, MonitorSmartphone,
  ShoppingCart, ArrowUpFromLine, TrendingUp, TrendingDown,
  Package, DollarSign, ClipboardList, UserCheck, Clock,
  AlertCircle, CheckCircle2,
} from "lucide-react";
import { ROUTES } from "../../routes/paths";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

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

const HOURLY_SALES = [
  { time: "9AM",  revenue: 240 },
  { time: "10AM", revenue: 380 },
  { time: "11AM", revenue: 520 },
  { time: "12PM", revenue: 890 },
  { time: "1PM",  revenue: 760 },
  { time: "2PM",  revenue: 490 },
  { time: "3PM",  revenue: 430 },
  { time: "4PM",  revenue: 310 },
  { time: "5PM",  revenue: 650 },
  { time: "6PM",  revenue: 820 },
  { time: "7PM",  revenue: 730 },
  { time: "8PM",  revenue: 560 },
];

const RECENT_ORDERS = [
  { id: "ORD-1041", table: "T4",  items: 3,  total: 1240, status: "completed", time: "2 min ago" },
  { id: "ORD-1040", table: "T7",  items: 5,  total: 2890, status: "pending",   time: "8 min ago" },
  { id: "ORD-1039", table: "T2",  items: 2,  total: 680,  status: "completed", time: "15 min ago" },
  { id: "ORD-1038", table: "T9",  items: 4,  total: 1560, status: "preparing", time: "20 min ago" },
  { id: "ORD-1037", table: "Bar", items: 1,  total: 420,  status: "completed", time: "28 min ago" },
];

const LOW_STOCK = [
  { name: "Masala Tea", stock: 4,  threshold: 10 },
  { name: "Lassi",      stock: 7,  threshold: 10 },
  { name: "Fries",      stock: 2,  threshold: 15 },
];

const QUICK_LINKS = [
  { label: "Products",       icon: Package,       to: ROUTES.PRODUCTS,    color: "bg-blue-50 text-blue-600" },
  { label: "Floor Tables",   icon: MonitorSmartphone, to: ROUTES.FLOOR_TABLES, color: "bg-purple-50 text-purple-600" },
  { label: "Employees",      icon: UserCheck,     to: ROUTES.EMPLOYEES,   color: "bg-emerald-50 text-emerald-600" },
  { label: "Reports",        icon: BarChart3,     to: ROUTES.REPORTS,     color: "bg-amber-50 text-amber-600" },
  { label: "Coupons",        icon: Ticket,        to: ROUTES.COUPONS,     color: "bg-rose-50 text-rose-600" },
  { label: "POS Session",    icon: ArrowUpFromLine, to: ROUTES.POS_SESSION, color: "bg-[#714B67]/10 text-[#714B67]" },
];

type OrderStatus = "completed" | "pending" | "preparing";

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
    pending:   "bg-amber-50   text-amber-600   border-amber-200",
    preparing: "bg-blue-50    text-blue-600    border-blue-200",
  };
  const icons: Record<OrderStatus, React.ReactNode> = {
    completed: <CheckCircle2 className="w-3 h-3" />,
    pending:   <Clock className="w-3 h-3" />,
    preparing: <ChefHat className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status]}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function Dashboard() {
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const kpis = [
    {
      label: "Today's Revenue",
      value: "₹7,640",
      trend: "+12%",
      up: true,
      sub: "vs. yesterday",
      icon: DollarSign,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Orders Today",
      value: "42",
      trend: "+5",
      up: true,
      sub: "vs. yesterday",
      icon: ClipboardList,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Active Tables",
      value: "6 / 14",
      trend: "43%",
      up: true,
      sub: "occupancy",
      icon: MonitorSmartphone,
      iconBg: "bg-[#714B67]/10",
      iconColor: "text-[#714B67]",
    },
    {
      label: "Avg. Order Value",
      value: "₹181",
      trend: "-8%",
      up: false,
      sub: "vs. last week",
      icon: ShoppingCart,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-3 px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
        <span className="text-sm font-bold" style={{ color: "#121B35" }}>Dashboard</span>

        <div className="flex items-center gap-0.5 ml-auto">
          {[
            { icon: ShoppingCart,      to: ROUTES.ORDERS,      title: "Orders" },
            { icon: MonitorSmartphone, to: ROUTES.TABLE_VIEW,  title: "Tables" },
            { icon: ArrowUpFromLine,   to: ROUTES.POS_SESSION, title: "POS" },
          ].map(({ icon: Icon, to, title }) => (
            <Link key={title} to={to} title={title}
              className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
              <Icon className="w-4 h-4" />
            </Link>
          ))}
        </div>

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

        {/* Welcome + date */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#121B35" }}>Good morning 👋</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Link to={ROUTES.POS_SESSION}
            className="hidden sm:flex items-center gap-2 bg-[#714B67] hover:bg-[#5d3d55] text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm">
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            Open POS
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-400 leading-tight">{kpi.label}</p>
                <div className={`${kpi.iconBg} p-1.5 rounded-lg shrink-0`}>
                  <kpi.icon className={`w-3.5 h-3.5 ${kpi.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-extrabold mb-1" style={{ color: "#121B35" }}>{kpi.value}</p>
              <div className={`flex items-center gap-1 text-xs font-semibold ${kpi.up ? "text-emerald-600" : "text-red-500"}`}>
                {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.trend}
                <span className="text-gray-400 font-normal">{kpi.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sales Chart + Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-bold mb-4" style={{ color: "#121B35" }}>Today's Sales Trend</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={HOURLY_SALES}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  labelStyle={{ color: "#121B35", fontWeight: 600 }}
                  formatter={(v) => [`₹${v ?? 0}`, "Revenue"]}
                />
                <Line
                  type="monotone" dataKey="revenue"
                  stroke="#714B67" strokeWidth={2.5}
                  dot={{ fill: "#714B67", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-bold mb-4" style={{ color: "#121B35" }}>Quick Links</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_LINKS.map(ql => (
                <Link key={ql.label} to={ql.to}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition text-center">
                  <div className={`${ql.color} p-2 rounded-lg`}>
                    <ql.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600">{ql.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders + Low Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-bold" style={{ color: "#121B35" }}>Recent Orders</p>
              <Link to={ROUTES.ORDERS} className="text-xs text-[#714B67] font-semibold hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {RECENT_ORDERS.map(order => (
                <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition">
                  <div className="w-9 h-9 rounded-xl bg-[#714B67]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#714B67]">{order.table}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#121B35]">{order.id}</p>
                      <StatusBadge status={order.status as OrderStatus} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{order.items} items · {order.time}</p>
                  </div>
                  <span className="text-sm font-bold text-[#121B35] shrink-0">₹{order.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-bold" style={{ color: "#121B35" }}>Low Stock</p>
              <Link to={ROUTES.PRODUCTS} className="text-xs text-[#714B67] font-semibold hover:underline">
                Manage
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {LOW_STOCK.map(item => {
                const pct = Math.round((item.stock / item.threshold) * 100);
                const critical = pct <= 30;
                return (
                  <div key={item.name} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${critical ? "text-red-400" : "text-amber-400"}`} />
                        <p className="text-sm font-medium text-[#121B35]">{item.name}</p>
                      </div>
                      <span className={`text-xs font-bold ${critical ? "text-red-500" : "text-amber-500"}`}>
                        {item.stock} left
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${critical ? "bg-red-400" : "bg-amber-400"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Threshold: {item.threshold} units</p>
                  </div>
                );
              })}
            </div>
            {/* Summary note */}
            <div className="px-5 py-3 bg-red-50/60 border-t border-red-100">
              <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" />
                {LOW_STOCK.length} items need restocking
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
