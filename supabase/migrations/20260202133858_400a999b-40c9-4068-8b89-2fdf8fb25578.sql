-- Add quantity and is_consumable columns to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN quantity INTEGER DEFAULT 1,
ADD COLUMN is_consumable BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.inventory_items.quantity IS 'Number of units available. NULL means quantity not tracked.';
COMMENT ON COLUMN public.inventory_items.is_consumable IS 'If true, checking out decrements quantity instead of changing status. Item is removed when quantity reaches 0.';