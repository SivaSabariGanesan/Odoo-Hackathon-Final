import { useState, useRef, useEffect } from "react";
import {
  Plus, Trash2, User, Menu, MonitorSmartphone, ShoppingCart,
  ArrowUpFromLine, LayoutGrid, Tag, CreditCard, Ticket,
  CalendarRange, Users, ChefHat, BarChart3, LogOut,
  X, Check, Pencil, GripVertical,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

interface TableRow { id: string; number: number; seats: number; active: boolean }
interface Floor    { id: string; name: string; tables: TableRow[] }

const INIT_FLOORS: Floor[] = [
  {
    id: "f1", name: "Ground Floor",
    tables: [
      { id: "t1", number: 1, seats: 4, active: true  },
      { id: "t2", number: 2, seats: 2, active: true  },
      { id: "t3", number: 3, seats: 6, active: false },
    ],
  },
  {
    id: "f2", name: "First Floor",
    tables: [
      { id: "t4", number: 1, seats: 4, active: true },
      { id: "t5", number: 2, seats: 4, active: true },
    ],
  },
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

// ── Table form modal ─────────────────────────────────────────────
function TableModal({
  table, floorName, onClose, onSave,
}: {
  table: TableRow | null;
  floorName: string;
  onClose: () => void;
  onSave: (t: TableRow) => void;
}) {
  const [number, setNumber] = useState(String(table?.number ?? ""));
  const [seats,  setSeats]  = useState(String(table?.seats  ?? "4"));
  const [active, setActive] = useState(table?.active ?? true);

  function handleSave() {
    if (!number) return;
    onSave({ id: table?.id ?? crypto.randomUUID(), number: parseInt(number), seats: parseInt(seats) || 4, active });
    onClose();
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
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Table Number</label>
            <input value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 5" type="number"
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
          <button onClick={handleSave}
            className="py-3 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" />Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Floor name edit ──────────────────────────────────────────────
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

// ── Main page ────────────────────────────────────────────────────
export default function FloorTableManagement() {
  const [floors,    setFloors]    = useState<Floor[]>(INIT_FLOORS);
  const [activeFloor, setActiveFloor] = useState(INIT_FLOORS[0].id);
  const [tableModal, setTableModal] = useState<{ floorId: string; table: TableRow | null } | null>(null);
  const [navOpen,   setNavOpen]   = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const currentFloor = floors.find(f => f.id === activeFloor)!;

  function addFloor() {
    const f: Floor = { id: crypto.randomUUID(), name: `Floor ${floors.length + 1}`, tables: [] };
    setFloors(p => [...p, f]);
    setActiveFloor(f.id);
  }

  function renameFloor(id: string, name: string) {
    setFloors(p => p.map(f => f.id === id ? { ...f, name } : f));
  }

  function deleteFloor(id: string) {
    const remaining = floors.filter(f => f.id !== id);
    setFloors(remaining);
    if (activeFloor === id) setActiveFloor(remaining[0]?.id ?? "");
  }

  function saveTable(floorId: string, table: TableRow) {
    setFloors(p => p.map(f => {
      if (f.id !== floorId) return f;
      const exists = f.tables.find(t => t.id === table.id);
      return {
        ...f,
        tables: exists ? f.tables.map(t => t.id === table.id ? table : t) : [...f.tables, table],
      };
    }));
  }

  function deleteTable(floorId: string, tableId: string) {
    setFloors(p => p.map(f =>
      f.id !== floorId ? f : { ...f, tables: f.tables.filter(t => t.id !== tableId) }
    ));
  }

  function toggleTableActive(floorId: string, tableId: string) {
    setFloors(p => p.map(f =>
      f.id !== floorId ? f : {
        ...f,
        tables: f.tables.map(t => t.id === tableId ? { ...t, active: !t.active } : t),
      }
    ));
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
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

      {/* ── BODY ── */}
      <div className="flex-1 p-3 sm:p-6 flex flex-col gap-4 max-w-4xl mx-auto w-full">

        {/* Floor tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {floors.map(f => (
            <button key={f.id} onClick={() => setActiveFloor(f.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition
                ${activeFloor === f.id
                  ? "bg-[#714B67] text-white border-[#714B67] shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              {f.name}
              {activeFloor === f.id && floors.length > 1 && (
                <button onClick={e => { e.stopPropagation(); deleteFloor(f.id); }}
                  className="text-white/60 hover:text-white transition ml-1">
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>
          ))}
          <button onClick={addFloor}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-dashed border-gray-300 text-gray-400 hover:border-[#714B67] hover:text-[#714B67] transition bg-white">
            <Plus className="w-3.5 h-3.5" />Add Floor
          </button>
        </div>

        {/* Floor card */}
        {currentFloor && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <FloorNameEdit
                name={currentFloor.name}
                onSave={n => renameFloor(currentFloor.id, n)}
              />
              <button
                onClick={() => setTableModal({ floorId: currentFloor.id, table: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition">
                <Plus className="w-3.5 h-3.5" />Add Table
              </button>
            </div>

            {/* Tables */}
            {currentFloor.tables.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <p className="text-sm">No tables yet</p>
                <button onClick={() => setTableModal({ floorId: currentFloor.id, table: null })}
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
                    <tr key={t.id} className="hover:bg-gray-50/70 transition group">
                      <td className="pl-4 py-3.5">
                        <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 cursor-grab" />
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium" style={{ color: "#121B35" }}>
                        Table {t.number}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{t.seats} seats</td>
                      <td className="px-4 py-3.5 text-center">
                        <button onClick={() => toggleTableActive(currentFloor.id, t.id)}
                          className="relative inline-flex items-center rounded-full transition-colors"
                          style={{ width: 34, height: 18, backgroundColor: t.active ? "#714B67" : "#d1d5db" }}>
                          <span className="absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all"
                            style={{ left: t.active ? 16 : 2 }} />
                        </button>
                      </td>
                      <td className="pr-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setTableModal({ floorId: currentFloor.id, table: t })}
                            className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-100 rounded-lg transition">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTable(currentFloor.id, t.id)}
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
                {currentFloor.tables.filter(t => t.active).length} active
              </p>
            </div>
          </div>
        )}
      </div>

      {tableModal && (
        <TableModal
          table={tableModal.table}
          floorName={floors.find(f => f.id === tableModal.floorId)?.name ?? ""}
          onClose={() => setTableModal(null)}
          onSave={t => { saveTable(tableModal.floorId, t); setTableModal(null); }}
        />
      )}
    </div>
  );
}
