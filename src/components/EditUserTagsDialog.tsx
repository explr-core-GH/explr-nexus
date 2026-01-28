import { useState, useEffect } from 'react';
import { Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TagsCheckboxGroup } from '@/components/TagsCheckboxGroup';
import { Badge } from '@/components/ui/badge';

interface EditUserTagsDialogProps {
  userName: string;
  userId: string;
  currentTags: string[];
  onSave: (userId: string, userName: string, tags: string[]) => Promise<boolean>;
}

export function EditUserTagsDialog({ userName, userId, currentTags, onSave }: EditUserTagsDialogProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(currentTags);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTags(currentTags);
  }, [currentTags]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(userId, userName, tags);
    setIsSaving(false);
    if (success) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Tags className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Tags</span>
          {currentTags.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {currentTags.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Visibility Tags</DialogTitle>
          <DialogDescription>
            Select which inventory categories <strong>{userName}</strong> can view.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <TagsCheckboxGroup selectedTags={tags} onTagsChange={setTags} />
        </div>
        <div className="flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Tags'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
