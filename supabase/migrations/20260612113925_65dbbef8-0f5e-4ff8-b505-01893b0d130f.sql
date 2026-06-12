
-- Helper: check that a given profile_id belongs to the current auth user
CREATE OR REPLACE FUNCTION public.owns_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _profile_id AND user_id = auth.uid()
  )
$$;

-- ============ teachers ============
DROP POLICY IF EXISTS "Authenticated users can add teachers" ON public.teachers;
CREATE POLICY "Users can add own teacher record"
  ON public.teachers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.owns_profile(profile_id));

-- Restrict broad SELECT (hides email from members). Admins/staff users can read all;
-- members can still see their own teacher record.
DROP POLICY IF EXISTS "Authenticated users can view teachers" ON public.teachers;
CREATE POLICY "Staff or owner can view teachers"
  ON public.teachers FOR SELECT TO authenticated
  USING (public.can_check_in_out() OR public.owns_profile(profile_id));

-- ============ organizations ============
DROP POLICY IF EXISTS "Authenticated users can add organizations" ON public.organizations;
CREATE POLICY "Users can add own organization"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.owns_profile(profile_id));

-- ============ teacher_school_assignments ============
DROP POLICY IF EXISTS "Authenticated users can add assignments" ON public.teacher_school_assignments;
CREATE POLICY "Users can add assignments for own teacher"
  ON public.teacher_school_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_id AND public.owns_profile(t.profile_id)
    )
  );

-- ============ organization_schools ============
DROP POLICY IF EXISTS "Authenticated users can add organization schools" ON public.organization_schools;
CREATE POLICY "Users can link schools to own organization"
  ON public.organization_schools FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND public.owns_profile(o.profile_id)
    )
  );
