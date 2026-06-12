import { useEffect, useMemo, useState } from 'react';
import { Pencil, Users, Search, Check } from 'lucide-react';
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
import { TagsCheckboxGroup } from '@/components/TagsCheckboxGroup';
import { supabase } from '@/integrations/supabase/client';
import { useOhioSchools } from '@/hooks/useOhioSchools';
import type { OhioSchool, PartnerSchool } from '@/hooks/usePartnerSchools';
import type { TeacherAssignment, NewAssignment } from '@/hooks/useTeacherAssignments';
import { ORDERED_GRADES, GRADE_LABELS, gradesInBand } from '@/lib/grades';
import { buildSnapshot, emptySnapshot } from '@/lib/schoolDemographics';
import { currentAcademicYear, schoolYearOptions } from '@/lib/schoolYears';

interface EditAssignmentDialogProps {
  assignment: TeacherAssignment;
  onResolveSchool: (ohio: OhioSchool) => Promise<PartnerSchool | null>;
  onUpdate: (id: string, input: Omit<NewAssignment, 'teacher_id'>) => Promise<unknown>;
}

const fmt = (v: number | null) => (v === null ? '—' : v.toLocaleString());

export function EditAssignmentDialog({ assignment, onResolveSchool, onUpdate }: EditAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const originalIrn = assignment.partner_schools?.ohio_irn ?? null;

  const [selectedSchool, setSelectedSchool] = useState<OhioSchool | null>(null);
  const [schoolQuery, setSchoolQuery] = useState('');
  const { results, isLoading: searching } = useOhioSchools(schoolQuery);

  const [schoolYear, setSchoolYear] = useState(assignment.school_year || currentAcademicYear());
  const [gradeLow, setGradeLow] = useState(assignment.grade_low);
  const [gradeHigh, setGradeHigh] = useState(assignment.grade_high);
  const yearOptions = schoolYearOptions([assignment.school_year]);
  const [subjectTags, setSubjectTags] = useState<string[]>(
    assignment.subject ? assignment.subject.split(',').map((s) => s.trim()).filter(Boolean) : []
  );
  const [studentsServed, setStudentsServed] = useState(
    assignment.students_served != null ? String(assignment.students_served) : ''
  );
  const [saving, setSaving] = useState(false);

  // Load the current school's Ohio row when opening, so grades recompute without re-searching.
  useEffect(() => {
    if (!open || !originalIrn) return;
    let cancelled = false;
    supabase
      .from('ohio_schools')
      .select('*')
      .eq('irn', originalIrn)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setSelectedSchool(data as OhioSchool);
      });
    return () => {
      cancelled = true;
    };
  }, [open, originalIrn]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // reset to the assignment's stored values
      setSelectedSchool(null);
      setSchoolQuery('');
      setSchoolYear(assignment.school_year || currentAcademicYear());
      setGradeLow(assignment.grade_low);
      setGradeHigh(assignment.grade_high);
      setSubjectTags(
        assignment.subject ? assignment.subject.split(',').map((s) => s.trim()).filter(Boolean) : []
      );
      setStudentsServed(assignment.students_served != null ? String(assignment.students_served) : '');
    }
  };

  const bandValid = gradesInBand(gradeLow, gradeHigh).length > 0;
  const servedNum = studentsServed.trim() ? parseInt(studentsServed, 10) : null;

  const preview = useMemo(() => {
    if (!selectedSchool || !bandValid) return null;
    return buildSnapshot(selectedSchool, gradeLow, gradeHigh, servedNum);
  }, [selectedSchool, gradeLow, gradeHigh, servedNum, bandValid]);

  const pickSchool = (s: OhioSchool) => {
    setSelectedSchool(s);
    setSchoolQuery('');
    if (s.low_grade) setGradeLow(s.low_grade);
    if (s.high_grade) setGradeHigh(s.high_grade);
  };

  // manual (non-Ohio) schools have no Ohio row to recompute from
  const isManualSchool = !originalIrn && !selectedSchool;
  const canSave = bandValid && (selectedSchool || isManualSchool);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let schoolId = assignment.school_id;
      // If they picked a different Ohio school, resolve it to a partner school.
      if (selectedSchool && selectedSchool.irn !== originalIrn) {
        const resolved = await onResolveSchool(selectedSchool);
        if (!resolved) {
          setSaving(false);
          return;
        }
        schoolId = resolved.id;
      }

      const snapshot = selectedSchool
        ? buildSnapshot(selectedSchool, gradeLow, gradeHigh, servedNum)
        : emptySnapshot(gradeLow, gradeHigh, servedNum);

      await onUpdate(assignment.id, {
        school_id: schoolId,
        grade_low: gradeLow,
        grade_high: gradeHigh,
        subject: subjectTags.length ? subjectTags.join(', ') : null,
        students_served: servedNum,
        school_year: schoolYear,
        program_name: assignment.program_name,
        program_type: assignment.program_type,
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
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Assignment
          </DialogTitle>
          <DialogDescription>
            Update {assignment.teachers?.full_name ?? assignment.program_name ?? 'this engagement'}'s
            school, grade band, or details. Changing the school or grades refreshes the demographic
            snapshot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* School year */}
          <div className="space-y-2">
            <Label>School year</Label>
            <Select value={schoolYear} onValueChange={setSchoolYear}>
              <SelectTrigger className="bg-background sm:max-w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* School */}
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
                      {selectedSchool.irn !== originalIrn ? ' · changed' : ''}
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
                    placeholder="Search the new school by name, district, or IRN"
                    value={schoolQuery}
                    onChange={(e) => setSchoolQuery(e.target.value)}
                  />
                </div>
                {originalIrn === null && (
                  <p className="text-xs text-muted-foreground">
                    Current school has no Ohio Report Card data; search to attach one, or just edit
                    the details below.
                  </p>
                )}
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
            <Label>Subject / Program</Label>
            <TagsCheckboxGroup selectedTags={subjectTags} onTagsChange={setSubjectTags} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-served">Students served</Label>
            <Input
              id="edit-served"
              type="number"
              min={0}
              placeholder="actual headcount"
              value={studentsServed}
              onChange={(e) => setStudentsServed(e.target.value)}
              className="sm:max-w-[180px]"
            />
            <p className="text-xs text-muted-foreground">
              Blank = not counted as "served" (only "potential reach" includes it).
            </p>
          </div>

          {preview && (
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4" />
                Updated estimate · grades {GRADE_LABELS[gradeLow as keyof typeof GRADE_LABELS]}–
                {GRADE_LABELS[gradeHigh as keyof typeof GRADE_LABELS]}
              </div>
              <p>
                Potential reach: <strong>{preview.potential_reach.toLocaleString()}</strong> students
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                <span>
                  Econ. disadvantaged:{' '}
                  <strong className="text-foreground">{fmt(preview.potential.economically_disadvantaged)}</strong>
                </span>
                <span>
                  English learners:{' '}
                  <strong className="text-foreground">{fmt(preview.potential.english_learners)}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
