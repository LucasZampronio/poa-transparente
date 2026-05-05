import { useState } from 'react';
import MapPanel from '../components/MapPanel';
import RankingPanel from '../components/RankingPanel';
import { formatCurrency } from '../services/api';
import { useDashboardData } from '../hooks/useDashboardData';
import { cn } from '../lib/utils';
import { Database, Filter, BarChart3, Info, X } from 'lucide-react';

const AVAILABLE_YEARS = ['ALL', '2026', '2025', '2024', '2023', '2022'];

export default function Dashboard() {
  const {
    allMapPoints,
    filteredData,
    selectedYear,
    setSelectedYear,
    selectedSector,
    setSelectedSector,
    loading
  } = useDashboardData();

  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number; description?: string } | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);

  const handleRowClick = (row: any) => {
    if (row.latitude && row.longitude) {
      setFocusPoint({
        lat: Number(row.latitude),
        lng: Number(row.longitude),
        description: row.description
      });
      // Fecha os painéis no mobile ao focar num ponto
      setIsFiltersOpen(false);
      setIsRankingsOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 z-50 bg-[#0f1115] flex flex-col items-center justify-center gap-8">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Iniciando Protocolo</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  const closeDrawers = () => {
    setIsFiltersOpen(false);
    setIsRankingsOpen(false);
  };

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
        focusPoint={focusPoint}
      />

      <div className="absolute inset-0 pointer-events-none flex flex-col z-10">
        <header className="h-16 border-b border-white/5 bg-[#0f1115]/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 pointer-events-auto shrink-0">
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <Database size={18} className="text-white" />
              </div>
              <h1 className="text-sm font-black uppercase tracking-tighter text-white whitespace-nowrap">POA Transparente</h1>
            </div>
            
            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar max-w-[150px] sm:max-w-none">
              {AVAILABLE_YEARS.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "px-3 lg:px-4 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-bold transition-all uppercase tracking-widest whitespace-nowrap",
                    selectedYear === year ? "bg-white text-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {year === 'ALL' ? 'TODOS' : year}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-8">
            <div className="text-right hidden lg:block">
              <div className="stats-label">Total Investido</div>
              <div className="text-sm font-black text-white">{formatCurrency(filteredData.summary.total_spent)}</div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="stats-label hidden lg:block">Contratos Ativos</div>
              <div className="text-sm font-black text-white lg:text-base">{filteredData.summary.contracts_count} <span className="text-[10px] text-slate-500 lg:hidden">OBRAS</span></div>
            </div>
            <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 shrink-0">
              <Info size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex justify-between p-4 lg:p-6 overflow-hidden relative">
          {/* Overlay for mobile drawers */}
          {(isFiltersOpen || isRankingsOpen) && (
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden pointer-events-auto" 
              onClick={closeDrawers}
            />
          )}

          {/* Left Panel (Filters) */}
          <aside className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 bg-[#0f1115] border-r border-white/5 transform transition-transform duration-300 lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:border-none lg:transform-none lg:flex lg:w-72 flex flex-col gap-6 p-6 lg:p-0 pointer-events-auto",
            isFiltersOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}>
            <div className="flex items-center justify-between lg:hidden mb-4">
              <span className="text-xs font-black text-white uppercase tracking-widest">Filtros</span>
              <button onClick={() => setIsFiltersOpen(false)} className="p-2 text-slate-500"><X size={20} /></button>
            </div>

            <div className="pro-panel p-6 rounded-3xl flex flex-col h-full lg:h-auto overflow-hidden">
              <div className="flex items-center gap-2 mb-6">
                <Filter size={14} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Camadas de Mercado</span>
              </div>

              <nav className="space-y-1.5 overflow-y-auto no-scrollbar flex-1 lg:max-h-[60vh]">
                <button 
                  onClick={() => { setSelectedSector(null); setIsFiltersOpen(false); }}
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
                    onClick={() => { setSelectedSector(s.name); setIsFiltersOpen(false); }}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl text-[11px] font-bold transition-all uppercase tracking-tight",
                      selectedSector === s.name ? "bg-white text-black shadow-xl" : "bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-8 border-t border-white/5 shrink-0">
                <div className="stats-label mb-2">Saúde do Dataset</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-slate-300">Cache: {allMapPoints.length} obras</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Panel (Rankings) */}
          <aside className={cn(
            "fixed inset-y-0 right-0 z-50 w-80 bg-[#0f1115] border-l border-white/5 transform transition-transform duration-300 lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:border-none lg:transform-none lg:flex lg:w-80 flex flex-col gap-6 p-6 lg:p-0 pointer-events-auto",
            isRankingsOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}>
            <div className="flex items-center justify-between lg:hidden mb-4">
              <span className="text-xs font-black text-white uppercase tracking-widest">Tendências</span>
              <button onClick={() => setIsRankingsOpen(false)} className="p-2 text-slate-500"><X size={20} /></button>
            </div>

            <div className="pro-panel flex-1 rounded-[32px] p-6 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={14} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Análise de Dados</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar pr-1">
                <RankingPanel 
                  title="Maiores Despesas"
                  rows={filteredData.topExpenses}
                  labelKey="description"
                  valueKey="total_spent"
                  onRowClick={handleRowClick}
                />
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
                  onRowClick={handleRowClick}
                />
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile Action Buttons (FABs) */}
        <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-[60] pointer-events-auto">
          <button 
            onClick={() => { setIsFiltersOpen(true); setIsRankingsOpen(false); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest border border-white/20 active:scale-95 transition-transform"
          >
            <Filter size={14} /> Filtros
          </button>
          <button 
            onClick={() => { setIsRankingsOpen(true); setIsFiltersOpen(false); }}
            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest border border-black/20 active:scale-95 transition-transform"
          >
            <BarChart3 size={14} /> Rankings
          </button>
        </div>
      </div>
    </div>
  );
}
