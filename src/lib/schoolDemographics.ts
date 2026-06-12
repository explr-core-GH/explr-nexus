import { gradesInBand } from '@/lib/grades';
import type { OhioSchool } from '@/hooks/usePartnerSchools';

/**
 * Grade-band demographic math for grant reporting.
 *
 * Ohio publishes demographics at the BUILDING level, not per grade. So a grade-band
 * slice (e.g. 6-8) takes the band's enrollment count and applies the school's overall
 * percentages to it. This is the standard, defensible grant estimate; the resulting
 * snapshot is marked `estimated: true` and labeled as such in reports.
 */

export interface RaceEthnicityEntry {
  count: number | null;
  pct: number | null;
}

export interface DemographicCounts {
  base: number; // the population these counts are derived from
  economically_disadvantaged: number | null;
  students_with_disabilities: number | null;
  english_learners: number | null;
  gifted: number | null;
  race_ethnicity: Record<string, number>;
}

export interface DemographicsSnapshot {
  school_irn: string | null;
  school_year: string | null;
  grade_low: string;
  grade_high: string;
  potential_reach: number;
  actual_served: number | null;
  potential: DemographicCounts;
  actual: DemographicCounts | null;
  estimated: true;
}

const pctOf = (pct: number | null | undefined, base: number): number | null =>
  pct === null || pct === undefined ? null : Math.round((pct / 100) * base);

/** Sum of enrollment across the grade band (the "potential reach"). */
export function computeBandReach(school: OhioSchool, low: string, high: string): number {
  const byGrade = (school.enrollment_by_grade ?? {}) as Record<string, number>;
  return gradesInBand(low, high).reduce((sum, g) => sum + (Number(byGrade[g]) || 0), 0);
}

/** Apply the school's building-level percentages to an arbitrary base population. */
export function applyDemographics(school: OhioSchool, base: number): DemographicCounts {
  const total = school.total_enrollment ?? 0;
  const race = (school.race_ethnicity ?? {}) as unknown as Record<string, RaceEthnicityEntry>;

  const raceCounts: Record<string, number> = {};
  for (const [group, entry] of Object.entries(race)) {
    let pct = entry?.pct ?? null;
    if (pct === null && entry?.count != null && total > 0) {
      pct = (entry.count / total) * 100;
    }
    if (pct !== null) raceCounts[group] = Math.round((pct / 100) * base);
  }

  return {
    base,
    economically_disadvantaged: pctOf(school.pct_economically_disadvantaged, base),
    students_with_disabilities: pctOf(school.pct_students_with_disabilities, base),
    english_learners: pctOf(school.pct_english_learners, base),
    gifted: pctOf(school.pct_gifted, base),
    race_ethnicity: raceCounts,
  };
}

const ZERO_COUNTS = (base: number): DemographicCounts => ({
  base,
  economically_disadvantaged: null,
  students_with_disabilities: null,
  english_learners: null,
  gifted: null,
  race_ethnicity: {},
});

/** Snapshot for a school with no Ohio data: records reach/headcount, no demographic estimates. */
export function emptySnapshot(
  low: string,
  high: string,
  studentsServed: number | null
): DemographicsSnapshot {
  return {
    school_irn: null,
    school_year: null,
    grade_low: low,
    grade_high: high,
    potential_reach: 0,
    actual_served: studentsServed,
    potential: ZERO_COUNTS(0),
    actual: studentsServed != null ? ZERO_COUNTS(studentsServed) : null,
    estimated: true,
  };
}

/** Build the frozen snapshot stored on a teacher_school_assignment at assign time. */
export function buildSnapshot(
  school: OhioSchool,
  low: string,
  high: string,
  studentsServed: number | null
): DemographicsSnapshot {
  const potentialReach = computeBandReach(school, low, high);
  return {
    school_irn: school.irn,
    school_year: school.school_year,
    grade_low: low,
    grade_high: high,
    potential_reach: potentialReach,
    actual_served: studentsServed,
    potential: applyDemographics(school, potentialReach),
    actual:
      studentsServed != null ? applyDemographics(school, studentsServed) : null,
    estimated: true,
  };
}
