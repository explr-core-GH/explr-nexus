import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Bundle {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  item_id: string;
  created_at: string;
}

export interface BundleWithItems extends Bundle {
  items: string[]; // Array of item IDs
}

export function useBundles() {
  const [bundles, setBundles] = useState<BundleWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchBundles = async () => {
    try {
      // Fetch bundles
      const { data: bundlesData, error: bundlesError } = await supabase
        .from('bundles')
        .select('*')
        .order('created_at', { ascending: false });

      if (bundlesError) throw bundlesError;

      // Fetch bundle items
      const { data: bundleItemsData, error: itemsError } = await supabase
        .from('bundle_items')
        .select('*');

      if (itemsError) throw itemsError;

      // Combine bundles with their items
      const bundlesWithItems: BundleWithItems[] = (bundlesData || []).map(bundle => ({
        ...bundle,
        items: (bundleItemsData || [])
          .filter(bi => bi.bundle_id === bundle.id)
          .map(bi => bi.item_id),
      }));

      setBundles(bundlesWithItems);
    } catch (error: any) {
      console.error('Error fetching bundles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bundles',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchBundles().finally(() => setIsLoading(false));
    }
  }, [user]);

  const createBundle = async (name: string, description: string, itemIds: string[], allItems?: { id: string; image_url?: string | null; category: string; location: string; location_id?: string | null }[]) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can create bundles',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Create the bundle
      const { data: bundleData, error: bundleError } = await supabase
        .from('bundles')
        .insert({ name, description })
        .select()
        .single();

      if (bundleError) throw bundleError;

      // Add items to the bundle
      if (itemIds.length > 0) {
        const bundleItems = itemIds.map(itemId => ({
          bundle_id: bundleData.id,
          item_id: itemId,
        }));

        const { error: itemsError } = await supabase
          .from('bundle_items')
          .insert(bundleItems);

        if (itemsError) throw itemsError;
      }

      // Get image from first bundled item that has one
      let bundleImageUrl: string | null = null;
      let bundleCategory = 'Bundle';
      let bundleLocation = 'Various';
      let bundleLocationId: string | null = null;
      
      if (allItems && itemIds.length > 0) {
        const firstItemWithImage = itemIds
          .map(id => allItems.find(item => item.id === id))
          .find(item => item?.image_url);
        
        if (firstItemWithImage) {
          bundleImageUrl = firstItemWithImage.image_url || null;
        }
        
        // Use first item's category and location
        const firstItem = allItems.find(item => item.id === itemIds[0]);
        if (firstItem) {
          bundleCategory = firstItem.category;
          bundleLocation = firstItem.location;
          bundleLocationId = firstItem.location_id || null;
        }
      }

      // Create an inventory item to represent the bundle
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('inventory_items')
        .insert({
          name: `📦 ${name}`,
          description: description || `Bundle containing ${itemIds.length} items`,
          category: bundleCategory,
          location: bundleLocation,
          location_id: bundleLocationId,
          image_url: bundleImageUrl,
          qr_code: `BUNDLE-${bundleData.id}`,
          bundle_id: bundleData.id,
          status: 'available',
        })
        .select()
        .single();

      if (inventoryError) throw inventoryError;

      const newBundle: BundleWithItems = {
        ...bundleData,
        items: itemIds,
      };

      setBundles(prev => [newBundle, ...prev]);

      toast({
        title: 'Bundle Created',
        description: `${name} has been created with ${itemIds.length} items and added to inventory`,
      });

      return newBundle;
    } catch (error: any) {
      console.error('Error creating bundle:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create bundle',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateBundle = async (id: string, name: string, description: string, itemIds: string[], allItems?: { id: string; image_url?: string | null; category: string; location: string; location_id?: string | null }[]) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can update bundles',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Update bundle details
      const { error: bundleError } = await supabase
        .from('bundles')
        .update({ name, description })
        .eq('id', id);

      if (bundleError) throw bundleError;

      // Remove existing items
      const { error: deleteError } = await supabase
        .from('bundle_items')
        .delete()
        .eq('bundle_id', id);

      if (deleteError) throw deleteError;

      // Add new items
      if (itemIds.length > 0) {
        const bundleItems = itemIds.map(itemId => ({
          bundle_id: id,
          item_id: itemId,
        }));

        const { error: itemsError } = await supabase
          .from('bundle_items')
          .insert(bundleItems);

        if (itemsError) throw itemsError;
      }

      // Update the associated inventory item
      let bundleImageUrl: string | null = null;
      let bundleCategory = 'Bundle';
      let bundleLocation = 'Various';
      let bundleLocationId: string | null = null;
      
      if (allItems && itemIds.length > 0) {
        const firstItemWithImage = itemIds
          .map(itemId => allItems.find(item => item.id === itemId))
          .find(item => item?.image_url);
        
        if (firstItemWithImage) {
          bundleImageUrl = firstItemWithImage.image_url || null;
        }
        
        const firstItem = allItems.find(item => item.id === itemIds[0]);
        if (firstItem) {
          bundleCategory = firstItem.category;
          bundleLocation = firstItem.location;
          bundleLocationId = firstItem.location_id || null;
        }
      }

      const { error: inventoryError } = await supabase
        .from('inventory_items')
        .update({
          name: `📦 ${name}`,
          description: description || `Bundle containing ${itemIds.length} items`,
          category: bundleCategory,
          location: bundleLocation,
          location_id: bundleLocationId,
          image_url: bundleImageUrl,
        })
        .eq('bundle_id', id);

      if (inventoryError) throw inventoryError;

      setBundles(prev =>
        prev.map(bundle =>
          bundle.id === id
            ? { ...bundle, name, description, items: itemIds }
            : bundle
        )
      );

      toast({
        title: 'Bundle Updated',
        description: `${name} has been updated`,
      });

      return true;
    } catch (error: any) {
      console.error('Error updating bundle:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update bundle',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteBundle = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can delete bundles',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('bundles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBundles(prev => prev.filter(bundle => bundle.id !== id));

      toast({
        title: 'Bundle Deleted',
        description: 'The bundle has been removed',
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting bundle:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bundle',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getBundleItemIds = (bundleId: string): string[] => {
    const bundle = bundles.find(b => b.id === bundleId);
    return bundle?.items || [];
  };

  const getItemBundles = (itemId: string): BundleWithItems[] => {
    return bundles.filter(bundle => bundle.items.includes(itemId));
  };

  return {
    bundles,
    isLoading,
    createBundle,
    updateBundle,
    deleteBundle,
    getBundleItemIds,
    getItemBundles,
    refetch: fetchBundles,
  };
}
