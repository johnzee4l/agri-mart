import { useEffect, useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useApi } from "@/lib/useApi.js";
import { asList } from "@/lib/format.js";
import { ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import Dialog from "../components/ui/Dialog.jsx";
import Input from "../components/ui/Input.jsx";
import Segmented from "../components/ui/Segmented.jsx";

/* FR-2, FR-23. Category management lives on the products page (blueprint 6.7), in a
   dialog: the same Active / Archived tab, Archive, Restore, and a purge that the API
   refuses while any product still uses the category. */

const EMPTY = { name: "", description: "" };

export default function CategoryDialog({ open, onClose, onChanged }) {
  const [tab, setTab] = useState("active");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  // The categories router sorts by name by default and whitelists no sort key.
  const categories = useApi(open ? `/categories?${tab === "archived" ? "archived=true&" : ""}limit=60` : null);

  const list = asList(categories.data);

  useEffect(() => {
    if (!open) {
      setEditing(null);
      setForm(EMPTY);
      setErrors({});
      setNotice(null);
    }
  }, [open]);

  function startNew() {
    setEditing("new");
    setForm(EMPTY);
    setErrors({});
    setNotice(null);
  }

  function startEdit(category) {
    setEditing(category.id);
    setForm({ name: category.name ?? "", description: category.description ?? "" });
    setErrors({});
    setNotice(null);
  }

  /** Every write answers the same way: run it, refresh the list, report the outcome. */
  async function run(action, successMessage) {
    setBusy(true);
    setNotice(null);

    try {
      await action();
      categories.reload();
      onChanged?.();
      setNotice(successMessage);
      return true;
    } catch (error) {
      const fields = {};
      for (const detail of error?.details ?? []) {
        const key = String(detail.path ?? "").split(".")[0];
        if (key && !fields[key]) fields[key] = detail.message;
      }

      setErrors(fields);
      if (Object.keys(fields).length === 0) setNotice(error.message ?? "The change was not saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setErrors({ name: "Enter the category name." });
      return;
    }

    const body = { name: form.name.trim(), description: form.description.trim() || null };
    const saved = await run(
      () => (editing === "new" ? api.post("/categories", body) : api.patch(`/categories/${editing}`, body)),
      editing === "new" ? "Category created." : "Category saved.",
    );

    if (saved) {
      setEditing(null);
      setForm(EMPTY);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Categories">
      <div className="flex flex-col gap-4">
        <Segmented
          label="Category state"
          value={tab}
          onChange={(next) => {
            setTab(next);
            setEditing(null);
          }}
          items={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
        />

        {categories.error ? <ErrorNotice error={categories.error} onRetry={categories.reload} /> : null}
        {categories.loading && list.length === 0 ? <LoadingLines rows={3} /> : null}

        {!categories.loading && !categories.error && list.length === 0 ? (
          <p className="text-body-sm text-fg-muted">
            {tab === "archived" ? "No archived categories." : "No categories yet."}
          </p>
        ) : null}

        {list.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {list.map((category, index) => (
              <li
                key={category.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 ${
                  index % 2 === 1 ? "bg-muted" : ""
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-label font-semibold text-fg">{category.name}</span>
                  {category.description ? (
                    <span className="text-caption text-fg-muted">{category.description}</span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(category)}>
                    <PencilSimple size={16} aria-hidden="true" />
                    Edit
                  </Button>

                  {tab === "archived" ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          run(() => api.post(`/categories/${category.id}/restore`), `${category.name} restored.`)
                        }
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          run(() => api.del(`/categories/${category.id}/purge`), `${category.name} purged.`)
                        }
                      >
                        Purge
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        run(() => api.del(`/categories/${category.id}`), `${category.name} archived.`)
                      }
                    >
                      Archive
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {editing ? (
          <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-md bg-muted p-4">
            <h3 className="text-label font-semibold text-fg">
              {editing === "new" ? "New category" : "Edit category"}
            </h3>

            <Input
              label="Name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              error={errors.name}
              autoComplete="off"
            />

            <Input
              label="Description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              error={errors.description}
              autoComplete="off"
            />

            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" loading={busy}>
                {editing === "new" ? "Create" : "Save"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" size="sm" variant="secondary" className="self-start" onClick={startNew}>
            New category
          </Button>
        )}

        {notice ? (
          <p role="status" className="rounded-md bg-primary-subtle p-3 text-body-sm text-primary-text">
            {notice}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
