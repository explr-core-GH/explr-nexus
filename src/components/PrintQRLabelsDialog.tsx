import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface LabelItem {
  id: string;
  name: string;
  qr_code: string;
  category: string;
}

interface PrintQRLabelsDialogProps {
  items: LabelItem[];
  categories: string[];
}

// Avery 94107: US Letter, 12 labels per sheet (3 across x 4 down), 2in x 2in
const LABELS_PER_PAGE = 12;
const COLS = 3;
const LABEL_SIZE = 2; // in
const H_MARGIN = 0.875; // in
const V_MARGIN = 0.9375; // in
const GUTTER = 0.375; // in
const PITCH = LABEL_SIZE + GUTTER; // 2.375in

const OFFSET_KEY = 'nexus.labelCalibration';

function chunk<T>(list: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size));
  return pages;
}

function cellStyle(index: number, offsetX: number, offsetY: number): React.CSSProperties {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  return {
    position: 'absolute',
    width: `${LABEL_SIZE}in`,
    height: `${LABEL_SIZE}in`,
    left: `${H_MARGIN + col * PITCH + offsetX}in`,
    top: `${V_MARGIN + row * PITCH + offsetY}in`,
    overflow: 'hidden',
  };
}

export function PrintQRLabelsDialog({ items, categories }: PrintQRLabelsDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [printMode, setPrintMode] = useState<'labels' | 'alignment' | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OFFSET_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setOffsetX(Number(parsed.x) || 0);
        setOffsetY(Number(parsed.y) || 0);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistOffsets = (x: number, y: number) => {
    setOffsetX(x);
    setOffsetY(y);
    try {
      localStorage.setItem(OFFSET_KEY, JSON.stringify({ x, y }));
    } catch {
      /* ignore */
    }
  };

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.qr_code.toLowerCase().includes(q);
      const matchesCategory = category === 'all' || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, category]);

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every(item => selectedIds.includes(item.id));

  const toggleItem = (id: string, checked: boolean) => {
    setSelectedIds(prev => (checked ? [...new Set([...prev, id])] : prev.filter(i => i !== id)));
  };

  const toggleAllVisible = (checked: boolean) => {
    const visibleIds = visibleItems.map(i => i.id);
    setSelectedIds(prev =>
      checked
        ? [...new Set([...prev, ...visibleIds])]
        : prev.filter(id => !visibleIds.includes(id))
    );
  };

  const doPrint = (mode: 'labels' | 'alignment') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 100);
  };

  const pages = chunk(selectedItems, LABELS_PER_PAGE);

  const printCss = `
    .qr-print-root { display: none; }
    @media print {
      @page { size: letter; margin: 0; }
      body * { visibility: hidden !important; }
      .qr-print-root, .qr-print-root * { visibility: visible !important; }
      .qr-print-root {
        display: block !important;
        position: absolute;
        left: 0;
        top: 0;
        background: #fff;
        color: #000;
      }
      .qr-page {
        position: relative;
        width: 8.5in;
        height: 11in;
        page-break-after: always;
        break-after: page;
      }
      .qr-page:last-child { page-break-after: auto; break-after: auto; }
    }
  `;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print QR Labels</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Print QR Labels</DialogTitle>
            <DialogDescription>
              Avery 94107 — 2" × 2" square labels, 12 per US Letter sheet (3 across × 4 down).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or QR code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-labels"
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                />
                <Label htmlFor="select-all-labels" className="cursor-pointer">
                  Select all {visibleItems.length} shown
                </Label>
              </div>
              <div className="text-muted-foreground">
                {selectedIds.length} label(s) · {Math.ceil(selectedIds.length / LABELS_PER_PAGE)} sheet(s)
                {selectedIds.length > 0 && (
                  <Button variant="link" size="sm" onClick={() => setSelectedIds([])}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 border border-border rounded-lg divide-y divide-border mt-2">
            {visibleItems.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No items match your filters.</p>
            ) : (
              visibleItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50"
                >
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={(checked) => toggleItem(item.id, checked === true)}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{item.name}</span>
                    <span className="block text-xs text-muted-foreground font-mono">
                      {item.qr_code} · {item.category}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="flex-shrink-0 space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="offset-x" className="text-xs">X offset (in)</Label>
                <Input
                  id="offset-x"
                  type="number"
                  step="0.01"
                  value={offsetX}
                  onChange={(e) => persistOffsets(parseFloat(e.target.value) || 0, offsetY)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="offset-y" className="text-xs">Y offset (in)</Label>
                <Input
                  id="offset-y"
                  type="number"
                  step="0.01"
                  value={offsetY}
                  onChange={(e) => persistOffsets(offsetX, parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => doPrint('alignment')}>
                Print Alignment Test
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={selectedIds.length === 0}
                onClick={() => doPrint('labels')}
              >
                <Printer className="h-4 w-4" />
                Print {selectedIds.length || ''} Labels
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {createPortal(
        <>
          <style>{printCss}</style>
          <div className="qr-print-root">
            {printMode === 'alignment' && (
              <div className="qr-page">
                {Array.from({ length: LABELS_PER_PAGE }).map((_, index) => (
                  <div
                    key={index}
                    style={{
                      ...cellStyle(index, offsetX, offsetY),
                      border: '1px dashed #000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10pt',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    Label {index + 1}
                  </div>
                ))}
              </div>
            )}
            {printMode === 'labels' &&
              pages.map((page, pageIndex) => (
                <div className="qr-page" key={`page-${pageIndex}`}>
                  {page.map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        ...cellStyle(index, offsetX, offsetY),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.12in',
                        textAlign: 'center',
                        fontFamily: 'sans-serif',
                      }}
                    >
                      <QRCodeSVG value={item.qr_code} size={110} level="M" />
                      <div
                        style={{
                          fontSize: '7.5pt',
                          fontWeight: 600,
                          lineHeight: 1.1,
                          marginTop: '0.05in',
                          maxWidth: '1.7in',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: '6pt', fontFamily: 'monospace' }}>
                        {item.qr_code}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
