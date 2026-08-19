import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinned, Printer, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface OutRow {
  item_name: string;
  qr_code: string;
  category: string | null;
  checked_out_at: string | null;
  holder: string;
  school: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
}

const greenIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:#1FE066;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,.3);"></div>`,
  iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24],
});

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString() : '');

export function ItemsOutDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<OutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => { select: (c: string) => Promise<{ data: OutRow[] | null; error: unknown }> };
      }).from('items_out_map').select('*');
      if (!error && data) {
        setRows([...data].sort((a, b) => (a.school ?? 'zzz').localeCompare(b.school ?? 'zzz') || a.item_name.localeCompare(b.item_name)));
      }
      setLoading(false);
    })();
  }, [open]);

  // Group mapped items by school.
  const schools = useMemo(() => {
    const map = new Map<string, { school: string; lat: number; lng: number; items: OutRow[] }>();
    for (const r of rows) {
      if (r.latitude == null || r.longitude == null || !r.school) continue;
      const key = r.school;
      if (!map.has(key)) map.set(key, { school: r.school, lat: Number(r.latitude), lng: Number(r.longitude), items: [] });
      map.get(key)!.items.push(r);
    }
    return [...map.values()];
  }, [rows]);

  const unmapped = rows.filter(r => r.latitude == null || r.longitude == null || !r.school);

  // Render the map when data + container are ready.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (!mapRef.current) return;
      if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current).setView([41.45, -81.68], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstance.current);
      }
      const map = mapInstance.current;
      map.invalidateSize();
      map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l); });
      const bounds: L.LatLngExpression[] = [];
      for (const s of schools) {
        const list = s.items.map(i => `• ${i.item_name} <span style="color:#888">— ${i.holder}</span>`).join('<br/>');
        L.marker([s.lat, s.lng], { icon: greenIcon }).addTo(map).bindPopup(
          `<div style="min-width:200px"><strong>${s.school}</strong><div style="font-size:12px;margin-top:4px"><strong>${s.items.length}</strong> item${s.items.length !== 1 ? 's' : ''} out<div style="margin-top:4px;font-size:11px">${list}</div></div></div>`
        );
        bounds.push([s.lat, s.lng]);
      }
      if (bounds.length) map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 13 });
    }, 200);
    return () => clearTimeout(t);
  }, [open, schools]);

  // Tear down the map when the dialog closes so it re-inits cleanly next open.
  useEffect(() => {
    if (open) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
  }, [open]);

  const exportExcel = () => {
    const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const head = ['Item', 'QR Code', 'Category', 'Checked out to', 'Location / School', 'Since'];
    const body = rows.map(r => [r.item_name, r.qr_code, r.category ?? '', r.holder, r.school ?? '(no school on file)', fmtDate(r.checked_out_at)]);
    const html = `<table><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${body.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    const blob = new Blob([`<html><head><meta charset="utf-8"></head><body>${html}</body></html>`], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `items-out-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MapPinned className="h-4 w-4" />
          <span className="hidden sm:inline">Items Out</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-accent" />
            Where equipment is out right now
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${rows.length} item${rows.length !== 1 ? 's' : ''} out across ${schools.length} location${schools.length !== 1 ? 's' : ''}`}
            {!loading && unmapped.length > 0 && ` · ${unmapped.length} not mapped (no school on file)`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportExcel} disabled={rows.length === 0}>
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => window.print()} disabled={rows.length === 0}>
              <Printer className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>

        <div id="items-out-report" className="space-y-4">
          <h2 className="hidden print:block text-xl font-bold">EXPLR Nexus — Equipment currently out</h2>
          {loading ? (
            <div className="flex items-center justify-center h-[360px] text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div ref={mapRef} className="w-full h-[360px] rounded-lg border overflow-hidden" style={{ zIndex: 0 }} />
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="text-left p-2 font-semibold">Item</th>
                      <th className="text-left p-2 font-semibold">Checked out to</th>
                      <th className="text-left p-2 font-semibold">Location / School</th>
                      <th className="text-left p-2 font-semibold hidden sm:table-cell">Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2">
                          <span className="font-medium">{r.item_name}</span>
                          <span className="block text-xs text-muted-foreground font-mono">{r.qr_code}</span>
                        </td>
                        <td className="p-2">{r.holder}</td>
                        <td className="p-2">{r.school ?? <span className="text-muted-foreground italic">No school on file</span>}</td>
                        <td className="p-2 hidden sm:table-cell text-muted-foreground">{fmtDate(r.checked_out_at)}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nothing is checked out right now.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DialogContent>

      <style>{`
        @media print {
          @page { margin: 12mm; }
          /* Collapse the whole app so only the report prints (no blank pages). */
          #root { display: none !important; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #items-out-report, #items-out-report * { visibility: visible !important; }
          /* Neutralize the Radix dialog wrapper: without this its fixed
             position + transform + clipping push the report off the page. */
          [role="dialog"] {
            position: static !important;
            transform: none !important;
            inset: auto !important;
            max-height: none !important;
            height: auto !important;
            max-width: none !important;
            width: 100% !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          #items-out-report { position: static !important; }
          #items-out-report .leaflet-container { height: 320px !important; }
          [data-sonner-toaster], [data-radix-dialog-overlay] { display: none !important; }
        }
      `}</style>
    </Dialog>
  );
}
