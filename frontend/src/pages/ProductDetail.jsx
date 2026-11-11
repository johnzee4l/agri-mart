import { Link, useParams } from "react-router-dom";
import { m } from "motion/react";
import StockIndicator from "../components/StockIndicator.jsx";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import { formatPHP, unwrap } from "@/lib/format.js";
import { useApi } from "@/lib/useApi.js";

/* FR-1. Split canvas: image left, details right. The image shares its layoutId
   with the product tile so the transition is continuous (designtokens 9.3). */
export default function ProductDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(id ? `/products/${id}` : null);
  const product = unwrap(data);

  const shell = "mx-auto w-full max-w-[var(--container-content)] px-4 py-10 lg:px-10 lg:py-16";

  if (loading) {
    return (
      <div className={shell}>
        <LoadingLines rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={shell}>
        <Link to="/products" className="text-label font-semibold text-primary-text hover:underline">
          ← All products
        </Link>
        <ErrorNotice error={error} onRetry={reload} className="mt-6" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className={shell}>
        <EmptyState
          title="Product not found"
          body="It may have been archived. Browse the catalog for what is in stock."
        />
      </div>
    );
  }

  return (
    <article className={shell}>
      <Link to="/products" className="text-label font-semibold text-primary-text hover:underline">
        ← All products
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
        <m.div
          layoutId={`product-image-${product.id}`}
          className="overflow-hidden rounded-lg bg-muted"
        >
          <div className="aspect-[4/5] w-full md:aspect-square">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-caption text-fg-subtle">
                No photo
              </div>
            )}
          </div>
        </m.div>

        <div className="flex flex-col gap-4">
          {product.brand ? <p className="text-caption text-fg-muted">{product.brand}</p> : null}

          <h1 className="text-heading-lg text-fg">{product.name}</h1>

          <p className="text-heading-md font-semibold text-fg tabular-nums">
            {formatPHP(product.price)}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <StockIndicator product={product} />
            {product.unit ? (
              <span className="text-body-sm text-fg-muted">Sold per {product.unit}</span>
            ) : null}
          </div>

          {product.description ? (
            <p className="max-w-[65ch] text-body-md text-fg-muted">{product.description}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
