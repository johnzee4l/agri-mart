-- Phase 5 fixes: storefront sale pricing and scheduled-announcement bookkeeping.

-- ProductTile and ProductDetail already read compare_at_price; the column is what
-- makes the discount pill and the struck-through original real instead of undefined.
alter table public.products
  add column if not exists compare_at_price numeric(10, 2);

-- A scheduled announcement that goes live without an admin save still has to push
-- once. The notification sweep stamps this column after a successful send.
alter table public.announcements
  add column if not exists notified_at timestamptz;

create index if not exists announcements_pending_notice_idx
  on public.announcements (published_at)
  where notified_at is null and deleted_at is null;

-- Existing published notices were already visible before this column existed and
-- should not all push the moment the API restarts.
update public.announcements
   set notified_at = coalesce(published_at, created_at)
 where published_at is not null
   and published_at <= now()
   and notified_at is null;
