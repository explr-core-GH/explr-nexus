import { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Trash2, 
  ExternalLink, 
  Download,
  Link as LinkIcon,
  Video,
  FileText,
  GraduationCap,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useResources, Resource } from '@/hooks/useResources';
import { AddResourceDialog } from '@/components/AddResourceDialog';
import { format } from 'date-fns';

const typeIcons = {
  link: LinkIcon,
  video: Video,
  manual: FileText,
  curriculum: GraduationCap,
};

const typeLabels = {
  link: 'Link',
  video: 'Video',
  manual: 'Manual',
  curriculum: 'Curriculum',
};

export function ResourceManagement() {
  const { resources, isLoading, addResource, deleteResource, uploadFile, getFileUrl } = useResources();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResources = resources.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleOpenResource = (resource: Resource) => {
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    } else if (resource.file_path) {
      const url = getFileUrl(resource.file_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10">
            <BookOpen className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Resource Management</h2>
            <p className="text-muted-foreground">
              Upload and organize curriculum, links, videos, and manuals
            </p>
          </div>
        </div>
        <AddResourceDialog onAdd={addResource} uploadFile={uploadFile} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Resources</p>
          <p className="text-2xl font-bold">{resources.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Curriculum</p>
          <p className="text-2xl font-bold text-accent">
            {resources.filter(r => r.type === 'curriculum').length}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Videos</p>
          <p className="text-2xl font-bold">
            {resources.filter(r => r.type === 'video').length}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Manuals</p>
          <p className="text-2xl font-bold">
            {resources.filter(r => r.type === 'manual').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Resources Table */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Resource</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Tags</TableHead>
              <TableHead className="hidden sm:table-cell">Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {resources.length === 0 ? 'No resources added yet' : 'No matching resources'}
                </TableCell>
              </TableRow>
            ) : (
              filteredResources.map((resource) => {
                const Icon = typeIcons[resource.type];
                const isFile = !!resource.file_path;
                // Handle both external URLs (YouTube/Vimeo) and uploaded file paths
                const thumbnailUrl = resource.thumbnail_url 
                  ? (resource.thumbnail_url.startsWith('http') ? resource.thumbnail_url : getFileUrl(resource.thumbnail_url))
                  : null;
                
                return (
                  <TableRow key={resource.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {thumbnailUrl ? (
                          <img 
                            src={thumbnailUrl} 
                            alt={resource.title}
                            className="h-12 w-16 rounded-md object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-16 rounded-md bg-secondary flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5 text-accent" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{resource.title}</p>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {resource.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabels[resource.type]}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {resource.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {resource.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{resource.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {format(new Date(resource.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenResource(resource)}
                          title={isFile ? 'Download' : 'Open link'}
                        >
                          {isFile ? (
                            <Download className="h-4 w-4" />
                          ) : (
                            <ExternalLink className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <span className="font-semibold">{resource.title}</span>? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteResource(resource.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
