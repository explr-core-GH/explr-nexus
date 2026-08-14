import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTags } from '@/hooks/useTags';

interface ItemTagsSelectProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function ItemTagsSelect({ selectedTags, onTagsChange, disabled }: ItemTagsSelectProps) {
  const { tags, isLoading } = useTags();

  // Include any legacy tags stored on the item that no longer exist in the tag list
  const names = Array.from(new Set([...tags.map(t => t.name), ...selectedTags]));

  const toggle = (name: string, checked: boolean) => {
    onTagsChange(checked ? [...selectedTags, name] : selectedTags.filter(t => t !== name));
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading tags...</p>;
  }

  if (names.length === 0) {
    return <p className="text-xs text-muted-foreground">No tags yet. Add tags in the Admin panel.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {names.map((name) => (
        <div key={name} className="flex items-center space-x-2">
          <Checkbox
            id={`item-tag-${name}`}
            checked={selectedTags.includes(name)}
            onCheckedChange={(checked) => toggle(name, checked === true)}
            disabled={disabled}
          />
          <Label htmlFor={`item-tag-${name}`} className="text-sm font-medium leading-none cursor-pointer">
            {name}
          </Label>
        </div>
      ))}
    </div>
  );
}
