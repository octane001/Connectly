-- Connectly V1.3: role-specific profile tables.
-- Additive compatibility migration. Legacy role columns on public.profiles are
-- intentionally retained for one release while services move to these tables.

alter table public.profiles
drop constraint if exists role_specific_id_check;

create table if not exists public.student_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  student_id text unique,
  current_year int check (current_year is null or current_year between 1 and 8),
  degree text,
  specialization text,
  cgpa numeric(4,2) check (cgpa is null or cgpa between 0 and 10),
  interests text[] not null default '{}',
  career_goals text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alumni_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  graduation_year int check (graduation_year is null or graduation_year between 1970 and 2035),
  company text,
  designation text,
  industry text,
  experience_years int check (experience_years is null or experience_years >= 0),
  mentorship_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faculty_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  faculty_id text unique,
  academic_title text,
  designation text,
  research_interests text[] not null default '{}',
  publications text[] not null default '{}',
  office_location text,
  mentorship_capacity int not null default 0 check (mentorship_capacity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  admin_level text not null default 'STAFF',
  permissions text[] not null default '{}',
  internal_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists student_profiles_updated_at on public.student_profiles;
create trigger student_profiles_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();

drop trigger if exists alumni_profiles_updated_at on public.alumni_profiles;
create trigger alumni_profiles_updated_at
before update on public.alumni_profiles
for each row execute function public.set_updated_at();

drop trigger if exists faculty_profiles_updated_at on public.faculty_profiles;
create trigger faculty_profiles_updated_at
before update on public.faculty_profiles
for each row execute function public.set_updated_at();

drop trigger if exists admin_profiles_updated_at on public.admin_profiles;
create trigger admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

insert into public.student_profiles (profile_id, student_id, interests, career_goals)
select p.id, p.student_id, p.interests, p.career_goals
from public.profiles p
where p.role = 'STUDENT'
on conflict (profile_id) do update
set student_id = coalesce(public.student_profiles.student_id, excluded.student_id),
    interests = case
      when public.student_profiles.interests = '{}' then excluded.interests
      else public.student_profiles.interests
    end,
    career_goals = coalesce(public.student_profiles.career_goals, excluded.career_goals);

insert into public.alumni_profiles (
  profile_id, graduation_year, company, designation, industry, experience_years, mentorship_available
)
select
  p.id,
  p.graduation_year,
  p.company,
  p.designation,
  p.industry,
  case
    when p.graduation_year is null then null
    else greatest(0, extract(year from current_date)::int - p.graduation_year)
  end,
  p.is_mentor
from public.profiles p
where p.role = 'ALUMNI'
on conflict (profile_id) do update
set graduation_year = coalesce(public.alumni_profiles.graduation_year, excluded.graduation_year),
    company = coalesce(public.alumni_profiles.company, excluded.company),
    designation = coalesce(public.alumni_profiles.designation, excluded.designation),
    industry = coalesce(public.alumni_profiles.industry, excluded.industry),
    experience_years = coalesce(public.alumni_profiles.experience_years, excluded.experience_years),
    mentorship_available = public.alumni_profiles.mentorship_available or excluded.mentorship_available;

insert into public.faculty_profiles (
  profile_id, faculty_id, academic_title, designation, research_interests, publications, office_location, mentorship_capacity
)
select
  p.id,
  p.faculty_id,
  p.academic_title,
  p.designation,
  p.research_interests,
  p.publications,
  p.office_location,
  p.mentorship_capacity
from public.profiles p
where p.role = 'FACULTY'
on conflict (profile_id) do update
set faculty_id = coalesce(public.faculty_profiles.faculty_id, excluded.faculty_id),
    academic_title = coalesce(public.faculty_profiles.academic_title, excluded.academic_title),
    designation = coalesce(public.faculty_profiles.designation, excluded.designation),
    research_interests = case
      when public.faculty_profiles.research_interests = '{}' then excluded.research_interests
      else public.faculty_profiles.research_interests
    end,
    publications = case
      when public.faculty_profiles.publications = '{}' then excluded.publications
      else public.faculty_profiles.publications
    end,
    office_location = coalesce(public.faculty_profiles.office_location, excluded.office_location),
    mentorship_capacity = greatest(public.faculty_profiles.mentorship_capacity, excluded.mentorship_capacity);

insert into public.admin_profiles (profile_id, admin_level, permissions, internal_role)
select
  p.id,
  case when p.role = 'SUPER_ADMIN' then 'SUPER' else 'STAFF' end,
  '{}',
  p.designation
from public.profiles p
where p.role in ('ADMIN', 'SUPER_ADMIN')
on conflict (profile_id) do nothing;

insert into public.alumni_imports (
  email, full_name, department, graduation_year, company, designation, status, matched_profile_id, imported_at
)
select
  p.email,
  p.full_name,
  p.department,
  ap.graduation_year,
  ap.company,
  ap.designation,
  p.status,
  p.id,
  p.created_at
from public.profiles p
join public.alumni_profiles ap on ap.profile_id = p.id
where p.role = 'ALUMNI'
  and p.email is not null
  and p.status = 'INVITED'
on conflict (email) do update
set matched_profile_id = coalesce(public.alumni_imports.matched_profile_id, excluded.matched_profile_id),
    status = excluded.status;

create index if not exists student_profiles_current_year_idx on public.student_profiles(current_year);
create index if not exists student_profiles_degree_idx on public.student_profiles(degree, specialization);
create index if not exists student_profiles_interests_idx on public.student_profiles using gin(interests);
create index if not exists alumni_profiles_graduation_year_idx on public.alumni_profiles(graduation_year);
create index if not exists alumni_profiles_industry_idx on public.alumni_profiles(industry);
create index if not exists alumni_profiles_company_search_idx
  on public.alumni_profiles using gin (to_tsvector('english', coalesce(company, '') || ' ' || coalesce(designation, '')));
create index if not exists alumni_profiles_mentor_idx
  on public.alumni_profiles(mentorship_available) where mentorship_available = true;
create index if not exists faculty_profiles_research_idx on public.faculty_profiles using gin(research_interests);
create index if not exists faculty_profiles_capacity_idx
  on public.faculty_profiles(mentorship_capacity) where mentorship_capacity > 0;
create index if not exists admin_profiles_level_idx on public.admin_profiles(admin_level);

alter table public.student_profiles enable row level security;
alter table public.alumni_profiles enable row level security;
alter table public.faculty_profiles enable row level security;
alter table public.admin_profiles enable row level security;

drop policy if exists "Active users read student profiles" on public.student_profiles;
create policy "Active users read student profiles" on public.student_profiles
  for select using (
    public.is_admin()
    or profile_id = public.current_profile_id()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id
        and p.status = 'ACTIVE'
        and public.is_active()
    )
  );

