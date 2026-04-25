import { cn } from '../lib/utils';
import {
  type AccessLevel,
  type CategorySuite,
  formatCategoryLabel,
  formatCurrency,
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

function formatIndicatorValue(indicator: SuiteIndicator) {
  if (indicator.value === null || indicator.value === '') return 'Em integracao';
  if (typeof indicator.value === 'string') return indicator.value;

  switch (indicator.unit) {
    case 'BRL': return formatCurrency(indicator.value);
    case 'count':
    case 'people': return indicator.value.toLocaleString('pt-BR');
    case 'percent': return `${indicator.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
    default: return indicator.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
}

export default function CategorySuitePanel({ suite, selectedCategories, loading, error }: Props) {
  if (selectedCategories.length === 0) {
    return (
      <section className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
        <h2 className="text-xl font-bold text-slate-800">Suite Setorial</h2>
        <p className="text-slate-500 mt-2">Selecione um setor no mapa para abrir indicadores detalhados.</p>
      </section>
    );
  }

  if (selectedCategories.length > 1) {
    return (
      <section className="bg-blue-50 rounded-xl border border-blue-100 p-12 text-center">
        <h2 className="text-xl font-bold text-blue-900">Múltiplos Setores Selecionados</h2>
        <p className="text-blue-700 mt-2">Selecione apenas um setor para ver a análise profunda.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 p-12 text-center animate-pulse">
        <div className="h-4 w-32 bg-slate-100 mx-auto rounded mb-4" />
        <div className="h-8 w-64 bg-slate-100 mx-auto rounded" />
      </section>
    );
  }

  if (!suite) return null;

  const sourceMap = new Map(suite.sources.map((source) => [source.key ?? source.id, source]));

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-900 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-blue-400 text-xs font-black uppercase tracking-widest">Painel Setorial</span>
              <h2 className="text-2xl font-black mt-1">{suite.category.label}</h2>
              <p className="text-slate-400 text-sm mt-2 max-w-2xl">{suite.category.summary}</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-right">
              <strong className="block text-xl leading-none">{suite.indicatorGroups.length}</strong>
              <span className="text-[10px] uppercase text-slate-500 font-bold">Blocos Analiticos</span>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Investimento</span>
            <strong className="block text-slate-900 mt-1">{formatCurrency(suite.overview.totalSpent)}</strong>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Contratos</span>
            <strong className="block text-slate-900 mt-1">{suite.overview.contractsCount}</strong>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Bairros</span>
            <strong className="block text-slate-900 mt-1">{suite.overview.districtsCount}</strong>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 lg:col-span-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Principal Orgao</span>
            <strong className="block text-blue-600 truncate mt-1" title={suite.overview.topAgency ?? ''}>
              {suite.overview.topAgency || 'N/A'}
            </strong>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {suite.indicatorGroups.map((group) => (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900 whitespace-nowrap">{group.title}</h3>
                <div className="h-px w-full bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.indicators.map((indicator) => (
                  <div key={indicator.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black px-2 py-1 bg-slate-200 rounded text-slate-600">{indicator.dimension}</span>
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border",
                        indicator.availability === 'live' ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {accessLabels[indicator.availability]}
                      </span>
                    </div>
                    <strong className="text-xl font-black text-slate-900 block mb-1 group-hover:text-blue-600">
                      {formatIndicatorValue(indicator)}
                    </strong>
                    <h4 className="text-sm font-bold text-slate-700 leading-tight">{indicator.title}</h4>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{indicator.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
