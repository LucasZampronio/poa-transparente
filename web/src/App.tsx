import { useEffect, useMemo, useRef, useState } from 'react';

import CategorySuitePanel from './components/CategorySuitePanel';
import Footer from './components/Footer';
import Header from './components/Header';
import MapPanel from './components/MapPanel';
import RankingPanel from './components/RankingPanel';
import TimeseriesPanel from './components/TimeseriesPanel';
import {
  BolsaFamiliaData,
  CategorySuite,
  fetchBolsaFamilia,
  fetchCategorySuite,
  fetchJson,
  fetchMapCategories,
  fetchMapPoints,
  formatCurrency,
  MapCategory,
  MapPoint,
  RankingRow,
  Summary,
  TimeseriesRow,
} from './lib/api';

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [bolsaFamilia, setBolsaFamilia] = useState<BolsaFamiliaData | null>(null);
  const [categorySuite, setCategorySuite] = useState<CategorySuite | null>(null);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [mapCategories, setMapCategories] = useState<MapCategory[]>([]);
  const [companies, setCompanies] = useState<RankingRow[]>([]);
  const [agencies, setAgencies] = useState<RankingRow[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesRow[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [suiteLoading, setSuiteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [suiteError, setSuiteError] = useState<string | null>(null);
  const hasLoadedInitialMap = useRef(false);
  const focusedCategory = selectedCategories.length === 1 ? selectedCategories[0] : null;

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [
          summaryData,
          categoriesData,
          mapData,
          companiesData,
          agenciesData,
          timeseriesData,
          bolsaData,
        ] = await Promise.all([
          fetchJson<Summary>('/api/summary'),
          fetchMapCategories(),
          fetchMapPoints(),
          fetchJson<RankingRow[]>('/api/rankings/companies'),
          fetchJson<RankingRow[]>('/api/rankings/agencies'),
          fetchJson<TimeseriesRow[]>('/api/timeseries'),
          fetchBolsaFamilia('202401'),
        ]);

        if (ignore) return;

        setSummary(summaryData);
        setBolsaFamilia(bolsaData);
        setMapCategories(categoriesData || []);
        setMapPoints(mapData || []);
        setCompanies(companiesData || []);
        setAgencies(agenciesData || []);
        setTimeseries(timeseriesData || []);
        hasLoadedInitialMap.current = true;
      } catch (e) {
        if (!ignore) setError((e as Error).message);
      } finally {
        if (!ignore) {
          setLoading(false);
          setMapLoading(false);
        }
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!hasLoadedInitialMap.current) return;
    let ignore = false;
    async function loadFilteredMap() {
      setMapLoading(true);
      setMapError(null);
      try {
        const data = await fetchMapPoints(selectedCategories);
        if (!ignore) setMapPoints(data);
      } catch (e) {
        if (!ignore) setMapError((e as Error).message);
      } finally {
        if (!ignore) setMapLoading(false);
      }
    }
    loadFilteredMap();
    return () => { ignore = true; };
  }, [selectedCategories]);

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Total Gasto', value: formatCurrency(summary.total_spent), color: 'text-blue-600' },
      { label: 'Contratos Ativos', value: Number(summary.contracts_count).toLocaleString('pt-BR'), color: 'text-slate-900' },
      { label: 'Empresas Fornecedoras', value: Number(summary.companies_count).toLocaleString('pt-BR'), color: 'text-slate-900' },
      { label: 'Bolsa Familia (JAN/24)', value: bolsaFamilia ? formatCurrency(bolsaFamilia.valor_transferido) : 'N/A', color: 'text-emerald-600' },
    ];
  }, [summary, bolsaFamilia]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 w-full pb-12 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 bg-blue-200 rounded-full mb-4"></div>
            <p className="text-slate-500 font-medium">Sincronizando dados orcamentarios...</p>
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

            {/* Main Content Area */}
            <div className="space-y-6">
              <MapPanel
                points={mapPoints}
                categories={mapCategories}
                selectedCategories={selectedCategories}
                loading={mapLoading}
                error={mapError}
                onToggleCategory={(c) => setSelectedCategories(prev => prev.includes(c) ? [] : [c])}
                onClearCategories={() => setSelectedCategories([])}
              />

              <CategorySuitePanel
                suite={categorySuite}
                selectedCategories={selectedCategories}
                loading={suiteLoading}
                error={suiteError}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RankingPanel
                  title="Ranking de Empresas"
                  rows={companies}
                  labelKey="company_name"
                  valueKey="total_received"
                />
                <RankingPanel
                  title="Ranking de Orgaos"
                  rows={agencies}
                  labelKey="agency"
                  valueKey="total_spent"
                />
              </div>

              <TimeseriesPanel rows={timeseries} />
            </div>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
