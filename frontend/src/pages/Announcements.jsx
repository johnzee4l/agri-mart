import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import { asList, formatDate } from "@/lib/format.js";
import { useApi } from "@/lib/useApi.js";

/* FR-12, FR-13. Published announcements, pinned first. Editorial list on canvas
   with at most one feature surface (designtokens 8.5, 12). */
export default function Announcements() {
  const { data, error, loading, reload } = useApi("/announcements");
  const items = asList(data);

  const pinned = items.find((item) => item.is_pinned);
  const rest = items.filter((item) => item.id !== pinned?.id);

  return (
    <section className="mx-auto w-full max-w-[var(--container-content)] px-4 py-10 lg:px-10 lg:py-16">
      <header className="flex flex-col gap-2">
        <p className="text-eyebrow font-bold text-primary-text uppercase">Store news</p>
        <h1 className="text-display-lg text-fg">Announcements</h1>
        <p className="text-body-sm text-fg-muted">
          Promos, planting reminders and product advisories from the store.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-8">
        {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
        {loading && items.length === 0 ? <LoadingLines rows={3} /> : null}

        {!loading && !error && items.length === 0 ? (
          <EmptyState
            title="Nothing published yet"
            body="Announcements appear here when the store publishes them."
          />
        ) : null}

        {pinned ? (
          <article className="flex flex-col gap-2 rounded-xl bg-surface p-6">
            <p className="text-caption text-accent-text uppercase">Pinned</p>
            <h2 className="text-heading-md text-fg">{pinned.title}</h2>
            <p className="text-caption text-fg-subtle">{formatDate(pinned.published_at)}</p>
            <p className="max-w-[65ch] text-body-md text-fg-muted">{pinned.body}</p>
          </article>
        ) : null}

        {rest.length > 0 ? (
          <ul className="flex flex-col gap-8">
            {rest.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <p className="text-caption text-fg-subtle">{formatDate(item.published_at)}</p>
                <h2 className="text-heading-md text-fg">{item.title}</h2>
                <p className="max-w-[65ch] text-body-md text-fg-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
