import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@/hooks/useInventoryDB';

interface InventoryItemComboboxProps {
  items: InventoryItem[];
  value: string;
  onChange: (itemId: string) => void;
  placeholder?: string;
  disabledIds?: string[];
  className?: string;
}

/**
 * Searchable inventory item picker. Renders its list in a portal (Popover) so it is
 * never clipped by dialog overflow, flips/repositions to stay in the viewport, and
 * scrolls internally when the list is long.
 */
export function InventoryItemCombobox({
  items,
  value,
  onChange,
  placeholder = 'Select an item',
  disabledIds = [],
  className,
}: InventoryItemComboboxProps) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );
  const selected = sorted.find((i) => i.id === value);
  const disabled = new Set(disabledIds.filter((id) => id !== value));

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between font-normal', className)}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        avoidCollisions
        collisionPadding={12}
        className="p-0 w-[--radix-popover-trigger-width] min-w-[260px] z-[60]"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search items by name or category..." />
          <CommandList className="max-h-[min(18rem,50vh)] overflow-y-auto">
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.category ?? ''}`}
                  disabled={disabled.has(item.id)}
                  onSelect={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      item.id === value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                  {item.category && (
                    <span className="ml-auto pl-2 text-xs text-muted-foreground shrink-0">
                      {item.category}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
