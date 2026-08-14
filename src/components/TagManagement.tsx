import { useState } from 'react';
import { Tags, Search, Trash2, Plus, Edit, Check, X } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useTags, ItemTag } from '@/hooks/useTags';

interface TagManagementProps {
  tagCounts: Record<string, number>;
}

export function TagManagement({ tagCounts }: TagManagementProps) {
  const { tags, isLoading, addTag, updateTag, deleteTag } = useTags();
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const filtered = tags.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const success = await addTag(newTagName);
    if (success) {
      setNewTagName('');
      setAddDialogOpen(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    const success = await updateTag(id, editingName);
    if (success) {
      setEditingId(null);
      setEditingName('');
    }
  };

  const startEdit = (tag: ItemTag) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">Loading tags...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10">
            <Tags className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Item Tags</h2>
            <p className="text-muted-foreground">Searchable keywords to help find equipment</p>
          </div>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Tag</DialogTitle>
              <DialogDescription>Create a tag that can be applied to inventory items.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="tagName">Tag Name *</Label>
                <Input
                  id="tagName"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., micro:bit"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={!newTagName.trim()}>
                  Add Tag
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Tag</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  {tags.length === 0 ? 'No tags added yet' : 'No matching tags'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tag) => {
                const isEditing = editingId === tag.id;
                return (
                  <TableRow key={tag.id}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 w-[200px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(tag.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                      ) : (
                        <p className="font-medium">{tag.name}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tagCounts[tag.name] || 0} items</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(tag.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => startEdit(tag)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete <span className="font-semibold">"{tag.name}"</span>? Items keep any tag
                                    values already saved on them.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteTag(tag.id, tag.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
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
