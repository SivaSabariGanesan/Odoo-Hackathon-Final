import { useState, useRef, useEffect } from "react";
import {
  Search, UserPlus, MoreVertical, Mail, Phone,
  X, User, Trash2, Check,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const MOCK: Customer[] = [
  { id: "1", name: "Eric",   email: "eric@odoo.com",  phone: "+91 9898989898" },
  { id: "2", name: "Alex",   email: "alex@odoo.com",  phone: "+91 9898989898" },
  { id: "3", name: "Sara",   email: "sara@odoo.com",  phone: "+91 9898989898" },
  { id: "4", name: "Dowel",  email: "dowel@odoo.com", phone: "+91 9898989898" },
  { id: "5", name: "Sanjay", email: "sanjay@odoo.com",phone: "+91 9898989898" },
  { id: "6", name: "Priya",  email: "priya@odoo.com", phone: "+91 9898989898" },
  { id: "7", name: "Raj",    email: "raj@odoo.com",   phone: "+91 9898989898" },
];

// ── Edit / Create Modal ──────────────────────────────────────────
function CustomerModal({
  customer,
  onClose,
  onSave,
  onDelete,
}: {
  customer: Customer | null; // null = create new
  onClose: () => void;
  onSave: (c: Customer) => void;
  onDelete?: (id: string) => void;
}) {
  const [name,  setName]  = useState(customer?.name  ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id:    customer?.id ?? crypto.randomUUID(),
      name:  name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>
            {customer ? "Edit Customer" : "New Customer"}
          </h3>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-3">
          {/* Name */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g Eric Smith"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300"
            />
          </div>
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="eric@odoo.com"
              type="email"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300"
            />
          </div>
          {/* Phone */}
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 9898989898"
              type="tel"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <button
              onClick={onClose}
              className="py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">
              Discard
            </button>
            <button
              onClick={handleSave}
              className="py-3 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
          {customer && onDelete && (
            <button
              onClick={() => { onDelete(customer.id); onClose(); }}
              className="w-full py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" />
              DELETE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Row 3-dot menu ───────────────────────────────────────────────
function RowMenu({ onEdit }: { onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-xl z-20 w-28 py-1">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#121B35] transition">
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Customers Page ──────────────────────────────────────────
export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(MOCK);
  const [search, setSearch]       = useState("");
  const [editing, setEditing]     = useState<Customer | null | "new">(null);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  function handleSave(c: Customer) {
    setCustomers(prev => {
      const exists = prev.find(x => x.id === c.id);
      return exists ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev];
    });
  }

  function handleDelete(id: string) {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-lg">

        {/* Page heading */}
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-[#714B67]/10 p-2 rounded-lg">
            <User className="w-4 h-4 text-[#714B67]" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: "#121B35" }}>Customer</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            {/* Add button */}
            <button
              onClick={() => setEditing("new")}
              className="p-2 text-[#714B67] bg-[#714B67]/10 hover:bg-[#714B67]/20 rounded-xl transition shrink-0">
              <UserPlus className="w-4 h-4" />
            </button>

            {/* Search */}
            <div className="relative flex-1">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Alex"
                className="w-full pl-3 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] focus:bg-white transition placeholder:text-gray-300 text-[#121B35]"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No customers found</div>
            ) : (
              filtered.map(c => (
                <div key={c.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/70 transition">

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[#714B67]/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-[#714B67]">{c.name[0]}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#121B35] truncate">{c.name}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
                        <Mail className="w-3 h-3 shrink-0" />{c.email}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone className="w-3 h-3 shrink-0" />{c.phone}
                      </span>
                    </div>
                  </div>

                  {/* 3-dot menu */}
                  <RowMenu onEdit={() => setEditing(c)} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {editing !== null && (
        <CustomerModal
          customer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={editing !== "new" ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
