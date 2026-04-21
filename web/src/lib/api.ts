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

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Erro ao consultar ${path}`);
  }
  return response.json() as Promise<T>;
}
