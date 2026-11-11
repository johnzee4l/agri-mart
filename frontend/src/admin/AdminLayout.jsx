import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth.jsx";

/* Admin shell with role-aware navigation (blueprint 6.7).
   Staff sees Dashboard, Orders, Inventory and Chat. Admin sees everything. */
const items = [
  { to: "/admin", label: "Dashboard", end: true, roles: ["admin", "staff"] },
  { to: "/admin/orders", label: "Orders", roles: ["admin", "staff"] },
  { to: "/admin/inventory", label: "Inventory", roles: ["admin", "staff"] },
  { to: "/admin/chat", label: "Chat", roles: ["admin", "staff"] },
  { to: "/admin/products", label: "Products", roles: ["admin"] },
  { to: "/admin/announcements", label: "Announcements", roles: ["admin"] },
  { to: "/admin/content", label: "Site content", roles: ["admin"] },
  { to: "/admin/users", label: "Users", roles: ["admin"] },
  { to: "/admin/reports", label: "Reports", roles: ["admin"] },
];

export default function AdminLayout() {
  const { role, profile } = useAuth();
  const visible = items.filter((item) => item.roles.includes(role));

  return (
    <div data-density="compact" className="mx-auto w-full max-w-[var(--container-wide)] px-4 py-8 lg:px-10">
      <div className="mb-6">
        <p className="text-eyebrow font-bold text-primary-text uppercase">Admin</p>
        <h1 className="text-heading-md text-fg">{profile?.full_name ?? "Store console"}</h1>
        <p className="text-caption text-fg-muted">Role: {role}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Admin" className="flex flex-wrap gap-1 lg:flex-col">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-body-sm font-semibold transition-colors duration-[var(--duration-fast)] ${
                  isActive ? "bg-primary-subtle text-primary-text" : "text-fg-muted hover:bg-muted"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <section>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
