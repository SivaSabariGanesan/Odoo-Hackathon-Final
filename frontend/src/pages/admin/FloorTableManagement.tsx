import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Trash2, User, Menu, MonitorSmartphone, ShoppingCart,
  ArrowUpFromLine, LayoutGrid, Tag, CreditCard, Ticket,
  CalendarRange, Users, ChefHat, BarChart3, LogOut,
  X, Check, Pencil, GripVertical, Loader2, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import {
  fetchFloors,
  createFloor,
  updateFloor,
  deleteFloor as deleteFloorApi,
  createTable,
  updateTable,
  deleteTable as deleteTableApi,
  toggleTableActive,
  type Floor,
  type Table,
} from "../../api/floors";

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

function TableModal({
  table, floorName, floorPublicId, onClose, onSave,
}: {
  table: Table | null;
  floorName: string;
  floorPublicId: string;
  onClose: () => void;
  onSave: (t: Table) => void;
}) {
  const [number,  setNumber]  = useState(table?.tableNumber ?? "");
  const [seats,   setSeats]   = useState(String(table?.seats ?? "4"));
  const [active,  setActive]  = useState(table?.isActive ?? true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function handleSave() {
    if (!number.trim()) return;
    setSaving(true);
    setError("");
    try {
      let saved: Table;
      if (table) {
        saved = await updateTable(table.publicId, {
          tableNumber: number.trim(),
          seats: parseInt(seats) || 4,
          isActive: active,
        });
      } else {
        saved = await createTable({
          floorId: floorPublicId,
          tableNumber: number.trim(),
          seats: parseInt(seats) || 4,
        });
      }
      onSave(saved);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Failed to save table");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>
            {table ? "Edit Table" : `Add Table · ${floorName}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Table Number</label>
            <input value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 5"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Seats</label>
            <select value={seats} onChange={e => setSeats(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] bg-white text-[#121B35]">
              {["2","4","6","8","10","12"].map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-500">Active</label>
            <button onClick={() => setActive(a => !a)}
              className="relative inline-flex items-center rounded-full transition-colors"
              style={{ width: 34, height: 18, backgroundColor: active ? "#714B67" : "#d1d5db" }}>
              <span className="absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all"
                style={{ left: active ? 16 : 2 }} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
          <button onClick={onClose}
            className="py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">Discard</button>
          <button onClick={handleSave} disabled={saving}
            className="py-3 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Save
          </button>
        </div>
      </div>
    </div>
  );
}

function FloorNameEdit({ name, onSave }: { name: string; onSave: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(name);

  if (editing) {
    return (
      <input autoFocus value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { onSave(val); setEditing(false); }}
        onKeyDown={e => { if (e.key === "Enter") { onSave(val); setEditing(false); } }}
        className="text-sm font-bold border-b-2 border-[#714B67] outline-none text-[#121B35] bg-transparent w-40"
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-sm font-bold hover:text-[#714B67] transition group"
      style={{ color: "#121B35" }}>
      {name}
      <Pencil className="w-3 h-3 text-gray-300 group-hover:text-[#714B67] transition" />
    </button>
  );
}

export default function FloorTableManagement() {
  const [floors,     setFloors]     = useState<Floor[]>([]);
  const [activeFloor,setActiveFloor]= useState<string>("");
  const [tableModal, setTableModal] = useState<{ floorPublicId: string; table: Table | null } | null>(null);
  const [navOpen,    setNavOpen]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const loadFloors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFloors();
      setFloors(data);
      if (data.length > 0 && !activeFloor) setActiveFloor(data[0].publicId);
    } catch {
      setError("Failed to load floors");
    } finally {
      setLoading(false);
    }
  }, [activeFloor]);

  useEffect(() => { loadFloors(); }, []); // eslint-disable-line

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const currentFloor = floors.find(f => f.publicId === activeFloor);

  async function handleAddFloor() {
    try {
      const newFloor = await createFloor({ name: `Floor ${floors.length + 1}` });
      setFloors(p => [...p, { ...newFloor, tables: [] }]);
      setActiveFloor(newFloor.publicId);
    } catch { /* ignore */ }
  }

  async function handleRenameFloor(publicId: string, name: string) {
    try {
      const updated = await updateFloor(publicId, { name });
      setFloors(p => p.map(f => f.publicId === publicId ? { ...f, name: updated.name } : f));
    } catch { /* ignore */ }
  }

  async function handleDeleteFloor(publicId: string) {
    try {
      await deleteFloorApi(publicId);
      const remaining = floors.filter(f => f.publicId !== publicId);
      setFloors(remaining);
      if (activeFloor === publicId) setActiveFloor(remaining[0]?.publicId ?? "");
    } catch { /* ignore */ }
  }

  function handleSaveTable(floorId: string, table: Table) {
    setFloors(p => p.map(f => {
      if (f.publicId !== floorId) return f;
      const exists = f.tables.find(t => t.publicId === table.publicId);
      return {
        ...f,
        tables: exists
          ? f.tables.map(t => t.publicId === table.publicId ? table : t)
          : [...f.tables, table],
      };
    }));
  }

  async function handleDeleteTable(floorId: string, tablePublicId: string) {
    try {
      await deleteTableApi(tablePublicId);
      setFloors(p => p.map(f =>
        f.publicId !== floorId ? f : { ...f, tables: f.tables.filter(t => t.publicId !== tablePublicId) }
      ));
    } catch { /* ignore */ }
  }

  async function handleToggleTable(floorId: string, tablePublicId: string) {
    try {
      const updated = await toggleTableActive(tablePublicId);
      setFloors(p => p.map(f =>
        f.publicId !== floorId ? f : {
          ...f, tables: f.tables.map(t => t.publicId === tablePublicId ? updated : t),
        }
      ));
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="w-6 h-6 animate-spin text-[#714B67]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 px-3 sm:px-4 shrink-0 z-10">
        <img src="/logo.svg" alt="RestoPOS" className="h-7 shrink-0" />
        <span className="text-sm font-bold" style={{ color: "#121B35" }}>Floor & Table</span>
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

      <div className="flex-1 p-3 sm:p-6 flex flex-col gap-4 max-w-4xl mx-auto w-full">
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}

        {/* Floor tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {floors.map(f => (
            <button key={f.publicId} onClick={() => setActiveFloor(f.publicId)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition
                ${activeFloor === f.publicId
                  ? "bg-[#714B67] text-white border-[#714B67] shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              {f.name}
              {activeFloor === f.publicId && floors.length > 1 && (
                <button onClick={e => { e.stopPropagation(); handleDeleteFloor(f.publicId); }}
                  className="text-white/60 hover:text-white transition ml-1">
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>
          ))}
          <button onClick={handleAddFloor}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-dashed border-gray-300 text-gray-400 hover:border-[#714B67] hover:text-[#714B67] transition bg-white">
            <Plus className="w-3.5 h-3.5" />Add Floor
          </button>
        </div>

        {/* Floor card */}
        {currentFloor && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <FloorNameEdit
                name={currentFloor.name}
                onSave={n => handleRenameFloor(currentFloor.publicId, n)}
              />
              <button
                onClick={() => setTableModal({ floorPublicId: currentFloor.publicId, table: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition">
                <Plus className="w-3.5 h-3.5" />Add Table
              </button>
            </div>

            {currentFloor.tables.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <p className="text-sm">No tables yet</p>
                <button onClick={() => setTableModal({ floorPublicId: currentFloor.publicId, table: null })}
                  className="mt-3 text-xs text-[#714B67] hover:underline font-medium">
                  + Add first table
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="w-8 pl-4" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Table #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Seats</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentFloor.tables.map(t => (
                    <tr key={t.publicId} className="hover:bg-gray-50/70 transition group">
                      <td className="pl-4 py-3.5">
                        <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 cursor-grab" />
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium" style={{ color: "#121B35" }}>
                        Table {t.tableNumber}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{t.seats} seats</td>
                      <td className="px-4 py-3.5 text-center">
                        <button onClick={() => handleToggleTable(currentFloor.publicId, t.publicId)}
                          className="relative inline-flex items-center rounded-full transition-colors"
                          style={{ width: 34, height: 18, backgroundColor: t.isActive ? "#714B67" : "#d1d5db" }}>
                          <span className="absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all"
                            style={{ left: t.isActive ? 16 : 2 }} />
                        </button>
                      </td>
                      <td className="pr-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setTableModal({ floorPublicId: currentFloor.publicId, table: t })}
                            className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-100 rounded-lg transition">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTable(currentFloor.publicId, t.publicId)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">
                {currentFloor.tables.length} table{currentFloor.tables.length !== 1 ? "s" : ""} ·{" "}
                {currentFloor.tables.filter(t => t.isActive).length} active
              </p>
            </div>
          </div>
        )}
      </div>

      {tableModal && (
        <TableModal
          table={tableModal.table}
          floorName={floors.find(f => f.publicId === tableModal.floorPublicId)?.name ?? ""}
          floorPublicId={tableModal.floorPublicId}
          onClose={() => setTableModal(null)}
          onSave={t => { handleSaveTable(tableModal.floorPublicId, t); setTableModal(null); }}
        />
      )}
    </div>
  );
}
