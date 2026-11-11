import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import RequireRole from "./components/RequireRole.jsx";
import { MorphLayout } from "./components/MorphMotion.jsx";
import { LoadingLines } from "./components/AsyncState.jsx";

/* Route-level code splitting (blueprint NFR: 3 s load on mobile, designtokens 3).
   Each page is its own chunk; the shell, tokens and UI wrappers stay in the entry. */
const Home = lazy(() => import("./pages/Home.jsx"));
const Products = lazy(() => import("./pages/Products.jsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const Auth = lazy(() => import("./pages/Auth.jsx"));
const Account = lazy(() => import("./pages/Account.jsx"));
const Announcements = lazy(() => import("./pages/Announcements.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const OrderResult = lazy(() => import("./pages/OrderResult.jsx"));

const AdminLayout = lazy(() => import("./admin/AdminLayout.jsx"));
const Dashboard = lazy(() => import("./admin/Dashboard.jsx"));
const AdminProducts = lazy(() => import("./admin/Products.jsx"));
const Orders = lazy(() => import("./admin/Orders.jsx"));
const Inventory = lazy(() => import("./admin/Inventory.jsx"));
const AdminAnnouncements = lazy(() => import("./admin/Announcements.jsx"));
const Content = lazy(() => import("./admin/Content.jsx"));
const Users = lazy(() => import("./admin/Users.jsx"));
const Reports = lazy(() => import("./admin/Reports.jsx"));
const Chat = lazy(() => import("./admin/Chat.jsx"));

function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-[var(--container-content)] px-4 py-16 lg:px-10">
      <LoadingLines rows={3} />
    </div>
  );
}

/* Route skeleton + role guards (blueprint 7.1). Storefront routes share one domMax
   provider so the product tile to detail morph stays continuous (DR-P2). */
export default function App() {
  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar />

      <main id="main">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<MorphLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route
                path="/checkout"
                element={
                  <RequireRole>
                    <Checkout />
                  </RequireRole>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <RequireRole>
                    <OrderResult />
                  </RequireRole>
                }
              />
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
            </Route>

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
        </Suspense>
      </main>
    </div>
  );
}
