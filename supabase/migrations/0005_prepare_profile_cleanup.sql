-- Connectly V1.4a: prepare for removing legacy mixed-role profile columns.
-- Safe to run before deploying the new app code.

alter table public.admin_profiles
add column if not exists institution_name text;

update public.admin_profiles adm
set institution_name = coalesce(adm.institution_name, p.company)
from public.profiles p
where p.id = adm.profile_id
  and p.role in ('ADMIN', 'SUPER_ADMIN')
  and p.company is not null;

insert into public.mentorship_preferences (
  profile_id, is_available, categories, industries, max_requests_per_month, updated_at
)
select
  p.id,
  case
    when p.role = 'ALUMNI' then p.is_mentor
    when p.role = 'FACULTY' then p.mentorship_capacity > 0
    else false
  end,
  p.mentor_categories,
  case when p.industry is null then '{}'::text[] else array[p.industry] end,
  case
    when p.role = 'FACULTY' then greatest(0, p.mentorship_capacity)
    when p.is_mentor then greatest(1, p.mentorship_capacity, 4)
    else 0
  end,
  now()
from public.profiles p
where p.role in ('ALUMNI', 'FACULTY')
on conflict (profile_id) do update
set is_available = public.mentorship_preferences.is_available or excluded.is_available,
    categories = case
      when public.mentorship_preferences.categories = '{}' then excluded.categories
      else public.mentorship_preferences.categories
    end,
    industries = case
      when public.mentorship_preferences.industries = '{}' then excluded.industries
      else public.mentorship_preferences.industries
    end,
    max_requests_per_month = greatest(public.mentorship_preferences.max_requests_per_month, excluded.max_requests_per_month),
    updated_at = now();
