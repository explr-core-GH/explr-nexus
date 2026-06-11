/**
 * Ohio School Report Card importer — JSON building-file edition (PREFERRED).
 *
 * Reads the per-building JSON files produced by the Ohio Report Card Explorer pipeline
 * (data/buildings/<IRN>.json) and upserts one demographics row per school into
 * `ohio_schools`. This is more reliable than parsing the raw ODE spreadsheets — the JSON
 * is already cleaned and keyed by IRN. See import-ohio-report-card.ts for the raw-Excel path.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL="https://<ref>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
 *   npx tsx scripts/import-ohio-buildings.ts --dir ".\data\buildings" --year 2024-2025 [--dry-run] [--limit 25]
 *
 * Small demographic cells are redacted by the state as "<10". For per-grade enrollment we
 * estimate those as 5 (midpoint of 1-9) so grade-band reach isn't zeroed out; redacted
 * race/special-population COUNTS are stored as null (percent kept when the state provides it).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { ORDERED_GRADES } from '../src/lib/grades';

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const DIR = String(args.dir || '');
const SCHOOL_YEAR = String(args.year || '2024-2025');
const DRY_RUN = !!args['dry-run'];
const LIMIT = args.limit ? parseInt(String(args.limit), 10) : Infinity;
const REDACTED_GRADE_ESTIMATE = 5;

if (!DIR) {
  console.error('Missing --dir <path to data/buildings>. See header for usage.');
  process.exit(1);
}

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
function parseGradeSpan(span: string | undefined | null): Set<string> {
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

function buildRecord(b: any) {
  // Grades the school actually serves (per gradeSpan). Redacted "<10" cells outside this
  // span are really 0 (not served) and must be omitted, not estimated.
  const served = parseGradeSpan(b.gradeSpan);

  const byGrade: Record<string, number> = {};
  let redactedGrades = 0;
  for (const [label, token] of Object.entries(GRADE_KEY_MAP)) {
    const raw = b.enrollmentByGrade?.[label];
    if (raw === undefined || raw === null) continue;
    if (isRedacted(raw)) {
      // estimate only if the school serves this grade
      if (served.has(token)) { byGrade[token] = REDACTED_GRADE_ESTIMATE; redactedGrades++; }
    } else {
      const n = asNum(raw);
      if (n !== null && (served.has(token) || n > 0)) byGrade[token] = n;
    }
  }

  // grade range: prefer the served span, fall back to grades with data
  const servedOrdered = ORDERED_GRADES.filter((g) => served.has(g));
  const present = ORDERED_GRADES.filter((g) => g in byGrade);
  const low_grade = servedOrdered[0] ?? present[0] ?? null;
  const high_grade = servedOrdered[servedOrdered.length - 1] ?? present[present.length - 1] ?? null;

  // race/ethnicity counts + pct
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
      school_year: SCHOOL_YEAR,
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

async function main() {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
  console.log(`Found ${files.length} building files in ${DIR}`);

  const records: any[] = [];
  let totalRedacted = 0;
  let skipped = 0;
  for (const f of files) {
    try {
      const b = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
      if (!b?.irn) { skipped++; continue; }
      const { record, redactedGrades } = buildRecord(b);
      totalRedacted += redactedGrades;
      records.push(record);
    } catch (e) {
      skipped++;
      console.warn(`  skip ${f}: ${(e as Error).message}`);
    }
  }

  console.log(`Parsed ${records.length} schools (${skipped} skipped, ${totalRedacted} redacted grade cells estimated).`);
  const withEcon = records.filter((r) => r.pct_economically_disadvantaged !== null).length;
  const withGrades = records.filter((r) => Object.keys(r.enrollment_by_grade).length > 0).length;
  console.log(`  with econ-disadvantaged %: ${withEcon}/${records.length}`);
  console.log(`  with grade enrollment:     ${withGrades}/${records.length}`);
  console.log('Sample record:\n', JSON.stringify(records[0], null, 2));

  if (DRY_RUN) {
    console.log('\n--dry-run: not writing to Supabase.');
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to write.');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const toWrite = records.slice(0, LIMIT);
  const batchSize = 500;
  let written = 0;
  for (let i = 0; i < toWrite.length; i += batchSize) {
    const batch = toWrite.slice(i, i + batchSize);
    const { error } = await supabase.from('ohio_schools').upsert(batch, { onConflict: 'irn' });
    if (error) {
      console.error(`Batch ${i / batchSize} failed:`, error.message);
      process.exit(1);
    }
    written += batch.length;
    console.log(`  upserted ${written}/${toWrite.length}`);
  }
  console.log(`Done. ${written} schools upserted into ohio_schools.`);
}

main();
