import { Link } from "react-router-dom";
import { EmptyState } from "../components/AsyncState.jsx";

/* Unknown URLs used to leave <main> empty, which looks like a broken page. This
   keeps the storefront frame and offers the two useful ways back. */
export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-[var(--container-content)] px-4 py-10 lg:px-10 lg:py-16">
      <p className="inline-flex h-7 items-center rounded-full bg-primary-subtle px-3 text-caption font-semibold text-primary-text">
        Page not found
      </p>
      <h1 className="mt-3 text-display-lg text-fg">We could not find that page</h1>

      <EmptyState
        title="The link may be old or mistyped"
        body="Everything else is still here: browse the catalog or head back to the home page."
      />

      <div className="flex flex-wrap justify-center gap-2">
        <Link
          to="/products"
          className="inline-flex h-[var(--control-md)] items-center rounded-full bg-primary px-5 text-label font-semibold text-on-primary hover:bg-primary-hover"
        >
          Browse products
        </Link>
        <Link
          to="/"
          className="inline-flex h-[var(--control-md)] items-center rounded-full bg-muted px-5 text-label font-semibold text-fg hover:bg-muted/80"
        >
          Go home
        </Link>
      </div>
    </section>
  );
}
