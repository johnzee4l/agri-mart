import PagePlaceholder from "../components/PagePlaceholder.jsx";

/* FR-4. Phase 3: item rows, quantity control, live totals from lib/cart.jsx. */
export default function Cart() {
  return (
    <PagePlaceholder
      eyebrow="Cart"
      title="Your cart"
      note="The cart lives in localStorage (lib/cart.jsx) from Phase 3. Totals are recalculated on the server at checkout."
    />
  );
}
