import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: 'available' | 'checked-out' | 'maintenance';
  qr_code: string;
  location: string;
  checked_out_by: string | null;
  checked_out_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  item_id: string;
  item_name: string;
  action: 'check-in' | 'check-out';
  performed_by: string;
  performed_by_name: string;
  created_at: string;
}

export function useInventoryDB() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();

  // Fetch inventory items
  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setItems((data || []).map(item => ({
        ...item,
        status: item.status as 'available' | 'checked-out' | 'maintenance'
      })));
    } catch (error: any) {
      console.error('Error fetching items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory items',
        variant: 'destructive',
      });
    }
  };

  // Fetch activity logs
  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      setLogs((data || []).map(log => ({
        ...log,
        action: log.action as 'check-in' | 'check-out'
      })));
    } catch (error: any) {
      console.error('Error fetching logs:', error);
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([fetchItems(), fetchLogs()]).finally(() => setIsLoading(false));
    }
  }, [user]);

  const generateQRCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'GW-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const addItem = async (item: { name: string; description: string; category: string; location: string }) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can add items',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const newItem = {
        ...item,
        qr_code: generateQRCode(),
        status: 'available',
      };

      const { data, error } = await supabase
        .from('inventory_items')
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;

      const typedData = {
        ...data,
        status: data.status as 'available' | 'checked-out' | 'maintenance'
      };
      
      setItems(prev => [typedData, ...prev]);
      toast({
        title: 'Item Added',
        description: `${item.name} has been added to inventory`,
      });
      return typedData;
    } catch (error: any) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, ...updates } : item
        )
      );
      return true;
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update item',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteItem = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can delete items',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== id));
      toast({
        title: 'Item Deleted',
        description: 'The item has been removed from inventory',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item',
        variant: 'destructive',
      });
      return false;
    }
  };

  const checkOut = async (itemId: string, userName: string) => {
    if (!user) return false;
    
    const item = items.find(i => i.id === itemId);
    if (!item || item.status !== 'available') {
      toast({
        title: 'Cannot Check Out',
        description: 'This item is not available',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Update item
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          status: 'checked-out',
          checked_out_by: user.id,
          checked_out_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Create activity log
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          item_id: itemId,
          item_name: item.name,
          action: 'check-out',
          performed_by: user.id,
          performed_by_name: userName,
        });

      if (logError) throw logError;

      // Update local state
      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'checked-out' as const, checked_out_by: user.id, checked_out_at: new Date().toISOString() }
            : i
        )
      );

      await fetchLogs();
      return true;
    } catch (error: any) {
      console.error('Error checking out:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check out item',
        variant: 'destructive',
      });
      return false;
    }
  };

  const checkIn = async (itemId: string, userName: string) => {
    if (!user) return false;
    
    const item = items.find(i => i.id === itemId);
    if (!item) return false;
    
    // Handle returning from maintenance (admin only)
    if (item.status === 'maintenance') {
      if (!isAdmin) {
        toast({
          title: 'Permission Denied',
          description: 'Only admins can return items from maintenance',
          variant: 'destructive',
        });
        return false;
      }
    } else if (item.status !== 'checked-out') {
      toast({
        title: 'Cannot Check In',
        description: 'This item is not checked out',
        variant: 'destructive',
      });
      return false;
    } else {
      // Only allow check-in if user is admin or the one who checked it out
      if (!isAdmin && item.checked_out_by !== user.id) {
        toast({
          title: 'Permission Denied',
          description: 'You can only check in items you checked out',
          variant: 'destructive',
        });
        return false;
      }
    }

    try {
      // Update item
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          status: 'available',
          checked_out_by: null,
          checked_out_at: null,
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Create activity log
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          item_id: itemId,
          item_name: item.name,
          action: 'check-in',
          performed_by: user.id,
          performed_by_name: userName,
        });

      if (logError) throw logError;

      // Update local state
      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'available' as const, checked_out_by: null, checked_out_at: null }
            : i
        )
      );

      await fetchLogs();
      return true;
    } catch (error: any) {
      console.error('Error checking in:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check in item',
        variant: 'destructive',
      });
      return false;
    }
  };

  const setMaintenance = async (itemId: string) => {
    if (!user || !isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can send items to maintenance',
        variant: 'destructive',
      });
      return false;
    }
    
    const item = items.find(i => i.id === itemId);
    if (!item) return false;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          status: 'maintenance',
          checked_out_by: null,
          checked_out_at: null,
        })
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'maintenance' as const, checked_out_by: null, checked_out_at: null }
            : i
        )
      );

      toast({
        title: 'Sent to Maintenance',
        description: `${item.name} has been sent for maintenance`,
      });
      return true;
    } catch (error: any) {
      console.error('Error setting maintenance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send item to maintenance',
        variant: 'destructive',
      });
      return false;
    }
  };

  const findByQrCode = (qrCode: string): InventoryItem | undefined => {
    return items.find(item => item.qr_code === qrCode);
  };

  const getStats = () => {
    const total = items.length;
    const available = items.filter(i => i.status === 'available').length;
    const checkedOut = items.filter(i => i.status === 'checked-out').length;
    const maintenance = items.filter(i => i.status === 'maintenance').length;
    return { total, available, checkedOut, maintenance };
  };

  return {
    items,
    logs,
    isLoading,
    isAdmin,
    addItem,
    updateItem,
    deleteItem,
    checkOut,
    checkIn,
    setMaintenance,
    findByQrCode,
    getStats,
    refetch: () => Promise.all([fetchItems(), fetchLogs()]),
  };
}
