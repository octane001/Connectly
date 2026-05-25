-- Connectly V1.5: Schema refinements, bug fixes, and functional gaps.
-- Addresses issues identified in the schema analysis.

-- 1. Fix Comment Count Synchronization (Handle DELETE)
create or replace function public.sync_feed_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.feed_posts
      set comments_count = comments_count + 1
      where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.feed_posts
      set comments_count = greatest(0, comments_count - 1)
      where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists feed_comments_sync_count on public.comments;
create trigger feed_comments_sync_count
after insert or delete on public.comments
for each row execute function public.sync_feed_comment_count();

-- 2. Restore/Add missing columns for Alumni and Faculty
alter table public.alumni_profiles
add column if not exists interests text[] not null default '{}',
add column if not exists degree text,
add column if not exists specialization text;

alter table public.faculty_profiles
add column if not exists interests text[] not null default '{}',
add column if not exists office_hours text;

-- 3. Experience/Internship History Table
create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organization text not null,
  location text,
  start_date date not null,
  end_date date, -- null means "Present"
  description text,
  is_internship boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.experience enable row level security;

drop policy if exists "Users can read all experience" on public.experience;
create policy "Users can read all experience" on public.experience
  for select using (true);

drop policy if exists "Users manage own experience" on public.experience;
create policy "Users manage own experience" on public.experience
  for all using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

drop trigger if exists experience_updated_at on public.experience;
create trigger experience_updated_at before update on public.experience
for each row execute function public.set_updated_at();

-- 4. Audit Logs Table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs" on public.audit_logs
  for select using (public.is_admin());

-- 5. Message Threads Uniqueness and Integrity
-- Ensure one thread per mentorship request
alter table public.message_threads
add constraint message_threads_mentorship_request_id_key unique (mentorship_request_id);

-- 6. Event Registrations Status Constraint
alter table public.event_registrations
add constraint event_registrations_status_check
check (status in ('REGISTERED', 'ATTENDED', 'CANCELLED', 'WAITLISTED'));

-- 7. Update Views
-- 7.1 event_cards with security_invoker
drop view if exists public.event_cards;
create view public.event_cards
with (security_invoker = true)
as
select
  e.*,
  coalesce(p.full_name, 'Connectly') as created_by_name,
  count(er.id) filter (where er.status = 'REGISTERED')::int as registrations_count
from public.events e
left join public.profiles p on p.id = e.created_by
left join public.event_registrations er on er.event_id = e.id
group by e.id, p.full_name;

-- 7.2 Updated profile_directory to include restored fields
drop view if exists public.profile_directory;
create view public.profile_directory
with (security_invoker = true)
as
with profile_skills as (
  select
    us.profile_id,
    coalesce(array_agg(distinct s.name::text order by s.name::text) filter (where s.name is not null), '{}') as skills,
    coalesce(string_agg(distinct s.name::text, ' '), '') as skill_text
  from public.user_skills us
  join public.skills s on s.id = us.skill_id
  group by us.profile_id
)
select
  p.id,
  p.auth_user_id,
  p.full_name,
  p.email,
  p.avatar_url,
  p.role,
  p.status,
  p.department,
  ap.graduation_year,
  sp.student_id,
  p.bio,
  case when p.role in ('ADMIN', 'SUPER_ADMIN') then adm.institution_name else ap.company end as company,
  coalesce(ap.designation, fp.designation, adm.internal_role) as designation,
  ap.industry,
  p.city,
  p.country,
  sp.career_goals,
  case
    when p.role = 'STUDENT' then sp.interests
    when p.role = 'ALUMNI' then ap.interests
    when p.role = 'FACULTY' then fp.interests
    else '{}'::text[]
  end as interests,
  p.technology_stack,
  p.achievements,
  p.projects,
  p.social_links,
  fp.academic_title,
  coalesce(fp.publications, '{}'::text[]) as publications,
  coalesce(fp.research_interests, '{}'::text[]) as research_interests,
  fp.office_hours,
  case
    when p.role = 'ALUMNI' then coalesce(ap.mentorship_available, false)
    when p.role = 'FACULTY' then coalesce(fp.mentorship_capacity, 0) > 0
    else false
  end as is_mentor,
  coalesce(mp.categories, '{}'::text[]) as mentor_categories,
  case
    when p.role = 'FACULTY' then coalesce(fp.mentorship_capacity, 0)
    when p.role = 'ALUMNI' and coalesce(ap.mentorship_available, false)
      then coalesce(mp.max_requests_per_month, 4)
    else 0
  end as mentorship_capacity,
  p.profile_completeness,
  p.created_at,
  p.updated_at,
  coalesce(ps.show_phone, false) as phone_visible,
  case
    when p.role = 'ALUMNI' then coalesce(ap.mentorship_available, false)
    when p.role = 'FACULTY' then coalesce(fp.mentorship_capacity, 0) > 0
    else false
  end as mentorship_available,
  coalesce(mp.categories, '{}'::text[]) as preference_categories,
  coalesce(profile_skills.skills, '{}'::text[]) as skills,
  setweight(to_tsvector('english', coalesce(p.full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(p.department, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(ap.company, adm.institution_name, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(ap.designation, fp.designation, adm.internal_role, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(ap.industry, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(fp.academic_title, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(fp.research_interests, ' '), '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(sp.interests, ' '), '')), 'C') ||
  setweight(to_tsvector('english', coalesce(sp.career_goals, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(profile_skills.skill_text, '')), 'C') as search_document,
  sp.current_year,
  coalesce(sp.degree, ap.degree) as degree,
  coalesce(sp.specialization, ap.specialization) as specialization,
  sp.cgpa,
  ap.experience_years,
  fp.faculty_id,
  fp.office_location,
  adm.admin_level,
  adm.permissions,
  adm.internal_role
from public.profiles p
left join public.student_profiles sp on sp.profile_id = p.id
left join public.alumni_profiles ap on ap.profile_id = p.id
left join public.faculty_profiles fp on fp.profile_id = p.id
left join public.admin_profiles adm on adm.profile_id = p.id
left join public.privacy_settings ps on ps.profile_id = p.id
left join public.mentorship_preferences mp on mp.profile_id = p.id
left join profile_skills on profile_skills.profile_id = p.id;
