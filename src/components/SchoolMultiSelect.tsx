import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useOhioSchools } from '@/hooks/useOhioSchools';
import type { OhioSchool } from '@/hooks/usePartnerSchools';

interface SchoolMultiSelectProps {
  selected: OhioSchool[];
  onChange: (next: OhioSchool[]) => void;
}

/** Search the Ohio dataset and pick multiple schools (chips). Used at registration. */
export function SchoolMultiSelect({ selected, onChange }: SchoolMultiSelectProps) {
  const [query, setQuery] = useState('');
  const { results, isLoading } = useOhioSchools(query);

  const selectedIrns = new Set(selected.map((s) => s.irn));
  const visible = results.filter((s) => !selectedIrns.has(s.irn));

  const add = (s: OhioSchool) => {
    onChange([...selected, s]);
    setQuery('');
  };
  const remove = (irn: string) => onChange(selected.filter((s) => s.irn !== irn));

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <Badge key={s.irn} variant="secondary" className="gap-1 pr-1">
              {s.building_name}
              <button
                type="button"
                onClick={() => remove(s.irn)}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${s.building_name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search your school(s) by name, district, or IRN"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="border rounded-lg max-h-44 overflow-y-auto divide-y">
          {isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">Searching…</p>
          ) : visible.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matches.</p>
          ) : (
            visible.map((s) => (
              <button
                key={s.irn}
                type="button"
                onClick={() => add(s)}
                className="w-full text-left p-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{s.building_name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    IRN {s.irn}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[s.district_name, s.city].filter(Boolean).join(' · ')}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
