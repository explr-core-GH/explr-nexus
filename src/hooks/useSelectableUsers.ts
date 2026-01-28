import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SelectableUser } from '@/components/UserSelect';

export function useSelectableUsers() {
  const [users, setUsers] = useState<SelectableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email')
          .order('full_name', { ascending: true });

        if (profilesError) throw profilesError;

        // Fetch all roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) throw rolesError;

        // Combine profiles with roles
        const usersWithRoles: SelectableUser[] = (profiles || []).map(profile => {
          const userRoles = roles?.filter(r => r.user_id === profile.user_id) ?? [];
          
          // Determine the primary role (admin > user > member > null)
          let role: 'admin' | 'user' | 'member' | null = null;
          if (userRoles.some(r => r.role === 'admin')) {
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
            role,
          };
        });

        setUsers(usersWithRoles);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, isLoading };
}
