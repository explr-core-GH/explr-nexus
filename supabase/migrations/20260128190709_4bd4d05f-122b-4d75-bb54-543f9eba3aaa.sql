-- Create item_requests table for in-app notifications
CREATE TABLE public.item_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  requester_id UUID NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT,
  requester_organization TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.item_requests ENABLE ROW LEVEL SECURITY;

-- Members can create requests and view their own
CREATE POLICY "Members can create requests"
ON public.item_requests
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Members can view their own requests"
ON public.item_requests
FOR SELECT
USING (auth.uid() = requester_id);

-- Admins can view and manage all requests
CREATE POLICY "Admins can view all requests"
ON public.item_requests
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can update requests"
ON public.item_requests
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete requests"
ON public.item_requests
FOR DELETE
USING (public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_item_requests_updated_at
BEFORE UPDATE ON public.item_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();