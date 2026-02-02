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
  location_id: string | null;
  image_url: string | null;
  checked_out_by: string | null;
  checked_out_at: string | null;
  tags: string[] | null;
  quantity: number | null;
  is_consumable: boolean;
  bundle_id: string | null;
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

  const addItem = async (item: { 
    name: string; 
    description: string; 
    category: string; 
    location: string; 
    location_id?: string; 
    image_url?: string; 
    tags?: string[];
    quantity?: number;
    is_consumable?: boolean;
  }) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can add items',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const newItem: Record<string, unknown> = {
        name: item.name,
        description: item.description,
        category: item.category,
        location: item.location,
        image_url: item.image_url || null,
        tags: item.tags || [],
        quantity: item.quantity ?? 1,
        is_consumable: item.is_consumable ?? false,
        qr_code: generateQRCode(),
        status: 'available',
      };
      
      if (item.location_id) {
        newItem.location_id = item.location_id;
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .insert(newItem as any)
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

  const checkOut = async (itemId: string, userName: string, newLocationId?: string, locations?: { id: string; name: string }[], quantityToCheckOut: number = 1, bundleItemIds?: string[]) => {
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
      // If bundleItemIds provided, check out all bundle items together
      if (bundleItemIds && bundleItemIds.length > 0) {
        const allItemIds = [itemId, ...bundleItemIds.filter(id => id !== itemId)];
        const availableItems = items.filter(i => allItemIds.includes(i.id) && i.status === 'available');
        
        if (availableItems.length < allItemIds.length) {
          const unavailableItems = items.filter(i => allItemIds.includes(i.id) && i.status !== 'available');
          toast({
            title: 'Cannot Check Out Bundle',
            description: `Some items are not available: ${unavailableItems.map(i => i.name).join(', ')}`,
            variant: 'destructive',
          });
          return false;
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          status: 'checked-out',
          checked_out_by: user.id,
          checked_out_at: new Date().toISOString(),
        };
        if (newLocationId && locations) {
          const newLocation = locations.find(l => l.id === newLocationId);
          if (newLocation) {
            updateData.location = newLocation.name;
            updateData.location_id = newLocationId;
          }
        }

        // Update all items in the bundle
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update(updateData)
          .in('id', allItemIds);

        if (updateError) throw updateError;

        // Create activity logs for all items
        const logEntries = availableItems.map(i => ({
          item_id: i.id,
          item_name: i.name,
          action: 'check-out',
          performed_by: user.id,
          performed_by_name: userName,
        }));

        await supabase.from('activity_logs').insert(logEntries);

        // Update local state
        const newLocation = newLocationId && locations ? locations.find(l => l.id === newLocationId) : null;
        setItems(prev =>
          prev.map(i =>
            allItemIds.includes(i.id)
              ? { ...i, status: 'checked-out' as const, checked_out_by: user.id, checked_out_at: new Date().toISOString(), ...(newLocation && { location: newLocation.name, location_id: newLocationId }) }
              : i
          )
        );

        await fetchLogs();
        toast({
          title: 'Bundle Checked Out',
          description: `${availableItems.length} items have been checked out`,
        });
        return true;
      }

      // Handle consumable items differently
      if (item.is_consumable) {
        const currentQuantity = item.quantity ?? 1;
        const newQuantity = currentQuantity - quantityToCheckOut;
        
        if (newQuantity <= 0) {
          // Delete the item when depleted
          const { error: deleteError } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', itemId);

          if (deleteError) throw deleteError;

          // Create activity log for consumption
          await supabase
            .from('activity_logs')
            .insert({
              item_id: itemId,
              item_name: item.name,
              action: 'check-out',
              performed_by: user.id,
              performed_by_name: userName,
            });

          setItems(prev => prev.filter(i => i.id !== itemId));
          
          toast({
            title: 'Item Consumed',
            description: `${item.name} has been fully consumed and removed from inventory`,
          });
        } else {
          // Decrement quantity
          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({ quantity: newQuantity })
            .eq('id', itemId);

          if (updateError) throw updateError;

          // Create activity log
          await supabase
            .from('activity_logs')
            .insert({
              item_id: itemId,
              item_name: item.name,
              action: 'check-out',
              performed_by: user.id,
              performed_by_name: userName,
            });

          setItems(prev =>
            prev.map(i =>
              i.id === itemId ? { ...i, quantity: newQuantity } : i
            )
          );

          toast({
            title: 'Item Consumed',
            description: `${quantityToCheckOut} unit(s) of ${item.name} consumed. ${newQuantity} remaining.`,
          });
        }
        
        await fetchLogs();
        return true;
      }

      // Standard check-out for non-consumable items
      const updateData: Record<string, unknown> = {
        status: 'checked-out',
        checked_out_by: user.id,
        checked_out_at: new Date().toISOString(),
      };
      if (newLocationId && locations) {
        const newLocation = locations.find(l => l.id === newLocationId);
        if (newLocation) {
          updateData.location = newLocation.name;
          updateData.location_id = newLocationId;
        }
      }
      
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update(updateData)
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
      const newLocation = newLocationId && locations ? locations.find(l => l.id === newLocationId) : null;
      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'checked-out' as const, checked_out_by: user.id, checked_out_at: new Date().toISOString(), ...(newLocation && { location: newLocation.name, location_id: newLocationId }) }
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

  const checkIn = async (itemId: string, userName: string, newLocationId?: string, locations?: { id: string; name: string }[]) => {
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
      const updateData: Record<string, unknown> = {
        status: 'available',
        checked_out_by: null,
        checked_out_at: null,
      };
      if (newLocationId && locations) {
        const newLocation = locations.find(l => l.id === newLocationId);
        if (newLocation) {
          updateData.location = newLocation.name;
          updateData.location_id = newLocationId;
        }
      }
      
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update(updateData)
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
      const newLocation = newLocationId && locations ? locations.find(l => l.id === newLocationId) : null;
      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'available' as const, checked_out_by: null, checked_out_at: null, ...(newLocation && { location: newLocation.name, location_id: newLocationId }) }
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

  const setMaintenance = async (itemId: string, newLocationId?: string, locations?: { id: string; name: string }[]) => {
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
      const updateData: Record<string, unknown> = {
        status: 'maintenance',
        checked_out_by: null,
        checked_out_at: null,
      };
      if (newLocationId && locations) {
        const newLocation = locations.find(l => l.id === newLocationId);
        if (newLocation) {
          updateData.location = newLocation.name;
          updateData.location_id = newLocationId;
        }
      }
      
      const { error } = await supabase
        .from('inventory_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      const newLocation = newLocationId && locations ? locations.find(l => l.id === newLocationId) : null;
      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'maintenance' as const, checked_out_by: null, checked_out_at: null, ...(newLocation && { location: newLocation.name, location_id: newLocationId }) }
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

  const bulkAddItems = async (itemsToAdd: { name: string; description: string; category: string; location: string; tags?: string[]; image_url?: string; quantity?: number; is_consumable?: boolean }[]) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can add items',
        variant: 'destructive',
      });
      return [];
    }

    try {
      const newItems = itemsToAdd.map(item => ({
        name: item.name,
        description: item.description,
        category: item.category,
        location: item.location,
        tags: item.tags || [],
        image_url: item.image_url || null,
        quantity: item.quantity ?? 1,
        is_consumable: item.is_consumable ?? false,
        qr_code: generateQRCode(),
        status: 'available',
      }));

      const { data, error } = await supabase
        .from('inventory_items')
        .insert(newItems)
        .select();

      if (error) throw error;

      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as 'available' | 'checked-out' | 'maintenance'
      }));

      setItems(prev => [...typedData, ...prev]);
      return typedData;
    } catch (error: any) {
      console.error('Error bulk adding items:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to import items',
        variant: 'destructive',
      });
      return [];
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
    bulkAddItems,
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
