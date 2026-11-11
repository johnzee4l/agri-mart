import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash } from "@phosphor-icons/react";
import { EmptyState } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import { formatPHP } from "@/lib/format.js";
import { useCart } from "@/lib/cart.jsx";

/* FR-4. Cart rows on canvas with no dividers; the order summary panel is one of the
   surfaces the card policy allows (designtokens 8.5, 12). Totals here are
   informational: the server recalculates them at checkout. */
export default function Cart() {
  const { items, count, subtotal, setQuantity, remove } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <section className="mx-auto w-full max-w-[var(--container-content)] px-4 py-10 lg:px-10 lg:py-16">
        <p className="text-eyebrow font-bold text-primary-text uppercase">Cart</p>
        <h1 className="mt-2 text-display-lg text-fg">Your cart</h1>
        <EmptyState
          title="Your cart is empty"
          body="Browse the catalog to add seeds, fertilizers, feeds, tools or irrigation supplies."
        />
        <div className="flex justify-center">
          <Link
            to="/products"
            className="inline-flex h-[var(--control-md)] items-center rounded-full bg-primary px-5 text-label font-semibold text-on-primary hover:bg-primary-hover"
          >
            Browse products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[var(--container-wide)] px-4 py-10 lg:px-10 lg:py-16">
      <header className="flex flex-col gap-2">
        <p className="text-eyebrow font-bold text-primary-text uppercase">Cart</p>
        <h1 className="text-display-lg text-fg">Your cart</h1>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <ul className="flex flex-col gap-6">
          {items.map((item) => {
            const atStockLimit = item.stock_qty > 0 && item.quantity >= item.stock_qty;

            return (
              <li key={item.id} className="flex flex-wrap items-start gap-4">
                <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>

                <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
                  <Link
                    to={`/products/${item.id}`}
                    className="text-heading-sm text-fg hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="text-caption text-fg-muted tabular-nums">
                    {formatPHP(item.price)}
                    {item.unit ? ` per ${item.unit}` : ""}
                  </p>
                  {atStockLimit ? (
                    <p className="text-caption text-warning-text">Only {item.stock_qty} left in stock.</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.name}`}
                    onClick={() => setQuantity(item.id, item.quantity - 1)}
                    className="flex size-9 items-center justify-center rounded-full bg-muted text-fg hover:bg-muted/70"
                  >
                    <Minus size={16} weight="bold" aria-hidden="true" />
                  </button>
                  <span className="w-8 text-center text-body-md font-semibold text-fg tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.name}`}
                    disabled={atStockLimit}
                    onClick={() => setQuantity(item.id, item.quantity + 1)}
                    className="flex size-9 items-center justify-center rounded-full bg-muted text-fg hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Plus size={16} weight="bold" aria-hidden="true" />
                  </button>
                </div>

                <span className="w-24 text-right text-body-md font-semibold text-fg tabular-nums">
                  {formatPHP(item.price * item.quantity)}
                </span>

                <button
                  type="button"
                  aria-label={`Remove ${item.name} from cart`}
                  onClick={() => remove(item.id)}
                  className="flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-danger-subtle hover:text-danger-text"
                >
                  <Trash size={20} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>

        <aside className="flex flex-col gap-3 rounded-xl bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="text-heading-sm text-fg">Order summary</h2>
          <div className="flex items-center justify-between text-body-sm text-fg-muted">
            <span>Items</span>
            <span className="text-fg tabular-nums">{count}</span>
          </div>
          <div className="flex items-center justify-between text-body-md font-semibold text-fg">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPHP(subtotal)}</span>
          </div>
          <p className="text-caption text-fg-subtle">
            Delivery fee and the final total are calculated by the store at checkout.
          </p>
          <Button size="lg" onClick={() => navigate("/checkout")}>
            Proceed to checkout
          </Button>
        </aside>
      </div>
    </section>
  );
}
