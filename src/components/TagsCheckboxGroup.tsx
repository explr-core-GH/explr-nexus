import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { VISIBILITY_TAGS, VisibilityTag } from '@/constants/tags';

interface TagsCheckboxGroupProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagsCheckboxGroup({ selectedTags, onTagsChange, disabled }: TagsCheckboxGroupProps) {
  const handleTagToggle = (tag: VisibilityTag, checked: boolean) => {
    if (checked) {
      onTagsChange([...selectedTags, tag]);
    } else {
      onTagsChange(selectedTags.filter(t => t !== tag));
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {VISIBILITY_TAGS.map((tag) => (
        <div key={tag} className="flex items-center space-x-2">
          <Checkbox
            id={`tag-${tag}`}
            checked={selectedTags.includes(tag)}
            onCheckedChange={(checked) => handleTagToggle(tag, checked === true)}
            disabled={disabled}
          />
          <Label
            htmlFor={`tag-${tag}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {tag}
          </Label>
        </div>
      ))}
    </div>
  );
}
