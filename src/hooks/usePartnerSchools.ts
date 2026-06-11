import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

export type OhioSchool = Tables<'ohio_schools'>;

export type PartnerSchool = Tables<'partner_schools'> & {
  ohio_schools: OhioSchool | null;
};

export function usePartnerSchools() {
  const [schools, setSchools] = useState<PartnerSchool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_schools')
        .select('*, ohio_schools(*)')
        .order('name', { ascending: true });

      if (error) throw error;
      setSchools((data as PartnerSchool[]) || []);
    } catch (error: any) {
      console.error('Error fetching partner schools:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schools',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchSchools().finally(() => setIsLoading(false));
    }
  }, [user]);

  const geocodeAddress = async (
    address: string
  ): Promise<{ latitude: number | null; longitude: number | null }> => {
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

  const addSchool = async (school: {
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    ohio_irn?: string | null;
    notes?: string | null;
  }) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can add schools',
        variant: 'destructive',
      });
      return null;
    }

    try {
      let coords = {
        latitude: school.latitude ?? null,
        longitude: school.longitude ?? null,
      };
      if ((coords.latitude === null || coords.longitude === null) && school.address) {
        coords = await geocodeAddress(school.address);
      }

      const { data, error } = await supabase
        .from('partner_schools')
        .insert({
          name: school.name,
          address: school.address ?? null,
          latitude: coords.latitude,
          longitude: coords.longitude,
          ohio_irn: school.ohio_irn ?? null,
          notes: school.notes ?? null,
        })
        .select('*, ohio_schools(*)')
        .single();

      if (error) throw error;

      setSchools((prev) =>
        [...prev, data as PartnerSchool].sort((a, b) => a.name.localeCompare(b.name))
      );
      toast({
        title: 'School Added',
        description: `${school.name} has been added`,
      });
      return data as PartnerSchool;
    } catch (error: any) {
      console.error('Error adding school:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add school',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteSchool = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can delete schools',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase.from('partner_schools').delete().eq('id', id);
      if (error) throw error;
      setSchools((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'School Deleted', description: 'School has been removed' });
      return true;
    } catch (error: any) {
      console.error('Error deleting school:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete school',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    schools,
    isLoading,
    addSchool,
    deleteSchool,
    refetch: fetchSchools,
  };
}
