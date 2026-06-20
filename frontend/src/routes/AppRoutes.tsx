import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";

// import POSSession from "../pages/employee/POSSession";
// import POSOrder from "../pages/employee/POSOrder";
// import TableView from "../pages/employee/TableView";
// import Orders from "../pages/employee/Orders";
// import Customers from "../pages/employee/Customers";

// import AdminDashboard from "../pages/admin/Dashboard";
// import Products from "../pages/admin/Products";
// import Categories from "../pages/admin/Categories";
// import Payments from "../pages/admin/Payments";
// import Coupons from "../pages/admin/Coupons";
// import Employees from "../pages/admin/Employees";
// import Reports from "../pages/admin/Reports";
// import FloorTableManagement from "../pages/admin/FloorTableManagement";

// import UserDashboard from "../pages/user/Dashboard";

// import KDS from "../pages/kitchen/KDS";

// import OrderView from "../pages/customerDisplay/OrderView";
// import PaymentView from "../pages/customerDisplay/PaymentView";
// import Completion from "../pages/customerDisplay/Completion";

// import Settings from "../pages/selfOrder/Settings";
// import QRGenerator from "../pages/selfOrder/QRGenerator";
// import Splash from "../pages/selfOrder/Splash";
// import ProductBrowse from "../pages/selfOrder/ProductBrowse";
// import Cart from "../pages/selfOrder/Cart";
// import OrderConfirmed from "../pages/selfOrder/OrderConfirmed";
// import TrackOrder from "../pages/selfOrder/TrackOrder";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* <Route path="/employee/session" element={<POSSession />} />
        <Route path="/employee/order" element={<POSOrder />} />
        <Route path="/employee/tables" element={<TableView />} />
        <Route path="/employee/orders" element={<Orders />} />
        <Route path="/employee/customers" element={<Customers />} />

        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<Products />} />
        <Route path="/admin/categories" element={<Categories />} />
        <Route path="/admin/payments" element={<Payments />} />
        <Route path="/admin/coupons" element={<Coupons />} />
        <Route path="/admin/employees" element={<Employees />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/floor-tables" element={<FloorTableManagement />} />

        <Route path="/user/dashboard" element={<UserDashboard />} />

        <Route path="/kitchen" element={<KDS />} />

        <Route path="/customer-display/order" element={<OrderView />} />
        <Route path="/customer-display/payment" element={<PaymentView />} />
        <Route path="/customer-display/completion" element={<Completion />} />

        <Route path="/self-order/settings" element={<Settings />} />
        <Route path="/self-order/qr" element={<QRGenerator />} />
        <Route path="/self-order/splash" element={<Splash />} />
        <Route path="/self-order/products" element={<ProductBrowse />} />
        <Route path="/self-order/cart" element={<Cart />} />
        <Route path="/self-order/confirmed" element={<OrderConfirmed />} />
        <Route path="/self-order/track" element={<TrackOrder />} /> */} 

      </Routes>
    </BrowserRouter>
  );
}