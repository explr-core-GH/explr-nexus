import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
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
import { UserSelect, SelectableUser } from '@/components/UserSelect';
import { TagsCheckboxGroup } from '@/components/TagsCheckboxGroup';
import { Location } from '@/hooks/useLocations';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';

interface EditItemDialogProps {
  item: {
    id: string;
    name: string;
    description: string;
    category: string;
    location: string;
    locationId?: string;
    imageUrl?: string;
    tags?: string[];
    status?: string;
    checkedOutBy?: string;
  };
  locations?: Location[];
  users?: SelectableUser[];
  onUpdate: (id: string, updates: {
    name: string;
    description: string;
    category: string;
    location: string;
    location_id: string | null;
    image_url: string | null;
    tags?: string[];
    checked_out_by?: string | null;
  }) => Promise<boolean>;
  trigger?: React.ReactNode;
}

export function EditItemDialog({ item, locations = [], users = [], onUpdate, trigger }: EditItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [category, setCategory] = useState(item.category);
  const [location, setLocation] = useState(item.location);
  const [locationId, setLocationId] = useState<string | undefined>(item.locationId);
  const [imageUrl, setImageUrl] = useState<string | null>(item.imageUrl || null);
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [assignedToName, setAssignedToName] = useState<string>(item.checkedOutBy || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { categories, isLoading: categoriesLoading } = useCategories();

  // Reset form when item changes
  useEffect(() => {
    setName(item.name);
    setDescription(item.description);
    setCategory(item.category);
    setLocation(item.location);
    setLocationId(item.locationId);
    setImageUrl(item.imageUrl || null);
    setTags(item.tags || []);
    setAssignedToName(item.checkedOutBy || '');
  }, [item]);

  const handleLocationChange = (locId: string) => {
    setLocationId(locId);
    const selectedLocation = locations.find(l => l.id === locId);
    if (selectedLocation) {
      setLocation(selectedLocation.name);
    }
  };

  const handleUserChange = (userId: string, userName: string) => {
    setAssignedToName(userName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !location) return;

    setIsSubmitting(true);
    try {
      const updates: Parameters<typeof onUpdate>[1] = {
        name,
        description,
        category,
        location,
        location_id: locationId || null,
        image_url: imageUrl,
        tags,
      };
      
      // Only include checked_out_by if item is checked out
      if (item.status === 'checked-out') {
        updates.checked_out_by = assignedToName || null;
      }

      const success = await onUpdate(item.id, updates);

      if (success) {
        toast({
          title: 'Item Updated',
          description: `${name} has been updated successfully`,
        });
        setOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the details for this inventory item.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-name">Item Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Power Drill"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the item..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category *</Label>
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
                {/* Include current category if not in list (legacy support) */}
                {category && !categories.find(c => c.name === category) && (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-location">Location *</Label>
            {locations.length > 0 ? (
              <LocationSelect
                locations={locations}
                value={locationId}
                onValueChange={handleLocationChange}
              />
            ) : (
              <Input
                id="edit-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Warehouse A, Shelf 3"
                required
              />
            )}
          </div>
          {/* Assigned User (only for checked-out items) */}
          {item.status === 'checked-out' && users.length > 0 && (
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <UserSelect
                users={users}
                value=""
                onValueChange={handleUserChange}
                placeholder={assignedToName || "Select user"}
                filterRoles={['admin', 'user', 'member']}
              />
            </div>
          )}
          {/* Visibility Tags */}
          <div className="space-y-2">
            <Label>Visibility Tags</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select which member groups can see this item
            </p>
            <TagsCheckboxGroup selectedTags={tags} onTagsChange={setTags} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
