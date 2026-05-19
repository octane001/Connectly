-- Connectly V1.2: Faculty role enhancements
-- Adds faculty-specific fields and integrity constraints.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS faculty_id text,
ADD COLUMN IF NOT EXISTS office_location text,
ADD COLUMN IF NOT EXISTS office_hours text;

-- Data Integrity: Ensure role-specific requirements
-- Note: We use a check constraint to prevent mixed data states.
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS role_specific_id_check;

ALTER TABLE public.profiles
ADD CONSTRAINT role_specific_id_check 
CHECK (
  (role = 'FACULTY' AND faculty_id IS NOT NULL AND student_id IS NULL) OR
  (role IN ('STUDENT', 'ALUMNI') AND student_id IS NOT NULL AND faculty_id IS NULL) OR
  (role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- Indexing for faculty discovery
CREATE INDEX IF NOT EXISTS profiles_faculty_id_idx ON public.profiles(faculty_id) WHERE role = 'FACULTY';
CREATE INDEX IF NOT EXISTS profiles_academic_discovery_idx ON public.profiles(academic_title, department) WHERE role = 'FACULTY' AND status = 'ACTIVE';

-- Rollback Considerations:
-- ALTER TABLE public.profiles DROP COLUMN faculty_id, DROP COLUMN office_location, DROP COLUMN office_hours;
-- ALTER TABLE public.profiles DROP CONSTRAINT role_specific_id_check;
-- DROP INDEX profiles_faculty_id_idx;
-- DROP INDEX profiles_academic_discovery_idx;
