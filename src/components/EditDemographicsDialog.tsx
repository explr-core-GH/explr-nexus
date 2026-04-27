import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ItemRequest, useItemRequests } from '@/hooks/useItemRequests';

const SPECIAL_GROUP_OPTIONS = [
  'ELL (English Language Learners)',
  'IEP / Special Education',
  '504 Plan',
  'Gifted & Talented',
  'African American / Black',
  'Hispanic / Latino',
  'Asian / Pacific Islander',
  'Native American / Indigenous',
  'Multiracial',
  'Refugee / Immigrant',
  'LGBTQ+',
  'Foster Care / Unhoused',
];

interface EditDemographicsDialogProps {
  request: ItemRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDemographicsDialog({ request, open, onOpenChange }: EditDemographicsDialogProps) {
  const { updateDemographics } = useItemRequests();
  const [freeReducedLunch, setFreeReducedLunch] = useState('');
  const [specialGroups, setSpecialGroups] = useState<string[]>([]);
  const [numberOfStudents, setNumberOfStudents] = useState('');
  const [usageHours, setUsageHours] = useState('');
  const [usageDays, setUsageDays] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (request) {
      setFreeReducedLunch(request.freeReducedLunch || '');
      setSpecialGroups(request.specialGroups || []);
      setNumberOfStudents(request.numberOfStudents?.toString() || '');
      setUsageHours(request.usageHours?.toString() || '');
      setUsageDays(request.usageDays?.toString() || '');
    }
  }, [request]);

  const toggleGroup = (group: string, checked: boolean) => {
    setSpecialGroups((prev) =>
      checked ? [...prev, group] : prev.filter((g) => g !== group)
    );
  };

  const handleSave = async () => {
    if (!request) return;
    setSaving(true);
    const success = await updateDemographics(request.id, {
      freeReducedLunch,
      specialGroups,
      numberOfStudents: numberOfStudents ? parseInt(numberOfStudents, 10) : (null as any),
      usageHours: usageHours ? parseFloat(usageHours) : (null as any),
      usageDays: usageDays ? parseFloat(usageDays) : (null as any),
    });
    setSaving(false);
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Edit Student Data
          </DialogTitle>
          <DialogDescription>
            Backfill or update demographic information for "{request?.itemName}" requested by {request?.requesterName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Free / Reduced Lunch Status</Label>
            <RadioGroup value={freeReducedLunch} onValueChange={setFreeReducedLunch}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="majority" id="frl-majority" />
                <Label htmlFor="frl-majority" className="font-normal cursor-pointer">Majority qualify</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="some" id="frl-some" />
                <Label htmlFor="frl-some" className="font-normal cursor-pointer">Some qualify</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="frl-none" />
                <Label htmlFor="frl-none" className="font-normal cursor-pointer">None qualify</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unknown" id="frl-unknown" />
                <Label htmlFor="frl-unknown" className="font-normal cursor-pointer">Unknown</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="num-students">Students</Label>
              <Input
                id="num-students"
                type="number"
                min={0}
                value={numberOfStudents}
                onChange={(e) => setNumberOfStudents(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usage-hours">Hours</Label>
              <Input
                id="usage-hours"
                type="number"
                min={0}
                step="0.5"
                value={usageHours}
                onChange={(e) => setUsageHours(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usage-days">Days</Label>
              <Input
                id="usage-days"
                type="number"
                min={0}
                step="0.5"
                value={usageDays}
                onChange={(e) => setUsageDays(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Special / Minority Groups</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg max-h-64 overflow-y-auto">
              {SPECIAL_GROUP_OPTIONS.map((group) => (
                <div key={group} className="flex items-start space-x-2">
                  <Checkbox
                    id={`edit-grp-${group}`}
                    checked={specialGroups.includes(group)}
                    onCheckedChange={(c) => toggleGroup(group, !!c)}
                  />
                  <Label htmlFor={`edit-grp-${group}`} className="font-normal cursor-pointer text-sm leading-tight">
                    {group}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Student Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
