import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatLabel, formatCurrency, type MapCategory, type MapPoint, type Sector } from '../lib/api';
import { cn } from '../lib/utils';
import { ChevronLeft, ChevronRight, LayoutGrid, ExternalLink } from 'lucide-react';

type Props = {
  points: MapPoint[];
  sectors: Sector[];
  categories: MapCategory[];
  selectedSector: string | null;
  selectedCategories: string[];
  loading: boolean;
  onSelectSector: (sector: string | null) => void;
  onToggleCategory: (category: string) => void;
};

const ICONS: Record<string, string> = {
  'CONVENIOS FEDERAIS': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="12" r="3"/>',
  'SAUDE': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  'EDUCACAO': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  'URBANISMO': '<path d="M2 22h20"/><path d="M6 18v-7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7"/><path d="M9 18v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><path d="M12 9V5"/><path d="M12 3v2"/>',
  'SANEAMENTO': '<path d="M11 7a6 6 0 0 0-6 6c0 3.3 2.7 6 6 6s6-2.7 6-6a6 6 0 0 0-6-6Z"/><path d="M12.9 11.1 11 13l-1.9-1.9"/><path d="m11 13 1.9 1.9"/><path d="M11 13 9.1 14.9"/><path d="M15 3h6"/><path d="M15 7h6"/><path d="M18 3v4"/>',
  'DEFAULT': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
};

const sectorThemes: Record<string, string> = {
  'CONVENIOS FEDERAIS': '#0ea5e9',
  'SAUDE': '#ef4444',
  'EDUCACAO': '#3b82f6',
  'URBANISMO': '#8b5cf6',
  'SANEAMENTO': '#10b981',
  'DEFAULT': '#94a3b8'
};

export default function MapPanel({ points, sectors, categories, selectedSector, selectedCategories, loading, onSelectSector, onToggleCategory }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const popup = useRef<maplibregl.Popup | null>(null);
  
  const totalVisibleValue = points.reduce((total, point) => total + Number(point.contract_value), 0);

  useEffect(() => {
    if (!mapContainer.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-51.23, -30.03],
      zoom: 12,
    });
    popup.current = new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 20, maxWidth: '350px' });
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach(m => m.remove());
    markers.current = [];
    popup.current?.remove();

    points.forEach((point) => {
      if (!point.latitude || !point.longitude) return;
      
      const lat = Number(point.latitude);
      const lng = Number(point.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const color = sectorThemes[point.sector] || sectorThemes['DEFAULT'];
      const iconPath = ICONS[point.sector] || ICONS['DEFAULT'];
      
      const el = document.createElement('div');
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.backgroundColor = color;
      el.style.borderRadius = '6px';
      el.style.border = '1px solid rgba(255,255,255,0.5)';
      el.style.boxShadow = `0 0 15px ${color}66`;
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.style.color = 'white';

      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">${iconPath}</svg>`;

      const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map.current!);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.current!
          .setLngLat([lng, lat])
          .setHTML(`
            <div style="padding: 24px; font-family: 'Inter', sans-serif; width: 320px; background: #0f172a; color: white; border-radius: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 99px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">
                  ${formatLabel(point.sector)}
                </span>
                <span style="color: #64748b; font-size: 10px; font-weight: 700; font-family: monospace;">#${point.process_number}</span>
              </div>
              
              <div style="margin-bottom: 20px;">
                <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;">Objeto do Investimento</div>
                <strong style="color: white; font-size: 15px; line-height: 1.4; display: block; margin-bottom: 12px; font-weight: 700;">${point.description_detailed}</strong>
                
                <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                  <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Favorecido</div>
                  <div style="font-size: 13px; font-weight: 800; color: white; line-height: 1.2;">${point.company_name}</div>
                  <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace;">CNPJ: ${point.beneficiary_id}</div>
                </div>
              </div>

              <div style="margin-bottom: 20px; padding-left: 4px;">
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Localização</div>
                  <div style="font-size: 12px; font-weight: 600; color: #e2e8f0; display: flex; align-items: flex-start; gap: 6px;">
                    <span style="opacity: 0.7;">📍</span> ${point.address || point.district}
                  </div>
                </div>

                <div style="background: #1e293b; padding: 16px; border-radius: 16px; border-left: 4px solid ${color};">
                  <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Valor Contratado</div>
                  <div style="font-size: 24px; font-weight: 900; color: white; letter-spacing: -0.02em;">${formatCurrency(point.contract_value)}</div>
                </div>
              </div>

              <a href="${point.portal_link}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background: white; color: #0f172a; border-radius: 14px; font-size: 11px; font-weight: 900; text-decoration: none; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em;">
                 Visualizar no Portal <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            </div>
          `)
          .addTo(map.current!);
      });
      markers.current.push(marker);
    });
  }, [points]);

  return (
    <div className="absolute inset-0 z-0">
      <div ref={mapContainer} className="h-full w-full" />
      {loading && (
        <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
