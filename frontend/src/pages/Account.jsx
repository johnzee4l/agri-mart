import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.jsx";
import { useApi } from "@/lib/useApi.js";
import { asList, formatDate, formatPHP } from "@/lib/format.js";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import MapPicker from "../components/MapPicker.jsx";
import OrderStatusBadge from "../components/OrderStatusBadge.jsx";
import OrderTracker from "../components/OrderTracker.jsx";
import Button from "../components/ui/Button.jsx";
import Dialog from "../components/ui/Dialog.jsx";
import Input from "../components/ui/Input.jsx";
import Segmented from "../components/ui/Segmented.jsx";
import NotificationToggle from "../components/NotificationToggle.jsx";

/* FR-15, FR-8, FR-21. Account tabs as a segmented control; order history as canvas
   rows with a status tracker (designtokens 12). */

const SECTIONS = [
  { value: "profile", label: "Profile" },
  { value: "addresses", label: "Addresses" },
  { value: "orders", label: "Orders" },
  { value: "notifications", label: "Notifications" },
];

const EMPTY_ADDRESS = { street: "", barangay: "", municipality: "", province: "" };
const ADDRESS_FIELDS = [
  { key: "street", label: "Street or purok" },
  { key: "barangay", label: "Barangay" },
  { key: "municipality", label: "Municipality or city" },
  { key: "province", label: "Province" },
];

