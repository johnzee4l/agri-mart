import { useApi } from "./useApi.js";

/* site_content keys (blueprint 5.2): home_hero, home_banners, about, contact,
   store_location, delivery_rates. docs/api.md fixes the keys but not the jsonb
   shape, so read defensively and fall back to the scaffold copy while the keys
   are still empty. */

const FALLBACK_HERO = {
  eyebrow: "Agricultural supply store",
  headline: "Everything the farm needs, priced and in stock.",
  subheadline:
    "Seeds, fertilizers, feeds, tools and irrigation supplies for farmers, backyard growers and livestock raisers. Order online for delivery or store pickup.",
  cta_label: "Browse products",
  cta_href: "/products",
};

export function useContent() {
  const { data, error, loading } = useApi("/content");
  const content = data?.data ?? data ?? {};

  const hero = content.home_hero ?? {};
  const store = content.store_location ?? null;

  return {
    loading,
    error,
    hero: {
      eyebrow: hero.eyebrow ?? FALLBACK_HERO.eyebrow,
      headline: hero.headline ?? FALLBACK_HERO.headline,
      subheadline: hero.subheadline ?? FALLBACK_HERO.subheadline,
      cta_label: hero.cta_label ?? FALLBACK_HERO.cta_label,
      cta_href: hero.cta_href ?? FALLBACK_HERO.cta_href,
    },
    banners: Array.isArray(content.home_banners) ? content.home_banners : [],
    store: store
      ? {
          address: store.address ?? null,
          hours: store.hours ?? null,
          latitude: store.latitude ?? null,
          longitude: store.longitude ?? null,
        }
      : null,
  };
}
