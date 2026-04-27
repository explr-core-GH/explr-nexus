ALTER TABLE public.item_requests
  ADD COLUMN IF NOT EXISTS return_due_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS return_reminder_sent_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_item_requests_return_due_date
  ON public.item_requests(return_due_date)
  WHERE return_due_date IS NOT NULL AND return_reminder_sent_at IS NULL;