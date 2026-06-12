// Non-teacher engagement types (camps, internships, pilots) — stored in
// teacher_school_assignments.program_type (lower-cased). Teacher rows have a null type.
export const PROGRAM_TYPES = ['Camp', 'Internship', 'Pilot', 'Other'] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];
