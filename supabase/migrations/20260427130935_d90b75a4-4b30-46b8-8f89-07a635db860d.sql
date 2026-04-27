ALTER TABLE public.item_requests
  ADD COLUMN IF NOT EXISTS free_reduced_lunch text,
  ADD COLUMN IF NOT EXISTS special_groups text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS number_of_students integer,
  ADD COLUMN IF NOT EXISTS usage_hours numeric,
  ADD COLUMN IF NOT EXISTS usage_days numeric;