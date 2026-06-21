import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Loader2, RefreshCw, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import { getSoSession, clearSoSession, getSoOrderHistory, type SoOrder } from "../../api/self-order";
import { clearAuth } from "../../api/auth";

type DisplayStatus = "To Cook" | "Preparing" | "Completed" | "Draft" | "Cancelled";

function mapStatus(apiStatus: string): DisplayStatus {
  switch (apiStatus) {
    case "DRAFT":           return "Draft";
    case "SENT_TO_KITCHEN": return "To Cook";
    case "PREPARING":       return "Preparing";
    case "READY":           return "Preparing";
    case "PAID":            return "Completed";
    case "CANCELLED":       return "Cancelled";
    default:                return "Draft";
  }
}

const STATUS_STYLES: Record<DisplayStatus, string> = {
  "To Cook":   "bg-orange-100 text-orange-700 border-orange-200",
  "Preparing": "bg-blue-100 text-blue-700 border-blue-200",
  "Completed": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Draft":     "bg-gray-100 text-gray-600 border-gray-200",
  "Cancelled": "bg-red-100 text-red-600 border-red-200",
};

export default function TrackOrder() {
  const session = getSoSession();
  const navigate = useNavigate();

  const [orders,  setOrders]  = useState<SoOrder[]>([]);
  const [loading, setLoading] = useState(!!session);
  const [error,   setError]   = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSoOrderHistory(session.tableToken, session.sessionToken);
      // Filter out DRAFT orders (abandoned carts) - only show confirmed orders
      const confirmedOrders = Array.isArray(data) 
        ? data.filter(o => o.status !== "DRAFT") 
        : [];
      setOrders(confirmedOrders);
    } catch {
      setError("Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Auto-refresh every 20 seconds while any order is still active
  useEffect(() => {
    const hasActive = orders.some(o => {
      const s = mapStatus(o.status);
      return s === "To Cook" || s === "Preparing";
    });
    if (!hasActive) return;
    const t = setInterval(loadOrders, 20_000);
    return () => clearInterval(t);
  }, [orders, loadOrders]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={{ height: 700 }}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              clearSoSession();
              clearAuth();
              navigate(ROUTES.LOGIN);
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <span className="flex-1 text-center text-sm font-bold" style={{ color: "#121B35" }}>
            Order History
          </span>
          <button
            onClick={loadOrders}
            disabled={loading}
            className="p-1 text-gray-400 hover:text-[#714B67] transition disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Table info badge */}
        {session && (
          <div className="px-4 pt-3 shrink-0">
            <div className="bg-[#714B67]/5 border border-[#714B67]/20 rounded-xl px-3 py-2 text-center">
              <p className="text-xs text-[#714B67] font-semibold">Table {session.tableNumber}</p>
            </div>
          </div>
        )}

        {/* Order list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading orders…
            </div>
          ) : error ? (
            <div className="text-center text-red-400 text-sm py-8">{error}</div>
          ) : !session ? (
            <div className="text-center text-gray-400 text-sm py-12">
              <p>Scan a QR code to track your order.</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-12">
              <p>No orders yet for this table.</p>
              <Link to={ROUTES.PRODUCT_BROWSE} className="text-[#714B67] text-xs font-semibold mt-2 block hover:underline">
                Start ordering
              </Link>
            </div>
          ) : (
            <>
              {orders.map(order => {
                const display = mapStatus(order.status);
                return (
                  <div
                    key={order.id}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold" style={{ color: "#121B35" }}>
                        #{order.orderNumber}
                      </span>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLES[display]}`}>
                        {display}
                      </span>
                    </div>

                    {/* Items summary */}
                    {order.items && order.items.length > 0 && (
                      <div className="space-y-0.5 mb-1.5">
                        {order.items.slice(0, 3).map((item, i) => (
                          <p key={i} className="text-xs text-gray-500">
                            {item.quantity}× {item.productName}
                          </p>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-[10px] text-gray-400">+{order.items.length - 3} more</p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-xs font-bold text-[#714B67]">
                        ₹{parseFloat(order.grandTotal).toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <p className="text-[10px] text-gray-400 text-center pt-2">
                Auto-refreshes while orders are active
              </p>
            </>
          )}
        </div>

        {/* Back button */}
        <div className="px-4 pb-5 shrink-0">
          <Link
            to={ROUTES.ORDER_CONFIRMED}
            className="w-full flex items-center justify-center gap-2 bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-3 rounded-2xl transition shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
