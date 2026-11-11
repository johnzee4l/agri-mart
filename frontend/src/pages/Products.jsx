import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MagnifyingGlass } from "@phosphor-icons/react";
import ProductCard from "../components/ProductCard.jsx";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import Chip from "../components/ui/Chip.jsx";
import Input from "../components/ui/Input.jsx";
import { asList } from "@/lib/format.js";
import { useApi } from "@/lib/useApi.js";
import { buildProductsQuery, PAGE_SIZE, SORT_OPTIONS } from "@/lib/catalog.js";

/* FR-1, FR-2. Filters live in the URL so a filtered catalog is shareable. */
export default function Products() {
  const [params, setParams] = useSearchParams();

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
  };

  return (
    <section className="mx-auto w-full max-w-[var(--container-wide)] px-4 py-10 lg:px-10 lg:py-16">
      <header className="flex flex-col gap-2">
        <p className="text-eyebrow font-bold text-primary-text uppercase">Catalog</p>
        <h1 className="text-display-lg text-fg">Products</h1>
        <p className="text-body-sm text-fg-muted">
          Prices and stock come from the store. Archived products never appear here.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-5">
        <form onSubmit={applyFilters} className="grid gap-3 md:grid-cols-[1fr_10rem_8rem_8rem_auto]">
          <Input
            label="Search"
            type="search"
            value={filters.q}
            onChange={setFilter("q")}
            placeholder="Seeds, fertilizer, feed…"
          />
          <Input label="Brand" value={filters.brand} onChange={setFilter("brand")} />
          <Input label="Min price" type="number" min="0" value={filters.minPrice} onChange={setFilter("minPrice")} />
          <Input label="Max price" type="number" min="0" value={filters.maxPrice} onChange={setFilter("maxPrice")} />
          <Button type="submit" className="md:self-end">
            <MagnifyingGlass size={20} aria-hidden="true" />
            Apply
          </Button>
        </form>

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
            <span className="text-label font-semibold text-fg">Sort</span>
            <select
              value={sort}
              onChange={(event) => update({ sort: event.target.value })}
              className="h-[var(--control-md)] rounded-md bg-surface px-3.5 text-base text-fg ring-1 ring-inset ring-field-edge"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value || "default"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <p className="text-caption text-fg-muted tabular-nums" aria-live="polite">
            {loading ? "Loading…" : `${total} ${total === 1 ? "product" : "products"}`}
          </p>
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
