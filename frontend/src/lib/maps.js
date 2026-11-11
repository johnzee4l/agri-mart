/* Google Maps JS API loaded once per page (FR-19). One loader for the checkout pin
   and the store map, so the script tag is never added twice. */

export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };

let loader = null;

export function loadMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);

  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&loading=async`;
      script.async = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error("Google Maps could not load."));
      document.head.appendChild(script);
    });
  }

  return loader;
}

export function directionsUrl({ latitude, longitude }) {
  if (latitude == null || longitude == null) return null;
  if (latitude === "" || longitude === "") return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
}
