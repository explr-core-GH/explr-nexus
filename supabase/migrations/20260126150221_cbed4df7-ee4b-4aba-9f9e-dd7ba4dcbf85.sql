-- Add image_url column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN image_url TEXT;

-- Create storage bucket for inventory item photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory-photos', 
  'inventory-photos', 
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage policies for inventory photos
-- Anyone can view photos (public bucket)
CREATE POLICY "Inventory photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'inventory-photos');

-- Only admins can upload photos
CREATE POLICY "Admins can upload inventory photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inventory-photos' 
  AND public.is_admin()
);

-- Only admins can update photos
CREATE POLICY "Admins can update inventory photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'inventory-photos' 
  AND public.is_admin()
);

-- Only admins can delete photos
CREATE POLICY "Admins can delete inventory photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inventory-photos' 
  AND public.is_admin()
);