-- Connectly V1 schema: free-tier optimized Supabase backend.
-- Run from Supabase SQL editor or Supabase CLI after creating a free project.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create type public.user_role as enum ('ALUMNI', 'STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN');
create type public.account_status as enum ('INVITED', 'PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED');
create type public.request_status as enum ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');
create type public.job_type as enum ('INTERNSHIP', 'REFERRAL', 'RESEARCH', 'FREELANCE', 'STARTUP', 'FULL_TIME');
create type public.job_status as enum ('PENDING', 'PUBLISHED', 'ARCHIVED');
create type public.event_type as enum ('REUNION', 'WEBINAR', 'MENTORSHIP_SESSION', 'WORKSHOP', 'NETWORKING');
create type public.feed_post_type as enum ('ANNOUNCEMENT', 'ACHIEVEMENT', 'PLACEMENT', 'RESEARCH', 'NEWS');

create table public.roles (
  name public.user_role primary key,
  description text not null
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email citext unique,
  avatar_url text,
  role public.user_role not null default 'STUDENT',
  status public.account_status not null default 'PENDING',
  department text,
  graduation_year int check (graduation_year is null or graduation_year between 1970 and 2035),
  student_id text,
  bio text,
  company text,
  designation text,
  industry text,
  city text,
  country text default 'India',
  career_goals text,
  interests text[] not null default '{}',
  technology_stack text[] not null default '{}',
  achievements text[] not null default '{}',
  projects text[] not null default '{}',
  social_links jsonb not null default '{}',
  academic_title text,
  publications text[] not null default '{}',
  research_interests text[] not null default '{}',
  is_mentor boolean not null default false,
  mentor_categories text[] not null default '{}',
  mentorship_capacity int not null default 0 check (mentorship_capacity >= 0),
  profile_completeness int not null default 20 check (profile_completeness between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.privacy_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  show_phone boolean not null default false,
  show_city boolean not null default true,
  allow_contact_requests boolean not null default true,
  allow_mentorship_requests boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mentorship_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  is_available boolean not null default false,
  categories text[] not null default '{}',
  industries text[] not null default '{}',
  max_requests_per_month int not null default 4 check (max_requests_per_month >= 0),
  notes text,
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  category text not null default 'General'
);

create table public.user_skills (
  profile_id uuid references public.profiles(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  level text default 'INTERMEDIATE',
  primary key (profile_id, skill_id)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid references public.profiles(id) on delete set null,
  title text not null,
  organization text not null,
  location text not null,
  type public.job_type not null,
  deadline date not null,
  skills text[] not null default '{}',
  description text not null,
  status public.job_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  status public.request_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  type public.event_type not null,
  description text not null,
  banner_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null,
  capacity int check (capacity is null or capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'REGISTERED',
  created_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

create table public.mentorship_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  message text not null,
  status public.request_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> mentor_id)
);

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status public.request_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  mentorship_request_id uuid references public.mentorship_requests(id) on delete set null,
  contact_request_id uuid references public.contact_requests(id) on delete set null,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  last_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  type public.feed_post_type not null,
  title text not null,
  content text not null,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table public.matching_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score between 0 and 100),
  reasons text[] not null default '{}',
  calculated_at timestamptz not null default now(),
  unique (student_id, mentor_id)
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.alumni_imports (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  full_name text not null,
  department text,
  graduation_year int,
  company text,
  designation text,
  status public.account_status not null default 'INVITED',
  matched_profile_id uuid references public.profiles(id) on delete set null,
  imported_by uuid references public.profiles(id) on delete set null,
  imported_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger privacy_updated_at before update on public.privacy_settings for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger mentorship_requests_updated_at before update on public.mentorship_requests for each row execute function public.set_updated_at();
create trigger contact_requests_updated_at before update on public.contact_requests for each row execute function public.set_updated_at();
create trigger feed_posts_updated_at before update on public.feed_posts for each row execute function public.set_updated_at();

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and status = 'ACTIVE'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('ADMIN', 'SUPER_ADMIN');
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  imported public.alumni_imports;
  existing_profile_id uuid;
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
          updated_at = now()
    returning id into existing_profile_id;

    update public.alumni_imports
      set status = 'ACTIVE', matched_profile_id = existing_profile_id
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
          updated_at = now();
  end if;

  insert into public.privacy_settings (profile_id)
  select id from public.profiles where auth_user_id = new.id
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace view public.profile_directory
with (security_invoker = true)
as
select
  p.*,
  coalesce(ps.show_phone, false) as phone_visible,
  coalesce(mp.is_available, p.is_mentor) as mentorship_available,
  coalesce(mp.categories, p.mentor_categories) as preference_categories,
  coalesce(array_agg(distinct s.name::text) filter (where s.name is not null), '{}') as skills,
  setweight(to_tsvector('english', coalesce(p.full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(p.company, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(p.designation, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(p.department, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(string_agg(s.name::text, ' '), '')), 'C') as search_document
from public.profiles p
left join public.privacy_settings ps on ps.profile_id = p.id
left join public.mentorship_preferences mp on mp.profile_id = p.id
left join public.user_skills us on us.profile_id = p.id
left join public.skills s on s.id = us.skill_id
group by p.id, ps.show_phone, mp.is_available, mp.categories;

create index profiles_role_status_idx on public.profiles(role, status);
create index profiles_department_year_idx on public.profiles(department, graduation_year);
create index profiles_company_idx on public.profiles using gin (to_tsvector('english', coalesce(company, '')));
create index profiles_industry_city_idx on public.profiles(industry, city);
create index profiles_mentor_idx on public.profiles(is_mentor, mentorship_capacity) where status = 'ACTIVE';
create index profiles_email_lower_idx on public.profiles (lower(email::text));
create index skills_name_idx on public.skills(name);
create index user_skills_skill_idx on public.user_skills(skill_id);
create index jobs_status_deadline_idx on public.jobs(status, deadline);
create index jobs_skills_idx on public.jobs using gin(skills);
create index events_starts_at_idx on public.events(starts_at);
create index mentorship_requests_participants_idx on public.mentorship_requests(requester_id, mentor_id, status);
create index notifications_profile_created_idx on public.notifications(profile_id, created_at desc);
create index messages_thread_created_idx on public.messages(thread_id, created_at);
create index feed_posts_created_idx on public.feed_posts(created_at desc);
create index alumni_imports_email_idx on public.alumni_imports(lower(email::text));

alter table public.profiles enable row level security;
alter table public.privacy_settings enable row level security;
alter table public.mentorship_preferences enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.mentorship_requests enable row level security;
alter table public.contact_requests enable row level security;
alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.feed_posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.matching_scores enable row level security;
alter table public.analytics_events enable row level security;
alter table public.alumni_imports enable row level security;

create policy "Active users can read active directory profiles" on public.profiles
  for select using (public.is_active() and status = 'ACTIVE' or public.current_profile_id() = id or public.is_admin());
create policy "Users can update their own profile" on public.profiles
  for update using (public.current_profile_id() = id) with check (public.current_profile_id() = id);
create policy "Admins can manage profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Read own privacy settings" on public.privacy_settings for select using (profile_id = public.current_profile_id() or public.is_admin());
create policy "Update own privacy settings" on public.privacy_settings for update using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());
create policy "Admins manage privacy settings" on public.privacy_settings for all using (public.is_admin()) with check (public.is_admin());

create policy "Active users read mentorship preferences" on public.mentorship_preferences for select using (public.is_active());
create policy "Users update own mentorship preferences" on public.mentorship_preferences for all using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

create policy "Active users read skills" on public.skills for select using (public.is_active());
create policy "Admins manage skills" on public.skills for all using (public.is_admin()) with check (public.is_admin());
create policy "Active users read user skills" on public.user_skills for select using (public.is_active());
create policy "Users manage own skills" on public.user_skills for all using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

create policy "Active users read published jobs" on public.jobs for select using (public.is_active() and status = 'PUBLISHED' or public.is_admin());
create policy "Eligible users post jobs" on public.jobs for insert with check (public.current_role() in ('ALUMNI', 'FACULTY', 'ADMIN', 'SUPER_ADMIN') and public.is_active());
create policy "Owners and admins update jobs" on public.jobs for update using (posted_by = public.current_profile_id() or public.is_admin()) with check (posted_by = public.current_profile_id() or public.is_admin());

create policy "Applicants and admins read job applications" on public.job_applications for select using (applicant_id = public.current_profile_id() or public.is_admin());
create policy "Active users apply to jobs" on public.job_applications for insert with check (applicant_id = public.current_profile_id() and public.is_active());
create policy "Admins manage applications" on public.job_applications for update using (public.is_admin()) with check (public.is_admin());

create policy "Active users read events" on public.events for select using (public.is_active());
create policy "Faculty admins create events" on public.events for insert with check (public.current_role() in ('FACULTY', 'ADMIN', 'SUPER_ADMIN') and public.is_active());
create policy "Creators and admins update events" on public.events for update using (created_by = public.current_profile_id() or public.is_admin()) with check (created_by = public.current_profile_id() or public.is_admin());

create policy "Users read own registrations and admins read all" on public.event_registrations for select using (profile_id = public.current_profile_id() or public.is_admin());
create policy "Active users register for events" on public.event_registrations for insert with check (profile_id = public.current_profile_id() and public.is_active());
create policy "Users cancel own registrations" on public.event_registrations for update using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

create policy "Request participants read mentorship requests" on public.mentorship_requests for select using (requester_id = public.current_profile_id() or mentor_id = public.current_profile_id() or public.is_admin());
create policy "Active users create mentorship requests" on public.mentorship_requests for insert with check (requester_id = public.current_profile_id() and public.is_active());
create policy "Mentors and admins update mentorship requests" on public.mentorship_requests for update using (mentor_id = public.current_profile_id() or public.is_admin()) with check (mentor_id = public.current_profile_id() or public.is_admin());

create policy "Contact request participants read" on public.contact_requests for select using (requester_id = public.current_profile_id() or recipient_id = public.current_profile_id() or public.is_admin());
create policy "Active users create contact requests" on public.contact_requests for insert with check (requester_id = public.current_profile_id() and public.is_active());
create policy "Recipients and admins update contact requests" on public.contact_requests for update using (recipient_id = public.current_profile_id() or public.is_admin()) with check (recipient_id = public.current_profile_id() or public.is_admin());

create policy "Thread participants read threads" on public.message_threads for select using (requester_id = public.current_profile_id() or recipient_id = public.current_profile_id() or public.is_admin());
create policy "Thread participants create threads" on public.message_threads for insert with check ((requester_id = public.current_profile_id() or recipient_id = public.current_profile_id()) and public.is_active());
create policy "Thread participants read messages" on public.messages for select using (
  exists (
    select 1 from public.message_threads mt
    where mt.id = thread_id
      and (mt.requester_id = public.current_profile_id() or mt.recipient_id = public.current_profile_id() or public.is_admin())
  )
);
create policy "Thread participants send messages" on public.messages for insert with check (
  sender_id = public.current_profile_id()
  and exists (
    select 1 from public.message_threads mt
    where mt.id = thread_id
      and (mt.requester_id = public.current_profile_id() or mt.recipient_id = public.current_profile_id())
  )
);

create policy "Users read own notifications" on public.notifications for select using (profile_id = public.current_profile_id() or public.is_admin());
create policy "Users update own notifications" on public.notifications for update using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());
create policy "Admins create notifications" on public.notifications for insert with check (public.is_admin());

create policy "Active users read feed" on public.feed_posts for select using (public.is_active());
create policy "Faculty admins publish feed" on public.feed_posts for insert with check (public.current_role() in ('FACULTY', 'ADMIN', 'SUPER_ADMIN') and public.is_active());
create policy "Authors and admins update feed" on public.feed_posts for update using (author_id = public.current_profile_id() or public.is_admin()) with check (author_id = public.current_profile_id() or public.is_admin());
create policy "Active users read comments" on public.comments for select using (public.is_active());
create policy "Active users create comments" on public.comments for insert with check (author_id = public.current_profile_id() and public.is_active());
create policy "Active users read likes" on public.post_likes for select using (public.is_active());
create policy "Active users like posts" on public.post_likes for insert with check (profile_id = public.current_profile_id() and public.is_active());
create policy "Users remove own likes" on public.post_likes for delete using (profile_id = public.current_profile_id());

create policy "Users read own matching scores" on public.matching_scores for select using (student_id = public.current_profile_id() or mentor_id = public.current_profile_id() or public.is_admin());
create policy "Admins manage matching scores" on public.matching_scores for all using (public.is_admin()) with check (public.is_admin());

create policy "Active users create analytics events" on public.analytics_events for insert with check (actor_id = public.current_profile_id() and public.is_active());
create policy "Admins read analytics events" on public.analytics_events for select using (public.is_admin());

create policy "Admins manage alumni imports" on public.alumni_imports for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false), ('event-banners', 'event-banners', false)
on conflict (id) do nothing;

create policy "Users can read own avatar objects" on storage.objects
  for select using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can upload own avatar objects" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Active users can read event banners" on storage.objects
  for select using (bucket_id = 'event-banners' and public.is_active());
create policy "Admins manage event banners" on storage.objects
  for all using (bucket_id = 'event-banners' and public.is_admin()) with check (bucket_id = 'event-banners' and public.is_admin());
