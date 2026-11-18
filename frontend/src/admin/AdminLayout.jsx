import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth.jsx";
import { onChatMessage } from "@/lib/socket.js";
import { uiIcons } from "@/styles/icons.js";
import Button from "@/components/ui/Button.jsx";

/* Admin shell (designtokens.md 12.3): a tinted window with radius 2xl, sidebar on the
   tint and the working area on paper. Staff sees Dashboard, Orders, Inventory and Chat. */
const items = [
  { to: "/admin", label: "Dashboard", end: true, roles: ["admin", "staff"], icon: uiIcons.reports },
  { to: "/admin/orders", label: "Orders", roles: ["admin", "staff"], icon: uiIcons.orders },
  { to: "/admin/inventory", label: "Inventory", roles: ["admin", "staff"], icon: uiIcons.inventory },
  { to: "/admin/chat", label: "Chat", roles: ["admin", "staff"], icon: uiIcons.chat },
  { to: "/admin/products", label: "Products", roles: ["admin"], icon: uiIcons.store },
  {
    to: "/admin/announcements",
    label: "Announcements",
    roles: ["admin"],
    icon: uiIcons.announcements,
  },
  { to: "/admin/content", label: "Site content", roles: ["admin"], icon: uiIcons.pickup },
  { to: "/admin/users", label: "Users", roles: ["admin"], icon: uiIcons.users },
  { to: "/admin/reports", label: "Reports", roles: ["admin"], icon: uiIcons.reports },
];

export default function AdminLayout() {
  const { role, profile, logout } = useAuth();
  const location = useLocation();
  const visible = items.filter((item) => item.roles.includes(role));

  /* A customer message must be visible from anywhere in the console, not only on the
     Chat page. The badge counts live arrivals and clears on opening the inbox. */
  const onChatPage = location.pathname.startsWith("/admin/chat");
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    if (onChatPage) setChatUnread(0);
  }, [onChatPage]);

  useEffect(() => {
    return onChatMessage((payload) => {
      const message = payload?.message;
      if (!message?.id || message.sender_id === profile?.id) return;
      if (onChatPage) return;
      setChatUnread((current) => current + 1);
    });
  }, [onChatPage, profile?.id]);
  const name = profile?.full_name ?? "Store console";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div data-density="compact" className="mx-auto w-full max-w-[var(--container-wide)] px-4 py-6 lg:px-6 print:p-0">
      <div className="rounded-2xl bg-tint p-2 lg:p-6 print:bg-white print:p-0">
        <div className="grid gap-4 lg:grid-cols-[15rem_1fr] lg:gap-6">
          <aside className="no-print flex flex-col gap-4 lg:gap-8">
            <div className="flex items-center gap-3 px-2 pt-2 lg:px-0">
              <span className="flex size-10 items-center justify-center rounded-full bg-surface font-display text-label font-semibold text-primary-text">
                {initials || "A"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-label font-semibold text-fg">{name}</p>
                <p className="text-caption text-fg-muted">Role: {role}</p>
              </div>
            </div>

            <nav
              aria-label="Admin"
              className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
            >
              {visible.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-body-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-standard ${
                        isActive
                          ? "bg-surface text-fg"
                          : "text-fg-muted hover:bg-surface/60 hover:text-fg"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={18}
                          weight={isActive ? "fill" : "regular"}
                          aria-hidden="true"
                        />
                        {item.label}
                        {item.label === "Chat" && chatUnread > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-highlight px-1.5 text-caption font-semibold text-on-highlight tabular-nums">
                            {chatUnread > 9 ? "9+" : chatUnread}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="hidden px-2 lg:mt-auto lg:block lg:px-0">
              <Button variant="ghost" size="sm" onClick={logout} className="w-full">
                Log out
              </Button>
            </div>
          </aside>

          <section className="min-w-0 rounded-xl bg-canvas p-4 lg:p-8 print:bg-white print:p-0">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}
