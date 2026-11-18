import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DEFAULT_CENTER,
  MAP_OPTIONS,
  TILE_ATTRIBUTION,
  TILE_MAX_ZOOM,
  TILE_URL,
  pinIcon,
  toPoint,
} from "@/lib/maps.js";
import { cn } from "@/lib/cn.js";

/* FR-19. Read-only store map on the contact page: media element, radius-lg, no frame
   (designtokens 8.5). OpenStreetMap tiles through Leaflet, so there is no API key to
   configure or bill. The address text is always rendered by the page itself. */
export default function StoreMap({ center, zoom = 15, className }) {
  const container = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const initial = useRef(toPoint(center) ?? DEFAULT_CENTER);

  useEffect(() => {
    const host = container.current;
    if (!host) return undefined;

    const instance = L.map(host, {
      ...MAP_OPTIONS,
      center: [initial.current.lat, initial.current.lng],
      zoom,
      dragging: true,
      touchZoom: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: TILE_MAX_ZOOM,
    }).addTo(instance);

    const pin = L.marker([initial.current.lat, initial.current.lng], {
      icon: pinIcon(L),
      keyboard: true,
      title: "AgriMart store",
    }).addTo(instance);

    pin.bindPopup("AgriMart store");
    map.current = instance;
    marker.current = pin;

    const frame = window.requestAnimationFrame(() => instance.invalidateSize());

    return () => {
      window.cancelAnimationFrame(frame);
      map.current = null;
      marker.current = null;
      instance.remove();
    };
  }, [zoom]);

  useEffect(() => {
    const point = toPoint(center);
    if (!point || !map.current || !marker.current) return;
    marker.current.setLatLng([point.lat, point.lng]);
    map.current.setView([point.lat, point.lng], zoom);
  }, [center, zoom]);

  return (
    <div
      ref={container}
      role="img"
      aria-label="Map showing the AgriMart store location"
      className={cn(
        "z-0 aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted",
        className,
      )}
    />
  );
}
