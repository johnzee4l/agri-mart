import { useEffect, useRef, useState } from "react";
import { MapPin } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";
import Input from "./ui/Input.jsx";

/* FR-19. Pin the delivery location. Loads the Maps JS API directly with the key from
   VITE_GOOGLE_MAPS_KEY; without a key it falls back to coordinates so checkout still
   works. The map is a media element (radius-lg, no frame, designtokens 8.5). */

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };

let loader = null;

function loadMaps(key) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async`;
      script.async = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error("Google Maps could not load."));
      document.head.appendChild(script);
    });
  }
  return loader;
}

function usable(point) {
  return Boolean(point) && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng));
}

function toNumber(raw) {
  return raw === "" ? null : Number(raw);
}

export default function MapPicker({ value, onChange, center, className }) {
  const container = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const onChangeRef = useRef(onChange);
  const initial = useRef(usable(value) ? value : center ?? DEFAULT_CENTER);
  const [error, setError] = useState(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!KEY) return undefined;
    const host = container.current;
    if (!host) return undefined;

    /* A fresh child node per mount: Google Maps cannot initialise twice on the same
       element, and StrictMode mounts effects twice in development. */
    const mount = document.createElement("div");
    mount.className = "h-full w-full";
    host.appendChild(mount);

    let cancelled = false;
    let pin = null;

    loadMaps(KEY)
      .then((maps) => {
        if (cancelled) return;

        const instance = new maps.Map(mount, {
          center: initial.current,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
        });

        pin = new maps.Marker({ map: instance, position: initial.current });
        map.current = instance;
        marker.current = pin;

        instance.addListener("click", (event) => {
          const position = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          pin.setPosition(position);
          onChangeRef.current?.(position);
        });
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      });

    return () => {
      cancelled = true;
      map.current = null;
      marker.current = null;
      mount.remove();
    };
  }, []);

  useEffect(() => {
    if (!usable(value) || !marker.current) return;
    const position = { lat: Number(value.lat), lng: Number(value.lng) };
    marker.current.setPosition(position);
    map.current?.panTo(position);
  }, [value]);

  if (!KEY) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <p className="rounded-md bg-muted p-3 text-caption text-fg-muted">
          Map pinning needs VITE_GOOGLE_MAPS_KEY. Enter the coordinates, or pick the store
          address and let staff confirm the pin.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Latitude"
            type="number"
            step="0.0001"
            value={value?.lat ?? ""}
            onChange={(event) => onChange?.({ lat: toNumber(event.target.value), lng: value?.lng ?? null })}
          />
          <Input
            label="Longitude"
            type="number"
            step="0.0001"
            value={value?.lng ?? ""}
            onChange={(event) => onChange?.({ lat: value?.lat ?? null, lng: toNumber(event.target.value) })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div ref={container} className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted" />
      <p className="flex items-center gap-1.5 text-caption text-fg-muted">
        <MapPin size={16} aria-hidden="true" />
        {usable(value)
          ? `Pin at ${Number(value.lat).toFixed(4)}, ${Number(value.lng).toFixed(4)}`
          : "Tap the map to drop the delivery pin."}
      </p>
      {error ? (
        <p role="alert" className="text-caption text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
