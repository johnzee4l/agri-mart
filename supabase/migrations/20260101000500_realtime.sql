-- Realtime chat on serverless hosting. Vercel functions cannot hold a Socket.IO
-- connection, so the storefront subscribes to Postgres changes on public.messages
-- through Supabase Realtime (a WebSocket the Supabase project hosts).
--
-- The API still writes every message with the service role; these policies only let a
-- browser receive the rows it is allowed to read.

-- Staff and admins see every thread, so the admin inbox receives inserts live too.
drop policy if exists messages_staff_read on public.messages;
create policy messages_staff_read on public.messages for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'admin')
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
