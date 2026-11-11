import PagePlaceholder from "../components/PagePlaceholder.jsx";

/* FR-18. Phase 4: date range, four report types, CSV download, print-to-PDF. */
export default function Reports() {
  return (
    <PagePlaceholder
      title="Reports"
      note="Sales, inventory, low-stock and top-products reports with CSV download land in Phase 4 against GET /reports/:type. PDF is the browser print view."
    />
  );
}
