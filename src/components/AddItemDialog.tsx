import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useCategories } from '@/hooks/useCategories';

interface AddItemDialogProps {
  onAdd: (item: { 
    name: string; 
    description: string; 
    category: string; 
    location: string; 
    locationId?: string; 
    imageUrl?: string; 
    tags?: string[];
    quantity?: number;
    is_consumable?: boolean;
  }) => void;
  locations: Location[];
}

export function AddItemDialog({ onAdd, locations }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [locationId, setLocationId] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [isConsumable, setIsConsumable] = useState(false);
  const { categories, isLoading: categoriesLoading } = useCategories();

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
      quantity: quantity > 0 ? quantity : 1,
      is_consumable: isConsumable,
    });

    setName('');
    setDescription('');
    setCategory('');
    setLocationId('');
    setImageUrl(null);
    setTags([]);
    setQuantity(1);
    setIsConsumable(false);
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
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Enter the details for the new inventory item. A unique QR code will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 overflow-y-auto flex-1 pr-2">
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
            <Select value={category} onValueChange={setCategory} required disabled={categoriesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={categoriesLoading ? "Loading..." : "Select category"} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categories.length === 0 && !categoriesLoading && (
              <p className="text-xs text-muted-foreground">
                No categories available. Add categories in the Admin panel first.
              </p>
            )}
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
          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="1"
            />
          </div>
          {/* Consumable checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="consumable"
              checked={isConsumable}
              onCheckedChange={(checked) => setIsConsumable(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="consumable"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Consumable Item
              </Label>
              <p className="text-xs text-muted-foreground">
                When checked out, quantity decreases. Item is removed when depleted.
              </p>
            </div>
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
