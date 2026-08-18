import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';

interface MapLocation {
  name: string;
  lat: number;
  lng: number;
  total: number;
  available: number;
  checked_out: number;
  maintenance: number;
}
interface MapSummary {
  total: number;
  available: number;
  out: number;
}
interface MapData {
  locations: MapLocation[];
  summary: MapSummary;
}

const createColoredIcon = (color: string) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color:${color};width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

function markerColor(l: MapLocation): string {
  if (l.total === 0) return 'hsl(215, 16%, 47%)';
  if (l.maintenance === l.total) return 'hsl(38, 92%, 50%)';
  if (l.checked_out === l.total) return 'hsl(0, 84%, 60%)';
  if (l.available === l.total) return 'hsl(142, 71%, 45%)';
  return 'hsl(221, 83%, 53%)';
}

/**
 * Anonymous, read-only live map for the public landing page. Pulls aggregated
 * data from the public_equipment_map() RPC (library sites + totals only — no
 * names, no off-site pins) and polls so it stays current.
 */
export function PublicEquipmentMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [data, setData] = useState<MapData | null>(null);

  const load = async () => {
    // RPC not yet in generated types; cast for this call.
    const { data: result, error } = await (supabase as unknown as {
      rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>;
    }).rpc('public_equipment_map');
    if (!error && result) setData(result as MapData);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000); // keep it live
    return () => clearInterval(id);
  }, []);

  // Init map once.
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView([40.5, -81.5], 7);
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render markers when data changes.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !data) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const bounds: L.LatLngExpression[] = [];
    data.locations.forEach((l) => {
      if (l.lat == null || l.lng == null) return;
      const marker = L.marker([l.lat, l.lng], { icon: createColoredIcon(markerColor(l)) }).addTo(map);
      marker.bindPopup(`
        <div style="min-width:150px;">
          <strong>${l.name}</strong>
          <div style="font-size:12px;margin-top:6px;">
            <strong>${l.total}</strong> item${l.total !== 1 ? 's' : ''}
            ${l.total > 0 ? `<br/>
              <span style="color:hsl(142,71%,45%);">● ${l.available} available</span><br/>
              <span style="color:hsl(0,84%,60%);">● ${l.checked_out} checked out</span><br/>
              <span style="color:hsl(38,92%,50%);">● ${l.maintenance} maintenance</span>` : ''}
          </div>
        </div>`);
      bounds.push([l.lat, l.lng]);
    });

    if (bounds.length > 0) map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 12 });
  }, [data]);

  const s = data?.summary;

  return (
    <div className="space-y-3">
      {s && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{s.total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Items in the library</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: 'hsl(142, 71%, 40%)' }}>{s.available.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Available now</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: 'hsl(221, 83%, 53%)' }}>{s.out.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Out in the field</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-[420px] rounded-xl border border-border overflow-hidden" style={{ zIndex: 0 }} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(142, 71%, 45%)' }} /> All available</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(221, 83%, 53%)' }} /> Mixed</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(0, 84%, 60%)' }} /> All checked out</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(38, 92%, 50%)' }} /> Maintenance</span>
      </div>
    </div>
  );
}
