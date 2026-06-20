import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, X, ChevronLeft, ChevronRight,
  User, Menu, SlidersHorizontal, Loader2, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import {
  listActiveTickets,
  advanceTicket,
  advanceTicketItem,
  type KdsTicket,
  type KdsTicketItem,
  type KdsItemState,
} from "../../api/kds";

type Stage = "To Cook" | "Preparing" | "Completed";

const STAGES: Stage[] = ["To Cook", "Preparing", "Completed"];

const STAGE_STYLES: Record<Stage, string> = {
  "To Cook":   "bg-orange-500 text-white",
  "Preparing": "bg-blue-500 text-white",
  "Completed": "bg-gray-400 text-white",
};

function mapState(state: KdsItemState | string): Stage {
  if (state === "TO_COOK")    return "To Cook";
  if (state === "PREPARING")  return "Preparing";
  return "Completed";
}

function ticketStage(ticket: KdsTicket): Stage {
  if (ticket.status === "PENDING")     return "To Cook";
  if (ticket.status === "IN_PROGRESS") return "Preparing";
  return "Completed";
}

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

function TicketCard({
  ticket,
  onAdvance,
  onAdvanceItem,
}: {
  ticket: KdsTicket;
  onAdvance: (id: string) => void;
  onAdvanceItem: (ticketId: string, itemId: string) => void;
}) {
  const stage = ticketStage(ticket);
  const stageIdx  = STAGES.indexOf(stage);
  const canAdvance = stageIdx < STAGES.length - 1;

  return (
    <div
      onClick={() => canAdvance && onAdvance(ticket.publicId)}
      className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-sm
        ${canAdvance ? "cursor-pointer hover:border-[#714B67]/40 hover:shadow-md transition" : "opacity-80"}`}
    >
      <p className="text-base font-extrabold text-center mb-3" style={{ color: "#121B35" }}>
        #{ticket.ticketNumber} {ticket.tableLabel ? `· ${ticket.tableLabel}` : ""}
      </p>
      <div className="space-y-1.5">
        {ticket.items.map((item: KdsTicketItem) => (
          <div
            key={item.publicId}
            onClick={e => { e.stopPropagation(); onAdvanceItem(ticket.publicId, item.publicId); }}
            className={`text-sm cursor-pointer select-none transition
              ${item.state === "COMPLETED" ? "line-through text-gray-300" : "text-gray-700 hover:text-[#714B67]"}`}
          >
            {item.quantity} × {item.productName}
            {item.notes && <span className="text-xs text-gray-400 ml-1">({item.notes})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KDS() {
  const [tickets,      setTickets]      = useState<KdsTicket[]>([]);
  const [search,       setSearch]       = useState("");
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [navOpen,      setNavOpen]      = useState(false);
  const [activeFilter, setActiveFilter] = useState<Stage | "All">("All");
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listActiveTickets();
      setTickets(data);
    } catch {
      setError("Failed to load KDS tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 15_000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function handleAdvanceTicket(publicId: string) {
    try {
      const updated = await advanceTicket(publicId);
      setTickets(prev => prev.map(t => t.publicId === publicId ? updated : t));
    } catch { /* ignore */ }
  }

  async function handleAdvanceItem(_ticketId: string, itemPublicId: string) {
    try {
      await advanceTicketItem(itemPublicId);
      // Reload to get fresh state
      loadTickets();
    } catch { /* ignore */ }
  }

  const filtered = tickets.filter(t => {
    const matchSearch = search === "" ||
      String(t.ticketNumber).includes(search) ||
      (t.tableLabel ?? "").toLowerCase().includes(search.toLowerCase()) ||
      t.items.some(i => i.productName.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  const countByStage = (s: Stage) => filtered.filter(t => ticketStage(t) === s).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F5F5F7]">
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

      <div className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-2 shrink-0 flex-wrap">
        <button onClick={() => setSidebarOpen(o => !o)}
          className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-100 rounded-lg transition">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setActiveFilter("All")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition
              ${activeFilter === "All" ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            All <span className="bg-white/20 text-[10px] px-1.5 rounded-full">{filtered.length}</span>
          </button>
          <div className="w-px h-4 bg-gray-200" />
          {STAGES.map(s => (
            <button key={s} onClick={() => setActiveFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition
                ${activeFilter === s ? STAGE_STYLES[s] : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s}
              <span className={`text-[10px] px-1.5 rounded-full ${activeFilter === s ? "bg-white/25" : "bg-gray-200"}`}>
                {countByStage(s)}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[140px] max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <div className="w-44 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto p-3 space-y-4">
            <button onClick={loadTickets}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#714B67] hover:text-[#5d3d55] transition">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Refresh
            </button>
            <p className="text-xs text-gray-400">Auto-refreshes every 15s</p>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {loading && tickets.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading tickets…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-400">
              <AlertCircle className="w-5 h-5 mr-2" />{error}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 min-w-[540px]">
              {STAGES.map(stage => {
                const stageTickets = filtered.filter(t =>
                  ticketStage(t) === stage &&
                  (activeFilter === "All" || activeFilter === stage)
                );
                return (
                  <div key={stage} className="flex flex-col gap-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${STAGE_STYLES[stage]}`}>
                      <span className="text-xs font-bold">{stage}</span>
                      <span className="ml-auto text-xs bg-white/25 px-2 py-0.5 rounded-full font-bold">
                        {countByStage(stage)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3 overflow-y-auto">
                      {stageTickets.length === 0 ? (
                        <div className="text-center text-xs text-gray-300 py-8">No tickets</div>
                      ) : (
                        stageTickets.map(t => (
                          <TicketCard
                            key={t.publicId}
                            ticket={t}
                            onAdvance={handleAdvanceTicket}
                            onAdvanceItem={handleAdvanceItem}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
