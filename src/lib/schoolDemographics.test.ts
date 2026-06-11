import { describe, it, expect } from 'vitest';
import { gradesInBand } from './grades';
import {
  computeBandReach,
  applyDemographics,
  buildSnapshot,
} from './schoolDemographics';
import type { OhioSchool } from '@/hooks/usePartnerSchools';

const school = {
  irn: '000123',
  building_name: 'Test Middle School',
  district_name: 'Test City Schools',
  district_irn: '044',
  county: 'Franklin',
  city: 'Columbus',
  address: '1 Test St, Columbus, OH',
  low_grade: '06',
  high_grade: '08',
  school_year: '2024-2025',
  total_enrollment: 600,
  enrollment_by_grade: { '06': 200, '07': 200, '08': 200, '05': 100 },
  pct_economically_disadvantaged: 50,
  pct_students_with_disabilities: 10,
  pct_english_learners: 20,
  pct_gifted: 5,
  race_ethnicity: {
    white: { count: 300, pct: 50 },
    black: { count: 180, pct: 30 },
    hispanic: { count: 120, pct: null }, // pct derived from count/total
  },
  created_at: '',
  updated_at: '',
} as unknown as OhioSchool;

describe('gradesInBand', () => {
  it('returns inclusive range', () => {
    expect(gradesInBand('06', '08')).toEqual(['06', '07', '08']);
  });
  it('returns single grade when low === high', () => {
    expect(gradesInBand('07', '07')).toEqual(['07']);
  });
  it('returns empty when reversed or invalid', () => {
    expect(gradesInBand('08', '06')).toEqual([]);
    expect(gradesInBand('XX', '08')).toEqual([]);
  });
});

describe('computeBandReach', () => {
  it('sums enrollment across the band only', () => {
    expect(computeBandReach(school, '06', '08')).toBe(600);
    expect(computeBandReach(school, '07', '08')).toBe(400);
  });
  it('ignores grades outside the band', () => {
    // grade 05 (100) must not be counted in a 6-8 band
    expect(computeBandReach(school, '06', '08')).toBe(600);
  });
});

describe('applyDemographics', () => {
  it('applies building-level percentages to the base', () => {
    const c = applyDemographics(school, 600);
    expect(c.economically_disadvantaged).toBe(300); // 50% of 600
    expect(c.students_with_disabilities).toBe(60); // 10%
    expect(c.english_learners).toBe(120); // 20%
    expect(c.gifted).toBe(30); // 5%
  });

  it('scales race counts, deriving pct from count when pct missing', () => {
    const c = applyDemographics(school, 600);
    expect(c.race_ethnicity.white).toBe(300); // 50%
    expect(c.race_ethnicity.black).toBe(180); // 30%
    // hispanic pct null -> derived 120/600 = 20% -> 120
    expect(c.race_ethnicity.hispanic).toBe(120);
  });

  it('scales proportionally for a smaller base', () => {
    const c = applyDemographics(school, 300);
    expect(c.economically_disadvantaged).toBe(150); // 50% of 300
  });
});

describe('buildSnapshot', () => {
  it('captures potential reach and actual served bases', () => {
    const snap = buildSnapshot(school, '06', '08', 75);
    expect(snap.potential_reach).toBe(600);
    expect(snap.actual_served).toBe(75);
    expect(snap.potential.economically_disadvantaged).toBe(300);
    expect(snap.actual?.economically_disadvantaged).toBe(38); // 50% of 75 rounded
    expect(snap.estimated).toBe(true);
  });

  it('leaves actual null when no headcount given', () => {
    const snap = buildSnapshot(school, '06', '08', null);
    expect(snap.actual).toBeNull();
  });
});
