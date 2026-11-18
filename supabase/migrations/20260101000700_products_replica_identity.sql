-- Realtime UPDATE payloads carry only the replica identity. The default (primary key)
-- would deliver `{ id }` alone, so the stock badge needs the whole row.
alter table public.products replica identity full;
