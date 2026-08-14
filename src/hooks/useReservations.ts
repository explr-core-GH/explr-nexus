import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Reservation {
  id: string;
  requestId: string;
  projectId: string | null;
  itemId: string;
  itemName: string;
  quantity: number;
  status: 'reserved' | 'fulfilled' | 'released';
  reservedBy: string;
  createdAt: string;
}

export interface ReservationInput {
  itemId: string;
  itemName: string;
  quantity: number;
}

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchReservations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('item_reservations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReservations(
        (data || []).map((r) => ({
          id: r.id,
          requestId: r.request_id,
          projectId: r.project_id,
          itemId: r.item_id,
          itemName: r.item_name,
          quantity: r.quantity,
          status: r.status as Reservation['status'],
          reservedBy: r.reserved_by,
          createdAt: r.created_at,
        }))
      );
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  /** Quantity currently held (reserved, not yet picked up) per item id. */
  const reservedByItem = useMemo(() => {
    const map: Record<string, number> = {};
    reservations
      .filter((r) => r.status === 'reserved')
      .forEach((r) => {
        map[r.itemId] = (map[r.itemId] ?? 0) + r.quantity;
      });
    return map;
  }, [reservations]);

  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status === 'reserved'),
    [reservations]
  );

  const createReservations = async (
    requestId: string,
    projectId: string | null,
    lines: ReservationInput[]
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (lines.length === 0) return true;

      const { error } = await supabase.from('item_reservations').insert(
        lines.map((l) => ({
          request_id: requestId,
          project_id: projectId,
          item_id: l.itemId,
          item_name: l.itemName,
          quantity: l.quantity,
          reserved_by: user.id,
        }))
      );

      if (error) throw error;
      await fetchReservations();
      return true;
    } catch (err) {
      console.error('Error creating reservations:', err);
      toast({ title: 'Error', description: 'Failed to reserve the project materials.', variant: 'destructive' });
      return false;
    }
  };

  const setStatusForRequest = async (
    requestId: string,
    status: 'released' | 'fulfilled'
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('item_reservations')
        .update({ status })
        .eq('request_id', requestId)
        .eq('status', 'reserved');

      if (error) throw error;
      await fetchReservations();
      return true;
    } catch (err) {
      console.error('Error updating reservations:', err);
      return false;
    }
  };

  return {
    reservations,
    activeReservations,
    reservedByItem,
    isLoading,
    createReservations,
    releaseForRequest: (requestId: string) => setStatusForRequest(requestId, 'released'),
    fulfillForRequest: (requestId: string) => setStatusForRequest(requestId, 'fulfilled'),
    refetch: fetchReservations,
  };
}
