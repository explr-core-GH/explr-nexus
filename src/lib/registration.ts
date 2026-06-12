import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { findOrCreatePartnerSchool } from '@/lib/partnerSchools';
import { buildSnapshot } from '@/lib/schoolDemographics';

type OhioSchool = Tables<'ohio_schools'>;

/** Look up a profile id from the auth user id (the handle_new_user trigger created it). */
export async function getProfileId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Error fetching profile id:', error);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Educator self-registration: create the teacher row and an assignment per chosen Ohio
 * school (grade band = the school's full span; headcount left null). Counts immediately.
 */
export async function registerEducatorSchools(
  profileId: string,
  fullName: string,
  email: string | null,
  ohioSchools: OhioSchool[]
): Promise<void> {
  const { data: teacher, error } = await supabase
    .from('teachers')
    .insert({ full_name: fullName, email, profile_id: profileId })
    .select('id')
    .single();
  if (error || !teacher) {
    console.error('Error creating teacher on registration:', error);
    return;
  }

  for (const ohio of ohioSchools) {
    const school = await findOrCreatePartnerSchool(ohio);
    if (!school) continue;
    const low = ohio.low_grade || 'PK';
    const high = ohio.high_grade || '12';
    const snapshot = buildSnapshot(ohio, low, high, null);
    const { error: aErr } = await supabase.from('teacher_school_assignments').insert({
      teacher_id: teacher.id,
      school_id: school.id,
      grade_low: low,
      grade_high: high,
      students_served: null,
      school_year: ohio.school_year,
      demographics_snapshot:
        snapshot as unknown as Tables<'teacher_school_assignments'>['demographics_snapshot'],
    });
    if (aErr) console.error('Error creating assignment on registration:', aErr);
  }
}

/**
 * Org/nonprofit self-registration: create the organization and link each chosen Ohio
 * school (just the list — no counts).
 */
export async function registerOrganizationSchools(
  profileId: string,
  orgName: string,
  ohioSchools: OhioSchool[]
): Promise<void> {
  const { data: org, error } = await supabase
    .from('organizations')
    .insert({ name: orgName, org_type: 'nonprofit', profile_id: profileId })
    .select('id')
    .single();
  if (error || !org) {
    console.error('Error creating organization on registration:', error);
    return;
  }

  for (const ohio of ohioSchools) {
    const school = await findOrCreatePartnerSchool(ohio);
    if (!school) continue;
    const { error: lErr } = await supabase
      .from('organization_schools')
      .insert({ organization_id: org.id, school_id: school.id });
    if (lErr) console.error('Error linking org school on registration:', lErr);
  }
}
