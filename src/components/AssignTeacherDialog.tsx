import { useMemo, useState } from 'react';
import { GraduationCap, Plus, Users } from 'lucide-react';
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
import { UserSelect } from '@/components/UserSelect';
import { useSelectableUsers } from '@/hooks/useSelectableUsers';
import type { PartnerSchool } from '@/hooks/usePartnerSchools';
import type { NewAssignment } from '@/hooks/useTeacherAssignments';
import { ORDERED_GRADES, GRADE_LABELS, gradesInBand } from '@/lib/grades';
import { buildSnapshot } from '@/lib/schoolDemographics';

interface AssignTeacherDialogProps {
  schools: PartnerSchool[];
  onAssign: (input: NewAssignment) => Promise<unknown>;
}

export function AssignTeacherDialog({ schools, onAssign }: AssignTeacherDialogProps) {
  const { users } = useSelectableUsers();
  const [open, setOpen] = useState(false);

  const [teacherUserId, setTeacherUserId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [gradeLow, setGradeLow] = useState('06');
  const [gradeHigh, setGradeHigh] = useState('08');
  const [subject, setSubject] = useState('');
  const [studentsServed, setStudentsServed] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedSchool = schools.find((s) => s.id === schoolId) || null;
  const teacherProfileId = users.find((u) => u.user_id === teacherUserId)?.id || '';

  const bandValid = gradesInBand(gradeLow, gradeHigh).length > 0;
  const servedNum = studentsServed.trim() ? parseInt(studentsServed, 10) : null;

  const preview = useMemo(() => {
    if (!selectedSchool?.ohio_schools || !bandValid) return null;
    return buildSnapshot(selectedSchool.ohio_schools, gradeLow, gradeHigh, servedNum);
  }, [selectedSchool, gradeLow, gradeHigh, servedNum, bandValid]);

  const reset = () => {
    setTeacherUserId('');
    setSchoolId('');
    setGradeLow('06');
    setGradeHigh('08');
    setSubject('');
    setStudentsServed('');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const canSubmit = teacherProfileId && schoolId && bandValid;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedSchool) return;
    setSaving(true);
    try {
      const snapshot = selectedSchool.ohio_schools
        ? buildSnapshot(selectedSchool.ohio_schools, gradeLow, gradeHigh, servedNum)
        : buildSnapshotEmpty(gradeLow, gradeHigh, servedNum);

      await onAssign({
        teacher_id: teacherProfileId,
        school_id: schoolId,
        grade_low: gradeLow,
        grade_high: gradeHigh,
        subject: subject.trim() || null,
        students_served: servedNum,
        school_year: selectedSchool.ohio_schools?.school_year ?? null,
        demographics_snapshot: snapshot,
      });
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <GraduationCap className="h-4 w-4" />
          Assign Teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Assign Teacher to a School
          </DialogTitle>
          <DialogDescription>
            Pick the grade band you serve — demographics are pulled from the school's Ohio Report
            Card and frozen on this assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label>Teacher</Label>
            <UserSelect
              users={users}
              value={teacherUserId}
              onValueChange={(userId) => setTeacherUserId(userId)}
              placeholder="Select a teacher"
            />
          </div>

          <div className="space-y-2">
            <Label>School</Label>
            <Select value={schoolId} onValueChange={setSchoolId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a partner school" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {schools.length === 0 ? (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    Add a school first
                  </div>
                ) : (
                  schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {!s.ohio_schools ? ' (no Ohio data)' : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From grade</Label>
              <Select value={gradeLow} onValueChange={setGradeLow}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {ORDERED_GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GRADE_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To grade</Label>
              <Select value={gradeHigh} onValueChange={setGradeHigh}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {ORDERED_GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GRADE_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!bandValid && (
            <p className="text-xs text-destructive">"From" grade must be at or below "To" grade.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject (optional)</Label>
              <Input
                id="subject"
                placeholder="e.g. Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="served">Students served (optional)</Label>
              <Input
                id="served"
                type="number"
                min={0}
                placeholder="actual headcount"
                value={studentsServed}
                onChange={(e) => setStudentsServed(e.target.value)}
              />
            </div>
          </div>

          {/* Live preview */}
          {selectedSchool && !selectedSchool.ohio_schools && (
            <p className="text-xs text-muted-foreground">
              This school has no Ohio Report Card data, so only the headcount you enter will be
              recorded (no demographic estimate).
            </p>
          )}
          {preview && (
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4" />
                Estimated demographics · grades {GRADE_LABELS[gradeLow as keyof typeof GRADE_LABELS]}–
                {GRADE_LABELS[gradeHigh as keyof typeof GRADE_LABELS]}
              </div>
              <p>
                Potential reach (full band enrollment):{' '}
                <strong>{preview.potential_reach.toLocaleString()}</strong> students
              </p>
              {servedNum != null && (
                <p>
                  Actual served (your headcount): <strong>{servedNum.toLocaleString()}</strong>{' '}
                  students
                </p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                <span>
                  Econ. disadvantaged:{' '}
                  <strong className="text-foreground">
                    {fmt(preview.potential.economically_disadvantaged)}
                  </strong>
                </span>
                <span>
                  Disabilities:{' '}
                  <strong className="text-foreground">
                    {fmt(preview.potential.students_with_disabilities)}
                  </strong>
                </span>
                <span>
                  English learners:{' '}
                  <strong className="text-foreground">
                    {fmt(preview.potential.english_learners)}
                  </strong>
                </span>
                <span>
                  Gifted:{' '}
                  <strong className="text-foreground">{fmt(preview.potential.gifted)}</strong>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Estimate: building-level rates applied to grade-band enrollment.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? 'Assigning…' : 'Assign Teacher'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const fmt = (v: number | null) => (v === null ? '—' : v.toLocaleString());

/** Snapshot for schools with no Ohio data: records reach/headcount, no demographic estimates. */
function buildSnapshotEmpty(low: string, high: string, served: number | null): NewAssignment['demographics_snapshot'] {
  const emptyCounts = {
    base: 0,
    economically_disadvantaged: null,
    students_with_disabilities: null,
    english_learners: null,
    gifted: null,
    race_ethnicity: {},
  };
  return {
    school_irn: null,
    school_year: null,
    grade_low: low,
    grade_high: high,
    potential_reach: 0,
    actual_served: served,
    potential: emptyCounts,
    actual: served != null ? { ...emptyCounts, base: served } : null,
    estimated: true,
  };
}
