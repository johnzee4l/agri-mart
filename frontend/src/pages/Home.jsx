import { Link } from "react-router-dom";
import { CaretRight, Cursor } from "@phosphor-icons/react";
import ProductCard from "../components/ProductCard.jsx";
import CurvedCarousel from "../components/CurvedCarousel.jsx";
import { LoadingLines } from "../components/AsyncState.jsx";
import { asList, formatDate } from "@/lib/format.js";
import { useContent } from "@/lib/content.js";
import { useApi } from "@/lib/useApi.js";
import { cn } from "@/lib/cn.js";

/* Home (designtokens.md 12.1): seed-grid hero, tilt strip, bento row, category tiles,
   featured ProductTiles and the season timeline. Copy and products come from the API;
   only the hero decoration is presentational and aria-hidden. */

const pill =
  "inline-flex h-7 items-center gap-1.5 rounded-full bg-highlight-subtle px-3 text-caption font-semibold text-highlight-text";

/* Category bento: two wide tiles and two narrow ones, with taller tiles on the second
   row so the grid steps like a mosaic instead of four equal cards. */
const bentoLayout = [
  "col-span-2 h-40 lg:col-span-7 lg:h-48",
  "col-span-1 h-40 lg:col-span-5 lg:h-48",
  "col-span-1 h-48 lg:col-span-5 lg:h-60",
  "col-span-2 h-48 lg:col-span-7 lg:h-60",
];

