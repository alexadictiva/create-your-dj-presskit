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

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

create policy "Admins can verify their own access"
on public.admin_users for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Only designated admins can read DJs"
on public.djs for select to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public)
values ('presskit-media', 'presskit-media', true)
on conflict (id) do update set public = true;

create policy "Allow public press kit uploads"
on storage.objects for insert to anon
with check (bucket_id = 'presskit-media');
