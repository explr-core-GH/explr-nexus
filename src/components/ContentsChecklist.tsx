import { ClipboardCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ItemContentLine } from '@/types/inventory';

interface ContentsChecklistProps {
  contents: ItemContentLine[];
  checked: boolean[];
  onToggle: (index: number, value: boolean) => void;
}

export function ContentsChecklist({ contents, checked, onToggle }: ContentsChecklistProps) {
  const allChecked = contents.length > 0 && checked.every(Boolean);

  return (
    <div className="p-4 rounded-lg border border-border space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ClipboardCheck className="h-4 w-4 text-accent" />
        Item Check — confirm returned contents
      </div>
      <div className="space-y-2">
        {contents.map((line, index) => (
          <div key={`${line.name}-${index}`} className="flex items-center space-x-2">
            <Checkbox
              id={`content-check-${index}`}
              checked={checked[index] ?? false}
              onCheckedChange={(value) => onToggle(index, value === true)}
            />
            <Label htmlFor={`content-check-${index}`} className="text-sm cursor-pointer">
              {line.name} <span className="text-muted-foreground">×{line.quantity}</span>
            </Label>
          </div>
        ))}
      </div>
      {!allChecked && (
        <p className="text-xs text-destructive">
          Unticked lines will be recorded as missing contents for admins to follow up.
        </p>
      )}
    </div>
  );
}
