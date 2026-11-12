import { useEffect, useRef, useState } from "react";
import { ImageSquare, Trash } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { cn } from "@/lib/cn.js";
import Button from "../components/ui/Button.jsx";
import Chip from "../components/ui/Chip.jsx";
import Dialog from "../components/ui/Dialog.jsx";
import Input from "../components/ui/Input.jsx";

/* FR-3. Create and edit a product (blueprint 6.7). One permission rule is deliberate:
   stock is only set when the product is created. Afterwards it moves through
   POST /inventory/adjust so the change reaches the stock log (FR-11); the field is
   replaced by a pointer to Inventory. */

const EMPTY = {
  name: "",
  price: "",
  category_id: "",
  brand: "",
  unit: "",
  reorder_level: "",
  stock_qty: "",
  description: "",
  image_url: "",
  is_featured: false,
};

const SELECT_CLASS =
  "h-[var(--control-md)] w-full rounded-md bg-surface px-3.5 text-base text-fg ring-1 ring-inset ring-field-edge";
const TEXTAREA_CLASS =
  "min-h-[6rem] w-full rounded-md bg-surface p-3.5 text-base text-fg ring-1 ring-inset ring-field-edge placeholder:text-fg-subtle";

function fromProduct(product) {
  if (!product) return EMPTY;

  return {
    name: product.name ?? "",
    price: String(product.price ?? ""),
    category_id: product.category_id ?? "",
    brand: product.brand ?? "",
    unit: product.unit ?? "",
    reorder_level: String(product.reorder_level ?? ""),
    stock_qty: String(product.stock_qty ?? ""),
    description: product.description ?? "",
    image_url: product.image_url ?? "",
    is_featured: Boolean(product.is_featured),
  };
}

/** ApiError carries [{ path, message }]; the first message per field is enough. */
function fieldErrorsFrom(error) {
  if (!Array.isArray(error?.details)) return {};

  const found = {};
  for (const detail of error.details) {
    const key = String(detail.path ?? "").split(".")[0];
    if (key && !found[key]) found[key] = detail.message;
  }
  return found;
}

export default function ProductFormDialog({ open, product, categories, onClose, onSaved }) {
  const editing = Boolean(product?.id);
  const fileInput = useRef(null);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(fromProduct(product));
    setErrors({});
    setNotice(null);
  }, [open, product]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setNotice(null);

    try {
      const payload = await api.upload("/uploads", file);
      setForm((current) => ({ ...current, image_url: payload?.data?.url ?? "" }));
    } catch (error) {
      setErrors((current) => ({ ...current, image_url: error.message ?? "The image could not be uploaded." }));
    } finally {
      setUploading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();

    const found = {};
    if (!form.name.trim()) found.name = "Enter the product name.";

    const price = Number(form.price);
    if (form.price === "" || !Number.isFinite(price) || price < 0) {
      found.price = "Enter a price of zero or more.";
    }

    if (!editing) {
      const stock = Number(form.stock_qty);
      if (form.stock_qty === "" || !Number.isInteger(stock) || stock < 0) {
        found.stock_qty = "Enter a whole number of zero or more.";
      }
    }

    if (form.reorder_level !== "") {
      const reorder = Number(form.reorder_level);
      if (!Number.isInteger(reorder) || reorder < 0) {
        found.reorder_level = "Enter a whole number of zero or more.";
      }
    }

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = {
      name: form.name.trim(),
      price,
      category_id: form.category_id || null,
      brand: form.brand.trim() || null,
      unit: form.unit.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url || null,
      is_featured: form.is_featured,
      ...(form.reorder_level === "" ? {} : { reorder_level: Number(form.reorder_level) }),
      ...(editing ? {} : { stock_qty: Number(form.stock_qty) }),
    };

    setSaving(true);
    setNotice(null);

    try {
      const payload = editing
        ? await api.patch(`/products/${product.id}`, body)
        : await api.post("/products", body);

      onSaved?.(payload?.data ?? null, editing ? "saved" : "created");
    } catch (error) {
      const fields = fieldErrorsFrom(error);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setNotice(error.message ?? "The product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={editing ? "Edit product" : "New product"}>
      <form onSubmit={submit} noValidate className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
        <Input
          label="Name"
          value={form.name}
          onChange={set("name")}
          error={errors.name}
          autoComplete="off"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Price"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={form.price}
            onChange={set("price")}
            error={errors.price}
          />

          {editing ? (
            <div className="flex flex-col gap-2">
              <span className="text-label font-semibold text-fg">Stock</span>
              <p className="text-body-sm tabular-nums text-fg-muted">
                {product.stock_qty} {product.unit ?? ""}
              </p>
              <p className="text-caption text-fg-subtle">
                Move stock in Inventory so every change is logged.
              </p>
            </div>
          ) : (
            <Input
              label="Stock on hand"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={form.stock_qty}
              onChange={set("stock_qty")}
              error={errors.stock_qty}
            />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-label font-semibold text-fg">Category</span>
            <select value={form.category_id} onChange={set("category_id")} className={SELECT_CLASS}>
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Reorder level"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            hint="Low-stock alerts use this."
            value={form.reorder_level}
            onChange={set("reorder_level")}
            error={errors.reorder_level}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Brand" value={form.brand} onChange={set("brand")} error={errors.brand} />
          <Input label="Unit" hint="kg, sack, bottle …" value={form.unit} onChange={set("unit")} error={errors.unit} />
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg">Description</span>
          <textarea
            value={form.description}
            onChange={set("description")}
            className={cn(TEXTAREA_CLASS)}
            rows={4}
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            {form.image_url ? (
              <img
                src={form.image_url}
                alt=""
                className="size-16 rounded-lg object-cover ring-1 ring-inset ring-field-edge"
              />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-lg bg-muted">
                <ImageSquare size={24} className="text-fg-subtle" aria-hidden="true" />
              </span>
            )}

            <div className="flex flex-col items-start gap-1">
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={uploadImage}
                className="hidden"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={uploading}
                onClick={() => fileInput.current?.click()}
              >
                {form.image_url ? "Replace image" : "Upload image"}
              </Button>
              <span className="text-caption text-fg-subtle">JPEG, PNG, WebP, GIF or AVIF, up to 5 MB.</span>
            </div>
          </div>

          {form.image_url ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setForm((current) => ({ ...current, image_url: "" }))}
            >
              <Trash size={16} aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>

        {errors.image_url ? (
          <p role="alert" className="text-caption text-danger-text">
            {errors.image_url}
          </p>
        ) : null}

        <Chip selected={form.is_featured} onClick={() => setForm((current) => ({ ...current, is_featured: !current.is_featured }))}>
          Featured on the home page
        </Chip>

        {notice ? (
          <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
            {notice}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} disabled={uploading}>
            {editing ? "Save product" : "Create product"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
