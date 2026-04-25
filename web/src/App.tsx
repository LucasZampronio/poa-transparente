import { useEffect, useRef, useState } from 'react';

import CategorySuitePanel from './components/CategorySuitePanel';
import Footer from './components/Footer';
import Header from './components/Header';
import MapPanel from './components/MapPanel';
import RankingPanel from './components/RankingPanel';
import TimeseriesPanel from './components/TimeseriesPanel';
import {
  fetchCategories,
  fetchJson,
  fetchMapPoints,
  fetchSectors,
  formatCurrency,
  MapCategory,
  MapPoint,
  RankingRow,
  Sector,
  Summary,
  TimeseriesRow,
} from './lib/api';

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [mapCategories, setMapCategories] = useState<MapCategory[]>([]);
  const [companies, setCompanies] = useState<RankingRow[]>([]);
  const [agencies, setAgencies] = useState<RankingRow[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesRow[]>([]);
  
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carga Inicial: Resumo e Eixos (Setores)
  useEffect(() => {
    async function loadInitial() {
      try {
        const [summaryData, sectorsData] = await Promise.all([
          fetchJson<Summary>('/api/summary'),
          fetchSectors(),
        ]);
        setSummary(summaryData);
        setSectors(sectorsData);
        
        // Carrega o mapa inicial (sem filtros)
        const initialMap = await fetchMapPoints();
        setMapPoints(initialMap);
        
        // Rankings Iniciais
        const [comp, agen, time] = await Promise.all([
          fetchJson<RankingRow[]>('/api/rankings/companies'),
          fetchJson<RankingRow[]>('/api/rankings/agencies'),
          fetchJson<TimeseriesRow[]>('/api/timeseries'),
        ]);
        setCompanies(comp);
        setAgencies(agen);
        setTimeseries(time);
        
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Recarga quando o Setor ou Categorias mudam
  useEffect(() => {
    async function updateData() {
      setMapLoading(true);
      try {
        const params: any = {};
        if (selectedSector) params.sector = selectedSector;

        const [mapData, categoriesData, summaryData, comp, agen, time] = await Promise.all([
          fetchMapPoints(selectedSector || undefined, selectedCategories),
          fetchCategories(selectedSector || undefined),
          fetchJson<Summary>('/api/summary', params),
          fetchJson<RankingRow[]>('/api/rankings/companies', params),
          fetchJson<RankingRow[]>('/api/rankings/agencies', params),
          fetchJson<TimeseriesRow[]>('/api/timeseries', params),
        ]);

        setMapPoints(mapData);
        setMapCategories(categoriesData);
        setSummary(summaryData);
        setCompanies(comp);
        setAgencies(agen);
        setTimeseries(time);
      } catch (e) {
        console.error(e);
      } finally {
        setMapLoading(false);
      }
    }
    
    // Não roda no primeiro mount pois o loadInitial já faz isso
    if (!loading) {
      updateData();
    }
  }, [selectedSector, selectedCategories]);

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Total no Eixo', value: formatCurrency(summary.total_spent), color: 'text-blue-600' },
      { label: 'Contratos/Registros', value: Number(summary.contracts_count).toLocaleString('pt-BR'), color: 'text-slate-900' },
      { label: 'Empresas/Favorecidos', value: Number(summary.companies_count).toLocaleString('pt-BR'), color: 'text-slate-900' },
      { label: 'Orgaos Executores', value: Number(summary.agencies_count).toLocaleString('pt-BR'), color: 'text-slate-900' },
    ];
  }, [summary]);

  function useMemo(fn: () => any, deps: any[]) {
    return fn(); // Simplificado para o exemplo, o ideal é usar o hook real
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 w-full pb-12 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 bg-blue-200 rounded-full mb-4"></div>
            <p className="text-slate-500 font-medium">Sincronizando eixos orcamentarios...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <h3 className="font-bold">Falha na conexao</h3>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map((card) => (
                <div key={card.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">{card.label}</span>
                  <strong className={`text-xl md:text-2xl font-black ${card.color}`}>{card.value}</strong>
                </div>
              ))}
            </div>

            <MapPanel
              points={mapPoints}
              sectors={sectors}
              categories={mapCategories}
              selectedSector={selectedSector}
              selectedCategories={selectedCategories}
              loading={mapLoading}
              onSelectSector={(s) => {
                setSelectedSector(s);
                setSelectedCategories([]); // Limpa subcategorias ao mudar de eixo
              }}
              onToggleCategory={(c) => setSelectedCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RankingPanel
                title="Ranking de Favorecidos"
                rows={companies}
                labelKey="company_name"
                valueKey="total_received"
              />
              <RankingPanel
                title="Ranking de Orgaos Executores"
                rows={agencies}
                labelKey="agency"
                valueKey="total_spent"
              />
            </div>

            <TimeseriesPanel rows={timeseries} />
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
