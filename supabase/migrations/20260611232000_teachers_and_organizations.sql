-- Manual teachers, organizations/nonprofits, and self-service school selection.
-- Decouples teachers from auth users, adds org -> schools links, and relaxes write RLS
-- so educators/orgs can self-register schools and assignments that count immediately.

-- =========================================================================
-- 1. teachers — a teacher need not be a registered user (manual entry), and one
--    teacher can hold many school assignments. profile_id links registered users.
-- =========================================================================
CREATE TABLE public.teachers (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT,
  profile_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
-- one teacher row per registered profile
CREATE UNIQUE INDEX teachers_profile_id_key
  ON public.teachers(profile_id) WHERE profile_id IS NOT NULL;

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view teachers"
  ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add teachers"
  ON public.teachers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update teachers"
  ON public.teachers FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete teachers"
  ON public.teachers FOR DELETE TO authenticated USING (is_admin());

CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 2. organizations — nonprofits / orgs that work with a set of schools.
-- =========================================================================
CREATE TABLE public.organizations (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  org_type    TEXT NOT NULL DEFAULT 'nonprofit',
  profile_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view organizations"
  ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add organizations"
  ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete organizations"
  ON public.organizations FOR DELETE TO authenticated USING (is_admin());

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. organization_schools — many-to-many org <-> partner_schools (just the list).
-- =========================================================================
CREATE TABLE public.organization_schools (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES public.partner_schools(id) ON DELETE CASCADE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, school_id)
);

ALTER TABLE public.organization_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view organization schools"
  ON public.organization_schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add organization schools"
  ON public.organization_schools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete organization schools"
  ON public.organization_schools FOR DELETE TO authenticated USING (is_admin());

-- =========================================================================
-- 4. Repoint teacher_school_assignments.teacher_id: profiles.id -> teachers.id.
--    Backfill a teacher per referenced profile and remap (no-op if no rows yet).
-- =========================================================================
INSERT INTO public.teachers (profile_id, full_name, email)
SELECT DISTINCT p.id, p.full_name, p.email
FROM public.teacher_school_assignments a
JOIN public.profiles p ON p.id = a.teacher_id
ON CONFLICT (profile_id) WHERE profile_id IS NOT NULL DO NOTHING;

UPDATE public.teacher_school_assignments a
SET teacher_id = t.id
FROM public.teachers t
WHERE t.profile_id = a.teacher_id;

ALTER TABLE public.teacher_school_assignments
  DROP CONSTRAINT IF EXISTS teacher_school_assignments_teacher_id_fkey;
ALTER TABLE public.teacher_school_assignments
  ADD CONSTRAINT teacher_school_assignments_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

-- =========================================================================
-- 5. Relax write RLS for self-service (count immediately). Inserts allowed for any
--    authenticated user; updates/deletes stay admin-only to limit damage.
-- =========================================================================
DROP POLICY IF EXISTS "Admins can insert partner schools" ON public.partner_schools;
CREATE POLICY "Authenticated users can add partner schools"
  ON public.partner_schools FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can insert assignments" ON public.teacher_school_assignments;
CREATE POLICY "Authenticated users can add assignments"
  ON public.teacher_school_assignments FOR INSERT TO authenticated WITH CHECK (true);
