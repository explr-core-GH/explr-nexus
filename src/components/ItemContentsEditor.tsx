import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ItemContentLine {
  name: string;
  quantity: number;
}

interface ItemContentsEditorProps {
  contents: ItemContentLine[];
  onChange: (contents: ItemContentLine[]) => void;
}

export function ItemContentsEditor({ contents, onChange }: ItemContentsEditorProps) {
  const updateLine = (index: number, patch: Partial<ItemContentLine>) => {
    onChange(contents.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number) => {
    onChange(contents.filter((_, i) => i !== index));
  };

  const addLine = () => {
    onChange([...contents, { name: '', quantity: 1 }]);
  };

  return (
    <div className="space-y-2">
      {contents.map((line, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={line.name}
            onChange={(e) => updateLine(index, { name: e.target.value })}
            placeholder="e.g., MicroUSB Cable"
            className="flex-1"
          />
          <Input
            type="number"
            min="1"
            value={line.quantity}
            onChange={(e) => updateLine(index, { quantity: parseInt(e.target.value) || 1 })}
            className="w-20"
            aria-label="Quantity"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addLine}>
        <Plus className="h-4 w-4" />
        Add additional item
      </Button>
    </div>
  );
}
