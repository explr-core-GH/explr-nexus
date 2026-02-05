import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, LogIn, LogOut, Wrench, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LocationSelect } from '@/components/LocationSelect';
import { UserSelect, SelectableUser } from '@/components/UserSelect';
import { RequestItemButton } from '@/components/RequestItemButton';
import { Location } from '@/hooks/useLocations';
import { InventoryItem } from '@/types/inventory';
import { ScanMode } from '@/components/ScanButton';
import { useAuth } from '@/contexts/AuthContext';

interface ScanResultDialogProps {
  item: InventoryItem | null;
  notFound: boolean;
  open: boolean;
  scanMode: ScanMode;
  locations: Location[];
  users?: SelectableUser[];
  onOpenChange: (open: boolean) => void;
  onCheckIn: (itemId: string, userName: string, locationId?: string) => Promise<boolean> | boolean;
  onCheckOut: (itemId: string, userName: string, locationId?: string, bundleItemIds?: string[], selectedUserId?: string) => Promise<boolean> | boolean;
  onMaintenance?: (itemId: string, userName: string, locationId?: string) => Promise<boolean> | boolean;
  isAdmin?: boolean;
  canCheckInOut?: boolean;
}

export function ScanResultDialog({
  item,
  notFound,
  open,
  scanMode,
  locations,
  users = [],
  onOpenChange,
  onCheckIn,
  onCheckOut,
  onMaintenance,
  isAdmin = false,
  canCheckInOut = true,
}: ScanResultDialogProps) {
  const [locationId, setLocationId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [actionComplete, setActionComplete] = useState(false);
  const [lastAction, setLastAction] = useState<'check-in' | 'check-out' | 'maintenance' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { userRole } = useAuth();
  const isMember = userRole === 'member';

  const handleAction = async (action: 'check-in' | 'check-out' | 'maintenance' | 'return-from-maintenance') => {
    if (!item || !selectedUserName) return;
    
    setIsLoading(true);
    
    try {
      let success = false;
      const newLocationId = locationId || undefined;
      if (action === 'check-out') {
        success = await onCheckOut(item.id, selectedUserName, newLocationId, undefined, selectedUserId || undefined);
      } else if (action === 'check-in' || action === 'return-from-maintenance') {
        success = await onCheckIn(item.id, selectedUserName, newLocationId);
      } else if (action === 'maintenance' && onMaintenance) {
        success = await onMaintenance(item.id, selectedUserName, newLocationId);
      }
      
      if (success) {
        setLastAction(action === 'return-from-maintenance' ? 'check-in' : action);
        setActionComplete(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
  };

  const handleClose = () => {
    setLocationId('');
    setSelectedUserId('');
    setSelectedUserName('');
    setActionComplete(false);
    setLastAction(null);
    onOpenChange(false);
  };

  if (notFound) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-sm">
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl mb-2">Item Not Found</DialogTitle>
            <p className="text-muted-foreground">
              The scanned QR code doesn't match any item in inventory.
            </p>
            <Button className="mt-6" onClick={handleClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (actionComplete && item) {
    const actionMessages = {
      'check-out': { title: 'Checked Out!', message: `has been checked out` },
      'check-in': { title: 'Checked In!', message: `has been checked in` },
      'maintenance': { title: 'Sent to Maintenance!', message: `has been sent for maintenance` },
    };
    
    const currentAction = lastAction || 'check-out';
    
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-sm">
          <div className="text-center py-6">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              lastAction === 'maintenance' ? 'bg-maintenance/10' : 'bg-available/10 glow-available'
            }`}>
              {lastAction === 'maintenance' ? (
                <Wrench className="h-8 w-8 text-maintenance" />
              ) : (
                <CheckCircle className="h-8 w-8 text-available" />
              )}
            </div>
            <DialogTitle className="text-xl mb-2">
              {actionMessages[currentAction].title}
            </DialogTitle>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{item.name}</span>
              {' '}{actionMessages[currentAction].message}
            </p>
            <Button className="mt-6" onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!item) return null;

  const statusClasses = {
    'available': 'status-available',
    'checked-out': 'status-checked-out',
    'maintenance': 'status-maintenance',
  };

  // Determine what actions are available based on scan mode and item status
  const renderActions = () => {
    // If user cannot check in/out (member role), show request button for available items
    if (!canCheckInOut) {
      if (item.status === 'available') {
        return <RequestItemButton item={item} />;
      }
      return (
        <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg text-muted-foreground">
          <p className="text-sm">This item is currently not available.</p>
        </div>
      );
    }

    // If item is already in maintenance
    if (item.status === 'maintenance') {
      if (isAdmin) {
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-maintenance/10 rounded-lg text-maintenance">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-medium">This item is under maintenance</p>
            </div>
            <Button 
              onClick={() => handleAction('return-from-maintenance')} 
              disabled={isLoading || !selectedUserName}
              variant="outline"
              className="w-full gap-2"
            >
              <LogIn className="h-4 w-4" />
              Return from Maintenance
            </Button>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-3 p-4 bg-maintenance/10 rounded-lg text-maintenance">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">This item is under maintenance</p>
        </div>
      );
    }

    // Specific scan modes
    if (scanMode === 'check-in') {
      if (item.status !== 'checked-out') {
        return (
          <div className="flex items-center gap-3 p-4 bg-available/10 rounded-lg text-available">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm font-medium">This item is already available</p>
          </div>
        );
      }
      return (
        <Button 
          onClick={() => handleAction('check-in')} 
          disabled={isLoading || !selectedUserName}
          className="w-full gap-2 bg-available hover:bg-available/90"
        >
          <LogIn className="h-4 w-4" />
          Check In Now
        </Button>
      );
    }

    if (scanMode === 'check-out') {
      if (item.status !== 'available') {
        return (
          <div className="flex items-center gap-3 p-4 bg-checked-out/10 rounded-lg text-checked-out">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">This item is already checked out</p>
          </div>
        );
      }
      return (
        <Button 
          onClick={() => handleAction('check-out')} 
          disabled={isLoading || !selectedUserName}
          className="w-full gap-2 bg-checked-out hover:bg-checked-out/90"
        >
          <LogOut className="h-4 w-4" />
          Check Out Now
        </Button>
      );
    }

    if (scanMode === 'maintenance') {
      return (
        <Button 
          onClick={() => handleAction('maintenance')} 
          disabled={isLoading || !selectedUserName}
          className="w-full gap-2 bg-maintenance hover:bg-maintenance/90"
        >
          <Wrench className="h-4 w-4" />
          Send to Maintenance
        </Button>
      );
    }

    // Default mode - show all available actions based on status
    return (
      <div className="space-y-3">
        {item.status === 'available' && (
          <Button 
            onClick={() => handleAction('check-out')} 
            disabled={isLoading || !selectedUserName}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Check Out
          </Button>
        )}
        {item.status === 'checked-out' && (
          <Button 
            onClick={() => handleAction('check-in')} 
            disabled={isLoading || !selectedUserName}
            className="w-full gap-2"
          >
            <LogIn className="h-4 w-4" />
            Check In
          </Button>
        )}
        {isAdmin && item.status === 'available' && (
          <Button 
            onClick={() => handleAction('maintenance')} 
            disabled={isLoading || !selectedUserName}
            variant="outline"
            className="w-full gap-2 text-maintenance hover:text-maintenance"
          >
            <Wrench className="h-4 w-4" />
            Send to Maintenance
          </Button>
        )}
        {isAdmin && item.status === 'checked-out' && (
          <Button 
            onClick={() => handleAction('maintenance')} 
            disabled={isLoading || !selectedUserName}
            variant="outline"
            className="w-full gap-2 text-maintenance hover:text-maintenance"
          >
            <Wrench className="h-4 w-4" />
            Send to Maintenance
          </Button>
        )}
      </div>
    );
  };

  const getModeTitle = () => {
    switch (scanMode) {
      case 'check-in': return 'Check In Item';
      case 'check-out': return 'Check Out Item';
      case 'maintenance': return 'Send to Maintenance';
      default: return 'Scanned Item';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{getModeTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="p-4 bg-secondary/50 rounded-lg">
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`status-pill ${statusClasses[item.status]}`}>
                {item.status === 'available' ? 'Available' : 
                 item.status === 'checked-out' ? 'Checked Out' : 'Maintenance'}
              </span>
              <span className="text-xs text-muted-foreground font-mono">{item.qrCode}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{item.location}</span>
            </div>
          </div>

          {/* User Selection - Required for actions */}
          {canCheckInOut && users.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {item.status === 'available' ? 'Check out to:' : 'Performed by:'}
              </Label>
              <UserSelect
                users={users}
                value={selectedUserId}
                onValueChange={handleUserSelect}
                placeholder="Select user"
                filterRoles={['admin', 'user', 'member']}
              />
            </div>
          )}

          {/* Optional Location Update */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                <MapPin className="h-4 w-4" />
                Update location (optional)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm">New Location</Label>
                <LocationSelect
                  locations={locations}
                  value={locationId}
                  onValueChange={setLocationId}
                  placeholder={item.location || "Select location"}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {renderActions()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
