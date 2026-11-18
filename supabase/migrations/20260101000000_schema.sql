-- AgriMart schema for local development and the backend tests.
-- Member 3 owns database/: extend these files rather than forking the layout.
-- Only the tables the order, payment and auth paths touch are defined so far.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'staff', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  street text not null,
  barangay text,
  municipality text,
  province text,
  latitude double precision,
  longitude double precision,
  is_default boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  description text,
  brand text,
  unit text default 'kg',
  price numeric(10, 2) not null check (price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  reorder_level integer not null default 5,
  image_url text,
  is_featured boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  change_qty integer not null,
  reason text not null check (reason in ('stock-in', 'sale', 'adjustment', 'spoilage')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  address_id uuid references public.addresses (id) on delete set null,
  fulfillment_type text not null check (fulfillment_type in ('delivery', 'pickup')),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'preparing', 'out_for_delivery', 'completed', 'cancelled')),
  stock_deducted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  method text not null check (method in ('gcash', 'card', 'grab_pay', 'cod')),
  paymongo_ref text unique,
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users (id) on delete set null,
  title text not null,
  body text not null,
  is_pinned boolean not null default false,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references auth.users (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists orders_user_status_idx on public.orders (user_id, status);
create index if not exists inventory_logs_product_idx on public.inventory_logs (product_id);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- RLS on, with the customer-facing rules. The API uses the service role, which
-- bypasses these; they protect anything that talks to Supabase directly.
--
-- Every policy is scoped `to authenticated`, so the anonymous key reads nothing at all
-- (Phase 1 verification, database/tests/rls.test.mjs). The storefront and the admin panel
-- go through the Node API, which holds no anon key.
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory_logs enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.site_content enable row level security;
alter table public.announcements enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select using (auth.uid() = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists addresses_own on public.addresses;
create policy addresses_own on public.addresses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists products_read on public.products;
create policy products_read on public.products for select to authenticated using (true);

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to authenticated using (true);

drop policy if exists site_content_read on public.site_content;
create policy site_content_read on public.site_content for select to authenticated using (true);

drop policy if exists orders_own_read on public.orders;
create policy orders_own_read on public.orders for select using (auth.uid() = user_id);

drop policy if exists orders_own_insert on public.orders;
create policy orders_own_insert on public.orders for insert with check (auth.uid() = user_id);

drop policy if exists order_items_own_read on public.order_items;
create policy order_items_own_read on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

drop policy if exists payments_own_read on public.payments;
create policy payments_own_read on public.payments for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select to authenticated
  using (published_at is not null and deleted_at is null);

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists conversations_own on public.conversations;
create policy conversations_own on public.conversations for all
  using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

drop policy if exists messages_own on public.messages;
create policy messages_own on public.messages for select using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.customer_id = auth.uid()
  )
);
