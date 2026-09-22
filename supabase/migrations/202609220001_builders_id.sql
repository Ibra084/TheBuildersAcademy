-- Apply after supabase/setup.sql. Existing accounts stay email accounts.
begin;
alter table public.ba_profiles
  add column first_name text not null default '',
  add column last_name text not null default '',
  add column display_name text not null default '',
  add column personal_email text,
  add column builders_id text unique check (builders_id ~ '^BLD-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$'),
  add column auth_type text not null default 'email' check (auth_type in ('email','builders_id')),
  add column account_status text not null default 'active' check (account_status in ('active','disabled','pending')),
  add column privacy_notice_version text,
  add column privacy_notice_accepted_at timestamptz,
  add column setup_completed_at timestamptz,
  add column updated_at timestamptz not null default now();
update public.ba_profiles set display_name=name;
-- Do not guess first/last names, backfill consent, or duplicate legacy school emails.
update public.ba_profiles p set personal_email=u.email from auth.users u
 where p.id=u.id and u.email !~* '(\.sch\.|\.edu(\.|$)|\.ac\.|\.invalid$)';

create table public.ba_imports (
 id uuid primary key default gen_random_uuid(), admin_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 day',
 confirmed_at timestamptz
);
create table public.ba_import_items (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null references public.ba_imports(id) on delete cascade,
 builders_id text unique not null, student jsonb not null,
 user_id uuid references auth.users(id) on delete set null,
 state text not null default 'reserved' check(state in ('reserved','processing','auth_created','created','failed')),
 lease_until timestamptz, error text
);
create table public.ba_account_codes (
 user_id uuid primary key references auth.users(id) on delete cascade,
 code_hash text not null, purpose text not null check(purpose in ('setup','recovery')),
 expires_at timestamptz not null, consumed_at timestamptz, issued_at timestamptz not null default now()
);
create table public.ba_admin_audit (
 id bigint generated always as identity primary key, admin_id uuid references auth.users(id) on delete set null,
 action text not null, affected_user_id uuid references auth.users(id) on delete set null,
 metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.ba_rate_limits (
 key text primary key, count integer not null, reset_at timestamptz not null
);
create table public.ba_data_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('correction','deletion','question')), message text not null check(length(message) between 1 and 1000),
 created_at timestamptz not null default now(), resolved_at timestamptz
);
-- All secrets, identifier reservations, import rows and audit writes are server-only.
do $$ declare t text; begin
 foreach t in array array['ba_imports','ba_import_items','ba_account_codes','ba_admin_audit','ba_rate_limits','ba_data_requests'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant usage, select on sequence public.ba_admin_audit_id_seq to service_role;

create or replace function public.ba_can_access() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ba_profiles p where p.id=(select auth.uid()) and p.account_status='active')
 and exists(select 1 from auth.sessions s where s.user_id=(select auth.uid()) and s.id::text=(select auth.jwt()->>'session_id'));
$$;
create or replace function public.ba_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select public.ba_can_access() and exists(select 1 from auth.users where id=(select auth.uid()) and lower(email)='14irahman@jess.sch.ae' and email_confirmed_at is not null);
$$;
revoke all on function public.ba_can_access() from public,anon;
grant execute on function public.ba_can_access() to authenticated,service_role;

-- Restrictive policies also block previously issued tokens for disabled accounts.
do $$ declare t text; begin
 foreach t in array array['ba_profiles','ba_content','ba_projects','ba_checkins','ba_responses','ba_digest_issues'] loop
 execute format('create policy ba_active_account on public.%I as restrictive for all to authenticated using ((select public.ba_can_access())) with check ((select public.ba_can_access()))',t);
 end loop;
end $$;
-- Keep the existing public digest-image read access; admin writes use ba_is_admin().

-- No member can edit role/status, identifier, private email or acceptance fields.
revoke select on public.ba_profiles from authenticated;
grant select(id,name,year,what_building,photo,created_at,updated_at,display_name) on public.ba_profiles to authenticated;
create function public.ba_my_account() returns setof public.ba_profiles language sql stable security definer set search_path='' as $$
 select * from public.ba_profiles where id=(select auth.uid());
