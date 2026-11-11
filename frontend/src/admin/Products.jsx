import PagePlaceholder from "../components/PagePlaceholder.jsx";

/* FR-3, FR-23. Phase 2: create, edit, image upload, Active/Archived tabs, purge. */
export default function AdminProducts() {
  return (
    <PagePlaceholder
      title="Products and categories"
      note="Create, edit, archive, restore and purge land in Phase 2 on top of the catalog routes. Archive is a soft delete via deleted_at."
    />
  );
}
