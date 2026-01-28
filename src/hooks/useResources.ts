import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: 'link' | 'video' | 'manual' | 'curriculum';
  url: string | null;
  file_path: string | null;
  thumbnail_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface NewResource {
  title: string;
  description?: string;
  type: 'link' | 'video' | 'manual' | 'curriculum';
  url?: string;
  file_path?: string;
  thumbnail_url?: string;
  tags: string[];
}

export function useResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setResources((data || []).map(r => ({
        ...r,
        type: r.type as Resource['type'],
        tags: r.tags || []
      })));
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load resources',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const addResource = async (resource: NewResource) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('resources')
        .insert({
          title: resource.title,
          description: resource.description || null,
          type: resource.type,
          url: resource.url || null,
          file_path: resource.file_path || null,
          thumbnail_url: resource.thumbnail_url || null,
          tags: resource.tags,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setResources(prev => [{
        ...data,
        type: data.type as Resource['type'],
        tags: data.tags || []
      }, ...prev]);
      
      toast({
        title: 'Success',
        description: 'Resource added successfully',
      });
      
      return data;
    } catch (error: any) {
      console.error('Error adding resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to add resource',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateResource = async (id: string, updates: Partial<NewResource>) => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .update({
          title: updates.title,
          description: updates.description,
          type: updates.type,
          url: updates.url,
          file_path: updates.file_path,
          thumbnail_url: updates.thumbnail_url,
          tags: updates.tags,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setResources(prev => prev.map(r => 
        r.id === id ? { ...data, type: data.type as Resource['type'], tags: data.tags || [] } : r
      ));
      
      toast({
        title: 'Success',
        description: 'Resource updated successfully',
      });
      
      return data;
    } catch (error: any) {
      console.error('Error updating resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to update resource',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteResource = async (id: string) => {
    try {
      // First get the resource to check for file_path
      const resource = resources.find(r => r.id === id);
      
      // Delete from storage if there's a file
      if (resource?.file_path) {
        await supabase.storage.from('resources').remove([resource.file_path]);
      }

      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setResources(prev => prev.filter(r => r.id !== id));
      
      toast({
        title: 'Success',
        description: 'Resource deleted successfully',
      });
      
      return true;
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete resource',
        variant: 'destructive',
      });
      return false;
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('resources')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

      return fileName;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
      return null;
    }
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('resources').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return {
    resources,
    isLoading,
    addResource,
    updateResource,
    deleteResource,
    uploadFile,
    getFileUrl,
    refetch: fetchResources,
  };
}
