
-- Enable trigram search for school name/district typeahead.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================================================================
-- 1. ohio_schools — statewide reference dataset.
-- =========================================================================
CREATE TABLE public.ohio_schools (
  irn                              TEXT NOT NULL PRIMARY KEY,
  building_name                    TEXT NOT NULL,
  district_name                    TEXT,
  district_irn                     TEXT,
  county                           TEXT,
  city                             TEXT,
  address                          TEXT,
  low_grade                        TEXT,
  high_grade                       TEXT,
  school_year                      TEXT NOT NULL,
  total_enrollment                 INTEGER,
  enrollment_by_grade              JSONB NOT NULL DEFAULT '{}'::jsonb,
  pct_economically_disadvantaged   NUMERIC,
  pct_students_with_disabilities   NUMERIC,
  pct_english_learners             NUMERIC,
  pct_gifted                       NUMERIC,
  race_ethnicity                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at                       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ohio_schools TO authenticated;
GRANT ALL ON public.ohio_schools TO service_role;

ALTER TABLE public.ohio_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ohio schools"
  ON public.ohio_schools FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage ohio schools"
  ON public.ohio_schools FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX ohio_schools_building_name_trgm
  ON public.ohio_schools USING gin (building_name gin_trgm_ops);
CREATE INDEX ohio_schools_district_name_trgm
  ON public.ohio_schools USING gin (district_name gin_trgm_ops);

CREATE TRIGGER update_ohio_schools_updated_at
  BEFORE UPDATE ON public.ohio_schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 2. partner_schools
-- =========================================================================
CREATE TABLE public.partner_schools (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ohio_irn    TEXT REFERENCES public.ohio_schools(irn) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  address     TEXT,
  latitude    DECIMAL(10, 8),
  longitude   DECIMAL(11, 8),
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_schools TO authenticated;
GRANT ALL ON public.partner_schools TO service_role;

ALTER TABLE public.partner_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view partner schools"
  ON public.partner_schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add partner schools"
  ON public.partner_schools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update partner schools"
  ON public.partner_schools FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete partner schools"
  ON public.partner_schools FOR DELETE TO authenticated USING (is_admin());

CREATE INDEX partner_schools_ohio_irn_idx ON public.partner_schools(ohio_irn);

CREATE TRIGGER update_partner_schools_updated_at
  BEFORE UPDATE ON public.partner_schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. teachers
-- =========================================================================
CREATE TABLE public.teachers (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT,
  profile_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX teachers_profile_id_key
  ON public.teachers(profile_id) WHERE profile_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;

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
-- 4. teacher_school_assignments (references teachers from the start)
-- =========================================================================
CREATE TABLE public.teacher_school_assignments (
  id                    UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id            UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  school_id             UUID NOT NULL REFERENCES public.partner_schools(id) ON DELETE CASCADE,
  grade_low             TEXT NOT NULL,
  grade_high            TEXT NOT NULL,
  subject               TEXT,
  students_served       INTEGER,
  school_year           TEXT,
  notes                 TEXT,
  demographics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_school_assignments TO authenticated;
GRANT ALL ON public.teacher_school_assignments TO service_role;

ALTER TABLE public.teacher_school_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments"
  ON public.teacher_school_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add assignments"
  ON public.teacher_school_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update assignments"
  ON public.teacher_school_assignments FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete assignments"
  ON public.teacher_school_assignments FOR DELETE TO authenticated USING (is_admin());

CREATE INDEX teacher_school_assignments_teacher_idx
  ON public.teacher_school_assignments(teacher_id);
CREATE INDEX teacher_school_assignments_school_idx
  ON public.teacher_school_assignments(school_id);

CREATE TRIGGER update_teacher_school_assignments_updated_at
  BEFORE UPDATE ON public.teacher_school_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 5. organizations
-- =========================================================================
CREATE TABLE public.organizations (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  org_type    TEXT NOT NULL DEFAULT 'nonprofit',
  profile_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

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
-- 6. organization_schools
-- =========================================================================
CREATE TABLE public.organization_schools (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES public.partner_schools(id) ON DELETE CASCADE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, school_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_schools TO authenticated;
GRANT ALL ON public.organization_schools TO service_role;

ALTER TABLE public.organization_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view organization schools"
  ON public.organization_schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add organization schools"
  ON public.organization_schools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete organization schools"
  ON public.organization_schools FOR DELETE TO authenticated USING (is_admin());
