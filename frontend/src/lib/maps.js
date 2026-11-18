/* FR-19. Leaflet + OpenStreetMap. No API key, no billing account, and the tile layer
   is cached by the service worker so a recently viewed store map still opens offline.

   Leaflet itself is imported by the map components: both live on lazy routes, so the
   library stays out of the entry chunk. */

export const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };

export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

export const TILE_MAX_ZOOM = 19;

export const MAP_OPTIONS = {
  zoomControl: true,
  scrollWheelZoom: false,
  attributionControl: true,
  minZoom: 3,
  maxZoom: TILE_MAX_ZOOM,
};

/** A token-coloured pin that needs no image assets or bundler URL juggling. */
export function pinIcon(L, { color = "var(--primary)", size = 34 } = {}) {
  return L.divIcon({
    className: "agrimart-pin",
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 34 34" aria-hidden="true" focusable="false">
        <path d="M17 2c-6.6 0-12 5.3-12 11.9C5 22.6 17 32 17 32s12-9.4 12-18.1C29 7.3 23.6 2 17 2Z"
              fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="17" cy="14" r="4.4" fill="white"/>
      </svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

export function toPoint(value) {
  if (!value) return null;
  const lat = Number(value.lat);
  const lng = Number(value.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/** A directions link that works without a Maps API key. */
export function directionsUrl({ latitude, longitude }) {
  if (latitude == null || longitude == null) return null;
  if (latitude === "" || longitude === "") return null;
  return `https://www.openstreetmap.org/directions?to=${encodeURIComponent(
    `${latitude},${longitude}`,
  )}`;
}
