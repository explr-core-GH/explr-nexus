import { describe, it, expect } from 'vitest';
import { aggregate } from './grantAggregate';
import type { TeacherAssignment } from '@/hooks/useTeacherAssignments';

const mk = (
  potentialBase: number,
  actual: { base: number; race?: Record<string, number>; gender?: Record<string, number>; econ?: number } | null,
  students_served: number | null
): TeacherAssignment =>
  ({
    students_served,
    demographics_snapshot: {
      potential: {
        base: potentialBase,
        economically_disadvantaged: Math.round(potentialBase / 2),
        students_with_disabilities: null,
        english_learners: null,
        gifted: null,
        race_ethnicity: { black: potentialBase },
      },
      actual: actual
        ? {
            base: actual.base,
            economically_disadvantaged: actual.econ ?? null,
            students_with_disabilities: null,
            english_learners: null,
            gifted: null,
            race_ethnicity: actual.race ?? {},
            gender: actual.gender,
          }
        : null,
    },
  }) as unknown as TeacherAssignment;

describe('aggregate', () => {
  it('sums potential reach (whole grade band)', () => {
    const list = [mk(300, null, null), mk(200, null, null)];
    const a = aggregate(list, 'potential');
    expect(a.students).toBe(500);
    expect(a.econ).toBe(150 + 100);
    expect(a.race.black).toBe(500);
  });

  it('actual counts only entered headcounts / actual snapshots', () => {
    const list = [
      mk(300, { base: 25, econ: 10, race: { black: 12 }, gender: { boys: 13, girls: 12 } }, 25),
      mk(200, null, null), // teacher with no headcount → contributes 0 to actual
    ];
    const a = aggregate(list, 'actual');
    expect(a.students).toBe(25);
    expect(a.econ).toBe(10);
    expect(a.race.black).toBe(12);
    expect(a.gender.boys).toBe(13);
    expect(a.gender.girls).toBe(12);
  });
});
