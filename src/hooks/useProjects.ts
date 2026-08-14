import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectMaterial {
  id: string;
  projectId: string;
  itemId: string;
  quantity: number;
}

export interface ProjectCurriculum {
  id: string;
  projectId: string;
  title: string;
  type: 'link' | 'file';
  url: string | null;
  filePath: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  materials: ProjectMaterial[];
  curriculum: ProjectCurriculum[];
}

export interface ProjectInput {
  name: string;
  description: string;
  imageUrl: string | null;
  materials: { itemId: string; quantity: number }[];
  curriculum: { id?: string; title: string; type: 'link' | 'file'; url: string | null; filePath: string | null }[];
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    try {
      const [{ data: rows, error }, { data: matRows }, { data: curRows }] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('project_items').select('*'),
        supabase.from('project_curriculum').select('*').order('created_at', { ascending: true }),
      ]);

      if (error) throw error;

      const mapped: Project[] = (rows || []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.image_url,
        isArchived: p.is_archived,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        materials: (matRows || [])
          .filter((m) => m.project_id === p.id)
          .map((m) => ({ id: m.id, projectId: m.project_id, itemId: m.item_id, quantity: m.quantity })),
        curriculum: (curRows || [])
          .filter((c) => c.project_id === p.id)
          .map((c) => ({
            id: c.id,
            projectId: c.project_id,
            title: c.title,
            type: c.type === 'file' ? 'file' : 'link',
            url: c.url,
            filePath: c.file_path,
          })),
      }));

      setProjects(mapped);
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast({ title: 'Error', description: 'Failed to load projects', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const syncChildren = async (projectId: string, input: ProjectInput) => {
    await supabase.from('project_items').delete().eq('project_id', projectId);
    const materials = input.materials.filter((m) => m.itemId && m.quantity > 0);
    if (materials.length > 0) {
      const { error } = await supabase.from('project_items').insert(
        materials.map((m) => ({ project_id: projectId, item_id: m.itemId, quantity: m.quantity }))
      );
      if (error) throw error;
    }

    await supabase.from('project_curriculum').delete().eq('project_id', projectId);
    const curriculum = input.curriculum.filter((c) => c.title.trim() && (c.url || c.filePath));
    if (curriculum.length > 0) {
      const { error } = await supabase.from('project_curriculum').insert(
        curriculum.map((c) => ({
          project_id: projectId,
          title: c.title.trim(),
          type: c.type,
          url: c.url,
          file_path: c.filePath,
        }))
      );
      if (error) throw error;
    }
  };

  const createProject = async (input: ProjectInput): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: input.name.trim(),
          description: input.description || null,
          image_url: input.imageUrl,
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      await syncChildren(data.id, input);
      await fetchProjects();
      toast({ title: 'Project Created', description: `${input.name} is now available to educators.` });
      return true;
    } catch (err) {
      console.error('Error creating project:', err);
      toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' });
      return false;
    }
  };

  const updateProject = async (id: string, input: ProjectInput): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: input.name.trim(),
          description: input.description || null,
          image_url: input.imageUrl,
        })
        .eq('id', id);

      if (error) throw error;
      await syncChildren(id, input);
      await fetchProjects();
      toast({ title: 'Project Updated', description: 'Changes have been saved.' });
      return true;
    } catch (err) {
      console.error('Error updating project:', err);
      toast({ title: 'Error', description: 'Failed to update project', variant: 'destructive' });
      return false;
    }
  };

  const setArchived = async (id: string, archived: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase.from('projects').update({ is_archived: archived }).eq('id', id);
      if (error) throw error;
      await fetchProjects();
      toast({
        title: archived ? 'Project Archived' : 'Project Restored',
        description: archived ? 'Educators can no longer request this project.' : 'The project is browsable again.',
      });
      return true;
    } catch (err) {
      console.error('Error archiving project:', err);
      toast({ title: 'Error', description: 'Failed to update project', variant: 'destructive' });
      return false;
    }
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      await fetchProjects();
      toast({ title: 'Project Deleted', description: 'The project has been removed.' });
      return true;
    } catch (err) {
      console.error('Error deleting project:', err);
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' });
      return false;
    }
  };

  return {
    projects,
    activeProjects: projects.filter((p) => !p.isArchived),
    isLoading,
    createProject,
    updateProject,
    setArchived,
    deleteProject,
    refetch: fetchProjects,
  };
}

export function curriculumUrl(entry: ProjectCurriculum): string | null {
  if (entry.type === 'file' && entry.filePath) {
    return supabase.storage.from('resources').getPublicUrl(entry.filePath).data.publicUrl;
  }
  return entry.url;
}
