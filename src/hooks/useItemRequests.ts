import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ItemRequest {
  id: string;
  itemId: string;
  itemName: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string | null;
  requesterOrganization: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'denied';
  adminResponse: string | null;
  preferredDates: string[];
  confirmedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useItemRequests() {
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('item_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ItemRequest[] = (data || []).map((r) => ({
        id: r.id,
        itemId: r.item_id,
        itemName: r.item_name,
        requesterId: r.requester_id,
        requesterName: r.requester_name,
        requesterEmail: r.requester_email,
        requesterOrganization: r.requester_organization,
        message: r.message,
        status: r.status as 'pending' | 'approved' | 'denied',
        adminResponse: r.admin_response,
        preferredDates: (r.preferred_dates as string[]) || [],
        confirmedDate: r.confirmed_date,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      setRequests(mapped);
      setPendingCount(mapped.filter((r) => r.status === 'pending').length);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (
    itemId: string,
    itemName: string,
    requesterName: string,
    requesterEmail: string | null,
    requesterOrganization: string | null,
    message?: string,
    preferredDates?: Date[]
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('item_requests').insert({
        item_id: itemId,
        item_name: itemName,
        requester_id: user.id,
        requester_name: requesterName,
        requester_email: requesterEmail,
        requester_organization: requesterOrganization,
        message: message || null,
        preferred_dates: preferredDates?.map(d => d.toISOString()) || [],
      });

      if (error) throw error;

      toast({
        title: 'Request Sent',
        description: 'Your request has been sent to the administrator.',
      });

      await fetchRequests();
      return true;
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send request. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateRequest = async (
    requestId: string,
    status: 'approved' | 'denied',
    adminResponse?: string,
    confirmedDate?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('item_requests')
        .update({
          status,
          admin_response: adminResponse || null,
          confirmed_date: confirmedDate || null,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: status === 'approved' ? 'Request Approved' : 'Request Denied',
        description: `The request has been ${status}.`,
      });

      await fetchRequests();
      return true;
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update request. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteRequest = async (requestId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('item_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Deleted',
        description: 'The request has been removed.',
      });

      await fetchRequests();
      return true;
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete request. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return {
    requests,
    loading,
    pendingCount,
    createRequest,
    updateRequest,
    deleteRequest,
    refetch: fetchRequests,
  };
}
