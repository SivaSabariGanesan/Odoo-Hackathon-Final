import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, User, Menu, MonitorSmartphone, ShoppingCart,
  ArrowUpFromLine, LayoutGrid, Tag, CreditCard, Ticket,
  CalendarRange, Users, ChefHat, BarChart3, LogOut,
  X, Search, Check, Trash2, Archive, KeyRound,
  ChevronDown, UserCircle2, Loader2, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import {
  fetchStaff,
  createStaff,
  updateStaff,
  archiveStaff,
  deleteStaff,
  changeStaffPassword,
  type StaffMember,
  type StaffRole,
} from "../../api/staff";

type EmpStatus = "Active" | "Disable";

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

function mapStatus(s: StaffMember["status"]): EmpStatus {
  return s === "ACTIVE" ? "Active" : "Disable";
}

function ChangePasswordModal({
  employee,
  onClose,
}: { employee: StaffMember; onClose: () => void }) {
  const [pwd, setPwd]       = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [done, setDone]     = useState(false);

  async function handleSave() {
    if (!pwd.trim()) return;
    setSaving(true);
    setError("");
    try {
      await changeStaffPassword(employee.publicId, pwd.trim());
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>Change Password</h3>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500">Change password for <span className="font-semibold text-[#121B35]">{employee.name}</span></p>
          {done ? (
            <p className="text-sm text-emerald-600 font-semibold text-center py-2">Password changed!</p>
          ) : (
            <>
              <input autoFocus value={pwd} onChange={e => setPwd(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                placeholder="New password" type="password"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}
        </div>
        {!done && (
          <div className="px-5 pb-5">
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateModal({
  onClose,
  onSave,
}: { onClose: () => void; onSave: (e: StaffMember) => void }) {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [password,setPassword]= useState("");
  const [role,    setRole]    = useState<StaffRole>("CASHIER");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function handleSave() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email and password are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const staff = await createStaff({ name: name.trim(), email: email.trim(), password: password.trim(), role });
      onSave(staff);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>New User / Employee</h3>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="john@cafe.com" type="email"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as StaffRole)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] bg-white text-[#121B35]">
              <option value="ADMIN">Admin</option>
              <option value="CASHIER">Cashier</option>
              <option value="KITCHEN">Kitchen</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
          <button onClick={onClose}
            className="py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">Discard</button>
          <button onClick={handleSave} disabled={saving}
            className="py-3 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeDropdown({ value, onChange }: { value: StaffRole; onChange: (v: StaffRole) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const labels: Record<StaffRole, string> = { ADMIN: "Admin", CASHIER: "Cashier", KITCHEN: "Kitchen" };

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#714B67] transition">
        {labels[value]}
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-6 bg-white border border-gray-200 rounded-xl shadow-xl z-20 w-32 py-1">
          {(["ADMIN", "CASHIER", "KITCHEN"] as StaffRole[]).map(r => (
            <button key={r} onClick={() => { onChange(r); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition
                ${value === r ? "text-[#714B67] font-semibold bg-[#714B67]/5" : "text-gray-600 hover:bg-gray-50"}`}>
              {labels[r]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState<StaffMember[]>([]);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [search,    setSearch]    = useState("");
  const [navOpen,   setNavOpen]   = useState(false);
  const [actionOpen,setActionOpen]= useState(false);
  const [createOpen,setCreateOpen]= useState(false);
  const [changePwd, setChangePwd] = useState<StaffMember | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const navRef    = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStaff({ pageSize: 200 });
      setEmployees(data);
    } catch {
      setError("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current    && !navRef.current.contains(e.target as Node))    setNavOpen(false);
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) setActionOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  );

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(selected.size === filtered.length && filtered.length > 0
      ? new Set() : new Set(filtered.map(e => e.publicId)));
  }

  async function handleDelete() {
    const ids = [...selected];
    setActionOpen(false);
    for (const id of ids) {
      try { await deleteStaff(id); } catch { /* continue */ }
    }
    setEmployees(p => p.filter(e => !ids.includes(e.publicId)));
    setSelected(new Set());
  }

  async function handleArchive() {
    const ids = [...selected];
    setActionOpen(false);
    for (const id of ids) {
      try { await archiveStaff(id); } catch { /* continue */ }
    }
    setEmployees(p => p.filter(e => !ids.includes(e.publicId)));
    setSelected(new Set());
  }

  function handleChangePwd() {
    const id = [...selected][0];
    const emp = employees.find(e => e.publicId === id);
    if (emp) { setChangePwd(emp); setActionOpen(false); }
  }

  async function handleRoleChange(publicId: string, role: StaffRole) {
    try {
      const updated = await updateStaff(publicId, { role });
      setEmployees(p => p.map(e => e.publicId === publicId ? updated : e));
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <img src="/logo.svg" alt="RestoPOS" className="h-7 shrink-0" />
        <span className="text-sm font-bold" style={{ color: "#121B35" }}>User/Employee</span>
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

      <div className="flex-1 p-3 sm:p-6">
        <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-100 flex-wrap">
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition shrink-0">
              <Plus className="w-3.5 h-3.5" />New
            </button>

            {selected.size > 0 && (
              <div className="relative" ref={actionRef}>
                <button onClick={() => setActionOpen(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition border border-gray-200">
                  <span className="w-4 h-4 rounded bg-[#714B67]/20 text-[#714B67] text-[10px] font-bold flex items-center justify-center">
                    {selected.size}
                  </span>
                  Action
                  <ChevronDown className="w-3 h-3" />
                </button>
                {actionOpen && (
                  <div className="absolute left-0 top-8 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 w-44 py-1">
                    <button onClick={handleDelete}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />Delete
                    </button>
                    <button onClick={handleArchive}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                      <Archive className="w-3.5 h-3.5" />Archive
                    </button>
                    <button onClick={handleChangePwd}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#714B67] hover:bg-[#714B67]/5 transition border-t border-gray-100">
                      <KeyRound className="w-3.5 h-3.5" />Change password
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="relative flex-1 min-w-[140px]">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or role…"
                className="w-full pl-3 pr-8 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] focus:bg-white transition placeholder:text-gray-300 text-[#121B35]" />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="accent-[#714B67] w-3.5 h-3.5 cursor-pointer" />
                  </th>
                  <th className="w-8" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading…
                  </td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-red-400">
                    <AlertCircle className="w-5 h-5 mx-auto mb-2" />{error}
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No employees found</td></tr>
                ) : (
                  filtered.map(emp => (
                    <tr key={emp.publicId}
                      className={`hover:bg-gray-50/70 transition ${selected.has(emp.publicId) ? "bg-[#714B67]/5" : ""}`}>
                      <td className="px-4 py-3.5">
                        <input type="checkbox" checked={selected.has(emp.publicId)}
                          onChange={() => toggleSelect(emp.publicId)}
                          className="accent-[#714B67] w-3.5 h-3.5 cursor-pointer" />
                      </td>
                      <td className="py-3.5 pl-1 pr-2">
                        <UserCircle2 className="w-5 h-5 text-gray-400" />
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium" style={{ color: "#121B35" }}>{emp.name}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{emp.email}</td>
                      <td className="px-4 py-3.5">
                        <TypeDropdown value={emp.role} onChange={v => handleRoleChange(emp.publicId, v)} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold
                          ${mapStatus(emp.status) === "Active"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                          {mapStatus(emp.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onSave={emp => setEmployees(p => [emp, ...p])}
        />
      )}
      {changePwd && (
        <ChangePasswordModal employee={changePwd} onClose={() => setChangePwd(null)} />
      )}
    </div>
  );
}
