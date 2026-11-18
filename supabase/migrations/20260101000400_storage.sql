-- Public bucket for product and content images (docs/deploy.md step 3).
insert into storage.buckets (id, name, public)
values ('public-images', 'public-images', true)
on conflict (id) do update set public = true;