drop policy if exists "Users manage own student profile" on public.student_profiles;
create policy "Users manage own student profile" on public.student_profiles
  for all using (profile_id = public.current_profile_id() or public.is_admin())
  with check ((profile_id = public.current_profile_id() and public.current_role() = 'STUDENT') or public.is_admin());

drop policy if exists "Active users read alumni profiles" on public.alumni_profiles;
create policy "Active users read alumni profiles" on public.alumni_profiles
  for select using (
    public.is_admin()
    or profile_id = public.current_profile_id()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id
        and p.status = 'ACTIVE'
        and public.is_active()
    )
  );

drop policy if exists "Users manage own alumni profile" on public.alumni_profiles;
create policy "Users manage own alumni profile" on public.alumni_profiles
  for all using (profile_id = public.current_profile_id() or public.is_admin())
  with check ((profile_id = public.current_profile_id() and public.current_role() = 'ALUMNI') or public.is_admin());

drop policy if exists "Active users read faculty profiles" on public.faculty_profiles;
create policy "Active users read faculty profiles" on public.faculty_profiles
  for select using (
    public.is_admin()
    or profile_id = public.current_profile_id()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id
        and p.status = 'ACTIVE'
        and public.is_active()
    )
  );

drop policy if exists "Users manage own faculty profile" on public.faculty_profiles;
create policy "Users manage own faculty profile" on public.faculty_profiles
  for all using (profile_id = public.current_profile_id() or public.is_admin())
  with check ((profile_id = public.current_profile_id() and public.current_role() = 'FACULTY') or public.is_admin());

