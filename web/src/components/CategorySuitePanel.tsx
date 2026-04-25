import {
  type AccessLevel,
  type CategorySuite,
  formatCategoryLabel,
  type SuiteIndicator,
} from '../lib/api';

type Props = {
  suite: CategorySuite | null;
  selectedCategories: string[];
  loading: boolean;
  error: string | null;
};

const accessLabels: Record<AccessLevel, string> = {
  live: 'Ao vivo',
  'open-source': 'Fonte aberta',
  'api-key': 'API com chave',
  conecta: 'Conecta gov.br',
  'municipal-system': 'Sistema municipal',
};

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: value >= 1000000 ? 1 : 0,
    notation: value >= 1000000 ? 'compact' : 'standard',
  }).format(value);
}

function formatIndicatorValue(indicator: SuiteIndicator) {
  if (indicator.value === null || indicator.value === '') {
    return 'Em integracao';
  }

  if (typeof indicator.value === 'string') {
    return indicator.value;
  }

  switch (indicator.unit) {
    case 'BRL':
      return `R$ ${indicator.value.toLocaleString('pt-BR', {
        minimumFractionDigits: indicator.value < 1000 ? 2 : 0,
        maximumFractionDigits: 2,
      })}`;
    case 'count':
    case 'people':
      return indicator.value.toLocaleString('pt-BR');
    case 'percent':
      return `${indicator.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
    case 'per-1000':
      return `${indicator.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} / 1.000`;
    case 'density':
      return `${indicator.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} hab/km2`;
    case 'days':
      return `${indicator.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
    case 'minutes':
      return `${indicator.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} min`;
    default:
      return indicator.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
}

export default function CategorySuitePanel({
  suite,
  selectedCategories,
  loading,
  error,
}: Props) {
  if (selectedCategories.length === 0) {
    return (
      <section className="panel suite-panel">
        <div className="panel-heading">
          <div>
            <h2>Suite setorial por municipio</h2>
            <p className="panel-copy">
              Selecione um setor no mapa para abrir os indicadores municipais daquela agenda.
            </p>
          </div>
        </div>
        <div className="suite-empty">
          A suite cruza investimento monitorado com indicadores-base da cidade, fontes oficiais e
          leitura territorial do setor.
        </div>
      </section>
    );
  }

  if (selectedCategories.length > 1) {
    return (
      <section className="panel suite-panel">
        <div className="panel-heading">
          <div>
            <h2>Suite setorial por municipio</h2>
            <p className="panel-copy">
              O mapa aceita varios filtros, mas a leitura detalhada exige um setor em foco.
            </p>
          </div>
        </div>
        <div className="suite-empty">
          Setores selecionados: {selectedCategories.map(formatCategoryLabel).join(', ')}. Mantenha
          apenas um setor para abrir os indicadores especificos.
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="panel suite-panel">
        <div className="panel-heading">
          <div>
            <h2>Suite setorial por municipio</h2>
            <p className="panel-copy">Carregando indicadores e fontes oficiais do setor.</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel suite-panel">
        <div className="panel-heading">
          <div>
            <h2>Suite setorial por municipio</h2>
            <p className="panel-copy">Falha ao montar a leitura detalhada do setor.</p>
          </div>
        </div>
        <div className="suite-empty error">{error}</div>
      </section>
    );
  }

  if (!suite) {
    return null;
  }

  const sourceMap = new Map(suite.sources.map((source) => [source.key ?? source.id, source]));
  const availability = Object.entries(suite.availabilitySummary).filter(([, count]) => count > 0);
  const maxMonthValue = Math.max(...suite.monthlySeries.map((row) => row.totalSpent), 1);
  const overviewCards = [
    { label: 'Investimento monitorado', value: formatCompactCurrency(suite.overview.totalSpent) },
    { label: 'Contratos', value: suite.overview.contractsCount.toLocaleString('pt-BR') },
    { label: 'Empresas', value: suite.overview.companiesCount.toLocaleString('pt-BR') },
    { label: 'Bairros', value: suite.overview.districtsCount.toLocaleString('pt-BR') },
    { label: 'Licitações monitoradas', value: suite.overview.biddingVolume.toLocaleString('pt-BR') },
    {
      label: 'Principal orgao',
      value: suite.overview.topAgency
        ? `${suite.overview.topAgency} · ${formatCompactCurrency(suite.overview.topAgencySpent)}`
        : 'Sem destaque',
    },
  ];

  return (
    <section className="panel suite-panel">
      <div className="panel-heading">
        <div>
          <h2>Suite setorial: {suite.category.label}</h2>
          <p className="panel-copy">{suite.category.summary}</p>
        </div>
        <div className="map-kpi">
          <strong>{suite.indicatorGroups.length}</strong>
          <span>blocos analiticos</span>
        </div>
      </div>

      <div className="suite-intro">
        <strong>
          {suite.municipality.name} ({suite.municipality.uf})
        </strong>
        <span>{suite.category.rationale}</span>
        <small>{suite.municipality.scope}</small>
      </div>

      <div className="suite-overview-grid">
        {overviewCards.map((card) => (
          <article className="suite-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="suite-availability">
        {availability.map(([key, count]) => (
          <span key={key} className={`suite-badge is-${key}`}>
            {accessLabels[key as AccessLevel]}: {count}
          </span>
        ))}
      </div>

      <div className="suite-split">
        <article className="suite-subpanel">
          <h3>Distribuicao territorial</h3>
          <ul className="suite-list">
            {suite.territorialBreakdown.map((row) => (
              <li key={row.district}>
                <div>
                  <strong>{row.district}</strong>
                  <small>{row.contractsCount.toLocaleString('pt-BR')} contratos</small>
                </div>
                <span>{formatCompactCurrency(row.totalSpent)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="suite-subpanel">
          <h3>Empresas com maior volume</h3>
          <ul className="suite-list">
            {suite.topCompanies.map((row) => (
              <li key={row.companyName}>
                <div>
                  <strong>{row.companyName}</strong>
                  <small>Fornecedor monitorado</small>
                </div>
                <span>{formatCompactCurrency(row.totalReceived)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="suite-subpanel">
          <h3>Evolucao setorial</h3>
          <div className="suite-months">
            {suite.monthlySeries.map((row) => (
              <div key={row.month} className="suite-month-row">
                <span>{row.month}</span>
                <div className="suite-month-bar">
                  <div
                    className="suite-month-fill"
                    style={{ width: `${(row.totalSpent / maxMonthValue) * 100}%` }}
                  />
                </div>
                <strong>{formatCompactCurrency(row.totalSpent)}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="suite-groups">
        {suite.indicatorGroups.map((group) => (
          <article className="suite-group" key={group.id}>
            <div className="suite-group-header">
              <h3>{group.title}</h3>
              <p>{group.description}</p>
            </div>

            <div className="suite-indicator-grid">
              {group.indicators.map((indicator) => (
                <div className="suite-indicator-card" key={indicator.id}>
                  <div className="suite-indicator-head">
                    <span className="suite-dimension">{indicator.dimension}</span>
                    <span className={`suite-badge is-${indicator.availability}`}>
                      {accessLabels[indicator.availability]}
                    </span>
                  </div>
                  <strong className="suite-indicator-value">{formatIndicatorValue(indicator)}</strong>
                  <h4>{indicator.title}</h4>
                  <p>{indicator.description}</p>
                  <div className="suite-indicator-meta">
                    <span>Referencia: {indicator.reference}</span>
                    <span>
                      Fontes:{' '}
                      {indicator.sourceIds
                        .map((sourceId) => sourceMap.get(sourceId)?.name ?? sourceId)
                        .join(' / ')}
                    </span>
                    {indicator.formula && <span>Calculo: {indicator.formula}</span>}
                    {indicator.note && <span>Observacao: {indicator.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="suite-sources">
        <div className="suite-group-header">
          <h3>Fontes preparadas para o setor</h3>
          <p>
            Fontes oficiais ja conectadas no painel e fontes catalogadas para a proxima etapa de
            integracao automatica.
          </p>
        </div>
        <div className="suite-source-grid">
          {suite.sources.map((source) => (
            <article className="suite-source-card" key={source.id}>
              <div className="suite-indicator-head">
                <strong>{source.name}</strong>
                <span className={`suite-badge is-${source.access}`}>{accessLabels[source.access]}</span>
              </div>
              <p>{source.summary}</p>
              <small>{source.owner}</small>
              {source.url && (
                <a href={source.url} target="_blank" rel="noreferrer">
                  Abrir fonte
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
