import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem } from '@/hooks/useInventoryDB';

export interface EducatorLocation {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  organization_name: string | null;
  organization_address: string | null;
  latitude: number;
  longitude: number;
  checkedOutItems: InventoryItem[];
}

export function useEducatorLocations(items: InventoryItem[]) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email, organization_name, organization_address, organization_latitude, organization_longitude')
          .not('organization_latitude', 'is', null)
          .not('organization_longitude', 'is', null);

        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error('Error fetching educator profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  // Create educator locations from profiles that have checked-out items
  const educatorLocations = useMemo(() => {
    // Group checked-out items by user_id (checked_out_by)
    const checkedOutByUser = new Map<string, InventoryItem[]>();
    
    items.forEach(item => {
      if (item.status === 'checked-out' && item.checked_out_by) {
        const existing = checkedOutByUser.get(item.checked_out_by) || [];
        existing.push(item);
        checkedOutByUser.set(item.checked_out_by, existing);
      }
    });

    // Match profiles with their checked-out items
    const locations: EducatorLocation[] = [];
    
    profiles.forEach(profile => {
      const userItems = checkedOutByUser.get(profile.user_id);
      if (userItems && userItems.length > 0 && profile.organization_latitude && profile.organization_longitude) {
        locations.push({
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          organization_name: profile.organization_name,
          organization_address: profile.organization_address,
          latitude: parseFloat(profile.organization_latitude),
          longitude: parseFloat(profile.organization_longitude),
          checkedOutItems: userItems,
        });
      }
    });

    return locations;
  }, [profiles, items]);

  return { educatorLocations, isLoading };
}
