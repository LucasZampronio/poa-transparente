import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';

import CategorySuitePanel from './components/CategorySuitePanel';
import MapPanel from './components/MapPanel';
import RankingPanel from './components/RankingPanel';
import TimeseriesPanel from './components/TimeseriesPanel';
import {
  CategorySuite,
  fetchCategorySuite,
  fetchJson,
  fetchMapCategories,
  fetchMapPoints,
  MapCategory,
  MapPoint,
  RankingRow,
  Summary,
  TimeseriesRow,
} from './lib/api';

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
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
        const [summaryData, categoriesData, mapData, companiesData, agenciesData, timeseriesData] =
          await Promise.all([
            fetchJson<Summary>('/api/summary'),
            fetchMapCategories(),
            fetchMapPoints(),
            fetchJson<RankingRow[]>('/api/rankings/companies'),
            fetchJson<RankingRow[]>('/api/rankings/agencies'),
            fetchJson<TimeseriesRow[]>('/api/timeseries'),
          ]);

        if (ignore) {
          return;
        }

        setSummary(summaryData);
        setMapCategories(categoriesData);
        setMapPoints(mapData);
        setCompanies(companiesData);
        setAgencies(agenciesData);
        setTimeseries(timeseriesData);
        setMapError(null);
        hasLoadedInitialMap.current = true;
      } catch (e) {
        if (!ignore) {
          const message = (e as Error).message;
          setError(message);
          setMapError(message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setMapLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedInitialMap.current) {
      return;
    }

    let ignore = false;

    async function loadFilteredMap() {
      setMapLoading(true);
      setMapError(null);

      try {
        const data = await fetchMapPoints(selectedCategories);

        if (!ignore) {
          setMapPoints(data);
        }
      } catch (e) {
        if (!ignore) {
          setMapError((e as Error).message);
        }
      } finally {
        if (!ignore) {
          setMapLoading(false);
        }
      }
    }

    loadFilteredMap();

    return () => {
      ignore = true;
    };
  }, [selectedCategories]);

  useEffect(() => {
    if (!focusedCategory) {
      setCategorySuite(null);
      setSuiteError(null);
      setSuiteLoading(false);
      return;
    }

    const category = focusedCategory;
    let ignore = false;

    async function loadCategorySuite() {
      setSuiteLoading(true);
      setSuiteError(null);
      setCategorySuite(null);

      try {
        const data = await fetchCategorySuite(category);

        if (!ignore) {
          setCategorySuite(data);
        }
      } catch (e) {
        if (!ignore) {
          setSuiteError((e as Error).message);
        }
      } finally {
        if (!ignore) {
          setSuiteLoading(false);
        }
      }
    }

    loadCategorySuite();

    return () => {
      ignore = true;
    };
  }, [focusedCategory]);

  const cards = useMemo(() => {
    if (!summary) return [];

    return [
      { label: 'Total gasto', value: `R$ ${Number(summary.total_spent).toLocaleString('pt-BR')}` },
      { label: 'Contratos', value: Number(summary.contracts_count).toLocaleString('pt-BR') },
      { label: 'Empresas', value: Number(summary.companies_count).toLocaleString('pt-BR') },
      { label: 'Orgaos', value: Number(summary.agencies_count).toLocaleString('pt-BR') },
    ];
  }, [summary]);

  function handleToggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  function handleClearCategories() {
    setSelectedCategories([]);
  }

  return (
    <main className="layout">
      <header className="header">
        <h1>POA Transparente</h1>
        <p>Visualizacao de gastos publicos com foco em transparencia e observabilidade.</p>
      </header>

      {loading && <div className="panel">Carregando dados...</div>}
      {error && <div className="panel error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="cards-grid">
            {cards.map((card) => (
              <article className="card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </section>

          <MapPanel
            points={mapPoints}
            categories={mapCategories}
            selectedCategories={selectedCategories}
            loading={mapLoading}
            error={mapError}
            onToggleCategory={handleToggleCategory}
            onClearCategories={handleClearCategories}
          />

          <CategorySuitePanel
            suite={categorySuite}
            selectedCategories={selectedCategories}
            loading={suiteLoading}
            error={suiteError}
          />

          <section className="two-col">
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
          </section>

          <TimeseriesPanel rows={timeseries} />
        </>
      )}
    </main>
  );
}
