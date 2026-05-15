const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export type Summary = {
  total_spent: string;
  contracts_count: string;
  companies_count: string;
  agencies_count: string;
};

export type Sector = {
  name: string;
  count: number;
  total: string;
};

export type MapPoint = {
  district: string;
  latitude: number;
  longitude: number;
  company_name: string;
  agency: string;
  category: string;
  sector: string;
  contract_value: string;
  value_total?: string;
  value_contracted?: string;
  value_guarantee?: string;
  process_number: string;
  description_detailed: string;
  beneficiary_id: string;
  address?: string;
  reference_date: string;
  fiscal_name?: string;
  fiscal_info?: string;
  technical_family?: string;
  technical_subfamily?: string;
};

export type MapCategory = {
  category: string;
  expenses_count: number;
  total_spent: string;
};

export type RankingRow = {
  company_name?: string;
  agency?: string;
  total_received?: number | string;
  total_spent?: number | string;
};

export type TimeseriesRow = {
  month: string;
  total_spent: string;
};

export type AccessLevel = 'live' | 'open-source' | 'api-key' | 'conecta' | 'municipal-system';

export type SuiteIndicator = {
  id: string;
  title: string;
  dimension: string;
  description: string;
  unit: string;
  availability: AccessLevel;
  sourceIds: string[];
  value: number | string | null;
  reference: string;
  formula?: string;
  note?: string;
};

export type IndicatorGroup = {
  id: string;
  title: string;
  description: string;
  indicators: SuiteIndicator[];
};

export type CategorySuite = {
  municipality: {
    name: string;
    ibgeCode: string;
    uf: string;
    scope: string;
  };
  category: {
    key: string;
    label: string;
    selectedValue: string;
    summary: string;
    rationale: string;
  };
  overview: {
    totalSpent: number;
    contractsCount: number;
    agenciesCount: number;
    companiesCount: number;
    districtsCount: number;
    avgContractValue: number;
    biddingVolume: number;
    topAgency: string | null;
    topAgencySpent: number;
  };
  indicatorGroups: IndicatorGroup[];
  sources: {
    id: string;
    name: string;
    owner: string;
    access: AccessLevel;
    summary: string;
    url?: string;
    key?: string;
  }[];
};

export function formatCurrency(value: number | string) {
  const num = Number(value);
  return num.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
}

const labels: Record<string, string> = {
  'SAUDE': 'Saúde',
  'EDUCACAO': 'Educação',
  'SEGURANCA PUBLICA': 'Segurança',
  'TRANSPORTE': 'Transporte',
  'ADMINISTRACAO': 'Gestão Pública',
  'URBANISMO': 'Urbanismo',
  'SANEAMENTO': 'Saneamento/Dmae',
  'ENCARGOS ESPECIAIS': 'Dívidas/Encargos',
  'CULTURA': 'Cultura e Lazer',
  'HABITACAO': 'Habitação/Demhab',
  'GESTAO AMBIENTAL': 'Meio Ambiente',
  'ASSISTENCIA SOCIAL': 'Assistência Social',
  'JUDICIARIA': 'Judiciário/PGM',
  'LEGISLATIVA': 'Legislativo',
  'DIREITOS DA CIDADANIA': 'Direitos Humanos',
  'CIENCIA E TECNOLOGIA': 'Tecnologia',
  'COMERCIO E SERVICOS': 'Desenvolvimento',
  'TRABALHO': 'Trabalho/Emprego',
  'AGRICULTURA': 'Agricultura',
  'PREVIDENCIA SOCIAL': 'Previdência',
  'RESERVA DE CONTINGANCIA/RPPS': 'Reserva/RPPS',
  'CONVENIO FEDERAL': 'Convênio Federal'
};

export function formatLabel(text: string) {
  if (!text) return '';
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (labels[normalized]) return labels[normalized];
  
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export const ApiService = {
  async fetchJson<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, v));
        } else {
          url.searchParams.append(key, value);
        }
      });
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Erro ao consultar ${path}`);
      return response.json() as Promise<T>;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Timeout ao consultar ${path} (Servidor lento)`);
      }
      throw error;
    }
  },

  fetchSectors() {
    return this.fetchJson<Sector[]>('/api/sectors');
  },

  fetchCategories() {
    return this.fetchJson<MapCategory[]>('/api/categories');
  },

  fetchMapPoints() {
    return this.fetchJson<MapPoint[]>('/api/expenses/map');
  },

  fetchSummary() {
    return this.fetchJson<Summary>('/api/summary');
  },

  fetchRankingCompanies() {
    return this.fetchJson<RankingRow[]>('/api/rankings/companies');
  },

  fetchRankingAgencies() {
    return this.fetchJson<RankingRow[]>('/api/rankings/agencies');
  },

  fetchRankingExpenses() {
    return this.fetchJson<RankingRow[]>('/api/rankings/expenses');
  },

  fetchTimeseries() {
    return this.fetchJson<TimeseriesRow[]>('/api/timeseries');
  },

  fetchWorkExpenses(workId: number) {
    return this.fetchJson<Expense[]>(`/api/works/${workId}/expenses`);
  }
};

export type Expense = {
  num_empenho: string;
  data_empenho: string;
  valor_empenhado: string;
  descricao: string;
  nome_fornecedor: string;
  score: number;
  confianca: 'alta' | 'media' | 'baixa';
};
