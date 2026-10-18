-- Apply after 202609220001_builders_id.sql.
-- Replaces Builders ID setup codes with administrator-issued student aliases
-- (Recife Sketch model): an alias + temporary password, replaced by the student
-- on first sign-in. account_status 'pending' now means "still on a temporary
-- password"; ba_can_access() already denies portal data until it is 'active'.
-- Existing Builders ID accounts become aliases (BLD-7K2F9 -> bld-7k2f9) and keep
-- their passwords. auth.users is not modified. The old code/import tables are
-- left in place, unused.
begin;
alter table public.ba_profiles drop constraint if exists ba_profiles_auth_type_check;
alter table public.ba_profiles add column alias text unique check (alias ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$' and alias !~ '[._-]{2}');
update public.ba_profiles set alias=lower(builders_id), auth_type='alias', name=case when name='' then lower(builders_id) else name end
 where auth_type='builders_id';
alter table public.ba_profiles add constraint ba_profiles_auth_type_check check (auth_type in ('email','alias'));
alter table public.ba_profiles add constraint ba_profiles_alias_type check ((auth_type='alias') = (alias is not null));

-- Trusted (alias) users can only be created with the service role: app_metadata is server-only.
create or replace function public.ba_create_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare trusted boolean := coalesce(new.raw_app_meta_data->>'auth_type','')='alias';
 admin_created boolean := coalesce(new.raw_app_meta_data->>'ba_admin_created','false')='true' or new.invited_at is not null;
 m jsonb := coalesce(new.raw_user_meta_data,'{}');
 a text := new.raw_app_meta_data->>'alias';
begin
 if not trusted and (new.email ~* '(\.sch\.|\.edu(\.|$)|\.ac\.|\.invalid$)') then raise exception 'Use personal email or a student alias'; end if;
 if not trusted and not admin_created and m->>'privacy_notice_version' is distinct from '1.0' then raise exception 'Privacy notice acceptance required'; end if;
 if length(coalesce(m->>'name',''))>80 then raise exception 'Name too long'; end if;
 insert into public.ba_profiles(id,name,year,what_building,display_name,personal_email,alias,auth_type,account_status,privacy_notice_version,privacy_notice_accepted_at)
 values(new.id,case when trusted then a else coalesce(m->>'name','') end,coalesce(m->>'year',''),coalesce(m->>'whatBuilding',''),case when trusted then a else coalesce(m->>'name','') end,
 case when trusted then null else new.email end,case when trusted then a else null end,case when trusted then 'alias' else 'email' end,
 case when trusted or admin_created then 'pending' else 'active' end,
 case when not trusted and not admin_created then '1.0' else null end,case when not trusted and not admin_created then now() else null end);
 return new;
end $$;

create or replace function public.ba_check_email_change() returns trigger language plpgsql set search_path='' as $$
begin
 if new.email is distinct from old.email and new.email ~* '(\.sch\.|\.edu(\.|$)|\.ac\.|\.invalid$)' then
 raise exception 'Use personal email or a student alias'; end if;
 return new;
end $$;

-- Admin list: aliases with their last sign-in, read from auth.users.
create function public.ba_list_aliases() returns table(user_id uuid,alias text,created_at timestamptz,last_sign_in_at timestamptz,account_status text)
language sql stable security definer set search_path='' as $$
 select p.id,p.alias,p.created_at,u.last_sign_in_at,p.account_status
 from public.ba_profiles p join auth.users u on u.id=p.id where p.auth_type='alias' order by p.alias;
$$;
-- After an admin issues a new temporary password: back to pending, signed out everywhere.
create function public.ba_reset_alias(p_user uuid,p_admin uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.ba_profiles set account_status='pending' where id=p_user and auth_type='alias';
 if not found then raise exception 'Alias not found'; end if;
 delete from auth.sessions where user_id=p_user;
 insert into public.ba_admin_audit(admin_id,action,affected_user_id) values(p_admin,'alias.password_reset',p_user);
end $$;
-- After the student replaces their temporary password.
create function public.ba_finish_alias(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.ba_profiles set account_status='active',setup_completed_at=coalesce(setup_completed_at,now()),privacy_notice_version='1.0',privacy_notice_accepted_at=now()
 where id=p_user and auth_type='alias' and account_status='pending';
 if not found then raise exception 'Account cannot be activated'; end if;
end $$;
do $$ declare f regprocedure; begin
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('ba_list_aliases','ba_reset_alias','ba_finish_alias') loop
 execute format('revoke all on function %s from public,anon,authenticated',f);
 execute format('grant execute on function %s to service_role',f);
 end loop;
end $$;
commit;
