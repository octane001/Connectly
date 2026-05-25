-- Connectly Seed Data: Updated for role-specific profile tables.

insert into public.roles (name, description) values
  ('STUDENT', 'Current student seeking guidance and opportunities'),
  ('ALUMNI', 'Verified graduate who can network, mentor, and post opportunities'),
  ('FACULTY', 'Faculty member supporting students, events, research, and announcements'),
  ('ADMIN', 'University administrator managing approvals and content'),
  ('SUPER_ADMIN', 'System owner with full administrative access')
on conflict (name) do nothing;

insert into public.skills (name, category) values
  ('React', 'Frontend'),
  ('TypeScript', 'Frontend'),
  ('Python', 'Backend'),
  ('Machine Learning', 'AI'),
  ('PostgreSQL', 'Database'),
  ('System Design', 'Engineering'),
  ('Data Engineering', 'Data'),
  ('Research', 'Academic'),
  ('Mentoring', 'Career')
on conflict (name) do nothing;

-- 1. Base Profiles
insert into public.profiles (
  id, full_name, email, role, status, department, bio, city, country, technology_stack, achievements, projects, profile_completeness
) values
  ('00000000-0000-0000-0000-000000000101', 'Aarav Mehta', 'aarav@student.connectly.edu', 'STUDENT', 'ACTIVE', 'Computer Science', 
   'Final year student focused on full-stack engineering and machine learning.', 'Bengaluru', 'India', 
   '{"React","Node.js","Supabase","Python"}', '{"Built a campus placement tracker"}', '{"Connectly FYP"}', 82),
  ('00000000-0000-0000-0000-000000000102', 'Nisha Rao', 'nisha.rao@example.com', 'ALUMNI', 'ACTIVE', 'Computer Science', 
   'Senior software engineer building collaboration products at scale.', 'Bengaluru', 'India', 
   '{"React","GraphQL","PostgreSQL","AWS"}', '{"Mentored 40+ students"}', '{"Design System Migration"}', 96),
  ('00000000-0000-0000-0000-000000000103', 'Rohan Iyer', 'rohan.iyer@example.com', 'ALUMNI', 'ACTIVE', 'Information Technology', 
   'Data platform engineer working on recommendations and analytics pipelines.', 'Mumbai', 'India', 
   '{"Python","Spark","PostgreSQL","Airflow"}', '{"Built fraud analytics pipelines"}', '{"Transaction Risk Monitor"}', 91),
  ('00000000-0000-0000-0000-000000000104', 'Dr. Meera Sharma', 'meera.sharma@connectly.edu', 'FACULTY', 'ACTIVE', 'Computer Science', 
   'Professor researching human-centered machine learning and student employability.', 'Pune', 'India', 
   '{"Python","TensorFlow","PostgreSQL"}', '{"Published 30+ research papers"}', '{"Student Skill Graph"}', 94),
  ('00000000-0000-0000-0000-000000000105', 'Priya Menon', 'admin@connectly.edu', 'ADMIN', 'ACTIVE', 'Placement Cell', 
   'Admin for alumni relations, placements, and university engagement programs.', 'Pune', 'India', 
   '{}', '{"Organized 20+ events"}', '{}', 88)
on conflict (id) do nothing;

-- 2. Role-specific Profiles
insert into public.student_profiles (profile_id, student_id, current_year, degree, specialization, cgpa, interests, career_goals)
values
  ('00000000-0000-0000-0000-000000000101', 'STU2023001', 4, 'B.Tech', 'Computer Science', 8.5, '{"Machine Learning","Product Engineering","Startups"}', 'Become a product-minded software engineer.')
on conflict (profile_id) do nothing;

insert into public.alumni_profiles (profile_id, graduation_year, company, designation, industry, experience_years, mentorship_available, interests, degree)
values
  ('00000000-0000-0000-0000-000000000102', 2018, 'Atlassian', 'Senior Software Engineer', 'Software', 6, true, '{"Developer Tools","Career Guidance","Machine Learning"}', 'B.Tech'),
  ('00000000-0000-0000-0000-000000000103', 2017, 'Razorpay', 'Lead Data Engineer', 'FinTech', 7, true, '{"FinTech","Machine Learning","Career Guidance"}', 'B.Tech')
on conflict (profile_id) do nothing;

insert into public.faculty_profiles (profile_id, faculty_id, academic_title, designation, research_interests, publications, office_location, mentorship_capacity, interests, office_hours)
values
  ('00000000-0000-0000-0000-000000000104', 'FAC001', 'Professor', 'Professor', '{"Human-Centered ML","Student Employability"}', '{"Paper A","Paper B"}', 'Building 4, Room 202', 8, '{"Research Guidance","Higher Studies","Project Advice"}', 'Mon-Wed, 2-4 PM')
