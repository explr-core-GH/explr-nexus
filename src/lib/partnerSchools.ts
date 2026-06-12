import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type OhioSchool = Tables<'ohio_schools'>;
type PartnerSchoolRow = Tables<'partner_schools'>;

/** Build a geocodable address string from an Ohio school row. */
export function ohioAddress(ohio: Pick<OhioSchool, 'address' | 'city'>): string {
  return ohio.address || [ohio.city, 'OH'].filter(Boolean).join(', ');
}

async function geocode(address: string): Promise<{ latitude: number | null; longitude: number | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('geocode', { body: { address } });
    if (error) throw error;
    return { latitude: data.latitude, longitude: data.longitude };
  } catch (e) {
    console.error('Geocoding error:', e);
    return { latitude: null, longitude: null };
  }
}

/**
 * Resolve an Ohio school to a partner_schools row by IRN: return the existing one or
 * insert a new one (geocoded). Pure (no React state) so it works in registration and
 * inside hooks. Relies on RLS allowing authenticated inserts.
 */
export async function findOrCreatePartnerSchool(ohio: OhioSchool): Promise<PartnerSchoolRow | null> {
  const { data: existing, error: findErr } = await supabase
    .from('partner_schools')
    .select('*')
    .eq('ohio_irn', ohio.irn)
    .maybeSingle();
  if (findErr) {
    console.error('Error looking up partner school:', findErr);
    return null;
  }
  if (existing) return existing as PartnerSchoolRow;

  const address = ohioAddress(ohio);
  const coords = await geocode(address);
  const { data, error } = await supabase
    .from('partner_schools')
    .insert({
      name: ohio.building_name,
      address,
      latitude: coords.latitude,
      longitude: coords.longitude,
      ohio_irn: ohio.irn,
    })
    .select('*')
    .single();
  if (error) {
    console.error('Error creating partner school:', error);
    return null;
  }
  return data as PartnerSchoolRow;
}
