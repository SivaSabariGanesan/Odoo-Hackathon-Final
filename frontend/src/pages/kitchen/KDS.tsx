import { useState, useRef, useEffect } from "react";
import {
  Search, X, ChevronLeft, ChevronRight,
  User, Menu, SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

type Stage = "To Cook" | "Preparing" | "Completed";

interface KDSItem  { id: number; name: string; qty: number; done: boolean }
interface KDSTicket { id: string; orderNo: string; stage: Stage; items: KDSItem[] }

const INIT_TICKETS: KDSTicket[] = [
  {
    id: "t1", orderNo: "#2205", stage: "To Cook",
    items: [
      { id: 1, name: "Masala Tea", qty: 3, done: false },
      { id: 2, name: "Lassi",      qty: 3, done: false },
      { id: 3, name: "Coffee",     qty: 3, done: false },
      { id: 4, name: "Water",      qty: 3, done: false },
    ],
  },
  {
    id: "t2", orderNo: "#2205", stage: "Preparing",
    items: [
      { id: 1, name: "Masala Tea", qty: 3, done: false },
      { id: 2, name: "Lassi",      qty: 3, done: false },
      { id: 3, name: "Coffee",     qty: 3, done: false },
      { id: 4, name: "Water",      qty: 3, done: true  },
    ],
  },
  {
    id: "t3", orderNo: "#2205", stage: "Completed",
    items: [
      { id: 1, name: "Masala Tea", qty: 3, done: false },
      { id: 2, name: "Lassi",      qty: 3, done: false },
      { id: 3, name: "Coffee",     qty: 3, done: false },
      { id: 4, name: "Water",      qty: 3, done: true  },
    ],
  },
  {
    id: "t4", orderNo: "#2206", stage: "To Cook",
    items: [
      { id: 1, name: "Burger", qty: 2, done: false },
      { id: 2, name: "Pizza",  qty: 1, done: false },
    ],
  },
];

const STAGES: Stage[] = ["To Cook", "Preparing", "Completed"];

const STAGE_STYLES: Record<Stage, string> = {
  "To Cook":   "bg-orange-500 text-white",
  "Preparing": "bg-blue-500 text-white",
  "Completed": "bg-gray-400 text-white",
};

const PRODUCTS   = ["Burger", "Pizza", "Coffee", "Water"];
const CATEGORIES = ["Desert", "Quick Bites", "Drink"];

const NAV_ITEMS = [
  { label: "Products",           to: ROUTES.PRODUCTS },
  { label: "Category",           to: ROUTES.CATEGORIES },
  { label: "Payment Method",     to: ROUTES.PAYMENTS },
  { label: "Coupon & Promotion", to: ROUTES.COUPONS },
  { label: "User/Employee",      to: ROUTES.EMPLOYEES },
  { label: "KDS",                to: ROUTES.KDS },
  { label: "Reports",            to: ROUTES.REPORTS },
  { label: "Log Out",            to: ROUTES.LOGIN },
];

// ── Ticket Card ──────────────────────────────────────────────────
function TicketCard({
  ticket,
  onAdvance,
  onToggleItem,
}: {
  ticket: KDSTicket;
  onAdvance: (id: string) => void;
  onToggleItem: (ticketId: string, itemId: number) => void;
}) {
  const stageIdx = STAGES.indexOf(ticket.stage);
  const canAdvance = stageIdx < STAGES.length - 1;

  return (
    <div
      onClick={() => canAdvance && onAdvance(ticket.id)}
      className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-sm
        ${canAdvance ? "cursor-pointer hover:border-[#714B67]/40 hover:shadow-md transition" : "opacity-80"}`}
    >
      {/* Order number */}
      <p className="text-base font-extrabold text-center mb-3" style={{ color: "#121B35" }}>
        {ticket.orderNo}
      </p>

      {/* Items */}
      <div className="space-y-1.5">
        {ticket.items.map(item => (
          <div
            key={item.id}
            onClick={e => { e.stopPropagation(); onToggleItem(ticket.id, item.id); }}
            className={`text-sm cursor-pointer select-none transition
              ${item.done ? "line-through text-gray-300" : "text-gray-700 hover:text-[#714B67]"}`}
          >
            {item.qty} × {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main KDS Page ────────────────────────────────────────────────
export default function KDS() {
  const [tickets,      setTickets]      = useState<KDSTicket[]>(INIT_TICKETS);
  const [search,       setSearch]       = useState("");
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [filterProd,   setFilterProd]   = useState<string | null>(null);
  const [filterCat,    setFilterCat]    = useState<string | null>(null);
  const [navOpen,      setNavOpen]      = useState(false);
  const [activeFilter, setActiveFilter] = useState<Stage | "All">("All");
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function advanceTicket(id: string) {
    setTickets(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = STAGES[STAGES.indexOf(t.stage) + 1];
      return next ? { ...t, stage: next } : t;
    }));
  }

  function toggleItem(ticketId: string, itemId: number) {
    setTickets(prev => prev.map(t =>
      t.id !== ticketId ? t : {
        ...t,
        items: t.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i),
      }
    ));
  }

  function clearFilters() { setFilterProd(null); setFilterCat(null); }

  const filtered = tickets.filter(t => {
    const matchSearch = search === "" ||
      t.orderNo.toLowerCase().includes(search.toLowerCase()) ||
      t.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()));
    const matchProd = !filterProd || t.items.some(i => i.name.toLowerCase() === filterProd.toLowerCase());
    return matchSearch && matchProd;
  });

  const countByStage = (s: Stage) => filtered.filter(t => t.stage === s).length;
  const totalCount   = filtered.length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F5F5F7]">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
        <span className="text-sm font-bold" style={{ color: "#121B35" }}>KDS</span>

        <div className="flex-1" />

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
            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-48 py-1">
              {NAV_ITEMS.map(({ label, to }) => (
                <Link key={label} to={to} onClick={() => setNavOpen(false)}
                  className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── FILTER BAR ── */}
      <div className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-2 shrink-0 flex-wrap">
        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen(o => !o)}
          className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-100 rounded-lg transition">
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Stage tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveFilter("All")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition
              ${activeFilter === "All" ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            All <span className="bg-white/20 text-[10px] px-1.5 rounded-full">{totalCount}</span>
          </button>
          <div className="w-px h-4 bg-gray-200" />
          {STAGES.map(s => (
            <button key={s} onClick={() => setActiveFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition
                ${activeFilter === s
                  ? STAGE_STYLES[s]
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s}
              <span className={`text-[10px] px-1.5 rounded-full
                ${activeFilter === s ? "bg-white/25" : "bg-gray-200"}`}>
                {countByStage(s)}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
        </div>

        {/* Pagination placeholder */}
        <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
          1–{Math.min(3, filtered.length)}
          <button className="p-1 hover:text-[#714B67]"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:text-[#714B67]"><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar filter */}
        {sidebarOpen && (
          <div className="w-44 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto p-3 space-y-4">
            {/* Clear filter */}
            {(filterProd || filterCat) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 transition">
                <X className="w-3 h-3" />Clear Filter
              </button>
            )}

            {/* Product filter */}
            <div>
              <p className="text-xs font-bold text-[#121B35] mb-2">Product</p>
              <div className="space-y-1">
                {PRODUCTS.map(p => (
                  <button key={p} onClick={() => setFilterProd(filterProd === p ? null : p)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition
                      ${filterProd === p
                        ? "bg-[#714B67] text-white font-semibold"
                        : "text-gray-600 hover:bg-gray-100"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div>
              <p className="text-xs font-bold text-[#121B35] mb-2">Category</p>
              <div className="space-y-1">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setFilterCat(filterCat === c ? null : c)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition
                      ${filterCat === c
                        ? "bg-[#714B67] text-white font-semibold"
                        : "text-gray-600 hover:bg-gray-100"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3-column ticket board */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 gap-4 h-full min-w-[540px]">
            {STAGES.map(stage => {
              const stageTickets = filtered.filter(t =>
                t.stage === stage &&
                (activeFilter === "All" || activeFilter === stage)
              );
              return (
                <div key={stage} className="flex flex-col gap-3">
                  {/* Column header */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${STAGE_STYLES[stage]}`}>
                    <span className="text-xs font-bold">{stage}</span>
                    <span className="ml-auto text-xs bg-white/25 px-2 py-0.5 rounded-full font-bold">
                      {countByStage(stage)}
                    </span>
                  </div>

                  {/* Tickets */}
                  <div className="flex flex-col gap-3 overflow-y-auto">
                    {stageTickets.length === 0 ? (
                      <div className="text-center text-xs text-gray-300 py-8">No tickets</div>
                    ) : (
                      stageTickets.map(t => (
                        <TicketCard
                          key={t.id}
                          ticket={t}
                          onAdvance={advanceTicket}
                          onToggleItem={toggleItem}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
