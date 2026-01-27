-- Drop the existing user update policy
DROP POLICY IF EXISTS "Users can update item status for check-in/out" ON public.inventory_items;

-- Create updated policy that also allows admins to return items from maintenance
CREATE POLICY "Users can update item status for check-in/out" 
ON public.inventory_items 
FOR UPDATE 
USING (
  -- Admins can update any item (including maintenance)
  is_admin() 
  OR 
  -- Users can check in items they checked out
  ((status = 'checked-out') AND (checked_out_by = auth.uid())) 
  OR 
  -- Users can check out available items
  (status = 'available')
);