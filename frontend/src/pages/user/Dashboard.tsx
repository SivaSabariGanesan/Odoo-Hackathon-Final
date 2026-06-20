import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart, MonitorSmartphone, ArrowUpFromLine, ClipboardList,
  DollarSign, Clock, CheckCircle2, ChefHat, TrendingUp,
  Package, Ticket, LayoutGrid, LogOut,
} from "lucide-react";
import { ROUTES } from "../../routes/paths";

// ── Mock data for the employee's current session ─────────────────
const SESSION = {
  name: "Jubilant Shark",
  openedAt: "9:00 AM",
  cashier: "Alex",
  openingBalance: 2000,
};

const TODAY_STATS = [
  { label: "Orders Taken",   value: "18",    icon: ClipboardList,     iconBg: "bg-blue-50",        iconColor: "text-blue-600"    },
  { label: "Total Sales",    value: "₹4,320", icon: DollarSign,        iconBg: "bg-emerald-50",     iconColor: "text-emerald-600" },
  { label: "Avg Order Value",value: "₹240",   icon: TrendingUp,        iconBg: "bg-amber-50",       iconColor: "text-amber-600"   },
  { label: "Tables Served",  value: "11",     icon: MonitorSmartphone, iconBg: "bg-[#714B67]/10",   iconColor: "text-[#714B67]"   },
];

type OrderStatus = "completed" | "pending" | "preparing";

const MY_RECENT_ORDERS: {
  id: string; table: string; items: number; total: number; status: OrderStatus; time: string;
}[] = [
  { id: "ORD-1041", table: "T4",  items: 3, total: 1240, status: "completed", time: "2 min ago"  },
  { id: "ORD-1040", table: "T7",  items: 5, total: 2890, status: "pending",   time: "8 min ago"  },
  { id: "ORD-1039", table: "T2",  items: 2, total: 680,  status: "preparing", time: "15 min ago" },
  { id: "ORD-1038", table: "Bar", items: 1, total: 420,  status: "completed", time: "28 min ago" },
];

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

const QUICK_ACTIONS = [
  { label: "New Order",     icon: ShoppingCart,    to: ROUTES.POS_ORDER,   bg: "bg-[#714B67]",        text: "text-white",  primary: true  },
  { label: "View Tables",   icon: MonitorSmartphone, to: ROUTES.TABLE_VIEW, bg: "bg-white",           text: "text-[#714B67]", primary: false },
  { label: "All Orders",    icon: ClipboardList,   to: ROUTES.ORDERS,      bg: "bg-white",            text: "text-gray-600", primary: false },
  { label: "Customers",     icon: Package,         to: ROUTES.CUSTOMERS,   bg: "bg-white",            text: "text-gray-600", primary: false },
  { label: "Coupons",       icon: Ticket,          to: ROUTES.COUPONS,     bg: "bg-white",            text: "text-gray-600", primary: false },
  { label: "Products",      icon: LayoutGrid,      to: ROUTES.PRODUCTS,    bg: "bg-white",            text: "text-gray-600", primary: false },
];

export default function UserDashboard() {
  const [sessionElapsed] = useState("3h 24m"); // in a real app, compute from SESSION.openedAt

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-3 px-4 shrink-0">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
        <span className="text-sm font-bold" style={{ color: "#121B35" }}>My Dashboard</span>
        <div className="ml-auto flex items-center gap-1">
          <Link to={ROUTES.ORDERS} title="Orders"
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <ShoppingCart className="w-4 h-4" />
          </Link>
          <Link to={ROUTES.TABLE_VIEW} title="Tables"
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <MonitorSmartphone className="w-4 h-4" />
          </Link>
          <Link to={ROUTES.POS_SESSION} title="Close Session"
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <ArrowUpFromLine className="w-4 h-4" />
          </Link>
          <Link to={ROUTES.LOGIN} title="Log Out"
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition">
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5 max-w-2xl mx-auto w-full">

        {/* Session banner */}
        <div className="bg-[#714B67] rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-[#714B67]/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1">Active Session</p>
              <p className="text-lg font-bold">{SESSION.name}</p>
              <p className="text-sm text-white/70 mt-0.5">Opened at {SESSION.openedAt} · {SESSION.cashier}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
              <p className="text-xs text-white/60">Duration</p>
              <p className="text-base font-bold">{sessionElapsed}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/20">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wide">Opening Balance</p>
              <p className="text-sm font-bold">₹{SESSION.openingBalance.toLocaleString()}</p>
            </div>
            <div className="ml-auto">
              <Link to={ROUTES.POS_SESSION}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                <ArrowUpFromLine className="w-3 h-3" />
                Close Session
              </Link>
            </div>
          </div>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          {TODAY_STATS.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">{stat.label}</p>
                <div className={`${stat.iconBg} p-1.5 rounded-lg`}>
                  <stat.icon className={`w-3.5 h-3.5 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-extrabold" style={{ color: "#121B35" }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ACTIONS.map(action => (
              <Link
                key={action.label}
                to={action.to}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition
                  ${action.primary
                    ? "border-[#714B67] shadow-md shadow-[#714B67]/20 hover:bg-[#5d3d55]"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  } ${action.bg}`}>
                <action.icon className={`w-5 h-5 ${action.text}`} />
                <span className={`text-[11px] font-semibold ${action.text}`}>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-bold" style={{ color: "#121B35" }}>My Recent Orders</p>
            <Link to={ROUTES.ORDERS} className="text-xs text-[#714B67] font-semibold hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {MY_RECENT_ORDERS.map(order => (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition">
                <div className="w-9 h-9 rounded-xl bg-[#714B67]/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#714B67]">{order.table}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#121B35]">{order.id}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{order.items} items · {order.time}</p>
                </div>
                <span className="text-sm font-bold text-[#121B35] shrink-0">₹{order.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
