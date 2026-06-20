import { useState, useRef, useEffect } from "react";
import { MoreVertical, Coffee, CalendarDays, IndianRupee, Settings, Monitor } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import { fetchLastClosedSession, openSession, type Session } from "../../api/sessions";

export default function POSSession() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastSession, setLastSession] = useState<Session | null>(null);
  const [opening, setOpening] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLastClosedSession()
      .then(s => setLastSession(s))
      .catch(err => console.error("Failed to load last session", err));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpenSession() {
    try {
      setOpening(true);
      await openSession(0);
      navigate(ROUTES.POS_ORDER);
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === "SESSION_ALREADY_OPEN") {
        // Session already open — go straight to POS
        navigate(ROUTES.POS_ORDER);
      } else {
        alert(err?.response?.data?.error?.message ?? "Failed to open session");
      }
    } finally {
      setOpening(false);
    }
  }

  const lastOpen = lastSession?.closedAt
    ? new Date(lastSession.closedAt).toLocaleDateString("en-IN")
    : "—";
  const lastSell = lastSession?.closingSaleAmount
    ? `₹ ${parseFloat(lastSession.closingSaleAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    : "—";

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-8">
      {/* Subtle brand glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[400px] rounded-full bg-[#714B67]/8 blur-[100px]" />
      </div>

      {/* On mobile: stack vertically; on sm+: side by side */}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-start gap-3 w-full max-w-lg sm:max-w-none sm:w-auto">

        {/* ── Main Session Card ── */}
        <div className="w-full sm:w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-[#714B67]/10 p-2 rounded-lg">
                <Coffee className="w-4 h-4 text-[#714B67]" />
              </div>
              <span className="font-semibold text-base" style={{ color: "#121B35" }}>Odoo Cafe</span>
            </div>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition">
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-xl z-20 w-44 py-1.5 text-sm">
                  <Link to="/admin/products" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-gray-600 hover:bg-gray-50 transition rounded-lg mx-1">
                    <Settings className="w-3.5 h-3.5 text-[#714B67]" />Settings
                  </Link>
                  <Link to={ROUTES.CUSTOMER_ORDER} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-gray-600 hover:bg-gray-50 transition rounded-lg mx-1">
                    <Monitor className="w-3.5 h-3.5 text-[#714B67]" />Customer Display
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <CalendarDays className="w-3.5 h-3.5" /><span>Last open</span>
              </div>
              <span className="text-sm font-medium" style={{ color: "#121B35" }}>{lastOpen}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <IndianRupee className="w-3.5 h-3.5" /><span>Last sell</span>
              </div>
              <span className="text-sm font-medium" style={{ color: "#121B35" }}>{lastSell}</span>
            </div>
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={handleOpenSession}
              disabled={opening}
              className="flex items-center justify-center w-full bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-semibold py-2.5 rounded-xl transition shadow-md shadow-[#714B67]/20 disabled:opacity-60 disabled:cursor-not-allowed">
              {opening ? "Opening…" : "Open Session"}
            </button>
          </div>
        </div>

        {/* ── Side Quick-links ── */}
        {/* On mobile: row of buttons; on sm+: vertical card */}
        <div className="flex sm:flex-col bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden w-full sm:w-44">
          <Link to="/admin/products"
            className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2.5 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#121B35] transition border-b-0 sm:border-b border-r sm:border-r-0 border-gray-100">
            <Settings className="w-3.5 h-3.5 text-[#714B67]" />
            Setting
          </Link>
          <Link to={ROUTES.CUSTOMER_ORDER}
            className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2.5 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#121B35] transition">
            <Monitor className="w-3.5 h-3.5 text-[#714B67]" />
            <span className="hidden sm:inline">Customer Display</span>
            <span className="sm:hidden text-xs">Display</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
