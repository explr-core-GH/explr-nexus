-- Ohio Report Card demographics: statewide reference data, partner schools, and
-- teacher->school grade-band assignments that drive grant impact reporting.

-- Enable trigram search for school name/district typeahead.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================================================================
-- 1. ohio_schools — statewide reference dataset, seeded by the import script.
--    Service role (importer) bypasses RLS; authenticated users get read access;
--    admins may also manage rows manually.
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
  -- { "PK": n, "KG": n, "01": n, ... "12": n } using Ohio grade tokens
  enrollment_by_grade              JSONB NOT NULL DEFAULT '{}'::jsonb,
  pct_economically_disadvantaged   NUMERIC,
  pct_students_with_disabilities   NUMERIC,
  pct_english_learners             NUMERIC,
  pct_gifted                       NUMERIC,
  -- { "white": {count, pct}, "black": {...}, "hispanic": {...}, ... }
  race_ethnicity                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at                       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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
-- 2. partner_schools — the schools we actually work with (pins on the map).
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

ALTER TABLE public.partner_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view partner schools"
  ON public.partner_schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert partner schools"
  ON public.partner_schools FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update partner schools"
  ON public.partner_schools FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete partner schools"
  ON public.partner_schools FOR DELETE TO authenticated USING (is_admin());

CREATE INDEX partner_schools_ohio_irn_idx ON public.partner_schools(ohio_irn);

CREATE TRIGGER update_partner_schools_updated_at
  BEFORE UPDATE ON public.partner_schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. teacher_school_assignments — teacher x school x grade band, with a frozen
--    demographics snapshot so grant numbers stay stable across yearly refreshes.
-- =========================================================================
CREATE TABLE public.teacher_school_assignments (
  id                    UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id             UUID NOT NULL REFERENCES public.partner_schools(id) ON DELETE CASCADE,
  grade_low             TEXT NOT NULL,
  grade_high            TEXT NOT NULL,
  subject               TEXT,
  students_served       INTEGER,
  school_year           TEXT,
  notes                 TEXT,
  -- { potential_reach, economically_disadvantaged, students_with_disabilities,
  --   english_learners, gifted, race_ethnicity, actual_served: {...} }
  demographics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_school_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments"
  ON public.teacher_school_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert assignments"
  ON public.teacher_school_assignments FOR INSERT TO authenticated WITH CHECK (is_admin());
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
