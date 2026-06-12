import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SchoolMultiSelect } from '@/components/SchoolMultiSelect';
import type { OhioSchool } from '@/hooks/usePartnerSchools';

const ORG_TYPES = [
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'school', label: 'School / District' },
  { value: 'company', label: 'Company / Industry' },
  { value: 'other', label: 'Other' },
];

interface AddOrganizationDialogProps {
  onAdd: (input: { name: string; org_type: string; schools?: OhioSchool[] }) => Promise<boolean>;
}

export function AddOrganizationDialog({ onAdd }: AddOrganizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState('nonprofit');
  const [schools, setSchools] = useState<OhioSchool[]>([]);
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setName('');
      setOrgType('nonprofit');
      setSchools([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const ok = await onAdd({ name: name.trim(), org_type: orgType, schools });
      if (ok) handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add an Organization
          </DialogTitle>
          <DialogDescription>
            Manually add a nonprofit/organization and the schools it works with.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              placeholder="e.g. Riverside STEM Foundation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={orgType} onValueChange={setOrgType}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {ORG_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              Schools they work with{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <SchoolMultiSelect selected={schools} onChange={setSchools} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Adding…' : 'Add Organization'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
