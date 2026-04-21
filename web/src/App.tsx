import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';

import MapPanel from './components/MapPanel';
import RankingPanel from './components/RankingPanel';
import TimeseriesPanel from './components/TimeseriesPanel';
import { fetchJson, MapPoint, RankingRow, Summary, TimeseriesRow } from './lib/api';

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [companies, setCompanies] = useState<RankingRow[]>([]);
  const [agencies, setAgencies] = useState<RankingRow[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [summaryData, mapData, companiesData, agenciesData, timeseriesData] = await Promise.all([
          fetchJson<Summary>('/api/summary'),
          fetchJson<MapPoint[]>('/api/expenses/map'),
          fetchJson<RankingRow[]>('/api/rankings/companies'),
          fetchJson<RankingRow[]>('/api/rankings/agencies'),
          fetchJson<TimeseriesRow[]>('/api/timeseries'),
        ]);

        setSummary(summaryData);
        setMapPoints(mapData);
        setCompanies(companiesData);
        setAgencies(agenciesData);
        setTimeseries(timeseriesData);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Total gasto', value: `R$ ${Number(summary.total_spent).toLocaleString('pt-BR')}` },
      { label: 'Contratos', value: Number(summary.contracts_count).toLocaleString('pt-BR') },
      { label: 'Empresas', value: Number(summary.companies_count).toLocaleString('pt-BR') },
      { label: 'Órgãos', value: Number(summary.agencies_count).toLocaleString('pt-BR') },
    ];
  }, [summary]);

  return (
    <main className="layout">
      <header className="header">
        <h1>POA Transparente</h1>
        <p>Visualização de gastos públicos com foco em transparência e observabilidade.</p>
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

          <MapPanel points={mapPoints} />

          <section className="two-col">
            <RankingPanel
              title="Ranking de Empresas"
              rows={companies}
              labelKey="company_name"
              valueKey="total_received"
            />
            <RankingPanel
              title="Ranking de Órgãos"
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
