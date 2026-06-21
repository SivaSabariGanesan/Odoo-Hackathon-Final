import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ChefHat, Menu, MonitorSmartphone, ShoppingCart, ArrowUpFromLine,
  TrendingUp, Package, DollarSign, ClipboardList, UserCheck,
  Clock, CheckCircle2, BarChart3, Ticket,
} from "lucide-react";
import { ROUTES } from "../../routes/paths";
import { useNavItems } from "../../hooks/useNavItems";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { fetchKpis, fetchSalesTrend, type SalesTrendPoint } from "../../api/reports";
import { listOrders, type Order } from "../../api/orders";

import {
  Card, CardContent, CardHeader, CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { Separator } from "../../components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "../../components/ui/chart";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { label: "Products",     icon: Package,           to: ROUTES.PRODUCTS,    color: "bg-blue-50 text-blue-600" },
  { label: "Floor Tables", icon: MonitorSmartphone, to: ROUTES.FLOOR_TABLES,color: "bg-purple-50 text-purple-600" },
  { label: "Employees",    icon: UserCheck,         to: ROUTES.EMPLOYEES,   color: "bg-emerald-50 text-emerald-600" },
  { label: "Reports",      icon: BarChart3,         to: ROUTES.REPORTS,     color: "bg-amber-50 text-amber-600" },
  { label: "Coupons",      icon: Ticket,            to: ROUTES.COUPONS,     color: "bg-rose-50 text-rose-600" },
  { label: "POS Session",  icon: ArrowUpFromLine,   to: ROUTES.POS_SESSION, color: "bg-[#714B67]/10 text-[#714B67]" },
];

const chartConfig = {
  revenue: { label: "Revenue", color: "#714B67" },
} satisfies ChartConfig;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type OrderStatus = "completed" | "pending" | "preparing";

function mapStatus(s: Order["status"]): OrderStatus {
  if (s === "PAID") return "completed";
  if (s === "PREPARING" || s === "SENT_TO_KITCHEN" || s === "READY") return "preparing";
  return "pending";
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { variant: "default" | "secondary" | "outline"; icon: React.ReactNode; label: string }> = {
    completed: { variant: "default",   icon: <CheckCircle2 className="size-3" />, label: "Completed" },
    pending:   { variant: "outline",   icon: <Clock className="size-3" />,        label: "Pending"   },
    preparing: { variant: "secondary", icon: <ChefHat className="size-3" />,      label: "Preparing" },
  };
  const { variant, icon, label } = map[status];
  return (
    <Badge variant={variant} className="gap-1">
      {icon}{label}
    </Badge>
  );
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navItems = useNavItems();
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const [kpis, setKpis] = useState({ totalOrders: 0, revenue: "0", avgOrderValue: "0" });
  const [trendRaw, setTrendRaw] = useState<SalesTrendPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiData, trendData, orderData] = await Promise.all([
        fetchKpis({ period: "today" }),
        fetchSalesTrend({ period: "today" }),
        listOrders({ pageSize: 5 }),
      ]);
      setKpis(kpiData);
      setTrendRaw(trendData);
      setRecentOrders(orderData);
    } catch { /* fail gracefully */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const hourlyData = trendRaw.map(t => ({
    time: typeof t.period === "string"
      ? (t.period.includes("T") ? t.period.slice(11, 16) : t.period.slice(5))
      : String(t.period),
    revenue: parseFloat(t.revenue),
  }));

  const kpiCards = [
    { label: "Today's Revenue",  value: `₹${parseFloat(kpis.revenue).toLocaleString("en-IN")}`,      icon: DollarSign,    color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Orders Today",     value: String(kpis.totalOrders),                                      icon: ClipboardList, color: "text-blue-600",    bg: "bg-blue-50"    },
    { label: "Avg. Order Value", value: `₹${parseFloat(kpis.avgOrderValue).toLocaleString("en-IN")}`, icon: ShoppingCart,  color: "text-amber-600",   bg: "bg-amber-50"   },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-3 px-4 shrink-0 z-10">
        <img src="/logo.svg" alt="RestoPOS" className="h-7 shrink-0" />
        <span className="text-sm font-bold" style={{ color: "#121B35" }}>Dashboard</span>
        <div className="flex items-center gap-0.5 ml-auto">
          {[
            { icon: ShoppingCart,      to: ROUTES.ORDERS,      title: "Orders" },
            { icon: MonitorSmartphone, to: ROUTES.TABLE_VIEW,  title: "Tables" },
            { icon: ArrowUpFromLine,   to: ROUTES.POS_SESSION, title: "POS"    },
          ].map(({ icon: Icon, to, title }) => (
            <Button key={title} variant="ghost" size="icon-sm" asChild>
              <Link to={to} title={title}><Icon className="size-4" /></Link>
            </Button>
          ))}
        </div>
        <div className="relative" ref={navRef}>
          <Button variant="ghost" size="icon-sm" onClick={() => setNavOpen(!navOpen)}>
            <Menu className="size-4" />
          </Button>
          {navOpen && (
            <div className="absolute right-0 top-10 bg-background border rounded-xl shadow-2xl z-50 w-52 py-1">
              {navItems.map(({ label, icon: Icon, to }) => (
                <Link key={label} to={to} onClick={() => setNavOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition">
                  <Icon className="size-3.5 text-[#714B67]" />{label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Good morning 👋</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Button asChild className="hidden sm:flex bg-[#714B67] hover:bg-[#5d3d55]">
            <Link to={ROUTES.POS_SESSION}>
              <ArrowUpFromLine className="size-3.5" />Open POS
            </Link>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-5 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))
            : kpiCards.map(kpi => (
                <Card key={kpi.label}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <div className={`${kpi.bg} p-1.5 rounded-lg`}>
                        <kpi.icon className={`size-3.5 ${kpi.color}`} />
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold tracking-tight">{kpi.value}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs font-medium text-emerald-600">
                      <TrendingUp className="size-3" />today
                    </div>
                  </CardContent>
                </Card>
              ))
          }
        </div>

        {/* Chart + Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Today's Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[180px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[180px] w-full">
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(v) => [`₹${v}`, "Revenue"]} />}
                    />
                    <Line type="monotone" dataKey="revenue"
                      stroke="var(--color-revenue)" strokeWidth={2.5}
                      dot={{ fill: "var(--color-revenue)", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_LINKS.map(ql => (
                  <Link key={ql.label} to={ql.to}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border hover:border-muted-foreground/30 hover:shadow-sm transition text-center">
                    <div className={`${ql.color} p-2 rounded-lg`}>
                      <ql.icon className="size-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground">{ql.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="link" size="sm" asChild className="text-[#714B67] p-0 h-auto">
                <Link to={ROUTES.ORDERS}>View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No orders yet today</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map(order => (
                    <TableRow key={order.publicId}>
                      <TableCell className="font-semibold">{order.orderNumber}</TableCell>
                      <TableCell><StatusBadge status={mapStatus(order.status)} /></TableCell>
                      <TableCell className="text-muted-foreground">{order.items?.length ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground">{formatTimeAgo(order.createdAt)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{parseFloat(order.grandTotal).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
