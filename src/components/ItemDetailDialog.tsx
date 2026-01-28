import { useState } from 'react';
import { Package, MapPin, Calendar, Tag, ArrowLeftRight, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { InventoryItem } from '@/types/inventory';
import { Location } from '@/hooks/useLocations';
import { format } from 'date-fns';

interface ItemDetailDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckIn: (itemId: string, userName: string) => Promise<boolean> | boolean;
  onCheckOut: (itemId: string, userName: string) => Promise<boolean> | boolean;
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
}: ItemDetailDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!item) return null;

  const handleAction = async () => {
    if (!selectedUserName.trim()) return;
    setIsLoading(true);
    
    try {
      if (item.status === 'available') {
        await onCheckOut(item.id, selectedUserName.trim());
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
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-secondary -mt-2 mb-2">
            <img 
              src={item.imageUrl} 
              alt={item.name}
              className="w-full h-full object-cover"
            />
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
