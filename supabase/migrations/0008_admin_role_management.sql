-- Connectly V1.6: Admin Role Management & Student-to-Alumni Transitions

-- 1. Function to safely change a user's role
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

  -- 3. Update the main profiles table
  update public.profiles
  set role = new_role,
      updated_at = now()
  where id = target_profile_id;

  -- 4. Ensure destination role table has a record
  case new_role
    when 'STUDENT' then
      insert into public.student_profiles (profile_id)
      values (target_profile_id)
      on conflict (profile_id) do nothing;
    when 'ALUMNI' then
      insert into public.alumni_profiles (profile_id, graduation_year, company, designation, specialization, degree)
      select 
        p.id, 
        p.graduation_year, 
        p.company, 
        p.designation,
        (select specialization from public.student_profiles where profile_id = target_profile_id),
        (select degree from public.student_profiles where profile_id = target_profile_id)
      from public.profiles p
      where p.id = target_profile_id
      on conflict (profile_id) do nothing;
    when 'FACULTY' then
      insert into public.faculty_profiles (profile_id, designation)
      select p.id, p.designation
      from public.profiles p
      where p.id = target_profile_id
      on conflict (profile_id) do nothing;
    when 'ADMIN', 'SUPER_ADMIN' then
      insert into public.admin_profiles (profile_id, admin_level)
      values (target_profile_id, case when new_role = 'SUPER_ADMIN' then 'SUPER' else 'STAFF' end)
      on conflict (profile_id) do nothing;
  end case;

  -- 5. Log the action
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

-- 2. Function to bulk transition graduated students to alumni
create or replace function public.admin_transition_graduated_students()
returns table(affected_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year int := extract(year from now())::int;
  target_id uuid;
  counter int := 0;
begin
  -- 1. Check if caller is admin
  if not public.is_admin() then
    raise exception 'Access denied: Admin privileges required.';
  end if;

  -- 2. Find students whose graduation year has passed
  for target_id in
    select id from public.profiles
    where role = 'STUDENT'
      and graduation_year is not null
      and graduation_year <= current_year
  loop
    perform public.admin_change_user_role(target_id, 'ALUMNI');
    counter := counter + 1;
  end loop;

  return query select counter;
end;
$$;

-- 3. Update profile_directory view to ensure graduation_year from profiles table is also considered
-- (Already handled in 0007, but reinforcing logic)
