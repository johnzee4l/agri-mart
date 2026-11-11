import PagePlaceholder from "../components/PagePlaceholder.jsx";

/* FR-12, FR-13. Phase 2: card list from GET /announcements, pinned item first. */
export default function Announcements() {
  return (
    <PagePlaceholder
      eyebrow="Store news"
      title="Announcements"
      note="Published announcements, pinned first, land in Phase 2 against GET /announcements."
    />
  );
}
