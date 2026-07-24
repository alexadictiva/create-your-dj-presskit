create extension if not exists "pgcrypto";

create table if not exists public.djs (
  id uuid primary key default gen_random_uuid(),
  "artistName" text not null,
  "realName" text not null,
  city text not null,
  email text not null,
  phone text not null,
  biography text not null,
  experiences text not null,
  genres jsonb not null default '[]'::jsonb,
  equipment jsonb not null default '[]'::jsonb,
  instagram text not null,
  soundcloud text not null,
  website text not null,
  template text not null,
  photos jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now()
);

alter table public.djs enable row level security;
create policy "Allow public press kit submissions" on public.djs for insert to anon with check (true);
create policy "Allow authenticated admin reads" on public.djs for select to authenticated using (true);

insert into storage.buckets (id, name, public)
values ('presskit-media', 'presskit-media', true)
on conflict (id) do update set public = true;

create policy "Allow public press kit uploads"
on storage.objects for insert to anon
with check (bucket_id = 'presskit-media');