$$;
revoke all on function public.ba_my_account() from public,anon;
grant execute on function public.ba_my_account() to authenticated;

create or replace function public.ba_create_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare trusted boolean := coalesce(new.raw_app_meta_data->>'auth_type','')='builders_id';
 admin_created boolean := coalesce(new.raw_app_meta_data->>'ba_admin_created','false')='true' or new.invited_at is not null;
 m jsonb := coalesce(new.raw_user_meta_data,'{}');
begin
 if not trusted and (new.email ~* '(\.sch\.|\.edu(\.|$)|\.ac\.|\.invalid$)') then raise exception 'Use personal email or Builders ID'; end if;
 if not trusted and not admin_created and m->>'privacy_notice_version' is distinct from '1.0' then raise exception 'Privacy notice acceptance required'; end if;
 if length(coalesce(m->>'name',''))>161 or length(coalesce(m->>'first_name',''))>80 or length(coalesce(m->>'last_name',''))>80 or length(coalesce(m->>'display_name',''))>161 then raise exception 'Name too long'; end if;
 insert into public.ba_profiles(id,name,year,what_building,first_name,last_name,display_name,personal_email,builders_id,auth_type,account_status,privacy_notice_version,privacy_notice_accepted_at)
 values(new.id,coalesce(m->>'display_name',m->>'name',''),coalesce(m->>'year',''),coalesce(m->>'whatBuilding',''),coalesce(m->>'first_name',''),coalesce(m->>'last_name',''),coalesce(m->>'display_name',m->>'name',''),case when trusted then null else new.email end,
 case when trusted then new.raw_app_meta_data->>'builders_id' else null end,case when trusted then 'builders_id' else 'email' end,
 case when trusted or admin_created then 'pending' else 'active' end,
 case when not trusted and not admin_created then '1.0' else null end,case when not trusted and not admin_created then now() else null end);
 if trusted and new.raw_app_meta_data ? 'import_item_id' then
 update public.ba_import_items set user_id=new.id,state='auth_created' where id=(new.raw_app_meta_data->>'import_item_id')::uuid and user_id is null;
 if not found then raise exception 'Invalid import reservation'; end if;
 end if;
 return new;
end $$;
create function public.ba_touch_profile() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger ba_profile_updated before update on public.ba_profiles for each row execute function public.ba_touch_profile();

-- Unchanged legacy addresses, including the owner, continue working.
create function public.ba_check_email_change() returns trigger language plpgsql set search_path='' as $$
begin
 if new.email is distinct from old.email and new.email ~* '(\.sch\.|\.edu(\.|$)|\.ac\.|\.invalid$)' then
 raise exception 'Use personal email or Builders ID'; end if;
 return new;
end $$;
create trigger ba_email_change before update of email on auth.users for each row execute function public.ba_check_email_change();

