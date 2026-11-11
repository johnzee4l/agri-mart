import { Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import RequireRole from "./components/RequireRole.jsx";

import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Auth from "./pages/Auth.jsx";
import Account from "./pages/Account.jsx";
import Announcements from "./pages/Announcements.jsx";
import Contact from "./pages/Contact.jsx";

import AdminLayout from "./admin/AdminLayout.jsx";
import Dashboard from "./admin/Dashboard.jsx";
import AdminProducts from "./admin/Products.jsx";
import Orders from "./admin/Orders.jsx";
import Inventory from "./admin/Inventory.jsx";
import AdminAnnouncements from "./admin/Announcements.jsx";
import Content from "./admin/Content.jsx";
import Users from "./admin/Users.jsx";
import Reports from "./admin/Reports.jsx";
import Chat from "./admin/Chat.jsx";

/* Route skeleton + role guards (blueprint 7.1). Pages are filled in by phase. */
export default function App() {
  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar />

      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route path="/forgot" element={<Auth mode="forgot" />} />
          <Route path="/reset" element={<Auth mode="reset" />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/contact" element={<Contact />} />

          <Route
            path="/account"
            element={
              <RequireRole>
                <Account />
              </RequireRole>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireRole roles={["admin", "staff"]}>
                <AdminLayout />
              </RequireRole>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<Orders />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="content" element={<Content />} />
            <Route path="users" element={<Users />} />
            <Route path="reports" element={<Reports />} />
            <Route path="chat" element={<Chat />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}
