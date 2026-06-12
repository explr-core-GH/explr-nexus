// Academic-year helpers (e.g. "2024-2025"). The academic year rolls over in July.

export function currentAcademicYear(now: Date = new Date()): string {
  const y = now.getFullYear();
  const start = now.getMonth() >= 6 ? y : y - 1; // month 6 = July
  return `${start}-${start + 1}`;
}

/** Normalize a year input to an academic-year string: "2025" -> "2025-2026", "2025-26" -> "2025-2026". */
export function normalizeSchoolYear(input: string): string {
  const t = (input ?? '').trim();
  if (!t) return t;
  if (/^\d{4}-\d{4}$/.test(t)) return t; // already full
  const single = t.match(/^(\d{4})$/);
  if (single) {
    const y = parseInt(single[1], 10);
    return `${y}-${y + 1}`;
  }
  const short = t.match(/^(\d{4})\s*[-/]\s*(\d{2})$/); // 2025-26 or 2025/26
  if (short) {
    const y = parseInt(short[1], 10);
    return `${y}-${Math.floor(y / 100) * 100 + parseInt(short[2], 10)}`;
  }
  return t;
}

/** Recent academic years, most-recent first (default: 2 back through 1 forward). */
export function recentSchoolYears(now: Date = new Date(), back = 2, forward = 1): string[] {
  const y = now.getFullYear();
  const base = now.getMonth() >= 6 ? y : y - 1;
  const years: string[] = [];
  for (let s = base + forward; s >= base - back; s--) years.push(`${s}-${s + 1}`);
  return years;
}

/** Merge known years with any years already present in the data, most-recent first. */
export function schoolYearOptions(existing: (string | null | undefined)[] = []): string[] {
  const set = new Set<string>(recentSchoolYears());
  for (const y of existing) if (y) set.add(y);
  return [...set].sort().reverse();
}
