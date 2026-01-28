import { useState, useRef } from 'react';
import { Plus, Upload, Link as LinkIcon, Video, FileText, GraduationCap, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagsCheckboxGroup } from '@/components/TagsCheckboxGroup';
import { NewResource } from '@/hooks/useResources';

interface AddResourceDialogProps {
  onAdd: (resource: NewResource) => Promise<any>;
  uploadFile: (file: File) => Promise<string | null>;
}

export function AddResourceDialog({ onAdd, uploadFile }: AddResourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<NewResource['type']>('link');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('link');
    setUrl('');
    setSelectedFile(null);
    setSelectedThumbnail(null);
    setThumbnailPreview(null);
    setTags([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || tags.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      let filePath: string | null = null;
      let thumbnailPath: string | null = null;
      
      // Upload file if selected
      if (selectedFile && (type === 'manual' || type === 'curriculum')) {
        filePath = await uploadFile(selectedFile);
        if (!filePath) {
          setIsSubmitting(false);
          return;
        }
      }
      
      // Upload thumbnail if selected
      if (selectedThumbnail) {
        thumbnailPath = await uploadFile(selectedThumbnail);
      }
      
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        url: type === 'link' || type === 'video' ? url.trim() : (url.trim() || undefined),
        file_path: filePath || undefined,
        thumbnail_url: thumbnailPath || undefined,
        tags,
      });
      
      setOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedThumbnail(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeThumbnail = () => {
    setSelectedThumbnail(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const needsUrl = type === 'link' || type === 'video';
  const needsFile = type === 'manual' || type === 'curriculum';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Resource</DialogTitle>
            <DialogDescription>
              Add curriculum, links, videos, or support materials for members.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resource title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this resource"
                rows={2}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as NewResource['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="curriculum">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Curriculum
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video
                    </div>
                  </SelectItem>
                  <SelectItem value="link">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Link
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Manual / Document
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Thumbnail Image */}
            <div className="space-y-2">
              <Label>Preview Image</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Add a thumbnail image that members will see
              </p>
              <div className="flex items-start gap-3">
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  onChange={handleThumbnailChange}
                  className="hidden"
                  accept="image/*"
                />
                {thumbnailPreview ? (
                  <div className="relative">
                    <img 
                      src={thumbnailPreview} 
                      alt="Thumbnail preview" 
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeThumbnail}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Image className="h-4 w-4" />
                    Upload Image
                  </Button>
                )}
              </div>
            </div>

            {/* URL (for links and videos) */}
            {needsUrl && (
              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={type === 'video' ? 'https://youtube.com/...' : 'https://...'}
                  required={needsUrl}
                />
              </div>
            )}

            {/* File Upload (for manuals and curriculum) */}
            {needsFile && (
              <div className="space-y-2">
                <Label>Upload Document</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Choose File
                  </Button>
                  {selectedFile && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{selectedFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Or provide a URL below for externally hosted files
                </p>
                {/* Optional URL for files */}
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Or enter external URL (optional)"
                />
              </div>
            )}

            {/* Tags */}
            <div className="space-y-2">
              <Label>Visibility Tags *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select which groups can see this resource
              </p>
              <TagsCheckboxGroup
                selectedTags={tags}
                onTagsChange={setTags}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || tags.length === 0 || isSubmitting || (needsUrl && !url.trim() && !selectedFile)}
            >
              {isSubmitting ? 'Adding...' : 'Add Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
