// Ohio Report Card grade tokens, ordered from youngest to oldest.
// Enrollment-by-grade JSON in `ohio_schools` is keyed by these tokens.
export const ORDERED_GRADES = [
  'PK', 'KG', '01', '02', '03', '04', '05',
  '06', '07', '08', '09', '10', '11', '12',
] as const;

export type GradeToken = (typeof ORDERED_GRADES)[number];

export const GRADE_LABELS: Record<GradeToken, string> = {
  PK: 'Pre-K',
  KG: 'Kindergarten',
  '01': '1st',
  '02': '2nd',
  '03': '3rd',
  '04': '4th',
  '05': '5th',
  '06': '6th',
  '07': '7th',
  '08': '8th',
  '09': '9th',
  '10': '10th',
  '11': '11th',
  '12': '12th',
};

/** Inclusive list of grade tokens between `low` and `high` (e.g. 06..08). */
export function gradesInBand(low: string, high: string): GradeToken[] {
  const lo = ORDERED_GRADES.indexOf(low as GradeToken);
  const hi = ORDERED_GRADES.indexOf(high as GradeToken);
  if (lo === -1 || hi === -1 || lo > hi) return [];
  return ORDERED_GRADES.slice(lo, hi + 1) as GradeToken[];
}
