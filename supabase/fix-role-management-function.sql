-- ============================================================
-- Connectly: Fix admin_change_user_role function
-- Run this in your Supabase SQL editor.
--
-- WHY: Migration 0006 dropped columns (designation, company,
-- graduation_year, etc.) from the profiles table and moved them
-- to role-specific tables (alumni_profiles, faculty_profiles).
-- The function in 0008 still references p.designation etc. from
-- profiles which no longer exist → "column p.designation does
-- not exist" error.
-- ============================================================

create or replace function public.admin_change_user_role(
  target_profile_id uuid,
  new_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_role public.user_role;
  v_graduation_year int;
  v_company         text;
  v_designation     text;
  v_specialization  text;
  v_degree          text;
begin
  -- 1. Check if caller is admin
  if not public.is_admin() then
    raise exception 'Access denied: Admin privileges required.';
  end if;

  -- 2. Get current role
  select role into old_role from public.profiles where id = target_profile_id;
  if not found then
    raise exception 'Profile not found.';
  end if;

  if old_role = new_role then
    return;
  end if;

  -- 3. Pull data from existing role-specific tables for seeding the new role
  --    (columns were removed from profiles in migration 0006)
  select
    ap.graduation_year,
    ap.company,
    ap.designation,
    sp.specialization,
    coalesce(ap.degree, sp.degree)
  into
    v_graduation_year, v_company, v_designation, v_specialization, v_degree
  from public.profiles p
  left join public.alumni_profiles  ap on ap.profile_id = p.id
  left join public.student_profiles sp on sp.profile_id = p.id
  left join public.faculty_profiles fp on fp.profile_id = p.id
  where p.id = target_profile_id;

  -- 4. Update the main profiles table
  update public.profiles
  set role       = new_role,
      updated_at = now()
  where id = target_profile_id;

  -- 5. Ensure destination role table has a record
  case new_role
    when 'STUDENT' then
      insert into public.student_profiles (profile_id)
      values (target_profile_id)
      on conflict (profile_id) do nothing;

    when 'ALUMNI' then
      insert into public.alumni_profiles (
        profile_id, graduation_year, company, designation, specialization, degree
      )
      values (
        target_profile_id,
        v_graduation_year,
        v_company,
        v_designation,
        v_specialization,
        v_degree
      )
      on conflict (profile_id) do nothing;

    when 'FACULTY' then
      insert into public.faculty_profiles (profile_id, designation)
      values (target_profile_id, v_designation)
      on conflict (profile_id) do nothing;

    when 'ADMIN' then
      insert into public.admin_profiles (profile_id, admin_level)
      values (
        target_profile_id,
        'STAFF'
      )
      on conflict (profile_id) do nothing;
  end case;

  -- 6. Log the action
  insert into public.audit_logs (admin_id, action, entity_type, entity_id, old_data, new_data)
  values (
    public.current_profile_id(),
    'CHANGE_ROLE',
    'PROFILE',
    target_profile_id,
    jsonb_build_object('role', old_role),
    jsonb_build_object('role', new_role)
  );
end;
$$;
