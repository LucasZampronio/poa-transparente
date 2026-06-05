import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { type MapPoint, type Sector, type MapCategory } from '../services/api';

type MapPanelProps = {
  points: MapPoint[];
  viewMode: 'INFRA' | 'HEALTH' | 'SECURITY';
  loading: boolean;
  sectors?: Sector[];
  categories?: MapCategory[];
  selectedSector?: string | null;
  selectedCategories?: string[];
  onSelectSector?: (sector: string | null) => void;
  onToggleCategory?: (category: string) => void;
  onPointClick?: (point: MapPoint) => void;
  focusPoint?: { lat: number; lng: number; description?: string } | null;
};

const ICONS: Record<string, string> = {
  'SAUDE': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  'EDUCACAO': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  'URBANISMO': '<path d="M2 22h20"/><path d="M6 18v-7a2 2 0 0 1 2-2h8a2 2 0 0 1 2-2v7"/><path d="M9 18v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><path d="M12 9V5"/><path d="M12 3v2"/>',
  'SANEAMENTO': '<path d="M11 7a6 6 0 0 0-6 6c0 3.3 2.7 6 6 6s6-2.7 6-6a6 6 0 0 0-6-6Z"/><path d="M12.9 11.1 11 13l-1.9-1.9"/><path d="m11 13 1.9 1.9"/><path d="M11 13 9.1 14.9"/><path d="M15 3h6"/><path d="M15 7h6"/><path d="M18 3v4"/>',
  'SEGURANCA PUBLICA': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="12" r="3"/>',
  'TRANSPORTE': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.9A2 2 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  'CULTURA': '<path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/><path d="M12 12v10"/><path d="m16 16-4-4-4 4"/>',
  'HABITACAO': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'ADMINISTRACAO': '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  'CONVENIO FEDERAL': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  'DEFAULT': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
};

const typeThemes: Record<string, string> = {
  'OBRA': '#3b82f6',
  'GASTO': '#ef4444',
  'DEFAULT': '#94a3b8'
};

const sectorThemes: Record<string, string> = {
  'SAUDE': '#ef4444',
  'EDUCACAO': '#3b82f6',
  'URBANISMO': '#8b5cf6',
  'SANEAMENTO': '#10b981',
  'SEGURANCA PUBLICA': '#6366f1',
  'TRANSPORTE': '#f97316',
  'CULTURA': '#ec4899',
  'HABITACAO': '#14b8a6',
  'ADMINISTRACAO': '#f59e0b',
  'CONVENIO FEDERAL': '#0ea5e9',
  'DEFAULT': '#94a3b8'
};

