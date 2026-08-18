import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Loader2, Upload, Link as LinkIcon, ScanLine } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/ImageUpload';
import { InventoryItemCombobox } from '@/components/InventoryItemCombobox';
import { QRScanner } from '@/components/QRScanner';
import { InventoryItem } from '@/hooks/useInventoryDB';
import { Project, ProjectInput } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MaterialRow {
  itemId: string;
  quantity: number;
}

interface CurriculumRow {
  title: string;
  type: 'link' | 'file';
  url: string | null;
  filePath: string | null;
  fileName?: string | null;
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  items: InventoryItem[];
  onSubmit: (input: ProjectInput) => Promise<boolean>;
}

export function ProjectFormDialog({ open, onOpenChange, project, items, onSubmit }: ProjectFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { toast } = useToast();

  // Scan an item's QR code straight into the materials list — add it, or bump
  // its quantity if it's already there. Built for phones: keeps the camera on.
  const handleScanItem = (qrCode: string) => {
    const code = qrCode.trim();
    const item = items.find(
      i => i.qr_code === code || i.qr_code?.toLowerCase() === code.toLowerCase()
    );
    if (!item) {
      toast({ title: 'Item not found', description: `No inventory item matches "${code}".`, variant: 'destructive' });
      return;
    }
    setMaterials(prev => {
      const idx = prev.findIndex(m => m.itemId === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        toast({ title: 'Added another', description: `${item.name} ×${next[idx].quantity}` });
        return next;
      }
      toast({ title: 'Item added', description: item.name });
      return [...prev, { itemId: item.id, quantity: 1 }];
    });
  };

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setImageUrl(project?.imageUrl ?? null);
    setMaterials(project?.materials.map(m => ({ itemId: m.itemId, quantity: m.quantity })) ?? []);
    setCurriculum(
      project?.curriculum.map(c => ({
        title: c.title,
        type: c.type,
        url: c.url,
        filePath: c.filePath,
        fileName: c.filePath ? c.filePath.split('/').pop() : null,
      })) ?? []
    );
  }, [open, project]);

  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));

  const handleFileUpload = async (index: number, file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Curriculum files must be under 25MB.', variant: 'destructive' });
      return;
    }
    setUploadingIndex(index);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const filePath = `curriculum/${uuidv4()}.${ext}`;
      const { error } = await supabase.storage.from('resources').upload(filePath, file);
      if (error) throw error;
      setCurriculum(prev =>
        prev.map((row, i) =>
          i === index
            ? { ...row, type: 'file', filePath, url: null, fileName: file.name, title: row.title || file.name }
            : row
        )
      );
    } catch (err) {
      console.error('Curriculum upload failed:', err);
      toast({ title: 'Upload Failed', description: 'Could not upload the file.', variant: 'destructive' });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Missing name', description: 'Give the project a name.', variant: 'destructive' });
      return;
    }
    const cleanMaterials = materials.filter(m => m.itemId && m.quantity > 0);
    if (cleanMaterials.length === 0) {
      toast({ title: 'Missing materials', description: 'Add at least one item to the materials list.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    const ok = await onSubmit({
      name,
      description,
      imageUrl,
      materials: cleanMaterials,
      curriculum: curriculum
        .filter(c => c.title.trim() && (c.url || c.filePath))
        .map(c => ({ title: c.title, type: c.type, url: c.url, filePath: c.filePath })),
    });
    setIsSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => { if (scannerOpen) e.preventDefault(); }}
        onPointerDownOutside={(e) => { if (scannerOpen) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
          <DialogDescription>
            Bundle inventory items and curriculum into a ready-made project educators can request in one click.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name *</Label>
            <Input id="project-name" value={name} onChange={e => setName(e.target.value)} placeholder="Intro to micro:bit Circuits" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What students will build and learn."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Project Image</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Materials *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setScannerOpen(true)}
                >
                  <ScanLine className="h-4 w-4 mr-1" /> Scan items
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMaterials(prev => [...prev, { itemId: '', quantity: 1 }])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add material
                </Button>
              </div>
            </div>
            {materials.length === 0 && (
              <p className="text-sm text-muted-foreground">No materials yet — add the inventory items this project needs.</p>
            )}
            {materials.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <InventoryItemCombobox
                  items={sortedItems}
                  value={row.itemId}
                  disabledIds={materials.map(m => m.itemId).filter(Boolean)}
                  className="flex-1 min-w-0"
                  onChange={value =>
                    setMaterials(prev => prev.map((m, i) => (i === index ? { ...m, itemId: value } : m)))
                  }
                />
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={row.quantity}
                  onChange={e =>
                    setMaterials(prev =>
                      prev.map((m, i) => (i === index ? { ...m, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) } : m))
                    )
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setMaterials(prev => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label>Curriculum</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCurriculum(prev => [...prev, { title: '', type: 'link', url: '', filePath: null }])}
              >
                <Plus className="h-4 w-4 mr-1" /> Add curriculum
              </Button>
            </div>
            {curriculum.length === 0 && (
              <p className="text-sm text-muted-foreground">Attach lesson plans as uploaded files or links.</p>
            )}
            {curriculum.map((row, index) => (
              <div key={index} className="space-y-2 rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Title"
                    value={row.title}
                    onChange={e => setCurriculum(prev => prev.map((c, i) => (i === index ? { ...c, title: e.target.value } : c)))}
                  />
                  <Select
                    value={row.type}
                    onValueChange={value =>
                      setCurriculum(prev =>
                        prev.map((c, i) => (i === index ? { ...c, type: value as 'link' | 'file' } : c))
                      )
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setCurriculum(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {row.type === 'link' ? (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://..."
                      value={row.url ?? ''}
                      onChange={e =>
                        setCurriculum(prev => prev.map((c, i) => (i === index ? { ...c, url: e.target.value, filePath: null } : c)))
                      }
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(index, file);
                      }}
                    />
                    {uploadingIndex === index && <Loader2 className="h-4 w-4 animate-spin" />}
                    {row.filePath && uploadingIndex !== index && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Upload className="h-3 w-3" /> {row.fileName || 'Uploaded'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {project ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {scannerOpen &&
        createPortal(
          <QRScanner
            continuous
            onScan={handleScanItem}
            onClose={() => setScannerOpen(false)}
          />,
          document.body
        )}
    </Dialog>
  );
}
