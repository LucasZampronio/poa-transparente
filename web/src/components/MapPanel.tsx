import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatLabel, formatCurrency, type MapPoint, type Sector, type MapCategory } from '../lib/api';

type MapPanelProps = {
  points: MapPoint[];
  loading: boolean;
  sectors?: Sector[];
  categories?: MapCategory[];
  selectedSector?: string | null;
  selectedCategories?: string[];
  onSelectSector?: (sector: string | null) => void;
  onToggleCategory?: (category: string) => void;
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
  'DEFAULT': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
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
  'DEFAULT': '#94a3b8'
};

export default function MapPanel({ points, loading, selectedSector }: MapPanelProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const popup = useRef<maplibregl.Popup | null>(null);
  const lastPointsHash = useRef<string>('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-51.21, -30.03],
      zoom: 11,
      antialias: true
    });

    popup.current = new maplibregl.Popup({ 
      closeButton: true, 
      closeOnClick: true, 
      offset: 20, 
      maxWidth: '350px'
    });

    map.current.on('load', () => {
      setMapReady(true);
    });

    return () => { map.current?.remove(); };
  }, []);

  useEffect(() => {
    if (!mapReady || !map.current) return;

    // Hash mais robusto para detectar mudanças nos dados sem ser pesado demais
    const currentHash = `${points.length}-${points[0]?.process_number || ''}-${points[points.length - 1]?.process_number || ''}`;
    const hasDataChanged = currentHash !== lastPointsHash.current;
    
    if (hasDataChanged) {
      lastPointsHash.current = currentHash;

      // Limpa marcadores anteriores
      markers.current.forEach(m => m.remove());
      markers.current = [];
      popup.current?.remove();

      // Validação robusta de coordenadas (evita filtrar 0 se fosse o caso, embora improvável em POA)
      const validPoints = points.filter(p => p.latitude != null && p.longitude != null && !isNaN(Number(p.latitude)));
      
      validPoints.forEach((point, index) => {
        const baseLat = Number(point.latitude);
        const baseLng = Number(point.longitude);
        
        // JITTERING: Se vários pontos estão na mesma coordenada (ex: mesma secretaria), 
        // espalha eles levemente para que todos sejam clicáveis.
        const jitterLat = (Math.random() - 0.5) * 0.0005;
        const jitterLng = (Math.random() - 0.5) * 0.0005;
        const lat = baseLat + jitterLat;
        const lng = baseLng + jitterLng;
        
        const color = sectorThemes[point.sector] || sectorThemes['DEFAULT'];
        const iconPath = ICONS[point.sector] || ICONS['DEFAULT'];

        // Elemento-raiz (estático para o MapLibre)
        const el = document.createElement('div');
        el.className = 'marker-wrapper';
        
        // Elemento visual (com animações)
        const visual = document.createElement('div');
        visual.style.width = '26px';
        visual.style.height = '26px';
        visual.style.backgroundColor = color;
        visual.style.borderRadius = '8px';
        visual.style.border = '2px solid rgba(255,255,255,0.6)';
        visual.style.boxShadow = `0 0 20px ${color}55`;
        visual.style.display = 'flex';
        visual.style.alignItems = 'center';
        visual.style.justifyContent = 'center';
        visual.style.cursor = 'pointer';
        visual.style.color = 'white';
        // A transição fica APENAS no elemento visual interno
        visual.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        visual.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">${iconPath}</svg>`;

        el.appendChild(visual);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map.current!);

        visual.addEventListener('mouseenter', () => { 
          visual.style.transform = 'scale(1.4) translateY(-4px)';
          visual.style.zIndex = '1000';
        });
        visual.addEventListener('mouseleave', () => { 
          visual.style.transform = 'scale(1) translateY(0)';
          visual.style.zIndex = '1';
        });

        visual.addEventListener('click', (e) => {
          e.stopPropagation();
          const workYear = new Date(point.reference_date).getFullYear();
          
          popup.current!
            .setLngLat([lng, lat])
            .setHTML(`
              <div class="custom-popup-content" style="padding: 0; font-family: 'Inter', sans-serif; width: 320px; background: #0f1115; color: #cbd5e1; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);">
                <div style="background: linear-gradient(to bottom right, ${color}33, transparent); padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="background: ${color}; color: white; padding: 4px 10px; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">
                      ${formatLabel(point.sector)}
                    </span>
                    <span style="color: #64748b; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace;">ANO_${workYear}</span>
                  </div>
                  <h3 style="color: white; font-size: 15px; line-height: 1.4; font-weight: 800; margin: 0; letter-spacing: -0.02em;">${point.description_detailed}</h3>
                  <div style="margin-top: 8px; font-size: 10px; font-weight: 600; color: #64748b;">
                    ${point.technical_family} <span style="opacity: 0.4;">•</span> ${point.technical_subfamily}
                  </div>
                </div>

                <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
                  <div>
                    <div style="font-size: 9px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Execução e Fiscalização</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                      <div style="font-size: 11px; font-weight: 700; color: white; margin-bottom: 2px;">${point.company_name}</div>
                      <div style="font-size: 9px; color: #64748b; font-family: 'JetBrains Mono', monospace; margin-bottom: 8px;">CNPJ: ${point.beneficiary_id}</div>
                      
                      <div style="padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 8px; align-items: center;">
                        <div style="width: 20px; height: 20px; background: ${color}22; color: ${color}; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px;">👤</div>
                        <div>
                          <div style="font-size: 10px; font-weight: 700; color: #e2e8f0;">Fiscal: ${point.fiscal_name || 'Não informado'}</div>
                          <div style="font-size: 8px; color: #64748b;">${point.fiscal_info || 'Aguardando designação'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style="font-size: 9px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Localização e Exercício</div>
                    <div style="display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 12px;">
                      <div style="background: #1e293b; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: ${color}; font-size: 14px;">📍</div>
                      <div>
                        <div style="font-size: 11px; font-weight: 700; color: #e2e8f0; line-height: 1.2;">${point.address || point.district}</div>
                        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Ano de Exercício: ${workYear}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style="background: #161b22; padding: 16px; border-radius: 16px; border: 1px solid ${color}33;">
                      <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Valor Contratado</div>
                      <div style="font-size: 24px; font-weight: 900; color: white; letter-spacing: -0.04em;">${formatCurrency(point.contract_value)}</div>
                    </div>
                  </div>

                  <a href="${point.portal_link}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: white; color: #0f172a; border-radius: 12px; font-size: 10px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; width: 100%; transition: opacity 0.2s;">
                    Ver Documentação
                  </a>
                </div>
              </div>
            `)
            .addTo(map.current!);
        });
        markers.current.push(marker);
      });

      // Só faz o fitBounds se o setor mudou ou se é a primeira carga
      if (validPoints.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        validPoints.forEach(p => bounds.extend([Number(p.longitude), Number(p.latitude)]));
        map.current.fitBounds(bounds, { padding: 120, maxZoom: 15, duration: 1500 });
      }
    }
  }, [mapReady, points, selectedSector]);

  return (
    <div className="absolute inset-0 z-0 bg-[#0a0b0d]">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Engine Status Overlay */}
      <div className="absolute top-20 left-6 z-50 bg-black/60 border border-white/5 p-4 rounded-3xl backdrop-blur-2xl shadow-2xl pointer-events-none min-w-[180px]">
        <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3 border-b border-white/5 pb-2">Spatial_Engine</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Visible_Nodes</span>
            <span className="text-[9px] font-black text-white bg-white/10 px-2 py-0.5 rounded">{points.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-500 uppercase">GPU_Accel</span>
            <span className="text-[9px] font-black text-green-500 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> ACTIVE
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
