
-- 1. item_requests: restrict INSERT to authenticated
DROP POLICY IF EXISTS "Members can create requests" ON public.item_requests;
CREATE POLICY "Members can create requests"
  ON public.item_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Admins can view all requests" ON public.item_requests;
CREATE POLICY "Admins can view all requests"
  ON public.item_requests FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Members can view their own requests" ON public.item_requests;
CREATE POLICY "Members can view their own requests"
  ON public.item_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Admins can update requests" ON public.item_requests;
CREATE POLICY "Admins can update requests"
  ON public.item_requests FOR UPDATE TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete requests" ON public.item_requests;
CREATE POLICY "Admins can delete requests"
  ON public.item_requests FOR DELETE TO authenticated
  USING (is_admin());

-- 2. categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 3. bundles
DROP POLICY IF EXISTS "Authenticated users can view bundles" ON public.bundles;
CREATE POLICY "Authenticated users can view bundles"
  ON public.bundles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage bundles" ON public.bundles;
CREATE POLICY "Admins can manage bundles"
  ON public.bundles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 4. bundle_items
DROP POLICY IF EXISTS "Authenticated users can view bundle items" ON public.bundle_items;
CREATE POLICY "Authenticated users can view bundle items"
  ON public.bundle_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage bundle items" ON public.bundle_items;
CREATE POLICY "Admins can manage bundle items"
  ON public.bundle_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 5. locations
DROP POLICY IF EXISTS "Authenticated users can view all locations" ON public.locations;
CREATE POLICY "Authenticated users can view all locations"
  ON public.locations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can insert locations" ON public.locations;
CREATE POLICY "Admins can insert locations"
  ON public.locations FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update locations" ON public.locations;
CREATE POLICY "Admins can update locations"
  ON public.locations FOR UPDATE TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admins can delete locations" ON public.locations;
CREATE POLICY "Admins can delete locations"
  ON public.locations FOR DELETE TO authenticated USING (is_admin());

-- 6. resources
DROP POLICY IF EXISTS "Authenticated users can view resources" ON public.resources;
CREATE POLICY "Authenticated users can view resources"
  ON public.resources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
CREATE POLICY "Admins can manage resources"
  ON public.resources FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 7. inventory_items: tighten remaining public-role policy
DROP POLICY IF EXISTS "Users can update item status for check-in/out" ON public.inventory_items;
CREATE POLICY "Users can update item status for check-in/out"
  ON public.inventory_items FOR UPDATE TO authenticated
  USING (
    is_admin() OR (
      has_role(auth.uid(), 'user'::app_role) AND (
        ((status = 'checked-out'::text) AND (checked_out_by = auth.uid()))
        OR (status = 'available'::text)
      )
    )
  );

-- 8. profiles: scope to authenticated
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
CREATE POLICY "System can insert profiles"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 9. user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 10. Storage: inventory-photos INSERT restricted to authenticated
DROP POLICY IF EXISTS "Users can upload inventory photos" ON storage.objects;
CREATE POLICY "Users can upload inventory photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inventory-photos' AND (is_admin() OR has_role(auth.uid(), 'user'::app_role)));

DROP POLICY IF EXISTS "Admins can update inventory photos" ON storage.objects;
CREATE POLICY "Admins can update inventory photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'inventory-photos' AND is_admin());

DROP POLICY IF EXISTS "Admins can delete inventory photos" ON storage.objects;
CREATE POLICY "Admins can delete inventory photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inventory-photos' AND is_admin());

-- inventory-photos listing/SELECT via API restricted to authenticated
-- Public bucket URL access (object/public/...) still works for image rendering.
DROP POLICY IF EXISTS "Inventory photos are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can view inventory photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inventory-photos');

-- resources storage: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view resource files" ON storage.objects;
CREATE POLICY "Authenticated users can view resource files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resources');

DROP POLICY IF EXISTS "Admins can upload resource files" ON storage.objects;
CREATE POLICY "Admins can upload resource files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND is_admin());

DROP POLICY IF EXISTS "Admins can update resource files" ON storage.objects;
CREATE POLICY "Admins can update resource files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resources' AND is_admin());

DROP POLICY IF EXISTS "Admins can delete resource files" ON storage.objects;
CREATE POLICY "Admins can delete resource files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resources' AND is_admin());

-- 11. Revoke EXECUTE on SECURITY DEFINER helper functions from anon and public
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_member() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_check_in_out() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_check_in_out() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
