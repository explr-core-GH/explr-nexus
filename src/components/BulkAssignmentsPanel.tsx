import { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Save, Loader2, Table2, Tags as TagsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PROGRAM_TYPES } from '@/constants/programs';
import { TagsCheckboxGroup } from '@/components/TagsCheckboxGroup';
import { BulkSchoolCell } from '@/components/BulkSchoolCell';
import { TeacherCSVImportDialog } from '@/components/TeacherCSVImportDialog';
import type { DraftRow, OhioSchool } from '@/lib/csvAssignments';
import { matchOhioSchoolByText } from '@/lib/ohioMatch';
import type { SelectableTeacher, Teacher } from '@/hooks/useTeachers';
import type { NewAssignment } from '@/hooks/useTeacherAssignments';
import type { PartnerSchool } from '@/hooks/usePartnerSchools';
import { ORDERED_GRADES, GRADE_LABELS, gradesInBand } from '@/lib/grades';
import { buildSnapshot } from '@/lib/schoolDemographics';
import { currentAcademicYear, schoolYearOptions } from '@/lib/schoolYears';

interface BulkAssignmentsPanelProps {
  teacherOptions: SelectableTeacher[];
  onAddTeacher: (input: { full_name: string; email?: string | null }) => Promise<Teacher | null>;
  onResolveTeacherId: (sel: SelectableTeacher) => Promise<string | null>;
  onResolveSchool: (ohio: OhioSchool) => Promise<PartnerSchool | null>;
  onAssign: (input: NewAssignment) => Promise<unknown>;
}

type Mode = 'teacher' | 'program';

const rowValid = (r: DraftRow, mode: Mode) =>
  (mode === 'program' || r.teacherName.trim() !== '') &&
  r.selectedSchool != null &&
  gradesInBand(r.gradeLow, r.gradeHigh).length > 0;

