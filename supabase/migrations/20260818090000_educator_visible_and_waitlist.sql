-- Educator visibility toggle + project waitlist flag.

-- Which inventory items an educator (member role) is allowed to see. Hidden by
-- default; an admin switches items on in Admin -> Educator View. Educators
-- otherwise see only Projects, not the full inventory list.
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS educator_visible boolean NOT NULL DEFAULT false;

-- Marks a project request as a waitlist join: the kit wasn't available when the
-- teacher requested it, so no reserved hold is placed. Admins see waitlist
-- requests in order (created_at) and can approve when the kit returns.
ALTER TABLE public.item_requests
  ADD COLUMN IF NOT EXISTS is_waitlist boolean NOT NULL DEFAULT false;
