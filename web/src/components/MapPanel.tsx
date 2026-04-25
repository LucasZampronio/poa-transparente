import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatCategoryLabel, formatCurrency, type MapCategory, type MapPoint } from '../lib/api';
import { cn } from '../lib/utils';

type Props = {
  points: MapPoint[];
  categories: MapCategory[];
  selectedCategories: string[];
  loading: boolean;
  error: string | null;
  onToggleCategory: (category: string) => void;
  onClearCategories: () => void;
};

const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

function getCategoryColor(category: string, categories: MapCategory[]) {
  const index = categories.findIndex((item) => item.category === category);
  return palette[index >= 0 ? index % palette.length : 0];
}

export default function MapPanel({
  points,
  categories,
  selectedCategories,
  loading,
  error,
  onToggleCategory,
  onClearCategories,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const hasFilters = selectedCategories.length > 0;

  const totalVisibleValue = points.reduce((total, point) => total + Number(point.contract_value), 0);

  // Inicializa o mapa
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Pequeno timeout para garantir que o layout do Tailwind foi aplicado
    const timer = setTimeout(() => {
      if (!mapContainer.current) return;
      
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [-51.23, -30.03],
        zoom: 11,
        trackResize: true
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      
      // Força o resize para garantir que o canvas ocupe o espaço
      map.current.on('load', () => {
        map.current?.resize();
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Atualiza os marcadores quando os pontos mudam
  useEffect(() => {
    if (!map.current) return;
    console.log(`Renderizando ${points.length} pontos no mapa.`);

    // Limpa marcadores antigos
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    points.forEach((point) => {
      try {
        const lat = Number(point.latitude);
        const lng = Number(point.longitude);

        if (isNaN(lat) || isNaN(lng)) return;

        const color = getCategoryColor(point.category, categories);
        
        // Cria elemento do marcador (um circulo)
        const el = document.createElement('div');
        el.className = 'map-marker';
        const size = Math.min(24, Math.max(8, Number(point.contract_value) / 10000000));
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.backgroundColor = color;
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        el.style.cursor = 'pointer';
        el.style.opacity = '0.7';

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 150px;">
            <strong style="display: block; margin-bottom: 4px; font-size: 13px;">${point.company_name}</strong>
            <div style="font-size: 11px; color: #666; line-height: 1.4;">
              <b>Setor:</b> ${formatCategoryLabel(point.category)}<br/>
              <b>Valor:</b> ${formatCurrency(point.contract_value)}<br/>
              <b>Bairro:</b> ${point.district}
            </div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);

        markers.current.push(marker);
      } catch (err) {
        console.error("Erro ao criar marcador:", err);
      }
    });
  }, [points, categories]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col lg:flex-row h-[600px] min-h-[600px]">
      <div className="w-full lg:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-5 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-black text-slate-900 leading-tight">Mapa de Investimentos</h2>
          <p className="text-xs text-slate-500 mt-1">Explore a execucao orcamentaria no territorio.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <button
            onClick={onClearCategories}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all border",
              !hasFilters ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            Todos os Setores
          </button>
          
          {categories.map((cat) => {
            const isActive = selectedCategories.includes(cat.category);
            const color = getCategoryColor(cat.category, categories);
            return (
              <button
                key={cat.category}
                onClick={() => onToggleCategory(cat.category)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all border flex items-center justify-between group",
                  isActive ? "bg-white shadow-sm ring-1 ring-inset" : "bg-transparent text-slate-500 border-transparent hover:bg-slate-100"
                )}
                style={isActive ? { borderColor: color, color: color, ringColor: color } : {}}
              >
                <span className="truncate pr-2">{formatCategoryLabel(cat.category)}</span>
                <span className="text-[10px] font-black opacity-50">{cat.expenses_count}</span>
              </button>
            );
          })}
        </div>

        <div className="p-5 border-t border-slate-200 bg-white">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Volume Visivel</div>
          <strong className="text-sm font-black text-slate-900">{formatCurrency(totalVisibleValue)}</strong>
          <div className="text-[10px] text-slate-400 mt-1">{points.length} pontos no mapa</div>
        </div>
      </div>

      <div className="flex-1 relative bg-slate-100">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold shadow-lg animate-bounce">
              Atualizando Mapa...
            </div>
          </div>
        )}
        <div ref={mapContainer} className="h-full w-full min-h-full" />
      </div>
    </div>
  );
}
