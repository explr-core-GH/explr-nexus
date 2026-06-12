import { useMemo, useState } from 'react';
import {
  Download,
  Users,
  Utensils,
  Accessibility,
  Languages,
  Sparkles,
  TrendingUp,
  Trash2,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { OhioSchool, PartnerSchool } from '@/hooks/usePartnerSchools';
import type { TeacherAssignment, NewAssignment } from '@/hooks/useTeacherAssignments';
import type { DemographicCounts } from '@/lib/schoolDemographics';
import { GRADE_LABELS } from '@/lib/grades';
import { schoolYearOptions } from '@/lib/schoolYears';
import { EditAssignmentDialog } from '@/components/EditAssignmentDialog';
import { ChangeYearDialog } from '@/components/ChangeYearDialog';

const RACE_LABELS: Record<string, string> = {
  white: 'White',
  black: 'Black',
  hispanic: 'Hispanic/Latino',
  asian: 'Asian',
  american_indian: 'American Indian',
  pacific_islander: 'Pacific Islander',
  multiracial: 'Multiracial',
};

type Mode = 'potential' | 'actual';

const ZERO: DemographicCounts = {
  base: 0,
  economically_disadvantaged: null,
  students_with_disabilities: null,
  english_learners: null,
  gifted: null,
  race_ethnicity: {},
};

function countsFor(a: TeacherAssignment, mode: Mode): DemographicCounts {
  const snap = a.demographics_snapshot;
  if (!snap) return ZERO;
  if (mode === 'actual') {
    // No headcount entered → actual served defaults to the full potential reach.
    if (a.students_served == null) return snap.potential ?? ZERO;
    return snap.actual ?? { ...ZERO, base: a.students_served };
  }
  return snap.potential ?? ZERO;
}

/** The served headcount for an assignment, defaulting to potential reach when blank. */
function effectiveServed(a: TeacherAssignment): number | null {
  if (a.students_served != null) return a.students_served;
  return a.demographics_snapshot?.potential_reach ?? null;
}

const gradeLabel = (g: string) => GRADE_LABELS[g as keyof typeof GRADE_LABELS] ?? g;

interface Props {
  schools: PartnerSchool[];
  assignments: TeacherAssignment[];
  onDeleteAssignment: (id: string) => Promise<boolean>;
  onUpdateAssignment: (id: string, input: Omit<NewAssignment, 'teacher_id'>) => Promise<unknown>;
  onResolveSchool: (ohio: OhioSchool) => Promise<PartnerSchool | null>;
  onReassignYear: (fromYear: string, toYear: string) => Promise<number>;
}

export function GrantImpactDashboard({
  assignments,
  onDeleteAssignment,
  onUpdateAssignment,
  onResolveSchool,
  onReassignYear,
}: Props) {
  const [mode, setMode] = useState<Mode>('potential');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const years = useMemo(
    () => schoolYearOptions(assignments.map((a) => a.school_year)),
    [assignments]
  );
  const filteredAssignments = useMemo(
    () => (yearFilter === 'all' ? assignments : assignments.filter((a) => a.school_year === yearFilter)),
    [assignments, yearFilter]
  );

  const data = useMemo(() => {
    let students = 0;
    let econ = 0;
    let disab = 0;
    let el = 0;
    let gifted = 0;
    const race = new Map<string, number>();

    for (const a of filteredAssignments) {
      const c = countsFor(a, mode);
      students += c.base;
      econ += c.economically_disadvantaged ?? 0;
      disab += c.students_with_disabilities ?? 0;
      el += c.english_learners ?? 0;
      gifted += c.gifted ?? 0;
      for (const [k, v] of Object.entries(c.race_ethnicity ?? {})) {
        race.set(k, (race.get(k) ?? 0) + v);
      }
    }

    const sortedRace = [...race.entries()].sort((a, b) => b[1] - a[1]);
    return { students, econ, disab, el, gifted, sortedRace };
  }, [filteredAssignments, mode]);

  const stats = [
    {
      label: mode === 'potential' ? 'Students Reached' : 'Students Served',
      value: data.students.toLocaleString(),
      icon: Users,
      hint: `${filteredAssignments.length} assignment${filteredAssignments.length !== 1 ? 's' : ''}${yearFilter !== 'all' ? ` · ${yearFilter}` : ''}`,
    },
    {
      label: 'Economically Disadvantaged',
      value: data.econ.toLocaleString(),
      icon: Utensils,
      hint: pctHint(data.econ, data.students),
    },
    {
      label: 'Students w/ Disabilities',
      value: data.disab.toLocaleString(),
      icon: Accessibility,
      hint: pctHint(data.disab, data.students),
    },
    {
      label: 'English Learners',
      value: data.el.toLocaleString(),
      icon: Languages,
      hint: pctHint(data.el, data.students),
    },
  ];

  const exportCsv = () => {
    const raceKeys = Object.keys(RACE_LABELS);
    const header = [
      'Teacher',
      'School',
      'IRN',
      'Grades',
      'Subject',
      'Potential Reach',
      'Actual Served',
      'Basis',
      'Econ Disadvantaged',
      'Students w/ Disabilities',
      'English Learners',
      'Gifted',
      ...raceKeys.map((k) => RACE_LABELS[k]),
      'School Year',
    ];
    const escape = (v: string | number | null | undefined) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = filteredAssignments.map((a) => {
      const c = countsFor(a, mode);
      return [
        a.teachers?.full_name ?? '',
        a.partner_schools?.name ?? '',
        a.partner_schools?.ohio_irn ?? '',
        `${gradeLabel(a.grade_low)}-${gradeLabel(a.grade_high)}`,
        a.subject ?? '',
        a.demographics_snapshot?.potential_reach ?? '',
        effectiveServed(a) ?? '',
        mode,
        c.economically_disadvantaged ?? '',
        c.students_with_disabilities ?? '',
        c.english_learners ?? '',
        c.gifted ?? '',
        ...raceKeys.map((k) => c.race_ethnicity?.[k] ?? ''),
        a.demographics_snapshot?.school_year ?? '',
      ]
        .map(escape)
        .join(',');
    });
    const csv = [header.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grant-impact-${mode}-${yearFilter === 'all' ? 'all-years' : yearFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (assignments.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground border rounded-xl bg-card">
        <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>Assign a teacher to a school to see grant impact metrics here.</p>
      </div>
    );
  }

  const maxRace = data.sortedRace[0]?.[1] || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10">
            <TrendingUp className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Grant Impact (Schools)</h3>
            <p className="text-sm text-muted-foreground">
              Demographics from the Ohio School Report Card, by teacher × school × grade band.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* School year filter */}
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="bg-background w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ChangeYearDialog assignments={assignments} onReassign={onReassignYear} />

          {/* Potential / Actual toggle */}
          <div className="inline-flex rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setMode('potential')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === 'potential' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Potential reach
            </button>
            <button
              type="button"
              onClick={() => setMode('actual')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === 'actual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Actual served
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {mode === 'actual' && (
        <p className="text-xs text-muted-foreground -mt-2">
          "Actual served" uses the headcount entered per assignment; assignments without a headcount
          fall back to their full potential reach.
        </p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <s.icon className="h-4 w-4" />
              {s.label}
            </div>
            <p className="text-2xl font-bold mt-2">{s.value}</p>
            {s.hint && <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>}
          </div>
        ))}
      </div>

      {/* Race/ethnicity breakdown */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-semibold">Students by Race / Ethnicity</h4>
        </div>
        {data.sortedRace.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No race/ethnicity data (schools may lack Ohio Report Card data).
          </p>
        ) : (
          <div className="space-y-2">
            {data.sortedRace.map(([key, count]) => {
              const pct = Math.round((count / maxRace) * 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm gap-2">
                    <span className="truncate">{RACE_LABELS[key] ?? key}</span>
                    <span className="font-medium whitespace-nowrap">
                      {count.toLocaleString()} students
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Estimated — building-level rates applied to grade-band enrollment.
        </p>
      </div>

      {/* Assignments table */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Teacher</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Grades</TableHead>
              <TableHead className="hidden sm:table-cell">Reach</TableHead>
              <TableHead className="hidden sm:table-cell">Served</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No assignments for {yearFilter}.
                </TableCell>
              </TableRow>
            ) : (
              filteredAssignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.teachers?.full_name ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {a.partner_schools?.name ?? '—'}
                  {a.subject ? <span className="text-xs"> · {a.subject}</span> : ''}
                  {a.school_year ? <span className="text-xs"> · {a.school_year}</span> : ''}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {gradeLabel(a.grade_low)}–{gradeLabel(a.grade_high)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {a.demographics_snapshot?.potential_reach?.toLocaleString() ?? '—'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {effectiveServed(a)?.toLocaleString() ?? '—'}
                  {a.students_served == null && a.demographics_snapshot?.potential_reach
                    ? <span className="text-xs text-muted-foreground"> (reach)</span>
                    : ''}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <EditAssignmentDialog
                      assignment={a}
                      onResolveSchool={onResolveSchool}
                      onUpdate={onUpdateAssignment}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => onDeleteAssignment(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function pctHint(part: number, total: number): string {
  if (total <= 0) return '—';
  return `${Math.round((part / total) * 100)}% of students`;
}
