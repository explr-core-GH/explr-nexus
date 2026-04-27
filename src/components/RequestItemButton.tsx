import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { PreferredDatesPicker, DateTimePicker } from '@/components/DateTimePicker';
import { useItemRequests } from '@/hooks/useItemRequests';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { InventoryItem } from '@/types/inventory';

interface RequestItemButtonProps {
  item: InventoryItem;
}

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

export function RequestItemButton({ item }: RequestItemButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [preferredDates, setPreferredDates] = useState<Date[]>([]);
  const [returnDueDate, setReturnDueDate] = useState<Date | undefined>(undefined);
  const [freeReducedLunch, setFreeReducedLunch] = useState<string>('');
  const [specialGroups, setSpecialGroups] = useState<string[]>([]);
  const [numberOfStudents, setNumberOfStudents] = useState<string>('');
  const [usageHours, setUsageHours] = useState<string>('');
  const [usageDays, setUsageDays] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { createRequest } = useItemRequests();
  const { profile } = useAuth();
  const { toast } = useToast();

  const toggleGroup = (group: string, checked: boolean) => {
    setSpecialGroups((prev) =>
      checked ? [...prev, group] : prev.filter((g) => g !== group)
    );
  };

  const resetForm = () => {
    setMessage('');
    setPreferredDates([]);
    setReturnDueDate(undefined);
    setFreeReducedLunch('');
    setSpecialGroups([]);
    setNumberOfStudents('');
    setUsageHours('');
    setUsageDays('');
  };

  const handleSubmit = async () => {
    if (!profile) return;

    if (!freeReducedLunch) {
      toast({
        title: 'Missing information',
        description: 'Please indicate free or reduced lunch status.',
        variant: 'destructive',
      });
      return;
    }

    const numStudents = parseInt(numberOfStudents, 10);
    const numHours = parseFloat(usageHours);
    const numDays = parseFloat(usageDays);

    if (!Number.isFinite(numStudents) || numStudents <= 0) {
      toast({
        title: 'Missing information',
        description: 'Please enter the number of students.',
        variant: 'destructive',
      });
      return;
    }

    if (!Number.isFinite(numHours) || numHours <= 0) {
      toast({
        title: 'Missing information',
        description: 'Please enter the number of hours of use.',
        variant: 'destructive',
      });
      return;
    }

    if (!Number.isFinite(numDays) || numDays <= 0) {
      toast({
        title: 'Missing information',
        description: 'Please enter the number of days of use.',
        variant: 'destructive',
      });
      return;
    }

    if (!returnDueDate) {
      toast({
        title: 'Missing information',
        description: 'Please pick a return due date.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const success = await createRequest(
      item.id,
      item.name,
      profile.full_name,
      profile.email || null,
      profile.organization_name || null,
      message,
      preferredDates.length > 0 ? preferredDates : undefined,
      {
        freeReducedLunch,
        specialGroups,
        numberOfStudents: numStudents,
        usageHours: numHours,
        usageDays: numDays,
      },
      returnDueDate
    );

    if (success) {
      resetForm();
      setOpen(false);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Send className="h-4 w-4" />
          Request Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>

          <div className="space-y-2">
            <Label>Preferred Pickup Dates & Times</Label>
            <PreferredDatesPicker
              dates={preferredDates}
              onChange={setPreferredDates}
              maxDates={3}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Return Due Date <span className="text-destructive">*</span>
            </Label>
            <DateTimePicker
              value={returnDueDate}
              onChange={setReturnDueDate}
              placeholder="Select when you'll return the item"
            />
            <p className="text-xs text-muted-foreground">
              We'll send you an email reminder one day before this date.
            </p>
          </div>

          <div className="space-y-3 p-3 border rounded-lg bg-card">
            <h4 className="text-sm font-semibold">Student Information</h4>

            <div className="space-y-2">
              <Label>
                Are these students free or reduced lunch?{' '}
                <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={freeReducedLunch}
                onValueChange={setFreeReducedLunch}
                className="grid grid-cols-2 gap-2"
              >
                {[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                  { value: 'mixed', label: 'Mixed' },
                  { value: 'unknown', label: 'Unknown' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-secondary/50"
                  >
                    <RadioGroupItem value={opt.value} id={`frl-${opt.value}`} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Minority or special groups served (check all that apply)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                {SPECIAL_GROUP_OPTIONS.map((group) => (
                  <label
                    key={group}
                    className="flex items-start gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={specialGroups.includes(group)}
                      onCheckedChange={(checked) => toggleGroup(group, !!checked)}
                      className="mt-0.5"
                    />
                    <span>{group}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="num-students">
                  # of students <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="num-students"
                  type="number"
                  min={1}
                  step={1}
                  value={numberOfStudents}
                  onChange={(e) => setNumberOfStudents(e.target.value)}
                  placeholder="e.g. 25"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usage-hours">
                  Hours of use <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="usage-hours"
                  type="number"
                  min={0}
                  step="0.5"
                  value={usageHours}
                  onChange={(e) => setUsageHours(e.target.value)}
                  placeholder="e.g. 4"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usage-days">
                  Days of use <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="usage-days"
                  type="number"
                  min={0}
                  step="0.5"
                  value={usageDays}
                  onChange={(e) => setUsageDays(e.target.value)}
                  placeholder="e.g. 3"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add any details about your request..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Your request will be sent to an administrator for review.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
            <Send className="h-4 w-4" />
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
