
DROP POLICY IF EXISTS "Authenticated users can add partner schools" ON public.partner_schools;
CREATE POLICY "Staff can add partner schools"
  ON public.partner_schools FOR INSERT TO authenticated
  WITH CHECK (public.can_check_in_out());
