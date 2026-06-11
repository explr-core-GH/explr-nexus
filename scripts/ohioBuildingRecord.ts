/**
 * Shared mapping from an Ohio Report Card building JSON (data/buildings/<IRN>.json)
 * to an `ohio_schools` row. Used by both the live importer (import-ohio-buildings.ts)
 * and the SQL seed generator (generate-ohio-seed.ts) so the logic never diverges.
 */
import { ORDERED_GRADES } from '../src/lib/grades';

export const REDACTED_GRADE_ESTIMATE = 5;

// Verbose enrollmentByGrade label -> ordered grade token.
const GRADE_KEY_MAP: Record<string, string> = {
  'Pre-School Enrollment': 'PK',
  'Kindergarten Enrollment': 'KG',
  'First Grade Enrollment': '01',
  'Second Grade Enrollment': '02',
  'Third Grade Enrollment': '03',
  'Fourth Grade Enrollment': '04',
  'Fifth Grade Enrollment': '05',
  'Sixth Grade Enrollment': '06',
  'Seventh Grade Enrollment': '07',
  'Eighth Grade Enrollment': '08',
  'Ninth Grade Enrollment': '09',
  'Tenth Grade Enrollment': '10',
  'Eleventh Grade Enrollment': '11',
  'Twelfth Grade Enrollment': '12',
};

// State race-group label -> our race_ethnicity key.
const RACE_KEY_MAP: Record<string, string> = {
  'WHITE, NON-HISPANIC': 'white',
  'BLACK, NON-HISPANIC': 'black',
  HISPANIC: 'hispanic',
  ASIAN: 'asian',
  'AMERICAN INDIAN OR ALASKAN NATIVE': 'american_indian',
  'NATIVE HAWAIIAN OR OTHER PACIFIC ISLANDER': 'pacific_islander',
  'PACIFIC ISLANDER': 'pacific_islander',
  MULTIRACIAL: 'multiracial',
};

const isRedacted = (v: unknown) => typeof v === 'string' && v.trim().startsWith('<');
const asNum = (v: unknown): number | null => {
  if (v === null || v === undefined || isRedacted(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

type DemoRow = { group: string; enrollment: unknown; pctOfTotal: number | null };

function pctForGroup(rows: DemoRow[] | undefined, groupName: string): number | null {
  const row = rows?.find((r) => r.group === groupName);
  return row ? asNum(row.pctOfTotal) : null;
}

/** Map a single gradeSpan token (P, K, 1..12) to an ordered grade token. */
function spanTokenToGrade(tok: string): string | null {
  const t = tok.trim().toUpperCase();
  if (t === 'P') return 'PK';
  if (t === 'K') return 'KG';
  if (/^\d{1,2}$/.test(t)) {
    const n = parseInt(t, 10);
    if (n >= 1 && n <= 12) return String(n).padStart(2, '0');
  }
  return null; // UNG, SN, PS, H, D, etc. — not a standard grade
}

/** Parse a gradeSpan like "K-5,P" or "9-12,SN" into the set of served grade tokens. */
export function parseGradeSpan(span: string | undefined | null): Set<string> {
  const served = new Set<string>();
  if (!span) return served;
  for (const part of String(span).split(',')) {
    const seg = part.trim();
    if (seg.includes('-')) {
      const [a, b] = seg.split('-');
      const lo = spanTokenToGrade(a);
      const hi = spanTokenToGrade(b);
      if (lo && hi) {
        const i = ORDERED_GRADES.indexOf(lo as (typeof ORDERED_GRADES)[number]);
        const j = ORDERED_GRADES.indexOf(hi as (typeof ORDERED_GRADES)[number]);
        if (i !== -1 && j !== -1 && i <= j) {
          for (const g of ORDERED_GRADES.slice(i, j + 1)) served.add(g);
        }
      }
    } else {
      const g = spanTokenToGrade(seg);
      if (g) served.add(g);
    }
  }
  return served;
}

export interface OhioRecord {
  irn: string;
  building_name: string;
  district_name: string | null;
  district_irn: string | null;
  county: string | null;
  city: string | null;
  address: string | null;
  low_grade: string | null;
  high_grade: string | null;
  school_year: string;
  total_enrollment: number | null;
  enrollment_by_grade: Record<string, number>;
  pct_economically_disadvantaged: number | null;
  pct_students_with_disabilities: number | null;
  pct_english_learners: number | null;
  pct_gifted: number | null;
  race_ethnicity: Record<string, { count: number | null; pct: number | null }>;
}

export function buildOhioRecord(
  b: any,
  schoolYear: string
): { record: OhioRecord; redactedGrades: number } {
  // Grades the school actually serves (per gradeSpan). Redacted "<10" cells outside this
  // span are really 0 (not served) and must be omitted, not estimated.
  const served = parseGradeSpan(b.gradeSpan);

  const byGrade: Record<string, number> = {};
  let redactedGrades = 0;
  for (const [label, token] of Object.entries(GRADE_KEY_MAP)) {
    const raw = b.enrollmentByGrade?.[label];
    if (raw === undefined || raw === null) continue;
    if (isRedacted(raw)) {
      if (served.has(token)) { byGrade[token] = REDACTED_GRADE_ESTIMATE; redactedGrades++; }
    } else {
      const n = asNum(raw);
      if (n !== null && (served.has(token) || n > 0)) byGrade[token] = n;
    }
  }

  const servedOrdered = ORDERED_GRADES.filter((g) => served.has(g));
  const present = ORDERED_GRADES.filter((g) => g in byGrade);
  const low_grade = servedOrdered[0] ?? present[0] ?? null;
  const high_grade = servedOrdered[servedOrdered.length - 1] ?? present[present.length - 1] ?? null;

  const race: Record<string, { count: number | null; pct: number | null }> = {};
  for (const r of (b.demographics?.race ?? []) as DemoRow[]) {
    const key = RACE_KEY_MAP[r.group];
    if (!key) continue;
    race[key] = { count: asNum(r.enrollment), pct: asNum(r.pctOfTotal) };
  }

  const fullAddress = [b.address, b.city, b.zip ? `OH ${b.zip}` : 'OH']
    .filter(Boolean)
    .join(', ');

  return {
    record: {
      irn: String(b.irn),
      building_name: b.name ?? '',
      district_name: b.districtName ?? null,
      district_irn: b.districtIrn ? String(b.districtIrn) : null,
      county: b.county ?? null,
      city: b.city ?? null,
      address: fullAddress || null,
      low_grade,
      high_grade,
      school_year: schoolYear,
      total_enrollment: asNum(b.enrollment),
      enrollment_by_grade: byGrade,
      pct_economically_disadvantaged: pctForGroup(b.demographics?.econ, 'ECONDISADV'),
      pct_students_with_disabilities: pctForGroup(b.demographics?.disabled, 'DISABLED'),
      pct_english_learners: pctForGroup(b.demographics?.el, 'ENGLEARN'),
      pct_gifted: pctForGroup(b.demographics?.gifted, 'GIFTED'),
      race_ethnicity: race,
    },
    redactedGrades,
  };
}
