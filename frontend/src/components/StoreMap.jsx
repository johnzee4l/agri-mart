import { useEffect, useRef, useState } from "react";
import { DEFAULT_CENTER, MAPS_KEY, loadMaps } from "@/lib/maps.js";
import { cn } from "@/lib/cn.js";

/* FR-19. Read-only store map on the contact page: media element, radius-lg, no frame
   (designtokens 8.5). Without a key it degrades to a note; the address text is always
   rendered by the page itself. */
export default function StoreMap({ center, zoom = 15, className }) {
  const container = useRef(null);
  const [error, setError] = useState(null);

  const valid =
    Number.isFinite(Number(center?.lat)) && Number.isFinite(Number(center?.lng)) && center?.lat != null;
  const initial = useRef(valid ? { lat: Number(center.lat), lng: Number(center.lng) } : DEFAULT_CENTER);

  useEffect(() => {
    if (!MAPS_KEY) return undefined;
    const host = container.current;
    if (!host) return undefined;

    /* A fresh child node per mount: Google Maps cannot initialise twice on one
       element, and StrictMode mounts effects twice in development. */
    const mount = document.createElement("div");
    mount.className = "h-full w-full";
    host.appendChild(mount);

    let cancelled = false;

    loadMaps()
      .then((maps) => {
        if (cancelled) return;
        const map = new maps.Map(mount, {
          center: initial.current,
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
        });
        new maps.Marker({ map, position: initial.current, title: "AgriMart store" });
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      });

    return () => {
      cancelled = true;
      mount.remove();
    };
  }, [zoom]);

  if (!MAPS_KEY) {
    return (
      <div
        className={cn(
          "flex aspect-[16/10] w-full flex-col items-center justify-center rounded-lg bg-muted p-6 text-center",
          className,
        )}
      >
        <p className="text-caption text-fg-muted">
          The map needs VITE_GOOGLE_MAPS_KEY. The address and directions below still work.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div ref={container} className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted" />
      {error ? (
        <p role="alert" className="text-caption text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
