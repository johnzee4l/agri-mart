import { useParams } from "react-router-dom";
import PagePlaceholder from "../components/PagePlaceholder.jsx";

/* FR-1. Phase 2: photo, description, price, stock status, quantity, add to cart. */
export default function ProductDetail() {
  const { id } = useParams();

  return (
    <PagePlaceholder
      eyebrow="Catalog"
      title="Product detail"
      note={`Product ${id ?? "(no id)"}: layout and add-to-cart morph land in Phase 2 against GET /products/:id.`}
    />
  );
}
