/**
 * Ohio School Report Card importer.
 *
 * Loads the three annual Ohio Dept. of Education building-level files, joins them
 * by building IRN, and upserts a demographics row per school into `ohio_schools`.
 *
 * Download the files (Excel) from https://reportcard.education.ohio.gov/download :
 *   1. District & Building Overview                      -> enrollment by grade + total
 *   2. District & Building Disaggregated Race/Ethnicity  -> race/ethnicity counts
 *   3. District & Building Disaggregated
 *      Disability / Gifted / English Learner             -> special-population counts
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL="https://<ref>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
 *   npx tsx scripts/import-ohio-report-card.ts `
 *     --overview ".\data\overview.xlsx" `
 *     --race ".\data\race.xlsx" `
 *     --special ".\data\special.xlsx" `
 *     --year 2024-2025 [--dry-run] [--limit 25]
 *
 * NOTE: Ohio renames/reorders columns between years. The HEADER PATTERNS below are
 * matched fuzzily (case-insensitive substring/regex). If a field comes back empty,
 * print headers with --dump-headers and adjust the matching patterns here.
 */
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { ORDERED_GRADES } from '../src/lib/grades';

// ---------------------------------------------------------------- CLI parsing
function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const DRY_RUN = !!args['dry-run'];
const DUMP_HEADERS = !!args['dump-headers'];
const LIMIT = args.limit ? parseInt(String(args.limit), 10) : Infinity;
const SCHOOL_YEAR = String(args.year || '');

// ---------------------------------------------------------------- helpers
const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Read a sheet as array-of-arrays, detect the header row, return {headers, rows}. */
function readSheet(path: string): { headers: string[]; rows: Record<string, unknown>[] } {
  const wb = XLSX.readFile(path);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  // The real header row is the first row that contains an "IRN" cell.
  let headerIdx = matrix.findIndex((row) =>
    row.some((c) => /\birn\b/i.test(String(c ?? '')))
  );
  if (headerIdx === -1) headerIdx = 0;

  const headers = (matrix[headerIdx] as unknown[]).map((c) => String(c ?? '').trim());
  const rows: Record<string, unknown>[] = [];
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const arr = matrix[r] as unknown[];
    if (!arr || arr.every((c) => c === undefined || c === '')) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = arr[i]; });
    rows.push(obj);
  }
  return { headers, rows };
}

/** Find the first header matching any of the given regex patterns. */
function findCol(headers: string[], patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const hit = headers.find((h) => p.test(h));
    if (hit) return hit;
  }
  return undefined;
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[, %]/g, '').replace(/[<>]/g, ''));
  return Number.isFinite(n) ? n : null;
};

// Building IRN appears under various labels across the files.
const IRN_PATTERNS = [/^building irn$/i, /\bbuilding\b.*\birn\b/i, /^irn$/i, /\birn\b/i];
const BUILDING_NAME_PATTERNS = [/^building name$/i, /\bbuilding\b.*\bname\b/i, /^school name$/i];
const DISTRICT_NAME_PATTERNS = [/^district name$/i, /\bdistrict\b.*\bname\b/i];
const DISTRICT_IRN_PATTERNS = [/^district irn$/i, /\bdistrict\b.*\birn\b/i];
const COUNTY_PATTERNS = [/^county$/i, /\bcounty\b/i];
const CITY_PATTERNS = [/^city$/i, /\bcity\b/i];
const LOW_GRADE_PATTERNS = [/low.*grade/i, /grade.*low/i];
const HIGH_GRADE_PATTERNS = [/high.*grade/i, /grade.*high/i];
const TOTAL_ENROLL_PATTERNS = [/total.*enroll/i, /enroll.*total/i, /^enrollment$/i];

const getIrn = (row: Record<string, unknown>, headers: string[]): string | null => {
  const col = findCol(headers, IRN_PATTERNS);
  if (!col) return null;
  const raw = String(row[col] ?? '').trim();
  return raw ? raw : null;
};

// --------------------------------------------------------- record assembly
type SchoolRecord = {
  irn: string;
  building_name: string;
  district_name: string | null;
  district_irn: string | null;
  county: string | null;
  city: string | null;
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
};

function emptyRecord(irn: string): SchoolRecord {
  return {
    irn,
    building_name: '',
    district_name: null,
    district_irn: null,
    county: null,
    city: null,
    low_grade: null,
    high_grade: null,
    school_year: SCHOOL_YEAR,
    total_enrollment: null,
    enrollment_by_grade: {},
    pct_economically_disadvantaged: null,
    pct_students_with_disabilities: null,
    pct_english_learners: null,
    pct_gifted: null,
    race_ethnicity: {},
  };
}

