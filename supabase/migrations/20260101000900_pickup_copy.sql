-- The store is pickup only now, so the seeded hero promise must not advertise
-- delivery. Guarded on the old sentence so an edited homepage is left alone.
update public.site_content
set value = jsonb_set(
  value,
  '{subheadline}',
  to_jsonb('Seeds, fertilizers, feeds, tools and irrigation supplies for farmers, backyard growers and livestock raisers. Order online and collect from the store.'::text)
)
where key = 'home_hero'
  and value->>'subheadline' = 'Seeds, fertilizers, feeds, tools and irrigation supplies for farmers, backyard growers and livestock raisers. Order online for delivery or store pickup.';
