import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'user' | 'member';

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  isAdmin: boolean;
  role: AppRole | null; // null means no role assigned
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
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRoles = roles?.filter(r => r.user_id === profile.user_id) ?? [];
        const isAdmin = userRoles.some(r => r.role === 'admin');
        // Determine the primary role (admin > user > member > null)
        let role: AppRole | null = null;
        if (isAdmin) {
          role = 'admin';
        } else if (userRoles.some(r => r.role === 'user')) {
          role = 'user';
        } else if (userRoles.some(r => r.role === 'member')) {
          role = 'member';
        }
        
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          created_at: profile.created_at,
          isAdmin,
          role,
        };
      });

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

  const setUserRole = async (userId: string, userName: string, newRole: AppRole | null) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can manage roles',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // First, remove all existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // If new role is not null, insert it
      if (newRole) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (insertError) throw insertError;
      }

      const roleLabel = newRole ? newRole.charAt(0).toUpperCase() + newRole.slice(1) : 'None';
      toast({
        title: 'Role Updated',
        description: `${userName}'s role has been set to ${roleLabel}`,
      });

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, role: newRole, isAdmin: newRole === 'admin' } : u
      ));

      return true;
    } catch (error) {
      console.error('Error setting user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Legacy functions for backwards compatibility
  const promoteToAdmin = async (userId: string, userName: string) => {
    return setUserRole(userId, userName, 'admin');
  };

  const removeAdmin = async (userId: string, userName: string) => {
    // When removing admin, set to 'user' role instead of null
    return setUserRole(userId, userName, 'user');
  };

  return {
    users,
    isLoading,
    setUserRole,
    promoteToAdmin,
    removeAdmin,
    refetch: fetchUsers,
  };
}
