import type { Tables } from '@/integrations/supabase/types';
import { normalizeGradeToken } from '@/lib/grades';
import { currentAcademicYear } from '@/lib/schoolYears';
import { VISIBILITY_TAGS } from '@/constants/tags';

export type OhioSchool = Tables<'ohio_schools'>;

/** A draft assignment row in the bulk editor (strings for inputs; resolved later). */
export interface DraftRow {
  id: string;
  teacherName: string;
  teacherEmail: string;
  schoolText: string;
  selectedSchool: OhioSchool | null;
  gradeLow: string; // ordered grade token or ''
  gradeHigh: string;
  studentsServed: string;
  schoolYear: string;
  subjectTags: string[];
}

export interface ParseResult {
  rows: DraftRow[];
  errors: { row: number; message: string }[];
}

export const TEACHER_CSV_COLUMNS = [
  'teacher_name',
  'teacher_email',
  'school',
  'grade_low',
  'grade_high',
  'students_served',
  'school_year',
  'subject',
] as const;

// Split one CSV line, honoring simple quoting (matches CSVImportDialog's approach).
function splitLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"' || char === "'") inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else current += char;
  }
  values.push(current.trim());
  return values.map((v) => v.replace(/^["']|["']$/g, '').trim());
}

const matchTag = (raw: string): string | null => {
  const t = raw.trim().toLowerCase();
  return VISIBILITY_TAGS.find((tag) => tag.toLowerCase() === t) ?? null;
};

let rowSeq = 0;
const nextId = () => `draft-${rowSeq++}-${Math.floor(Math.random() * 1e6)}`;

/** Parse a teacher-assignment CSV into draft rows. Schools are resolved separately. */
export function parseTeacherCSV(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, message: 'CSV needs a header row and at least one data row' }] };
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  if (!headers.includes('teacher_name')) {
    return { rows: [], errors: [{ row: 0, message: 'Missing required column: teacher_name' }] };
  }

  const rows: DraftRow[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    const get = (col: string) => {
      const idx = headers.indexOf(col);
      return idx >= 0 ? (values[idx] ?? '').trim() : '';
    };

    const teacherName = get('teacher_name');
    if (!teacherName) {
      errors.push({ row: i + 1, message: 'teacher_name is required' });
      continue;
    }

    const gradeLow = get('grade_low') ? normalizeGradeToken(get('grade_low')) ?? '' : '';
    const gradeHigh = get('grade_high') ? normalizeGradeToken(get('grade_high')) ?? '' : '';
    if (get('grade_low') && !gradeLow) errors.push({ row: i + 1, message: `unrecognized grade_low "${get('grade_low')}"` });
    if (get('grade_high') && !gradeHigh) errors.push({ row: i + 1, message: `unrecognized grade_high "${get('grade_high')}"` });

    const subjectTags = get('subject')
      ? get('subject').split(/[;,]/).map(matchTag).filter((t): t is string => !!t)
      : [];

    rows.push({
      id: nextId(),
      teacherName,
      teacherEmail: get('teacher_email'),
      schoolText: get('school'),
      selectedSchool: null,
      gradeLow,
      gradeHigh,
      studentsServed: get('students_served'),
      schoolYear: get('school_year') || currentAcademicYear(),
      subjectTags,
    });
  }

  return { rows, errors };
}

/** Build a downloadable CSV template (header + commented instructions + examples). */
export function teacherCsvTemplate(): string {
  return [
    TEACHER_CSV_COLUMNS.join(','),
    '# teacher_name (required) | teacher_email (optional)',
    '# school: school name or building IRN (matched against the Ohio dataset; fix any in the grid)',
    '# grade_low / grade_high: e.g. 6, 06, K, PK, Kindergarten',
    '# students_served (optional): leave blank to count the full grade-band reach',
    '# school_year (optional): e.g. 2024-2025 (defaults to the current academic year)',
    `# subject (optional): program tags, semicolon-separated. Allowed: ${VISIBILITY_TAGS.join(' | ')}`,
    '# --- delete these comment lines and the examples below, then add your rows ---',
    'Maria Lopez,maria@school.org,Amanda-Clearcreek Middle School,6,8,75,2024-2025,FTC;Drones',
    'James Carter,,Sandusky Middle School,7,8,,2024-2025,FRC',
  ].join('\n');
}
