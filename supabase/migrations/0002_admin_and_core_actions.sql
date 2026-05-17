-- Connectly V1.1: admin hardening and core action helpers.
-- Run after 0001_connectly_schema.sql.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and status = 'ACTIVE'
      and role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and status = 'ACTIVE'
      and role = 'SUPER_ADMIN'
  );
$$;

create or replace function public.protect_profile_role_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.role in ('ADMIN', 'SUPER_ADMIN') and new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only a super admin can grant admin roles';
  end if;

  if old.auth_user_id = auth.uid() and not public.is_admin() then
    if new.role in ('ADMIN', 'SUPER_ADMIN') then
      raise exception 'Admin roles cannot be requested through onboarding';
    end if;

    new.status = old.status;
    new.auth_user_id = old.auth_user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role_status on public.profiles;
create trigger protect_profile_role_status
before update on public.profiles
for each row execute function public.protect_profile_role_status();

drop policy if exists "Eligible users post jobs" on public.jobs;
create policy "Eligible users post jobs" on public.jobs
  for insert with check (
    posted_by = public.current_profile_id()
    and public.current_role() in ('ALUMNI', 'FACULTY', 'ADMIN', 'SUPER_ADMIN')
    and public.is_active()
  );

drop policy if exists "Faculty admins create events" on public.events;
create policy "Faculty admins create events" on public.events
  for insert with check (
    created_by = public.current_profile_id()
    and public.current_role() in ('FACULTY', 'ADMIN', 'SUPER_ADMIN')
    and public.is_active()
  );

drop policy if exists "Faculty admins publish feed" on public.feed_posts;
create policy "Faculty admins publish feed" on public.feed_posts
  for insert with check (
    author_id = public.current_profile_id()
    and public.current_role() in ('FACULTY', 'ADMIN', 'SUPER_ADMIN')
    and public.is_active()
  );

drop policy if exists "Users create own privacy settings" on public.privacy_settings;
create policy "Users create own privacy settings" on public.privacy_settings
  for insert with check (profile_id = public.current_profile_id());

create or replace function public.replace_profile_skills(target_profile_id uuid, skill_names text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_names text[];
begin
  if target_profile_id is null then
    raise exception 'target_profile_id is required';
  end if;

  if not (target_profile_id = public.current_profile_id() or public.is_admin()) then
    raise exception 'Not allowed to update skills for this profile';
  end if;

  select coalesce(array_agg(trimmed order by trimmed), '{}')
  into clean_names
  from (
    select distinct nullif(trim(name), '') as trimmed
    from unnest(coalesce(skill_names, '{}')) as skill_name(name)
    where nullif(trim(name), '') is not null
    order by trimmed
    limit 30
  ) names
  where trimmed is not null;

  delete from public.user_skills where profile_id = target_profile_id;

  insert into public.skills (name, category)
  select unnest(clean_names), 'General'
  on conflict (name) do nothing;

  insert into public.user_skills (profile_id, skill_id)
  select target_profile_id, s.id
  from public.skills s
  join unnest(clean_names) as clean(name)
    on lower(s.name::text) = lower(clean.name)
  on conflict do nothing;
end;
$$;

create or replace function public.sync_feed_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.feed_posts
      set likes_count = likes_count + 1
      where id = new.post_id;
    return new;
  end if;

  update public.feed_posts
    set likes_count = greatest(0, likes_count - 1)
    where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists feed_likes_insert_count on public.post_likes;
drop trigger if exists feed_likes_delete_count on public.post_likes;
create trigger feed_likes_insert_count
after insert on public.post_likes
for each row execute function public.sync_feed_like_count();
create trigger feed_likes_delete_count
after delete on public.post_likes
for each row execute function public.sync_feed_like_count();

create or replace function public.sync_feed_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.feed_posts
    set comments_count = comments_count + 1
    where id = new.post_id;
  return new;
end;
$$;

drop trigger if exists feed_comments_insert_count on public.comments;
create trigger feed_comments_insert_count
after insert on public.comments
for each row execute function public.sync_feed_comment_count();

create or replace view public.event_cards
as
select
  e.*,
  coalesce(p.full_name, 'Connectly') as created_by_name,
  count(er.id) filter (where er.status = 'REGISTERED')::int as registrations_count
from public.events e
left join public.profiles p on p.id = e.created_by
left join public.event_registrations er on er.event_id = e.id
group by e.id, p.full_name;

create or replace view public.job_cards
with (security_invoker = true)
as
select
  j.*,
  coalesce(p.full_name, 'Alumni') as posted_by_name,
  count(ja.id)::int as applications_count
from public.jobs j
left join public.profiles p on p.id = j.posted_by
left join public.job_applications ja on ja.job_id = j.id
group by j.id, p.full_name;
