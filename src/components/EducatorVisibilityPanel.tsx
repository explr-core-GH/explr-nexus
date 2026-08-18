import { useMemo, useState } from 'react';
import { Search, Eye, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInventoryDB } from '@/hooks/useInventoryDB';

/**
 * Admin control for which inventory items educators (member role) can see.
 * Everything is hidden from educators by default; flip a switch to expose an
 * item. Educators otherwise only see Projects.
 */
export function EducatorVisibilityPanel() {
  const { items, isLoading, updateItem } = useInventoryDB();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const categories = useMemo(
    () => [...new Set(items.map(i => i.category))].sort(),
    [items]
  );

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter(item => {
        const matchesSearch =
          !q ||
          item.name.toLowerCase().includes(q) ||
          item.qr_code.toLowerCase().includes(q);
        const matchesCategory = category === 'all' || item.category === category;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search, category]);

  const shownCount = items.filter(i => i.educator_visible).length;
  const allFilteredOn =
    visibleItems.length > 0 && visibleItems.every(i => i.educator_visible);

  const toggleOne = async (id: string, next: boolean) => {
    setSavingId(id);
    await updateItem(id, { educator_visible: next });
    setSavingId(null);
  };

  const setAllFiltered = async (next: boolean) => {
    const targets = visibleItems.filter(i => i.educator_visible !== next);
    if (targets.length === 0) return;
    setBulkBusy(true);
    for (const item of targets) {
      await updateItem(item.id, { educator_visible: next });
    }
    setBulkBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Educator Visibility</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Educators only see Projects plus the individual items you switch on here.
          Everything starts hidden. <span className="font-medium text-foreground">{shownCount}</span> item
          {shownCount === 1 ? '' : 's'} currently visible to educators.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or QR code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{visibleItems.length} shown</span>
        <div className="flex items-center gap-2">
          {bulkBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button
            variant="outline"
            size="sm"
            disabled={bulkBusy || visibleItems.length === 0}
            onClick={() => setAllFiltered(!allFilteredOn)}
          >
            {allFilteredOn ? 'Hide all shown' : 'Show all shown'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading inventory...
        </div>
      ) : visibleItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No items match your filters.</p>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border max-h-[520px] overflow-y-auto">
          {visibleItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3">
              <Switch
                id={`edu-vis-${item.id}`}
                checked={item.educator_visible}
                disabled={savingId === item.id}
                onCheckedChange={checked => toggleOne(item.id, checked)}
              />
              <Label htmlFor={`edu-vis-${item.id}`} className="flex-1 min-w-0 cursor-pointer">
                <span className="block text-sm font-medium truncate">{item.name}</span>
                <span className="block text-xs text-muted-foreground font-mono">
                  {item.qr_code} · {item.category}
                </span>
              </Label>
              {savingId === item.id && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
