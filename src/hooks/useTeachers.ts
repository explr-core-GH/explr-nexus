import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

export type Teacher = Tables<'teachers'>;

/** A teacher option for selectors: either a real teachers row or a registered user
 *  (profile) not yet linked to one. `teacherId` is null until materialized. */
export interface SelectableTeacher {
  key: string;
  full_name: string;
  email: string | null;
  teacherId: string | null;
  profileId: string | null;
  isRegistered: boolean;
}

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      setTeachers((data as Teacher[]) || []);
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
      toast({ title: 'Error', description: 'Failed to load teachers', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchTeachers().finally(() => setIsLoading(false));
    }
  }, [user]);

  const addTeacher = async (input: { full_name: string; email?: string | null; profile_id?: string | null }) => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .insert({
          full_name: input.full_name,
          email: input.email ?? null,
          profile_id: input.profile_id ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      setTeachers((prev) =>
        [...prev, data as Teacher].sort((a, b) => a.full_name.localeCompare(b.full_name))
      );
      toast({ title: 'Teacher Added', description: `${input.full_name} has been added` });
      return data as Teacher;
    } catch (error: any) {
      console.error('Error adding teacher:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add teacher',
        variant: 'destructive',
      });
      return null;
    }
  };

  /** Find (or lazily create) the teachers row for a registered user's profile. */
  const findOrCreateForProfile = async (
    profileId: string,
    fullName: string,
    email: string | null
  ): Promise<Teacher | null> => {
    const existing = teachers.find((t) => t.profile_id === profileId);
    if (existing) return existing;
    return addTeacher({ full_name: fullName, email, profile_id: profileId });
  };

  const deleteTeacher = async (id: string) => {
    if (!isAdmin) {
      toast({ title: 'Permission Denied', description: 'Only admins can delete teachers', variant: 'destructive' });
      return false;
    }
    try {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) throw error;
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Teacher Removed' });
      return true;
    } catch (error: any) {
      console.error('Error deleting teacher:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete teacher',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { teachers, isLoading, addTeacher, findOrCreateForProfile, deleteTeacher, refetch: fetchTeachers };
}
