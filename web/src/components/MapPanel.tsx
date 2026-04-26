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
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
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
      const lat = Number(point.latitude);
      const lng = Number(point.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const color = sectorThemes[point.sector] || sectorThemes['DEFAULT'];
      const iconPath = ICONS[point.sector] || ICONS['DEFAULT'];
      
      const el = document.createElement('div');
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.backgroundColor = color;
      el.style.borderRadius = '10px';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.style.color = 'white';

      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">${iconPath}</svg>`;

      const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map.current!);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.current!
          .setLngLat([lng, lat])
          .setHTML(`
            <div style="padding: 15px; font-family: 'Inter', sans-serif;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="background: ${color}20; color: ${color}; padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em;">
                  ${formatLabel(point.sector)}
                </span>
                <span style="color: #94a3b8; font-size: 10px; font-weight: 700;">ID: ${point.process_number}</span>
              </div>
              
              <div style="margin-bottom: 15px;">
                <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Favorecido Receptador</div>
                <strong style="color: #0f172a; font-size: 14px; line-height: 1.3;">${point.company_name}</strong>
              </div>

              <div style="margin-bottom: 15px; background: #f0f9ff; padding: 12px; border-radius: 8px; border: 1px solid #bae6fd;">
                <div style="font-size: 10px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 6px;">Objeto da Despesa (Real)</div>
                <div style="color: #0c4a6e; font-size: 12px; font-weight: 500; line-height: 1.5;">"${point.description_detailed}"</div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                <div>
                  <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Ministério/Órgão</div>
                  <div style="font-size: 11px; font-weight: 600; color: #0f172a;">${point.agency}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Valor Liberado</div>
                  <div style="font-size: 18px; font-weight: 900; color: #0ea5e9;">${formatCurrency(point.contract_value)}</div>
                </div>
              </div>

              <a href="${point.portal_link}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 15px; padding: 10px; background: #0f172a; color: white; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none; transition: opacity 0.2s;">
                 ABRIR NO PORTAL DA TRANSPARÊNCIA
              </a>
            </div>
          `)
          .addTo(map.current!);
      });
      markers.current.push(marker);
    });
  }, [points]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[600px] lg:h-[700px]">
      <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col bg-slate-50/50 max-h-[400px] lg:max-h-none overflow-hidden">
        <div className="p-4 md:p-8 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-xl flex-shrink-0">
              <LayoutGrid size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-tighter">Obras e Investimentos</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Porto Alegre Transparente</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-slate-900 text-white shadow-xl">
             <div className="text-[9px] md:text-[10px] font-black opacity-60 uppercase mb-1 tracking-widest">Fontes de Dados</div>
             <div className="text-xs md:text-sm font-bold leading-tight mb-2 md:mb-4">CGU (Federal) + TCE-RS (Estadual/Mun.)</div>
             <div className="hidden md:block text-[10px] font-medium opacity-80 leading-relaxed">Painel consolidado de recursos aplicados em Porto Alegre, combinando dados do Portal da Transparencia e LicitaCon/TCE.</div>
          </div>
          
          <div className="space-y-2">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Setores Ativos</div>
             <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
               {sectors.map((sector) => (
                  <button 
                    key={sector.name} 
                    onClick={() => onSelectSector(sector.name)} 
                    className="flex-shrink-0 lg:w-full text-left p-3 md:p-5 rounded-2xl md:rounded-3xl bg-white border border-slate-200 hover:border-blue-500 transition-all flex items-center justify-between group gap-3"
                  >
                     <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <LayoutGrid size={16} className="md:w-5 md:h-5" />
                        </div>
                        <span className="text-[10px] md:text-xs font-black text-slate-900 uppercase whitespace-nowrap">{sector.name}</span>
                     </div>
                     <ChevronRight size={16} className="text-slate-200 hidden md:block" />
                  </button>
               ))}
             </div>
          </div>
        </div>

        <div className="p-4 md:p-8 border-t border-slate-200 bg-white">
           <div className="bg-slate-900 rounded-2xl md:rounded-[28px] p-4 md:p-6 text-white shadow-2xl">
              <div className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Total Identificado</div>
              <div className="text-xl md:text-3xl font-black text-blue-400 tracking-tighter">{formatCurrency(totalVisibleValue)}</div>
           </div>
        </div>
      </div>

      <div className="flex-1 relative bg-slate-100 h-[400px] lg:h-auto">
        {loading && <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}
        <div ref={mapContainer} className="h-full w-full" />
      </div>
    </div>
  );
}
