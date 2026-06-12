import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { findOrCreatePartnerSchool } from '@/lib/partnerSchools';
import type { OhioSchool } from '@/lib/csvAssignments';

export type OrganizationWithSchools = Tables<'organizations'> & {
  organization_schools: {
    school_id: string;
    partner_schools: { id: string; name: string } | null;
  }[];
};

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<OrganizationWithSchools[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*, organization_schools(school_id, partner_schools(id,name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrganizations((data as unknown as OrganizationWithSchools[]) || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast({ title: 'Error', description: 'Failed to load organizations', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchOrganizations().finally(() => setIsLoading(false));
    }
  }, [user]);

  const addOrganization = async (input: {
    name: string;
    org_type: string;
    schools?: OhioSchool[];
  }) => {
    try {
      const { data: org, error } = await supabase
        .from('organizations')
        .insert({ name: input.name, org_type: input.org_type })
        .select('id')
        .single();
      if (error || !org) throw error;

      for (const ohio of input.schools ?? []) {
        const school = await findOrCreatePartnerSchool(ohio);
        if (!school) continue;
        const { error: linkErr } = await supabase
          .from('organization_schools')
          .insert({ organization_id: org.id, school_id: school.id });
        if (linkErr) console.error('Error linking org school:', linkErr);
      }

      await fetchOrganizations();
      toast({ title: 'Organization Added', description: `${input.name} has been added` });
      return true;
    } catch (error: any) {
      console.error('Error adding organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add organization',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteOrganization = async (id: string) => {
    if (!isAdmin) {
      toast({ title: 'Permission Denied', description: 'Only admins can delete organizations', variant: 'destructive' });
      return false;
    }
    try {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) throw error;
      setOrganizations((prev) => prev.filter((o) => o.id !== id));
      toast({ title: 'Organization Removed' });
      return true;
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete organization',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { organizations, isLoading, addOrganization, deleteOrganization, refetch: fetchOrganizations };
}
