import type { TeacherAssignment } from '@/hooks/useTeacherAssignments';
import type { DemographicCounts } from '@/lib/schoolDemographics';

export type Mode = 'potential' | 'actual';

export const RACE_LABELS: Record<string, string> = {
  white: 'White',
  black: 'Black',
  hispanic: 'Hispanic/Latino',
  asian: 'Asian',
  american_indian: 'American Indian',
  pacific_islander: 'Pacific Islander',
  multiracial: 'Multiracial',
};

export const GENDER_LABELS: Record<string, string> = {
  boys: 'Boys',
  girls: 'Girls',
  other: 'Other / NS',
};

const ZERO: DemographicCounts = {
  base: 0,
  economically_disadvantaged: null,
  students_with_disabilities: null,
  english_learners: null,
  gifted: null,
  race_ethnicity: {},
};

/** Per-assignment counts for a mode. Actual = entered headcounts only (blank not counted). */
export function countsFor(a: TeacherAssignment, mode: Mode): DemographicCounts {
  const snap = a.demographics_snapshot;
  if (!snap) return ZERO;
  if (mode === 'actual') return snap.actual ?? { ...ZERO, base: a.students_served ?? 0 };
  return snap.potential ?? ZERO;
}

/** The served headcount for an assignment (only what was actually entered). */
export function effectiveServed(a: TeacherAssignment): number | null {
  return a.students_served ?? null;
}

export interface Aggregate {
  students: number;
  econ: number;
  disabilities: number;
  englishLearners: number;
  gifted: number;
  race: Record<string, number>;
  gender: Record<string, number>;
}

/** Sum a list of assignments into grant totals for a given mode. */
export function aggregate(assignments: TeacherAssignment[], mode: Mode): Aggregate {
  const out: Aggregate = {
    students: 0,
    econ: 0,
    disabilities: 0,
    englishLearners: 0,
    gifted: 0,
    race: {},
    gender: {},
  };
  for (const a of assignments) {
    const c = countsFor(a, mode);
    out.students += c.base;
    out.econ += c.economically_disadvantaged ?? 0;
    out.disabilities += c.students_with_disabilities ?? 0;
    out.englishLearners += c.english_learners ?? 0;
    out.gifted += c.gifted ?? 0;
    for (const [k, v] of Object.entries(c.race_ethnicity ?? {})) out.race[k] = (out.race[k] ?? 0) + v;
    for (const [k, v] of Object.entries(c.gender ?? {})) out.gender[k] = (out.gender[k] ?? 0) + v;
  }
  return out;
}
