-- Connectly V1.4b: remove legacy mixed-role columns from public.profiles.
-- Run after 0005_prepare_profile_cleanup.sql and after deploying the new app code.

do $$
begin
  if exists (
    select 1
    from public.profiles p
    left join public.student_profiles sp on sp.profile_id = p.id
    left join public.alumni_profiles ap on ap.profile_id = p.id
    left join public.faculty_profiles fp on fp.profile_id = p.id
    left join public.admin_profiles adm on adm.profile_id = p.id
    where (p.role = 'STUDENT' and sp.profile_id is null)
       or (p.role = 'ALUMNI' and ap.profile_id is null)
       or (p.role = 'FACULTY' and fp.profile_id is null)
       or (p.role in ('ADMIN', 'SUPER_ADMIN') and adm.profile_id is null)
  ) then
    raise exception 'Cannot remove legacy profile columns: one or more profiles are missing role-specific rows';
  end if;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  imported public.alumni_imports;
  target_profile_id uuid;
begin
  select * into imported
  from public.alumni_imports
  where lower(email::text) = lower(new.email)
    and status = 'INVITED'
  limit 1;

  if found then
    insert into public.profiles (
      auth_user_id, full_name, email, role, status, department, profile_completeness
    )
    values (
      new.id, imported.full_name, imported.email, 'ALUMNI', 'ACTIVE',
      imported.department, 70
    )
    on conflict (email) do update
      set auth_user_id = excluded.auth_user_id,
          status = 'ACTIVE',
          role = 'ALUMNI',
          department = coalesce(public.profiles.department, excluded.department),
          profile_completeness = greatest(public.profiles.profile_completeness, excluded.profile_completeness),
          updated_at = now()
    returning id into target_profile_id;

    insert into public.alumni_profiles (
      profile_id, graduation_year, company, designation, mentorship_available
    )
    values (
      target_profile_id, imported.graduation_year, imported.company, imported.designation, false
    )
    on conflict (profile_id) do update
      set graduation_year = coalesce(public.alumni_profiles.graduation_year, excluded.graduation_year),
          company = coalesce(public.alumni_profiles.company, excluded.company),
          designation = coalesce(public.alumni_profiles.designation, excluded.designation),
          updated_at = now();

    update public.alumni_imports
      set status = 'ACTIVE', matched_profile_id = target_profile_id
      where id = imported.id;
  else
    insert into public.profiles (auth_user_id, full_name, email, role, status, profile_completeness)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      new.email,
      'STUDENT',
      'PENDING',
      20
    )
    on conflict (email) do update
      set auth_user_id = excluded.auth_user_id,
          updated_at = now()
    returning id into target_profile_id;

    insert into public.student_profiles (profile_id)
    values (target_profile_id)
    on conflict (profile_id) do nothing;
  end if;

  insert into public.privacy_settings (profile_id)
  values (target_profile_id)
  on conflict do nothing;

  return new;
end;
$$;

create or replace view public.profile_directory
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
  case when p.role = 'STUDENT' then sp.interests else '{}'::text[] end as interests,
  p.technology_stack,
  p.achievements,
  p.projects,
  p.social_links,
  fp.academic_title,
  coalesce(fp.publications, '{}'::text[]) as publications,
  coalesce(fp.research_interests, '{}'::text[]) as research_interests,
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
  sp.degree,
  sp.specialization,
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

drop index if exists public.profiles_department_year_idx;
drop index if exists public.profiles_company_idx;
drop index if exists public.profiles_industry_city_idx;
drop index if exists public.profiles_mentor_idx;
drop index if exists public.profiles_faculty_id_idx;
drop index if exists public.profiles_academic_discovery_idx;

alter table public.profiles
  drop column if exists graduation_year,
  drop column if exists student_id,
  drop column if exists company,
  drop column if exists designation,
  drop column if exists industry,
  drop column if exists career_goals,
  drop column if exists interests,
  drop column if exists academic_title,
  drop column if exists publications,
  drop column if exists research_interests,
  drop column if exists is_mentor,
  drop column if exists mentor_categories,
  drop column if exists mentorship_capacity,
  drop column if exists faculty_id,
  drop column if exists office_location,
  drop column if exists office_hours;

-- Emergency rollback would require restoring these columns from a database backup
-- or from role-specific tables. Take a production backup before running this.
