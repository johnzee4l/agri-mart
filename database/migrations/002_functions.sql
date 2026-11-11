-- Functions and triggers from blueprint 5.3.

-- Every new auth user gets a profile row with role 'customer'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/**
 * Deducts every line of an order exactly once, writes the 'sale' log rows and
 * returns the products that are now at or below their reorder level.
 * Raises instead of letting any line go negative.
 */
create or replace function public.deduct_stock(order_id uuid)
returns setof public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.orders;
  line record;
  changed integer;
begin
  select * into target from public.orders where orders.id = deduct_stock.order_id for update;

  if target.id is null then
    raise exception 'Order % not found', deduct_stock.order_id;
  end if;

  if target.stock_deducted then
    return;
  end if;

  for line in
    select oi.product_id, oi.quantity
    from public.order_items oi
    where oi.order_id = deduct_stock.order_id
  loop
    update public.products p
       set stock_qty = p.stock_qty - line.quantity
     where p.id = line.product_id
       and p.stock_qty >= line.quantity;

    get diagnostics changed = row_count;
    if changed = 0 then
      raise exception 'Insufficient stock for product %', line.product_id;
    end if;

    insert into public.inventory_logs (product_id, user_id, change_qty, reason)
    values (line.product_id, target.user_id, -line.quantity, 'sale');
  end loop;

  update public.orders set stock_deducted = true where orders.id = target.id;

  return query
    select p.*
    from public.products p
    join public.order_items oi on oi.product_id = p.id
    where oi.order_id = target.id
      and p.stock_qty <= p.reorder_level;
end;
$$;

/** Stock-in, adjustment or spoilage in one transaction. True when now low. */
create or replace function public.adjust_stock(
  product_id uuid,
  change_qty integer,
  reason text,
  user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  low boolean;
begin
  update public.products p
     set stock_qty = p.stock_qty + change_qty
   where p.id = adjust_stock.product_id;

  if not found then
    raise exception 'Product % not found', adjust_stock.product_id;
  end if;

  insert into public.inventory_logs (product_id, user_id, change_qty, reason)
  values (adjust_stock.product_id, adjust_stock.user_id, adjust_stock.change_qty, adjust_stock.reason);

  select p.stock_qty <= p.reorder_level into low
  from public.products p
  where p.id = adjust_stock.product_id;

  return coalesce(low, false);
end;
$$;
