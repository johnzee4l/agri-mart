import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import RequireRole from "./components/RequireRole.jsx";
/* domMax powers the tile-to-detail morph, so it belongs with the storefront routes
   rather than the entry chunk. */
const MorphLayout = lazy(() =>
  import("./components/MorphMotion.jsx").then((module) => ({ default: module.MorphLayout })),
);
import { LoadingLines } from "./components/AsyncState.jsx";
import OfflineBanner from "./components/OfflineBanner.jsx";
/* The install sheet pulls in the Base UI drawer, so it stays out of the entry chunk. */
const InstallSheet = lazy(() => import("./components/InstallSheet.jsx"));
import { useAuth } from "./lib/auth.jsx";
import { useOnline } from "./lib/useOnline.js";

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

/* Phase 4, D8. Member 3 owns components/ChatBox.jsx. The glob resolves to nothing
   until that file exists, so this mount point ships now and the widget appears on
   its own the moment it lands: no placeholder component, no broken build. */
const chatViews = import.meta.glob("./components/ChatBox.jsx");
const ChatBox = chatViews["./components/ChatBox.jsx"]
  ? lazy(chatViews["./components/ChatBox.jsx"])
  : null;

function CustomerChat() {
  const { isAuthenticated, role, loading } = useAuth();
  const online = useOnline();

  // Logged-in customers only, and never while offline (designtokens 15).
  if (!ChatBox || loading || !isAuthenticated || role !== "customer" || !online) return null;

  return (
    <Suspense fallback={null}>
      <ChatBox />
    </Suspense>
  );
}

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
              <Route
                path="products"
                element={
                  <RequireRole roles={["admin"]}>
                    <AdminProducts />
                  </RequireRole>
                }
              />
              <Route path="orders" element={<Orders />} />
              <Route path="inventory" element={<Inventory />} />
              <Route
                path="announcements"
                element={
                  <RequireRole roles={["admin"]}>
                    <AdminAnnouncements />
                  </RequireRole>
                }
              />
              <Route
                path="content"
                element={
                  <RequireRole roles={["admin"]}>
                    <Content />
                  </RequireRole>
                }
              />
              <Route
                path="users"
                element={
                  <RequireRole roles={["admin"]}>
                    <Users />
                  </RequireRole>
                }
              />
              <Route
                path="reports"
                element={
                  <RequireRole roles={["admin"]}>
                    <Reports />
                  </RequireRole>
                }
              />
              <Route path="chat" element={<Chat />} />
            </Route>
          </Routes>
        </Suspense>
      </main>

      <OfflineBanner />
      <Suspense fallback={null}>
        <InstallSheet />
      </Suspense>
      <CustomerChat />
    </div>
  );
}
