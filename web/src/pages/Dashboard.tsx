import { useState } from 'react';
import MapPanel from '../components/MapPanel';
import RankingPanel from '../components/RankingPanel';
import { formatCurrency, type MapPoint } from '../services/api';
import { useDashboardData } from '../hooks/useDashboardData';
import { cn } from '../lib/utils';
import { Database, Filter, BarChart3, Info, X, HardHat, HeartPulse, ShieldAlert } from 'lucide-react';

const AVAILABLE_YEARS = ['ALL', '2026', '2025', '2024', '2023', '2022'];

type ViewMode = 'INFRA' | 'HEALTH' | 'SECURITY';

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

  const [activeView, setActiveView] = useState<ViewMode>('INFRA');
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number; description?: string } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);

  const handleRowClick = (row: any) => {
    if (row.latitude && row.longitude) {
      const point = allMapPoints.find(p => p.process_number === row.process_number) || row;
      setFocusPoint({
        lat: Number(row.latitude),
        lng: Number(row.longitude),
        description: row.description
      });
      setSelectedPoint(point);
      setIsFiltersOpen(false);
      setIsRankingsOpen(false);
    }
  };

  const handleMapPointClick = (point: MapPoint) => {
    setSelectedPoint(point);
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
    setSelectedPoint(null);
  };

  return (
    <div className="relative h-screen w-screen bg-[#0a0b0d] overflow-hidden font-sans select-none text-slate-200">
      <MapPanel
        points={activeView === 'INFRA' ? filteredData.points : []}
        viewMode={activeView}
        sectors={filteredData.sectorList}
        categories={[]}
        selectedSector={selectedSector}
        selectedCategories={[]}
        loading={false}
        onSelectSector={setSelectedSector}
        onToggleCategory={() => {}}
        focusPoint={focusPoint}
        onPointClick={handleMapPointClick}
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
            {activeView === 'INFRA' && (
              <>
                <div className="text-right hidden lg:block">
                  <div className="stats-label">Total Investido</div>
                  <div className="text-sm font-black text-white">{formatCurrency(filteredData.summary.total_spent)}</div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="stats-label hidden lg:block">Contratos Ativos</div>
                  <div className="text-sm font-black text-white lg:text-base">{filteredData.summary.contracts_count} <span className="text-[10px] text-slate-500 lg:hidden">OBRAS</span></div>
                </div>
              </>
            )}
            <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 shrink-0">
              <Info size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex justify-end p-4 lg:p-6 overflow-hidden relative">
          {(isFiltersOpen || isRankingsOpen || selectedPoint) && (
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden pointer-events-auto" 
              onClick={closeDrawers}
            />
          )}

          {/* Floating Navigation - Extreme Left */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 pointer-events-auto hidden lg:flex">
            <button 
              onClick={() => { setActiveView('INFRA'); setSelectedPoint(null); }}
              className={cn(
                "w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border",
                activeView === 'INFRA' 
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
                  : "bg-black/60 border-white/10 text-slate-500 hover:bg-black/80 hover:text-white"
              )}
            >
              <HardHat size={20} />
              <span className="text-[7px] font-black uppercase">Obras</span>
            </button>
            <button 
              onClick={() => { setActiveView('HEALTH'); setSelectedPoint(null); }}
              className={cn(
                "w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border",
                activeView === 'HEALTH' 
                  ? "bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]" 
                  : "bg-black/60 border-white/10 text-slate-500 hover:bg-black/80 hover:text-white"
              )}
            >
              <HeartPulse size={20} />
              <span className="text-[7px] font-black uppercase">Saúde</span>
            </button>
            <button 
              onClick={() => { setActiveView('SECURITY'); setSelectedPoint(null); }}
              className={cn(
                "w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border",
                activeView === 'SECURITY' 
                  ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]" 
                  : "bg-black/60 border-white/10 text-slate-500 hover:bg-black/80 hover:text-white"
              )}
            >
              <ShieldAlert size={20} />
              <span className="text-[7px] font-black uppercase">Segurança</span>
            </button>
          </div>

          <div className="flex items-start gap-6 pointer-events-auto">
            {/* Details Panel - Left of Rankings */}
            {selectedPoint && (
              <aside className="w-80 h-full bg-[#0f1115] border border-white/5 rounded-[32px] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Detalhes da Obra</span>
                  </div>
                  <button onClick={() => setSelectedPoint(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white leading-snug mb-2">{selectedPoint.description_detailed}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {selectedPoint.value_contracted && Number(selectedPoint.value_contracted) > 0 && (
                      <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="stats-label mb-1">Investimento</div>
                        <div className="text-xs font-black text-white">{formatCurrency(selectedPoint.value_contracted)}</div>
                      </div>
                    )}
                    {selectedPoint.reference_date && selectedPoint.reference_date !== 'N/A' && (
                      <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="stats-label mb-1">Início</div>
                        <div className="text-xs font-black text-white">{selectedPoint.reference_date}</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedPoint.company_name && selectedPoint.company_name !== 'N/A' && selectedPoint.company_name !== 'EMPRESA NÃO INFORMADA' && (
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="stats-label mb-2 uppercase tracking-widest">Responsável</div>
                        <div className="text-xs font-black text-white mb-1">{selectedPoint.company_name}</div>
                        {selectedPoint.beneficiary_id && selectedPoint.beneficiary_id !== 'N/A' && (
                          <div className="text-[9px] font-bold text-slate-500 font-mono">CNPJ: {selectedPoint.beneficiary_id}</div>
                        )}
                      </div>
                    )}

                    {selectedPoint.address && selectedPoint.address !== 'N/A' && selectedPoint.address !== 'PORTO ALEGRE' && (
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="stats-label mb-2 uppercase tracking-widest">Localização</div>
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 bg-blue-500/20 text-blue-500 rounded flex items-center justify-center shrink-0 mt-0.5 text-[10px]">📍</div>
                          <div className="text-[10px] font-bold text-slate-300 leading-relaxed">
                            {selectedPoint.address}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPoint.fiscal_name && selectedPoint.fiscal_name !== 'NÃO INFORMADO' && (
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="stats-label mb-2 uppercase tracking-widest">Fiscalização</div>
                        <div className="text-xs font-black text-white mb-1">{selectedPoint.fiscal_name}</div>
                        {selectedPoint.fiscal_info && selectedPoint.fiscal_info !== 'Setor: NÃO INFORMADO' && (
                          <div className="text-[9px] font-bold text-slate-500">{selectedPoint.fiscal_info}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            )}

            {/* Right Panel (Rankings) - Fixed at Right */}
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
                  {activeView === 'INFRA' ? (
                    <>
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
                    </>
                  ) : (
                    <div className="p-4 text-center">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Rankings de {activeView === 'HEALTH' ? 'Saúde' : 'Segurança'} em processamento...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
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
