-- Create resources table for curriculum, links, videos, and manuals
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('link', 'video', 'manual', 'curriculum')),
  url TEXT,
  file_path TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage resources"
ON public.resources
FOR ALL
USING (is_admin());

-- All authenticated users can view resources
CREATE POLICY "Authenticated users can view resources"
ON public.resources
FOR SELECT
USING (true);

-- Create storage bucket for resource files
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true);

-- Storage policies for resource files
CREATE POLICY "Anyone can view resource files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'resources');

CREATE POLICY "Admins can upload resource files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'resources' AND is_admin());

CREATE POLICY "Admins can update resource files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'resources' AND is_admin());

CREATE POLICY "Admins can delete resource files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'resources' AND is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_resources_updated_at
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();