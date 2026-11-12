import { useMemo, useState } from "react";
import { ImageSquare, MagnifyingGlass, PencilSimple, Plus, Tag } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useApi } from "@/lib/useApi.js";
import { SORT_OPTIONS } from "@/lib/catalog.js";
import { asList, formatPHP } from "@/lib/format.js";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import Dialog from "../components/ui/Dialog.jsx";
import Input from "../components/ui/Input.jsx";
import Segmented from "../components/ui/Segmented.jsx";
import CategoryDialog from "./CategoryDialog.jsx";
import ProductFormDialog from "./ProductFormDialog.jsx";

/* FR-3, FR-23 (blueprint 6.7). Products: search, filters, Active / Archived tabs, and the
   three controls every admin list shares — Archive, Restore, Purge. Purge stays hidden
   until a row is archived, because the API refuses it otherwise. Categories are managed
   from here, not on their own route. */

const PAGE_LIMIT = 20;
const SELECT_CLASS =
  "h-[var(--control-md)] rounded-md bg-surface px-3.5 text-base text-fg ring-1 ring-inset ring-field-edge";

/* The storefront list leaves "newest" implicit (an empty value); the admin select needs a
   real option for it, or the control shows the first choice while the state says newest. */
const ADMIN_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  ...SORT_OPTIONS.filter((option) => option.value),
];

