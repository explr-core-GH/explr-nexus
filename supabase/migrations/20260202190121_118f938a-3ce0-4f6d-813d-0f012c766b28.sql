-- Add column for admin proposed date when none of the member's dates work
ALTER TABLE public.item_requests 
ADD COLUMN admin_proposed_date timestamp with time zone;

-- Add a comment to explain the status values
COMMENT ON COLUMN public.item_requests.status IS 'Status values: pending, approved, denied, pending_confirmation (waiting for member to confirm admin proposed date)';