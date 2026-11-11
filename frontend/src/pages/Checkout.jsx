import PagePlaceholder from "../components/PagePlaceholder.jsx";

/* FR-5, FR-6, FR-19. Phase 3: four-step stepper, address and map pin, delivery fee,
   PayMongo redirect and the order status poller. */
export default function Checkout() {
  return (
    <PagePlaceholder
      eyebrow="Checkout"
      title="Checkout"
      note="Fulfillment, address and map pin, payment and review arrive in Phase 3 against POST /orders and POST /payments."
    />
  );
}
