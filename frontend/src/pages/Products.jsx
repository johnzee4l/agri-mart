import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { m } from "motion/react";
import { CaretDown, FunnelSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import ProductCard from "../components/ProductCard.jsx";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import Chip from "../components/ui/Chip.jsx";
import Input from "../components/ui/Input.jsx";
import { asList } from "@/lib/format.js";
import { useApi } from "@/lib/useApi.js";
import { buildProductsQuery, PAGE_SIZE, SORT_OPTIONS } from "@/lib/catalog.js";
import { useSpringPreset } from "@/styles/tokens/motion.js";

/* FR-1, FR-2. Filters live in the URL so a filtered catalog is shareable. The pill and
   the panel are one element: the button morphs into the surface and back, so the
   toolbar is a single control until the options are needed. */
export default function Products() {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const morph = useSpringPreset("organic");

  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);

  const [filters, setFilters] = useState({
    q: params.get("q") ?? "",
    brand: params.get("brand") ?? "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
  });

  const { data, error, loading, reload } = useApi(buildProductsQuery(params));
  const categories = useApi("/categories");

  const products = asList(data);
  const total = Number(data?.total ?? products.length);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeCount = [
    category,
    params.get("q"),
    params.get("brand"),
    params.get("minPrice"),
    params.get("maxPrice"),
    sort,
  ].filter(Boolean).length;

  const update = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  };

  const setFilter = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    update({
      q: filters.q.trim(),
      brand: filters.brand.trim(),
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    });
    setOpen(false);
  };

  const clearAll = () => {
    setFilters({ q: "", brand: "", minPrice: "", maxPrice: "" });
    update({ q: "", brand: "", minPrice: "", maxPrice: "", category: "", sort: "" });
    setOpen(false);
  };

  return (
    <section className="mx-auto w-full max-w-[var(--container-wide)] px-4 py-10 lg:px-10 lg:py-16">
      <header className="flex flex-col gap-3">
        <span className="inline-flex h-7 w-fit items-center rounded-full bg-primary-subtle px-3 text-caption font-semibold text-primary-text">
          Catalog
        </span>
        <h1 className="max-w-[16ch] text-display-lg text-fg">Products</h1>
        <p className="max-w-[60ch] text-body-md text-fg-muted">
          Prices and stock come from the store. Archived products never appear here.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-caption text-fg-muted tabular-nums" aria-live="polite">
            {loading ? "Loading…" : `${total} ${total === 1 ? "product" : "products"}`}
          </p>

          <m.div
            layout
            transition={morph}
            className={`bg-surface transition-[border-radius] duration-[var(--duration-base)] ease-standard ${
              open ? "w-full rounded-2xl p-4 lg:p-5" : "rounded-full"
            }`}
          >
            {open ? (
              <form
                id="product-filters"
                aria-label="Product filters"
                onSubmit={applyFilters}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-label font-semibold text-fg">Filters and sort</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close filters"
                    className="flex size-9 items-center justify-center rounded-full text-fg-muted transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-fg"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_10rem_8rem_8rem]">
                  <Input
                    label="Search"
                    type="search"
                    value={filters.q}
                    onChange={setFilter("q")}
                    placeholder="Seeds, fertilizer, feed…"
                  />
                  <Input label="Brand" value={filters.brand} onChange={setFilter("brand")} />
                  <Input
                    label="Min price"
                    type="number"
                    min="0"
                    value={filters.minPrice}
                    onChange={setFilter("minPrice")}
                  />
                  <Input
                    label="Max price"
                    type="number"
                    min="0"
                    value={filters.maxPrice}
                    onChange={setFilter("maxPrice")}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Chip selected={!category} onClick={() => update({ category: "" })}>
                    All categories
                  </Chip>
                  {asList(categories.data).map((item) => (
                    <Chip
                      key={item.id}
                      selected={category === item.id}
                      onClick={() => update({ category: item.id })}
                    >
                      {item.name}
                    </Chip>
                  ))}
                </div>

                <div className="flex flex-wrap items-end justify-between gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-label font-semibold text-fg">Sort by</span>
                    <select
                      value={sort}
                      onChange={(event) => update({ sort: event.target.value })}
                      className="h-[var(--control-md)] rounded-md bg-muted px-3.5 text-base text-fg focus:outline-none"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value || "default"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                      Clear
                    </Button>
                    <Button type="submit" size="sm">
                      <MagnifyingGlass size={18} aria-hidden="true" />
                      Apply
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <button
                type="button"
                aria-expanded={false}
                onClick={() => setOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-label font-semibold text-fg transition-colors duration-[var(--duration-fast)] ease-standard hover:bg-muted"
              >
                <FunnelSimple size={18} aria-hidden="true" />
                Filters
                {activeCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-highlight px-1.5 text-caption font-semibold text-on-highlight tabular-nums">
                    {activeCount}
                  </span>
                ) : null}
                <CaretDown size={16} aria-hidden="true" />
              </button>
            )}
          </m.div>
        </div>

        {error ? <ErrorNotice error={error} onRetry={reload} /> : null}

        {loading && products.length === 0 ? <LoadingLines rows={4} /> : null}

        {!loading && !error && products.length === 0 ? (
          <EmptyState
            title="No products match those filters"
            body="Try another category, brand or price range."
          />
        ) : null}

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-[var(--tile-gap)] md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => update({ page: page - 1 }, { resetPage: false })}
          >
            Previous
          </Button>
          <p className="text-caption text-fg-muted tabular-nums">
            Page {page} of {pageCount}
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pageCount || loading}
            onClick={() => update({ page: page + 1 }, { resetPage: false })}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
