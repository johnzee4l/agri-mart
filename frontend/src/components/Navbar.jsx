import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { api } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.jsx";
import { uiIcons } from "@/styles/icons.js";
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
  const [health, setHealth] = useState("checking");

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
          <Link
            to="/cart"
            className="flex items-center gap-2 rounded-full px-3 py-2 text-label font-semibold text-fg-muted hover:bg-muted"
          >
            <CartIcon size={20} aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
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
