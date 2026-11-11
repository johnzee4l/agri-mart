import { Link } from "react-router-dom";
import { m } from "motion/react";
import { formatPHP } from "@/lib/format.js";
import StockIndicator from "./StockIndicator.jsx";
import AddToCartButton from "./AddToCartButton.jsx";
import { useLiveProduct } from "@/lib/liveStock.jsx";
import StaleLabel from "./StaleLabel.jsx";

/* The only catalog card (designtokens.md 8.5, 11). The image carries a shared
   layoutId so the tile morphs into the detail image (9.3). The add button sits
   outside the link, because a button cannot live inside an anchor. */
export default function ProductCard({ product: incoming }) {
  const { product, changedAt } = useLiveProduct(incoming);

  return (
    <div className="group flex flex-col gap-3 rounded-xl bg-surface p-3">
      <Link to={`/products/${product.id}`} className="flex flex-col gap-3">
        <m.div
          layoutId={`product-image-${product.id}`}
          className="overflow-hidden rounded-lg bg-muted"
        >
          <div className="aspect-square w-full">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[var(--duration-slow)] ease-standard group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-caption text-fg-subtle">
                No photo
              </div>
            )}
          </div>
        </m.div>

        <div className="flex flex-col gap-1">
          <h3 className="text-heading-sm text-fg">{product.name}</h3>
          <p className="text-caption text-fg-muted">
            {product.unit ? `Per ${product.unit}` : product.brand}
          </p>
        </div>
      </Link>

      <div className="mt-auto flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body-md font-semibold text-fg tabular-nums">
            {formatPHP(product.price)}
          </span>
          <StockIndicator product={product} changedAt={changedAt} />
        </div>
        <StaleLabel />
        <AddToCartButton product={product} size="sm" className="w-full" />
      </div>
    </div>
  );
}
