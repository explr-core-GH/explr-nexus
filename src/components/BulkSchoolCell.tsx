import { useState } from 'react';
import { ChevronsUpDown, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useOhioSchools } from '@/hooks/useOhioSchools';
import type { OhioSchool } from '@/lib/csvAssignments';

interface BulkSchoolCellProps {
  schoolText: string;
  selectedSchool: OhioSchool | null;
  onChange: (patch: { schoolText?: string; selectedSchool?: OhioSchool | null }) => void;
}

/** Per-row Ohio school picker — same dataset/search as the single-assign dialog. */
export function BulkSchoolCell({ schoolText, selectedSchool, onChange }: BulkSchoolCellProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { results, isLoading } = useOhioSchools(query);

  const unmatched = !selectedSchool && !!schoolText.trim();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`w-full justify-between font-normal min-w-[180px] ${
            unmatched ? 'border-destructive text-destructive' : ''
          }`}
        >
          <span className="truncate">
            {selectedSchool ? selectedSchool.building_name : schoolText || 'Select school…'}
          </span>
          {unmatched ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search Ohio schools by name, district, or IRN"
          />
          <CommandList>
            {isLoading && <div className="p-3 text-sm text-muted-foreground">Searching…</div>}
            {!isLoading && query.trim().length >= 2 && results.length === 0 && (
              <CommandEmpty>No matches.</CommandEmpty>
            )}
            {results.map((s) => (
              <CommandItem
                key={s.irn}
                value={s.irn}
                onSelect={() => {
                  onChange({ selectedSchool: s, schoolText: s.building_name });
                  setOpen(false);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${selectedSchool?.irn === s.irn ? 'opacity-100' : 'opacity-0'}`}
                />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{s.building_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[s.district_name, s.city].filter(Boolean).join(' · ')} · IRN {s.irn}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
