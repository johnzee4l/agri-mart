import { useState } from "react";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useApi } from "@/lib/useApi.js";
import { asList, formatDate } from "@/lib/format.js";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import Chip from "../components/ui/Chip.jsx";
import Dialog from "../components/ui/Dialog.jsx";
import Input from "../components/ui/Input.jsx";
import Segmented from "../components/ui/Segmented.jsx";
import { AdminTable, Cell, Pagination, Row } from "./AdminTable.jsx";

/* FR-12 (blueprint 6.7). Draft and publish through published_at: null is a draft, a
   past timestamp is live, a future one is scheduled. Pinned rows come first from the
   API. Archive, restore and purge follow the shared soft-delete rules (FR-23). */

const PAGE_LIMIT = 20;

/** A row is live only once its timestamp exists and is in the past. */
function announcementState(row) {
  if (row.published_at == null) {
    return { key: "draft", label: "Draft", tone: "bg-muted text-fg" };
  }

  if (Date.parse(row.published_at) > Date.now()) {
    return { key: "scheduled", label: "Scheduled", tone: "bg-accent-subtle text-accent-text" };
  }

  return { key: "published", label: "Published", tone: "bg-primary-subtle text-primary-text" };
}

/** datetime-local needs "YYYY-MM-DDTHH:mm" in the browser's own zone. */
function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Announcements() {
  const [tab, setTab] = useState("active");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (tab === "archived") query.set("archived", "true");
  query.set("page", String(page));
  query.set("limit", String(PAGE_LIMIT));

  const announcements = useApi(`/announcements?${query.toString()}`);
  const rows = asList(announcements.data);
  const total = announcements.data?.total ?? rows.length;

  function switchTab(next) {
    setTab(next);
    setPage(1);
    setNotice(null);
    setActionError(null);
  }

  async function act(action, successMessage = null) {
    setBusy(true);
    setActionError(null);

    try {
      await action();
      announcements.reload();
      setConfirm(null);
      setNotice(successMessage);
    } catch (error) {
      setActionError(error.message ?? "That action did not go through.");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  const confirmCopy = {
    archive: {
      title: "Archive this announcement?",
      body: "It disappears from the storefront straight away. Archived rows can be restored.",
      confirmLabel: "Archive",
      tone: "secondary",
      run: (row) => api.del(`/announcements/${row.id}`),
      done: (row) => `“${row.title}” archived.`,
    },
    purge: {
      title: "Delete this announcement for good?",
      body: "Purge cannot be undone and takes the row out of the database.",
      confirmLabel: "Purge",
      tone: "danger",
      run: (row) => api.del(`/announcements/${row.id}/purge`),
      done: (row) => `“${row.title}” purged.`,
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-heading-sm text-fg">Announcements</h2>
          <p className="text-body-sm text-fg-muted">
            {total} {tab === "archived" ? "archived" : "active"} announcement
            {total === 1 ? "" : "s"}
          </p>
        </div>

        <Button onClick={() => setCreating(true)}>
          <Plus size={18} weight="bold" aria-hidden="true" />
          New announcement
        </Button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Segmented
          label="Announcement state"
          value={tab}
          onChange={switchTab}
          items={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
        />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <div className="w-[16rem]">
            <Input
              label="Search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Title or body"
              autoComplete="off"
            />
          </div>

          <Button type="submit" variant="secondary">
            Search
          </Button>

          {search ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          ) : null}
        </form>
      </div>

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

      {announcements.error ? (
        <ErrorNotice error={announcements.error} onRetry={announcements.reload} />
      ) : null}
      {announcements.loading && rows.length === 0 ? <LoadingLines rows={4} /> : null}

      {!announcements.loading && !announcements.error && rows.length === 0 ? (
        <EmptyState
          title={tab === "archived" ? "No archived announcements" : "Nothing announced yet"}
          body={
            tab === "archived"
              ? "Archived announcements wait here until they are restored or purged."
              : "Write a draft and publish it when the copy is ready. Publishing notifies subscribed customers."
          }
        />
      ) : null}

      {rows.length > 0 ? (
        <AdminTable
          columns={[
            { label: "Announcement" },
            { label: "State" },
            { label: "Published" },
            { label: "Actions", align: "right" },
          ]}
        >
          {rows.map((row, index) => {
            const state = announcementState(row);

            return (
              <Row key={row.id} index={index}>
                <Cell>
                  <span className="flex flex-col gap-1 py-2">
                    <span className="flex flex-wrap items-center gap-2">
                      {row.is_pinned ? (
                        <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-caption font-semibold text-primary-text">
                          Pinned
                        </span>
                      ) : null}
                      <span className="font-semibold text-fg">{row.title}</span>
                    </span>
                    <span className="line-clamp-1 text-caption text-fg-muted">{row.body}</span>
                  </span>
                </Cell>

                <Cell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-caption font-semibold ${state.tone}`}
                  >
                    {state.label}
                  </span>
                </Cell>

                <Cell className="text-fg-muted">
                  {row.published_at ? formatDate(row.published_at) : "—"}
                </Cell>

                <Cell align="right">
                  <span className="flex flex-wrap items-center justify-end gap-1">
                    {tab === "archived" ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            act(
                              () => api.post(`/announcements/${row.id}/restore`),
                              `“${row.title}” restored.`,
                            )
                          }
                        >
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setConfirm({ kind: "purge", row })}
                        >
                          Purge
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(row)}>
                          <PencilSimple size={16} aria-hidden="true" />
                          Edit
                        </Button>

                        {state.key === "published" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              act(
                                () => api.patch(`/announcements/${row.id}`, { published_at: null }),
                                `“${row.title}” is a draft again.`,
                              )
                            }
                          >
                            Unpublish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              act(
                                () =>
                                  api.patch(`/announcements/${row.id}`, {
                                    published_at: new Date().toISOString(),
                                  }),
                                `“${row.title}” is live. Subscribed customers were notified.`,
                              )
                            }
                          >
                            Publish
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            act(
                              () =>
                                api.patch(`/announcements/${row.id}`, {
                                  is_pinned: !row.is_pinned,
                                }),
                              row.is_pinned
                                ? `“${row.title}” is no longer pinned.`
                                : `“${row.title}” is pinned to the top.`,
                            )
                          }
                        >
                          {row.is_pinned ? "Unpin" : "Pin"}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setConfirm({ kind: "archive", row })}
                        >
                          Archive
                        </Button>
                      </>
                    )}
                  </span>
                </Cell>
              </Row>
            );
          })}
        </AdminTable>
      ) : null}

      <Pagination page={page} total={total} limit={PAGE_LIMIT} onPage={setPage} />

      <AnnouncementForm
        key={creating ? "new" : (editing?.id ?? "closed")}
        open={creating || Boolean(editing)}
        announcement={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(message) => {
          announcements.reload();
          setCreating(false);
          setEditing(null);
          setNotice(message);
        }}
      />

      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm ? confirmCopy[confirm.kind].title : ""}
      >
        {confirm ? (
          <div className="flex flex-col gap-4">
            <p className="text-body-sm text-fg-muted">{confirmCopy[confirm.kind].body}</p>
            <p className="text-body-sm font-semibold text-fg">{confirm.row.title}</p>

            <div className="flex items-center gap-3">
              <Button
                variant={confirmCopy[confirm.kind].tone}
                loading={busy}
                onClick={() =>
                  act(
                    () => confirmCopy[confirm.kind].run(confirm.row),
                    confirmCopy[confirm.kind].done(confirm.row),
                  )
                }
              >
                {confirmCopy[confirm.kind].confirmLabel}
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

/* Create and edit share one dialog. The caller keys it by the row, so the fields always
   start from the announcement being edited, or from an empty draft. */
function AnnouncementForm({ open, announcement, onClose, onSaved }) {
  const state = announcement ? announcementState(announcement) : null;
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [pinned, setPinned] = useState(Boolean(announcement?.is_pinned));
  const [mode, setMode] = useState(state?.key === "published" ? "publish" : state?.key === "scheduled" ? "schedule" : "draft");
  const [scheduled, setScheduled] = useState(toLocalInput(announcement?.published_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle) {
      setError("Enter a title.");
      return;
    }

    if (!cleanBody) {
      setError("Write the announcement.");
      return;
    }

    let publishedAt = null;
    if (mode === "publish") {
      publishedAt = new Date().toISOString();
    } else if (mode === "schedule") {
      const when = new Date(scheduled);
      if (!scheduled || Number.isNaN(when.getTime())) {
        setError("Choose the date and time to publish.");
        return;
      }
      publishedAt = when.toISOString();
    }

    setBusy(true);

    try {
      const payload = {
        title: cleanTitle,
        body: cleanBody,
        is_pinned: pinned,
        published_at: publishedAt,
      };

      if (announcement) {
        await api.patch(`/announcements/${announcement.id}`, payload);
        onSaved(publishedAt ? `“${cleanTitle}” saved and live.` : `“${cleanTitle}” saved as a draft.`);
      } else {
        await api.post("/announcements", payload);
        onSaved(
          mode === "publish"
            ? `“${cleanTitle}” published. Subscribed customers were notified.`
            : mode === "schedule"
              ? `“${cleanTitle}” is scheduled.`
              : `Draft “${cleanTitle}” saved.`,
        );
      }
    } catch (submitError) {
      setError(submitError.message ?? "That announcement did not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={announcement ? "Edit announcement" : "New announcement"}
    >
      <form onSubmit={submit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        <Input
          label="Title"
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
        />

        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg">Announcement</span>
          <textarea
            value={body}
            rows={6}
            maxLength={5000}
            onChange={(event) => setBody(event.target.value)}
            className="rounded-md bg-surface p-3.5 text-base text-fg ring-1 ring-inset ring-field-edge"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg">When to publish</span>
          <Segmented
            label="Publish timing"
            value={mode}
            onChange={setMode}
            items={[
              { value: "draft", label: "Save as draft" },
              { value: "publish", label: "Publish now" },
              { value: "schedule", label: "Schedule" },
            ]}
          />

          {mode === "schedule" ? (
            <Input
              label="Publish at"
              type="datetime-local"
              value={scheduled}
              onChange={(event) => setScheduled(event.target.value)}
            />
          ) : null}

          <p className="text-caption text-fg-subtle">
            A draft is not on the storefront. Publishing notifies subscribed customers once.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Chip selected={pinned} onClick={() => setPinned((value) => !value)}>
            Pin to the top
          </Chip>
        </div>

        {error ? (
          <p role="alert" className="text-body-sm text-danger-text">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={busy}>
            {announcement ? "Save" : "Create"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
