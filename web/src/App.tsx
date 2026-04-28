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

const AVAILABLE_YEARS = ['2026', '2025', '2024', '2023', '2022'];

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [mapCategories, setMapCategories] = useState<MapCategory[]>([]);
  const [companies, setCompanies] = useState<RankingRow[]>([]);
  const [agencies, setAgencies] = useState<RankingRow[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesRow[]>([]);
  
  const [selectedYear, setSelectedYear] = useState<string>(AVAILABLE_YEARS[0]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function updateData() {
      if (!loading) setMapLoading(true);
      try {
        const [summaryData, sectorsData, mapData, categoriesData, comp, agen, time] = await Promise.all([
          fetchSummary(selectedSector || undefined, selectedYear),
          fetchSectors(selectedYear),
          fetchMapPoints(selectedSector || undefined, selectedYear),
          fetchCategories(selectedSector || undefined, selectedYear),
          fetchRankingCompanies(selectedSector || undefined, selectedYear),
          fetchRankingAgencies(selectedSector || undefined, selectedYear),
          fetchTimeseries(selectedSector || undefined, selectedYear),
        ]);

        setSummary(summaryData);
        setSectors(sectorsData);
        setMapPoints(mapData);
        setMapCategories(categoriesData);
        setCompanies(comp);
        setAgencies(agen);
        setTimeseries(time);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
        setMapLoading(false);
      }
    }
    updateData();
  }, [selectedYear, selectedSector]);

  return (
    <div className="relative h-screen w-screen bg-[#0a0b0d] overflow-hidden font-sans select-none text-slate-200">
      {/* BACKGROUND LAYER: MAP */}
      <MapPanel
        points={mapPoints}
        sectors={sectors}
        categories={mapCategories}
        selectedSector={selectedSector}
        selectedCategories={[]}
        loading={mapLoading}
        onSelectSector={setSelectedSector}
        onToggleCategory={() => {}}
      />

      {/* UI OVERLAY */}
      <div className="absolute inset-0 pointer-events-none flex flex-col z-10">
        
        {/* TOP BAR: SEARCH & CONTROLS */}
        <header className="h-16 border-b border-white/5 bg-[#0f1115]/80 backdrop-blur-md flex items-center justify-between px-6 pointer-events-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Database size={18} className="text-white" />
              </div>
              <h1 className="text-sm font-black uppercase tracking-tighter text-white">POA_Transparency</h1>
            </div>
            
            <div className="h-6 w-px bg-white/10" />

            {/* YEAR SELECTOR */}
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
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* TOP KPIs */}
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="stats-label">Total Invested</div>
              <div className="text-sm font-black text-white">{summary ? formatCurrency(summary.total_spent) : 'R$ 0,00'}</div>
            </div>
            <div className="text-right">
              <div className="stats-label">Active Contracts</div>
              <div className="text-sm font-black text-white">{summary?.contracts_count || 0}</div>
            </div>
            <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400">
              <Info size={18} />
            </button>
          </div>
        </header>

        {/* MAIN CONTENT AREA (FLOATING PANELS) */}
        <div className="flex-1 flex justify-between p-6 overflow-hidden">
          
          {/* LEFT SIDEBAR: FILTERS */}
          <aside className="w-72 flex flex-col gap-6">
            <div className="pro-panel p-6 rounded-3xl pointer-events-auto flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <Filter size={14} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Market Layers</span>
              </div>

              <nav className="space-y-1.5">
                <button 
                  onClick={() => setSelectedSector(null)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl text-[11px] font-bold transition-all uppercase tracking-tight",
                    selectedSector === null ? "bg-white text-black shadow-xl" : "bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  All Sectors
                </button>
                {sectors.map((s) => (
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
                <div className="stats-label mb-2">Live Status</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-300">Syncing with TCE-RS</span>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT SIDEBAR: ANALYTICS */}
          <aside className="w-80 flex flex-col gap-6">
            <div className="pro-panel flex-1 rounded-[32px] p-6 pointer-events-auto overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={14} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Market Trends</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar">
                <RankingPanel 
                  title="Top Agencies"
                  rows={agencies}
                  labelKey="agency"
                  valueKey="total_spent"
                />
                <RankingPanel 
                  title="Top Beneficiaries"
                  rows={companies}
                  labelKey="company_name"
                  valueKey="total_received"
                />
              </div>
            </div>
            
            {/* INSIGHT CARD */}
            <div className="pro-panel p-6 rounded-3xl pointer-events-auto bg-blue-600 text-white shadow-blue-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Insight</span>
              </div>
              <p className="text-[11px] font-bold leading-relaxed mb-4">
                The current trend shows a 14% increase in public infrastructure investments compared to the previous cycle.
              </p>
              <button className="w-full py-3 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                View Full Report
              </button>
            </div>
          </aside>
        </div>

      </div>

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-[#0f1115] flex flex-col items-center justify-center gap-8">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Initializing_Protocol</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Loading financial spatial data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
