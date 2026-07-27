create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

drop policy if exists "Admins can verify their own access" on public.admin_users;
create policy "Admins can verify their own access"
on public.admin_users for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Allow authenticated admin reads" on public.djs;
drop policy if exists "Only designated admins can read DJs" on public.djs;
create policy "Only designated admins can read DJs"
on public.djs for select to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

-- Después de crear tu usuario en Authentication > Users, reemplaza el email:
--
-- insert into public.admin_users (user_id)
-- select id from auth.users
-- where email = 'tu-email@ejemplo.com'
-- on conflict (user_id) do nothing;