function BannerLink({ href, className, children }) {
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

export default function Home() {
  const { hero, banners, store } = useContent();
  const products = useApi("/products?limit=12");
  const announcements = useApi("/announcements");
  const categories = useApi("/categories");

  const catalogue = asList(products.data);
  const flagged = catalogue.filter((product) => product.is_featured);
  const showcase = flagged.length > 0 ? flagged.slice(0, 8) : catalogue.slice(0, 4);
  const strip = catalogue.filter((product) => product.image_url).slice(0, 7);
  const inStock = catalogue.filter((product) => Number(product.stock_qty ?? 0) > 0).length;

  const published = asList(announcements.data);
  const pinned = published.find((item) => item.is_pinned);
  const latest = published.filter((item) => item.id !== pinned?.id).slice(0, 3);
  const feature = pinned ?? banners[0] ?? null;
  const categoryTiles = asList(categories.data).slice(0, 4);

  return (
    <div className="flex flex-col gap-16 pb-20 lg:gap-24">
      <section className="relative overflow-hidden">
        <div
          className="seed-grid pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-[var(--container-content)] px-4 pt-10 pb-12 lg:px-10 lg:pt-24 lg:pb-20">
          <span className={pill}>{hero.eyebrow}</span>

          <h1 className="mt-6 max-w-[20ch] text-display-2xl text-fg">{hero.headline}</h1>

          <p className="mt-6 max-w-[52ch] text-body-lg text-fg-muted">{hero.subheadline}</p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              to={hero.cta_href}
              className="inline-flex h-[var(--control-lg)] items-center rounded-full bg-highlight px-7 text-label font-semibold text-on-highlight transition-colors duration-[var(--duration-fast)] ease-standard hover:bg-highlight-hover"
            >
              {hero.cta_label}
            </Link>
            <Link
              to="/contact"
              className="inline-flex h-[var(--control-lg)] items-center gap-2 rounded-full px-5 text-label font-semibold text-fg-muted transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-fg"
            >
              Store hours and location
              <CaretRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <p
            aria-hidden="true"
            className="pointer-events-none absolute right-12 bottom-8 hidden -rotate-6 font-hand text-annotation text-fg-muted lg:block"
          >
            fresh stock ↘
          </p>

          <span
            aria-hidden="true"
            className="absolute top-16 right-10 hidden items-center gap-1.5 rounded-full bg-tile-mint px-3 py-1.5 text-caption font-semibold text-fg lg:inline-flex"
          >
            <Cursor size={14} weight="fill" />
            Store pickup
          </span>
        </div>
      </section>

      {strip.length > 0 ? <CurvedCarousel items={strip} /> : null}

      <section className="mx-auto grid w-full max-w-[var(--container-content)] gap-[var(--tile-gap)] px-4 lg:grid-cols-12 lg:px-10">
        <article className="relative overflow-hidden rounded-2xl bg-tile-mint p-7 lg:col-span-8 lg:p-9">
          <div
            className="halftone pointer-events-none absolute inset-y-0 right-0 w-1/2"
            aria-hidden="true"
          />
          <div className="relative flex h-full max-w-[46ch] flex-col gap-3">
            <span className="inline-flex h-7 w-fit items-center rounded-full bg-surface px-3 text-caption font-semibold text-fg">
              {pinned ? "Pinned announcement" : "From the store"}
            </span>
            <h2 className="text-heading-md text-fg">
              {feature?.title ?? "Seeds, feeds and tools for this planting season"}
            </h2>
            {feature?.body ? (
              <p className="text-body-sm text-fg-muted">{feature.body}</p>
            ) : (
              <p className="text-body-sm text-fg-muted">
                Browse the catalog to see what is on the shelf today.
              </p>
            )}
            <Link
              to={pinned ? "/announcements" : "/products"}
              className="mt-auto inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-surface px-4 text-label font-semibold text-fg"
            >
              {pinned ? "Read the notice" : "Shop the catalog"}
              <CaretRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </article>

        <article className="flex flex-col justify-between gap-6 rounded-2xl bg-tile-bloom p-7 lg:col-span-4">
          <div className="flex flex-col gap-1">
            <span className="text-caption font-semibold text-fg-muted">In stock today</span>
            <p className="text-stat-lg text-fg tabular-nums">{inStock}</p>
            <p className="text-body-sm text-fg-muted">
              {inStock === 1 ? "product ready on the shelf" : "products ready on the shelf"}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label font-semibold text-fg">Store hours</span>
            <p className="text-body-sm text-fg-muted">{store?.hours ?? "Ask the store for hours."}</p>
            <Link
              to="/contact"
              className="mt-2 inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-surface px-4 text-label font-semibold text-fg"
            >
              Map and directions
              <CaretRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>

      {banners.length > 0 ? (
        <section className="mx-auto w-full max-w-[var(--container-wide)] px-4 lg:px-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <span className={pill}>Store updates</span>
              <h2 className="text-heading-lg text-fg">What is happening</h2>
            </div>
          </div>

          <div className="grid gap-[var(--tile-gap)] sm:grid-cols-2 lg:grid-cols-3">
            {banners.map((banner, index) => {
              const image = banner.image_url?.trim();
              const title = banner.title?.trim() || "From the store";
              const body = banner.body?.trim();
              const href = banner.href?.trim() || "/products";

              return (
                <BannerLink
                  key={`${title}-${index}`}
                  href={href}
                  className={cn(
                    "group relative flex min-h-44 flex-col justify-end overflow-hidden rounded-xl p-6 transition-transform duration-[var(--duration-base)] ease-standard hover:-translate-y-1",
                    image ? "bg-tile-inverse" : "bg-tile-surface",
                  )}
                >
                  {image ? (
                    <>
                      <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-[var(--duration-slow)] ease-standard group-hover:scale-105"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-tile-inverse via-tile-inverse/80 to-transparent"
                      />
                    </>
                  ) : null}

                  <span className="relative flex flex-col gap-1.5">
                    <span
                      className={cn(
                        "text-heading-sm",
                        image ? "text-on-inverse" : "text-fg",
                      )}
                    >
                      {title}
                    </span>
                    {body ? (
                      <span
                        className={cn(
                          "line-clamp-2 text-body-sm",
                          image ? "text-on-inverse/80" : "text-fg-muted",
                        )}
                      >
                        {body}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "mt-2 inline-flex items-center gap-1 text-label font-semibold",
                        image ? "text-on-inverse" : "text-primary-text",
                      )}
                    >
                      Read more
                      <CaretRight size={16} aria-hidden="true" />
                    </span>
                  </span>
                </BannerLink>
              );
            })}
          </div>
        </section>
      ) : null}

      {categoryTiles.length > 0 ? (
        <section className="mx-auto w-full max-w-[var(--container-content)] px-4 lg:px-10">
          <ul className="grid grid-cols-2 gap-[var(--tile-gap)] lg:grid-cols-12">
            {categoryTiles.map((category, index) => {
              const image = catalogue.find(
                (product) => product.category_id === category.id && product.image_url,
              )?.image_url;

              return (
                <li key={category.id} className={bentoLayout[index % bentoLayout.length]}>
                  <Link
                    to={`/products?category=${category.id}`}
                    className="group relative flex h-full flex-col justify-end overflow-hidden rounded-xl bg-muted p-5 transition-transform duration-[var(--duration-base)] ease-standard hover:-translate-y-1"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-[var(--duration-slow)] ease-standard group-hover:scale-105"
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-tile-inverse via-tile-inverse/80 to-transparent"
                    />
                    <span className="relative flex items-center justify-between gap-3">
                      <span className="text-heading-sm text-on-inverse">{category.name}</span>
                      <CaretRight
                        size={18}
                        aria-hidden="true"
                        className="shrink-0 text-on-inverse/60 transition-colors duration-[var(--duration-fast)] group-hover:text-on-inverse"
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-[var(--container-wide)] px-4 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-2">
            <span className={pill}>In the store</span>
            <h2 className="text-heading-lg text-fg">Featured this week</h2>
          </div>
          <Link
            to="/products"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-muted px-4 text-label font-semibold text-fg"
          >
            See all products
            <CaretRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {products.loading && showcase.length === 0 ? <LoadingLines rows={3} /> : null}

        {!products.loading && showcase.length === 0 ? (
          <p className="text-body-md text-fg-muted">
            No products are published yet. The catalog appears here as soon as the store adds stock.
          </p>
        ) : null}

        {showcase.length > 0 ? (
          <div className="grid grid-cols-2 gap-[var(--tile-gap)] md:grid-cols-3 lg:grid-cols-4">
            {showcase.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="mx-auto grid w-full max-w-[var(--container-content)] gap-10 px-4 lg:grid-cols-[1.3fr_1fr] lg:px-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <span className={pill}>From the store</span>
              <h2 className="text-heading-lg text-fg">Announcements</h2>
            </div>
            <Link
              to="/announcements"
              className="text-label font-semibold text-primary-text hover:underline"
            >
              All announcements
            </Link>
          </div>

          {announcements.loading && published.length === 0 ? <LoadingLines rows={2} /> : null}

          {!announcements.loading && published.length === 0 ? (
            <p className="text-body-md text-fg-muted">No announcements have been published yet.</p>
          ) : null}

          {pinned ? (
            <article className="flex flex-col gap-2 rounded-xl bg-tile-surface p-6">
              <p className="text-caption font-semibold text-highlight-text">Pinned</p>
              <h3 className="text-heading-md text-fg">{pinned.title}</h3>
              <p className="max-w-[65ch] text-body-md text-fg-muted">{pinned.body}</p>
              <p className="text-caption text-fg-subtle">{formatDate(pinned.published_at)}</p>
            </article>
          ) : null}

          {latest.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {latest.map((item) => (
                <li key={item.id} className="rounded-xl bg-tile-surface p-6">
                  <p className="text-caption text-fg-subtle">{formatDate(item.published_at)}</p>
                  <h3 className="mt-1 text-heading-sm text-fg">{item.title}</h3>
                  <p className="mt-1 max-w-[65ch] text-body-sm text-fg-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-heading-sm text-fg">Season timeline</h2>
          <ol className="relative flex flex-col gap-6">
            <span className="absolute inset-y-1 left-1 w-0.5 bg-muted" aria-hidden="true" />
            {(published.length > 0 ? published.slice(0, 4) : []).map((item, index) => (
              <li key={item.id} className="relative pl-7">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-2 left-0.5 size-2.5 rounded-full bg-viz-ghost",
                    index === 0 && "bg-primary",
                  )}
                />
                <p className="text-caption text-fg-subtle tabular-nums">
                  {formatDate(item.published_at)}
                </p>
                <p className="text-label font-semibold text-fg">{item.title}</p>
                <p className="text-body-sm text-fg-muted">{item.body}</p>
              </li>
            ))}
          </ol>

          {store ? (
            <div className="mt-2 flex flex-col gap-1 rounded-2xl bg-warm p-7">
              <span className="text-caption font-semibold text-warning-text">Visit the store</span>
              {store.address ? (
                <p className="mt-1 text-body-lg text-fg">{store.address}</p>
              ) : null}
              {store.hours ? <p className="text-body-sm text-fg-muted">{store.hours}</p> : null}
              <Link
                to="/contact"
                className="mt-3 inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-surface px-4 text-label font-semibold text-fg"
              >
                Map and directions
                <CaretRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
