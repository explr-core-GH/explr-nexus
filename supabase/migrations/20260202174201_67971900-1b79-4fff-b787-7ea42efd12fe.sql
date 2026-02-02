-- Allow users with 'user' role to also upload inventory photos (not just admins)
CREATE POLICY "Users can upload inventory photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'inventory-photos' 
  AND (is_admin() OR has_role(auth.uid(), 'user'::app_role))
);

-- Drop the old admin-only policy
DROP POLICY IF EXISTS "Admins can upload inventory photos" ON storage.objects;