-- The Builders: shared portal database and owner-only administration.
-- Run this entire script in your Supabase project's SQL Editor.
-- It does not delete existing accounts or create sample content.
begin;

create or replace function public.ba_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid())
      and lower(email) = '14irahman@jess.sch.ae'
      and email_confirmed_at is not null
  );
$$;
revoke all on function public.ba_is_admin() from public, anon;
grant execute on function public.ba_is_admin() to authenticated;

create table if not exists public.ba_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  year text not null default '',
  what_building text not null default '',
  photo text,
  created_at timestamptz not null default now()
);

create table if not exists public.ba_content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sessions', 'resources', 'digests')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ba_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.ba_profiles(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ba_checkins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ba_content(id),
  session_title text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index if not exists ba_one_active_checkin
  on public.ba_checkins ((true)) where ended_at is null;

create table if not exists public.ba_responses (
  checkin_id uuid not null references public.ba_checkins(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.ba_profiles(id) on delete cascade,
  status text not null check (status in ('present', 'absent')),
  responded_at timestamptz not null default now(),
  primary key (checkin_id, user_id)
);

create index if not exists ba_projects_owner on public.ba_projects(owner_id);
create index if not exists ba_checkins_session on public.ba_checkins(session_id);
create index if not exists ba_responses_user on public.ba_responses(user_id);

-- Profile metadata is separate from authorization: members cannot set an admin flag.
create or replace function public.ba_create_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.ba_profiles(id, name, year, what_building)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'year', ''),
    coalesce(new.raw_user_meta_data->>'whatBuilding', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.ba_create_profile() from public, anon, authenticated;
drop trigger if exists ba_on_auth_user_created on auth.users;
create trigger ba_on_auth_user_created after insert on auth.users
  for each row execute function public.ba_create_profile();

-- Include real accounts already registered with Supabase.
insert into public.ba_profiles(id, name, year, what_building)
select id, coalesce(raw_user_meta_data->>'name', ''),
  coalesce(raw_user_meta_data->>'year', ''),
  coalesce(raw_user_meta_data->>'whatBuilding', '')
from auth.users on conflict (id) do nothing;

alter table public.ba_profiles enable row level security;
alter table public.ba_content enable row level security;
alter table public.ba_projects enable row level security;
alter table public.ba_checkins enable row level security;
alter table public.ba_responses enable row level security;

revoke all on public.ba_profiles, public.ba_content, public.ba_projects,
  public.ba_checkins, public.ba_responses from anon, authenticated;
grant select on public.ba_profiles to authenticated;
grant update (name, year, what_building, photo) on public.ba_profiles to authenticated;
grant select, insert, update on public.ba_content, public.ba_projects,
  public.ba_checkins, public.ba_responses to authenticated;

-- Named policies are replaced so this script can be rerun safely.
drop policy if exists ba_profiles_read on public.ba_profiles;
create policy ba_profiles_read on public.ba_profiles for select to authenticated using (true);
drop policy if exists ba_profiles_edit on public.ba_profiles;
create policy ba_profiles_edit on public.ba_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists ba_content_read on public.ba_content;
create policy ba_content_read on public.ba_content for select to authenticated
  using (not archived or (select public.ba_is_admin()));
drop policy if exists ba_content_create on public.ba_content;
create policy ba_content_create on public.ba_content for insert to authenticated
  with check ((select public.ba_is_admin()));
drop policy if exists ba_content_edit on public.ba_content;
create policy ba_content_edit on public.ba_content for update to authenticated
  using ((select public.ba_is_admin())) with check ((select public.ba_is_admin()));

drop policy if exists ba_projects_read on public.ba_projects;
create policy ba_projects_read on public.ba_projects for select to authenticated
  using (not archived or owner_id = (select auth.uid()) or (select public.ba_is_admin()));
drop policy if exists ba_projects_create on public.ba_projects;
create policy ba_projects_create on public.ba_projects for insert to authenticated
  with check (owner_id = (select auth.uid()) and not archived);
drop policy if exists ba_projects_edit on public.ba_projects;
create policy ba_projects_edit on public.ba_projects for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.ba_is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.ba_is_admin()));

drop policy if exists ba_checkins_read on public.ba_checkins;
create policy ba_checkins_read on public.ba_checkins for select to authenticated using (true);
drop policy if exists ba_checkins_create on public.ba_checkins;
create policy ba_checkins_create on public.ba_checkins for insert to authenticated
  with check ((select public.ba_is_admin()) and exists (
    select 1 from public.ba_content c where c.id = session_id
      and c.kind = 'sessions' and not c.archived
  ));
drop policy if exists ba_checkins_edit on public.ba_checkins;
create policy ba_checkins_edit on public.ba_checkins for update to authenticated
  using ((select public.ba_is_admin())) with check ((select public.ba_is_admin()));

drop policy if exists ba_responses_read on public.ba_responses;
create policy ba_responses_read on public.ba_responses for select to authenticated
  using (user_id = (select auth.uid()) or (select public.ba_is_admin()));
drop policy if exists ba_responses_create on public.ba_responses;
create policy ba_responses_create on public.ba_responses for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.ba_checkins c where c.id = checkin_id and c.ended_at is null
  ));
drop policy if exists ba_responses_edit on public.ba_responses;
create policy ba_responses_edit on public.ba_responses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.ba_checkins c where c.id = checkin_id and c.ended_at is null
  ));

commit;

-- Confirms setup and whether the owner already exists in Supabase Auth.
select 'Portal tables ready' as setup,
  exists(select 1 from auth.users where lower(email) = '14irahman@jess.sch.ae') as owner_registered,
  exists(select 1 from auth.users where lower(email) = '14irahman@jess.sch.ae'
    and email_confirmed_at is not null) as owner_email_verified;
