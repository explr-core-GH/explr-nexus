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
  checked_out_by_name: string | null;
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

  // Fetch inventory items with checked-out-by user names
  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs that have checked out items
      const userIds = [...new Set((data || [])
        .filter(item => item.checked_out_by)
        .map(item => item.checked_out_by as string))];

      // Fetch profile names for those users
      let userNameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        if (profiles) {
          userNameMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p.full_name;
            return acc;
          }, {} as Record<string, string>);
        }
      }
      
      setItems((data || []).map(item => ({
        ...item,
        status: item.status as 'available' | 'checked-out' | 'maintenance',
        checked_out_by_name: item.checked_out_by ? (userNameMap[item.checked_out_by] || null) : null
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

      const typedData: InventoryItem = {
        ...data,
        status: data.status as 'available' | 'checked-out' | 'maintenance',
        checked_out_by_name: null
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

  const checkOut = async (itemId: string, userName: string, newLocationId?: string, locations?: { id: string; name: string; address?: string }[], quantityToCheckOut: number = 1, bundleItemIds?: string[], selectedUserId?: string) => {
    if (!user) return false;
    
    // Use the selected user ID if provided, otherwise fall back to logged-in user
    const checkOutUserId = selectedUserId || user.id;
    
    const item = items.find(i => i.id === itemId);
    if (!item || item.status !== 'available') {
      toast({
        title: 'Cannot Check Out',
        description: 'This item is not available',
        variant: 'destructive',
      });
      return false;
    }

    // If checking out to a specific user, try to get their organization location
    let educatorLocation: { id: string; name: string } | null = null;
    if (selectedUserId && locations) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_name, organization_address')
          .eq('user_id', selectedUserId)
          .maybeSingle();
        
        if (profile?.organization_address) {
          // Find location that matches the educator's organization address
          const matchingLocation = locations.find(l => l.address === profile.organization_address);
          if (matchingLocation) {
            educatorLocation = { id: matchingLocation.id, name: matchingLocation.name };
          }
        }
      } catch (error) {
        console.error('Error fetching educator profile for location:', error);
      }
    }

    // Use educator's location if found, otherwise use the provided newLocationId
    const finalLocationId = educatorLocation?.id || newLocationId;
    const finalLocationName = educatorLocation?.name || (newLocationId && locations ? locations.find(l => l.id === newLocationId)?.name : null);

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
          checked_out_by: checkOutUserId,
          checked_out_at: new Date().toISOString(),
        };
        if (finalLocationId && finalLocationName) {
          updateData.location = finalLocationName;
          updateData.location_id = finalLocationId;
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
        setItems(prev =>
          prev.map(i =>
            allItemIds.includes(i.id)
              ? { ...i, status: 'checked-out' as const, checked_out_by: checkOutUserId, checked_out_by_name: userName, checked_out_at: new Date().toISOString(), ...(finalLocationId && finalLocationName && { location: finalLocationName, location_id: finalLocationId }) }
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
        checked_out_by: checkOutUserId,
        checked_out_at: new Date().toISOString(),
      };
      if (finalLocationId && finalLocationName) {
        updateData.location = finalLocationName;
        updateData.location_id = finalLocationId;
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
      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'checked-out' as const, checked_out_by: checkOutUserId, checked_out_by_name: userName, checked_out_at: new Date().toISOString(), ...(finalLocationId && finalLocationName && { location: finalLocationName, location_id: finalLocationId }) }
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
      // Check if this is a bundle item - if so, check in all items in the bundle
      let allItemIds = [itemId];
      let isBundleCheckIn = false;
      
      if (item.bundle_id) {
        // Fetch bundle items
        const { data: bundleItems, error: bundleError } = await supabase
          .from('bundle_items')
          .select('item_id')
          .eq('bundle_id', item.bundle_id);
        
        if (!bundleError && bundleItems && bundleItems.length > 0) {
          allItemIds = [itemId, ...bundleItems.map(bi => bi.item_id)];
          isBundleCheckIn = true;
        }
      }

      // Update item(s)
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
        .in('id', allItemIds);

      if (updateError) throw updateError;

      // Create activity logs for all items
      const itemsToLog = items.filter(i => allItemIds.includes(i.id));
      const logEntries = itemsToLog.map(i => ({
        item_id: i.id,
        item_name: i.name,
        action: 'check-in',
        performed_by: user.id,
        performed_by_name: userName,
      }));

      await supabase.from('activity_logs').insert(logEntries);

      // Update local state
      const newLocation = newLocationId && locations ? locations.find(l => l.id === newLocationId) : null;
      setItems(prev =>
        prev.map(i =>
          allItemIds.includes(i.id)
            ? { ...i, status: 'available' as const, checked_out_by: null, checked_out_at: null, ...(newLocation && { location: newLocation.name, location_id: newLocationId }) }
            : i
        )
      );

      await fetchLogs();
      
      if (isBundleCheckIn) {
        toast({
          title: 'Bundle Checked In',
          description: `${item.name} and ${allItemIds.length - 1} bundle items have been checked in`,
        });
      }
      
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
      // Check if this is a bundle item - if so, send all items to maintenance
      let allItemIds = [itemId];
      let isBundleMaintenance = false;
      
      if (item.bundle_id) {
        // Fetch bundle items
        const { data: bundleItems, error: bundleError } = await supabase
          .from('bundle_items')
          .select('item_id')
          .eq('bundle_id', item.bundle_id);
        
        if (!bundleError && bundleItems && bundleItems.length > 0) {
          allItemIds = [itemId, ...bundleItems.map(bi => bi.item_id)];
          isBundleMaintenance = true;
        }
      }

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
        .in('id', allItemIds);

      if (error) throw error;

      const newLocation = newLocationId && locations ? locations.find(l => l.id === newLocationId) : null;
      setItems(prev =>
        prev.map(i =>
          allItemIds.includes(i.id)
            ? { ...i, status: 'maintenance' as const, checked_out_by: null, checked_out_at: null, ...(newLocation && { location: newLocation.name, location_id: newLocationId }) }
            : i
        )
      );

      if (isBundleMaintenance) {
        toast({
          title: 'Bundle Sent to Maintenance',
          description: `${item.name} and ${allItemIds.length - 1} bundle items have been sent for maintenance`,
        });
      } else {
        toast({
          title: 'Sent to Maintenance',
          description: `${item.name} has been sent for maintenance`,
        });
      }
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

      const typedData: InventoryItem[] = (data || []).map(item => ({
        ...item,
        status: item.status as 'available' | 'checked-out' | 'maintenance',
        checked_out_by_name: null
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
