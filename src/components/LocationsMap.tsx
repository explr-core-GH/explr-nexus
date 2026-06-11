import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '@/hooks/useLocations';
import { InventoryItem } from '@/hooks/useInventoryDB';
import { useEducatorLocations, EducatorLocation } from '@/hooks/useEducatorLocations';
import type { PartnerSchool } from '@/hooks/usePartnerSchools';

interface LocationsMapProps {
  locations: Location[];
  items: InventoryItem[];
  schools?: PartnerSchool[];
  onLocationClick?: (location: Location) => void;
  onSchoolClick?: (school: PartnerSchool) => void;
}

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create colored marker icons
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

export function LocationsMap({ locations, items, schools = [], onLocationClick, onSchoolClick }: LocationsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { educatorLocations } = useEducatorLocations(items);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4); // Center of US
    mapInstanceRef.current = map;

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for locations with coordinates
    const bounds: L.LatLngExpression[] = [];

    // Equipment locations
    locations.forEach((location) => {
      if (location.latitude && location.longitude) {
        // Get items at this location
        const locationItems = items.filter(item => item.location_id === location.id);
        const itemCount = locationItems.length;
        
        // Determine marker color based on item statuses
        const availableCount = locationItems.filter(i => i.status === 'available').length;
        const checkedOutCount = locationItems.filter(i => i.status === 'checked-out').length;
        const maintenanceCount = locationItems.filter(i => i.status === 'maintenance').length;

        let markerColor = 'hsl(var(--muted-foreground))'; // Default gray for no items
        if (itemCount > 0) {
          if (maintenanceCount > 0 && maintenanceCount === itemCount) {
            markerColor = 'hsl(38, 92%, 50%)'; // All maintenance - yellow/orange
          } else if (checkedOutCount > 0 && checkedOutCount === itemCount) {
            markerColor = 'hsl(0, 84%, 60%)'; // All checked out - red
          } else if (availableCount === itemCount) {
            markerColor = 'hsl(142, 71%, 45%)'; // All available - green
          } else {
            markerColor = 'hsl(221, 83%, 53%)'; // Mixed - blue
          }
        }

        const marker = L.marker([location.latitude, location.longitude], {
          icon: createColoredIcon(markerColor),
        }).addTo(map);

        // Create popup content
        const popupContent = `
          <div style="min-width: 150px;">
            <strong>${location.name}</strong>
            <p style="font-size: 12px; color: #666; margin: 4px 0;">${location.address}</p>
            <div style="font-size: 12px; margin-top: 8px;">
              <strong>${itemCount}</strong> item${itemCount !== 1 ? 's' : ''}
              ${itemCount > 0 ? `<br/>
                <span style="color: hsl(142, 71%, 45%);">● ${availableCount} available</span><br/>
                <span style="color: hsl(0, 84%, 60%);">● ${checkedOutCount} checked out</span><br/>
                <span style="color: hsl(38, 92%, 50%);">● ${maintenanceCount} maintenance</span>
              ` : ''}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onLocationClick) {
            onLocationClick(location);
          }
        });

        bounds.push([location.latitude, location.longitude]);
      }
    });

    // Add educator markers (purple) for users with checked-out items
    educatorLocations.forEach((educator: EducatorLocation) => {
      const marker = L.marker([educator.latitude, educator.longitude], {
        icon: createColoredIcon('hsl(271, 91%, 65%)'), // Purple for educators
      }).addTo(map);

      const itemsList = educator.checkedOutItems
        .slice(0, 5)
        .map(item => `• ${item.name}`)
        .join('<br/>');
      
      const moreItems = educator.checkedOutItems.length > 5 
        ? `<br/><em>+${educator.checkedOutItems.length - 5} more...</em>` 
        : '';

      const popupContent = `
        <div style="min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="background: hsl(271, 91%, 65%); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">EDUCATOR</span>
          </div>
          <strong>${educator.full_name}</strong>
          ${educator.organization_name ? `<p style="font-size: 12px; color: #666; margin: 2px 0;">${educator.organization_name}</p>` : ''}
          <p style="font-size: 11px; color: #888; margin: 2px 0;">${educator.organization_address || ''}</p>
          <div style="font-size: 12px; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
            <strong>${educator.checkedOutItems.length}</strong> item${educator.checkedOutItems.length !== 1 ? 's' : ''} checked out:
            <div style="margin-top: 4px; font-size: 11px;">
              ${itemsList}${moreItems}
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      bounds.push([educator.latitude, educator.longitude]);
    });

    // Partner school markers (teal)
    schools.forEach((school) => {
      if (school.latitude == null || school.longitude == null) return;
      const marker = L.marker([school.latitude, school.longitude], {
        icon: createColoredIcon('hsl(173, 80%, 40%)'),
      }).addTo(map);

      const oh = school.ohio_schools;
      const demoLine = oh
        ? `
          <div style="font-size: 11px; margin-top: 6px; border-top: 1px solid #eee; padding-top: 6px;">
            Enrollment: <strong>${oh.total_enrollment?.toLocaleString() ?? '—'}</strong><br/>
            Econ. disadvantaged: <strong>${oh.pct_economically_disadvantaged != null ? Math.round(oh.pct_economically_disadvantaged) + '%' : '—'}</strong>
          </div>`
        : `<div style="font-size: 11px; margin-top: 6px; color: #888;">No Ohio Report Card data</div>`;

      const popupContent = `
        <div style="min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="background: hsl(173, 80%, 40%); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">SCHOOL</span>
          </div>
          <strong>${school.name}</strong>
          ${school.address ? `<p style="font-size: 11px; color: #888; margin: 2px 0;">${school.address}</p>` : ''}
          ${demoLine}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => onSchoolClick?.(school));
      bounds.push([school.latitude, school.longitude]);
    });

    // Fit map to bounds if we have markers
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  }, [locations, items, onLocationClick, onSchoolClick, educatorLocations, schools]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-[400px] rounded-lg border overflow-hidden"
      style={{ zIndex: 0 }}
    />
  );
}
