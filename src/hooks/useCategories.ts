import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const addCategory = async (name: string) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can add categories',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: name.trim() })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Category Exists',
            description: 'A category with this name already exists',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return false;
      }

      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: 'Category Added',
        description: `"${name}" has been added`,
      });
      return true;
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast({
        title: 'Error',
        description: 'Failed to add category',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateCategory = async (id: string, name: string) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can update categories',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: name.trim() })
        .eq('id', id);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Category Exists',
            description: 'A category with this name already exists',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return false;
      }

      setCategories(prev => 
        prev.map(cat => cat.id === id ? { ...cat, name: name.trim() } : cat)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      toast({
        title: 'Category Updated',
        description: `Category renamed to "${name}"`,
      });
      return true;
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteCategory = async (id: string, name: string) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can delete categories',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.filter(cat => cat.id !== id));
      toast({
        title: 'Category Deleted',
        description: `"${name}" has been removed`,
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete category',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
}