/** % from a count column relative to total enrollment, falling back to a direct % column. */
function pctFrom(
  row: Record<string, unknown>,
  headers: string[],
  countPatterns: RegExp[],
  pctPatterns: RegExp[],
  total: number | null
): number | null {
  const pctCol = findCol(headers, pctPatterns);
  if (pctCol) {
    const p = toNum(row[pctCol]);
    if (p !== null) return p > 1 ? p : p * 100; // tolerate 0-1 or 0-100 scales
  }
  const countCol = findCol(headers, countPatterns);
  if (countCol && total && total > 0) {
    const c = toNum(row[countCol]);
    if (c !== null) return Math.round((c / total) * 1000) / 10;
  }
  return null;
}

function main() {
  const overviewPath = args.overview as string;
  const racePath = args.race as string;
  const specialPath = args.special as string;

  if (!overviewPath) {
    console.error('Missing --overview <file.xlsx>. See header comment for usage.');
    process.exit(1);
  }
  if (!SCHOOL_YEAR) {
    console.error('Missing --year (e.g. --year 2024-2025).');
    process.exit(1);
  }

  const records = new Map<string, SchoolRecord>();

  // ----- 1. Overview: identity, grade range, enrollment by grade + total -----
  console.log(`Reading overview: ${overviewPath}`);
  const overview = readSheet(overviewPath);
  if (DUMP_HEADERS) console.log('OVERVIEW HEADERS:\n', overview.headers.join('\n '));

  const ov = overview.headers;
  const nameCol = findCol(ov, BUILDING_NAME_PATTERNS);
  const distNameCol = findCol(ov, DISTRICT_NAME_PATTERNS);
  const distIrnCol = findCol(ov, DISTRICT_IRN_PATTERNS);
  const countyCol = findCol(ov, COUNTY_PATTERNS);
  const cityCol = findCol(ov, CITY_PATTERNS);
  const lowCol = findCol(ov, LOW_GRADE_PATTERNS);
  const highCol = findCol(ov, HIGH_GRADE_PATTERNS);
  const totalCol = findCol(ov, TOTAL_ENROLL_PATTERNS);

  // Map each grade token to an enrollment column (e.g. a header literally "Grade 6" / "06").
  const gradeCols = new Map<string, string>();
  for (const g of ORDERED_GRADES) {
    const labelNum = g === 'PK' ? 'pre' : g === 'KG' ? 'kinder' : String(parseInt(g, 10));
    const col = ov.find((h) => {
      const n = norm(h);
      if (g === 'PK') return /pre.?k|preschool/.test(n) && /enroll|grade|count|students/.test(n);
      if (g === 'KG') return /kinder/.test(n) && /enroll|grade|count|students/.test(n);
      return new RegExp(`(grade\\s*0?${labelNum}\\b|\\bg0?${labelNum}\\b|^0?${labelNum}$)`).test(n);
    });
    if (col) gradeCols.set(g, col);
  }

  for (const row of overview.rows) {
    const irn = getIrn(row, ov);
    if (!irn) continue;
    const rec = records.get(irn) ?? emptyRecord(irn);
    if (nameCol) rec.building_name = String(row[nameCol] ?? '').trim() || rec.building_name;
    if (distNameCol) rec.district_name = String(row[distNameCol] ?? '').trim() || null;
    if (distIrnCol) rec.district_irn = String(row[distIrnCol] ?? '').trim() || null;
    if (countyCol) rec.county = String(row[countyCol] ?? '').trim() || null;
    if (cityCol) rec.city = String(row[cityCol] ?? '').trim() || null;
    if (lowCol) rec.low_grade = String(row[lowCol] ?? '').trim() || null;
    if (highCol) rec.high_grade = String(row[highCol] ?? '').trim() || null;
    if (totalCol) rec.total_enrollment = toNum(row[totalCol]);

    for (const [g, col] of gradeCols) {
      const n = toNum(row[col]);
      if (n !== null) rec.enrollment_by_grade[g] = n;
    }
    if (rec.total_enrollment === null) {
      const sum = Object.values(rec.enrollment_by_grade).reduce((a, b) => a + b, 0);
      if (sum > 0) rec.total_enrollment = sum;
    }
    records.set(irn, rec);
  }
  console.log(`  parsed ${records.size} buildings; grade columns matched: ${[...gradeCols.keys()].join(',') || 'NONE'}`);

  // ----- 2. Race / ethnicity -----
  if (racePath) {
    console.log(`Reading race/ethnicity: ${racePath}`);
    const race = readSheet(racePath);
    if (DUMP_HEADERS) console.log('RACE HEADERS:\n', race.headers.join('\n '));
    const rh = race.headers;
    const groups: { key: string; patterns: RegExp[] }[] = [
      { key: 'white', patterns: [/white/i] },
      { key: 'black', patterns: [/black|african/i] },
      { key: 'hispanic', patterns: [/hispanic|latino/i] },
      { key: 'asian', patterns: [/asian/i] },
      { key: 'american_indian', patterns: [/american indian|native|alaska/i] },
      { key: 'pacific_islander', patterns: [/pacific|hawaiian/i] },
      { key: 'multiracial', patterns: [/multiracial|two or more|multi.?racial/i] },
    ];
    for (const row of race.rows) {
      const irn = getIrn(row, rh);
      if (!irn) continue;
      const rec = records.get(irn) ?? emptyRecord(irn);
      const total = rec.total_enrollment;
      for (const grp of groups) {
        const countCol = findCol(rh, grp.patterns.map((p) => new RegExp(p.source + '.*(count|enroll|number|#)', 'i')))
          ?? findCol(rh, grp.patterns);
        const count = countCol ? toNum(row[countCol]) : null;
        const pct = count !== null && total && total > 0
          ? Math.round((count / total) * 1000) / 10
          : null;
        if (count !== null || pct !== null) rec.race_ethnicity[grp.key] = { count, pct };
      }
      records.set(irn, rec);
    }
  }

  // ----- 3. Disability / EL / Gifted -----
  if (specialPath) {
    console.log(`Reading special populations: ${specialPath}`);
    const special = readSheet(specialPath);
    if (DUMP_HEADERS) console.log('SPECIAL HEADERS:\n', special.headers.join('\n '));
    const sh = special.headers;
    for (const row of special.rows) {
      const irn = getIrn(row, sh);
      if (!irn) continue;
      const rec = records.get(irn) ?? emptyRecord(irn);
      const total = rec.total_enrollment;
      rec.pct_students_with_disabilities = pctFrom(
        row, sh,
        [/disab|students with disab|swd|iep/i],
        [/disab.*(percent|%|rate)/i],
        total
      ) ?? rec.pct_students_with_disabilities;
      rec.pct_english_learners = pctFrom(
        row, sh,
        [/english learner|\bell?\b|\bel\b|limited english/i],
        [/(english learner|\bell?\b|\bel\b).*(percent|%|rate)/i],
        total
      ) ?? rec.pct_english_learners;
      rec.pct_gifted = pctFrom(
        row, sh,
        [/gifted/i],
        [/gifted.*(percent|%|rate)/i],
        total
      ) ?? rec.pct_gifted;
      rec.pct_economically_disadvantaged = pctFrom(
        row, sh,
        [/econ.*disadvantaged|economically|disadvantaged|frl|free.*reduced/i],
        [/(econ|disadvantaged).*(percent|%|rate)/i],
        total
      ) ?? rec.pct_economically_disadvantaged;
      records.set(irn, rec);
    }
  }

  // Economically disadvantaged sometimes lives in the overview file too.
  {
    const edCol = findCol(ov, [/econ.*disadvantaged.*(percent|%)/i, /economically disadvantaged/i]);
    if (edCol) {
      for (const row of overview.rows) {
        const irn = getIrn(row, ov);
        if (!irn) continue;
        const rec = records.get(irn);
        if (rec && rec.pct_economically_disadvantaged === null) {
          const p = toNum(row[edCol]);
          if (p !== null) rec.pct_economically_disadvantaged = p > 1 ? p : p * 100;
        }
      }
    }
  }

  const all = [...records.values()].filter((r) => r.building_name);
  console.log(`\nAssembled ${all.length} school records for ${SCHOOL_YEAR}.`);
  const sample = all.slice(0, 2);
  console.log('Sample:\n', JSON.stringify(sample, null, 2));

  if (DRY_RUN || DUMP_HEADERS) {
    console.log('\n--dry-run/--dump-headers: not writing to Supabase.');
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars to write.');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const toWrite = all.slice(0, LIMIT);
  const batchSize = 500;
  (async () => {
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
  })();
}

main();
