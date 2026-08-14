import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ItemTag {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function useTags() {
  const [tags, setTags] = useState<ItemTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags((data as ItemTag[]) || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const denied = () => {
    toast({
      title: 'Permission Denied',
      description: 'Only administrators can manage tags',
      variant: 'destructive',
    });
    return false;
  };

  const addTag = async (name: string) => {
    if (!isAdmin) return denied();
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: name.trim() })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Tag Exists', description: 'That tag already exists', variant: 'destructive' });
          return false;
        }
        throw error;
      }

      setTags(prev => [...prev, data as ItemTag].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: 'Tag Added', description: `"${name}" has been added` });
      return true;
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({ title: 'Error', description: 'Failed to add tag', variant: 'destructive' });
      return false;
    }
  };

  const updateTag = async (id: string, name: string) => {
    if (!isAdmin) return denied();
    try {
      const { error } = await supabase.from('tags').update({ name: name.trim() }).eq('id', id);
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Tag Exists', description: 'That tag already exists', variant: 'destructive' });
          return false;
        }
        throw error;
      }
      setTags(prev =>
        prev.map(t => (t.id === id ? { ...t, name: name.trim() } : t)).sort((a, b) => a.name.localeCompare(b.name))
      );
      toast({ title: 'Tag Updated', description: `Tag renamed to "${name}"` });
      return true;
    } catch (error) {
      console.error('Error updating tag:', error);
      toast({ title: 'Error', description: 'Failed to update tag', variant: 'destructive' });
      return false;
    }
  };

  const deleteTag = async (id: string, name: string) => {
    if (!isAdmin) return denied();
    try {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
      setTags(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Tag Deleted', description: `"${name}" has been removed` });
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({ title: 'Error', description: 'Failed to delete tag', variant: 'destructive' });
      return false;
    }
  };

  return { tags, isLoading, addTag, updateTag, deleteTag, refetch: fetchTags };
}
