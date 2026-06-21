import { useState, useRef, useEffect, useCallback } from "react";
import {
  User, Menu, MonitorSmartphone, ShoppingCart, ArrowUpFromLine,
  LayoutGrid, Tag, CreditCard, Ticket, CalendarRange, Users,
  ChefHat, BarChart3, LogOut, X, Download, CalendarDays,
  TrendingUp, TrendingDown, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import { useNavItems } from "../../hooks/useNavItems";
import {
  fetchKpis, fetchSalesTrend, fetchTopCategories,
  fetchTopProducts, fetchTopOrders,
  type ReportPeriod, type KpiData, type SalesTrendPoint,
  type TopCategory, type TopProduct, type TopOrder,
} from "../../api/reports";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

const NAV_ITEMS_PLACEHOLDER = null; // replaced by useNavItems hook

const PIE_COLORS = ["#e07b54", "#2196f3", "#4caf50", "#9c27b0", "#714B67", "#ff9800"];

export default function Reports() {
  const navItems = useNavItems();
  const [navOpen,        setNavOpen]        = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [period,         setPeriod]         = useState<ReportPeriod>("today");
  const [fromDate,       setFromDate]       = useState("");
  const [toDate,         setToDate]         = useState("");

  const [kpis,       setKpis]       = useState<KpiData | null>(null);
  const [trend,      setTrend]      = useState<SalesTrendPoint[]>([]);
  const [categories, setCategories] = useState<TopCategory[]>([]);
  const [products,   setProducts]   = useState<TopProduct[]>([]);
  const [orders,     setOrders]     = useState<TopOrder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const navRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async (p: ReportPeriod, from?: string, to?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = { period: p, from, to };
      const [kpiData, trendData, catData, prodData, ordData] = await Promise.all([
        fetchKpis(params),
        fetchSalesTrend(params),
        fetchTopCategories(params),
        fetchTopProducts(params),
        fetchTopOrders(params),
      ]);
      setKpis(kpiData);
      setTrend(trendData);
      setCategories(catData);
      setProducts(prodData);
      setOrders(ordData);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? "Failed to load report data";
      setError(msg);
      // keep zeros so cards still render
      setKpis(prev => prev ?? { totalOrders: 0, revenue: "0.00", avgOrderValue: "0.00" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(period); }, [loadAll, period]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function applyCustomDates() {
    if (fromDate && toDate) {
      setPeriod("custom");
      loadAll("custom", fromDate, toDate);
      setShowDatePicker(false);
    }
  }

  const trendData = trend.map(t => ({
    time: typeof t.period === "string" ? t.period.slice(11, 16) || t.period.slice(0, 10) : String(t.period),
    revenue: parseFloat(t.revenue),
  }));

  const pieData = categories.map((c, i) => ({
    name: c.category_name,
    value: parseFloat(c.revenue),
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const periodChips: { label: string; value: ReportPeriod }[] = [
    { label: "Today",   value: "today"  },
    { label: "Week",    value: "week"   },
    { label: "Month",   value: "month"  },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <img src="/logo.svg" alt="RestoPOS" className="h-7 shrink-0" />
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

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        {/* Period selector + Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {periodChips.map(chip => (
            <button key={chip.value}
              onClick={() => setPeriod(chip.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition shadow-sm
                ${period === chip.value
                  ? "bg-[#714B67] text-white border-[#714B67]"
                  : "bg-white border-gray-200 text-gray-600 hover:border-[#714B67]/40"}`}>
              {chip.label}
            </button>
          ))}
          <button
            onClick={() => setShowDatePicker(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-[#714B67]/40 transition shadow-sm">
            <CalendarDays className="w-3 h-3 text-[#714B67]" />
            Custom
          </button>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[#714B67]" />}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition">
              <Download className="w-3.5 h-3.5" />PDF
            </button>
          </div>
        </div>

        {showDatePicker && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-64 -mt-2">
            <p className="text-xs font-semibold text-gray-500 mb-2">Select date range</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#714B67]" />
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#714B67]" />
            </div>
            <button onClick={applyCustomDates}
              className="mt-2 w-full bg-[#714B67] text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-[#5d3d55] transition">
              Apply
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
            <X className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* KPI Cards */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Orders",    value: String(kpis?.totalOrders ?? 0) },
              { label: "Revenue",         value: `₹${parseFloat(kpis?.revenue ?? "0").toLocaleString("en-IN")}` },
              { label: "Avg Order Value", value: `₹${parseFloat(kpis?.avgOrderValue ?? "0").toLocaleString("en-IN")}` },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
                <p className="text-3xl font-extrabold mb-1" style={{ color: "#121B35" }}>{kpi.value}</p>
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {period}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-bold mb-4" style={{ color: "#121B35" }}>Sales Trend</p>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                    labelStyle={{ color: "#121B35", fontWeight: 600 }} />
                  <Line type="monotone" dataKey="revenue"
                    stroke="#714B67" strokeWidth={2.5} dot={{ fill: "#714B67", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-300 text-sm">No data</div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-bold mb-4" style={{ color: "#121B35" }}>Top Selling Category</p>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={65}
                      dataKey="value" strokeWidth={1} stroke="#fff">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5">
                  {pieData.map(c => (
                    <div key={c.name} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-gray-300 text-sm">No data</div>
            )}
          </div>
        </div>

        {/* Top Orders */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-blue-50/50">
            <p className="text-sm font-bold text-blue-700">Top Orders</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Order #", "Type", "Staff", "Table", "Date", "Total"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-300">No orders</td></tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.public_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-[#714B67] font-semibold">{o.order_number}</td>
                      <td className="px-4 py-3 text-gray-600">{o.type}</td>
                      <td className="px-4 py-3 text-gray-600">{o.staff_name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{o.table_number ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{o.paid_at ? new Date(o.paid_at).toLocaleDateString("en-IN") : "—"}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#121B35" }}>
                        ₹{parseFloat(o.grand_total).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products + Top Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-bold" style={{ color: "#121B35" }}>Top Products</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Product", "Category", "Qty", "Revenue"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-300">No data</td></tr>
                ) : (
                  products.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700 font-medium">{p.product_name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.category_name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.quantity_sold}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">₹{parseFloat(p.revenue).toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-bold" style={{ color: "#121B35" }}>Top Categories</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Category", "Orders", "Qty", "Revenue"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-300">No data</td></tr>
                ) : (
                  categories.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700 font-medium">{c.category_name}</td>
                      <td className="px-4 py-3 text-gray-500">{c.order_count}</td>
                      <td className="px-4 py-3 text-gray-500">{c.total_qty}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">₹{parseFloat(c.revenue).toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
