import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { PROGRAM_TYPES } from '@/constants/programs';
import { ORDERED_GRADES, GRADE_LABELS, gradesInBand } from '@/lib/grades';
import { currentAcademicYear, schoolYearOptions } from '@/lib/schoolYears';
import { manualSnapshot } from '@/lib/schoolDemographics';
import type { NewAssignment, TeacherAssignment } from '@/hooks/useTeacherAssignments';

const RACE_GROUPS: { key: string; label: string }[] = [
  { key: 'black', label: 'Black' },
  { key: 'hispanic', label: 'Hispanic/Latino' },
  { key: 'asian', label: 'Asian' },
  { key: 'white', label: 'White' },
  { key: 'multiracial', label: 'Two or More' },
  { key: 'american_indian', label: 'American Indian' },
  { key: 'pacific_islander', label: 'Pacific Islander' },
];
const GENDER_GROUPS: { key: string; label: string }[] = [
  { key: 'boys', label: 'Boys' },
  { key: 'girls', label: 'Girls' },
  { key: 'other', label: 'Other / NS' },
];

interface ProgramDemographicsDialogProps {
  assignment?: TeacherAssignment; // present = edit mode
  trigger?: React.ReactNode;
  onCreate?: (input: NewAssignment) => Promise<unknown>;
  onUpdate: (id: string, input: Omit<NewAssignment, 'teacher_id'>) => Promise<unknown>;
}

const numOrNull = (s: string): number | null => (s.trim() ? parseInt(s, 10) : null);

function CountInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      type="number"
      min={0}
      value={value}
      placeholder={placeholder ?? '0'}
      onChange={(e) => onChange(e.target.value)}
      className="h-9"
    />
  );
}

export function ProgramDemographicsDialog({
  assignment,
  trigger,
  onCreate,
  onUpdate,
}: ProgramDemographicsDialogProps) {
  const isEdit = !!assignment;
  const snap = assignment?.demographics_snapshot?.actual ?? assignment?.demographics_snapshot?.potential;

  const init = (v: number | null | undefined) => (v != null ? String(v) : '');
  const initGroup = (m: Record<string, number> | undefined, key: string) =>
    m && m[key] != null ? String(m[key]) : '';

  const [open, setOpen] = useState(false);
  const [programType, setProgramType] = useState(
    assignment?.program_type
      ? assignment.program_type.charAt(0).toUpperCase() + assignment.program_type.slice(1)
      : 'Camp'
  );
  const [programName, setProgramName] = useState(assignment?.program_name ?? '');
  const [schoolYear, setSchoolYear] = useState(assignment?.school_year ?? currentAcademicYear());
  const [gradeLow, setGradeLow] = useState(assignment?.grade_low ?? '05');
  const [gradeHigh, setGradeHigh] = useState(assignment?.grade_high ?? '08');
  const [total, setTotal] = useState(init(assignment?.students_served ?? null));
  const [econ, setEcon] = useState(init(snap?.economically_disadvantaged));
  const [disab, setDisab] = useState(init(snap?.students_with_disabilities));
  const [el, setEl] = useState(init(snap?.english_learners));
  const [gifted, setGifted] = useState(init(snap?.gifted));
  const [race, setRace] = useState<Record<string, string>>(
    Object.fromEntries(RACE_GROUPS.map((g) => [g.key, initGroup(snap?.race_ethnicity, g.key)]))
  );
  const [gender, setGender] = useState<Record<string, string>>(
    Object.fromEntries(GENDER_GROUPS.map((g) => [g.key, initGroup(snap?.gender, g.key)]))
  );
  const [saving, setSaving] = useState(false);

  const yearOptions = schoolYearOptions([assignment?.school_year]);
  const bandValid = gradesInBand(gradeLow, gradeHigh).length > 0;
  const canSave = programName.trim() !== '' && total.trim() !== '' && bandValid;

  const reset = () => {
    if (isEdit) return; // edit keeps the assignment's values on reopen
    setProgramType('Camp');
    setProgramName('');
    setSchoolYear(currentAcademicYear());
    setGradeLow('05');
    setGradeHigh('08');
    setTotal('');
    setEcon('');
    setDisab('');
    setEl('');
    setGifted('');
    setRace(Object.fromEntries(RACE_GROUPS.map((g) => [g.key, ''])));
    setGender(Object.fromEntries(GENDER_GROUPS.map((g) => [g.key, ''])));
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const buildCountsMap = (src: Record<string, string>) => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(src)) {
      const n = numOrNull(v);
      if (n != null) out[k] = n;
    }
    return out;
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const snapshot = manualSnapshot({
        total: parseInt(total, 10),
        schoolYear,
        gradeLow,
        gradeHigh,
        counts: {
          economically_disadvantaged: numOrNull(econ),
          students_with_disabilities: numOrNull(disab),
          english_learners: numOrNull(el),
          gifted: numOrNull(gifted),
          race_ethnicity: buildCountsMap(race),
          gender: buildCountsMap(gender),
        },
      });
      const common = {
        school_id: null,
        grade_low: gradeLow,
        grade_high: gradeHigh,
        subject: null,
        students_served: parseInt(total, 10),
        school_year: schoolYear,
        program_name: programName.trim(),
        program_type: programType.toLowerCase(),
        demographics_snapshot: snapshot,
      };
      if (isEdit && assignment) {
        await onUpdate(assignment.id, common);
      } else {
        await onCreate?.({ teacher_id: null, ...common });
      }
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Record Program Demographics
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {isEdit ? 'Edit Program Demographics' : 'Record Program Demographics'}
          </DialogTitle>
          <DialogDescription>
            Enter a program's <strong>actual</strong> counts (e.g. from registration). These are used
            directly in grant reporting instead of Ohio estimates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={programType} onValueChange={setProgramType}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {PROGRAM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>School year</Label>
              <Select value={schoolYear} onValueChange={setSchoolYear}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Program name</Label>
            <Input
              value={programName}
              placeholder="e.g. EXPLR Summer Camps 2026"
              onChange={(e) => setProgramName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>From grade</Label>
              <Select value={gradeLow} onValueChange={setGradeLow}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {ORDERED_GRADES.map((g) => <SelectItem key={g} value={g}>{GRADE_LABELS[g]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To grade</Label>
              <Select value={gradeHigh} onValueChange={setGradeHigh}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {ORDERED_GRADES.map((g) => <SelectItem key={g} value={g}>{GRADE_LABELS[g]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total students *</Label>
              <CountInput value={total} onChange={setTotal} placeholder="e.g. 226" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Special populations</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Econ. disadv.', value: econ, set: setEcon },
                { label: 'Disabilities', value: disab, set: setDisab },
                { label: 'English learners', value: el, set: setEl },
                { label: 'Gifted', value: gifted, set: setGifted },
              ].map((f) => (
                <div key={f.label} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <CountInput value={f.value} onChange={f.set} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Race / ethnicity</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RACE_GROUPS.map((g) => (
                <div key={g.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{g.label}</Label>
                  <CountInput value={race[g.key]} onChange={(v) => setRace((p) => ({ ...p, [g.key]: v }))} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Gender</Label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_GROUPS.map((g) => (
                <div key={g.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{g.label}</Label>
                  <CountInput value={gender[g.key]} onChange={(v) => setGender((p) => ({ ...p, [g.key]: v }))} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Program'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
