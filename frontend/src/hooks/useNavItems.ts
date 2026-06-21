import {
  LayoutGrid, Tag, CreditCard, Ticket, CalendarRange,
  Users, ChefHat, BarChart3, LogOut, QrCode, Settings2, type LucideIcon,
} from "lucide-react";
import { ROUTES } from "../routes/paths";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../api/auth";

interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
  roles?: AuthUser["role"][];  // undefined = all roles
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Products",           icon: LayoutGrid,    to: ROUTES.PRODUCTS,     roles: ["ADMIN"] },
  { label: "Category",           icon: Tag,           to: ROUTES.CATEGORIES,   roles: ["ADMIN"] },
  { label: "Payment Method",     icon: CreditCard,    to: ROUTES.PAYMENTS,     roles: ["ADMIN"] },
  { label: "Coupon & Promotion", icon: Ticket,        to: ROUTES.COUPONS,      roles: ["ADMIN"] },
  { label: "Booking",            icon: CalendarRange, to: ROUTES.FLOOR_TABLES, roles: ["ADMIN"] },
  { label: "User/Employee",      icon: Users,         to: ROUTES.EMPLOYEES,    roles: ["ADMIN"] },
  { label: "Reports",            icon: BarChart3,     to: ROUTES.REPORTS,               roles: ["ADMIN"] },
  { label: "Self Order",         icon: Settings2,     to: ROUTES.SELF_ORDER_SETTINGS,   roles: ["ADMIN"] },
  { label: "QR Codes",           icon: QrCode,        to: ROUTES.QR_GENERATOR,          roles: ["ADMIN"] },
  { label: "KDS",                icon: ChefHat,       to: ROUTES.KDS,                   roles: ["ADMIN", "KITCHEN"] },
  { label: "Log Out",            icon: LogOut,        to: ROUTES.LOGIN },
];

export function useNavItems(): NavItem[] {
  const { user } = useAuth();
  const role = user?.role;
  return ALL_NAV_ITEMS.filter(item =>
    !item.roles || (role && item.roles.includes(role))
  );
}
