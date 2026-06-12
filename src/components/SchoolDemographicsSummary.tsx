import { Users, Utensils, Accessibility, Languages, Sparkles } from 'lucide-react';
import type { OhioSchool } from '@/hooks/usePartnerSchools';
import type { RaceEthnicityEntry } from '@/lib/schoolDemographics';

const RACE_LABELS: Record<string, string> = {
  white: 'White',
  black: 'Black',
  hispanic: 'Hispanic/Latino',
  asian: 'Asian',
  american_indian: 'American Indian',
  pacific_islander: 'Pacific Islander',
  multiracial: 'Multiracial',
};

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `${Math.round(v)}%`;

interface Props {
  school: OhioSchool;
}

/** Whole-school demographic snapshot read straight from the Ohio Report Card row. */
export function SchoolDemographicsSummary({ school }: Props) {
  const race = (school.race_ethnicity ?? {}) as unknown as Record<string, RaceEthnicityEntry>;
  const total = school.total_enrollment;

  const rows = [
    { icon: Utensils, label: 'Economically disadvantaged', value: pct(school.pct_economically_disadvantaged) },
    { icon: Accessibility, label: 'Students with disabilities', value: pct(school.pct_students_with_disabilities) },
    { icon: Languages, label: 'English learners', value: pct(school.pct_english_learners) },
    { icon: Sparkles, label: 'Gifted', value: pct(school.pct_gifted) },
  ];

  const raceEntries = Object.entries(race)
    .map(([key, e]) => {
      let p = e?.pct ?? null;
      if (p === null && e?.count != null && total && total > 0) p = (e.count / total) * 100;
      return { key, label: RACE_LABELS[key] ?? key, pct: p };
    })
    .filter((r) => r.pct !== null)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          Total enrollment: <strong className="text-foreground">{total?.toLocaleString() ?? '—'}</strong>
          {school.school_year ? ` · ${school.school_year}` : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 bg-muted/40 rounded-md px-2 py-1.5">
            <r.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{r.label}</p>
              <p className="font-semibold">{r.value}</p>
            </div>
          </div>
        ))}
      </div>

      {raceEntries.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Race / ethnicity</p>
          <div className="flex flex-wrap gap-1.5">
            {raceEntries.map((r) => (
              <span
                key={r.key}
                className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5"
              >
                {r.label} {pct(r.pct)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
