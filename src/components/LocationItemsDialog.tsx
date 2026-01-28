import { MapPin, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Location } from '@/hooks/useLocations';
import { InventoryItem } from '@/hooks/useInventoryDB';

interface LocationItemsDialogProps {
  location: Location | null;
  items: InventoryItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationItemsDialog({
  location,
  items,
  open,
  onOpenChange,
}: LocationItemsDialogProps) {
  if (!location) return null;

  const statusColors = {
    available: 'bg-available text-available-foreground',
    'checked-out': 'bg-checked-out text-checked-out-foreground',
    maintenance: 'bg-maintenance text-maintenance-foreground',
  };

  const statusLabels = {
    available: 'Available',
    'checked-out': 'Checked Out',
    maintenance: 'Maintenance',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {location.name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{location.address}</p>
        
        <div className="mt-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Items at this location ({items.length})
          </h4>
          
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No items at this location
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <Badge className={statusColors[item.status]}>
                      {statusLabels[item.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
