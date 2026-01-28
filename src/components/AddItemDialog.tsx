import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ImageUpload } from '@/components/ImageUpload';
import { LocationSelect } from '@/components/LocationSelect';
import { TagsCheckboxGroup } from '@/components/TagsCheckboxGroup';
import { Location } from '@/hooks/useLocations';

interface AddItemDialogProps {
  onAdd: (item: { name: string; description: string; category: string; location: string; locationId?: string; imageUrl?: string; tags?: string[] }) => void;
  locations: Location[];
}

const CATEGORIES = [
  'Electronics',
  'Tools',
  'Safety Equipment',
  'Vehicles',
  'Furniture',
  'Office Supplies',
  'Other',
];

export function AddItemDialog({ onAdd, locations }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [locationId, setLocationId] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const selectedLocation = locations.find(l => l.id === locationId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !locationId) return;

    onAdd({
      name,
      description,
      category,
      location: selectedLocation?.name || '',
      locationId,
      imageUrl: imageUrl || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    setName('');
    setDescription('');
    setCategory('');
    setLocationId('');
    setImageUrl(null);
    setTags([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Enter the details for the new inventory item. A unique QR code will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Power Drill"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the item..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <LocationSelect
              locations={locations}
              value={locationId}
              onValueChange={setLocationId}
              placeholder="Select location"
            />
            {locations.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No locations available. Add locations in the Admin panel first.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Visibility Tags</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select which member groups can see this item
            </p>
            <TagsCheckboxGroup selectedTags={tags} onTagsChange={setTags} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!locationId}>
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
