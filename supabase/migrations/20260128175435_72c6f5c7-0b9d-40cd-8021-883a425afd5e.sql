-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations
CREATE POLICY "Authenticated users can view all locations"
ON public.locations FOR SELECT
USING (true);

CREATE POLICY "Admins can insert locations"
ON public.locations FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update locations"
ON public.locations FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete locations"
ON public.locations FOR DELETE
USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add location_id foreign key to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;