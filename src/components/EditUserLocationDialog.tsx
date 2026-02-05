import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

interface EditUserLocationDialogProps {
  userName: string;
  userId: string;
  currentAddress: string | null;
  onSave: (userId: string, userName: string, address: string, latitude: number | null, longitude: number | null) => Promise<boolean>;
}

export function EditUserLocationDialog({
  userName,
  userId,
  currentAddress,
  onSave,
}: EditUserLocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState(currentAddress || '');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setAddress(currentAddress || '');
      setLatitude(undefined);
      setLongitude(undefined);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(
      userId,
      userName,
      address,
      latitude ?? null,
      longitude ?? null
    );
    setIsSaving(false);
    if (success) {
      setOpen(false);
    }
  };

  const isValid = address.trim().length > 0 && latitude !== undefined && longitude !== undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Edit Location">
          <MapPin className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
          <DialogDescription>
            Update the organization address for {userName}. This location will appear on the map when they have checked-out items.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <AddressAutocomplete
            value={address}
            onChange={(newAddress, lat, lng) => {
              setAddress(newAddress);
              setLatitude(lat);
              setLongitude(lng);
            }}
            placeholder="Search for an address..."
          />
          {currentAddress && (
            <p className="text-xs text-muted-foreground mt-2">
              Current: {currentAddress}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? 'Saving...' : 'Save Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
