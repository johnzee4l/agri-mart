import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { m } from "motion/react";
import {
  CaretRight,
  ChatCircleDots,
  CheckCircle,
  Leaf,
  Package,
  Storefront,
  Tag,
  XCircle,
} from "@phosphor-icons/react";
import StockIndicator from "../components/StockIndicator.jsx";
import AddToCart from "../components/AddToCart.jsx";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import { useContent } from "@/lib/content.js";
import { useAuth } from "@/lib/auth.jsx";
import { asList, formatPHP, unwrap } from "@/lib/format.js";
import { useApi } from "@/lib/useApi.js";
import { useImagePalette } from "@/lib/imageColor.js";
import { useLiveProduct } from "@/lib/liveStock.jsx";
import { requestChat } from "@/lib/chatBus.js";
import StaleLabel from "../components/StaleLabel.jsx";
import { cn } from "@/lib/cn.js";

/* FR-1, designtokens 12.2. Image tile left, details right. The image shares its
   layoutId with the product tile so the transition is continuous (9.3). */

function InfoChip({ icon: Icon, children }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-caption font-semibold text-fg">
      <Icon size={14} weight="bold" className="text-fg-muted" aria-hidden="true" />
      {children}
    </span>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();
  const { data, error, loading, reload } = useApi(id ? `/products/${id}` : null);
  const related = useApi("/products?limit=8");
  const content = useContent();
  const live = useLiveProduct(unwrap(data));
  const palette = useImagePalette(live.product?.image_url, 3);
  const product = live.product;
  const [expanded, setExpanded] = useState(false);

  /* The glow behind the product photo is wider than its column. Clip it at the page
     edge so the decorative overflow cannot turn into a horizontal scrollbar. */
  const shell =
    "mx-auto w-full max-w-[var(--container-content)] overflow-x-clip px-4 py-10 lg:px-10 lg:py-16";

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

  const price = Number(product.price ?? 0);
  const compare = Number(product.compare_at_price ?? 0);
  const discount = compare > price ? Math.round((1 - price / compare) * 100) : 0;
  const stock = Number(product.stock_qty ?? 0);
  const soldOut = stock <= 0;
  const description = product.description ?? "";
  const longDescription = description.length > 170;
  /* Three blobs of the photo's own dominant hues, mixed as radial washes behind the
     tile. The image mask feathers out on the left, so the colour shows through there. */
  const wash = palette?.length
    ? {
        background: [
          `radial-gradient(58% 52% at 10% 16%, rgb(${palette[0]} / 0.62) 0%, rgb(${palette[0]} / 0) 74%)`,
          `radial-gradient(52% 48% at 26% 54%, rgb(${palette[1] ?? palette[0]} / 0.46) 0%, rgb(${palette[1] ?? palette[0]} / 0) 72%)`,
          `radial-gradient(62% 58% at 6% 94%, rgb(${palette[2] ?? palette[0]} / 0.58) 0%, rgb(${palette[2] ?? palette[0]} / 0) 74%)`,
        ].join(", "),
        opacity: 1,
      }
    : { opacity: 0 };

  const nearby = asList(related.data)
    .filter((item) => item.id !== product.id && item.image_url)
    .slice(0, 4);

  /* Signed-in customers get the live chat; everyone else goes to the contact page,
     where the store's phone and hours are always available. */
  /* "Ask the store" must reach the store, not a contact page: customers get the chat
     panel, staff get their inbox, and a signed-out visitor is asked to sign in first
     and brought straight back here afterwards. */
  function askStore() {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (role === "customer") {
      requestChat();
      return;
    }

    navigate("/admin/chat");
  }

  return (
    <article className={shell}>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-label text-fg-muted">
          <li>
            <Link to="/" className="rounded-xs px-1 py-0.5 hover:text-fg hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <CaretRight size={12} weight="bold" className="text-fg-subtle" />
          </li>
          <li>
            <Link
              to="/products"
              className="rounded-xs px-1 py-0.5 hover:text-fg hover:underline"
            >
              Products
            </Link>
          </li>
          <li aria-hidden="true">
            <CaretRight size={12} weight="bold" className="text-fg-subtle" />
          </li>
          <li aria-current="page" className="min-w-0 px-1 text-fg">
            <span className="line-clamp-1 font-semibold">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
        <m.div layoutId={`product-image-${product.id}`} className="relative">
          <div
            aria-hidden="true"
            style={wash}
            className="pointer-events-none absolute -inset-x-10 -top-11 -bottom-8 rounded-[var(--radius-xs)] blur-3xl transition-opacity duration-[var(--duration-slow)] ease-standard"
          />

          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-xs)] bg-muted [mask-image:linear-gradient(to_right,transparent_0%,black_18%,black_100%)]">
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

          <div className="pointer-events-none absolute top-4 right-4 flex flex-wrap justify-end gap-2">
            {discount > 0 ? (
              <span className="inline-flex h-6 items-center rounded-full bg-tile-inverse px-2.5 text-caption font-semibold text-on-inverse tabular-nums">
                -{discount}%
              </span>
            ) : null}
            {product.unit ? (
              <span className="inline-flex h-6 items-center rounded-full bg-surface px-2.5 text-caption font-semibold text-fg">
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
        </m.div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            {product.brand ? (
              <p className="text-caption text-fg-muted">{product.brand}</p>
            ) : null}

            <h1 className="max-w-[22ch] text-heading-lg leading-tight text-fg lg:text-display-lg">
              {product.name}
            </h1>

            <p className="flex flex-wrap items-baseline gap-2">
              <span className="text-stat-md text-fg tabular-nums">{formatPHP(price)}</span>
              <span className="text-body-sm text-fg-muted">
                {product.unit ? `+ sold per ${product.unit}` : "+ taxes at checkout"}
              </span>
              {discount > 0 ? (
                <span className="text-body-sm text-fg-subtle tabular-nums line-through">
                  {formatPHP(compare)}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <AddToCart product={product} />
            <button
              type="button"
              onClick={askStore}
              className="inline-flex h-[var(--control-lg)] items-center justify-center gap-2 rounded-full bg-muted px-5 text-label font-semibold text-fg transition-colors duration-[var(--duration-fast)] ease-standard hover:bg-muted/70"
            >
              <ChatCircleDots size={18} aria-hidden="true" />
              Ask the store
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.brand ? (
              <InfoChip icon={Tag}>{product.brand}</InfoChip>
            ) : null}
            {product.unit ? (
              <InfoChip icon={Package}>Sold per {product.unit}</InfoChip>
            ) : null}
            {product.category?.name ? (
              <InfoChip icon={Leaf}>{product.category.name}</InfoChip>
            ) : null}
            <InfoChip icon={soldOut ? XCircle : CheckCircle}>
              {soldOut ? "Out of stock" : `${stock} in stock`}
            </InfoChip>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StockIndicator product={product} changedAt={live.changedAt} />
            <StaleLabel />
          </div>

          {description ? (
            <div>
              <p
                className={cn(
                  "max-w-[62ch] text-body-md text-fg-muted",
                  !expanded && longDescription && "line-clamp-3",
                )}
              >
                {description}
              </p>
              {longDescription ? (
                <button
                  type="button"
                  onClick={() => setExpanded((current) => !current)}
                  className="mt-1 text-body-sm font-semibold text-fg hover:underline"
                >
                  {expanded ? "Read less" : "Read more"}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="furrow mt-2 h-px opacity-50" aria-hidden="true" />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint">
                <Storefront size={20} weight="bold" className="text-primary-text" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-label font-semibold text-fg">AgriMart store</span>
                <span className="truncate text-caption text-fg-muted">
                  {content.store?.hours ?? content.store?.address ?? "Ships from the store today."}
                </span>
              </span>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-1 text-label font-semibold text-fg hover:underline"
            >
              All products
              <CaretRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {nearby.length > 0 ? (
        <section className="mt-16 flex flex-col gap-4">
          <h2 className="text-heading-sm text-fg">You may also like</h2>
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {nearby.map((item) => (
              <li key={item.id} className="shrink-0 snap-start">
                <Link
                  to={`/products/${item.id}`}
                  className="flex w-36 flex-col gap-2 rounded-xl bg-tile-surface p-2"
                >
                  <span className="block size-32 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={item.image_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="line-clamp-2 text-caption font-semibold text-fg">
                    {item.name}
                  </span>
                  <span className="text-caption text-fg-muted tabular-nums">
                    {formatPHP(item.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}