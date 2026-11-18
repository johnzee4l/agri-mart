import { NavLink, useLocation } from "react-router-dom";
import { House, ShoppingCartSimple, Storefront, UserCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";
import { useAuth } from "@/lib/auth.jsx";
import { useCart } from "@/lib/cart.jsx";

/* Mobile navigation (designtokens 11). A fixed bottom bar keeps the four everyday
   destinations one thumb-reach away on small screens. The admin console has its own
   shell, so the bar stays out of /admin. Every target is at least 44px tall and the
   bar clears the platform home indicator. */

const base =
  "relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-caption font-semibold transition-colors duration-[var(--duration-fast)] ease-standard";

function itemClass({ isActive }) {
  return cn(
    base,
    isActive
      ? "bg-primary-subtle text-primary-text"
      : "text-fg-muted hover:bg-muted hover:text-fg",
  );
}

export default function MobileNav() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const { count } = useCart();

  if (pathname.startsWith("/admin")) return null;

  const account = isAuthenticated
    ? { to: "/account", label: "Account" }
    : { to: "/login", label: "Log in" };

  return (
    <nav
      aria-label="Primary mobile"
      className="no-print fixed inset-x-0 bottom-0 z-[var(--z-header)] border-t border-muted bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex h-[var(--mobile-nav-height)] max-w-md items-stretch gap-1 px-2 py-1.5">
        <li className="flex flex-1">
          <NavLink to="/" end className={itemClass}>
            {({ isActive }) => (
              <>
                <House size={22} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
                <span>Home</span>
              </>
            )}
          </NavLink>
        </li>

        <li className="flex flex-1">
          <NavLink to="/products" className={itemClass}>
            {({ isActive }) => (
              <>
                <Storefront size={22} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
                <span>Shop</span>
              </>
            )}
          </NavLink>
        </li>

        <li className="flex flex-1">
          <NavLink
            to="/cart"
            className={itemClass}
            aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <ShoppingCartSimple
                    size={22}
                    weight={isActive ? "fill" : "regular"}
                    aria-hidden="true"
                  />
                  {count > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-2 inline-flex min-w-5 items-center justify-center rounded-full bg-highlight px-1 text-caption leading-4 font-semibold text-on-highlight tabular-nums"
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </span>
                <span>Cart</span>
              </>
            )}
          </NavLink>
        </li>

        <li className="flex flex-1">
          <NavLink to={account.to} className={itemClass}>
            {({ isActive }) => (
              <>
                <UserCircle size={22} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
                <span className="max-w-full truncate">{account.label}</span>
              </>
            )}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
