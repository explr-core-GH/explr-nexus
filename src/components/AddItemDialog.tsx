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
import { ItemTagsSelect } from '@/components/ItemTagsSelect';
import { ItemContentsEditor, ItemContentLine } from '@/components/ItemContentsEditor';
import { Location } from '@/hooks/useLocations';
import { useCategories } from '@/hooks/useCategories';

interface AddItemDialogProps {
  onAdd: (item: { 
    name: string; 
    description: string; 
    category: string; 
    location: string; 
    location_id?: string; 
    image_url?: string; 
    tags?: string[];
    item_tags?: string[];
    quantity?: number;
    is_consumable?: boolean;
    cost?: number | null;
    contents?: ItemContentLine[];
  }) => void | Promise<unknown>;
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
  const [itemTags, setItemTags] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [isConsumable, setIsConsumable] = useState(false);
  const [cost, setCost] = useState<string>('');
  const [contents, setContents] = useState<ItemContentLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { categories, isLoading: categoriesLoading } = useCategories();

  const selectedLocation = locations.find(l => l.id === locationId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name || !category || !locationId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const parsedCost = cost.trim() === '' ? null : Number(cost);

      await onAdd({
        name,
        description,
        category,
        location: selectedLocation?.name || '',
        location_id: locationId,
        image_url: imageUrl || undefined,
        tags: tags.length > 0 ? tags : undefined,
        item_tags: itemTags,
        quantity: quantity > 0 ? quantity : 1,
        is_consumable: isConsumable,
        cost: parsedCost !== null && !Number.isNaN(parsedCost) ? parsedCost : null,
        contents: contents.filter(c => c.name.trim() !== ''),
      });

      setName('');
      setDescription('');
      setCategory('');
      setLocationId('');
      setImageUrl(null);
      setTags([]);
      setItemTags([]);
      setQuantity(1);
      setIsConsumable(false);
      setCost('');
      setContents([]);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="space-y-2">
            <Label>Item Tags</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Keywords that make this item easier to find
            </p>
            <ItemTagsSelect selectedTags={itemTags} onTagsChange={setItemTags} />
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
          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="cost">Cost (USD)</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Optional, e.g., 149.99"
            />
          </div>
          {/* Item contents */}
          <div className="space-y-2">
            <Label>Item Contents</Label>
            <p className="text-xs text-muted-foreground">
              Optional checklist of what is inside this item. Contents must be verified on check-in.
            </p>
            <ItemContentsEditor contents={contents} onChange={setContents} />
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
