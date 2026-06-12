// Academic-year helpers (e.g. "2024-2025"). The academic year rolls over in July.

export function currentAcademicYear(now: Date = new Date()): string {
  const y = now.getFullYear();
  const start = now.getMonth() >= 6 ? y : y - 1; // month 6 = July
  return `${start}-${start + 1}`;
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
