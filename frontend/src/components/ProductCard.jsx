import { Link } from "react-router-dom";
import { m } from "motion/react";
import { CaretRight, ShoppingCartSimple, XCircle } from "@phosphor-icons/react";
import { formatPHP } from "@/lib/format.js";
import { stockStatus } from "@/lib/catalog.js";
import { useCart } from "@/lib/cart.jsx";
import { useAuth } from "@/lib/auth.jsx";
import { useLiveProduct } from "@/lib/liveStock.jsx";
import { useImageColor } from "@/lib/imageColor.js";
import StockIndicator from "./StockIndicator.jsx";
import StaleLabel from "./StaleLabel.jsx";

/* ProductTile: the photo covers the whole portrait tile, a scrim sampled from the
   photo's own colour carries the copy, and a footer bar holds the card action. The
   image keeps the shared layoutId so it morphs into the detail image (9.3). The anchor
   is stretched over the tile; buttons sit above it. */
export default function ProductCard({ product: incoming }) {
  const { product, changedAt } = useLiveProduct(incoming);
  const { add } = useCart();
  const { isAuthenticated } = useAuth();
  const scrim = useImageColor(product.image_url);

  const price = Number(product.price ?? 0);
  const compare = Number(product.compare_at_price ?? 0);
  const discount = compare > price ? Math.round((1 - price / compare) * 100) : 0;
  const status = stockStatus(product);
  const soldOut = status === "out";

  const scrimImage = scrim
    ? `linear-gradient(to top, rgb(${scrim} / 0.98) 0%, rgb(${scrim} / 0.82) 38%, rgb(${scrim} / 0) 74%)`
    : "linear-gradient(to top, var(--tile-inverse) 0%, transparent 74%)";

  const addOne = () => add(product, 1);

  return (
    <div className="group relative isolate aspect-[3/4] overflow-hidden rounded-xl bg-tile-inverse">
      <m.div layoutId={`product-image-${product.id}`} className="absolute inset-0">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[var(--duration-slow)] ease-standard group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-caption text-on-inverse/60">
            No photo
          </div>
        )}
      </m.div>

      {soldOut ? (
        <div className="furrow absolute inset-0 bg-canvas/40" aria-hidden="true" />
      ) : null}

      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: scrimImage }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-tile-inverse/40 to-transparent"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
        {discount > 0 ? (
          <span className="inline-flex h-6 items-center rounded-full bg-surface/90 px-2.5 text-caption font-semibold text-fg tabular-nums backdrop-blur-sm">
            -{discount}%
          </span>
        ) : null}
        {product.unit ? (
          <span className="inline-flex h-6 items-center rounded-full bg-surface/90 px-2.5 text-caption font-semibold text-fg backdrop-blur-sm">
            {product.unit}
          </span>
        ) : null}
        {soldOut ? (
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-danger-subtle px-2.5 text-caption font-semibold text-danger-text">
            <XCircle size={14} weight="bold" aria-hidden="true" />
            Out of stock
          </span>
        ) : null}
      </div>

      <Link
        to={`/products/${product.id}`}
        aria-label={product.name}
        className="absolute inset-0 z-10 rounded-xl"
      />

      {isAuthenticated && !soldOut ? (
        <button
          type="button"
          onClick={addOne}
          aria-label={`Add ${product.name} to cart`}
          className="absolute top-3 right-3 z-20 flex size-11 items-center justify-center rounded-full bg-surface/85 text-fg backdrop-blur-sm transition-transform duration-[var(--duration-base)] ease-standard hover:scale-105"
        >
          <ShoppingCartSimple size={20} aria-hidden="true" />
        </button>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1.5 p-4 pb-16 text-on-inverse">
        {product.brand ? (
          <p className="text-caption font-medium text-on-inverse/70">{product.brand}</p>
        ) : null}
        <h3 className="line-clamp-2 text-heading-sm leading-tight sm:text-heading-md">
          {product.name}
        </h3>
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="text-label font-semibold tabular-nums">{formatPHP(price)}</span>
          {discount > 0 ? (
            <span className="text-caption text-on-inverse/60 tabular-nums line-through">
              {formatPHP(compare)}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StockIndicator product={product} changedAt={changedAt} className="bg-surface/20 text-on-inverse" />
          <StaleLabel className="text-on-inverse/70" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-12 items-center justify-between bg-surface/10 px-4 text-label font-semibold text-on-inverse backdrop-blur-sm">
        View product
        <CaretRight size={18} aria-hidden="true" />
      </div>
    </div>
  );
}
