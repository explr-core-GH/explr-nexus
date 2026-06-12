import { useMemo, useState } from 'react';
import { CalendarRange, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TeacherAssignment } from '@/hooks/useTeacherAssignments';
import { schoolYearOptions } from '@/lib/schoolYears';

interface ChangeYearDialogProps {
  assignments: TeacherAssignment[];
  onReassign: (fromYear: string, toYear: string) => Promise<number>;
}

export function ChangeYearDialog({ assignments, onReassign }: ChangeYearDialogProps) {
  const [open, setOpen] = useState(false);
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [saving, setSaving] = useState(false);

  // Raw distinct years actually in the data (includes malformed like "2025" so they can be fixed).
  const fromOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assignments) {
      if (!a.school_year) continue;
      counts.set(a.school_year, (counts.get(a.school_year) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [assignments]);

  const toOptions = useMemo(
    () => schoolYearOptions(assignments.map((a) => a.school_year)),
    [assignments]
  );

  const count = fromYear ? fromOptions.find(([y]) => y === fromYear)?.[1] ?? 0 : 0;
  const canApply = fromYear && toYear && fromYear !== toYear;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFromYear('');
      setToYear('');
    }
  };

  const handleApply = async () => {
    if (!canApply) return;
    setSaving(true);
    try {
      await onReassign(fromYear, toYear);
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarRange className="h-4 w-4" />
          Change year
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Move assignments to another year
          </DialogTitle>
          <DialogDescription>
            Re-tag every assignment from one school year to another in one step.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label>From</Label>
            <Select value={fromYear} onValueChange={setFromYear}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="current year" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {fromOptions.length === 0 ? (
                  <div className="py-2 px-3 text-sm text-muted-foreground">No assignments yet</div>
                ) : (
                  fromOptions.map(([y, n]) => (
                    <SelectItem key={y} value={y}>
                      {y} ({n})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground mb-2.5 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Label>To</Label>
            <Select value={toYear} onValueChange={setToYear}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="new year" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {toOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {canApply && (
          <p className="text-sm text-muted-foreground">
            Moves <strong>{count}</strong> assignment{count !== 1 ? 's' : ''} from{' '}
            <strong>{fromYear}</strong> to <strong>{toYear}</strong>.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!canApply || saving}>
            {saving ? 'Moving…' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
