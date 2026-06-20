import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login            from "../pages/auth/Login";
import Signup           from "../pages/auth/Signup";
import POSSession       from "../pages/employee/POSSession";
import POSOrder         from "../pages/employee/POSOrder";
import Orders           from "../pages/employee/Orders";
import TableView        from "../pages/employee/TableView";
import Customers        from "../pages/employee/Customers";
import Splash           from "../pages/selfOrder/Splash";
import SelfOrderSettings from "../pages/selfOrder/Settings";
import QRGenerator       from "../pages/selfOrder/QRGenerator";
import ProductBrowse     from "../pages/selfOrder/ProductBrowse";
import SelfCart          from "../pages/selfOrder/Cart";
import OrderConfirmed    from "../pages/selfOrder/OrderConfirmed";
import TrackOrder        from "../pages/selfOrder/TrackOrder";
import Products         from "../pages/admin/Products";
import Categories       from "../pages/admin/Categories";
import Payments         from "../pages/admin/Payments";
import Coupons          from "../pages/admin/Coupons";
import Employees        from "../pages/admin/Employees";
import FloorTableManagement from "../pages/admin/FloorTableManagement";
import KDS             from "../pages/kitchen/KDS";
import Reports         from "../pages/admin/Reports";
import CustomerOrderView    from "../pages/customerDisplay/OrderView";
import CustomerPaymentView  from "../pages/customerDisplay/PaymentView";
import CustomerCompletion   from "../pages/customerDisplay/Completion";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/"        element={<Login />} />
        <Route path="/signup"  element={<Signup />} />

        {/* Employee / POS */}
        <Route path="/employee/session" element={<POSSession />} />
        <Route path="/employee/order"   element={<POSOrder />} />
        <Route path="/employee/orders"  element={<Orders />} />
        <Route path="/employee/tables"    element={<TableView />} />
        <Route path="/employee/customers" element={<Customers />} />

        {/* Self Ordering */}
        <Route path="/self-order/splash"    element={<Splash />} />
        <Route path="/self-order/settings"  element={<SelfOrderSettings />} />
        <Route path="/self-order/qr"        element={<QRGenerator />} />
        <Route path="/self-order/products"  element={<ProductBrowse />} />
        <Route path="/self-order/cart"      element={<SelfCart />} />
        <Route path="/self-order/confirmed" element={<OrderConfirmed />} />
        <Route path="/self-order/track"     element={<TrackOrder />} />

        {/* Admin */}
        <Route path="/admin/products"       element={<Products />} />
        <Route path="/admin/categories"     element={<Categories />} />
        <Route path="/admin/payments"       element={<Payments />} />
        <Route path="/admin/coupons"        element={<Coupons />} />
        <Route path="/admin/employees"      element={<Employees />} />
        <Route path="/admin/floor-tables"   element={<FloorTableManagement />} />
        <Route path="/kitchen"              element={<KDS />} />
        <Route path="/admin/reports"        element={<Reports />} />

        {/* Customer Display */}
        <Route path="/customer-display/order"      element={<CustomerOrderView />} />
        <Route path="/customer-display/payment"    element={<CustomerPaymentView />} />
        <Route path="/customer-display/completion" element={<CustomerCompletion />} />
      </Routes>
    </BrowserRouter>
  );
}
