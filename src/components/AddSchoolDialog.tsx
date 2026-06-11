import { useState } from 'react';
import { School, Plus, Search, Check, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { useOhioSchools } from '@/hooks/useOhioSchools';
import type { OhioSchool, PartnerSchool } from '@/hooks/usePartnerSchools';
import { SchoolDemographicsSummary } from '@/components/SchoolDemographicsSummary';

interface AddSchoolDialogProps {
  onAdd: (school: {
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    ohio_irn?: string | null;
  }) => Promise<PartnerSchool | null>;
}

export function AddSchoolDialog({ onAdd }: AddSchoolDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'ohio' | 'manual'>('ohio');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<OhioSchool | null>(null);
  const { results, isLoading } = useOhioSchools(query);

  // manual mode fields
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualLat, setManualLat] = useState<number | undefined>();
  const [manualLon, setManualLon] = useState<number | undefined>();

  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMode('ohio');
    setQuery('');
    setSelected(null);
    setManualName('');
    setManualAddress('');
    setManualLat(undefined);
    setManualLon(undefined);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const ohioAddress = (s: OhioSchool) =>
    s.address || [s.city, 'OH'].filter(Boolean).join(', ');

  const canSubmit =
    mode === 'ohio'
      ? !!selected
      : manualName.trim() && manualAddress.trim() && manualLat != null && manualLon != null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      if (mode === 'ohio' && selected) {
        await onAdd({
          name: selected.building_name,
          address: ohioAddress(selected),
          ohio_irn: selected.irn,
          // statewide rows aren't geocoded; usePartnerSchools geocodes from address
        });
      } else {
        await onAdd({
          name: manualName.trim(),
          address: manualAddress.trim(),
          latitude: manualLat,
          longitude: manualLon,
          ohio_irn: null,
        });
      }
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add School
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Add a Partner School
          </DialogTitle>
          <DialogDescription>
            Search Ohio Report Card schools to auto-fill demographics, or add a school manually.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'ohio' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('ohio')}
          >
            Ohio school search
          </Button>
          <Button
            type="button"
            variant={mode === 'manual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('manual')}
          >
            Manual (non-Ohio)
          </Button>
        </div>

        {mode === 'ohio' ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Search by school name, district, or IRN</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="e.g. Lincoln Middle School"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                />
              </div>
            </div>

            {!selected && query.trim().length >= 2 && (
              <div className="border rounded-lg max-h-56 overflow-y-auto divide-y">
                {isLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">Searching…</p>
                ) : results.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No matches. Try a different spelling, or add manually.
                  </p>
                ) : (
                  results.map((s) => (
                    <button
                      key={s.irn}
                      type="button"
                      onClick={() => setSelected(s)}
                      className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{s.building_name}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          IRN {s.irn}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[s.district_name, s.city, s.county && `${s.county} County`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}

            {selected && (
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-available" />
                      <span className="font-semibold">{selected.building_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {ohioAddress(selected)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    Change
                  </Button>
                </div>
                <SchoolDemographicsSummary school={selected} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="manual-name">School name</Label>
              <Input
                id="manual-name"
                placeholder="e.g. Riverside Academy"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <AddressAutocomplete
                value={manualAddress}
                onChange={(addr, lat, lon) => {
                  setManualAddress(addr);
                  setManualLat(lat);
                  setManualLon(lon);
                }}
                placeholder="Search for an address..."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Manual schools have no Ohio Report Card data, so demographics won't auto-fill.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? 'Adding…' : 'Add School'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
