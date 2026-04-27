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
  portal_link: string;
  process_number: string;
  description_detailed: string;
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

export function formatCurrency(value: number | string) {
  const num = Number(value);
  return num.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
}

// MAPEAMENTO COMPLETO DE SETORES (DataPoa -> Humano)
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
  'RESERVA DE CONTINGANCIA/RPPS': 'Reserva/RPPS'
};

export function formatLabel(text: string) {
  if (!text) return '';
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (labels[normalized]) return labels[normalized];
  
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export async function fetchJson<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
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
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Erro ao consultar ${path}`);
  return response.json() as Promise<T>;
}

export function fetchSectors() {
  return fetchJson<Sector[]>('/api/sectors');
}

export function fetchCategories(sector?: string) {
  return fetchJson<MapCategory[]>('/api/categories', sector ? { sector } : undefined);
}

export function fetchMapPoints(sector?: string, categories: string[] = []) {
  const params: any = {};
  if (sector) params.sector = sector;
  if (categories.length > 0) params.category = categories;
  
  return fetchJson<MapPoint[]>('/api/expenses/map', params);
}
