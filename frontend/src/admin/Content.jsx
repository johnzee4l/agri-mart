import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useApi } from "@/lib/useApi.js";
import { ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";

/* FR-17 (blueprint 6.7). One editor per site_content key, written with PUT
   /content/:key. The shapes are the ones the storefront reads (lib/content.js and
   pages/Home.jsx, Contact.jsx, Checkout.jsx), so what is saved here is what shows on
   the site: hero copy, the banner strip, About, Contact, the store pin and the
   delivery rates the checkout charges from. */

const HERO_FIELDS = [
  { name: "eyebrow", label: "Eyebrow", type: "text" },
  { name: "headline", label: "Headline", type: "text" },
  { name: "subheadline", label: "Subheadline", type: "textarea" },
  { name: "cta_label", label: "Button label", type: "text" },
  { name: "cta_href", label: "Button link", type: "text", hint: "For example /products" },
];

const ABOUT_FIELDS = [{ name: "body", label: "About the store", type: "textarea" }];

const CONTACT_FIELDS = [
  { name: "phone", label: "Phone", type: "text" },
  { name: "email", label: "Email", type: "text" },
];

const STORE_FIELDS = [
  { name: "address", label: "Address", type: "text" },
  { name: "hours", label: "Hours", type: "text" },
  { name: "latitude", label: "Latitude", type: "number" },
  { name: "longitude", label: "Longitude", type: "number" },
];

const RATE_FIELDS = [
  { name: "base_fee", label: "Base fee", type: "number", hint: "Charged on every delivery." },
  { name: "per_km", label: "Per kilometre", type: "number", hint: "Multiplied by the distance from the store pin." },
];

export default function Content() {
  const content = useApi("/content");
  const data = content.data?.data ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-heading-sm text-fg">Site content</h2>
        <p className="text-body-sm text-fg-muted">
          Everything the storefront shows, without a code change. Each block saves on its own.
        </p>
      </div>

      {content.error ? <ErrorNotice error={content.error} onRetry={content.reload} /> : null}
      {content.loading && !data ? <LoadingLines rows={4} /> : null}

      {data ? (
        <div className="flex flex-col gap-8">
          <KeyEditor
            keyName="home_hero"
            title="Home hero"
            note="The first thing a visitor reads on the home page."
            initial={data.home_hero}
            fields={HERO_FIELDS}
          />

          <BannersEditor initial={data.home_banners} />

          <KeyEditor
            keyName="about"
            title="About"
            note="The store story, shown on the About section of the site."
            initial={data.about}
            fields={ABOUT_FIELDS}
          />

          <KeyEditor
            keyName="contact"
            title="Contact"
            note="How customers reach a person."
            initial={data.contact}
            fields={CONTACT_FIELDS}
          />

          <KeyEditor
            keyName="store_location"
            title="Store location"
            note="The map pin on the Contact page, and the origin the delivery fee is measured from."
            initial={data.store_location}
            fields={STORE_FIELDS}
          />

          <KeyEditor
            keyName="delivery_rates"
            title="Delivery rates"
            note="Checkout charges the base fee plus the per-kilometre rate times the distance from the store pin."
            initial={data.delivery_rates}
            fields={RATE_FIELDS}
          />
        </div>
      ) : null}
    </div>
  );
}

/* One keyed block: a small form over the jsonb object the storefront reads. The fields
   come from the caller, so one shape change lands in one place. */
