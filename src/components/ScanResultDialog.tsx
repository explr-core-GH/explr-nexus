import { useState } from 'react';
import { CheckCircle, XCircle, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InventoryItem } from '@/types/inventory';

interface ScanResultDialogProps {
  item: InventoryItem | null;
  notFound: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckIn: (itemId: string, userName: string) => boolean;
  onCheckOut: (itemId: string, userName: string) => boolean;
}

export function ScanResultDialog({
  item,
  notFound,
  open,
  onOpenChange,
  onCheckIn,
  onCheckOut,
}: ScanResultDialogProps) {
  const [userName, setUserName] = useState('');
  const [actionComplete, setActionComplete] = useState(false);
  const [lastAction, setLastAction] = useState<'check-in' | 'check-out' | null>(null);

  const handleAction = () => {
    if (!item || !userName.trim()) return;
    
    let success = false;
    if (item.status === 'available') {
      success = onCheckOut(item.id, userName.trim());
      setLastAction('check-out');
    } else if (item.status === 'checked-out') {
      success = onCheckIn(item.id, userName.trim());
      setLastAction('check-in');
    }
    
    if (success) {
      setActionComplete(true);
    }
  };

  const handleClose = () => {
    setUserName('');
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
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-sm">
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-available/10 flex items-center justify-center mb-4 glow-available">
              <CheckCircle className="h-8 w-8 text-available" />
            </div>
            <DialogTitle className="text-xl mb-2">
              {lastAction === 'check-out' ? 'Checked Out!' : 'Checked In!'}
            </DialogTitle>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{item.name}</span>
              {lastAction === 'check-out' 
                ? ` has been checked out to ${userName}`
                : ` has been checked in by ${userName}`}
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Scanned Item</DialogTitle>
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
          </div>

          {item.status === 'maintenance' ? (
            <div className="flex items-center gap-3 p-4 bg-maintenance/10 rounded-lg text-maintenance">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-medium">This item is under maintenance</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="scanUserName">
                {item.status === 'available' ? 'Your name (checking out):' : 'Your name (checking in):'}
              </Label>
              <Input
                id="scanUserName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
              />
              <Button onClick={handleAction} disabled={!userName.trim()} className="w-full gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                {item.status === 'available' ? 'Check Out' : 'Check In'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
