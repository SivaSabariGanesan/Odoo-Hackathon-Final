import { useState, useRef, useEffect } from "react";
import {
  Plus, Trash2, User, Menu, MonitorSmartphone, ShoppingCart,
  ArrowUpFromLine, LayoutGrid, Tag, CreditCard, Ticket,
  CalendarRange, Users, ChefHat, BarChart3, LogOut,
  GripVertical, Loader2, Check, RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ROUTES } from "../../routes/paths";
import { listCategories, createCategory, updateCategory, deleteCategory, type Category } from "../../api/products";

const COLOR_PALETTE = ["#4caf50", "#2196f3", "#ff9800", "#e91e63", "#9c27b0", "#00bcd4", "#714B67", "#f44336"];

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

type DraftCategory = Category & { _isNew?: boolean };

// ── Row ───────────────────────────────────────────────────────────
function CategoryRow({
  cat,
  onCreated,
  onUpdated,
  onDeleted,
  onDiscarded,
}: {
  cat: DraftCategory;
  onCreated: (tempId: string, saved: Category) => void;
  onUpdated: (saved: Category) => void;
  onDeleted: (publicId: string) => void;
  onDiscarded: (tempId: string) => void;
}) {
  const [name, setName]     = useState(cat.name);
  const [color, setColor]   = useState(cat.color || COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDirty = name !== cat.name || color !== cat.color;

  async function handleSave() {
    if (!name.trim()) {
      if (cat._isNew) onDiscarded(cat.publicId);
      return;
    }
    setSaving(true);
    try {
      if (cat._isNew) {
        const saved = await createCategory({ name: name.trim(), color });
        toast.success("Category created");
        onCreated(cat.publicId, saved);
      } else {
        const saved = await updateCategory(cat.publicId, { name: name.trim(), color });
        toast.success("Saved");
        onUpdated(saved);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (cat._isNew) { onDiscarded(cat.publicId); return; }
    if (!confirm(`Delete "${cat.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteCategory(cat.publicId);
      toast.success("Deleted");
      onDeleted(cat.publicId);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <tr className="group border-b border-gray-50 hover:bg-gray-50/60 transition">
      <td className="pl-3 pr-1 py-3 w-8">
        <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab" />
      </td>
      <td className="px-3 py-2.5">
        <input
          autoFocus={cat._isNew}
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => { if (isDirty || cat._isNew) handleSave(); }}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); handleSave(); }
            if (e.key === "Escape") onDiscarded(cat.publicId);
          }}
          className="w-full text-sm text-[#121B35] bg-transparent border-b border-transparent focus:border-[#714B67] outline-none transition placeholder:text-gray-300"
          placeholder="Category name…"
        />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_PALETTE.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="w-5 h-5 rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: c, outline: color === c ? "2px solid #714B67" : "none", outlineOffset: "2px" }}
            />
          ))}
        </div>
      </td>
      <td className="px-3 py-2.5 w-20">
        <div className="flex items-center justify-end gap-1">
          {(isDirty || cat._isNew) && (
            <button onClick={handleSave} disabled={saving}
              className="p-1.5 text-[#714B67] hover:bg-[#714B67]/10 rounded-lg transition disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={handleDelete} disabled={deleting}
            className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Categories() {
  const [categories, setCategories] = useState<DraftCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [navOpen, setNavOpen]       = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try { setCategories(await listCategories()); }
    catch { toast.error("Failed to load categories"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Add a local draft row — no API call until user types a name
  function handleAdd() {
    const draft: DraftCategory = {
      publicId: `draft-${Date.now()}`,
      name: "",
      color: COLOR_PALETTE[0],
      sortOrder: 0,
      isActive: true,
      _isNew: true,
    };
    setCategories(prev => [...prev, draft]);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
        <div className="flex items-center gap-1.5">
          <Link to={ROUTES.PRODUCTS} className="text-sm text-gray-400 hover:text-[#714B67] transition">Products</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-bold" style={{ color: "#121B35" }}>Category</span>
        </div>
        <div className="flex items-center gap-0.5 ml-auto">
          {[
            { icon: ShoppingCart, to: ROUTES.ORDERS, title: "Orders" },
            { icon: MonitorSmartphone, to: ROUTES.TABLE_VIEW, title: "Tables" },
            { icon: ArrowUpFromLine, to: ROUTES.POS_SESSION, title: "Close" },
          ].map(({ icon: Icon, to, title }) => (
            <Link key={title} to={to} title={title} className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
              <Icon className="w-4 h-4" />
            </Link>
          ))}
        </div>
        <Link to={ROUTES.CUSTOMERS} className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
          <User className="w-4 h-4" />
        </Link>
        <div className="relative" ref={navRef}>
          <button onClick={() => setNavOpen(!navOpen)} className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
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
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-100">
            <button onClick={handleAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition">
              <Plus className="w-3.5 h-3.5" />New
            </button>
            <button onClick={load} className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
              </div>
            ) : (
              <table className="w-full min-w-[380px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="w-8 pl-3" />
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Category Name</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Color</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <CategoryRow
                      key={cat.publicId}
                      cat={cat}
                      onCreated={(tempId, saved) =>
                        setCategories(prev => prev.map(c => c.publicId === tempId ? saved : c))
                      }
                      onUpdated={saved =>
                        setCategories(prev => prev.map(c => c.publicId === saved.publicId ? saved : c))
                      }
                      onDeleted={id => setCategories(prev => prev.filter(c => c.publicId !== id))}
                      onDiscarded={tempId => setCategories(prev => prev.filter(c => c.publicId !== tempId))}
                    />
                  ))}
                  <tr>
                    <td className="pl-3 pr-1 py-3 w-8"><GripVertical className="w-3.5 h-3.5 text-gray-200" /></td>
                    <td colSpan={3} className="px-3 py-2.5">
                      <button onClick={handleAdd} className="text-xs text-gray-300 hover:text-[#714B67] transition flex items-center gap-1">
                        <Plus className="w-3 h-3" />Add a line
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              {categories.filter(c => !c._isNew).length} categor{categories.filter(c => !c._isNew).length !== 1 ? "ies" : "y"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