export default function Account() {
  const { profile, saveProfile } = useAuth();
  const addresses = useApi("/me/addresses");
  const orders = useApi("/orders?limit=20");

  const addressList = asList(addresses.data);
  const orderList = asList(orders.data);

  const [section, setSection] = useState("profile");

  /* Profile */
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileNotice, setProfileNotice] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setForm({ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" });
  }, [profile?.full_name, profile?.phone]);

  /* Addresses */
  const [editing, setEditing] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [addressPin, setAddressPin] = useState(null);
  const [addressErrors, setAddressErrors] = useState({});
  const [savingAddress, setSavingAddress] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  /* Orders */
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [orderError, setOrderError] = useState(null);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    if (!form.full_name.trim()) {
      setProfileErrors({ full_name: "Enter your full name." });
      return;
    }

    setProfileErrors({});
    setProfileNotice(null);
    setSavingProfile(true);

    try {
      await saveProfile({ full_name: form.full_name.trim(), phone: form.phone.trim() || null });
      setProfileNotice("Profile saved.");
    } catch (error) {
      setProfileErrors({ form: error.message ?? "Could not save your profile." });
    } finally {
      setSavingProfile(false);
    }
  }

  function startNewAddress() {
    setEditing({ id: null });
    setAddressForm(EMPTY_ADDRESS);
    setAddressPin(null);
    setAddressErrors({});
  }

  function startEditAddress(address) {
    setEditing({ id: address.id });
    setAddressForm({
      street: address.street ?? "",
      barangay: address.barangay ?? "",
      municipality: address.municipality ?? "",
      province: address.province ?? "",
    });
    setAddressPin(
      address.latitude && address.longitude
        ? { lat: Number(address.latitude), lng: Number(address.longitude) }
        : null,
    );
    setAddressErrors({});
  }

  async function handleAddressSubmit(event) {
    event.preventDefault();

    const found = {};
    ADDRESS_FIELDS.forEach(({ key, label }) => {
      if (!addressForm[key].trim()) found[key] = `Enter the ${label.toLowerCase()}.`;
    });
    setAddressErrors(found);
    if (Object.keys(found).length > 0) return;

    setSavingAddress(true);

    try {
      const payload = {
        ...addressForm,
        latitude: addressPin?.lat ?? null,
        longitude: addressPin?.lng ?? null,
      };

      if (editing?.id) {
        await api.patch(`/me/addresses/${editing.id}`, payload);
      } else {
        await api.post("/me/addresses", { ...payload, is_default: addressList.length === 0 });
      }

      setEditing(null);
      addresses.reload();
    } catch (error) {
      setAddressErrors({ form: error.message ?? "Could not save the address." });
    } finally {
      setSavingAddress(false);
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setArchiving(true);

    try {
      await api.del(`/me/addresses/${archiveTarget.id}`);
      setArchiveTarget(null);
      if (editing?.id === archiveTarget.id) setEditing(null);
      addresses.reload();
    } catch (error) {
      setAddressErrors({ form: error.message ?? "Could not archive the address." });
      setArchiveTarget(null);
    } finally {
      setArchiving(false);
    }
  }

  async function makeDefault(address) {
    setAddressErrors({});
    try {
      await api.patch(`/me/addresses/${address.id}`, { is_default: true });
      addresses.reload();
    } catch (error) {
      setAddressErrors({ form: error.message ?? "Could not set the default address." });
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setOrderError(null);

    try {
      await api.post(`/orders/${cancelTarget.id}/cancel`);
      setCancelTarget(null);
      orders.reload();
    } catch (error) {
      setOrderError(error.message ?? "Could not cancel this order.");
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[var(--container-content)] px-4 py-10 lg:px-10 lg:py-16">
      <header className="flex flex-col gap-2">
        <p className="text-eyebrow font-bold text-primary-text uppercase">Account</p>
        <h1 className="text-display-lg text-fg">My account</h1>
        <p className="text-body-sm text-fg-muted">
          {profile?.email ?? "Manage your details, addresses and orders."}
        </p>
      </header>

      <div className="mt-6">
        <Segmented
          items={SECTIONS}
          value={section}
          onChange={setSection}
          label="Account sections"
        />
      </div>

      <div
        role="tabpanel"
        id={`panel-${section}`}
        aria-labelledby={`tab-${section}`}
        className="mt-8 flex flex-col gap-6"
      >
        {section === "profile" ? (
          <form onSubmit={handleProfileSubmit} noValidate className="flex max-w-[28rem] flex-col gap-4">
            <Input label="Email" value={profile?.email ?? ""} disabled readOnly hint="Email changes go through support." />
            <Input
              label="Full name"
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
              error={profileErrors.full_name}
              autoComplete="name"
            />
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              autoComplete="tel"
              hint="Used for delivery updates."
            />

            {profileErrors.form ? (
              <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
                {profileErrors.form}
              </p>
            ) : null}
            {profileNotice ? (
              <p role="status" className="rounded-md bg-primary-subtle p-3 text-body-sm text-primary-text">
                {profileNotice}
              </p>
            ) : null}

            <Button type="submit" loading={savingProfile} className="self-start">
              Save profile
            </Button>
          </form>
        ) : null}

        {section === "addresses" ? (
          <div className="flex flex-col gap-6">
            {addresses.error ? <ErrorNotice error={addresses.error} onRetry={addresses.reload} /> : null}
            {addresses.loading && addressList.length === 0 ? <LoadingLines rows={2} /> : null}

            {!addresses.loading && !addresses.error && addressList.length === 0 ? (
              <EmptyState
                title="No saved addresses yet"
                body="Save an address here so checkout is one step shorter."
              />
            ) : null}

            {addressErrors.form ? (
              <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
                {addressErrors.form}
              </p>
            ) : null}

            <ul className="flex flex-col gap-6">
              {addressList.map((address) => (
                <li key={address.id} className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-label font-semibold text-fg">
                      {address.street}, {address.barangay}
                      {address.is_default ? (
                        <span className="ml-2 rounded-full bg-primary-subtle px-2 py-0.5 text-caption text-primary-text">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="text-body-sm text-fg-muted">
                      {address.municipality}, {address.province}
                    </p>
                    {address.latitude && address.longitude ? (
                      <p className="text-caption text-fg-subtle tabular-nums">
                        Pinned at {Number(address.latitude).toFixed(4)},{" "}
                        {Number(address.longitude).toFixed(4)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {address.is_default ? null : (
                      <Button size="sm" variant="ghost" onClick={() => makeDefault(address)}>
                        Make default
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => startEditAddress(address)}>
                      <PencilSimple size={16} aria-hidden="true" />
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(address)}>
                      Archive
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {editing ? (
              <form onSubmit={handleAddressSubmit} noValidate className="flex flex-col gap-4">
                <h2 className="text-heading-sm text-fg">
                  {editing.id ? "Edit address" : "Add an address"}
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  {ADDRESS_FIELDS.map(({ key, label }) => (
                    <Input
                      key={key}
                      label={label}
                      value={addressForm[key]}
                      onChange={(event) =>
                        setAddressForm((current) => ({ ...current, [key]: event.target.value }))
                      }
                      error={addressErrors[key]}
                    />
                  ))}
                </div>

                <MapPicker value={addressPin} onChange={setAddressPin} />
                <p className="text-caption text-fg-subtle">
                  Optional pin. It lets checkout estimate the delivery fee before you order.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" loading={savingAddress}>
                    {editing.id ? "Save address" : "Add address"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" onClick={startNewAddress} className="self-start">
                <Plus size={16} aria-hidden="true" />
                Add an address
              </Button>
            )}
          </div>
        ) : null}

        {section === "orders" ? (
          <div className="flex flex-col gap-6">
            {orders.error ? <ErrorNotice error={orders.error} onRetry={orders.reload} /> : null}
            {orders.loading && orderList.length === 0 ? <LoadingLines rows={3} /> : null}

            {orderError ? (
              <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
                {orderError}
              </p>
            ) : null}

            {!orders.loading && !orders.error && orderList.length === 0 ? (
              <EmptyState
                title="No orders yet"
                body="Orders you place appear here with their status."
              />
            ) : null}

            <ul className="flex flex-col gap-8">
              {orderList.map((order) => (
                <li key={order.id} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-caption text-fg-subtle tabular-nums">
                        #{String(order.id).slice(0, 8)}
                      </p>
                      <p className="text-caption text-fg-muted">{formatDate(order.created_at)}</p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                    <span className="text-body-md font-semibold text-fg tabular-nums">
                      {order.total_amount != null ? formatPHP(order.total_amount) : "—"}
                    </span>
                  </div>

                  <OrderTracker status={order.status} fulfillment={order.fulfillment_type} />

                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      to={`/orders/${order.id}`}
                      className="text-caption font-semibold text-primary-text hover:underline"
                    >
                      View order
                    </Link>
                    {order.status === "pending" ? (
                      <Button size="sm" variant="ghost" onClick={() => setCancelTarget(order)}>
                        Cancel order
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {section === "notifications" ? <NotificationToggle /> : null}
      </div>

      <Dialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Archive this address?"
      >
        <p className="text-body-sm text-fg-muted">
          Archived addresses stop appearing at checkout. You can add the address again later.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setArchiveTarget(null)}>
            Keep it
          </Button>
          <Button variant="danger" loading={archiving} onClick={confirmArchive}>
            Archive address
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel this order?"
      >
        <p className="text-body-sm text-fg-muted">
          Cancelling is only possible while an order is pending. This cannot be undone.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setCancelTarget(null)}>
            Keep order
          </Button>
          <Button variant="danger" loading={cancelling} onClick={confirmCancel}>
            Cancel order
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
