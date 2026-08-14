import { useState } from 'react';
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProjectFormDialog } from '@/components/ProjectFormDialog';
import { Project, useProjects, curriculumUrl } from '@/hooks/useProjects';
import { InventoryItem } from '@/hooks/useInventoryDB';

interface ProjectManagementProps {
  items: InventoryItem[];
}

export function ProjectManagement({ items }: ProjectManagementProps) {
  const { projects, isLoading, createProject, updateProject, setArchived, deleteProject } = useProjects();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [toDelete, setToDelete] = useState<Project | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FolderKanban className="h-5 w-5" /> Projects
          </h2>
          <p className="text-sm text-muted-foreground">
            Ready-made projects educators can request in one click, with materials and curriculum attached.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> New Project
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading projects...</p>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground">No projects yet. Create the first one to get started.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map(project => (
            <Card key={project.id} className={project.isArchived ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  {project.isArchived && <Badge variant="secondary">Archived</Badge>}
                </div>
                {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium">Materials</p>
                  {project.materials.length === 0 && <p className="text-muted-foreground">None</p>}
                  {project.materials.map(m => {
                    const item = items.find(i => i.id === m.itemId);
                    return (
                      <p key={m.id} className="text-muted-foreground">
                        {item?.name ?? 'Removed item'} ×{m.quantity}
                      </p>
                    );
                  })}
                </div>

                {project.curriculum.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium">Curriculum</p>
                    {project.curriculum.map(c => (
                      <a
                        key={c.id}
                        href={curriculumUrl(c) ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-primary hover:underline"
                      >
                        {c.title}
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(project)}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setArchived(project.id, !project.isArchived)}>
                    {project.isArchived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-1" /> Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-1" /> Archive
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setToDelete(project)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editing}
        items={items}
        onSubmit={input => (editing ? updateProject(editing.id, input) : createProject(input))}
      />

      <AlertDialog open={!!toDelete} onOpenChange={open => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.name}" and its materials/curriculum links will be removed. Archiving is usually better if it has
              request history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (toDelete) await deleteProject(toDelete.id);
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