function KeyEditor({ keyName, title, note, initial, fields }) {
  const [values, setValues] = useState(() => {
    const source = initial && typeof initial === "object" && !Array.isArray(initial) ? initial : {};
    return Object.fromEntries(
      fields.map((field) => [field.name, source[field.name] ?? ""]),
    );
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);

    const value = {};

    for (const field of fields) {
      const raw = values[field.name];

      if (field.type === "number") {
        if (String(raw).trim() === "") continue;
        const number = Number(raw);
        if (!Number.isFinite(number)) {
          setError(`${field.label} needs a number.`);
          setBusy(false);
          return;
        }
        value[field.name] = number;
      } else {
        value[field.name] = String(raw ?? "").trim();
      }
    }

    try {
      await api.put(`/content/${keyName}`, { value });
      setStatus("Saved.");
    } catch (submitError) {
      setError(submitError.message ?? "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-md bg-muted p-4">
      <div>
        <h3 className="text-label font-semibold text-fg">{title}</h3>
        <p className="text-caption text-fg-muted">{note}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
            {field.type === "textarea" ? (
              <label className="flex flex-col gap-2">
                <span className="text-label font-semibold text-fg">{field.label}</span>
                <textarea
                  value={values[field.name] ?? ""}
                  rows={3}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  className="rounded-md bg-surface p-3.5 text-base text-fg ring-1 ring-inset ring-field-edge"
                />
              </label>
            ) : (
              <Input
                label={field.label}
                hint={field.hint}
                type={field.type}
                step={field.type === "number" ? "any" : undefined}
                value={values[field.name] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
                autoComplete="off"
              />
            )}
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-body-sm text-danger-text">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" loading={busy}>
          Save {title.toLowerCase()}
        </Button>
        {status ? (
          <span role="status" className="text-body-sm text-primary-text">
            {status}
          </span>
        ) : null}
      </div>
    </form>
  );
}

const BANNER_FIELDS = [
  { name: "title", label: "Title" },
  { name: "body", label: "Text" },
  { name: "image_url", label: "Image URL", hint: "Paste a public URL — upload an image from the products page to get one." },
  { name: "href", label: "Link", hint: "For example /products or /announcements" },
];

/* The banner strip is a list rather than an object, so it needs add and remove on top of
   the field editing. Rows left completely empty are dropped instead of saved as blanks. */
function BannersEditor({ initial }) {
  const [banners, setBanners] = useState(() =>
    Array.isArray(initial)
      ? initial.map((banner) => ({
          title: banner?.title ?? "",
          body: banner?.body ?? "",
          image_url: banner?.image_url ?? "",
          href: banner?.href ?? "",
        }))
      : [],
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  function update(index, name, value) {
    setBanners((current) =>
      current.map((banner, position) =>
        position === index ? { ...banner, [name]: value } : banner,
      ),
    );
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);

    const value = banners
      .map((banner) => ({
        title: banner.title.trim(),
        body: banner.body.trim(),
        image_url: banner.image_url.trim(),
        href: banner.href.trim(),
      }))
      .filter((banner) => banner.title || banner.body || banner.image_url);

    try {
      await api.put("/content/home_banners", { value });
      setBanners(value);
      setStatus(value.length === 0 ? "Saved. The strip is empty." : `Saved ${value.length} banner${value.length === 1 ? "" : "s"}.`);
    } catch (submitError) {
      setError(submitError.message ?? "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-md bg-muted p-4">
      <div>
        <h3 className="text-label font-semibold text-fg">Home banners</h3>
        <p className="text-caption text-fg-muted">
          The banner strip on the home page, in the order listed here.
        </p>
      </div>

      {banners.length === 0 ? (
        <p className="text-body-sm text-fg-muted">No banners yet.</p>
      ) : null}

      <ul className="flex flex-col gap-4">
        {banners.map((banner, index) => (
          <li key={index} className="flex flex-col gap-3 rounded-md bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-label font-semibold text-fg">Banner {index + 1}</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setBanners((current) => current.filter((_, position) => position !== index))
                }
              >
                <Trash size={16} aria-hidden="true" />
                Remove
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {BANNER_FIELDS.map((field) => (
                <Input
                  key={field.name}
                  label={field.label}
                  hint={field.hint}
                  value={banner[field.name]}
                  onChange={(event) => update(index, field.name, event.target.value)}
                  autoComplete="off"
                />
              ))}
            </div>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="text-body-sm text-danger-text">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" onClick={() => setBanners((current) => [...current, { title: "", body: "", image_url: "", href: "" }])}>
          <Plus size={18} weight="bold" aria-hidden="true" />
          Add banner
        </Button>
        <Button type="submit" variant="secondary" loading={busy}>
          Save banners
        </Button>
        {status ? (
          <span role="status" className="text-body-sm text-primary-text">
            {status}
          </span>
        ) : null}
      </div>
    </form>
  );
}
