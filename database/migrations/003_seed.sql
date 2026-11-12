-- Default content so the storefront, checkout and the admin panel start with data.
-- Every statement is safe to re-run: it either targets a key that already exists, or
-- checks that the row is not there yet.

insert into public.site_content (key, value) values
  ('store_location', '{"latitude": 14.5995, "longitude": 120.9842, "address": "AgriMart, Manila", "hours": "7:00-18:00"}'),
  ('delivery_rates', '{"base_fee": 50, "per_km": 10}'),
  ('home_hero', '{"eyebrow": "Agricultural supply store", "headline": "Everything the farm needs, priced and in stock.", "subheadline": "Seeds, fertilizers, feeds, tools and irrigation supplies for farmers, backyard growers and livestock raisers. Order online for delivery or store pickup.", "cta_label": "Browse products", "cta_href": "/products"}'),
  ('home_banners', '[]'),
  ('about', '{"body": "AgriMart supplies farms and kitchens across the region."}'),
  ('contact', '{"phone": "+63 900 000 0000", "email": "hello@agrimart.test"}')
on conflict (key) do nothing;

insert into public.categories (name, description) values
  ('Seeds', 'Rice, corn and vegetable seeds'),
  ('Fertiliser', 'Organic and inorganic fertiliser'),
  ('Crop protection', 'Herbicides, insecticides and fungicides'),
  ('Feeds', 'Poultry, swine and fish feeds'),
  ('Tools and equipment', 'Hand tools, sprayers and irrigation supplies')
on conflict (name) do nothing;

-- Ten sample products across those categories. None of them start low, so a fresh
-- install shows an empty low-stock list. products.name is not unique, so the guard is
-- `where not exists`: re-running the seed must not add a second copy of a product.
insert into public.products (
  name, category_id, description, brand, unit, price, stock_qty, reorder_level, is_featured
)
select
  v.name, c.id, v.description, v.brand, v.unit, v.price, v.stock_qty, v.reorder_level, v.is_featured
from (
  values
    ('Rice seed RC 222', 'Seeds', 'Certified inbred rice seed, 40 kg bag', 'PhilRice', 'bag', 1980.00, 24, 6, true),
    ('Hybrid corn seed 30T80', 'Seeds', 'Drought-tolerant hybrid corn, 9 kg bag', 'Pioneer', 'bag', 4200.00, 12, 4, true),
    ('Pechay seed', 'Seeds', 'Open-pollinated pechay, 100 g pack', 'Ramgo', 'pack', 180.00, 60, 15, false),
    ('Urea 46-0-0', 'Fertiliser', 'Nitrogen fertiliser, 50 kg sack', 'AgriChem', 'sack', 2450.00, 30, 8, true),
    ('Complete 14-14-14', 'Fertiliser', 'Balanced NPK fertiliser, 50 kg sack', 'AgriChem', 'sack', 2380.00, 26, 8, false),
    ('Vermicast', 'Fertiliser', 'Organic earthworm castings, 25 kg sack', 'GreenGrow', 'sack', 850.00, 40, 10, false),
    ('Glyphosate 1 L', 'Crop protection', 'Non-selective herbicide', 'CropCare', 'bottle', 620.00, 35, 10, false),
    ('Cypermethrin 500 mL', 'Crop protection', 'Broad-spectrum insecticide', 'CropCare', 'bottle', 480.00, 28, 8, false),
    ('Hog grower feed', 'Feeds', 'Pelleted grower ration, 50 kg sack', 'Masterfeeds', 'sack', 1720.00, 20, 6, true),
    ('Knapsack sprayer 16 L', 'Tools and equipment', 'Manual backpack sprayer', 'FarmTech', 'piece', 1350.00, 15, 5, false)
) as v (name, category, description, brand, unit, price, stock_qty, reorder_level, is_featured)
join public.categories c on c.name = v.category
where not exists (select 1 from public.products p where p.name = v.name);

-- Promote the first admin. Signup always creates a customer, and every admin-only
-- endpoint needs an admin token, so the first one has to be promoted in the database.
-- Run this once that person has signed up, from the SQL editor or psql:
--
--   update public.profiles
--      set role = 'admin'
--    where id = (select id from auth.users where email = 'owner@example.com');
--
-- The same statement with role = 'staff' promotes a staff account. Nothing else grants
-- a role: POST /users/:id is admin-only, so it cannot bootstrap the first admin.