export default function AdminProducts() {
  const [tab, setTab] = useState("active");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ q: "", category: "", sort: "newest" });
  const [searchInput, setSearchInput] = useState("");

  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Categories come back sorted by name already; their router whitelists no sort key.
  const categoryList = useApi("/categories?limit=60");
  const categories = asList(categoryList.data);
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.category) query.set("category", filters.category);
  if (filters.sort) query.set("sort", filters.sort);
  if (tab === "archived") query.set("archived", "true");
  query.set("page", String(page));
  query.set("limit", String(PAGE_LIMIT));

  const products = useApi(`/products?${query.toString()}`);

  const rows = asList(products.data);
  const total = products.data?.total ?? rows.length;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  function switchTab(next) {
    setTab(next);
    setPage(1);
    setNotice(null);
    setActionError(null);
  }

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setFilters((current) => ({ ...current, q: searchInput.trim() }));
  }

  function reloadAfter(message) {
    products.reload();
    categoryList.reload();
    setConfirm(null);
    setCreating(false);
    setEditing(null);
    setNotice(message);
  }

  async function act(action, successMessage = null) {
    setBusy(true);
    setActionError(null);

    try {
      await action();
      reloadAfter(successMessage);
    } catch (error) {
      setActionError(error.message ?? "That action did not go through.");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  const confirmCopy = {
    archive: {
      title: "Archive this product?",
      body: "Customers stop seeing it straight away. Past orders keep their copy of the name and price.",
      confirmLabel: "Archive",
      tone: "secondary",
      run: (product) => api.del(`/products/${product.id}`),
      done: (product) => `${product.name} archived. It is in the Archived tab.`,
    },
    purge: {
      title: "Delete this product for good?",
      body: "Purge cannot be undone. The API refuses it while any order still references the product.",
      confirmLabel: "Purge",
      tone: "danger",
      run: (product) => api.del(`/products/${product.id}/purge`),
      done: (product) => `${product.name} purged.`,
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-heading-sm text-fg">Products and categories</h2>
          <p className="text-body-sm text-fg-muted">
            {total} {tab === "archived" ? "archived" : "active"} product{total === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setCategoriesOpen(true)}>
            <Tag size={18} aria-hidden="true" />
            Categories
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus size={18} weight="bold" aria-hidden="true" />
            New product
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Segmented
          label="Product state"
          value={tab}
          onChange={switchTab}
          items={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
        />

        <form onSubmit={applySearch} className="flex flex-wrap items-end gap-2">
          <div className="w-[16rem]">
            <Input
              label="Search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, brand or description"
              autoComplete="off"
            />
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-label font-semibold text-fg">Category</span>
            <select
              value={filters.category}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, category: event.target.value }));
              }}
              className={SELECT_CLASS}
            >
              <option value="">All</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-label font-semibold text-fg">Sort</span>
            <select
              value={filters.sort}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, sort: event.target.value }));
              }}
              className={SELECT_CLASS}
            >
              {ADMIN_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" variant="secondary">
            <MagnifyingGlass size={18} aria-hidden="true" />
            Search
          </Button>
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

      {products.error ? <ErrorNotice error={products.error} onRetry={products.reload} /> : null}
      {products.loading && rows.length === 0 ? <LoadingLines rows={5} /> : null}

      {!products.loading && !products.error && rows.length === 0 ? (
        <EmptyState
          title={tab === "archived" ? "No archived products" : "No products match"}
          body={
            tab === "archived"
              ? "Archived products wait here until they are restored or purged."
              : "Change the search or filters, or create a product."
          }
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-body-sm">
            <thead>
              <tr className="text-caption font-semibold text-fg-muted uppercase">
                <th scope="col" className="pb-2 text-left">
                  Product
                </th>
                <th scope="col" className="pb-2 text-left">
                  Category
                </th>
                <th scope="col" className="pb-2 text-right">
                  Price
                </th>
                <th scope="col" className="pb-2 text-right">
                  Stock
                </th>
                <th scope="col" className="pb-2 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product, index) => (
                <tr key={product.id} className={index % 2 === 1 ? "bg-muted" : undefined}>
                  <td className="h-[var(--row-h)] rounded-l-md px-3">
                    <span className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="size-8 rounded-md object-cover" />
                      ) : (
                        <span className="flex size-8 items-center justify-center rounded-md bg-muted">
                          <ImageSquare size={16} className="text-fg-subtle" aria-hidden="true" />
                        </span>
                      )}
                      <span className="flex flex-col">
                        <span className="font-semibold text-fg">
                          {product.name}
                          {product.is_featured ? (
                            <span className="ml-2 text-caption font-semibold text-primary-text">Featured</span>
                          ) : null}
                        </span>
                        {product.brand ? (
                          <span className="text-caption text-fg-muted">{product.brand}</span>
                        ) : null}
                      </span>
                    </span>
                  </td>
                  <td className="h-[var(--row-h)] px-3 text-fg-muted">
                    {categoryNames.get(product.category_id) ?? "—"}
                  </td>
                  <td className="h-[var(--row-h)] px-3 text-right tabular-nums text-fg">
                    {formatPHP(product.price)}
                  </td>
                  <td className="h-[var(--row-h)] px-3 text-right tabular-nums text-fg">
                    {product.stock_qty} {product.unit ?? ""}
                  </td>
                  <td className="h-[var(--row-h)] rounded-r-md px-3">
                    <span className="flex flex-wrap items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(product)}>
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
                              act(() => api.post(`/products/${product.id}/restore`), `${product.name} restored.`)
                            }
                          >
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setConfirm({ kind: "purge", product })}
                          >
                            Purge
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setConfirm({ kind: "archive", product })}
                        >
                          Archive
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {lastPage > 1 ? (
        <div className="flex items-center justify-between gap-4">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </Button>
          <span className="text-caption text-fg-muted">
            Page {page} of {lastPage}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={page >= lastPage}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <ProductFormDialog
        open={creating || Boolean(editing)}
        product={editing}
        categories={categories}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(_saved, action) => reloadAfter(action === "created" ? "Product created." : "Product saved.")}
      />

      <CategoryDialog open={categoriesOpen} onClose={() => setCategoriesOpen(false)} onChanged={categoryList.reload} />

      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm ? confirmCopy[confirm.kind].title : ""}
      >
        {confirm ? (
          <div className="flex flex-col gap-4">
            <p className="text-body-sm text-fg-muted">{confirmCopy[confirm.kind].body}</p>
            <p className="text-body-sm font-semibold text-fg">{confirm.product.name}</p>

            <div className="flex items-center gap-3">
              <Button
                variant={confirmCopy[confirm.kind].tone}
                loading={busy}
                onClick={() =>
                  act(
                    () => confirmCopy[confirm.kind].run(confirm.product),
                    confirmCopy[confirm.kind].done(confirm.product),
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
