import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

interface AddLocationDialogProps {
  onAdd: (location: { 
    name: string; 
    address: string; 
    latitude?: number; 
    longitude?: number;
  }) => Promise<unknown>;
}

export function AddLocationDialog({ onAdd }: AddLocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddressChange = (newAddress: string, lat?: number, lon?: number) => {
    setAddress(newAddress);
    setLatitude(lat);
    setLongitude(lon);
  };

  const isValidAddress = address.trim() && latitude !== undefined && longitude !== undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isValidAddress) return;

    setIsLoading(true);
    try {
      await onAdd({ 
        name: name.trim(), 
        address: address.trim(),
        latitude,
        longitude
      });
      setName('');
      setAddress('');
      setLatitude(undefined);
      setLongitude(undefined);
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setName('');
      setAddress('');
      setLatitude(undefined);
      setLongitude(undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Add New Location
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Location Name</Label>
            <Input
              id="name"
              placeholder="e.g., Main Warehouse"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <AddressAutocomplete
              value={address}
              onChange={handleAddressChange}
              placeholder="Search for an address..."
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !isValidAddress}>
              {isLoading ? 'Adding...' : 'Add Location'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
