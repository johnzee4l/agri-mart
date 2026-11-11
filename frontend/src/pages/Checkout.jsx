import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, Truck } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.jsx";
import { useCart } from "@/lib/cart.jsx";
import { useContent } from "@/lib/content.js";
import { useApi } from "@/lib/useApi.js";
import { asList, formatPHP } from "@/lib/format.js";
import { useOnline } from "@/lib/useOnline.js";
import { estimateDeliveryFee } from "@/lib/fee.js";
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
import MapPicker from "../components/MapPicker.jsx";
import Stepper from "../components/Stepper.jsx";
import { EmptyState } from "../components/AsyncState.jsx";
import { cn } from "@/lib/cn.js";

/* FR-5, FR-6, FR-19. Four steps on canvas, one at a time: fulfilment, address and
   pin, payment, review (designtokens 12). */
const STEPS = ["Fulfillment", "Address and pin", "Payment", "Review"];
const EMPTY_ADDRESS = { street: "", barangay: "", municipality: "", province: "" };
const EMPTY_CARD = { card_number: "", expiry: "", cvc: "" };

function OptionButton({ selected, onClick, icon: Icon, title, note, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-start gap-3 rounded-md p-4 text-left transition-colors duration-[var(--duration-fast)]",
        "disabled:pointer-events-none disabled:opacity-40",
        selected ? "bg-primary-subtle ring-2 ring-primary" : "bg-muted hover:bg-muted/70",
      )}
    >
      {Icon ? (
        <Icon
          size={24}
          className={selected ? "text-primary-text" : "text-fg-muted"}
          aria-hidden="true"
        />
      ) : null}
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
  const addresses = useApi("/me/addresses");
  const navigate = useNavigate();
  const online = useOnline();

  const [step, setStep] = useState(0);
  const [fulfillment, setFulfillment] = useState("delivery");
  const [addressId, setAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
  const [pin, setPin] = useState(null);
  const [method, setMethod] = useState("cod");
  const [card, setCard] = useState(EMPTY_CARD);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [placing, setPlacing] = useState(false);

  const addressList = asList(addresses.data);

  useEffect(() => {
    if (addressId) return;
    if (addressList.length === 0) return;
    const preferred = addressList.find((address) => address.is_default) ?? addressList[0];
    setAddressId(preferred.id);
    if (preferred.latitude && preferred.longitude) {
      setPin({ lat: Number(preferred.latitude), lng: Number(preferred.longitude) });
    }
    // addressList is derived from addresses.data, which is listed here.
  }, [addresses.data, addressId, addressList]);

  const selectedAddress = addressList.find((address) => address.id === addressId) ?? null;

  const storePoint = content.store
    ? { latitude: content.store.latitude, longitude: content.store.longitude }
    : null;
  const deliveryPin =
    pin ?? (selectedAddress ? { lat: selectedAddress.latitude, lng: selectedAddress.longitude } : null);
  const estimatedFee =
    fulfillment === "delivery"
      ? estimateDeliveryFee({ store: storePoint, pin: deliveryPin, rates: content.rates })
      : 0;

  const setAddressField = (field) => (event) => {
    setNewAddress((current) => ({ ...current, [field]: event.target.value }));
  };

  const setCardField = (field) => (event) => {
    setCard((current) => ({ ...current, [field]: event.target.value }));
  };

  function validateStep(index) {
    const found = {};

    if (index === 1 && fulfillment === "delivery" && !addressId) {
      if (!newAddress.street.trim()) found.street = "Enter the street or purok.";
      if (!newAddress.barangay.trim()) found.barangay = "Enter the barangay.";
      if (!newAddress.municipality.trim()) found.municipality = "Enter the municipality or city.";
      if (!newAddress.province.trim()) found.province = "Enter the province.";
    }

    if (index === 2 && method !== "cod" && !PAYMONGO_READY) {
      found.payment = "Online payment is not configured yet. Choose cash on delivery.";
    }

    if (index === 2 && method === "card") {
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
      let finalAddressId = fulfillment === "delivery" ? addressId : null;

      if (fulfillment === "delivery" && !finalAddressId) {
        const created = await api.post("/me/addresses", {
          ...newAddress,
          latitude: pin?.lat ?? null,
          longitude: pin?.lng ?? null,
          is_default: addressList.length === 0,
        });
        finalAddressId = (created?.data ?? created)?.id ?? null;
        if (!finalAddressId) throw new Error("The delivery address could not be saved.");
      }

      const response = await api.post("/orders", {
        items: items.map((item) => ({ product_id: item.id, qty: item.quantity })),
        fulfillment_type: fulfillment,
        address_id: finalAddressId,
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
              "The order was created, but the store did not return a payment intent. Pay on delivery or contact the store.",
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
        <p className="text-eyebrow font-bold text-primary-text uppercase">Checkout</p>
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
        <p className="text-eyebrow font-bold text-primary-text uppercase">Checkout</p>
        <h1 className="text-display-lg text-fg">Complete your order</h1>
      </header>

      <div className="mt-6">
        <Stepper steps={STEPS} current={step} onSelect={setStep} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex flex-col gap-6">
          {step === 0 ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-heading-sm text-fg">How should we get it to you?</h2>
              <div className="flex flex-col gap-3 sm:flex-row">
                <OptionButton
                  selected={fulfillment === "delivery"}
                  onClick={() => setFulfillment("delivery")}
                  icon={Truck}
                  title="Delivery"
                  note="Distance-based fee, paid with the order."
                />
                <OptionButton
                  selected={fulfillment === "pickup"}
                  onClick={() => setFulfillment("pickup")}
                  icon={Package}
                  title="Store pickup"
                  note="No delivery fee. Collect during store hours."
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-heading-sm text-fg">
                {fulfillment === "delivery" ? "Where should we deliver?" : "Collect at the store"}
              </h2>

              {fulfillment === "pickup" ? (
                <div className="flex flex-col gap-1 rounded-md bg-muted p-4">
                  <p className="text-label font-semibold text-fg">
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
              ) : (
                <>
                  {addressList.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {addressList.map((address) => (
                        <OptionButton
                          key={address.id}
                          selected={addressId === address.id}
                          onClick={() => {
                            setAddressId(address.id);
                            if (address.latitude && address.longitude) {
                              setPin({ lat: Number(address.latitude), lng: Number(address.longitude) });
                            }
                          }}
                          title={`${address.street}, ${address.barangay}`}
                          note={`${address.municipality}, ${address.province}`}
                        />
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-label font-semibold text-fg">
                        {addressList.length > 0 ? "Or add a new address" : "Delivery address"}
                      </p>
                      {addressId ? (
                        <button
                          type="button"
                          onClick={() => setAddressId(null)}
                          className="text-caption font-semibold text-primary-text hover:underline"
                        >
                          Use a new address
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Street or purok"
                        value={newAddress.street}
                        onChange={setAddressField("street")}
                        error={errors.street}
                        disabled={Boolean(addressId)}
                      />
                      <Input
                        label="Barangay"
                        value={newAddress.barangay}
                        onChange={setAddressField("barangay")}
                        error={errors.barangay}
                        disabled={Boolean(addressId)}
                      />
                      <Input
                        label="Municipality or city"
                        value={newAddress.municipality}
                        onChange={setAddressField("municipality")}
                        error={errors.municipality}
                        disabled={Boolean(addressId)}
                      />
                      <Input
                        label="Province"
                        value={newAddress.province}
                        onChange={setAddressField("province")}
                        error={errors.province}
                        disabled={Boolean(addressId)}
                      />
                    </div>

                    <MapPicker value={pin} onChange={setPin} />
                    <p className="text-caption text-fg-subtle">
                      Pinning the exact spot helps the rider. The address alone is enough if you skip it.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {step === 2 ? (
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

          {step === 3 ? (
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
                  <dd className="text-fg">{fulfillment === "delivery" ? "Delivery" : "Store pickup"}</dd>
                </div>
                {fulfillment === "delivery" ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-muted">Deliver to</dt>
                    <dd className="text-right text-fg">
                      {selectedAddress
                        ? `${selectedAddress.street}, ${selectedAddress.barangay}, ${selectedAddress.municipality}`
                        : `${newAddress.street}, ${newAddress.barangay}, ${newAddress.municipality}`}
                    </dd>
                  </div>
                ) : null}
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
                Prices, stock and the delivery fee are confirmed by the store when the order is placed.
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
            <span>{fulfillment === "delivery" ? "Delivery (estimate)" : "Pickup"}</span>
            <span className="text-fg tabular-nums">
              {fulfillment === "pickup"
                ? "Free"
                : estimatedFee === null
                  ? "Set by the store"
                  : formatPHP(estimatedFee)}
            </span>
          </div>
          <div className="flex items-center justify-between text-body-md font-semibold text-fg">
            <span>Total (estimate)</span>
            <span className="tabular-nums">
              {fulfillment === "delivery" && estimatedFee === null
                ? "Set by the store"
                : formatPHP(subtotal + (estimatedFee ?? 0))}
            </span>
          </div>
          <p className="text-caption text-fg-subtle">
            The final total is recalculated by the store from live prices, stock and distance.
          </p>
        </aside>
      </div>
    </section>
  );
}
