import PagePlaceholder from "../components/PagePlaceholder.jsx";

/* FR-16. Phase 3 or 4 (C5): list users, change role, activate and deactivate. */
export default function Users() {
  return (
    <PagePlaceholder
      title="Users"
      note="Role changes and activation land once the users routes merge. Staff must never reach this page; the route guard returns an admin-only 403 from the API."
    />
  );
}
