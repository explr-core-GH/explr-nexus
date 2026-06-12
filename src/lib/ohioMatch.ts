import { supabase } from '@/integrations/supabase/client';
import type { OhioSchool } from '@/lib/csvAssignments';

/**
 * Best-effort resolve a free-text school (name or IRN) to a single Ohio school — the same
 * dataset the assign picker searches. Returns null when ambiguous so the user picks in the grid.
 */
export async function matchOhioSchoolByText(text: string): Promise<OhioSchool | null> {
  const t = text.trim();
  if (!t) return null;

  // Exact IRN
  if (/^\d{6,7}$/.test(t)) {
    const { data } = await supabase.from('ohio_schools').select('*').eq('irn', t).maybeSingle();
    if (data) return data as OhioSchool;
  }

  const escaped = t.replace(/[%,]/g, ' ');
  const { data } = await supabase
    .from('ohio_schools')
    .select('*')
    .ilike('building_name', `%${escaped}%`)
    .limit(10);

  const matches = (data as OhioSchool[]) || [];
  if (matches.length === 1) return matches[0];
  // Prefer an exact (case-insensitive) name match when several partial matches exist.
  const exact = matches.find((s) => s.building_name.toLowerCase() === t.toLowerCase());
  return exact ?? null;
}
