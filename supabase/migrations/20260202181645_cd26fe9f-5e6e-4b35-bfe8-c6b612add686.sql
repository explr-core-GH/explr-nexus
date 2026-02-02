-- Add preferred pickup dates and confirmed date columns to item_requests
ALTER TABLE public.item_requests 
ADD COLUMN preferred_dates timestamp with time zone[] DEFAULT '{}',
ADD COLUMN confirmed_date timestamp with time zone DEFAULT NULL;