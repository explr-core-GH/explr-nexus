import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { OhioSchool } from '@/hooks/usePartnerSchools';

/**
 * Typeahead search over the statewide `ohio_schools` reference dataset.
 * Matches building name, district name, or IRN. Debounced.
 */
export function useOhioSchools(query: string) {
  const [results, setResults] = useState<OhioSchool[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    const handle = setTimeout(async () => {
      try {
        const escaped = term.replace(/[%,]/g, ' ');
        const { data, error } = await supabase
          .from('ohio_schools')
          .select('*')
          .or(
            `building_name.ilike.%${escaped}%,district_name.ilike.%${escaped}%,irn.ilike.%${escaped}%`
          )
          .order('building_name', { ascending: true })
          .limit(25);

        if (error) throw error;
        if (!cancelled) setResults((data as OhioSchool[]) || []);
      } catch (error) {
        console.error('Error searching Ohio schools:', error);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  return { results, isLoading };
}