create function public.ba_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; begin
 delete from public.ba_rate_limits where reset_at<now()-interval '1 day';
 insert into public.ba_rate_limits(key,count,reset_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set count=case when ba_rate_limits.reset_at<=now() then 1 else ba_rate_limits.count+1 end,
 reset_at=case when ba_rate_limits.reset_at<=now() then now()+make_interval(secs=>p_seconds) else ba_rate_limits.reset_at end returning count into n;
 return n<=p_limit; end $$;
create function public.ba_claim_import(p_item uuid,p_admin uuid) returns setof public.ba_import_items language sql security definer set search_path='' as $$
 update public.ba_import_items i set state=case when i.user_id is null then 'processing' else 'auth_created' end,lease_until=now()+interval '2 minutes',error=null
 from public.ba_imports b where i.id=p_item and b.id=i.batch_id and b.admin_id=p_admin and b.confirmed_at is not null and b.expires_at>now()
 and i.state<>'created' and (i.lease_until is null or i.lease_until<now()) returning i.*;
$$;
create function public.ba_issue_code(p_user uuid,p_hash text,p_purpose text,p_admin uuid,p_item uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.ba_profiles where id=p_user and auth_type='builders_id' and account_status<>'disabled' for update;
 if not found then raise exception 'Account not available'; end if;
 insert into public.ba_account_codes(user_id,code_hash,purpose,expires_at) values(p_user,p_hash,p_purpose,now()+interval '24 hours')
 on conflict(user_id) do update set code_hash=excluded.code_hash,purpose=excluded.purpose,expires_at=excluded.expires_at,consumed_at=null,issued_at=now();
 if p_item is not null then
 update public.ba_import_items set state='created',lease_until=null where id=p_item;
 if not exists(select 1 from public.ba_import_items i where i.batch_id=(select batch_id from public.ba_import_items where id=p_item) and i.state<>'created') then
 insert into public.ba_admin_audit(admin_id,action,metadata) values(p_admin,'student.bulk_created',jsonb_build_object('batch_id',(select batch_id from public.ba_import_items where id=p_item)));
 end if;
 end if;
 insert into public.ba_admin_audit(admin_id,action,affected_user_id) values(p_admin,case when p_item is not null then 'student.created' when p_purpose='setup' then 'student.setup_reissued' else 'student.recovery_issued' end,p_user);
end $$;
create function public.ba_consume_code(p_id text,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid; begin
 select p.id into uid from public.ba_profiles p join public.ba_account_codes c on c.user_id=p.id
 where p.builders_id=p_id and p.account_status<>'disabled' and c.code_hash=p_hash and c.consumed_at is null and c.expires_at>now() for update of p,c;
 if uid is null then return null; end if;
 update public.ba_account_codes set consumed_at=now() where user_id=uid;
 update public.ba_profiles set account_status='pending' where id=uid;
 delete from auth.sessions where user_id=uid;
 return uid; end $$;
create function public.ba_finish_setup(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.ba_profiles set account_status='active',setup_completed_at=coalesce(setup_completed_at,now()),privacy_notice_version='1.0',privacy_notice_accepted_at=now()
 where id=p_user and account_status='pending' and exists(select 1 from public.ba_account_codes where user_id=p_user and consumed_at is not null);
 if not found then raise exception 'Account cannot be activated'; end if;
end $$;
create function public.ba_manage_student(p_user uuid,p_admin uuid,p_action text,p_name text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_user=p_admin then raise exception 'Cannot change your own administrator access'; end if;
 perform 1 from public.ba_profiles where id=p_user for update;
 if not found then raise exception 'Account not found'; end if;
 if p_action='disable' then
 update public.ba_profiles set account_status='disabled' where id=p_user;
 delete from auth.sessions where user_id=p_user;
 update public.ba_account_codes set consumed_at=now() where user_id=p_user;
 elsif p_action='enable' then update public.ba_profiles set account_status=case when auth_type='builders_id' and setup_completed_at is null then 'pending' else 'active' end where id=p_user;
 elsif p_action='rename' then
 if length(trim(p_name)) not between 1 and 80 then raise exception 'Invalid display name'; end if;
 update public.ba_profiles set name=trim(p_name),display_name=trim(p_name) where id=p_user;
 else raise exception 'Unsupported action'; end if;
 insert into public.ba_admin_audit(admin_id,action,affected_user_id) values(p_admin,case p_action when 'disable' then 'student.disabled' when 'enable' then 'student.enabled' else 'student.name_changed' end,p_user);
end $$;
-- Server-only RPCs: never callable with a student's token or public key.
do $$ declare f regprocedure; begin
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('ba_limit','ba_claim_import','ba_issue_code','ba_consume_code','ba_finish_setup','ba_manage_student') loop
 execute format('revoke all on function %s from public,anon,authenticated',f);
 execute format('grant execute on function %s to service_role',f);
 end loop;
end $$;
commit;

