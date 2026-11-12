import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.jsx";
import { useApi } from "@/lib/useApi.js";
import { asList, formatDate } from "@/lib/format.js";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import Dialog from "../components/ui/Dialog.jsx";
import Input from "../components/ui/Input.jsx";
import { AdminTable, Cell, Pagination, Row } from "./AdminTable.jsx";

/* FR-16 (blueprint 6.6 and 6.7). Admin only: the route guard in App.jsx keeps staff out
   of the page, and GET /users answers 403 for anyone who is not an admin. Role changes
   and deactivation are confirmed first, because deactivating an account takes effect on
   that person's very next request. */

const PAGE_LIMIT = 20;

const SELECT_CLASS =
  "h-[var(--control-md)] rounded-md bg-surface px-3.5 text-base text-fg ring-1 ring-inset ring-field-edge";

const ROLES = [
  { value: "customer", label: "Customer" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

function roleLabel(role) {
  return ROLES.find((entry) => entry.value === role)?.label ?? role;
}

export default function Users() {
  const { profile } = useAuth();

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ q: "", role: "", is_active: "" });
  const [searchInput, setSearchInput] = useState("");

  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.role) query.set("role", filters.role);
  if (filters.is_active) query.set("is_active", filters.is_active);
  query.set("page", String(page));
  query.set("limit", String(PAGE_LIMIT));

  const users = useApi(`/users?${query.toString()}`);
  const rows = asList(users.data);
  const total = users.data?.total ?? rows.length;

  async function apply(patch, successMessage) {
    setBusy(true);
    setActionError(null);

    try {
      await api.patch(`/users/${patch.user.id}`, patch.body);
      users.reload();
      setConfirm(null);
      setNotice(successMessage);
    } catch (error) {
      setActionError(error.message ?? "That change did not go through.");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-heading-sm text-fg">Users</h2>
          <p className="text-body-sm text-fg-muted">
            {total} account{total === 1 ? "" : "s"}
            {filters.role ? ` with the ${roleLabel(filters.role).toLowerCase()} role` : ""}
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setFilters((current) => ({ ...current, q: searchInput.trim() }));
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="w-[16rem]">
          <Input
            label="Search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Name or phone"
            autoComplete="off"
          />
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg">Role</span>
          <select
            value={filters.role}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, role: event.target.value }));
            }}
            className={SELECT_CLASS}
          >
            <option value="">All roles</option>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg">Status</span>
          <select
            value={filters.is_active}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, is_active: event.target.value }));
            }}
            className={SELECT_CLASS}
          >
            <option value="">Everyone</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
        </label>

        <Button type="submit" variant="secondary">
          <MagnifyingGlass size={18} aria-hidden="true" />
          Search
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSearchInput("");
            setFilters({ q: "", role: "", is_active: "" });
            setPage(1);
          }}
        >
          Clear filters
        </Button>
      </form>

      {notice ? (
        <p role="status" className="rounded-md bg-primary-subtle p-3 text-body-sm text-primary-text">
          {notice}
        </p>
      ) : null}

      {actionError ? (
        <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
          {actionError}
        </p>
      ) : null}

      {users.error ? <ErrorNotice error={users.error} onRetry={users.reload} /> : null}
      {users.loading && rows.length === 0 ? <LoadingLines rows={5} /> : null}

      {!users.loading && !users.error && rows.length === 0 ? (
        <EmptyState
          title="No accounts match"
          body="Change the search, role or status filter to find the account you are after."
        />
      ) : null}

      {rows.length > 0 ? (
        <AdminTable
          columns={[
            { label: "Account" },
            { label: "Phone" },
            { label: "Role" },
            { label: "Status" },
            { label: "Joined" },
            { label: "Actions", align: "right" },
          ]}
        >
          {rows.map((row, index) => {
            const isSelf = row.id === profile?.id;

            return (
              <Row key={row.id} index={index}>
                <Cell>
                  <span className="flex flex-col">
                    <span className="font-semibold text-fg">
                      {row.full_name || "Unnamed account"}
                      {isSelf ? (
                        <span className="ml-2 text-caption font-semibold text-primary-text">You</span>
                      ) : null}
                    </span>
                    <span className="text-caption text-fg-muted">{row.email ?? "—"}</span>
                  </span>
                </Cell>

                <Cell className="text-fg-muted tabular-nums">{row.phone ?? "—"}</Cell>

                <Cell>
                  <select
                    aria-label={`Role for ${row.full_name || row.email || "this account"}`}
                    value={row.role}
                    disabled={isSelf || busy}
                    onChange={(event) =>
                      setConfirm({
                        kind: "role",
                        user: row,
                        body: { role: event.target.value },
                        next: event.target.value,
                      })
                    }
                    className={SELECT_CLASS}
                    title={isSelf ? "You cannot change your own role." : undefined}
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </Cell>

                <Cell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-caption font-semibold ${
                      row.is_active ? "bg-primary-subtle text-primary-text" : "bg-danger-subtle text-danger-text"
                    }`}
                  >
                    {row.is_active ? "Active" : "Deactivated"}
                  </span>
                </Cell>

                <Cell className="text-fg-muted">{formatDate(row.created_at)}</Cell>

                <Cell align="right">
                  {row.is_active ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSelf || busy}
                      title={isSelf ? "You cannot deactivate yourself." : undefined}
                      onClick={() =>
                        setConfirm({
                          kind: "deactivate",
                          user: row,
                          body: { is_active: false },
                        })
                      }
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        apply(
                          { user: row, body: { is_active: true } },
                          `${row.full_name || row.email} can sign in again.`,
                        )
                      }
                    >
                      Activate
                    </Button>
                  )}
                </Cell>
              </Row>
            );
          })}
        </AdminTable>
      ) : null}

      <Pagination page={page} total={total} limit={PAGE_LIMIT} onPage={setPage} />

      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === "role" ? "Change this role?" : "Deactivate this account?"}
      >
        {confirm ? (
          <div className="flex flex-col gap-4">
            <p className="text-body-sm text-fg-muted">
              {confirm.kind === "role"
                ? `A ${roleLabel(confirm.next).toLowerCase()} sees a different set of pages and API routes straight away.`
                : "The next request from this account answers 403, so the person is signed out of the store console and checkout."}
            </p>
            <p className="text-body-sm font-semibold text-fg">
              {confirm.user.full_name || confirm.user.email}{" "}
              <span className="font-normal text-fg-muted">({confirm.user.email})</span>
            </p>

            <div className="flex items-center gap-3">
              <Button
                variant={confirm.kind === "role" ? "primary" : "danger"}
                loading={busy}
                onClick={() =>
                  apply(
                    { user: confirm.user, body: confirm.body },
                    confirm.kind === "role"
                      ? `${confirm.user.full_name || confirm.user.email} is now ${roleLabel(confirm.next).toLowerCase()}.`
                      : `${confirm.user.full_name || confirm.user.email} is deactivated.`,
                  )
                }
              >
                {confirm.kind === "role" ? "Change role" : "Deactivate"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