export default function MapPanel({ points, viewMode, loading, selectedSector, focusPoint, onPointClick }: MapPanelProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const lastPointsHash = useRef<string>('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-51.21, -30.10],
      zoom: 11,
      attributionControl: false
    });

    map.current.on('load', () => {
      setMapReady(true);
      
      // 1. Contorno Real de Porto Alegre
      map.current!.addSource('poa-outline-source', {
        type: 'geojson',
        data: '/data/poa_boundary.geojson'
      });

      map.current!.addLayer({
        id: 'poa-outline-layer',
        type: 'line',
        source: 'poa-outline-source',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-opacity': 0.8
        }
      });

      // 2. Mosaico de Bairros (Grid)
      map.current!.addSource('bairros-source', {
        type: 'geojson',
        data: '/data/bairros_poa.geojson'
      });

      map.current!.addLayer({
        id: 'bairros-fill',
        type: 'fill',
        source: 'bairros-source',
        layout: { 'visibility': 'none' },
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', viewMode === 'HEALTH' ? 'health_score' : 'security_score'],
            0, '#ef4444',
            25, '#f97316',
            50, '#eab308',
            75, '#22c55e'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.6,
            0.3
          ]
        }
      });

      map.current!.addLayer({
        id: 'bairros-outline',
        type: 'line',
        source: 'bairros-source',
        layout: { 'visibility': 'none' },
        paint: {
          'line-color': '#ffffff',
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            2,
            0.5
          ],
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.8,
            0.2
          ]
        }
      });

      let hoveredId: string | number | null = null;

      map.current!.on('mousemove', 'bairros-fill', (e) => {
        if (e.features && e.features.length > 0) {
          if (hoveredId !== null) {
            map.current!.setFeatureState(
              { source: 'bairros-source', id: hoveredId },
              { hover: false }
            );
          }
          hoveredId = e.features[0].id ?? null;
          if (hoveredId !== null) {
            map.current!.setFeatureState(
              { source: 'bairros-source', id: hoveredId },
              { hover: true }
            );
          }
          map.current!.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current!.on('mouseleave', 'bairros-fill', () => {
        if (hoveredId !== null) {
          map.current!.setFeatureState(
            { source: 'bairros-source', id: hoveredId },
            { hover: false }
          );
        }
        hoveredId = null;
        map.current!.getCanvas().style.cursor = '';
      });

      map.current!.on('click', 'bairros-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const props = feature.properties;
          const name = props.name;
          const totalGasto = props.total_gasto || 0;
          const obras = props.quantidade_obras || 0;

          new maplibregl.Popup({ className: 'custom-popup' })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="padding: 10px; min-width: 150px;">
                <h3 style="margin: 0 0 5px 0; font-size: 14px; color: #fff; font-weight: 900; text-transform: uppercase;">${name}</h3>
                <div style="font-size: 12px; color: #3b82f6; font-weight: bold; margin-bottom: 4px;">
                  Investimento: R$ ${totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div style="font-size: 10px; color: #94a3b8;">
                  Obras mapeadas: ${obras}
                </div>
              </div>
            `)
            .addTo(map.current!);
        }
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !map.current) return;

    if (viewMode !== 'INFRA') {
      map.current.setLayoutProperty('bairros-fill', 'visibility', 'visible');
      map.current.setLayoutProperty('bairros-outline', 'visibility', 'visible');
      
      const scoreKey = viewMode === 'HEALTH' ? 'health_score' : 'security_score';
      map.current.setPaintProperty('bairros-fill', 'fill-color', [
        'interpolate',
        ['linear'],
        ['get', scoreKey],
        0, '#ef4444',
        25, '#f97316',
        50, '#eab308',
        75, '#22c55e'
      ]);

      markers.current.forEach(m => m.remove());
      markers.current = [];
    } else {
      map.current.setLayoutProperty('bairros-fill', 'visibility', 'none');
      map.current.setLayoutProperty('bairros-outline', 'visibility', 'none');
    }
  }, [mapReady, viewMode]);

  useEffect(() => {
    if (mapReady && map.current && focusPoint) {
      map.current.flyTo({
        center: [focusPoint.lng, focusPoint.lat],
        zoom: 15,
        essential: true,
        duration: 2000
      });
    }
  }, [mapReady, focusPoint]);

  useEffect(() => {
    if (!mapReady || !map.current || viewMode !== 'INFRA') return;

    const hasPoints = Array.isArray(points) && points.length > 0;
    const currentHash = hasPoints 
      ? `${points.length}-${points[0]?.process_number || ''}-${selectedSector || 'all'}`
      : 'empty';
    
    if (currentHash !== lastPointsHash.current) {
      lastPointsHash.current = currentHash;
      markers.current.forEach(m => m.remove());
      markers.current = [];

      if (!hasPoints) return;

      const validPoints = points.filter(p => 
        p && p.latitude != null && p.longitude != null && 
        !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude))
      );
      
      validPoints.forEach((point) => {
        const baseLat = Number(point.latitude);
        const baseLng = Number(point.longitude);
        const jitterLat = (Math.random() - 0.5) * 0.0005;
        const jitterLng = (Math.random() - 0.5) * 0.0005;
        const lat = baseLat + jitterLat;
        const lng = baseLng + jitterLng;
        
        const isObra = (point as any).type === 'OBRA';
        const color = isObra ? typeThemes['OBRA'] : (sectorThemes[point.sector] || sectorThemes['DEFAULT']);
        const iconPath = isObra ? ICONS['URBANISMO'] : (ICONS[point.sector] || ICONS['DEFAULT']);

        const el = document.createElement('div');
        el.className = 'marker-wrapper';
        const visual = document.createElement('div');
        visual.style.width = isObra ? '32px' : '26px';
        visual.style.height = isObra ? '32px' : '26px';
        visual.style.backgroundColor = color;
        visual.style.borderRadius = isObra ? '12px' : '8px';
        visual.style.border = isObra ? '3px solid white' : '2px solid rgba(255,255,255,0.6)';
        visual.style.boxShadow = `0 0 20px ${color}55`;
        visual.style.display = 'flex';
        visual.style.alignItems = 'center';
        visual.style.justifyContent = 'center';
        visual.style.cursor = 'pointer';
        visual.style.color = 'white';
        visual.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        visual.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${isObra ? 20 : 16}" height="${isObra ? 20 : 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">${iconPath}</svg>`;
        el.appendChild(visual);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map.current!);

        visual.addEventListener('mouseenter', () => { 
          visual.style.transform = 'scale(1.4) translateY(-4px)';
          el.style.zIndex = '1000';
        });
        visual.addEventListener('mouseleave', () => { 
          visual.style.transform = 'scale(1) translateY(0)';
          el.style.zIndex = '1';
        });
        visual.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onPointClick) onPointClick(point);
        });

        markers.current.push(marker);
      });

      if (validPoints.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        validPoints.forEach(p => bounds.extend([Number(p.longitude), Number(p.latitude)]));
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
      }
    }
  }, [mapReady, points, selectedSector, viewMode, onPointClick]);

  return (
    <div className="absolute inset-0 z-0 bg-[#0a0b0d]">
      <div ref={mapContainer} className="h-full w-full" />
      {loading && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}