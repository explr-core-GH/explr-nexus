import { describe, it, expect } from 'vitest';
import { normalizeGradeToken } from './grades';
import { parseTeacherCSV } from './csvAssignments';

describe('normalizeGradeToken', () => {
  it('normalizes numeric grades', () => {
    expect(normalizeGradeToken('6')).toBe('06');
    expect(normalizeGradeToken('06')).toBe('06');
    expect(normalizeGradeToken('12')).toBe('12');
    expect(normalizeGradeToken('8th')).toBe('08');
    expect(normalizeGradeToken('Grade 7')).toBe('07');
  });
  it('normalizes K and Pre-K variants', () => {
    expect(normalizeGradeToken('K')).toBe('KG');
    expect(normalizeGradeToken('Kindergarten')).toBe('KG');
    expect(normalizeGradeToken('PK')).toBe('PK');
    expect(normalizeGradeToken('Pre-K')).toBe('PK');
    expect(normalizeGradeToken('preschool')).toBe('PK');
  });
  it('rejects invalid grades', () => {
    expect(normalizeGradeToken('13')).toBeNull();
    expect(normalizeGradeToken('xyz')).toBeNull();
    expect(normalizeGradeToken('')).toBeNull();
  });
});

describe('parseTeacherCSV', () => {
  const header = 'teacher_name,teacher_email,school,grade_low,grade_high,students_served,school_year,subject';

  it('requires the teacher_name column', () => {
    const res = parseTeacherCSV('foo,bar\n1,2');
    expect(res.rows).toHaveLength(0);
    expect(res.errors[0].message).toMatch(/teacher_name/);
  });

  it('parses a valid row with grades, tags, and year', () => {
    const res = parseTeacherCSV(`${header}\nMaria Lopez,maria@x.org,Lincoln Middle,6,8,75,2024-2025,FTC;Drones`);
    expect(res.rows).toHaveLength(1);
    const r = res.rows[0];
    expect(r.teacherName).toBe('Maria Lopez');
    expect(r.teacherEmail).toBe('maria@x.org');
    expect(r.schoolText).toBe('Lincoln Middle');
    expect(r.gradeLow).toBe('06');
    expect(r.gradeHigh).toBe('08');
    expect(r.studentsServed).toBe('75');
    expect(r.schoolYear).toBe('2024-2025');
    expect(r.subjectTags).toEqual(['FTC', 'Drones']);
    expect(r.selectedSchool).toBeNull();
  });

  it('ignores comment lines and skips rows missing teacher_name', () => {
    const res = parseTeacherCSV(`${header}\n# a comment\n,no@name.org,School,6,8,,,\nJane,,School,K,5,,,`);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].teacherName).toBe('Jane');
    expect(res.rows[0].gradeLow).toBe('KG');
    expect(res.errors.some((e) => /teacher_name is required/.test(e.message))).toBe(true);
  });

  it('flags unrecognized grades but keeps the row', () => {
    const res = parseTeacherCSV(`${header}\nBob,,School,99,8,,,`);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].gradeLow).toBe('');
    expect(res.errors.some((e) => /grade_low/.test(e.message))).toBe(true);
  });

  it('defaults school year when blank', () => {
    const res = parseTeacherCSV(`${header}\nAmy,,School,6,8,,,`);
    expect(res.rows[0].schoolYear).toMatch(/^\d{4}-\d{4}$/);
  });
});
