import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import { ROUTES } from "./paths";

// Auth
import Login  from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";

// Admin
import Dashboard            from "../pages/admin/Dashboard";
import Products             from "../pages/admin/Products";
import Categories           from "../pages/admin/Categories";
import Payments             from "../pages/admin/Payments";
import Coupons              from "../pages/admin/Coupons";
import Employees            from "../pages/admin/Employees";
import Reports              from "../pages/admin/Reports";
import FloorTableManagement from "../pages/admin/FloorTableManagement";

// Employee / Cashier
import POSSession from "../pages/employee/POSSession";
import POSOrder   from "../pages/employee/POSOrder";
import Orders     from "../pages/employee/Orders";
import TableView  from "../pages/employee/TableView";
import Customers  from "../pages/employee/Customers";

// Kitchen
import KDS from "../pages/kitchen/KDS";

// Self Ordering (unauthenticated — customer-facing kiosk)
import Splash            from "../pages/selfOrder/Splash";
import SelfOrderSettings from "../pages/selfOrder/Settings";
import QRGenerator       from "../pages/selfOrder/QRGenerator";
import ProductBrowse     from "../pages/selfOrder/ProductBrowse";
import SelfCart          from "../pages/selfOrder/Cart";
import OrderConfirmed    from "../pages/selfOrder/OrderConfirmed";
import TrackOrder        from "../pages/selfOrder/TrackOrder";

// Customer Display (unauthenticated — screen-facing)
import CustomerOrderView   from "../pages/customerDisplay/OrderView";
import CustomerPaymentView from "../pages/customerDisplay/PaymentView";
import CustomerCompletion  from "../pages/customerDisplay/Completion";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Public ───────────────────────────────────────────── */}
          <Route index element={<Navigate to={ROUTES.LOGIN} replace />} />
          <Route path={ROUTES.LOGIN} element={<Login />} />
          {/* /signup is for first-time ADMIN bootstrap only — not linked in UI */}
          <Route path="/signup" element={<Signup />} />

          {/* ── Admin only ───────────────────────────────────────── */}
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path={ROUTES.ADMIN_DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.PRODUCTS}        element={<Products />} />
            <Route path={ROUTES.CATEGORIES}      element={<Categories />} />
            <Route path={ROUTES.PAYMENTS}        element={<Payments />} />
            <Route path={ROUTES.COUPONS}         element={<Coupons />} />
            <Route path={ROUTES.EMPLOYEES}       element={<Employees />} />
            <Route path={ROUTES.REPORTS}         element={<Reports />} />
            <Route path={ROUTES.FLOOR_TABLES}    element={<FloorTableManagement />} />
            <Route path={ROUTES.QR_GENERATOR}        element={<QRGenerator />} />
            <Route path={ROUTES.SELF_ORDER_SETTINGS} element={<SelfOrderSettings />} />
          </Route>

          {/* ── Cashier (Admin can also access) ──────────────────── */}
          <Route element={<ProtectedRoute roles={["ADMIN", "CASHIER"]} />}>
            <Route path={ROUTES.POS_SESSION} element={<POSSession />} />
            <Route path={ROUTES.POS_ORDER}   element={<POSOrder />} />
            <Route path={ROUTES.ORDERS}      element={<Orders />} />
            <Route path={ROUTES.TABLE_VIEW}  element={<TableView />} />
            <Route path={ROUTES.CUSTOMERS}   element={<Customers />} />
          </Route>

          {/* ── Kitchen only ─────────────────────────────────────── */}
          <Route element={<ProtectedRoute roles={["KITCHEN"]} />}>
            <Route path={ROUTES.KDS} element={<KDS />} />
          </Route>

          {/* ── Self-ordering kiosk (unauthenticated) ────────────── */}
          <Route path={ROUTES.SPLASH}          element={<Splash />} />
          <Route path={ROUTES.PRODUCT_BROWSE}  element={<ProductBrowse />} />
          <Route path={ROUTES.CART}            element={<SelfCart />} />
          <Route path={ROUTES.ORDER_CONFIRMED} element={<OrderConfirmed />} />
          <Route path={ROUTES.TRACK_ORDER}     element={<TrackOrder />} />

          {/* ── Customer display screens (unauthenticated) ───────── */}
          <Route path={ROUTES.CUSTOMER_ORDER}    element={<CustomerOrderView />} />
          <Route path={ROUTES.CUSTOMER_PAYMENT}  element={<CustomerPaymentView />} />
          <Route path={ROUTES.CUSTOMER_COMPLETE} element={<CustomerCompletion />} />

          {/* ── Fallback ─────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
