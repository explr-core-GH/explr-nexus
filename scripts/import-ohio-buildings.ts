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
import { buildOhioRecord } from './ohioBuildingRecord';

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

if (!DIR) {
  console.error('Missing --dir <path to data/buildings>. See header for usage.');
  process.exit(1);
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
      const { record, redactedGrades } = buildOhioRecord(b, SCHOOL_YEAR);
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
