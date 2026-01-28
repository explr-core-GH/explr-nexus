import { useState, useRef, useEffect } from 'react';
import { Plus, Upload, Link as LinkIcon, Video, FileText, GraduationCap, X, Image, Loader2 } from 'lucide-react';
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
import { getVideoThumbnailUrl, isVideoUrl } from '@/lib/videoThumbnails';

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
  const [autoThumbnailUrl, setAutoThumbnailUrl] = useState<string | null>(null);
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Auto-fetch video thumbnail when URL changes
  useEffect(() => {
    const fetchThumbnail = async () => {
      if (type === 'video' && url && isVideoUrl(url)) {
        setIsFetchingThumbnail(true);
        try {
          const thumbnailUrl = await getVideoThumbnailUrl(url);
          if (thumbnailUrl) {
            setAutoThumbnailUrl(thumbnailUrl);
          }
        } catch (error) {
          console.error('Error fetching video thumbnail:', error);
        } finally {
          setIsFetchingThumbnail(false);
        }
      } else {
        setAutoThumbnailUrl(null);
      }
    };

    // Debounce the fetch
    const timeoutId = setTimeout(fetchThumbnail, 500);
    return () => clearTimeout(timeoutId);
  }, [url, type]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('link');
    setUrl('');
    setSelectedFile(null);
    setSelectedThumbnail(null);
    setThumbnailPreview(null);
    setAutoThumbnailUrl(null);
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
      
      // Upload custom thumbnail if selected, otherwise use auto-detected URL
      if (selectedThumbnail) {
        thumbnailPath = await uploadFile(selectedThumbnail);
      }
      
      // For the thumbnail_url, we'll store either:
      // 1. The uploaded file path (if custom thumbnail uploaded)
      // 2. The auto-detected video thumbnail URL (if available and no custom)
      const finalThumbnailUrl = thumbnailPath || (autoThumbnailUrl && !selectedThumbnail ? autoThumbnailUrl : undefined);
      
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        url: type === 'link' || type === 'video' ? url.trim() : (url.trim() || undefined),
        file_path: filePath || undefined,
        thumbnail_url: finalThumbnailUrl,
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
  
  // Determine which thumbnail to show
  const displayThumbnail = thumbnailPreview || autoThumbnailUrl;
  const isAutoThumbnail = !thumbnailPreview && autoThumbnailUrl;

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

            {/* URL (for links and videos) */}
            {needsUrl && (
              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={type === 'video' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                  required={needsUrl}
                />
                {type === 'video' && (
                  <p className="text-xs text-muted-foreground">
                    YouTube and Vimeo thumbnails are extracted automatically
                  </p>
                )}
              </div>
            )}

            {/* Preview Image */}
            <div className="space-y-2">
              <Label>Preview Image</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {type === 'video' 
                  ? 'Auto-detected from video URL, or upload a custom image' 
                  : 'Add a thumbnail image that members will see'}
              </p>
              <div className="flex items-start gap-3">
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  onChange={handleThumbnailChange}
                  className="hidden"
                  accept="image/*"
                />
                
                {isFetchingThumbnail ? (
                  <div className="w-24 h-24 rounded-lg border bg-muted flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : displayThumbnail ? (
                  <div className="relative">
                    <img 
                      src={displayThumbnail} 
                      alt="Thumbnail preview" 
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                    {isAutoThumbnail && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                        Auto
                      </span>
                    )}
                    {!isAutoThumbnail && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={removeThumbnail}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ) : null}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="gap-2"
                >
                  <Image className="h-4 w-4" />
                  {displayThumbnail ? 'Change Image' : 'Upload Image'}
                </Button>
              </div>
            </div>

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
