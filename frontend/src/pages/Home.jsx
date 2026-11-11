import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { LoadingLines } from "../components/AsyncState.jsx";
import { asList, formatDate } from "@/lib/format.js";
import { useContent } from "@/lib/content.js";
import { useApi } from "@/lib/useApi.js";

/* FR-13. Hero and banners from GET /content, featured products and the latest plus
   pinned announcements. Nothing on this page is hard-coded except the fallback hero
   used while site_content is empty. */
export default function Home() {
  const { hero, banners, store } = useContent();
  const products = useApi("/products?limit=12");
  const announcements = useApi("/announcements");

  const catalogue = asList(products.data);
  const flagged = catalogue.filter((product) => product.is_featured);
  const showcase = flagged.length > 0 ? flagged.slice(0, 8) : catalogue.slice(0, 4);

  const published = asList(announcements.data);
  const pinned = published.find((item) => item.is_pinned);
  const latest = published.filter((item) => item.id !== pinned?.id).slice(0, 2);

  return (
    <div className="flex flex-col gap-16 pb-16 lg:gap-24">
      <section className="bg-tint">
        <div className="mx-auto flex w-full max-w-[var(--container-content)] flex-col gap-6 px-4 py-16 lg:px-10 lg:py-32">
          <p className="text-eyebrow font-bold text-primary-text uppercase">{hero.eyebrow}</p>
          <h1 className="max-w-[22ch] text-display-xl text-fg">{hero.headline}</h1>
          <p className="max-w-[60ch] text-body-lg text-fg-muted">{hero.subheadline}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={hero.cta_href}
              className="inline-flex h-[var(--control-lg)] items-center rounded-full bg-primary px-6 text-label font-semibold text-on-primary hover:bg-primary-hover"
            >
              {hero.cta_label}
            </Link>
            <Link
              to="/contact"
              className="inline-flex h-[var(--control-lg)] items-center rounded-full bg-primary-subtle px-6 text-label font-semibold text-primary-text hover:bg-primary-subtle/70"
            >
              Store hours and location
            </Link>
          </div>
        </div>
      </section>

      {banners.length > 0 ? (
        <section className="mx-auto w-full max-w-[var(--container-content)] px-4 lg:px-10">
          <div className="flex flex-col gap-3 rounded-xl bg-accent-subtle p-6">
            {banners.map((banner, index) => (
              <div key={banner.id ?? index} className="flex flex-col gap-1">
                <p className="text-heading-sm text-accent-text">{banner.title}</p>
                {banner.body ? <p className="text-body-sm text-fg-muted">{banner.body}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-[var(--container-wide)] px-4 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-eyebrow font-bold text-primary-text uppercase">In the store</p>
            <h2 className="mt-2 text-heading-lg text-fg">Featured this week</h2>
          </div>
          <Link to="/products" className="text-label font-semibold text-primary-text hover:underline">
            See all products
          </Link>
        </div>

        {products.loading && showcase.length === 0 ? <LoadingLines rows={3} /> : null}

        {!products.loading && showcase.length === 0 ? (
          <p className="text-body-md text-fg-muted">
            No products are published yet. The catalog appears here as soon as the store adds stock.
          </p>
        ) : null}

        {showcase.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {showcase.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="mx-auto w-full max-w-[var(--container-content)] px-4 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-eyebrow font-bold text-primary-text uppercase">From the store</p>
            <h2 className="mt-2 text-heading-lg text-fg">Announcements</h2>
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
          <article className="flex flex-col gap-2 rounded-xl bg-surface p-6">
            <p className="text-caption text-accent-text uppercase">Pinned</p>
            <h3 className="text-heading-md text-fg">{pinned.title}</h3>
            <p className="max-w-[65ch] text-body-md text-fg-muted">{pinned.body}</p>
            <p className="text-caption text-fg-subtle">{formatDate(pinned.published_at)}</p>
          </article>
        ) : null}

        {latest.length > 0 ? (
          <ul className="mt-6 flex flex-col gap-6">
            {latest.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <p className="text-caption text-fg-subtle">{formatDate(item.published_at)}</p>
                <h3 className="text-heading-sm text-fg">{item.title}</h3>
                <p className="max-w-[65ch] text-body-sm text-fg-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {store ? (
        <section className="mx-auto w-full max-w-[var(--container-content)] px-4 lg:px-10">
          <p className="text-eyebrow font-bold text-primary-text uppercase">Visit the store</p>
          <div className="mt-4 flex flex-col gap-1">
            {store.address ? <p className="text-body-lg text-fg">{store.address}</p> : null}
            {store.hours ? <p className="text-body-sm text-fg-muted">{store.hours}</p> : null}
            <Link
              to="/contact"
              className="mt-2 text-label font-semibold text-primary-text hover:underline"
            >
              Map and directions
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
