-- Create bundles table to represent item bundles
CREATE TABLE public.bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bundle_items junction table to link items to bundles
CREATE TABLE public.bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, item_id)
);

-- Enable RLS on bundles
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on bundle_items
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

-- Policies for bundles table
CREATE POLICY "Admins can manage bundles" 
ON public.bundles 
FOR ALL 
USING (is_admin());

CREATE POLICY "Authenticated users can view bundles" 
ON public.bundles 
FOR SELECT 
USING (true);

-- Policies for bundle_items table
CREATE POLICY "Admins can manage bundle items" 
ON public.bundle_items 
FOR ALL 
USING (is_admin());

CREATE POLICY "Authenticated users can view bundle items" 
ON public.bundle_items 
FOR SELECT 
USING (true);

-- Add trigger for updated_at on bundles
CREATE TRIGGER update_bundles_updated_at
BEFORE UPDATE ON public.bundles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();