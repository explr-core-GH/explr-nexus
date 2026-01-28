-- Update the inventory_items policy to allow members to only view
-- Drop the existing policy first
DROP POLICY IF EXISTS "Users can update item status for check-in/out" ON public.inventory_items;

-- Create new policy that excludes members from check-in/out
CREATE POLICY "Users can update item status for check-in/out" 
ON public.inventory_items 
FOR UPDATE 
USING (
  is_admin() OR 
  (
    -- Must have 'user' role (not 'member') to check in/out
    public.has_role(auth.uid(), 'user') AND
    (
      (status = 'checked-out' AND checked_out_by = auth.uid()) OR 
      status = 'available'
    )
  )
);

-- Create a helper function to check if user is a member
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'member')
$$;

-- Create a helper function to check if user can perform check-in/out
CREATE OR REPLACE FUNCTION public.can_check_in_out()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'user')
$$;