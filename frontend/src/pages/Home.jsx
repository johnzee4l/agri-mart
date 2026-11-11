import { Link } from "react-router-dom";

/* Home (FR-13). Phase 2 replaces this copy with GET /content, featured products
   and the latest + pinned announcements. */
export default function Home() {
  return (
    <section className="bg-tint">
      <div className="mx-auto flex w-full max-w-[var(--container-content)] flex-col gap-6 px-4 py-16 lg:px-10 lg:py-32">
        <p className="text-eyebrow font-bold text-primary-text uppercase">Agricultural supply store</p>
        <h1 className="max-w-[22ch] text-display-xl text-fg">
          Everything the farm needs, priced and in stock.
        </h1>
        <p className="max-w-[60ch] text-body-lg text-fg-muted">
          Seeds, fertilizers, feeds, tools and irrigation supplies for farmers, backyard growers and
          livestock raisers. Order online for delivery or store pickup.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/products"
            className="inline-flex h-[var(--control-lg)] items-center rounded-full bg-primary px-6 text-label font-semibold text-on-primary hover:bg-primary-hover"
          >
            Browse products
          </Link>
          <Link
            to="/contact"
            className="inline-flex h-[var(--control-lg)] items-center rounded-full bg-primary-subtle px-6 text-label font-semibold text-primary-text hover:bg-primary-subtle/70"
          >
            Store hours and location
          </Link>
        </div>
        <p className="text-caption text-fg-muted">
          Phase 1 scaffold: this hero is replaced by the site content API in Phase 2.
        </p>
      </div>
    </section>
  );
}
