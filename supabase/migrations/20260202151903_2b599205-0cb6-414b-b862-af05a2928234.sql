-- Add bundle_id column to inventory_items to identify items that represent bundles
ALTER TABLE public.inventory_items 
ADD COLUMN bundle_id uuid REFERENCES public.bundles(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_inventory_items_bundle_id ON public.inventory_items(bundle_id);

-- Add comment for clarity
COMMENT ON COLUMN public.inventory_items.bundle_id IS 'If set, this inventory item represents a bundle and checking it out will also check out all items in the bundle';