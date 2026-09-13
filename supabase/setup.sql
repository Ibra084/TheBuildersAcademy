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

-- Public Weekly Digest: fully separate from the member portal's own
-- digest (ba_content kind='digests'). Unlike every other table here,
-- published issues are readable by anon (logged-out) visitors, since this
-- is the public-facing digest on the landing site. Only the owner/admin
-- can create, edit, publish, or delete an issue.
create table if not exists public.ba_digest_issues (
  id uuid primary key default gen_random_uuid(),
  issue_number integer not null default 1,
  date date not null default current_date,
  headline text not null default '',
  teaser text not null default '',
  ai_news jsonb not null default '[]'::jsonb,
  build_something jsonb not null default '{}'::jsonb,
  resource_of_week jsonb not null default '{}'::jsonb,
  community_update text not null default '',
  source_url text,
  raw_import text,
  body text,
  teaser_image text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
-- Safe to re-run: adds the columns if this table already existed from an
-- earlier version of this script (before full-article import / images existed).
alter table public.ba_digest_issues add column if not exists body text;
alter table public.ba_digest_issues add column if not exists teaser_image text;

-- Storage bucket for digest images (teaser images + any images pasted into
-- an article body). Public bucket: anyone can view an image by URL, but
-- only the admin can upload/replace/delete — enforced below via RLS on
-- storage.objects, same pattern as everything else in this file.
insert into storage.buckets (id, name, public)
values ('digest-images', 'digest-images', true)
on conflict (id) do nothing;

create index if not exists ba_projects_owner on public.ba_projects(owner_id);
create index if not exists ba_checkins_session on public.ba_checkins(session_id);
create index if not exists ba_responses_user on public.ba_responses(user_id);
create index if not exists ba_digest_issues_published on public.ba_digest_issues(published, date desc);

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
alter table public.ba_digest_issues enable row level security;

revoke all on public.ba_profiles, public.ba_content, public.ba_projects,
  public.ba_checkins, public.ba_responses, public.ba_digest_issues from anon, authenticated;
grant select on public.ba_profiles to authenticated;
grant update (name, year, what_building, photo) on public.ba_profiles to authenticated;
grant select, insert, update on public.ba_content, public.ba_projects,
  public.ba_checkins, public.ba_responses to authenticated;
grant select on public.ba_digest_issues to anon, authenticated;
grant insert, update, delete on public.ba_digest_issues to authenticated;

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

drop policy if exists ba_digest_issues_read on public.ba_digest_issues;
create policy ba_digest_issues_read on public.ba_digest_issues for select to anon, authenticated
  using (published = true or (select public.ba_is_admin()));
drop policy if exists ba_digest_issues_create on public.ba_digest_issues;
create policy ba_digest_issues_create on public.ba_digest_issues for insert to authenticated
  with check ((select public.ba_is_admin()));
drop policy if exists ba_digest_issues_edit on public.ba_digest_issues;
create policy ba_digest_issues_edit on public.ba_digest_issues for update to authenticated
  using ((select public.ba_is_admin())) with check ((select public.ba_is_admin()));
drop policy if exists ba_digest_issues_delete on public.ba_digest_issues;
create policy ba_digest_issues_delete on public.ba_digest_issues for delete to authenticated
  using ((select public.ba_is_admin()));

drop policy if exists ba_digest_images_read on storage.objects;
create policy ba_digest_images_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'digest-images');
drop policy if exists ba_digest_images_write on storage.objects;
create policy ba_digest_images_write on storage.objects for insert to authenticated
  with check (bucket_id = 'digest-images' and (select public.ba_is_admin()));
drop policy if exists ba_digest_images_update on storage.objects;
create policy ba_digest_images_update on storage.objects for update to authenticated
  using (bucket_id = 'digest-images' and (select public.ba_is_admin()));
drop policy if exists ba_digest_images_delete on storage.objects;
create policy ba_digest_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'digest-images' and (select public.ba_is_admin()));

commit;

-- Confirms setup and whether the owner already exists in Supabase Auth.
select 'Portal tables ready' as setup,
  exists(select 1 from auth.users where lower(email) = '14irahman@jess.sch.ae') as owner_registered,
  exists(select 1 from auth.users where lower(email) = '14irahman@jess.sch.ae'
    and email_confirmed_at is not null) as owner_email_verified;
