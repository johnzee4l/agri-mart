import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, MotionConfig, m } from "motion/react";
import {
  CaretRight,
  MagnifyingGlass,
  Plant,
  ShoppingCartSimple,
  X,
} from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.jsx";
import { useCart } from "@/lib/cart.jsx";
import { useApi } from "@/lib/useApi.js";
import { asList, formatPHP } from "@/lib/format.js";
import { cn } from "@/lib/cn.js";
import { duration, ease } from "@/styles/tokens/motion.js";

/* Storefront menu. Staff see only the console link, since these pages are the
   customers' side. */
const links = [
  { to: "/", label: "Home", end: true },
  { to: "/products", label: "Products" },
  { to: "/announcements", label: "Announcements" },
  { to: "/contact", label: "Contact" },
];

const navItem = ({ isActive }) =>
  cn(
    "flex min-h-10 items-center rounded-md px-3 text-label font-semibold transition-colors duration-[var(--duration-fast)] ease-standard",
    isActive ? "bg-muted text-fg" : "text-fg-muted hover:bg-muted hover:text-fg",
  );

/* Morphing sidebar. The floating logo disc grows into the whole navigation: a real
   search, the route links, cart and account. It closes on route change, scrim click
   or Escape, and the disc keeps the API status dot. */
export default function Navbar() {
  const { profile, role, logout, isAuthenticated } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [health, setHealth] = useState("checking");
  const searchRef = useRef(null);

  const results = useApi(
    debounced.length >= 2 ? `/products?q=${encodeURIComponent(debounced)}&limit=5` : null,
  );
  const matches = asList(results.data);

  useEffect(() => {
    setOpen(false);
    setTerm("");
    setDebounced("");
  }, [location.pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    let active = true;
    api
      .get("/health")
      .then((data) => active && setHealth(data?.status === "ok" ? "online" : "offline"))
      .catch(() => active && setHealth("offline"));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 120);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  const submitSearch = (event) => {
    event.preventDefault();
    const value = term.trim();
    if (!value) return;
    navigate(`/products?q=${encodeURIComponent(value)}`);
    setTerm("");
    setDebounced("");
    setOpen(false);
  };

  const canUseAdmin = role === "admin" || role === "staff";
  /* Staff accounts can be created without a full name, and an empty string still passes
     the null check: trim first so the account chip never renders blank. */
  const fullName = profile?.full_name?.trim();
  const firstName = fullName ? fullName.split(/\s+/)[0] : "Account";

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open ? (
          <m.div
            key="scrim"
            aria-hidden="true"
            className="fixed inset-0 z-[var(--z-overlay)] bg-tile-inverse/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.fast, ease: ease.standard }}
            onClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      {/* The disc and the panel share one layoutId, so Motion morphs between their
          measured boxes (transform only, no reflow) every time, on a fresh load too. */}
      <AnimatePresence initial={false}>
          {open ? (
            <m.nav
              key="panel"
              aria-label="Navigation"
              className="no-print fixed top-4 left-4 z-[var(--z-sheet)] w-[min(22rem,calc(100vw-2rem))] origin-top-left overflow-hidden rounded-2xl bg-surface p-4"
              initial={{ scale: 0.16, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 40, mass: 0.85 }}
            >
            <m.div
              className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.fast, ease: ease.standard, delay: 0.09 }}
            >
              <div className="flex items-center justify-between gap-3">
                <Link
                  to={canUseAdmin ? "/admin" : "/"}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-tint">
                    <Plant size={20} weight="fill" className="text-primary-text" aria-hidden="true" />
                  </span>
                  <span className="font-display text-heading-sm text-fg">AgriMart</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex size-9 items-center justify-center rounded-full text-fg-muted transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-fg"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              {/* Catalog search is a customer tool; its results open a product page that
                  staff cannot reach, so it stays off for them. */}
              {canUseAdmin ? null : (
              <div>
                <label htmlFor="nav-search" className="sr-only">
                  Search products
                </label>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3">
                  <MagnifyingGlass size={18} className="shrink-0 text-fg-muted" aria-hidden="true" />
                  <form onSubmit={submitSearch} className="min-w-0 flex-1">
                    <input
                      id="nav-search"
                      ref={searchRef}
                      type="search"
                      value={term}
                      onChange={(event) => setTerm(event.target.value)}
                      placeholder="Search seeds, feed, tools..."
                      className="h-10 w-full bg-transparent text-body-sm text-fg placeholder:text-fg-subtle focus:outline-none"
                    />
                  </form>
                </div>

                {term.trim().length > 0 ? (
                  <div aria-live="polite" className="mt-2 rounded-lg bg-muted/60 p-1.5">
                    {debounced.length < 2 ? (
                      <p className="px-2 py-1.5 text-caption text-fg-muted">
                        Keep typing to see matches.
                      </p>
                    ) : results.loading && matches.length === 0 ? (
                      <p className="px-2 py-1.5 text-caption text-fg-muted">
                        Searching for “{debounced}”...
                      </p>
                    ) : matches.length === 0 ? (
                      <p className="px-2 py-1.5 text-caption text-fg-muted">
                        No products match “{debounced}”.
                      </p>
                    ) : (
                      <ul>
                        {matches.map((product) => (
                          <li key={product.id}>
                            <Link
                              to={`/products/${product.id}`}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-[var(--duration-fast)] hover:bg-muted"
                            >
                              <span className="size-8 shrink-0 overflow-hidden rounded-sm bg-muted">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-body-sm text-fg">
                                {product.name}
                              </span>
                              <span className="shrink-0 text-caption font-semibold text-fg tabular-nums">
                                {formatPHP(product.price)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      type="button"
                      onClick={submitSearch}
                      className="mt-1 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-label font-semibold text-primary-text transition-colors duration-[var(--duration-fast)] hover:bg-muted"
                    >
                      <span className="truncate">
                        {debounced ? `View all results for “${debounced}”` : "View all results"}
                      </span>
                      <CaretRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
              )}

              <nav aria-label="Main">
                <ul className="flex flex-col gap-0.5">
                  {/* Announcements and Contact are storefront pages, so staff see only
                      the console link. */}
                  {canUseAdmin ? null : links.map((link) => (
                    <li key={link.to}>
                      <NavLink
                        to={link.to}
                        end={link.end}
                        onClick={() => setOpen(false)}
                        className={navItem}
                      >
                        {link.label}
                      </NavLink>
                    </li>
                  ))}
                  {canUseAdmin ? (
                    <li>
                      <NavLink to="/admin" onClick={() => setOpen(false)} className={navItem}>
                        Admin
                      </NavLink>
                    </li>
                  ) : null}
                </ul>
              </nav>

              <div className="flex flex-col gap-2">
                {/* The cart belongs to the customer storefront; staff and admins work in
                    the console, so it is not shown on their account. */}
                {isAuthenticated && !canUseAdmin ? (
                  <Link
                    to="/cart"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-tile-inverse px-4 text-label font-semibold text-on-inverse"
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingCartSimple size={20} aria-hidden="true" />
                      Cart
                    </span>
                    <span className="rounded-full bg-highlight px-2 py-0.5 text-caption font-semibold text-on-highlight tabular-nums">
                      {count}
                    </span>
                  </Link>
                ) : null}

                {profile ? (
                  <>
                    <Link
                      to={canUseAdmin ? "/admin" : "/account"}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-muted px-4 text-label font-semibold text-fg"
                    >
                      <span className="truncate">{firstName}</span>
                      <CaretRight size={16} aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex min-h-11 items-center rounded-lg px-4 text-label font-semibold text-fg-muted transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-fg"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-label font-semibold text-on-primary hover:bg-primary-hover"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center justify-center rounded-full px-4 text-label font-semibold text-fg hover:bg-muted"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </m.div>
            </m.nav>
          ) : (
            <m.button
              key="trigger"
              type="button"
              aria-label="Open navigation"
              aria-expanded={false}
              onClick={() => setOpen(true)}
              className="no-print fixed top-4 left-4 z-[var(--z-sheet)] flex size-14 origin-top-left items-center justify-center rounded-full bg-surface text-primary-text"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: duration.instant, ease: ease.standard }}
            >
              <Plant size={24} weight="fill" aria-hidden="true" />
              <span
                role="status"
                aria-label={`API ${health}`}
                className={cn(
                  "absolute right-3 bottom-3 size-2 rounded-full",
                  health === "online" ? "bg-primary" : "bg-danger-fill",
                )}
              />
            </m.button>
          )}
      </AnimatePresence>

      <div className="no-print h-16" aria-hidden="true" />
    </MotionConfig>
  );
}