export function BulkAssignmentsPanel({
  teacherOptions,
  onAddTeacher,
  onResolveTeacherId,
  onResolveSchool,
  onAssign,
}: BulkAssignmentsPanelProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>('teacher');
  const [programType, setProgramType] = useState<string>('Camp');
  const [programName, setProgramName] = useState('');
  const idSeq = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const yearOptions = useMemo(
    () => schoolYearOptions(rows.map((r) => r.schoolYear)),
    [rows]
  );
  const readyCount = rows.filter((r) => rowValid(r, mode)).length;
  const programReady = mode === 'teacher' || programName.trim() !== '';

  const update = (id: string, patch: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: `manual-${idSeq.current++}`,
        teacherName: '',
        teacherEmail: '',
        schoolText: '',
        selectedSchool: null,
        gradeLow: '06',
        gradeHigh: '08',
        studentsServed: '',
        schoolYear: currentAcademicYear(),
        subjectTags: [],
      },
    ]);

  const handleImport = async (imported: DraftRow[]) => {
    setRows((prev) => [...prev, ...imported]);
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Auto-match schools from the CSV text against the Ohio dataset.
    for (const r of imported) {
      if (!r.schoolText.trim() || r.selectedSchool) continue;
      const match = await matchOhioSchoolByText(r.schoolText);
      if (match) update(r.id, { selectedSchool: match });
    }
  };

  const resolveRowTeacher = async (row: DraftRow): Promise<string | null> => {
    const email = row.teacherEmail.trim().toLowerCase();
    const name = row.teacherName.trim().toLowerCase();
    const match = teacherOptions.find(
      (t) => (email && t.email && t.email.toLowerCase() === email) || t.full_name.toLowerCase() === name
    );
    if (match) return onResolveTeacherId(match);
    const t = await onAddTeacher({ full_name: row.teacherName.trim(), email: row.teacherEmail.trim() || null });
    return t?.id ?? null;
  };

  const saveAll = async () => {
    if (mode === 'program' && !programName.trim()) {
      toast({ title: 'Name the program', description: 'Enter a program name first', variant: 'destructive' });
      return;
    }
    const valid = rows.filter((r) => rowValid(r, mode));
    if (valid.length === 0) {
      toast({ title: 'Nothing to save', description: 'Fix the highlighted rows first', variant: 'destructive' });
      return;
    }
    setSaving(true);
    let saved = 0;
    let failed = 0;
    const savedIds: string[] = [];
    try {
      for (const row of valid) {
        let teacherId: string | null = null;
        if (mode === 'teacher') {
          teacherId = await resolveRowTeacher(row);
          if (!teacherId) {
            failed++;
            continue;
          }
        }
        if (!row.selectedSchool) {
          failed++;
          continue;
        }
        const school = await onResolveSchool(row.selectedSchool);
        if (!school) {
          failed++;
          continue;
        }
        const served = row.studentsServed.trim() ? parseInt(row.studentsServed, 10) : null;
        const res = await onAssign({
          teacher_id: teacherId,
          school_id: school.id,
          grade_low: row.gradeLow,
          grade_high: row.gradeHigh,
          subject: row.subjectTags.length ? row.subjectTags.join(', ') : null,
          students_served: served,
          school_year: row.schoolYear,
          program_name: mode === 'program' ? programName.trim() : null,
          program_type: mode === 'program' ? programType.toLowerCase() : null,
          demographics_snapshot: buildSnapshot(row.selectedSchool, row.gradeLow, row.gradeHigh, served),
        });
        if (res) {
          saved++;
          savedIds.push(row.id);
        } else failed++;
      }
    } finally {
      setSaving(false);
    }
    setRows((prev) => prev.filter((r) => !savedIds.includes(r.id)));
    const notReady = rows.length - valid.length;
    toast({
      title: `Saved ${saved} assignment${saved !== 1 ? 's' : ''}`,
      description:
        [failed ? `${failed} failed` : '', notReady ? `${notReady} still need attention` : '']
          .filter(Boolean)
          .join(' · ') || 'All set',
    });
  };

  const gridCols =
    mode === 'teacher'
      ? 'grid-cols-[140px_150px_200px_84px_84px_80px_120px_90px_36px]'
      : 'grid-cols-[200px_84px_84px_80px_120px_90px_36px]';
  const gridMin = mode === 'teacher' ? 'min-w-[920px]' : 'min-w-[640px]';

  return (
    <div ref={panelRef} className="bg-card border rounded-xl p-4 space-y-4 scroll-mt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Table2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Bulk import &amp; edit</h3>
          {rows.length > 0 && (
            <Badge variant="secondary">
              {readyCount}/{rows.length} ready
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <TeacherCSVImportDialog onImport={handleImport} mode={mode} />
          <Button variant="outline" className="gap-2" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
          <Button
            className="gap-2"
            onClick={saveAll}
            disabled={saving || readyCount === 0 || !programReady}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save {readyCount > 0 ? readyCount : ''}
          </Button>
        </div>
      </div>

      {/* Mode toggle + program details */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => setMode('teacher')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              mode === 'teacher' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Teachers
          </button>
          <button
            type="button"
            onClick={() => setMode('program')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              mode === 'program' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Program (camp / internship / pilot)
          </button>
        </div>

        {mode === 'program' && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={programType} onValueChange={setProgramType}>
                <SelectTrigger className="h-9 w-[140px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {PROGRAM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Program name</Label>
              <Input
                value={programName}
                placeholder="e.g. STEM Summer Camp 2025"
                onChange={(e) => setProgramName(e.target.value)}
                className="h-9 w-[240px]"
              />
            </div>
          </>
        )}
      </div>

      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
          Review and edit below — <strong>nothing is uploaded until you click Save</strong>. Rows with
          an unmatched school (red) or invalid grades are skipped until fixed.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Import a CSV or add a row to bulk-create teacher assignments. Unmatched schools and invalid
          grades are highlighted; only ready rows are saved.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className={`${gridMin} space-y-2`}>
            {/* header */}
            <div className={`grid ${gridCols} gap-2 text-xs text-muted-foreground px-1`}>
              {mode === 'teacher' && (
                <>
                  <span>Teacher</span>
                  <span>Email</span>
                </>
              )}
              <span>School</span>
              <span>From</span>
              <span>To</span>
              <span>Students</span>
              <span>Year</span>
              <span>Tags</span>
              <span />
            </div>

            {rows.map((r) => {
              const valid = rowValid(r, mode);
              return (
                <div
                  key={r.id}
                  className={`grid ${gridCols} gap-2 items-center rounded-lg p-1 ${
                    valid ? '' : 'bg-destructive/5'
                  }`}
                >
                  {mode === 'teacher' && (
                    <>
                      <Input
                        value={r.teacherName}
                        placeholder="Name"
                        onChange={(e) => update(r.id, { teacherName: e.target.value })}
                        className="h-9"
                      />
                      <Input
                        value={r.teacherEmail}
                        placeholder="email"
                        onChange={(e) => update(r.id, { teacherEmail: e.target.value })}
                        className="h-9"
                      />
                    </>
                  )}
                  <BulkSchoolCell
                    schoolText={r.schoolText}
                    selectedSchool={r.selectedSchool}
                    onChange={(patch) => update(r.id, patch)}
                  />
                  <Select value={r.gradeLow} onValueChange={(v) => update(r.id, { gradeLow: v })}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {ORDERED_GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {GRADE_LABELS[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={r.gradeHigh} onValueChange={(v) => update(r.id, { gradeHigh: v })}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {ORDERED_GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {GRADE_LABELS[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={r.studentsServed}
                    placeholder="reach"
                    onChange={(e) => update(r.id, { studentsServed: e.target.value })}
                    className="h-9"
                  />
                  <Select value={r.schoolYear} onValueChange={(v) => update(r.id, { schoolYear: v })}>
                    <SelectTrigger className="h-9 bg-background">
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1 font-normal">
                        <TagsIcon className="h-3.5 w-3.5" />
                        {r.subjectTags.length || ''}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="end">
                      <p className="text-xs text-muted-foreground mb-2">Program tags</p>
                      <TagsCheckboxGroup
                        selectedTags={r.subjectTags}
                        onTagsChange={(tags) => update(r.id, { subjectTags: tags })}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => removeRow(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
