import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  isAdmin: boolean;
}

export function useUserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        created_at: profile.created_at,
        isAdmin: roles?.some(r => r.user_id === profile.user_id && r.role === 'admin') ?? false,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const promoteToAdmin = async (userId: string, userName: string) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can manage roles',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Admin',
            description: `${userName} is already an administrator`,
            variant: 'destructive',
          });
          return false;
        }
        throw error;
      }

      toast({
        title: 'Role Updated',
        description: `${userName} has been promoted to administrator`,
      });

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, isAdmin: true } : u
      ));

      return true;
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to promote user to admin',
        variant: 'destructive',
      });
      return false;
    }
  };

  const removeAdmin = async (userId: string, userName: string) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can manage roles',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast({
        title: 'Role Updated',
        description: `${userName} has been removed from administrators`,
      });

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, isAdmin: false } : u
      ));

      return true;
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove admin role',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    users,
    isLoading,
    promoteToAdmin,
    removeAdmin,
    refetch: fetchUsers,
  };
}
