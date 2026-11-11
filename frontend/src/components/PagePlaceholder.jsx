/* Canvas placeholder for a page whose phase has not landed yet. Tokens only. */
export default function PagePlaceholder({ eyebrow, title, note }) {
  return (
    <section className="mx-auto w-full max-w-[var(--container-content)] px-4 py-16 lg:px-10 lg:py-32">
      {eyebrow ? (
        <p className="mb-3 text-eyebrow font-bold text-primary-text uppercase">{eyebrow}</p>
      ) : null}
      <h1 className="text-display-lg text-fg">{title}</h1>
      <p className="mt-4 max-w-[65ch] text-body-md text-fg-muted">{note}</p>
    </section>
  );
}
