import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { m } from "motion/react";
import { List, X } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.jsx";
import { useCart } from "@/lib/cart.jsx";
import { uiIcons } from "@/styles/icons.js";
import { duration, ease, spring } from "@/styles/tokens/motion.js";
import Button from "./ui/Button.jsx";

const links = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/announcements", label: "Announcements" },
  { to: "/contact", label: "Contact" },
];

const CartIcon = uiIcons.cart;
const SuccessIcon = uiIcons.success;
const ErrorIcon = uiIcons.error;

export default function Navbar() {
  const { profile, role, logout } = useAuth();
  const { count } = useCart();
  const [health, setHealth] = useState("checking");
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // The primary links are hidden below md, so the disclosure menu carries them there.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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

  const canUseAdmin = role === "admin" || role === "staff";

  return (
    <header className="sticky top-0 z-[var(--z-header)] bg-canvas">
      <div className="mx-auto flex w-full max-w-[var(--container-wide)] items-center gap-6 px-4 py-3 lg:px-10">
        <Link to="/" className="font-display text-heading-sm font-semibold text-fg">
          AgriMart
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-label font-semibold transition-colors duration-[var(--duration-fast)] ${
                  isActive ? "bg-primary-subtle text-primary-text" : "text-fg-muted hover:bg-muted"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-[var(--control-sm)] items-center justify-center rounded-full text-fg-muted hover:bg-muted md:hidden"
          >
            {menuOpen ? (
              <X size={22} aria-hidden="true" />
            ) : (
              <List size={22} aria-hidden="true" />
            )}
          </button>

          <Link
            to="/cart"
            className="relative flex items-center gap-2 rounded-full px-3 py-2 text-label font-semibold text-fg-muted hover:bg-muted"
          >
            <CartIcon size={20} aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 ? (
              <m.span
                key={count}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.18, 1] }}
                transition={spring.snappy}
                aria-label={`${count} items in cart`}
                className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-caption font-semibold text-on-primary tabular-nums"
              >
                {count}
              </m.span>
            ) : null}
          </Link>

          {canUseAdmin ? (
            <Link
              to="/admin"
              className="rounded-full px-3.5 py-2 text-label font-semibold text-fg-muted hover:bg-muted"
            >
              Admin
            </Link>
          ) : null}

          {profile ? (
            <div className="flex items-center gap-2">
              <Link
                to="/account"
                className="rounded-full px-3 py-2 text-label font-semibold text-fg-muted hover:bg-muted"
              >
                {profile.full_name?.split(" ")[0] ?? "Account"}
              </Link>
              <Button size="sm" variant="secondary" onClick={logout}>
                Log out
              </Button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex h-[var(--control-sm)] items-center rounded-full bg-primary px-4 text-label font-semibold text-on-primary hover:bg-primary-hover"
            >
              Log in
            </Link>
          )}
        </div>
      </div>

      {menuOpen ? (
          <m.nav
            id="mobile-nav"
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: duration.base, ease: ease.standard }}
            className="overflow-hidden bg-canvas md:hidden"
          >
            <ul className="mx-auto flex w-full max-w-[var(--container-wide)] flex-col gap-1 px-4 pb-3">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2.5 text-label font-semibold ${
                        isActive ? "bg-primary-subtle text-primary-text" : "text-fg-muted"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </m.nav>
        ) : null}

      <p className="mx-auto flex w-full max-w-[var(--container-wide)] items-center gap-1.5 px-4 pb-2 text-caption text-fg-muted lg:px-10">
        {health === "online" ? (
          <SuccessIcon size={16} aria-hidden="true" className="text-primary-text" />
        ) : (
          <ErrorIcon size={16} aria-hidden="true" className="text-danger-text" />
        )}
        API {health}
      </p>
    </header>
  );
}
