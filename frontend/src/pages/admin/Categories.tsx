import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Trash2, User, Menu, MonitorSmartphone,
  ShoppingCart, ArrowUpFromLine, LayoutGrid, Tag,
  CreditCard, Ticket, CalendarRange, Users, ChefHat,
  BarChart3, LogOut, GripVertical,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category as ApiCategory,
} from "../../api/categories";

// Local shape used by the UI (publicId is the stable ID from the API)
interface Category { id: string; name: string; color: string }

const COLOR_PALETTE = ["#4caf50","#2196f3","#ff9800","#e91e63","#9c27b0","#00bcd4","#714B67","#f44336"];

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

// ── Inline editable row ──────────────────────────────────────────
function CategoryRow({
  cat,
  onChange,
  onDelete,
}: {
  cat: Category;
  onChange: (id: string, field: "name" | "color", val: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  return (
    <tr className="group border-b border-gray-50 hover:bg-gray-50/60 transition">
      {/* Drag handle */}
      <td className="pl-3 pr-1 py-3 w-8">
        <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 cursor-grab" />
      </td>

      {/* Name — inline edit */}
      <td className="px-3 py-2.5">
        <input
          value={cat.name}
          onChange={e => onChange(cat.id, "name", e.target.value)}
          className="w-full text-sm text-[#121B35] bg-transparent border-b border-transparent focus:border-[#714B67] outline-none transition placeholder:text-gray-300"
          placeholder="Category name…"
        />
      </td>

      {/* Color swatches */}
      <td className="px-3 py-2.5">
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_PALETTE.map(c => (
            <button
              key={c}
              onClick={() => onChange(cat.id, "color", c)}
              className="w-5 h-5 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: cat.color === c ? `2px solid #714B67` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      </td>

      {/* Delete */}
      <td className="pr-3 py-2.5 w-10 text-right">
        <button onClick={() => onDelete(cat.id)}
          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [navOpen, setNavOpen]       = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Load categories from API on mount
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data.map((c: ApiCategory) => ({ id: c.publicId, name: c.name, color: c.color })));
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function addNew() {
    try {
      const created = await createCategory({ name: "", color: COLOR_PALETTE[0] });
      setCategories(prev => [...prev, { id: created.publicId, name: created.name, color: created.color }]);
    } catch (err) {
      console.error("Failed to create category", err);
    }
  }

  async function handleChange(id: string, field: "name" | "color", val: string) {
    // Optimistic update
    setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
    try {
      await updateCategory(id, { [field]: val });
    } catch (err) {
      console.error("Failed to update category", err);
      loadCategories(); // revert on failure
    }
  }

  async function handleDelete(id: string) {
    setCategories(prev => prev.filter(c => c.id !== id)); // optimistic
    try {
      await deleteCategory(id);
    } catch (err: any) {
      console.error("Failed to delete category", err);
      const msg = err?.response?.data?.error?.message ?? "Cannot delete category";
      alert(msg);
      loadCategories(); // revert
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
        <div className="flex items-center gap-1.5">
          <Link to={ROUTES.PRODUCTS} className="text-sm text-gray-400 hover:text-[#714B67] transition">Products</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-bold" style={{ color: "#121B35" }}>Category</span>
        </div>
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
        <Link to={ROUTES.CUSTOMERS} className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
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

      {/* ── CONTENT ── */}
      <div className="flex-1 p-3 sm:p-6">
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-100">
            <button onClick={addNew}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition">
              <Plus className="w-3.5 h-3.5" />New
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-8 pl-3" />
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Product Category
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-sm">Loading…</td></tr>
                ) : (
                  <>
                    {categories.map(cat => (
                      <CategoryRow key={cat.id} cat={cat} onChange={handleChange} onDelete={handleDelete} />
                    ))}
                    {/* Empty new row hint */}
                    <tr className="border-b border-gray-50">
                      <td className="pl-3 pr-1 py-3 w-8">
                        <GripVertical className="w-3.5 h-3.5 text-gray-200" />
                      </td>
                      <td colSpan={3} className="px-3 py-2.5">
                        <button onClick={addNew}
                          className="text-xs text-gray-300 hover:text-[#714B67] transition flex items-center gap-1">
                          <Plus className="w-3 h-3" />Add a line
                        </button>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">{categories.length} categor{categories.length !== 1 ? "ies" : "y"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
