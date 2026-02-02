import { useState, useEffect } from 'react';
import { Package, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { InventoryItem } from '@/hooks/useInventoryDB';

interface CreateBundleDialogProps {
  items: InventoryItem[];
  onCreateBundle: (name: string, description: string, itemIds: string[]) => Promise<unknown>;
  trigger?: React.ReactNode;
}

export function CreateBundleDialog({ items, onCreateBundle, trigger }: CreateBundleDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setSelectedItemIds([]);
      setSearchQuery('');
    }
  }, [open]);

  const filteredItems = items.filter(
    item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedItemIds.length < 2) return;

    setIsSubmitting(true);
    try {
      await onCreateBundle(name.trim(), description.trim(), selectedItemIds);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItems = items.filter(item => selectedItemIds.includes(item.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Bundle
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Bundle
          </DialogTitle>
          <DialogDescription>
            Group multiple inventory items together. When checked out, all items in the bundle will be checked out together.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="bundle-name">Bundle Name *</Label>
            <Input
              id="bundle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Robotics Kit A"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bundle-description">Description</Label>
            <Textarea
              id="bundle-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the bundle..."
              rows={2}
            />
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Items ({selectedItems.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map(item => (
                  <Badge
                    key={item.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {item.name}
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className="ml-1 rounded-full hover:bg-secondary-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Item Selection */}
          <div className="space-y-2">
            <Label>Select Items * (minimum 2)</Label>
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <ScrollArea className="h-48 border rounded-lg p-2">
              {filteredItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items found
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map(item => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedItemIds.includes(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.category} • {item.location}
                        </p>
                      </div>
                      <Badge
                        variant={item.status === 'available' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {item.status}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
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
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !name.trim() || selectedItemIds.length < 2}
            >
              {isSubmitting ? 'Creating...' : 'Create Bundle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
