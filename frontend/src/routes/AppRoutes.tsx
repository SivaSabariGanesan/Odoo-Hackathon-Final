import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";

import Login               from "../pages/auth/Login";
import Signup              from "../pages/auth/Signup";
import POSSession          from "../pages/employee/POSSession";
import POSOrder            from "../pages/employee/POSOrder";
import Orders              from "../pages/employee/Orders";
import TableView           from "../pages/employee/TableView";
import Customers           from "../pages/employee/Customers";
import Splash              from "../pages/selfOrder/Splash";
import SelfOrderSettings   from "../pages/selfOrder/Settings";
import Products            from "../pages/admin/Products";
import Categories          from "../pages/admin/Categories";
import Payments            from "../pages/admin/Payments";
import Coupons             from "../pages/admin/Coupons";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth */}
          <Route path="/"        element={<Login />} />
          <Route path="/signup"  element={<Signup />} />

          {/* Employee / POS */}
          <Route path="/employee/session"   element={<POSSession />} />
          <Route path="/employee/order"     element={<POSOrder />} />
          <Route path="/employee/orders"    element={<Orders />} />
          <Route path="/employee/tables"    element={<TableView />} />
          <Route path="/employee/customers" element={<Customers />} />

          {/* Self Ordering */}
          <Route path="/self-order/splash"   element={<Splash />} />
          <Route path="/self-order/settings" element={<SelfOrderSettings />} />

          {/* Admin */}
          <Route path="/admin/products"    element={<Products />} />
          <Route path="/admin/categories"  element={<Categories />} />
          <Route path="/admin/payments"    element={<Payments />} />
          <Route path="/admin/coupons"     element={<Coupons />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
