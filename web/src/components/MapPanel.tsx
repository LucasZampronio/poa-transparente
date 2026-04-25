import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatLabel, formatCurrency, type MapCategory, type MapPoint, type Sector } from '../lib/api';
import { cn } from '../lib/utils';
import { ChevronLeft, ChevronRight, LayoutGrid, MapPin } from 'lucide-react';

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

const sectorThemes: Record<string, { color: string; char: string }> = {
  'SAUDE': { color: '#ef4444', char: 'H' },
  'EDUCACAO': { color: '#3b82f6', char: 'E' },
  'TRANSPORTE': { color: '#f59e0b', char: 'T' },
  'SEGURANCA PUBLICA': { color: '#6366f1', char: 'S' },
  'ADMINISTRACAO': { color: '#64748b', char: 'A' },
  'URBANISMO': { color: '#10b981', char: 'U' },
  'DEFAULT': { color: '#94a3b8', char: 'i' }
};

export default function MapPanel({ points, sectors, categories, selectedSector, selectedCategories, loading, onSelectSector, onToggleCategory }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  
  const totalVisibleValue = points.reduce((total, point) => total + Number(point.contract_value), 0);

  // Inicializa o mapa uma única vez
  useEffect(() => {
    if (!mapContainer.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [-51.23, -30.03],
      zoom: 11,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Atualiza os marcadores de forma eficiente
  useEffect(() => {
    if (!map.current) return;

    // Limpa marcadores anteriores
    markers.current.forEach(m => m.remove());
    markers.current = [];

    // Se tivermos muitos pontos, vamos amostragem para não travar
    // Clusterização via Marcadores HTML é pesada, então limitamos a exibição no mapa
    const displayPoints = points.slice(0, 800);

    displayPoints.forEach((point) => {
      const lat = Number(point.latitude);
      const lng = Number(point.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const theme = sectorThemes[point.sector] || sectorThemes['DEFAULT'];
      
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.backgroundColor = theme.color;
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontSize = '10px';
      el.style.fontWeight = '900';
      el.style.cursor = 'pointer';
      el.innerText = theme.char;

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
        <div style="padding: 10px; min-width: 180px; font-family: sans-serif;">
          <div style="background: ${theme.color}15; color: ${theme.color}; padding: 2px 8px; border-radius: 99px; font-size: 9px; font-weight: 800; margin-bottom: 6px; display: inline-block; border: 1px solid ${theme.color}30;">
            ${formatLabel(point.sector)}
          </div>
          <strong style="display:block; color:#0f172a; font-size:13px; margin-bottom:4px; line-height:1.2;">${point.company_name}</strong>
          <div style="background:#f8fafc; padding:6px; border-radius:4px; border:1px solid #e2e8f0; margin-top:8px;">
            <div style="font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase;">Investimento</div>
            <div style="font-size:15px; font-weight:900; color:#0f172a;">${formatCurrency(point.contract_value)}</div>
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);
      
      markers.current.push(marker);
    });
  }, [points]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col lg:flex-row h-[700px]">
      {/* Sidebar */}
      <div className="w-full lg:w-85 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
              <LayoutGrid size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tighter">Investimentos</h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Porto Alegre</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {selectedSector ? (
            <>
              <button onClick={() => onSelectSector(null)} className="flex items-center gap-2 text-[10px] font-black text-blue-600 mb-6 hover:translate-x-1 transition-transform uppercase">
                <ChevronLeft size={14} /> Voltar
              </button>
              <div className="p-4 rounded-xl bg-white border border-blue-100 shadow-sm mb-4">
                <div className="text-[9px] font-black text-blue-400 uppercase mb-0.5">Eixo Ativo</div>
                <div className="text-lg font-black text-slate-900">{formatLabel(selectedSector)}</div>
              </div>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const isActive = selectedCategories.includes(cat.category);
                  return (
                    <button
                      key={cat.category}
                      onClick={() => onToggleCategory(cat.category)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-between group",
                        isActive ? "bg-blue-600 border-blue-600 text-white" : "bg-white text-slate-600 border-slate-100 hover:border-blue-200"
                      )}
                    >
                      <span className="truncate pr-2">{formatLabel(cat.category)}</span>
                      <span className={cn("text-[10px] font-black px-2 py-0.5 rounded", isActive ? "bg-blue-500" : "bg-slate-100 text-slate-400")}>{cat.expenses_count}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {sectors.map((sector) => {
                const theme = sectorThemes[sector.name] || sectorThemes['DEFAULT'];
                return (
                  <button
                    key={sector.name}
                    onClick={() => onSelectSector(sector.name)}
                    className="w-full text-left p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: theme.color }} />
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600">{formatLabel(sector.name)}</span>
                      <ChevronRight size={14} className="text-slate-300" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{sector.count} reg.</span>
                      <span className="text-xs font-black text-slate-900">{formatCurrency(sector.total)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-white">
           <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Total no Eixo</div>
              <div className="text-2xl font-black text-blue-400">{formatCurrency(totalVisibleValue)}</div>
              <div className="mt-2 text-[10px] font-bold text-slate-500 uppercase">{points.length.toLocaleString()} pontos</div>
           </div>
        </div>
      </div>

      <div className="flex-1 relative bg-slate-100">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={mapContainer} className="h-full w-full" />
      </div>
    </div>
  );
}
