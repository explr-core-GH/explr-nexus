import { useMemo, useState } from 'react';
import { GraduationCap, Plus, Users, Search, Check, UserPlus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOhioSchools } from '@/hooks/useOhioSchools';
import type { OhioSchool, PartnerSchool } from '@/hooks/usePartnerSchools';
import type { Teacher, SelectableTeacher } from '@/hooks/useTeachers';
import type { NewAssignment } from '@/hooks/useTeacherAssignments';
import { ORDERED_GRADES, GRADE_LABELS, gradesInBand } from '@/lib/grades';
import { buildSnapshot } from '@/lib/schoolDemographics';
import { TagsCheckboxGroup } from '@/components/TagsCheckboxGroup';

interface AssignTeacherDialogProps {
  teacherOptions: SelectableTeacher[];
  onAddTeacher: (input: { full_name: string; email?: string | null }) => Promise<Teacher | null>;
  onResolveTeacherId: (sel: SelectableTeacher) => Promise<string | null>;
  onResolveSchool: (ohio: OhioSchool) => Promise<PartnerSchool | null>;
  onAssign: (input: NewAssignment) => Promise<unknown>;
}

const fmt = (v: number | null) => (v === null ? '—' : v.toLocaleString());

export function AssignTeacherDialog({
  teacherOptions,
  onAddTeacher,
  onResolveTeacherId,
  onResolveSchool,
  onAssign,
}: AssignTeacherDialogProps) {
  const [open, setOpen] = useState(false);

  const [teacherKey, setTeacherKey] = useState('');
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');

  const [schoolQuery, setSchoolQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<OhioSchool | null>(null);
  const { results, isLoading: searching } = useOhioSchools(schoolQuery);

  const [gradeLow, setGradeLow] = useState('06');
  const [gradeHigh, setGradeHigh] = useState('08');
  const [subjectTags, setSubjectTags] = useState<string[]>([]);
  const [studentsServed, setStudentsServed] = useState('');
  const [saving, setSaving] = useState(false);

  const bandValid = gradesInBand(gradeLow, gradeHigh).length > 0;
  const servedNum = studentsServed.trim() ? parseInt(studentsServed, 10) : null;

  const preview = useMemo(() => {
    if (!selectedSchool || !bandValid) return null;
    return buildSnapshot(selectedSchool, gradeLow, gradeHigh, servedNum);
  }, [selectedSchool, gradeLow, gradeHigh, servedNum, bandValid]);

  const reset = () => {
    setTeacherKey('');
    setAddingTeacher(false);
    setNewTeacherName('');
    setNewTeacherEmail('');
    setSchoolQuery('');
    setSelectedSchool(null);
    setGradeLow('06');
    setGradeHigh('08');
    setSubjectTags([]);
    setStudentsServed('');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const pickSchool = (s: OhioSchool) => {
    setSelectedSchool(s);
    if (s.low_grade) setGradeLow(s.low_grade);
    if (s.high_grade) setGradeHigh(s.high_grade);
  };

  const handleAddTeacher = async () => {
    if (!newTeacherName.trim()) return;
    const t = await onAddTeacher({ full_name: newTeacherName.trim(), email: newTeacherEmail.trim() || null });
    if (t) {
      setTeacherKey(t.id);
      setAddingTeacher(false);
      setNewTeacherName('');
      setNewTeacherEmail('');
    }
  };

  const canSubmit = teacherKey && selectedSchool && bandValid;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedSchool) return;
    setSaving(true);
    try {
      const sel = teacherOptions.find((o) => o.key === teacherKey);
      if (!sel) {
        setSaving(false);
        return;
      }
      const teacherId = await onResolveTeacherId(sel);
      if (!teacherId) {
        setSaving(false);
        return;
      }
      const school = await onResolveSchool(selectedSchool);
      if (!school) {
        setSaving(false);
        return;
      }
      await onAssign({
        teacher_id: teacherId,
        school_id: school.id,
        grade_low: gradeLow,
        grade_high: gradeHigh,
        subject: subjectTags.length ? subjectTags.join(', ') : null,
        students_served: servedNum,
        school_year: selectedSchool.school_year,
        demographics_snapshot: buildSnapshot(selectedSchool, gradeLow, gradeHigh, servedNum),
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
            Pick a teacher and an Ohio school + grade band — demographics are pulled from the Ohio
            Report Card and frozen on this assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Teacher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Teacher</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setAddingTeacher((v) => !v)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {addingTeacher ? 'Cancel' : 'Add new teacher'}
              </Button>
            </div>
            {addingTeacher ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Full name"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                />
                <Input
                  placeholder="Email (optional)"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                />
                <Button type="button" onClick={handleAddTeacher} disabled={!newTeacherName.trim()}>
                  Add
                </Button>
              </div>
            ) : (
              <Select value={teacherKey} onValueChange={setTeacherKey}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {teacherOptions.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      No teachers yet — add one
                    </div>
                  ) : (
                    teacherOptions.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.full_name}
                        {t.email ? <span className="text-muted-foreground"> · {t.email}</span> : ''}
                        {t.isRegistered && <span className="text-muted-foreground"> · registered</span>}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* School (Ohio search) */}
          <div className="space-y-2">
            <Label>School</Label>
            {selectedSchool ? (
              <div className="border rounded-lg p-2.5 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="h-4 w-4 text-available shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{selectedSchool.building_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[selectedSchool.district_name, selectedSchool.city].filter(Boolean).join(' · ')}
                      {` · IRN ${selectedSchool.irn}`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSchool(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Search Ohio schools by name, district, or IRN"
                    value={schoolQuery}
                    onChange={(e) => setSchoolQuery(e.target.value)}
                  />
                </div>
                {schoolQuery.trim().length >= 2 && (
                  <div className="border rounded-lg max-h-44 overflow-y-auto divide-y">
                    {searching ? (
                      <p className="p-3 text-sm text-muted-foreground">Searching…</p>
                    ) : results.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">No matches.</p>
                    ) : (
                      results.map((s) => (
                        <button
                          key={s.irn}
                          type="button"
                          onClick={() => pickSchool(s)}
                          className="w-full text-left p-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{s.building_name}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              IRN {s.irn}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {[s.district_name, s.city].filter(Boolean).join(' · ')}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Grade band */}
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

          <div className="space-y-1.5">
            <Label>Subject / Program (optional)</Label>
            <TagsCheckboxGroup selectedTags={subjectTags} onTagsChange={setSubjectTags} />
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
              className="sm:max-w-[180px]"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to count the full grade-band reach as served.
            </p>
          </div>

          {/* Live preview */}
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
