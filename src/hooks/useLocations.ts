import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      console.error('Error fetching locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load locations',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchLocations().finally(() => setIsLoading(false));
    }
  }, [user]);

  const geocodeAddress = async (address: string): Promise<{ latitude: number | null; longitude: number | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { address },
      });

      if (error) throw error;
      return { latitude: data.latitude, longitude: data.longitude };
    } catch (error) {
      console.error('Geocoding error:', error);
      return { latitude: null, longitude: null };
    }
  };

  const addLocation = async (location: { name: string; address: string }) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can add locations',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Geocode the address
      const coords = await geocodeAddress(location.address);

      const { data, error } = await supabase
        .from('locations')
        .insert({
          name: location.name,
          address: location.address,
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .select()
        .single();

      if (error) throw error;

      setLocations(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: 'Location Added',
        description: coords.latitude ? `${location.name} has been added with coordinates` : `${location.name} has been added (geocoding failed)`,
      });
      return data;
    } catch (error: any) {
      console.error('Error adding location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add location',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateLocation = async (id: string, updates: { name?: string; address?: string }) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can update locations',
        variant: 'destructive',
      });
      return false;
    }

    try {
      let coords = { latitude: null as number | null, longitude: null as number | null };
      
      // Re-geocode if address changed
      if (updates.address) {
        coords = await geocodeAddress(updates.address);
      }

      const updateData: Record<string, unknown> = { ...updates };
      if (updates.address) {
        updateData.latitude = coords.latitude;
        updateData.longitude = coords.longitude;
      }

      const { error } = await supabase
        .from('locations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setLocations(prev =>
        prev.map(loc => (loc.id === id ? { ...loc, ...updateData } as Location : loc))
      );
      
      toast({
        title: 'Location Updated',
        description: 'Location has been updated successfully',
      });
      return true;
    } catch (error: any) {
      console.error('Error updating location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update location',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteLocation = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can delete locations',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLocations(prev => prev.filter(loc => loc.id !== id));
      toast({
        title: 'Location Deleted',
        description: 'Location has been removed',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete location',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    locations,
    isLoading,
    addLocation,
    updateLocation,
    deleteLocation,
    refetch: fetchLocations,
  };
}
