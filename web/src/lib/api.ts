const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export type Summary = {
  total_spent: string;
  contracts_count: string;
  companies_count: string;
  agencies_count: string;
};

export type MapPoint = {
  district: string;
  latitude: number;
  longitude: number;
  company_name: string;
  agency: string;
  category: string;
  contract_value: string;
};

export type MapCategory = {
  category: string;
  expenses_count: number;
  total_spent: string;
};

export type RankingRow = {
  company_name?: string;
  agency?: string;
  total_received?: string;
  total_spent?: string;
};

export type TimeseriesRow = {
  month: string;
  total_spent: string;
};

export type AccessLevel = 'live' | 'open-source' | 'api-key' | 'conecta' | 'municipal-system';

export type SuiteSource = {
  key?: string;
  id: string;
  name: string;
  owner: string;
  access: AccessLevel;
  summary: string;
  url?: string;
};

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

export type SuiteIndicatorGroup = {
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
  municipalityBaseline: {
    populationCensus2022: number;
    populationEstimate2025: number;
    areaKm2: number;
    density2022: number;
    schooling6To14: number;
    idhm2010: number;
    infantMortality2023: number;
    grossRevenue2024: number;
    grossExpenditure2024: number;
    gdpPerCapita2023: number;
  };
  territorialBreakdown: Array<{
    district: string;
    contractsCount: number;
    totalSpent: number;
  }>;
  topCompanies: Array<{
    companyName: string;
    totalReceived: number;
  }>;
  monthlySeries: Array<{
    month: string;
    totalSpent: number;
  }>;
  indicatorGroups: SuiteIndicatorGroup[];
  availabilitySummary: Record<AccessLevel, number>;
  sources: SuiteSource[];
};

const categoryAliases: Record<string, string> = {
  saude: 'Saude',
  saaode: 'Saude',
  saode: 'Saude',
  educacao: 'Educacao',
  educaaao: 'Educacao',
  educaao: 'Educacao',
  mobilidade: 'Mobilidade',
  infraestrutura: 'Infraestrutura',
  'assistencia-social': 'Assistencia Social',
  'assistancia-social': 'Assistencia Social',
  'assistaencia-social': 'Assistencia Social',
  'assistaancia-social': 'Assistencia Social',
};

function normalizeCategoryKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatCategoryLabel(category: string) {
  const normalized = normalizeCategoryKey(category);
  return categoryAliases[normalized] ?? category;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Erro ao consultar ${path}`);
  }
  return response.json() as Promise<T>;
}

export function fetchMapCategories() {
  return fetchJson<MapCategory[]>('/api/categories');
}

export function fetchMapPoints(categories: string[] = []) {
  const params = new URLSearchParams();

  categories.forEach((category) => {
    params.append('category', category);
  });

  const query = params.toString();
  return fetchJson<MapPoint[]>(query ? `/api/expenses/map?${query}` : '/api/expenses/map');
}

export function fetchCategorySuite(category: string) {
  const params = new URLSearchParams({ category });
  return fetchJson<CategorySuite>(`/api/category-suite?${params.toString()}`);
}
