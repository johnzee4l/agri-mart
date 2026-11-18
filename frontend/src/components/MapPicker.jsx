import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin, X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";
import {
  DEFAULT_CENTER,
  MAP_OPTIONS,
  TILE_ATTRIBUTION,
  TILE_MAX_ZOOM,
  TILE_URL,
  pinIcon,
  toPoint,
} from "@/lib/maps.js";
import { useOnline } from "@/lib/useOnline.js";

/* FR-19. Pin the delivery location on OpenStreetMap through Leaflet, so checkout no
   longer depends on a Google Maps key. Tapping the map or dragging the pin reports the
   point to the parent; the store's map is cached by the service worker for offline use.
   The map is a media element (radius-lg, no frame, designtokens 8.5). */

const MAP_ZOOM = 13;
const LOCATED_ZOOM = 16;

export default function MapPicker({ value, onChange, center, className }) {
  const container = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const onChangeRef = useRef(onChange);
  const initial = useRef(toPoint(value) ?? toPoint(center) ?? DEFAULT_CENTER);
  const online = useOnline();

  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const host = container.current;
    if (!host) return undefined;

    /* Leaflet hands back a map that StrictMode would otherwise initialise twice on the
       same node, so the instance is created and removed with this effect. */
    const instance = L.map(host, {
      ...MAP_OPTIONS,
      center: [initial.current.lat, initial.current.lng],
      zoom: MAP_ZOOM,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: TILE_MAX_ZOOM,
    }).addTo(instance);

    const pin = L.marker([initial.current.lat, initial.current.lng], {
      icon: pinIcon(L),
      draggable: true,
      keyboard: true,
      title: "Delivery pin",
    }).addTo(instance);

    const publish = (latlng) => {
      onChangeRef.current?.({ lat: latlng.lat, lng: latlng.lng });
    };

    pin.on("dragend", () => publish(pin.getLatLng()));
    instance.on("click", (event) => {
      pin.setLatLng(event.latlng);
      publish(event.latlng);
    });

    map.current = instance;
    marker.current = pin;

    // The map sits inside a reveal animation and can mount before its height settles.
    const frame = window.requestAnimationFrame(() => instance.invalidateSize());

    return () => {
      window.cancelAnimationFrame(frame);
      map.current = null;
      marker.current = null;
      instance.remove();
    };
  }, []);

  useEffect(() => {
    const point = toPoint(value);
    if (!point || !map.current || !marker.current) return;

    marker.current.setLatLng([point.lat, point.lng]);
    map.current.panTo([point.lat, point.lng]);
  }, [value]);

  function locate() {
    setError(null);

    if (!navigator.geolocation) {
      setError("This browser cannot share your location. Tap the map instead.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        map.current?.setView([point.lat, point.lng], LOCATED_ZOOM);
        marker.current?.setLatLng([point.lat, point.lng]);
        onChangeRef.current?.(point);
        setLocating(false);
      },
      () => {
        setError("Your location was not available. Tap the map to place the pin.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const pin = toPoint(value);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        ref={container}
        role="application"
        aria-label="Delivery location map. Tap to place the pin."
        className="z-0 aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-caption text-fg-muted">
          <MapPin size={16} aria-hidden="true" />
          {pin
            ? `Pin at ${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`
            : "Tap the map to drop the delivery pin."}
        </p>

        <div className="flex items-center gap-1">
          {pin ? (
            <button
              type="button"
              onClick={() => onChange?.(null)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-caption font-semibold text-fg-muted hover:bg-muted hover:text-fg"
            >
              <X size={14} weight="bold" aria-hidden="true" />
              Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={locate}
            disabled={locating || !online}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary-subtle px-3 text-caption font-semibold text-primary-text hover:bg-primary-subtle/70 disabled:pointer-events-none disabled:opacity-40"
          >
            <Crosshair size={14} weight="bold" aria-hidden="true" />
            {locating ? "Finding you…" : "Use my location"}
          </button>
        </div>
      </div>

      {!online ? (
        <p className="text-caption text-fg-subtle">
          You are offline. Any map tiles you already viewed are still shown; the pin can
          still be moved.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-caption text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
