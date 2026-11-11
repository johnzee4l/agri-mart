-- Default content so checkout has a store pin and delivery rates to work with.

insert into public.site_content (key, value) values
  ('store_location', '{"latitude": 14.5995, "longitude": 120.9842, "address": "AgriMart, Manila", "hours": "7:00-18:00"}'),
  ('delivery_rates', '{"base_fee": 50, "per_km": 10}'),
  ('home_hero', '{"title": "Fresh from the farm", "subtitle": "Order today, harvest tomorrow"}'),
  ('home_banners', '[]'),
  ('about', '{"body": "AgriMart supplies farms and kitchens across the region."}'),
  ('contact', '{"phone": "+63 900 000 0000", "email": "hello@agrimart.test"}')
on conflict (key) do nothing;

insert into public.categories (name, description) values
  ('Seeds', 'Rice, corn and vegetable seeds'),
  ('Fertiliser', 'Organic and inorganic fertiliser')
on conflict (name) do nothing;

insert into public.products (name, category_id, price, stock_qty, reorder_level, unit)
select 'Seed test rice', c.id, 100, 10, 3, 'kg'
from public.categories c
where c.name = 'Seeds'
on conflict do nothing;
