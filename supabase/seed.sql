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

insert into public.profiles (
  id, full_name, email, role, status, department, graduation_year, bio, company, designation,
  industry, city, country, career_goals, interests, technology_stack, achievements, projects,
  is_mentor, mentor_categories, mentorship_capacity, profile_completeness
) values
  ('00000000-0000-0000-0000-000000000101', 'Aarav Mehta', 'aarav@student.connectly.edu', 'STUDENT', 'ACTIVE', 'Computer Science', 2027,
   'Final year student focused on full-stack engineering and machine learning.', null, 'Student', 'Software', 'Bengaluru', 'India',
   'Become a product-minded software engineer.', '{"Machine Learning","Product Engineering","Startups"}', '{"React","Node.js","Supabase","Python"}',
   '{"Built a campus placement tracker"}', '{"Connectly FYP"}', false, '{}', 0, 82),
  ('00000000-0000-0000-0000-000000000102', 'Nisha Rao', 'nisha.rao@example.com', 'ALUMNI', 'ACTIVE', 'Computer Science', 2018,
   'Senior software engineer building collaboration products at scale.', 'Atlassian', 'Senior Software Engineer', 'Software', 'Bengaluru', 'India',
   null, '{"Developer Tools","Career Guidance","Machine Learning"}', '{"React","GraphQL","PostgreSQL","AWS"}',
   '{"Mentored 40+ students"}', '{"Design System Migration"}', true, '{"Career Guidance","Mock Interview","Resume Review"}', 6, 96),
  ('00000000-0000-0000-0000-000000000103', 'Rohan Iyer', 'rohan.iyer@example.com', 'ALUMNI', 'ACTIVE', 'Information Technology', 2017,
   'Data platform engineer working on recommendations and analytics pipelines.', 'Razorpay', 'Lead Data Engineer', 'FinTech', 'Mumbai', 'India',
   null, '{"FinTech","Machine Learning","Career Guidance"}', '{"Python","Spark","PostgreSQL","Airflow"}',
   '{"Built fraud analytics pipelines"}', '{"Transaction Risk Monitor"}', true, '{"Project Advice","Career Guidance","Higher Studies"}', 4, 91),
  ('00000000-0000-0000-0000-000000000104', 'Dr. Meera Sharma', 'meera.sharma@connectly.edu', 'FACULTY', 'ACTIVE', 'Computer Science', null,
   'Professor researching human-centered machine learning and student employability.', 'Connectly University', 'Professor', 'Research', 'Pune', 'India',
   null, '{"Research Guidance","Higher Studies","Placements"}', '{"Python","TensorFlow","PostgreSQL"}',
   '{"Published 30+ research papers"}', '{"Student Skill Graph"}', true, '{"Research Guidance","Higher Studies","Project Advice"}', 8, 94),
  ('00000000-0000-0000-0000-000000000105', 'Priya Menon', 'admin@connectly.edu', 'ADMIN', 'ACTIVE', 'Placement Cell', null,
   'Admin for alumni relations, placements, and university engagement programs.', 'Connectly University', 'Alumni Relations Officer', 'Education', 'Pune', 'India',
   null, '{"Alumni Relations","Placement Support"}', '{}', '{"Organized 20+ events"}', '{}', false, '{}', 0, 88)
on conflict (id) do nothing;

insert into public.privacy_settings (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

insert into public.mentorship_preferences (profile_id, is_available, categories, industries, max_requests_per_month)
values
  ('00000000-0000-0000-0000-000000000102', true, '{"Career Guidance","Mock Interview","Resume Review"}', '{"Software"}', 6),
  ('00000000-0000-0000-0000-000000000103', true, '{"Project Advice","Career Guidance","Higher Studies"}', '{"FinTech","Data"}', 4),
  ('00000000-0000-0000-0000-000000000104', true, '{"Research Guidance","Higher Studies","Project Advice"}', '{"Research","Education"}', 8)
on conflict (profile_id) do nothing;

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
