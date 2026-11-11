/* FR-5. Delivery fee display.
   The server owns the real fee (backend lib/fee.js, from site_content.delivery_rates);
   this is the estimate shown before the order is priced, using the same formula. */

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/* Number(null) and Number("") are 0, which would silently place the customer in the
   Gulf of Guinea. Unknown coordinates must stay unknown. */
function coordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function haversineKm(from, to) {
  if (!from || !to) return null;

  const lat1 = coordinate(from.latitude ?? from.lat);
  const lng1 = coordinate(from.longitude ?? from.lng);
  const lat2 = coordinate(to.latitude ?? to.lat);
  const lng2 = coordinate(to.longitude ?? to.lng);

  if ([lat1, lng1, lat2, lng2].some((value) => value === null)) return null;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** base_fee + per_km × distance, rounded to centavos. Null when data is missing. */
export function estimateDeliveryFee({ store, pin, rates }) {
  if (!store || !pin || !rates) return null;
  const distance = haversineKm(store, pin);
  if (distance === null) return null;

  const baseFee = Number(rates.base_fee);
  const perKm = Number(rates.per_km);
  if (!Number.isFinite(baseFee) || !Number.isFinite(perKm)) return null;

  return Math.round((baseFee + perKm * distance) * 100) / 100;
}