drop policy if exists "Admins read admin profiles" on public.admin_profiles;
create policy "Admins read admin profiles" on public.admin_profiles
  for select using (profile_id = public.current_profile_id() or public.is_admin());

drop policy if exists "Admins manage admin profiles" on public.admin_profiles;
create policy "Admins manage admin profiles" on public.admin_profiles
  for all using (profile_id = public.current_profile_id() or public.is_admin())
  with check (profile_id = public.current_profile_id() or public.is_admin());

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
      auth_user_id, full_name, email, role, status, department,
      graduation_year, company, designation, profile_completeness
    )
    values (
      new.id, imported.full_name, imported.email, 'ALUMNI', 'ACTIVE',
      imported.department, imported.graduation_year, imported.company,
      imported.designation, 70
    )
    on conflict (email) do update
      set auth_user_id = excluded.auth_user_id,
          status = 'ACTIVE',
          role = 'ALUMNI',
          department = coalesce(public.profiles.department, excluded.department),
          graduation_year = coalesce(public.profiles.graduation_year, excluded.graduation_year),
          company = coalesce(public.profiles.company, excluded.company),
          designation = coalesce(public.profiles.designation, excluded.designation),
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
  coalesce(ap.graduation_year, p.graduation_year) as graduation_year,
  coalesce(sp.student_id, p.student_id) as student_id,
  p.bio,
  coalesce(ap.company, p.company) as company,
  coalesce(ap.designation, fp.designation, adm.internal_role, p.designation) as designation,
  coalesce(ap.industry, p.industry) as industry,
  p.city,
  p.country,
  coalesce(sp.career_goals, p.career_goals) as career_goals,
  case when p.role = 'STUDENT' then coalesce(sp.interests, p.interests) else p.interests end as interests,
  p.technology_stack,
  p.achievements,
  p.projects,
  p.social_links,
  coalesce(fp.academic_title, p.academic_title) as academic_title,
  coalesce(fp.publications, p.publications) as publications,
  coalesce(fp.research_interests, p.research_interests) as research_interests,
  case
    when p.role = 'ALUMNI' then coalesce(ap.mentorship_available, p.is_mentor)
    when p.role = 'FACULTY' then coalesce(fp.mentorship_capacity, p.mentorship_capacity) > 0
    else false
  end as is_mentor,
  coalesce(mp.categories, p.mentor_categories) as mentor_categories,
  case
    when p.role = 'FACULTY' then coalesce(fp.mentorship_capacity, p.mentorship_capacity)
    when p.role = 'ALUMNI' and coalesce(ap.mentorship_available, p.is_mentor)
      then greatest(p.mentorship_capacity, coalesce(mp.max_requests_per_month, 0))
    else p.mentorship_capacity
  end as mentorship_capacity,
  p.profile_completeness,
  p.created_at,
  p.updated_at,
  coalesce(ps.show_phone, false) as phone_visible,
  case
    when p.role = 'ALUMNI' then coalesce(ap.mentorship_available, p.is_mentor)
    when p.role = 'FACULTY' then coalesce(fp.mentorship_capacity, p.mentorship_capacity) > 0
    else false
  end as mentorship_available,
  coalesce(mp.categories, p.mentor_categories) as preference_categories,
  coalesce(profile_skills.skills, '{}') as skills,
  setweight(to_tsvector('english', coalesce(p.full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(p.department, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(ap.company, p.company, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(ap.designation, fp.designation, p.designation, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(ap.industry, p.industry, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(fp.academic_title, p.academic_title, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(fp.research_interests, ' '), '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(sp.interests, ' '), '')), 'C') ||
  setweight(to_tsvector('english', coalesce(sp.career_goals, p.career_goals, '')), 'C') ||
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

-- Rollback notes:
-- 1. Restore the previous profile_directory definition from 0001 if services must roll back.
-- 2. Drop the four role-specific tables only after confirming no new writes depend on them.
-- 3. Legacy profile columns are not dropped by this migration, so application rollback is low risk.
