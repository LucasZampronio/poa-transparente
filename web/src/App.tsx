import { useEffect, useMemo, useState } from 'react';
import MapPanel from './components/MapPanel';
import RankingPanel from './components/RankingPanel';
import {
  fetchCategories,
  fetchMapPoints,
  fetchSectors,
  fetchSummary,
  fetchRankingCompanies,
  fetchRankingAgencies,
  fetchTimeseries,
  formatCurrency,
  MapCategory,
  MapPoint,
  RankingRow,
  Sector,
  Summary,
  TimeseriesRow,
} from './lib/api';
import { cn } from './lib/utils';
import { Activity, ShieldCheck, Globe, Database, Filter, BarChart3, Info } from 'lucide-react';

const AVAILABLE_YEARS = ['ALL', '2026', '2025', '2024', '2023', '2022'];

export default function App() {
  const [allMapPoints, setAllMapPoints] = useState<MapPoint[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CARGA INICIAL: Busca tudo uma única vez
  useEffect(() => {
    async function initData() {
      console.log("🚀 Iniciando carga de dados...");
      try {
        const data = await fetchMapPoints();
        console.log(`✅ Recebidas ${data.length} obras da API.`);
        setAllMapPoints(data);
      } catch (e) {
        console.error("❌ Erro na carga:", e);
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // LÓGICA DE FILTRAGEM
  const filteredData = useMemo(() => {
    let points = Array.isArray(allMapPoints) ? allMapPoints : [];

    if (selectedYear !== 'ALL') {
      points = points.filter(p => String(p.reference_date || '').includes(selectedYear));
    }

    if (selectedSector) {
      points = points.filter(p => p.sector === selectedSector);
    }
    
    console.log(`📍 Renderizando ${points.length} pontos no mapa.`);

    // Calcula Resumo (KPIs)
    const totalSpent = points.reduce((acc, p) => acc + Number(p.contract_value), 0);
    const uniqueCompanies = new Set(points.map(p => p.company_name)).size;
    const uniqueAgencies = new Set(points.map(p => p.agency)).size;

    // Calcula Rankings (Empresas)
    const companyMap: Record<string, number> = {};
    points.forEach(p => {
      companyMap[p.company_name] = (companyMap[p.company_name] || 0) + Number(p.contract_value);
    });
    const topCompanies = Object.entries(companyMap)
      .map(([name, value]) => ({ company_name: name, total_received: value }))
      .sort((a, b) => Number(b.total_received) - Number(a.total_received))
      .slice(0, 10);

    // Calcula Rankings (Órgãos)
    const agencyMap: Record<string, number> = {};
    points.forEach(p => {
      agencyMap[p.agency] = (agencyMap[p.agency] || 0) + Number(p.contract_value);
    });
    const topAgencies = Object.entries(agencyMap)
      .map(([name, value]) => ({ agency: name, total_spent: value }))
      .sort((a, b) => Number(b.total_spent) - Number(a.total_spent))
      .slice(0, 10);

    // Calcula Lista de Setores (para o menu lateral)
    // Usamos allMapPoints (ou filtrado apenas por ano) para o menu não sumir
    const sectorSource = selectedYear === 'ALL' ? allMapPoints : allMapPoints.filter(p => p.reference_date.startsWith(selectedYear));
    const sectorMap: Record<string, { count: number, total: number }> = {};
    sectorSource.forEach(p => {
      if (!sectorMap[p.sector]) sectorMap[p.sector] = { count: 0, total: 0 };
      sectorMap[p.sector].count++;
      sectorMap[p.sector].total += Number(p.contract_value);
    });
    const sectorList = Object.entries(sectorMap).map(([name, stat]) => ({
      name,
      count: stat.count,
      total: String(stat.total)
    })).sort((a, b) => Number(b.total) - Number(a.total));

    return {
      points,
      summary: {
        total_spent: String(totalSpent),
        contracts_count: String(points.length),
        companies_count: String(uniqueCompanies),
        agencies_count: String(uniqueAgencies)
      },
      topCompanies,
      topAgencies,
      sectorList
    };
  }, [allMapPoints, selectedYear, selectedSector]);

  return (
    <div className="relative h-screen w-screen bg-[#0a0b0d] overflow-hidden font-sans select-none text-slate-200">
      <MapPanel
        points={filteredData.points}
        sectors={filteredData.sectorList}
        categories={[]}
        selectedSector={selectedSector}
        selectedCategories={[]}
        loading={false}
        onSelectSector={setSelectedSector}
        onToggleCategory={() => {}}
      />

      <div className="absolute inset-0 pointer-events-none flex flex-col z-10">
        <header className="h-16 border-b border-white/5 bg-[#0f1115]/80 backdrop-blur-md flex items-center justify-between px-6 pointer-events-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Database size={18} className="text-white" />
              </div>
              <h1 className="text-sm font-black uppercase tracking-tighter text-white">POA Transparente</h1>
            </div>
            
            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
              {AVAILABLE_YEARS.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest",
                    selectedYear === year ? "bg-white text-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {year === 'ALL' ? 'TODOS' : year}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="stats-label">Total Investido</div>
              <div className="text-sm font-black text-white">{formatCurrency(filteredData.summary.total_spent)}</div>
            </div>
            <div className="text-right">
              <div className="stats-label">Contratos Ativos</div>
              <div className="text-sm font-black text-white">{filteredData.summary.contracts_count}</div>
            </div>
            <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400">
              <Info size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex justify-between p-6 overflow-hidden">
          <aside className="w-72 flex flex-col gap-6">
            <div className="pro-panel p-6 rounded-3xl pointer-events-auto flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <Filter size={14} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Camadas de Mercado</span>
              </div>

              <nav className="space-y-1.5 overflow-y-auto no-scrollbar max-h-[60vh]">
                <button 
                  onClick={() => setSelectedSector(null)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl text-[11px] font-bold transition-all uppercase tracking-tight",
                    selectedSector === null ? "bg-white text-black shadow-xl" : "bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  Todos os Setores
                </button>
                {filteredData.sectorList.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setSelectedSector(s.name)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl text-[11px] font-bold transition-all uppercase tracking-tight",
                      selectedSector === s.name ? "bg-white text-black shadow-xl" : "bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="stats-label mb-2">Saúde do Dataset</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-slate-300">Cache Local: {allMapPoints.length} obras</span>
                </div>
              </div>
            </div>
          </aside>

          <aside className="w-80 flex flex-col gap-6">
            <div className="pro-panel flex-1 rounded-[32px] p-6 pointer-events-auto overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={14} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Tendências</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar">
                <RankingPanel 
                  title="Principais Órgãos"
                  rows={filteredData.topAgencies}
                  labelKey="agency"
                  valueKey="total_spent"
                />
                <RankingPanel 
                  title="Principais Beneficiários"
                  rows={filteredData.topCompanies}
                  labelKey="company_name"
                  valueKey="total_received"
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-50 bg-[#0f1115] flex flex-col items-center justify-center gap-8">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Iniciando Protocolo</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Carregando dados financeiros...</p>
          </div>
        </div>
      )}
    </div>
  );
}
