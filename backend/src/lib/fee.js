import { ApiError } from "./errors.js";

/* FR-5. Delivery fee: base fee plus per-kilometre rate from
   site_content.delivery_rates, over the haversine distance between the store and the
   pinned address (blueprint 6.4 step 2). Pickup is always 0.

   The client's estimate is informational only; this is the amount the order is
   charged with. */

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function haversineKm(from, to) {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Money is stored to the centavo; never let float noise reach the database. */
export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function coordinates(point) {
  if (!point) return null;
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export function computeDeliveryFee({ store, destination, rates }) {
  const baseFee = Number(rates?.base_fee);
  const perKm = Number(rates?.per_km);

  if (!Number.isFinite(baseFee) || !Number.isFinite(perKm)) {
    throw new ApiError(503, "Delivery rates are not configured");
  }

  const origin = coordinates(store);
  const target = coordinates(destination);

  // No pin yet: the base fee still applies, which is what the store charges for a
  // short hop. A configured store is required only when a distance is asked for.
  if (!target) return roundMoney(baseFee);
  if (!origin) throw new ApiError(503, "The store location is not configured");

  return roundMoney(baseFee + perKm * haversineKm(origin, target));
}
