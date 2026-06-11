
-- Lock down remaining SECURITY DEFINER functions (used only by triggers/internal callers)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_user_organization_to_locations() FROM PUBLIC, anon, authenticated;

-- Drop broad SELECT policies on public buckets to prevent API listing.
-- Public file/image URLs (object/public/...) keep working without any storage.objects SELECT policy.
DROP POLICY IF EXISTS "Authenticated users can view inventory photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view resource files" ON storage.objects;
