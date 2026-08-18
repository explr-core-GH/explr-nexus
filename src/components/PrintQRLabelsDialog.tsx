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

// Avery 6570: US Letter, 32 labels per sheet (4 across x 8 down), 1.75in x 1.25in.
// Top/bottom margin 0.5in, side margins 0.46875in, no vertical gap between rows.
const COLS = 4;
const ROWS = 8;
const LABELS_PER_PAGE = COLS * ROWS; // 32
const LABEL_W = 1.75; // in
const LABEL_H = 1.25; // in
const TOP_MARGIN = 0.5; // in
const LEFT_MARGIN = 0.46875; // in
const H_PITCH = 1.9375; // in (label 1.75 + 0.1875 column gap)
const V_PITCH = 1.25; // in (rows touch, no gap)

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
    boxSizing: 'border-box',
    width: `${LABEL_W}in`,
    height: `${LABEL_H}in`,
    left: `${LEFT_MARGIN + col * H_PITCH + offsetX}in`,
    top: `${TOP_MARGIN + row * V_PITCH + offsetY}in`,
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

  // Print isolation via display:none on everything else — NOT visibility:hidden.
  // visibility:hidden leaves the whole app laid out (invisible but occupying
  // space), which pushes out a stack of trailing blank pages. display:none
  // collapses it so the sheet(s) print exactly. Also overrides the global
  // grant-report print rule in index.css (body * { visibility: hidden }).
  const printCss = `
    .qr-print-root { display: none; }
    @media print {
      @page { size: letter; margin: 0 !important; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      body > *:not(.qr-print-root) { display: none !important; }
      .qr-print-root {
        display: block !important;
        position: static !important;
        background: #fff;
        color: #000;
      }
      .qr-print-root * { visibility: visible !important; }
      .qr-page {
        position: relative;
        width: 8.5in;
        height: 11in;
        overflow: hidden;
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
              Avery 6570 — 1¾" × 1¼" labels, 32 per US Letter sheet (4 across × 8 down).
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
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '0.07in',
                        padding: '0.07in',
                        fontFamily: 'sans-serif',
                      }}
                    >
                      <QRCodeSVG value={item.qr_code} size={96} level="M" />
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '7pt',
                            fontWeight: 700,
                            lineHeight: 1.12,
                            overflow: 'hidden',
                            wordBreak: 'break-word',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            fontSize: '6pt',
                            fontFamily: 'monospace',
                            marginTop: '0.03in',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.qr_code}
                        </div>
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
