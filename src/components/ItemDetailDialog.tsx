import { useState } from 'react';
import { Package, MapPin, Calendar, Tag, ArrowLeftRight, Trash2, Pencil, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { EditItemDialog } from '@/components/EditItemDialog';
import { UserSelect, SelectableUser } from '@/components/UserSelect';
import { RequestItemButton } from '@/components/RequestItemButton';
import { InventoryItem } from '@/types/inventory';
import { Location } from '@/hooks/useLocations';
import { BundleWithItems } from '@/hooks/useBundles';
import { InventoryItem as DBInventoryItem } from '@/hooks/useInventoryDB';
import { format } from 'date-fns';

interface InventoryItemWithBundleId extends InventoryItem {
  bundleId?: string | null;
}
import { useAuth } from '@/contexts/AuthContext';

interface ItemDetailDialogProps {
  item: InventoryItemWithBundleId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckIn: (itemId: string, userName: string) => Promise<boolean> | boolean;
  onCheckOut: (itemId: string, userName: string, bundleItemIds?: string[]) => Promise<boolean> | boolean;
  onDelete: (itemId: string) => Promise<void> | void;
  onUpdate?: (id: string, updates: {
    name: string;
    description: string;
    category: string;
    location: string;
    location_id: string | null;
    image_url: string | null;
  }) => Promise<boolean>;
  locations?: Location[];
  users?: SelectableUser[];
  isAdmin?: boolean;
  canCheckInOut?: boolean;
  bundles?: BundleWithItems[];
  items?: DBInventoryItem[];
}

export function ItemDetailDialog({
  item,
  open,
  onOpenChange,
  onCheckIn,
  onCheckOut,
  onDelete,
  onUpdate,
  locations = [],
  users = [],
  isAdmin = false,
  canCheckInOut = true,
  bundles = [],
  items = [],
}: ItemDetailDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { userRole } = useAuth();
  const isMember = userRole === 'member';

  if (!item) return null;

  // Check if this item IS a bundle (has bundle_id pointing to a bundle)
  const isBundleItem = !!item.bundleId;
  
  // Find bundles that contain this item (item is part of a bundle)
  const itemBundles = bundles.filter(bundle => bundle.items.includes(item.id));
  const isPartOfBundle = itemBundles.length > 0;
  
  // Get all items in bundles containing this item (for when item is part of bundle)
  const getBundleItemIds = (): string[] => {
    const allIds = new Set<string>();
    itemBundles.forEach(bundle => {
      bundle.items.forEach(id => allIds.add(id));
    });
    return Array.from(allIds);
  };

  // Get items that belong to the bundle (for when this item IS the bundle)
  const getBundleContentsIds = (): string[] => {
    if (!isBundleItem || !item.bundleId) return [];
    const bundle = bundles.find(b => b.id === item.bundleId);
    return bundle?.items || [];
  };

  // Get item names for display (when item is part of bundle)
  const getBundleItemNames = (): string[] => {
    const bundleItemIds = getBundleItemIds();
    return items
      .filter(i => bundleItemIds.includes(i.id) && i.id !== item.id)
      .map(i => i.name);
  };

  // Get item names for display (when this item IS the bundle)
  const getBundleContentsNames = (): string[] => {
    const bundleContentsIds = getBundleContentsIds();
    return items
      .filter(i => bundleContentsIds.includes(i.id))
      .map(i => i.name);
  };

  const handleAction = async () => {
    if (!selectedUserName.trim()) return;
    setIsLoading(true);
    
    try {
      if (item.status === 'available') {
        // Determine which item IDs to check out together
        let bundleItemIds: string[] | undefined;
        
        if (isBundleItem) {
          // This is a bundle item - check out the bundle's contents
          bundleItemIds = getBundleContentsIds();
        } else if (isPartOfBundle) {
          // This item is part of a bundle - check out all bundle items
          bundleItemIds = getBundleItemIds();
        }
        
        await onCheckOut(item.id, selectedUserName.trim(), bundleItemIds);
      } else if (item.status === 'checked-out') {
        await onCheckIn(item.id, selectedUserName.trim());
      }
      setSelectedUserId('');
      setSelectedUserName('');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
  };

  const handleDelete = () => {
    onDelete(item.id);
    onOpenChange(false);
  };

  const statusClasses = {
    'available': 'status-available',
    'checked-out': 'status-checked-out',
    'maintenance': 'status-maintenance',
  };

  const statusLabels = {
    'available': 'Available',
    'checked-out': 'Checked Out',
    'maintenance': 'Maintenance',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Item Image */}
        {item.imageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-secondary -mt-2 mb-2">
            <img 
              src={item.imageUrl} 
              alt={item.name}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/20" />
          </div>
        )}
        
        <DialogHeader>
          <div className="flex items-start gap-3">
            {!item.imageUrl && (
              <div className="p-2 rounded-lg bg-secondary">
                <Package className="h-5 w-5 text-foreground" />
              </div>
            )}
            <div className="flex-1">
              <DialogTitle className="text-xl">{item.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status & Info */}
          <div className="flex flex-wrap gap-3">
            <span className={`status-pill ${statusClasses[item.status]}`}>
              {statusLabels[item.status]}
            </span>
            <span className="status-pill bg-secondary text-secondary-foreground">
              <Tag className="h-3 w-3" />
              {item.category}
            </span>
            <span className="status-pill bg-secondary text-secondary-foreground">
              <MapPin className="h-3 w-3" />
              {item.location}
            </span>
          </div>

          {/* Bundle Info - This IS a bundle */}
          {isBundleItem && (
            <div className="p-3 bg-accent/10 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Layers className="h-4 w-4 text-accent" />
                This is a Bundle
              </div>
              {item.status === 'available' && getBundleContentsNames().length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Checking out will also check out: {getBundleContentsNames().join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Bundle Info - Part of another bundle */}
          {isPartOfBundle && !isBundleItem && (
            <div className="p-3 bg-accent/10 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Layers className="h-4 w-4 text-accent" />
                Part of Bundle: {itemBundles.map(b => b.name).join(', ')}
              </div>
              {item.status === 'available' && (
                <div className="text-xs text-muted-foreground">
                  Checking out will also check out: {getBundleItemNames().join(', ')}
                </div>
              )}
            </div>
          )}

          {/* QR Code */}
          <QRCodeDisplay value={item.qrCode} itemName={item.name} size={160} />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Created
              </p>
              <p className="font-medium mt-0.5">
                {format(new Date(item.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Last Updated
              </p>
              <p className="font-medium mt-0.5">
                {format(new Date(item.lastUpdated), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Check In/Out Action */}
          {item.status !== 'maintenance' && canCheckInOut && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <Label>
                {item.status === 'available' ? 'Check out to:' : 'Check in by:'}
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <UserSelect
                    users={users}
                    value={selectedUserId}
                    onValueChange={handleUserSelect}
                    placeholder="Select user"
                    filterRoles={['admin', 'user', 'member']}
                  />
                </div>
                <Button onClick={handleAction} disabled={!selectedUserName.trim() || isLoading} className="gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  {item.status === 'available' ? 'Check Out' : 'Check In'}
                </Button>
              </div>
            </div>
          )}

          {/* Request Button for Members */}
          {isMember && item.status === 'available' && (
            <RequestItemButton item={item} />
          )}
          {isAdmin && (
            <div className="flex gap-2">
              {onUpdate && (
                <EditItemDialog
                  item={item}
                  locations={locations}
                  users={users}
                  onUpdate={onUpdate}
                  trigger={
                    <Button variant="outline" className="flex-1 gap-2">
                      <Pencil className="h-4 w-4" />
                      Edit Item
                    </Button>
                  }
                />
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="flex-1 text-destructive hover:text-destructive gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Item
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Item</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{item.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