on conflict (profile_id) do nothing;

insert into public.admin_profiles (profile_id, admin_level, internal_role, institution_name)
values
  ('00000000-0000-0000-0000-000000000105', 'STAFF', 'Alumni Relations Officer', 'Connectly University')
on conflict (profile_id) do nothing;

-- 3. Privacy Settings
insert into public.privacy_settings (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

-- 4. Mentorship Preferences
insert into public.mentorship_preferences (profile_id, is_available, categories, industries, max_requests_per_month)
values
  ('00000000-0000-0000-0000-000000000102', true, '{"Career Guidance","Mock Interview","Resume Review"}', '{"Software"}', 6),
  ('00000000-0000-0000-0000-000000000103', true, '{"Project Advice","Career Guidance","Higher Studies"}', '{"FinTech","Data"}', 4),
  ('00000000-0000-0000-0000-000000000104', true, '{"Research Guidance","Higher Studies","Project Advice"}', '{"Research","Education"}', 8)
on conflict (profile_id) do nothing;

-- 5. User Skills
insert into public.user_skills (profile_id, skill_id)
select profile_id, skills.id
from (
  values
    ('00000000-0000-0000-0000-000000000101'::uuid, 'React'),
    ('00000000-0000-0000-0000-000000000101'::uuid, 'TypeScript'),
    ('00000000-0000-0000-0000-000000000101'::uuid, 'Python'),
    ('00000000-0000-0000-0000-000000000101'::uuid, 'Machine Learning'),
    ('00000000-0000-0000-0000-000000000102'::uuid, 'React'),
    ('00000000-0000-0000-0000-000000000102'::uuid, 'TypeScript'),
    ('00000000-0000-0000-0000-000000000102'::uuid, 'System Design'),
    ('00000000-0000-0000-0000-000000000103'::uuid, 'Python'),
    ('00000000-0000-0000-0000-000000000103'::uuid, 'Data Engineering'),
    ('00000000-0000-0000-0000-000000000104'::uuid, 'Machine Learning'),
    ('00000000-0000-0000-0000-000000000104'::uuid, 'Research')
) as mapped(profile_id, skill_name)
join public.skills on skills.name = mapped.skill_name
on conflict do nothing;

-- 6. Experience (New Table)
insert into public.experience (profile_id, title, organization, start_date, end_date, description, is_internship)
values
  ('00000000-0000-0000-0000-000000000101', 'Frontend Developer Intern', 'Tech Startups Inc', '2023-05-01', '2023-08-01', 'Worked on React components.', true),
  ('00000000-0000-0000-0000-000000000102', 'Software Engineer', 'Initial Corp', '2018-07-01', '2020-12-31', 'Full stack development.', false)
on conflict do nothing;

insert into public.alumni_imports (email, full_name, department, graduation_year, company, designation)
values
  ('invited.alumni@example.com', 'Invited Alumni', 'Computer Science', 2019, 'GitHub', 'Software Engineer'),
  ('vikram.joshi@example.com', 'Vikram Joshi', 'Mechanical', 2016, 'Tata Motors', 'Product Engineer')
on conflict (email) do nothing;

insert into public.jobs (id, posted_by, title, organization, location, type, deadline, skills, description, status)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 'Frontend Engineering Internship', 'Atlassian', 'Bengaluru / Remote', 'INTERNSHIP', current_date + 18, '{"React","TypeScript","Testing"}', 'Work with a product engineering team on collaboration experiences, accessibility, and component quality.', 'PUBLISHED'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000104', 'Research Assistant - ML for Education', 'Connectly University', 'Pune', 'RESEARCH', current_date + 25, '{"Python","Machine Learning","Research"}', 'Assist faculty on student skill graph research and prototype evaluation dashboards.', 'PUBLISHED')
on conflict (id) do nothing;

insert into public.events (id, created_by, title, type, description, starts_at, location, capacity)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000105', 'Alumni Mentorship Evening', 'MENTORSHIP_SESSION', 'Small-group conversations with alumni mentors across software, research, and product roles.', now() + interval '8 days', 'Seminar Hall A', 120),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000104', 'Resume Review Workshop', 'WORKSHOP', 'Faculty and alumni reviewers help students improve resumes for placements and internships.', now() + interval '14 days', 'Online', 80)
on conflict (id) do nothing;

insert into public.feed_posts (id, author_id, type, title, content, likes_count, comments_count)
values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000105', 'PLACEMENT', 'Placement mentorship sprint begins this week', 'Students can now request resume reviews and mock interviews from verified alumni mentors.', 42, 8),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000104', 'RESEARCH', 'Faculty research group opens student assistant applications', 'The ML for Education group is inviting applications for research assistants from final year students.', 31, 5)
on conflict (id) do nothing;
