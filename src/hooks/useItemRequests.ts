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
  status: 'pending' | 'approved' | 'denied' | 'pending_confirmation';
  adminResponse: string | null;
  preferredDates: string[];
  confirmedDate: string | null;
  adminProposedDate: string | null;
  freeReducedLunch: string | null;
  specialGroups: string[];
  numberOfStudents: number | null;
  usageHours: number | null;
  usageDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestDemographics {
  freeReducedLunch: string;
  specialGroups: string[];
  numberOfStudents: number;
  usageHours: number;
  usageDays: number;
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
        status: r.status as 'pending' | 'approved' | 'denied' | 'pending_confirmation',
        adminResponse: r.admin_response,
        preferredDates: (r.preferred_dates as string[]) || [],
        confirmedDate: r.confirmed_date,
        adminProposedDate: r.admin_proposed_date,
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
    status: 'approved' | 'denied' | 'pending_confirmation' | 'pending',
    adminResponse?: string,
    confirmedDate?: string,
    adminProposedDate?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('item_requests')
        .update({
          status,
          admin_response: adminResponse || null,
          confirmed_date: confirmedDate || null,
          admin_proposed_date: adminProposedDate || null,
        })
        .eq('id', requestId);

      if (error) throw error;

      const statusMessages: Record<string, { title: string; description: string }> = {
        approved: { title: 'Request Approved', description: 'The request has been approved.' },
        denied: { title: 'Request Denied', description: 'The request has been denied.' },
        pending_confirmation: { title: 'Date Proposed', description: 'A new date has been proposed to the requester.' },
        pending: { title: 'Request Updated', description: 'The request has been updated.' },
      };

      toast(statusMessages[status]);

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

  const confirmProposedDate = async (requestId: string, accept: boolean): Promise<boolean> => {
    try {
      if (accept) {
        // Get the request to copy the proposed date to confirmed date
        const request = requests.find(r => r.id === requestId);
        if (!request?.adminProposedDate) throw new Error('No proposed date found');

        const { error } = await supabase
          .from('item_requests')
          .update({
            status: 'approved',
            confirmed_date: request.adminProposedDate,
            admin_proposed_date: null,
          })
          .eq('id', requestId);

        if (error) throw error;

        toast({
          title: 'Date Confirmed',
          description: 'You have confirmed the proposed pickup date.',
        });
      } else {
        // Member rejects the proposed date - go back to pending
        const { error } = await supabase
          .from('item_requests')
          .update({
            status: 'pending',
            admin_proposed_date: null,
          })
          .eq('id', requestId);

        if (error) throw error;

        toast({
          title: 'Date Declined',
          description: 'The proposed date has been declined. The admin will be notified.',
        });
      }

      await fetchRequests();
      return true;
    } catch (error: any) {
      console.error('Error confirming date:', error);
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
    confirmProposedDate,
    refetch: fetchRequests,
  };
}
