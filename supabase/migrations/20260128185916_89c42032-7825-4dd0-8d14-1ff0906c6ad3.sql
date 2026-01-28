-- Add tags array column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN tags text[] DEFAULT '{}';

-- Add tags array column to profiles table for member visibility
ALTER TABLE public.profiles 
ADD COLUMN tags text[] DEFAULT '{}';

-- Create index for better tag querying
CREATE INDEX idx_inventory_items_tags ON public.inventory_items USING GIN(tags);
CREATE INDEX idx_profiles_tags ON public.profiles USING GIN(tags);