import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import type { DemographicsSnapshot } from '@/lib/schoolDemographics';

export type TeacherAssignment = Omit<
  Tables<'teacher_school_assignments'>,
  'demographics_snapshot'
> & {
  demographics_snapshot: DemographicsSnapshot;
  partner_schools: { id: string; name: string; ohio_irn: string | null } | null;
  profiles: { id: string; full_name: string } | null;
};

export interface NewAssignment {
  teacher_id: string;
  school_id: string;
  grade_low: string;
  grade_high: string;
  subject?: string | null;
  students_served?: number | null;
  school_year?: string | null;
  notes?: string | null;
  demographics_snapshot: DemographicsSnapshot;
}

export function useTeacherAssignments() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_school_assignments')
        .select('*, partner_schools(id,name,ohio_irn), profiles(id,full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments((data as unknown as TeacherAssignment[]) || []);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teacher assignments',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchAssignments().finally(() => setIsLoading(false));
    }
  }, [user]);

  const addAssignment = async (input: NewAssignment) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can assign teachers',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('teacher_school_assignments')
        .insert({
          teacher_id: input.teacher_id,
          school_id: input.school_id,
          grade_low: input.grade_low,
          grade_high: input.grade_high,
          subject: input.subject ?? null,
          students_served: input.students_served ?? null,
          school_year: input.school_year ?? null,
          notes: input.notes ?? null,
          demographics_snapshot: input.demographics_snapshot as unknown as Tables<'teacher_school_assignments'>['demographics_snapshot'],
        })
        .select('*, partner_schools(id,name,ohio_irn), profiles(id,full_name)')
        .single();

      if (error) throw error;

      setAssignments((prev) => [data as unknown as TeacherAssignment, ...prev]);
      toast({
        title: 'Teacher Assigned',
        description: 'Assignment created with demographic snapshot',
      });
      return data as unknown as TeacherAssignment;
    } catch (error: any) {
      console.error('Error adding assignment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create assignment',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteAssignment = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can remove assignments',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('teacher_school_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast({ title: 'Assignment Removed' });
      return true;
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove assignment',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { assignments, isLoading, addAssignment, deleteAssignment, refetch: fetchAssignments };
}
