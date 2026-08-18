import { useState } from 'react';
import { ShoppingCart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PreferredDatesPicker, DateTimePicker } from '@/components/DateTimePicker';
import { SPECIAL_GROUP_OPTIONS } from '@/components/RequestItemButton';
import { useItemRequests } from '@/hooks/useItemRequests';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ProjectRequestLine {
  itemId: string;
  itemName: string;
  quantity: number;
}

interface RequestProjectDialogProps {
  project: { id: string; name: string };
  lines: ProjectRequestLine[];
  disabled?: boolean;
  /** The kit isn't fully available — request becomes a waitlist join. */
  waitlist?: boolean;
  /** Short reason shown to the teacher, e.g. "Currently checked out". */
  unavailableReason?: string;
  onRequested?: () => void;
}

export function RequestProjectDialog({ project, lines, disabled, waitlist = false, unavailableReason, onRequested }: RequestProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [preferredDates, setPreferredDates] = useState<Date[]>([]);
  const [returnDueDate, setReturnDueDate] = useState<Date | undefined>(undefined);
  const [freeReducedLunch, setFreeReducedLunch] = useState('');
  const [specialGroups, setSpecialGroups] = useState<string[]>([]);
  const [numberOfStudents, setNumberOfStudents] = useState('');
  const [usageHours, setUsageHours] = useState('');
  const [usageDays, setUsageDays] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createProjectRequest } = useItemRequests();
  const { profile } = useAuth();
  const { toast } = useToast();

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

    const numStudents = parseInt(numberOfStudents, 10);
    const numHours = parseFloat(usageHours);
    const numDays = parseFloat(usageDays);

    const problem =
      !freeReducedLunch
        ? 'Please indicate free or reduced lunch status.'
        : !Number.isFinite(numStudents) || numStudents <= 0
        ? 'Please enter the number of students.'
        : !Number.isFinite(numHours) || numHours <= 0
        ? 'Please enter the number of hours of use.'
        : !Number.isFinite(numDays) || numDays <= 0
        ? 'Please enter the number of days of use.'
        : !returnDueDate
        ? 'Please pick a return due date.'
        : null;

    if (problem) {
      toast({ title: 'Missing information', description: problem, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const success = await createProjectRequest(
      project,
      lines,
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
      returnDueDate,
      waitlist
    );
    setIsLoading(false);

    if (success) {
      resetForm();
      setOpen(false);
      onRequested?.();
    }
  };

  const totalUnits = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full gap-2"
          variant={waitlist ? 'outline' : 'default'}
          disabled={disabled}
        >
          {waitlist ? <Clock className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          {waitlist ? 'Join the waitlist' : 'Request this project'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {waitlist ? `Join the waitlist for "${project.name}"` : `Request "${project.name}"`}
          </DialogTitle>
          <DialogDescription>
            {waitlist
              ? `This kit isn't available right now${unavailableReason ? ` (${unavailableReason.toLowerCase()})` : ''}. Join the waitlist and we'll notify you when it frees up. Nothing is held until then.`
              : `All ${totalUnits} unit${totalUnits === 1 ? '' : 's'} for this project are added in one request and held for you while an admin confirms a pickup date.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
            {lines.map(line => (
              <div key={line.itemId} className="flex justify-between text-sm">
                <span>{line.itemName}</span>
                <span className="text-muted-foreground">×{line.quantity}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Preferred Pickup Dates &amp; Times</Label>
            <PreferredDatesPicker dates={preferredDates} onChange={setPreferredDates} maxDates={3} />
          </div>

          <div className="space-y-2">
            <Label>
              Return Due Date <span className="text-destructive">*</span>
            </Label>
            <DateTimePicker
              value={returnDueDate}
              onChange={setReturnDueDate}
              placeholder="Select when you'll return the materials"
            />
          </div>

          <div className="space-y-3 p-3 border rounded-lg bg-card">
            <h4 className="text-sm font-semibold">Student Information</h4>

            <div className="space-y-2">
              <Label>
                Are these students free or reduced lunch? <span className="text-destructive">*</span>
              </Label>
              <RadioGroup value={freeReducedLunch} onValueChange={setFreeReducedLunch} className="grid grid-cols-2 gap-2">
                {[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                  { value: 'mixed', label: 'Mixed' },
                  { value: 'unknown', label: 'Unknown' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-secondary/50"
                  >
                    <RadioGroupItem value={opt.value} id={`project-frl-${opt.value}`} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Minority or special groups served</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {SPECIAL_GROUP_OPTIONS.map(group => (
                  <label key={group} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={specialGroups.includes(group)}
                      onCheckedChange={checked =>
                        setSpecialGroups(prev => (checked ? [...prev, group] : prev.filter(g => g !== group)))
                      }
                    />
                    <span>{group}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  Students <span className="text-destructive">*</span>
                </Label>
                <Input type="number" min={1} value={numberOfStudents} onChange={e => setNumberOfStudents(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Hours <span className="text-destructive">*</span>
                </Label>
                <Input type="number" min={0} step="0.5" value={usageHours} onChange={e => setUsageHours(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Days <span className="text-destructive">*</span>
                </Label>
                <Input type="number" min={0} step="0.5" value={usageDays} onChange={e => setUsageDays(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message (optional)</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Anything the team should know?" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Sending...' : waitlist ? 'Join waitlist' : 'Submit request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
