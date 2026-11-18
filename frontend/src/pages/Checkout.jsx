import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.jsx";
import { useCart } from "@/lib/cart.jsx";
import { useContent } from "@/lib/content.js";
import { formatPHP } from "@/lib/format.js";
import { useOnline } from "@/lib/useOnline.js";
import { PAYMENT_METHODS, readOrderCreation } from "@/lib/orders.js";
import {
  attachIntent,
  createPaymentMethod,
  PAYMONGO_READY,
  parseCardExpiry,
  redirectUrlFor,
} from "@/lib/paymongo.js";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import Stepper from "../components/Stepper.jsx";
import { EmptyState } from "../components/AsyncState.jsx";
import { cn } from "@/lib/cn.js";

/* FR-5, FR-6, FR-19. Store pickup only: the store holds the order at the counter, so
   there is no address, no pin and no delivery fee. Three steps on canvas, one at a
   time (designtokens 12). */
const STEPS = ["Pickup", "Payment", "Review"];
const EMPTY_CARD = { card_number: "", expiry: "", cvc: "" };

function OptionButton({ selected, onClick, title, note, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-start gap-3 rounded-md p-4 text-left transition-colors duration-[var(--duration-fast)]",
        "disabled:pointer-events-none disabled:opacity-40",
        selected ? "bg-primary-subtle text-primary-text" : "bg-muted hover:bg-muted/70",
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-label font-semibold text-fg">{title}</span>
        {note ? <span className="text-caption text-fg-muted">{note}</span> : null}
      </span>
    </button>
  );
}

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { profile } = useAuth();
  const content = useContent();
  const navigate = useNavigate();
  const online = useOnline();

  const [step, setStep] = useState(0);
  const [method, setMethod] = useState("cod");
  const [card, setCard] = useState(EMPTY_CARD);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [placing, setPlacing] = useState(false);

  const setCardField = (field) => (event) => {
    setCard((current) => ({ ...current, [field]: event.target.value }));
  };

  function validateStep(index) {
    const found = {};

    if (index === 1 && method !== "cod" && !PAYMONGO_READY) {
      found.payment = "Online payment is not configured yet. Choose cash on pickup.";
    }

    if (index === 1 && method === "card") {
      if (card.card_number.replace(/\s+/g, "").length < 12) {
        found.card_number = "Enter the card number.";
      }
      if (!parseCardExpiry(card.expiry)) found.expiry = "Use MM/YY.";
      if (card.cvc.length < 3) found.cvc = "Enter the CVC.";
    }

    return found;
  }

  const goNext = () => {
    const found = validateStep(step);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  async function placeOrder() {
    if (!online) {
      setFormError("You are offline. Reconnect before placing the order.");
      return;
    }

    setPlacing(true);
    setFormError(null);

    try {
      const response = await api.post("/orders", {
        items: items.map((item) => ({ product_id: item.id, qty: item.quantity })),
        fulfillment_type: "pickup",
        method,
      });

      const { order, intentId, clientKey } = readOrderCreation(response);
      if (!order?.id) throw new Error("The store did not return an order number.");

      // The order exists from here on. The cart is only cleared once we know where
      // to send the customer, so a payment failure cannot lose their basket.
      if (method === "cod") {
        clear();
        navigate(`/orders/${order.id}`, { replace: true });
        return;
      }

      if (!intentId || !clientKey) {
        clear();
        navigate(`/orders/${order.id}`, {
          replace: true,
          state: {
            paymentError:
              "The order was created, but the store did not return a payment intent. Pay when you collect it or contact the store.",
          },
        });
        return;
      }

      const expiry = parseCardExpiry(card.expiry);
      try {
        const paymentMethod = await createPaymentMethod({
          type: method,
          card:
            method === "card"
              ? {
                  card_number: card.card_number.replace(/\s+/g, ""),
                  exp_month: expiry?.exp_month,
                  exp_year: expiry?.exp_year,
                  cvc: card.cvc,
                }
              : undefined,
        });

        const intent = await attachIntent({
          intentId,
          paymentMethodId: paymentMethod?.id,
          clientKey,
          returnUrl: `${window.location.origin}/orders/${order.id}`,
        });

        clear();
        const redirect = redirectUrlFor(intent);
        if (redirect) {
          window.location.assign(redirect);
          return;
        }

        navigate(`/orders/${order.id}`, { replace: true });
      } catch (paymentError) {
        // The order stays pending; keep the customer on it with the reason shown.
        clear();
        navigate(`/orders/${order.id}`, {
          replace: true,
          state: {
            paymentError: paymentError.message ?? "The payment could not be started.",
          },
        });
      }
    } catch (error) {
      setFormError(error.message ?? "Could not place the order.");
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto w-full max-w-[var(--container-content)] px-4 py-10 lg:px-10 lg:py-16">
        <p className="inline-flex h-7 items-center rounded-full bg-primary-subtle px-3 text-caption font-semibold text-primary-text">Checkout</p>
        <h1 className="mt-2 text-display-lg text-fg">Checkout</h1>
        <EmptyState
          title="Nothing to check out"
          body="Your cart is empty. Add items from the catalog first."
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
        <p className="inline-flex h-7 items-center rounded-full bg-primary-subtle px-3 text-caption font-semibold text-primary-text">Checkout</p>
        <h1 className="text-display-lg text-fg">Complete your order</h1>
      </header>

      <div className="mt-6">
        <Stepper steps={STEPS} current={step} onSelect={setStep} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex flex-col gap-6">
          {step === 0 ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-heading-sm text-fg">Collect from the store</h2>
              <p className="text-body-md text-fg-muted">
                Orders are held at the counter during store hours. There is no delivery
                option and no delivery fee.
              </p>

              <div className="flex flex-col gap-1 rounded-md bg-muted p-4">
                <p className="flex items-center gap-2 text-label font-semibold text-fg">
                  <Package size={20} className="text-primary-text" aria-hidden="true" />
                  {content.store?.address ?? "Store address is published on the Contact page."}
                </p>
                {content.store?.hours ? (
                  <p className="text-body-sm text-fg-muted">{content.store.hours}</p>
                ) : null}
                <Link
                  to="/contact"
                  className="mt-1 text-label font-semibold text-primary-text hover:underline"
                >
                  Map and directions
                </Link>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-heading-sm text-fg">How would you like to pay?</h2>
              <div className="flex flex-col gap-2">
                {PAYMENT_METHODS.map((option) => (
                  <OptionButton
                    key={option.value}
                    selected={method === option.value}
                    onClick={() => setMethod(option.value)}
                    title={option.label}
                    note={
                      option.value !== "cod" && !PAYMONGO_READY
                        ? "Unavailable: online payment is not configured yet."
                        : option.note
                    }
                    disabled={option.value !== "cod" && !PAYMONGO_READY}
                  />
                ))}
              </div>

              {errors.payment ? (
                <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
                  {errors.payment}
                </p>
              ) : null}

              {method === "card" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      label="Card number"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={card.card_number}
                      onChange={setCardField("card_number")}
                      error={errors.card_number}
                    />
                  </div>
                  <Input
                    label="Expiry (MM/YY)"
                    autoComplete="cc-exp"
                    value={card.expiry}
                    onChange={setCardField("expiry")}
                    error={errors.expiry}
                  />
                  <Input
                    label="CVC"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={card.cvc}
                    onChange={setCardField("cvc")}
                    error={errors.cvc}
                  />
                </div>
              ) : null}

              {method !== "cod" ? (
                <p className="text-caption text-fg-subtle">
                  You will be sent to PayMongo to finish the payment, then returned to your order.
                  {PAYMONGO_READY ? "" : " Online payment needs VITE_PAYMONGO_PUBLIC_KEY."}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-5">
              <h2 className="text-heading-sm text-fg">Check everything before placing it</h2>

              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3">
                    <span className="text-body-md text-fg">
                      {item.name}
                      <span className="text-fg-muted tabular-nums"> × {item.quantity}</span>
                    </span>
                    <span className="text-body-md font-semibold text-fg tabular-nums">
                      {formatPHP(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="flex flex-col gap-2 text-body-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted">Fulfillment</dt>
                  <dd className="text-fg">Store pickup</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted">Collect at</dt>
                  <dd className="text-right text-fg">
                    {content.store?.address ?? "AgriMart store"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted">Payment</dt>
                  <dd className="text-fg">
                    {PAYMENT_METHODS.find((option) => option.value === method)?.label ?? method}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted">Customer</dt>
                  <dd className="text-fg">{profile?.full_name ?? profile?.email ?? "Signed in"}</dd>
                </div>
              </dl>

              {formError ? (
                <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
                  {formError}
                </p>
              ) : null}

              <Button
                size="lg"
                loading={placing}
                disabled={!online}
                onClick={placeOrder}
                className="self-start"
              >
                Place order
              </Button>
              {online ? null : (
                <p role="status" className="text-caption font-semibold text-warning-text">
                  You are offline. Reconnect to place this order; nothing has been charged.
                </p>
              )}
              <p className="text-caption text-fg-subtle">
                Prices and stock are confirmed by the store when the order is placed.
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              disabled={step === 0 || placing}
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={goNext}>
                Continue
              </Button>
            ) : null}
          </div>
        </div>

        <aside className="flex flex-col gap-3 rounded-xl bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="text-heading-sm text-fg">Order summary</h2>
          <div className="flex items-center justify-between text-body-sm text-fg-muted">
            <span>Subtotal</span>
            <span className="text-fg tabular-nums">{formatPHP(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-body-sm text-fg-muted">
            <span>Pickup</span>
            <span className="text-fg tabular-nums">Free</span>
          </div>
          <div className="flex items-center justify-between text-body-md font-semibold text-fg">
            <span>Total (estimate)</span>
            <span className="tabular-nums">{formatPHP(subtotal)}</span>
          </div>
          <p className="text-caption text-fg-subtle">
            The final total is recalculated by the store from live prices and stock.
          </p>
        </aside>
      </div>
    </section>
  );
}
